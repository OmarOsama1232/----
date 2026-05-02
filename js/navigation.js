/**
 * navigation.js — حلقتنا v4
 * SPA Navigation: 4 pages (home, students, reports, settings)
 */

var currentPage = 'page-home';

/* ═══════════════════════════════════
   ■ Navigate to page
   ═══════════════════════════════════ */
function navigateTo(pageId) {
  if (pageId === currentPage) return;

  var pages = document.querySelectorAll('.app-page');
  pages.forEach(function(p) { p.classList.remove('active'); });

  var target = document.getElementById(pageId);
  if (target) {
    target.classList.add('active');
    target.scrollTop = 0;
  }

  window.scrollTo(0, 0);
  currentPage = pageId;

  updateNavHighlight(pageId);
  onPageEnter(pageId);
}

/* ═══════════════════════════════════
   ■ Update bottom nav highlight
   ═══════════════════════════════════ */
function updateNavHighlight(pageId) {
  var navItems = document.querySelectorAll('.nav-item[data-page]');
  navItems.forEach(function(item) {
    item.classList.remove('active');
    if (item.getAttribute('data-page') === pageId) {
      item.classList.add('active');
    }
  });
}

/* ═══════════════════════════════════
   ■ On page enter — refresh data
   ═══════════════════════════════════ */
function onPageEnter(pageId) {
  if (pageId === 'page-home') {
    if (typeof updateDashboardCards === 'function') updateDashboardCards();
    if (typeof renderDashboardAlerts === 'function') renderDashboardAlerts();
  }
  if (pageId === 'page-students') {
    if (typeof renderStudentsCards === 'function') renderStudentsCards();
  }
  if (pageId === 'page-reports') {
    if (typeof initReportsPage === 'function') initReportsPage();
  }
}

/* ═══════════════════════════════════
   ■ Setup bottom navigation
   ═══════════════════════════════════ */
function setupBottomNavigation() {
  var navItems = document.querySelectorAll('.nav-item[data-page]');
  navItems.forEach(function(item) {
    item.addEventListener('click', function() {
      var pageId = this.getAttribute('data-page');
      if (pageId) navigateTo(pageId);
    });
  });

  // Center FAB — opens attendance modal
  var navFab = document.getElementById('nav-fab-btn');
  if (navFab) {
    navFab.addEventListener('click', function() {
      openAttendanceModal();
    });
  }

  // Init first page
  navigateTo('page-home');

  // Patch student functions to refresh cards
  patchStudentFunctions();
}

/* ═══════════════════════════════════
   ■ Attendance Modal helpers
   ═══════════════════════════════════ */
function openAttendanceModal() {
  // Update date badge
  var badge = document.getElementById('attendance-date-badge');
  if (badge) {
    var today = new Date();
    var opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    try { badge.textContent = today.toLocaleDateString('ar-SA', opts); }
    catch(e) { badge.textContent = today.toLocaleDateString(); }
  }

  // Render table fresh
  if (typeof renderStudentsTable === 'function') renderStudentsTable();

  openModal('modal-attendance');
}

/* ═══════════════════════════════════
   ■ Patch functions to refresh cards
   ═══════════════════════════════════ */
function patchStudentFunctions() {
  var origNew = window.saveNewStudent;
  if (origNew) {
    window.saveNewStudent = function() {
      origNew.apply(this, arguments);
      if (typeof renderStudentsCards === 'function') renderStudentsCards();
      if (typeof renderDashboardAlerts === 'function') renderDashboardAlerts();
    };
  }

  var origEdit = window.saveEditStudent;
  if (origEdit) {
    window.saveEditStudent = function() {
      origEdit.apply(this, arguments);
      if (typeof renderStudentsCards === 'function') renderStudentsCards();
    };
  }

  var origDel = window.confirmDeleteStudent;
  if (origDel) {
    window.confirmDeleteStudent = function(id) {
      origDel.apply(this, arguments);
    };
  }
}
