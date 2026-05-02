/**
 * reports-page.js — حلقتنا v4
 * Full Analytics & Reports Page
 */

var reportLineChart  = null;
var reportBarChart   = null;
var reportPieChart   = null;
var reportsSortCol   = 'avgRating';
var reportsSortDir   = 'desc';
var reportsSearchTerm = '';
var currentReportPeriod = 'week';

/* ═══════════════════════════════════
   ■ Init reports page
   ═══════════════════════════════════ */
function initReportsPage() {
  currentReportPeriod = 'week';
  reportsSearchTerm = '';

  // Sync period pills
  document.querySelectorAll('.report-period-pill').forEach(function(btn) {
    btn.classList.remove('active');
    if (btn.getAttribute('data-period') === 'week') btn.classList.add('active');
  });

  renderReportsFull('week');

  // Search
  var searchEl = document.getElementById('reports-search-input');
  if (searchEl) {
    searchEl.value = '';
    searchEl.addEventListener('input', function() {
      reportsSearchTerm = this.value.trim().toLowerCase();
      renderReportsTable(currentReportPeriod);
    });
  }
}

/* ═══════════════════════════════════
   ■ Render everything
   ═══════════════════════════════════ */
function renderReportsFull(period) {
  currentReportPeriod = period;
  renderReportsKPI(period);
  renderReportsCharts(period);
  renderReportsTable(period);
  renderReportsSummary(period);
}

/* ═══════════════════════════════════
   ■ KPI Cards
   ═══════════════════════════════════ */
function renderReportsKPI(period) {
  var students = getAllStudents();
  var totalStudents = students.length;

  var totalPresent = 0, totalDays = 0, totalRatings = 0, ratingsCount = 0;
  var totalNewParts = 0;

  students.forEach(function(s) {
    var records = getRecordsForPeriod(s.id, period);
    var valid = records.filter(function(r) { return isClassDay(r.date); });
    var present = valid.filter(function(r) { return r.present; });

    totalDays += valid.length;
    totalPresent += present.length;
    present.forEach(function(r) { totalRatings += r.rating; ratingsCount++; });
    totalNewParts += s.partsMemorized;
  });

  var attendancePct = totalDays > 0 ? Math.round((totalPresent / totalDays) * 100) : 0;
  var avgRating = ratingsCount > 0 ? (totalRatings / ratingsCount).toFixed(2) : '0.00';

  setElText('rpt-total-students', totalStudents);
  setElText('rpt-total-present', totalPresent);
  setElText('rpt-attendance-pct', attendancePct + '%');
  setElText('rpt-avg-rating', avgRating);
  setElText('rpt-total-parts', totalNewParts + '/' + (totalStudents * MAX_PARTS));
}

function setElText(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ═══════════════════════════════════
   ■ Charts
   ═══════════════════════════════════ */
function renderReportsCharts(period) {
  renderLineChart(period);
  renderBarChart(period);
  renderPieChart(period);
}

function getChartDefaults() {
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    gridColor: isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.06)',
    textColor: isDark ? '#8AB898' : '#5A7A6A',
    fontFamily: 'Cairo, Tajawal, sans-serif'
  };
}

/* Line Chart — Avg Rating per day/week */
function renderLineChart(period) {
  var canvas = document.getElementById('rpt-line-chart');
  if (!canvas) return;

  if (reportLineChart) { reportLineChart.destroy(); reportLineChart = null; }

  var students = getAllStudents();
  var daysMap = {};

  students.forEach(function(s) {
    var records = getRecordsForPeriod(s.id, period);
    records.forEach(function(r) {
      if (r.present && isClassDay(r.date)) {
        if (!daysMap[r.date]) daysMap[r.date] = { sum: 0, count: 0 };
        daysMap[r.date].sum += r.rating;
        daysMap[r.date].count++;
      }
    });
  });

  var labels = Object.keys(daysMap).sort();
  var data = labels.map(function(d) {
    return daysMap[d].count > 0 ? parseFloat((daysMap[d].sum / daysMap[d].count).toFixed(2)) : 0;
  });

  // Format labels
  var formattedLabels = labels.map(function(d) {
    var dt = new Date(d + 'T00:00:00');
    return (dt.getDate()) + '/' + (dt.getMonth() + 1);
  });

  var def = getChartDefaults();
  var ctx = canvas.getContext('2d');

  reportLineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: formattedLabels,
      datasets: [{
        label: 'متوسط التقييم',
        data: data,
        borderColor: '#1B7A52',
        backgroundColor: 'rgba(27,122,82,.12)',
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: '#1B7A52',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        tension: 0.35,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          rtl: true,
          backgroundColor: '#0F4C3A',
          titleFont: { family: def.fontFamily, size: 12 },
          bodyFont: { family: def.fontFamily, size: 12 },
          cornerRadius: 8,
          padding: 10
        }
      },
      scales: {
        x: { ticks: { color: def.textColor, font: { family: def.fontFamily, size: 10 }, maxRotation: 45 }, grid: { color: def.gridColor } },
        y: { min: 0, max: 10, ticks: { color: def.textColor, font: { family: def.fontFamily, size: 11 }, stepSize: 2 }, grid: { color: def.gridColor } }
      }
    }
  });
}

