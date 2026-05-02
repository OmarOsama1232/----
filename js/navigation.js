/**
 * navigation.js
 * نظام التنقل بين صفحات التطبيق (SPA)
 * يتحكم في إظهار/إخفاء الصفحات وتحديث شريط التنقل السفلي
 */

var currentPage = 'page-dashboard';

/**
 * الانتقال إلى صفحة محددة
 * @param {string} pageId - معرف الصفحة
 */
function navigateTo(pageId) {
  var pages = document.querySelectorAll('.app-page');
  pages.forEach(function(page) {
    page.classList.remove('page-active');
    page.classList.add('page-hidden');
  });

  var target = document.getElementById(pageId);
  if (target) {
    target.classList.remove('page-hidden');
    target.classList.add('page-active');
    target.scrollTop = 0;
  }

  // تحديث الـ main-content scroll
  var main = document.getElementById('main-content');
  if (main) main.scrollTo(0, 0);
  window.scrollTo(0, 0);

  currentPage = pageId;
  updateNavHighlight(pageId);
  onPageEnter(pageId);
}

/**
 * تحديث التمييز في شريط التنقل السفلي
 */
function updateNavHighlight(pageId) {
  var navItems = document.querySelectorAll('.bottom-nav-item[data-page]');
  navItems.forEach(function(item) {
    item.classList.remove('nav-active');
    if (item.getAttribute('data-page') === pageId) {
      item.classList.add('nav-active');
    }
  });
}

/**
 * تشغيل عند دخول الصفحة (تحديث البيانات)
 */
function onPageEnter(pageId) {
  if (pageId === 'page-dashboard') {
    if (typeof updateDashboardCards === 'function') updateDashboardCards();
    if (typeof renderDashboardAlerts === 'function') renderDashboardAlerts();
  }
  if (pageId === 'page-students') {
    if (typeof renderStudentsCards === 'function') renderStudentsCards();
  }
  if (pageId === 'page-attendance') {
    if (typeof renderStudentsTable === 'function') renderStudentsTable();
    updateAttendanceDateBadge();
  }
  if (pageId === 'page-reports') {
    if (typeof renderWeeklyReport === 'function') renderWeeklyReport();
  }
}

/**
 * تحديث شارة التاريخ في صفحة الحضور
 */
function updateAttendanceDateBadge() {
  var badge = document.getElementById('attendance-date-badge');
  if (!badge) return;
  var today = new Date();
  var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  try {
    badge.textContent = today.toLocaleDateString('ar-SA', options);
  } catch(e) {
    badge.textContent = today.toLocaleDateString();
  }
}

/**
 * هوك لإعادة رسم البطاقات بعد أي تعديل على الطلاب
 * يُشغَّل بعد تحميل كل JS
 */
function patchStudentFunctions() {
  // بعد إضافة طالب
  var origSaveNew = window.saveNewStudent;
  if (origSaveNew) {
    window.saveNewStudent = function() {
      origSaveNew.apply(this, arguments);
      if (typeof renderStudentsCards === 'function') renderStudentsCards();
      if (typeof renderDashboardAlerts === 'function') renderDashboardAlerts();
    };
  }

  // بعد تعديل طالب
  var origSaveEdit = window.saveEditStudent;
  if (origSaveEdit) {
    window.saveEditStudent = function() {
      origSaveEdit.apply(this, arguments);
      if (typeof renderStudentsCards === 'function') renderStudentsCards();
    };
  }

  // بعد تسجيل الحضور
  var origSaveAttendance = window.saveAllAttendance;
  if (origSaveAttendance) {
    window.saveAllAttendance = function() {
      origSaveAttendance.apply(this, arguments);
      if (typeof renderStudentsCards === 'function') renderStudentsCards();
    };
  }
}

/**
 * إعداد شريط التنقل السفلي
 */
function setupBottomNavigation() {
  var navItems = document.querySelectorAll('.bottom-nav-item[data-page]');

  navItems.forEach(function(item) {
    item.addEventListener('click', function() {
      var pageId = this.getAttribute('data-page');
      if (pageId) navigateTo(pageId);
    });
  });

  // زر الحضور في الشريط السفلي (FAB)
  var navSave = document.getElementById('nav-save-attendance');
  if (navSave) {
    // حدث click يستدعي saveAllAttendance مباشرةً من onclick في HTML
  }

  // FAB العائم
  var fabSave = document.getElementById('fab-save');
  if (fabSave) {
    fabSave.addEventListener('click', function() {
      if (typeof saveAllAttendance === 'function') saveAllAttendance();
    });
  }

  // تهيئة الصفحة الأولى
  navigateTo('page-dashboard');

  // تطبيق الـ Patches
  patchStudentFunctions();
}
