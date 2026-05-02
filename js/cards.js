/**
 * cards.js — حلقتنا v4
 * Student Cards Grid — Interactive Attendance, Rating, Delete
 */

/* ═══════════════════════════════════
   ■ Avatar Colors & Helpers
   ═══════════════════════════════════ */
var AVATAR_COLORS = [
  'linear-gradient(135deg,#0F4C3A,#1B7A52)',
  'linear-gradient(135deg,#1D4ED8,#3B82F6)',
  'linear-gradient(135deg,#7C3AED,#A855F7)',
  'linear-gradient(135deg,#B45309,#D97706)',
  'linear-gradient(135deg,#0E7490,#06B6D4)',
  'linear-gradient(135deg,#9D174D,#EC4899)',
  'linear-gradient(135deg,#065F46,#10B981)',
  'linear-gradient(135deg,#1E3A5F,#2563EB)',
  'linear-gradient(135deg,#5B21B6,#8B5CF6)',
  'linear-gradient(135deg,#831843,#DB2777)',
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
  var isTodayClassDay = isClassDay(today);

  if (students.length === 0) {
    container.innerHTML =
      '<div class="cards-empty-state">' +
        '<div class="empty-icon-wrap"><i class="fas fa-user-graduate"></i></div>' +
        '<p>لا يوجد طلاب بعد</p>' +
        '<small>اضغط على <strong>+</strong> لإضافة طالب جديد</small>' +
      '</div>';
    return;
  }

  var html = '';
  students.forEach(function(student, idx) {
    var todayRec    = todayRecords.find(function(r) { return r.studentId === student.id; });
    var isPresent   = todayRec ? todayRec.present : false;
    var todayRating = (todayRec && todayRec.present) ? todayRec.rating : null;

    if (todayRating === null) {
      var allRec  = getRecordsForStudent(student.id);
      var sorted  = allRec.filter(function(r) { return r.present; }).sort(function(a,b) { return b.date.localeCompare(a.date); });
      todayRating = sorted.length > 0 ? sorted[0].rating : null;
    }

    var pct         = Math.round((student.partsMemorized / MAX_PARTS) * 100);
    var avatarColor = getAvatarColor(student.name);
    var initial     = getInitial(student.name);
    var isTop       = topStudents.some(function(t) { return t.student && t.student.id === student.id; });
    var hifzText    = (typeof formatHifzText === 'function') ? formatHifzText(student.currentHifz) : ((student.currentHifz && student.currentHifz.surah) ? student.currentHifz.surah : 'لم يحدد');

    /* ── Stars HTML (interactive) ── */
    var filled = todayRating !== null ? Math.round(todayRating / 2) : 0;
    var starsHtml = '';
    for (var s = 0; s < 5; s++) {
      var ratingVal = (s + 1) * 2;
      starsHtml +=
        '<button class="card-star-btn" data-val="' + ratingVal + '" ' +
          'onclick="setCardRating(\'' + student.id + '\',' + ratingVal + ',event)" ' +
          'title="تقييم ' + ratingVal + '">' +
          '<i class="' + (s < filled ? 'fas fa-star star-filled' : 'far fa-star star-empty') + '"></i>' +
        '</button>';
    }

    /* ── Last attendance days mini ── */
    var last3 = (function() {
      var recs = getRecordsLast7Days(student.id).filter(function(r) { return isClassDay(r.date); });
      recs.sort(function(a,b) { return b.date.localeCompare(a.date); });
      return recs.slice(0, 3);
    })();
    var dotsHtml = '';
    last3.forEach(function(r) {
      dotsHtml += '<span class="attendance-dot ' + (r.present ? 'dot-present' : 'dot-absent') + '" title="' + r.date + '"></span>';
    });

    /* ── Progress bar color ── */
    var barColor = pct >= 75 ? '#10B981' : pct >= 50 ? '#1B7A52' : pct >= 25 ? '#D97706' : '#DC2626';

    /* ── Attendance badge class ── */
    var badgeClass = isPresent ? 'badge-present' : 'badge-absent';
    var badgeIcon  = isPresent ? 'fa-check-circle' : 'fa-times-circle';
    var badgeText  = isPresent ? 'حاضر' : 'غائب';

    html +=
      '<div class="student-card card-entrance" data-card-id="' + student.id + '" ' +
          'style="animation-delay:' + (idx * 0.06) + 's"' +
          'onclick="openStudentProfile(\'' + student.id + '\')">' +

        /* Top accent bar */
        '<div class="card-accent-bar"></div>' +

        '<div class="card-body">' +
          /* Row 1: Avatar + Attendance badge */
          '<div class="card-top">' +
            '<div class="card-avatar-wrap">' +
              '<div class="card-avatar" style="background:' + avatarColor + '">' + initial + '</div>' +
              (isTop ? '<div class="card-top-crown" title="من الأوائل">👑</div>' : '') +
            '</div>' +

            /* ★ Attendance toggle badge — clickable ★ */
            '<button class="card-status-badge ' + badgeClass + ' badge-toggle" ' +
                'data-attendance-id="' + student.id + '" ' +
                'onclick="toggleAttendanceCard(\'' + student.id + '\',event)" ' +
                'title="اضغط لتغيير الحضور">' +
              '<i class="fas ' + badgeIcon + '"></i>' +
              '<span>' + badgeText + '</span>' +
            '</button>' +
          '</div>' +

          /* Student name */
          '<div class="card-name">' +
            student.name +
            (isTop ? '<span class="badges" style="font-size:12px;">🌟</span>' : '') +
          '</div>' +

          /* ★ Interactive Stars ★ */
          '<div class="card-rating-row">' +
            '<div class="card-stars ' + (isPresent ? 'stars-interactive' : 'stars-locked') + '" ' +
                'data-stars-id="' + student.id + '" ' +
                'onclick="event.stopPropagation()">' +
              starsHtml +
              '<span class="rating-num">' + (todayRating !== null ? todayRating : '—') + '</span>' +
            '</div>' +
            (isPresent ? '' : '<span class="stars-hint">سجّل الحضور للتقييم</span>') +
          '</div>' +

          /* Hifz info */
          '<div class="card-info-row">' +
            '<i class="fas fa-bookmark"></i>' +
            '<span class="card-info-label">الحفظ:</span>' +
            '<span class="card-info-val">' + hifzText + '</span>' +
          '</div>' +

          /* Parts progress with ± buttons */
          '<div class="card-parts-section" onclick="event.stopPropagation()">' +
            '<div class="card-parts-controls">' +
              '<button class="parts-btn parts-minus" onclick="quickChangeParts(\'' + student.id + '\',-1,event)" title="تقليل">' +
                '<i class="fas fa-minus"></i>' +
              '</button>' +
              '<div class="card-progress-bar" title="' + pct + '% محفوظ">' +
                '<div class="card-progress-fill" style="width:' + pct + '%;background:' + barColor + ';"></div>' +
              '</div>' +
              '<button class="parts-btn parts-plus" onclick="quickChangeParts(\'' + student.id + '\',1,event)" title="زيادة">' +
                '<i class="fas fa-plus"></i>' +
              '</button>' +
            '</div>' +
            '<div class="card-parts-info">' +
              '<span class="parts-label" data-parts-id="' + student.id + '">' + student.partsMemorized + '/' + MAX_PARTS + '</span>' +
              '<span class="parts-pct" data-pct-id="' + student.id + '">' + pct + '%</span>' +
              (dotsHtml ? '<div class="attendance-dots-mini">' + dotsHtml + '</div>' : '') +
            '</div>' +
          '</div>' +

          /* Class day badge */
          (isTodayClassDay ?
            '<div class="card-classday-badge"><i class="fas fa-calendar-day"></i> يوم الحلقة اليوم</div>' : '') +

        '</div>' + /* end card-body */

        /* Footer actions */
        '<div class="card-footer">' +
          '<button class="card-btn card-btn-profile" onclick="event.stopPropagation();openStudentProfile(\'' + student.id + '\')">' +
            '<i class="fas fa-user"></i> الملف' +
          '</button>' +
          '<button class="card-btn card-btn-edit" onclick="event.stopPropagation();openEditStudentModal(\'' + student.id + '\')" title="تعديل">' +
            '<i class="fas fa-edit"></i>' +
          '</button>' +
          '<button class="card-btn card-btn-delete" onclick="deleteStudentKeepRecords(\'' + student.id + '\',event)" title="حذف (السجلات تبقى)">' +
            '<i class="fas fa-trash-alt"></i>' +
          '</button>' +
        '</div>' +

      '</div>';
  });

  container.innerHTML = html;
}