/* Bar Chart — Attendance per student */
function renderBarChart(period) {
  var canvas = document.getElementById('rpt-bar-chart');
  if (!canvas) return;

  if (reportBarChart) { reportBarChart.destroy(); reportBarChart = null; }

  var students = getAllStudents();
  var labels = [], presentData = [], absentData = [];

  students.forEach(function(s) {
    var records = getRecordsForPeriod(s.id, period);
    var valid = records.filter(function(r) { return isClassDay(r.date); });
    var present = valid.filter(function(r) { return r.present; }).length;
    var absent = valid.length - present;

    labels.push(s.name.length > 8 ? s.name.substring(0,8) + '..' : s.name);
    presentData.push(present);
    absentData.push(absent);
  });

  if (labels.length === 0) {
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  var def = getChartDefaults();
  var ctx = canvas.getContext('2d');

  reportBarChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'حاضر',
          data: presentData,
          backgroundColor: 'rgba(27,122,82,.8)',
          borderRadius: 4
        },
        {
          label: 'غائب',
          data: absentData,
          backgroundColor: 'rgba(220,38,38,.65)',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { font: { family: def.fontFamily, size: 12 }, color: def.textColor, usePointStyle: true } },
        tooltip: { rtl: true, backgroundColor: '#0F4C3A', titleFont: { family: def.fontFamily, size: 12 }, bodyFont: { family: def.fontFamily, size: 12 }, cornerRadius: 8, padding: 10 }
      },
      scales: {
        x: { stacked: true, ticks: { color: def.textColor, font: { family: def.fontFamily, size: 10 } }, grid: { display: false } },
        y: { stacked: true, ticks: { color: def.textColor, font: { family: def.fontFamily, size: 11 }, stepSize: 1 }, grid: { color: def.gridColor } }
      }
    }
  });
}

/* Pie Chart — Attendance vs Absence */
function renderPieChart(period) {
  var canvas = document.getElementById('rpt-pie-chart');
  if (!canvas) return;

  if (reportPieChart) { reportPieChart.destroy(); reportPieChart = null; }

  var students = getAllStudents();
  var totalPresent = 0, totalAbsent = 0;

  students.forEach(function(s) {
    var records = getRecordsForPeriod(s.id, period);
    var valid = records.filter(function(r) { return isClassDay(r.date); });
    totalPresent += valid.filter(function(r) { return r.present; }).length;
    totalAbsent  += valid.filter(function(r) { return !r.present; }).length;
  });

  var def = getChartDefaults();
  var ctx = canvas.getContext('2d');

  reportPieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['حاضر', 'غائب'],
      datasets: [{
        data: [totalPresent, totalAbsent],
        backgroundColor: ['rgba(27,122,82,.85)', 'rgba(220,38,38,.75)'],
        borderColor: ['#1B7A52', '#DC2626'],
        borderWidth: 2,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: def.fontFamily, size: 12 }, color: def.textColor, usePointStyle: true, padding: 14 } },
        tooltip: { rtl: true, backgroundColor: '#0F4C3A', titleFont: { family: def.fontFamily, size: 12 }, bodyFont: { family: def.fontFamily, size: 12 }, cornerRadius: 8, padding: 10,
          callbacks: {
            label: function(ctx) {
              var total = ctx.dataset.data.reduce(function(a,b) { return a+b; }, 0);
              var pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
              return ' ' + ctx.label + ': ' + ctx.parsed + ' (' + pct + '%)';
            }
          }
        }
      }
    }
  });
}

