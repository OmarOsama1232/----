/**
 * cards.js — حلقتنا v4
 * Student Cards Grid + Dashboard Alerts
 */

/* ═══════════════════════════════════
   ■ Avatar Colors
   ═══════════════════════════════════ */
var AVATAR_COLORS = [
  'linear-gradient(135deg, #0F4C3A, #1B7A52)',
  'linear-gradient(135deg, #1D4ED8, #3B82F6)',
  'linear-gradient(135deg, #7C3AED, #A855F7)',
  'linear-gradient(135deg, #B45309, #D97706)',
  'linear-gradient(135deg, #0E7490, #06B6D4)',
  'linear-gradient(135deg, #9D174D, #EC4899)',
  'linear-gradient(135deg, #065F46, #10B981)',
  'linear-gradient(135deg, #1E3A5F, #2563EB)',
  'linear-gradient(135deg, #5B21B6, #8B5CF6)',
  'linear-gradient(135deg, #831843, #DB2777)',
];

function getAvatarColor(name) {
  var code = 0;
  for (var i = 0; i < name.length; i++) code += name.charCodeAt(i);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function getInitial(name) {
  if (!name) return '؟';
  return name.trim().charAt(0);
}

/* ═══════════════════════════════════
   ■ Render Students Cards Grid
   ═══════════════════════════════════ */
function renderStudentsCards(filteredStudents) {
  var container = document.getElementById('students-cards-container');
  if (!container) return;

  var students = filteredStudents || getAllStudents();
  var today = getTodayDate();
  var todayRecords = getRecordsByDate(today);
  var topStudents = (typeof getTopStudentsWeekly === 'function') ? getTopStudentsWeekly() : [];

  if (students.length === 0) {
    container.innerHTML =
      '<div class="cards-empty-state">' +
        '<i class="fas fa-users"></i>' +
        '<p>لا يوجد طلاب بعد</p>' +
        '<small style="color:var(--c-text-light);font-size:13px;display:block;margin-top:6px;">اضغط على + لإضافة طالب</small>' +
      '</div>';
    return;
  }

  var html = '';
  students.forEach(function(student) {
    var todayRec   = todayRecords.find(function(r) { return r.studentId === student.id; });
    var isPresent  = todayRec ? todayRec.present : false;
    var todayRating = todayRec ? todayRec.rating : null;

    // Last rating from any record
    if (todayRating === null) {
      var allRec = getRecordsForStudent(student.id);
      var sorted = allRec.filter(function(r) { return r.present; }).sort(function(a,b) { return b.date.localeCompare(a.date); });
      todayRating = sorted.length > 0 ? sorted[0].rating : null;
    }

    var pct = Math.round((student.partsMemorized / MAX_PARTS) * 100);
    var avatarColor = getAvatarColor(student.name);
    var initial = getInitial(student.name);
    var isTop = topStudents.some(function(t) { return t.student.id === student.id; });

    // Stars
    var starsHtml = '';
    if (todayRating !== null) {
      var filled = Math.round(todayRating / 2);
      for (var s = 0; s < 5; s++) {
        starsHtml += '<i class="' + (s < filled ? 'fas' : 'far') + ' fa-star ' + (s < filled ? 'star-filled' : 'star-empty') + '"></i>';
      }
      starsHtml += '<span class="rating-num">' + todayRating + '</span>';
    } else {
      starsHtml = '<span style="font-size:11px;color:var(--c-text-light)">لا يوجد تقييم</span>';
    }

    var hifzText = (typeof formatHifzText === 'function') ? formatHifzText(student.currentHifz) : (student.currentHifz && student.currentHifz.surah ? student.currentHifz.surah : 'لم يحدد');

    html +=
      '<div class="student-card" onclick="openStudentProfile(\'' + student.id + '\')">' +
        '<div class="card-accent-bar"></div>' +
        '<div class="card-body">' +
          '<div class="card-top">' +
            '<div class="card-avatar" style="background:' + avatarColor + '">' + initial + '</div>' +
            '<div class="card-status-badge ' + (isPresent ? 'badge-present' : 'badge-absent') + '">' +
              '<i class="fas ' + (isPresent ? 'fa-check-circle' : 'fa-times-circle') + '"></i>' +
              (isPresent ? 'حاضر' : 'غائب') +
            '</div>' +
          '</div>' +
          '<div class="card-name">' +
            student.name +
            (isTop ? '<span class="badges">🌟</span>' : '') +
          '</div>' +
          '<div class="card-rating-row">' + starsHtml + '</div>' +
          '<div class="card-info-row">' +
            '<i class="fas fa-bookmark"></i>' +
            '<span style="color:var(--c-text-sec);font-size:11px;flex-shrink:0;">الحفظ:</span>' +
            '<span class="card-info-val">' + hifzText + '</span>' +
          '</div>' +
          '<div class="card-progress-row">' +
            '<div class="card-progress-bar">' +
              '<div class="card-progress-fill" style="width:' + pct + '%"></div>' +
            '</div>' +
            '<span class="card-progress-label">' + student.partsMemorized + '/' + MAX_PARTS + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="card-footer">' +
          '<button class="card-btn card-btn-profile" onclick="event.stopPropagation();openStudentProfile(\'' + student.id + '\')">' +
            '<i class="fas fa-user"></i> الملف' +
          '</button>' +
          '<button class="card-btn card-btn-edit" onclick="event.stopPropagation();openEditStudentModal(\'' + student.id + '\')" title="تعديل">' +
            '<i class="fas fa-edit"></i>' +
          '</button>' +
          '<button class="card-btn card-btn-delete" onclick="event.stopPropagation();confirmDeleteStudent(\'' + student.id + '\')" title="حذف">' +
            '<i class="fas fa-trash-alt"></i>' +
          '</button>' +
        '</div>' +
      '</div>';
  });

  container.innerHTML = html;
}

/* ═══════════════════════════════════
   ■ Filter Cards
   ═══════════════════════════════════ */
function filterStudentsCards() {
  var searchInput = document.getElementById('cards-search-input');
  var searchTerm  = searchInput ? searchInput.value.trim().toLowerCase() : '';
  var filterVal   = (typeof cardsFilterValue !== 'undefined') ? cardsFilterValue : 'all';
  var today        = getTodayDate();
  var todayRecords = getRecordsByDate(today);
  var students     = getAllStudents();

  if (searchTerm) {
    students = students.filter(function(s) { return s.name.toLowerCase().indexOf(searchTerm) !== -1; });
  }
  if (filterVal === 'present') {
    students = students.filter(function(s) {
      var r = todayRecords.find(function(x) { return x.studentId === s.id; });
      return r && r.present;
    });
  } else if (filterVal === 'absent') {
    students = students.filter(function(s) {
      var r = todayRecords.find(function(x) { return x.studentId === s.id; });
      return !r || !r.present;
    });
  }

  renderStudentsCards(students);
}

/* ═══════════════════════════════════
   ■ Dashboard Alerts
   ═══════════════════════════════════ */
function renderDashboardAlerts() {
  var container = document.getElementById('alerts-list');
  var section   = document.getElementById('dashboard-alerts');
  if (!container || !section) return;

  var students = getAllStudents();
  if (students.length === 0) { section.style.display = 'none'; return; }

  var alerts = [];
  students.forEach(function(student) {
    var last7 = getRecordsLast7Days(student.id);
    var valid = last7.filter(function(r) { return isClassDay(r.date); });
    var present = valid.filter(function(r) { return r.present; });
    if (valid.length > 0 && present.length === 0) {
      alerts.push({ name: student.name, text: student.name + ' — لم يحضر هذا الأسبوع' });
    }
  });

  if (alerts.length === 0) { section.style.display = 'none'; return; }

  section.style.display = 'block';
  var html = '';
  alerts.slice(0, 5).forEach(function(a) {
    html += '<div class="alert-item"><i class="fas fa-user-times"></i><span>' + a.text + '</span></div>';
  });
  container.innerHTML = html;
}

/* ═══════════════════════════════════
   ■ Honor Board Avatars (for dashboard)
   ═══════════════════════════════════ */
function renderHonorBoardCards() {
  var container = document.getElementById('honor-cards-container');
  if (!container) return;

  var topStudents = (typeof getTopStudentsWeekly === 'function') ? getTopStudentsWeekly() : [];

  if (topStudents.length === 0) {
    container.innerHTML = '<div class="honor-empty"><i class="fas fa-info-circle"></i> لا توجد بيانات كافية</div>';
    return;
  }

  var html = '';
  topStudents.forEach(function(item, idx) {
    var rankClass = idx < 3 ? 'rank-' + (idx + 1) : '';
    var avatarColor = getAvatarColor(item.student.name);
    var initial = getInitial(item.student.name);
    html +=
      '<div class="honor-card ' + rankClass + '" onclick="openStudentProfile(\'' + item.student.id + '\')">' +
        '<div class="honor-rank">' + (idx + 1) + '</div>' +
        '<div class="honor-avatar" style="background:' + avatarColor + '">' + initial + '</div>' +
        '<div class="honor-name">' + item.student.name + '</div>' +
        '<div class="honor-stats">' +
          '<span><i class="fas fa-star"></i>' + item.avgRating + '</span>' +
          '<span><i class="fas fa-calendar-check"></i>' + item.presentDays + '</span>' +
        '</div>' +
      '</div>';
  });
  container.innerHTML = html;
}