/* ═══════════════════════════════════
   ■ Toggle Attendance (click badge)
   ═══════════════════════════════════ */
function toggleAttendanceCard(studentId, event) {
  event.stopPropagation();
  var today    = getTodayDate();
  var rec      = getRecordByStudentAndDate(studentId, today);
  var newPresent;

  if (!rec) {
    newPresent = true;
    saveDailyRecord({ studentId: studentId, date: today, present: true, rating: 8, note: '' });
  } else {
    newPresent = !rec.present;
    rec.present = newPresent;
    if (newPresent && (!rec.rating || rec.rating < 1)) rec.rating = 8;
    saveDailyRecord(rec);
  }

  /* Bounce animation on badge */
  var badge = document.querySelector('[data-attendance-id="' + studentId + '"]');
  if (badge) {
    badge.classList.add('badge-bounce');
    setTimeout(function() {
      badge.className = 'card-status-badge badge-toggle ' + (newPresent ? 'badge-present' : 'badge-absent') + ' badge-bounce';
      badge.innerHTML =
        '<i class="fas ' + (newPresent ? 'fa-check-circle' : 'fa-times-circle') + '"></i>' +
        '<span>' + (newPresent ? 'حاضر' : 'غائب') + '</span>';
      setTimeout(function() { badge.classList.remove('badge-bounce'); }, 400);
    }, 80);
  }

  /* Toggle stars interactivity */
  var starsDiv = document.querySelector('[data-stars-id="' + studentId + '"]');
  if (starsDiv) {
    starsDiv.className = 'card-stars ' + (newPresent ? 'stars-interactive' : 'stars-locked');
  }

  /* Update rating hint */
  var hintEl = starsDiv ? starsDiv.parentNode.querySelector('.stars-hint') : null;
  if (!newPresent && !document.querySelector('[data-stars-id="' + studentId + '"] + .stars-hint')) {
    // hint already managed via full re-render on next action
  }

  /* Haptic feedback */
  if (navigator.vibrate) navigator.vibrate([20]);

  showToast(newPresent ? '✅ تم تسجيل الحضور' : '❌ تم تسجيل الغياب', newPresent ? 'success' : 'warning');

  updateDashboardCards();
  renderHonorBoardCards();
  renderDashboardAlerts();
}