/* ═══════════════════════════════════
   ■ Reports Table
   ═══════════════════════════════════ */
function renderReportsTable(period) {
  var tbody = document.getElementById('rpt-table-body');
  if (!tbody) return;

  var students = getAllStudents();
  var data = [];

  students.forEach(function(s) {
    var records = getRecordsForPeriod(s.id, period);
    var valid = records.filter(function(r) { return isClassDay(r.date); });
    var present = valid.filter(function(r) { return r.present; });
    var presentDays = present.length;
    var totalDays = valid.length;
    var pct = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
    var avgRating = present.length > 0 ? parseFloat((present.reduce(function(a,r) { return a+r.rating; }, 0) / present.length).toFixed(1)) : 0;
    var lastDay = valid.length > 0 ? valid.sort(function(a,b) { return b.date.localeCompare(a.date); })[0].date : '-';

    if (reportsSearchTerm && s.name.toLowerCase().indexOf(reportsSearchTerm) === -1) return;

    data.push({
      id: s.id,
      name: s.name,
      presentDays: presentDays,
      totalDays: totalDays,
      pct: pct,
      avgRating: avgRating,
      parts: s.partsMemorized,
      lastDay: lastDay
    });
  });

  // Sort
  data.sort(function(a, b) {
    var av = a[reportsSortCol], bv = b[reportsSortCol];
    if (typeof av === 'string') av = av.localeCompare(bv);
    else av = av - bv;
    return reportsSortDir === 'desc' ? -av : av;
  });

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--c-text-light);">لا توجد بيانات</td></tr>';
    return;
  }

  var html = '';
  data.forEach(function(d, idx) {
    var ratingClass = d.avgRating >= 8 ? 'chip-excellent' : d.avgRating >= 6 ? 'chip-good' : d.avgRating >= 4 ? 'chip-average' : 'chip-poor';
    var fillClass   = d.pct >= 80 ? 'fill-high' : d.pct >= 50 ? 'fill-mid' : 'fill-low';
    var lastFormatted = d.lastDay !== '-' ? (function() {
      var dt = new Date(d.lastDay + 'T00:00:00');
      return dt.getDate() + '/' + (dt.getMonth()+1) + '/' + dt.getFullYear();
    })() : '-';

    html +=
      '<tr>' +
        '<td class="td-rank">' + (idx+1) + '</td>' +
        '<td class="td-name"><button onclick="openStudentProfile(\'' + d.id + '\')">' + d.name + '</button></td>' +
        '<td>' + d.presentDays + '/' + d.totalDays + '</td>' +
        '<td class="attendance-bar-cell">' +
          '<span style="font-size:12px;font-weight:700;">' + d.pct + '%</span>' +
          '<div class="small-progress"><div class="small-progress-fill ' + fillClass + '" style="height:100%;width:' + d.pct + '%;border-radius:999px;"></div></div>' +
        '</td>' +
        '<td><span class="rating-chip ' + ratingClass + '">' + (d.avgRating > 0 ? d.avgRating : '-') + '</span></td>' +
        '<td>' + d.parts + '/' + MAX_PARTS + '</td>' +
        '<td>' + lastFormatted + '</td>' +
        '<td><button class="btn-view-profile" onclick="openStudentProfile(\'' + d.id + '\')"><i class="fas fa-eye"></i> عرض</button></td>' +
      '</tr>';
  });
  tbody.innerHTML = html;
}

/* ═══════════════════════════════════
   ■ Sort table
   ═══════════════════════════════════ */
function sortReportsTable(col) {
  if (reportsSortCol === col) {
    reportsSortDir = reportsSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    reportsSortCol = col;
    reportsSortDir = 'desc';
  }

  // Update sort icons
  document.querySelectorAll('.rpt-sort-icon').forEach(function(el) {
    el.className = 'fas fa-sort rpt-sort-icon';
  });
  var activeIcon = document.querySelector('[data-sort="' + col + '"] .rpt-sort-icon');
  if (activeIcon) {
    activeIcon.className = 'fas ' + (reportsSortDir === 'desc' ? 'fa-sort-down' : 'fa-sort-up') + ' rpt-sort-icon';
  }

  renderReportsTable(currentReportPeriod);
}

/* ═══════════════════════════════════
   ■ Summary Cards
   ═══════════════════════════════════ */
