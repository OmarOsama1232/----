/**
 * profile.js — حلقتنا v4
 * Student Profile Modal — Beautiful Chart + Improved UX
 */

var currentProfileStudentId = null;
var profileChart = null;

/* ═══════════════════════════════════
   ■ Open Profile
   ═══════════════════════════════════ */
function openStudentProfile(studentId) {
  currentProfileStudentId = studentId;
  var student = getStudentById(studentId);
  if (!student) return;

  document.getElementById('profile-student-name').textContent = student.name;
  updateProfileSidebar(student);
  updateProfileView('all');
  openModal('modal-student-profile');
}

/* ═══════════════════════════════════
   ■ Sidebar
   ═══════════════════════════════════ */
function updateProfileSidebar(student) {
  var container = document.getElementById('profile-sidebar-info');
  if (!container) return;

  var pct = Math.round((student.partsMemorized / MAX_PARTS) * 100);
  var barColor = pct >= 75 ? '#10B981' : pct >= 50 ? '#1B7A52' : pct >= 25 ? '#D97706' : '#DC2626';

  container.innerHTML =
    '<div class="profile-info-block">' +
      '<div class="profile-info-label"><i class="fas fa-book-open"></i> الأجزاء المحفوظة</div>' +
      '<div class="profile-parts-display">' +
        '<span class="profile-parts-num">' + student.partsMemorized + '</span>' +
        '<span class="profile-parts-sep">/ ' + MAX_PARTS + '</span>' +
      '</div>' +
      '<div class="profile-progress-wrap">' +
        '<div class="profile-progress-bar">' +
          '<div class="profile-progress-fill" style="width:' + pct + '%;background:' + barColor + ';"></div>' +
        '</div>' +
        '<span class="profile-progress-pct">' + pct + '%</span>' +
      '</div>' +
    '</div>' +
    '<div class="profile-info-block">' +
      '<div class="profile-info-label"><i class="fas fa-bookmark"></i> الحفظ الحالي</div>' +
      '<div class="profile-info-val">' + formatHifzText(student.currentHifz) + '</div>' +
    '</div>' +
    '<div class="profile-info-block">' +
      '<div class="profile-info-label"><i class="fas fa-book-reader"></i> المراجعة المطلوبة</div>' +
      '<div class="profile-info-val">' + formatHifzText(student.currentReview) + '</div>' +
    '</div>';
}

/* ═══════════════════════════════════
   ■ Update Period View
   ═══════════════════════════════════ */
function updateProfileView(period) {
  document.querySelectorAll('.filter-period-btn').forEach(function(btn) {
    btn.classList.remove('active');
    if (btn.getAttribute('data-period') === period) btn.classList.add('active');
  });

  var student = getStudentById(currentProfileStudentId);
  if (!student) return;

  var records       = getRecordsForPeriod(currentProfileStudentId, period);
  var sortedRecords = records.slice().sort(function(a,b) { return a.date.localeCompare(b.date); });

  renderProfileStats(student, sortedRecords, period);
  renderProfileChart(sortedRecords);
  renderProfileTimeline(sortedRecords);
}

/* ═══════════════════════════════════
   ■ Stats Boxes
   ═══════════════════════════════════ */
function renderProfileStats(student, records, period) {
  var validRecords   = records.filter(function(r) { return isClassDay(r.date); });
  var presentRecords = validRecords.filter(function(r) { return r.present; });
  var presentDays    = presentRecords.length;

  var expectedDays;
  if (period === 'week')  expectedDays = EXPECTED_DAYS_PER_WEEK;
  else if (period === 'month') expectedDays = 8;
  else if (period === 'year')  expectedDays = 100;
  else expectedDays = validRecords.length > 0 ? validRecords.length : 1;
  if (period === 'all' && expectedDays < presentDays) expectedDays = presentDays;

  var attendanceRate = expectedDays > 0 ? Math.min(Math.round((presentDays / expectedDays) * 100), 100) : 0;

  var totalRating = 0, bestRating = 0;
  presentRecords.forEach(function(r) {
    totalRating += r.rating;
    if (r.rating > bestRating) bestRating = r.rating;
  });
  var avgRating = presentDays > 0 ? (totalRating / presentDays).toFixed(1) : '0.0';

  document.getElementById('prof-stat-attendance-days').textContent = presentDays;
  document.getElementById('prof-stat-attendance-rate').textContent = attendanceRate + '%';
  document.getElementById('prof-stat-avg-rating').textContent = avgRating;
  document.getElementById('prof-stat-best-rating').textContent = bestRating;
}