/* ═══════════════════════════════════
   ■ Set Rating from Card Stars
   ═══════════════════════════════════ */
function setCardRating(studentId, rating, event) {
  event.stopPropagation();

  var today = getTodayDate();
  var rec   = getRecordByStudentAndDate(studentId, today);

  if (!rec) {
    saveDailyRecord({ studentId: studentId, date: today, present: true, rating: rating, note: '' });
    /* Auto-set badge to حاضر */
    var badge = document.querySelector('[data-attendance-id="' + studentId + '"]');
    if (badge) {
      badge.className = 'card-status-badge badge-present badge-toggle';
      badge.innerHTML = '<i class="fas fa-check-circle"></i><span>حاضر</span>';
    }
    var starsDiv = document.querySelector('[data-stars-id="' + studentId + '"]');
    if (starsDiv) starsDiv.className = 'card-stars stars-interactive';
  } else {
    rec.rating  = rating;
    rec.present = true;
    saveDailyRecord(rec);
  }

  /* Update stars display */
  var starsDiv = document.querySelector('[data-stars-id="' + studentId + '"]');
  if (starsDiv) {
    var filled = Math.round(rating / 2);
    var btns   = starsDiv.querySelectorAll('.card-star-btn i');
    btns.forEach(function(icon, i) {
      icon.className = i < filled ? 'fas fa-star star-filled' : 'far fa-star star-empty';
    });
    var numEl = starsDiv.querySelector('.rating-num');
    if (numEl) numEl.textContent = rating;

    /* Star pop animation */
    var clickedStar = event.currentTarget && event.currentTarget.querySelector('i');
    if (!clickedStar) clickedStar = event.target;
    if (clickedStar) {
      clickedStar.classList.add('star-pop');
      setTimeout(function() { if (clickedStar) clickedStar.classList.remove('star-pop'); }, 400);
    }
  }

  if (navigator.vibrate) navigator.vibrate([15, 10, 15]);

  updateDashboardCards();
}

/* ═══════════════════════════════════
   ■ Quick Parts +/-
   ═══════════════════════════════════ */
function quickChangeParts(studentId, delta, event) {
  event.stopPropagation();
  var student = getStudentById(studentId);
  if (!student) return;

  var newParts = student.partsMemorized + delta;
  if (newParts < 0 || newParts > MAX_PARTS) return;

  student.partsMemorized = newParts;
  updateStudent(student);

  /* Update display without full re-render */
  var partsLabel = document.querySelector('[data-parts-id="' + studentId + '"]');
  var pctLabel   = document.querySelector('[data-pct-id="' + studentId + '"]');
  var progressFill = null;
  var cardEl = document.querySelector('[data-card-id="' + studentId + '"]');
  if (cardEl) progressFill = cardEl.querySelector('.card-progress-fill');

  var pct = Math.round((newParts / MAX_PARTS) * 100);
  var barColor = pct >= 75 ? '#10B981' : pct >= 50 ? '#1B7A52' : pct >= 25 ? '#D97706' : '#DC2626';

  if (partsLabel) partsLabel.textContent = newParts + '/' + MAX_PARTS;
  if (pctLabel)   pctLabel.textContent   = pct + '%';
  if (progressFill) {
    progressFill.style.width = pct + '%';
    progressFill.style.background = barColor;
  }

  if (navigator.vibrate) navigator.vibrate([10]);
}