function renderReportsSummary(period) {
  var students = getAllStudents();
  var byParts = students.slice().sort(function(a, b) { return b.partsMemorized - a.partsMemorized; });

  var byAttendance = students.map(function(s) {
    var records = getRecordsForPeriod(s.id, period);
    var valid = records.filter(function(r) { return isClassDay(r.date); });
    var present = valid.filter(function(r) { return r.present; }).length;
    return { name: s.name, present: present, total: valid.length, pct: valid.length > 0 ? Math.round(present/valid.length*100) : 0 };
  }).sort(function(a,b) { return b.pct - a.pct; });

  var byRating = students.map(function(s) {
    var records = getRecordsForPeriod(s.id, period);
    var present = records.filter(function(r) { return r.present; });
    var avg = present.length > 0 ? (present.reduce(function(a,r) { return a+r.rating; }, 0) / present.length) : 0;
    return { name: s.name, avg: avg.toFixed(1) };
  }).sort(function(a,b) { return b.avg - a.avg; });

  renderSummaryList('summary-top-attendance', byAttendance.slice(0,3), function(d) { return d.pct + '%'; });
  renderSummaryList('summary-top-rating', byRating.slice(0,3), function(d) { return d.avg; });
  renderSummaryList('summary-top-parts', byParts.slice(0,3), function(d) { return d.partsMemorized + ' جزء'; });
  renderSummaryList('summary-low-attendance', byAttendance.slice().reverse().slice(0,3), function(d) { return d.pct + '%'; });
}

function renderSummaryList(id, items, valFn) {
  var el = document.getElementById(id);
  if (!el) return;
  if (items.length === 0) { el.innerHTML = '<div style="font-size:12px;color:var(--c-text-light);padding:8px 0;">لا توجد بيانات</div>'; return; }
  var html = '';
  items.forEach(function(item, i) {
    var name = item.name || '';
    html += '<div class="summary-item"><span class="summary-rank">' + (i+1) + '</span><span class="summary-name">' + name + '</span><span class="summary-val">' + valFn(item) + '</span></div>';
  });
  el.innerHTML = html;
}

/* ═══════════════════════════════════
   ■ Export from Reports Page
   ═══════════════════════════════════ */
function exportReportsExcel() {
  if (typeof XLSX === 'undefined') { showToast('مكتبة Excel غير متوفرة', 'error'); return; }
  var students = getAllStudents();
  var data = students.map(function(s, i) {
    var records = getRecordsForPeriod(s.id, currentReportPeriod);
    var valid = records.filter(function(r) { return isClassDay(r.date); });
    var present = valid.filter(function(r) { return r.present; });
    var avgRating = present.length > 0 ? (present.reduce(function(a,r) { return a+r.rating;},0)/present.length).toFixed(1) : 0;
    return {
      'م': i+1, 'الاسم': s.name,
      'أيام الحضور': present.length, 'إجمالي الأيام': valid.length,
      'نسبة الحضور': valid.length > 0 ? Math.round(present.length/valid.length*100)+'%' : '0%',
      'متوسط التقييم': avgRating,
      'الأجزاء المحفوظة': s.partsMemorized
    };
  });
  var ws = XLSX.utils.json_to_sheet(data);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'تقرير حلقتنا');
  XLSX.writeFile(wb, 'تقرير_حلقتنا_' + getTodayDate() + '.xlsx');
  showToast('تم تصدير ملف Excel بنجاح');
}

function exportReportsPDF() {
  if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
    showToast('مكتبة PDF غير متوفرة', 'error'); return;
  }
  showToast('جاري تحضير PDF...', 'success');
  var el = document.getElementById('page-reports');
  var jsPDF = window.jspdf.jsPDF;
  html2canvas(el, { scale: 1.2, useCORS: true, allowTaint: true }).then(function(canvas) {
    var pdf = new jsPDF('p', 'mm', 'a4');
    var pdfW = pdf.internal.pageSize.getWidth();
    var margin = 10;
    var rW = pdfW - margin*2;
    var rH = (canvas.height * rW) / canvas.width;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, 10, rW, rH);
    pdf.save('تقرير_حلقتنا_' + getTodayDate() + '.pdf');
    showToast('تم إنشاء PDF بنجاح');
  }).catch(function() { showToast('حدث خطأ في PDF', 'error'); });
}

function printReports() {
  window.print();
}