/* ═══════════════════════════════════
   ■ Beautiful Combo Chart
   ═══════════════════════════════════ */
function renderProfileChart(records) {
  var canvas = document.getElementById('profile-chart');
  if (!canvas) return;

  if (profileChart) { profileChart.destroy(); profileChart = null; }

  var validRecords = records.filter(function(r) { return isClassDay(r.date); });

  if (validRecords.length === 0) {
    var ctx0 = canvas.getContext('2d');
    ctx0.clearRect(0, 0, canvas.width, canvas.height);
    /* Draw empty state text */
    var isDark0 = document.documentElement.getAttribute('data-theme') === 'dark';
    ctx0.fillStyle = isDark0 ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.15)';
    ctx0.font = '14px Cairo, sans-serif';
    ctx0.textAlign = 'center';
    ctx0.fillText('لا توجد سجلات في هذه الفترة', canvas.width / 2, canvas.height / 2);
    return;
  }

  /* ── Prepare datasets ── */
  var labels      = [];
  var ratingBars  = [];   /* present = rating value, absent = null */
  var absentBars  = [];   /* absent = 0.5 marker, present = null */
  var barColors   = [];
  var movingAvg   = [];

  validRecords.forEach(function(r) {
    var d = new Date(r.date + 'T00:00:00');
    labels.push((d.getDate()) + '/' + (d.getMonth() + 1));

    if (r.present) {
      ratingBars.push(r.rating);
      absentBars.push(null);
      /* Color gradient by rating */
      if      (r.rating >= 9) barColors.push('rgba(16,185,129,.88)');  /* Emerald */
      else if (r.rating >= 7) barColors.push('rgba(27,122,82,.82)');   /* Green */
      else if (r.rating >= 5) barColors.push('rgba(217,119,6,.8)');    /* Amber */
      else if (r.rating >= 3) barColors.push('rgba(249,115,22,.75)');  /* Orange */
      else                    barColors.push('rgba(220,38,38,.75)');    /* Red */
    } else {
      ratingBars.push(null);
      absentBars.push(0.6);
      barColors.push('rgba(148,163,184,.3)');
    }
  });

  /* ── 3-point moving average (present days only) ── */
  var window3 = 3;
  validRecords.forEach(function(r, i) {
    var sum = 0, cnt = 0;
    var half = Math.floor(window3 / 2);
    for (var j = Math.max(0, i - half); j <= Math.min(validRecords.length - 1, i + half); j++) {
      if (validRecords[j].present) { sum += validRecords[j].rating; cnt++; }
    }
    movingAvg.push(cnt > 0 ? parseFloat((sum / cnt).toFixed(1)) : null);
  });

  /* ── Chart defaults ── */
  var isDark  = document.documentElement.getAttribute('data-theme') === 'dark';
  var grid    = isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)';
  var text    = isDark ? '#8AB898' : '#5A7A6A';
  var font    = 'Cairo, Tajawal, sans-serif';

  /* ── Gradient for line ── */
  var ctx = canvas.getContext('2d');

  profileChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          /* Colored rating bars */
          type: 'bar',
          label: 'التقييم',
          data: ratingBars,
          backgroundColor: barColors,
          borderRadius: { topLeft: 5, topRight: 5 },
          borderSkipped: false,
          barPercentage: 0.7,
          order: 2,
        },
        {
          /* Absent markers */
          type: 'bar',
          label: 'غياب',
          data: absentBars,
          backgroundColor: 'rgba(220,38,38,.18)',
          borderColor: 'rgba(220,38,38,.45)',
          borderWidth: 1,
          borderRadius: 3,
          borderSkipped: false,
          barPercentage: 0.5,
          order: 3,
        },
        {
          /* Golden moving average line */
          type: 'line',
          label: 'الاتجاه',
          data: movingAvg,
          borderColor: '#C8A951',
          backgroundColor: 'rgba(200,169,81,.08)',
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: '#C8A951',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 6,
          tension: 0.4,
          spanGaps: true,
          fill: false,
          order: 1,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      animation: {
        duration: 600,
        easing: 'easeOutQuart'
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'start',
          labels: {
            font: { family: font, size: 11, weight: '700' },
            color: text,
            usePointStyle: true,
            pointStyleWidth: 10,
            padding: 14,
            filter: function(item) { return item.text !== 'غياب'; }
          }
        },
        tooltip: {
          rtl: true,
          backgroundColor: isDark ? '#1A3A2A' : '#0F4C3A',
          titleColor: 'rgba(255,255,255,.7)',
          bodyColor: '#fff',
          titleFont: { family: font, size: 11 },
          bodyFont:  { family: font, size: 12, weight: '700' },
          cornerRadius: 10,
          padding: 12,
          caretSize: 6,
          callbacks: {
            title: function(ctx) {
              return ctx[0] ? ctx[0].label : '';
            },
            label: function(ctx) {
              if (ctx.datasetIndex === 0 && ctx.parsed.y !== null)
                return '  حاضر — التقييم: ' + ctx.parsed.y + ' / 10';
              if (ctx.datasetIndex === 1 && ctx.parsed.y !== null)
                return '  غائب';
              if (ctx.datasetIndex === 2 && ctx.parsed.y !== null)
                return '  متوسط: ' + ctx.parsed.y + ' / 10';
              return null;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: text,
            font: { family: font, size: 9 },
            maxRotation: 50,
            maxTicksLimit: 16
          },
          grid: { color: grid, drawBorder: false }
        },
        y: {
          min: 0,
          max: 10,
          ticks: {
            color: text,
            font: { family: font, size: 11 },
            stepSize: 2,
            callback: function(v) { return v; }
          },
          grid: { color: grid, drawBorder: false }
        }
      }
    }
  });
}

