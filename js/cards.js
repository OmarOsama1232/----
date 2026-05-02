/**
 * cards.js
 * عرض الطلاب على هيئة بطاقات (Cards Grid)
 * صفحة الطلاب الجديدة
 */

/**
 * الحصول على اللون الخاص بالطالب حسب مؤشر الترتيب
 */
var AVATAR_COLORS = [
  'linear-gradient(135deg, #0F4C3A, #1B7A52)',
  'linear-gradient(135deg, #1D4ED8, #3B82F6)',
  'linear-gradient(135deg, #7C3AED, #A855F7)',
  'linear-gradient(135deg, #B45309, #D97706)',
  'linear-gradient(135deg, #0E7490, #06B6D4)',
  'linear-gradient(135deg, #9D174D, #EC4899)',
  'linear-gradient(135deg, #065F46, #10B981)',
  'linear-gradient(135deg, #1E3A5F, #2563EB)',
];

function getAvatarColor(name) {
  var code = 0;
  for (var i = 0; i < name.length; i++) {
    code += name.charCodeAt(i);
  }
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

/**
 * الحصول على الحرف الأول من الاسم
 */
function getInitial(name) {
  if (!name) return '؟';
  return name.trim().charAt(0);
}

/**
 * رسم شبكة بطاقات الطلاب
 * @param {Array} filteredStudents - اختياري: مصفوفة طلاب مصفاة
 */
function renderStudentsCards(filteredStudents) {
  var container = document.getElementById('students-cards-container');
  if (!container) return;

  var students = filteredStudents || getAllStudents();
  var today = getTodayDate();
  var todayRecords = getRecordsByDate(today);
  var topStudents = (typeof getTopStudentsWeekly === 'function') ? getTopStudentsWeekly() : [];

  if (students.length === 0) {
    container.innerHTML = '<div class="cards-empty-state">' +
      '<i class="fas fa-users"></i>' +
      '<p>لا يوجد طلاب بعد</p>' +
      '<p class="empty-hint">اضغط على "إضافة طالب" لإضافة أول طالب</p>' +
      '</div>';
    return;
  }

  var html = '';

  students.forEach(function(student, index) {
    var todayRecord = todayRecords.find(function(r) { return r.studentId === student.id; });
    var isPresent = todayRecord ? todayRecord.present : false;
    var lastRating = todayRecord ? todayRecord.rating : null;

    // آخر تقييم من السجلات الأخيرة
    if (lastRating === null) {
      var allRecords = getRecordsForStudent(student.id);
      var sortedRec = allRecords.filter(function(r) { return r.present; }).sort(function(a,b) { return b.date.localeCompare(a.date); });
      lastRating = sortedRec.length > 0 ? sortedRec[0].rating : null;
    }

    var partsPercentage = Math.round((student.partsMemorized / MAX_PARTS) * 100);
    var avatarColor = getAvatarColor(student.name);
    var initial = getInitial(student.name);

    // الشارات
    var isTop = topStudents.some(function(t) { return t.student.id === student.id; });
    var badgesHtml = '';
    if (isTop) badgesHtml += '<span class="card-badge" title="نجم الأسبوع">🌟</span>';

    // حالة الحضور
    var attendanceClass = isPresent ? 'card-present' : 'card-absent';
    var attendanceText = isPresent ? 'حاضر' : 'غائب';
    var attendanceIcon = isPresent ? 'fa-check-circle' : 'fa-times-circle';

    // التقييم
    var ratingHtml = '';
    if (lastRating !== null && lastRating !== undefined) {
      var stars = '';
      var filled = Math.round(lastRating / 2);
      for (var s = 0; s < 5; s++) {
        stars += '<i class="' + (s < filled ? 'fas' : 'far') + ' fa-star card-star"></i>';
      }
      ratingHtml = '<div class="card-rating">' + stars + '<span class="card-rating-num">' + lastRating + '</span></div>';
    } else {
      ratingHtml = '<div class="card-rating"><span class="card-no-rating">لا يوجد تقييم</span></div>';
    }

    // الحفظ
    var hifzText = (typeof formatHifzText === 'function') ? formatHifzText(student.currentHifz) : (student.currentHifz && student.currentHifz.surah ? student.currentHifz.surah : 'لم يحدد');

    html += '<div class="student-card" onclick="openStudentProfile(\'' + student.id + '\')" data-id="' + student.id + '">' +
      '<div class="card-header-strip"></div>' +
      '<div class="card-top">' +
        '<div class="card-avatar" style="background:' + avatarColor + ';">' + initial + '</div>' +
        '<div class="card-attendance-badge ' + attendanceClass + '">' +
          '<i class="fas ' + attendanceIcon + '"></i> ' + attendanceText +
        '</div>' +
      '</div>' +
      '<div class="card-body">' +
        '<div class="card-name-row">' +
          '<span class="card-name">' + student.name + '</span>' +
          '<span class="card-badges">' + badgesHtml + '</span>' +
        '</div>' +
        ratingHtml +
        '<div class="card-stats">' +
          '<div class="card-stat-item">' +
            '<i class="fas fa-bookmark card-stat-icon"></i>' +
            '<span class="card-stat-label">الحفظ</span>' +
            '<span class="card-stat-val">' + hifzText + '</span>' +
          '</div>' +
          '<div class="card-stat-item">' +
            '<i class="fas fa-layer-group card-stat-icon"></i>' +
            '<span class="card-stat-label">الأجزاء</span>' +
            '<span class="card-stat-val">' + student.partsMemorized + '/' + MAX_PARTS + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="card-parts-progress">' +
          '<div class="card-progress-bar">' +
            '<div class="card-progress-fill" style="width:' + partsPercentage + '%"></div>' +
          '</div>' +
          '<span class="card-progress-label">' + partsPercentage + '%</span>' +
        '</div>' +
      '</div>' +
      '<div class="card-footer">' +
        '<button class="card-profile-btn" onclick="event.stopPropagation(); openStudentProfile(\'' + student.id + '\');">' +
          '<i class="fas fa-user"></i> الملف الشخصي' +
        '</button>' +
        '<button class="card-edit-btn" onclick="event.stopPropagation(); openEditStudentModal(\'' + student.id + '\');">' +
          '<i class="fas fa-edit"></i>' +
        '</button>' +
        '<button class="card-delete-btn" onclick="event.stopPropagation(); confirmDeleteStudent(\'' + student.id + '\');">' +
          '<i class="fas fa-trash-alt"></i>' +
        '</button>' +
      '</div>' +
    '</div>';
  });

  container.innerHTML = html;
}

/**
 * تصفية بطاقات الطلاب (تُستدعى من filterStudents المعدّل)
 */
function filterStudentsCards() {
  var searchInput = document.getElementById('search-input');
  var filterSelect = document.getElementById('filter-select');

  var searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
  var filterValue = filterSelect ? filterSelect.value : 'all';

  var students = getAllStudents();
  var today = getTodayDate();
  var todayRecords = getRecordsByDate(today);

  if (searchTerm) {
    students = students.filter(function(s) {
      return s.name.toLowerCase().indexOf(searchTerm) !== -1;
    });
  }

  if (filterValue === 'present') {
    students = students.filter(function(s) {
      var record = todayRecords.find(function(r) { return r.studentId === s.id; });
      return record && record.present === true;
    });
  } else if (filterValue === 'absent') {
    students = students.filter(function(s) {
      var record = todayRecords.find(function(r) { return r.studentId === s.id; });
      return !record || record.present === false;
    });
  }

  renderStudentsCards(students);
}

/**
 * رسم التنبيهات في لوحة التحكم
 * (طلاب لم يحضروا الأسبوع الماضي)
 */
function renderDashboardAlerts() {
  var container = document.getElementById('alerts-list');
  var section = document.getElementById('dashboard-alerts');
  if (!container || !section) return;

  var students = getAllStudents();
  if (students.length === 0) {
    section.style.display = 'none';
    return;
  }

  var alerts = [];

  students.forEach(function(student) {
    var last7 = getRecordsLast7Days(student.id);
    var validLast7 = last7.filter(function(r) { return isClassDay(r.date); });
    var presentLast7 = validLast7.filter(function(r) { return r.present; });

    // تنبيه: غياب كامل الأسبوع الماضي
    if (validLast7.length > 0 && presentLast7.length === 0) {
      alerts.push({
        type: 'absent',
        icon: 'fa-user-times',
        text: student.name + ' — لم يحضر هذا الأسبوع'
      });
    }
  });

  if (alerts.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  var html = '';
  alerts.slice(0, 5).forEach(function(alert) {
    html += '<div class="alert-item alert-' + alert.type + '">' +
      '<i class="fas ' + alert.icon + '"></i>' +
      '<span>' + alert.text + '</span>' +
    '</div>';
  });

  container.innerHTML = html;
}