/* ═══════════════════════════════════
   ■ Delete (instant, records kept!)
   ═══════════════════════════════════ */
function deleteStudentKeepRecords(studentId, event) {
  event.stopPropagation();
  var student = getStudentById(studentId);
  if (!student) return;
  var name = student.name;

  /* Animate card out */
  var cardEl = document.querySelector('[data-card-id="' + studentId + '"]');
  if (cardEl) {
    cardEl.style.transition = 'all .35s cubic-bezier(0.4,0,1,1)';
    cardEl.style.transform  = 'scale(0.7) rotateX(10deg)';
    cardEl.style.opacity    = '0';
    cardEl.style.pointerEvents = 'none';
  }

  /* Remove ONLY student profile — records stay in localStorage! */
  var students = getAllStudents();
  var filtered = students.filter(function(s) { return s.id !== studentId; });
  saveToStorage('students', filtered);

  setTimeout(function() {
    renderStudentsCards();
    updateDashboardCards();
    renderHonorBoardCards();
    renderDashboardAlerts();
  }, 350);

  showToast('تم حذف ' + name + ' وسجلاته محفوظة 📂', 'success');
}

/* ═══════════════════════════════════
   ■ Filter Cards
   ═══════════════════════════════════ */
function filterStudentsCards() {
  var searchInput = document.getElementById('cards-search-input');
  var searchTerm  = searchInput ? searchInput.value.trim().toLowerCase() : '';
  var filterVal   = (typeof cardsFilterValue !== 'undefined') ? cardsFilterValue : 'all';
  var today       = getTodayDate();
  var todayRecs   = getRecordsByDate(today);
  var students    = getAllStudents();

  if (searchTerm) {
    students = students.filter(function(s) { return s.name.toLowerCase().indexOf(searchTerm) !== -1; });
  }
  if (filterVal === 'present') {
    students = students.filter(function(s) {
      var r = todayRecs.find(function(x) { return x.studentId === s.id; });
      return r && r.present;
    });
  } else if (filterVal === 'absent') {
    students = students.filter(function(s) {
      var r = todayRecs.find(function(x) { return x.studentId === s.id; });
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
    var last7   = getRecordsLast7Days(student.id);
    var valid   = last7.filter(function(r) { return isClassDay(r.date); });
    var present = valid.filter(function(r) { return r.present; });
    if (valid.length >= 2 && present.length === 0) {
      alerts.push({ name: student.name, id: student.id, days: valid.length });
    }
  });

  if (alerts.length === 0) { section.style.display = 'none'; return; }

  section.style.display = 'block';
  var html = '';
  alerts.slice(0, 5).forEach(function(a) {
    html +=
      '<div class="alert-item" onclick="openStudentProfile(\'' + a.id + '\')">' +
        '<i class="fas fa-user-times"></i>' +
        '<span>' + a.name + ' — لم يحضر آخر ' + a.days + ' أيام</span>' +
        '<i class="fas fa-chevron-left alert-chevron"></i>' +
      '</div>';
  });
  container.innerHTML = html;
}

/* ═══════════════════════════════════
   ■ Honor Board Cards (Dashboard)
   ═══════════════════════════════════ */
function renderHonorBoardCards() {
  var container = document.getElementById('honor-cards-container');
  if (!container) return;

  var topStudents = (typeof getTopStudentsWeekly === 'function') ? getTopStudentsWeekly() : [];

  if (topStudents.length === 0) {
    container.innerHTML =
      '<div class="honor-empty">' +
        '<i class="fas fa-award" style="font-size:24px;opacity:.3;display:block;margin-bottom:8px;"></i>' +
        '<span>سجّل البيانات لعرض الأوائل</span>' +
      '</div>';
    return;
  }

  var html = '';
  topStudents.forEach(function(item, idx) {
    var rankClass   = idx < 3 ? 'rank-' + (idx + 1) : '';
    var avatarColor = getAvatarColor(item.student.name);
    var initial     = getInitial(item.student.name);
    var medals      = ['🥇','🥈','🥉'];
    html +=
      '<div class="honor-card ' + rankClass + '" onclick="openStudentProfile(\'' + item.student.id + '\')">' +
        '<div class="honor-rank">' + (idx < 3 ? medals[idx] : (idx + 1)) + '</div>' +
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