/* ═══════════════════════════════════
   ■ Timeline
   ═══════════════════════════════════ */
function renderProfileTimeline(records) {
  var container = document.getElementById('profile-timeline');
  if (!container) return;

  var reversed = records.slice().reverse();

  if (reversed.length === 0) {
    container.innerHTML =
      '<div style="text-align:center;padding:24px;color:var(--c-text-light);">' +
        '<i class="fas fa-calendar-times" style="font-size:28px;opacity:.3;display:block;margin-bottom:8px;"></i>' +
        'لا توجد سجلات في هذه الفترة' +
      '</div>';
    return;
  }

  var html = '';
  reversed.forEach(function(r) {
    if (!isClassDay(r.date) && !r.present && !r.note) return;

    var d  = new Date(r.date + 'T00:00:00');
    var dStr = d.toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric', month: 'short' });

    var ratingColor = '#1B7A52';
    if      (r.rating >= 9) ratingColor = '#10B981';
    else if (r.rating >= 7) ratingColor = '#1B7A52';
    else if (r.rating >= 5) ratingColor = '#D97706';
    else                    ratingColor = '#DC2626';

    var statusHtml = r.present
      ? '<span class="tl-status tl-present"><i class="fas fa-check-circle"></i> حاضر</span>' +
        '<span class="tl-rating" style="color:' + ratingColor + ';border-color:' + ratingColor + '20;">' +
          '<i class="fas fa-star"></i> ' + r.rating + '/10' +
        '</span>'
      : '<span class="tl-status tl-absent"><i class="fas fa-times-circle"></i> غائب</span>';

    var noteHtml = r.note
      ? '<div class="tl-note"><i class="fas fa-sticky-note"></i> ' + r.note + '</div>'
      : '';

    html +=
      '<div class="timeline-item ' + (r.present ? 'tl-item-present' : 'tl-item-absent') + '">' +
        '<div class="timeline-dot ' + (r.present ? 'dot-p' : 'dot-a') + '"></div>' +
        '<div class="timeline-body">' +
          '<div class="tl-header">' +
            '<span class="timeline-date">' + dStr + '</span>' +
            '<div class="tl-badges">' + statusHtml + '</div>' +
          '</div>' +
          noteHtml +
        '</div>' +
      '</div>';
  });

  container.innerHTML = html;
}

/* ═══════════════════════════════════
   ■ Print Profile
   ═══════════════════════════════════ */
function printStudentProfile() {
  showToast('جاري تجهيز التقرير للطباعة...', 'success');
  document.body.classList.add('print-profile-mode');
  var afterPrint = function() {
    document.body.classList.remove('print-profile-mode');
    window.removeEventListener('afterprint', afterPrint);
  };
  window.addEventListener('afterprint', afterPrint);
  setTimeout(function() {
    window.print();
    setTimeout(function() { document.body.classList.remove('print-profile-mode'); }, 2000);
  }, 500);
}

/* ═══════════════════════════════════
   ■ Export Student Excel
   ═══════════════════════════════════ */
function exportStudentExcel() {
  if (typeof XLSX === 'undefined') { showToast('مكتبة SheetJS غير متوفرة', 'error'); return; }
  if (!currentProfileStudentId) return;

  var student = getStudentById(currentProfileStudentId);
  if (!student) return;

  var records = getRecordsForStudent(currentProfileStudentId);
  var sorted  = records.slice().sort(function(a,b) { return a.date.localeCompare(b.date); });

  if (sorted.length === 0) { showToast('لا توجد بيانات كافية', 'warning'); return; }

  var wb = XLSX.utils.book_new();

  var histData = [['التاريخ','الحالة','التقييم','الملاحظة']];
  sorted.forEach(function(r) {
    histData.push([r.date, r.present ? 'حاضر' : 'غائب', r.present ? r.rating : '-', r.note || '']);
  });

  var ws1 = XLSX.utils.aoa_to_sheet(histData);
  if (!ws1['!views']) ws1['!views'] = [];
  ws1['!views'].push({ rightToLeft: true });
  XLSX.utils.book_append_sheet(wb, ws1, 'السجل الكامل');

  var valid   = sorted.filter(function(r) { return isClassDay(r.date); });
  var present = valid.filter(function(r) { return r.present; });
  var total   = 0;
  present.forEach(function(r) { total += r.rating; });
  var avg = present.length > 0 ? (total / present.length).toFixed(2) : 0;

  var sumData = [
    ['الاسم',student.name],
    ['الأجزاء المحفوظة', student.partsMemorized + '/' + MAX_PARTS],
    ['الحفظ الحالي', formatHifzText(student.currentHifz)],
    ['المراجعة المطلوبة', formatHifzText(student.currentReview)],
    ['إجمالي أيام الحضور', present.length],
    ['متوسط التقييم', avg]
  ];

  var ws2 = XLSX.utils.aoa_to_sheet(sumData);
  if (!ws2['!views']) ws2['!views'] = [];
  ws2['!views'].push({ rightToLeft: true });
  XLSX.utils.book_append_sheet(wb, ws2, 'ملخص');

  XLSX.writeFile(wb, 'تقرير_' + student.name.replace(/ /g,'_') + '.xlsx');
  showToast('تم تصدير Excel بنجاح', 'success');
}

/* ═══════════════════════════════════
   ■ Delete (keep records) — with confirm
   ═══════════════════════════════════ */
async function deleteStudentFromProfile() {
  if (!currentProfileStudentId) return;
  var student = getStudentById(currentProfileStudentId);
  if (!student) return;

  var name        = student.name;
  var recsCount   = getRecordsForStudent(currentProfileStudentId).length;

  var confirmed = await showConfirm(
    'هل أنت متأكد من حذف "' + name + '"؟\n' +
    'السجلات التاريخية (' + recsCount + ' سجل) ستبقى محفوظة.',
    'حذف الطالب'
  );

  if (!confirmed) return;

  /* Remove ONLY student profile — records stay in localStorage */
  var students = getAllStudents();
  var filtered = students.filter(function(s) { return s.id !== currentProfileStudentId; });
  saveToStorage('students', filtered);

  closeModal('modal-student-profile');
  renderStudentsCards();
  updateDashboardCards();
  if (typeof renderWeeklyReport === 'function') renderWeeklyReport();
  renderHonorBoardCards();
  renderDashboardAlerts();

  showToast('تم حذف ' + name + ' وسجلاته محفوظة 📂', 'success');
}

/* ═══════════════════════════════════
   ■ Open Edit from Profile
   ═══════════════════════════════════ */
function openEditStudentFromProfile() {
  if (!currentProfileStudentId) return;
  closeModal('modal-student-profile');
  openEditStudentModal(currentProfileStudentId);
}
