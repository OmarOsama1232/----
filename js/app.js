/**
 * app.js — حلقتنا v4
 * Main Application Entry Point
 */

/* ═══════════════════════════════════
   ■ App Init
   ═══════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function() {
  initializeStorage();
  updateDateDisplay();
  setupBottomNavigation();
  setupSearchAndFilter();
  setupAttendanceModal();
  setupStudentModals();
  setupExportButtons();
  setupImport();
  setupContextMenu();
  setupAdminTools();
  setupOfflineBanner();
  setupPeriodPills();
  setupReportsPeriodPills();
  setupFilterToggle();
  initPrayerTimes();
  updateDashboardCards();
  renderHonorBoardCards();
  renderDashboardAlerts();
  renderStudentsCards();
  updateMockDataStatus();
  registerServiceWorker();
  setInterval(updateDateDisplay, 60000);
});

/* ═══════════════════════════════════
   ■ Search (students page)
   ═══════════════════════════════════ */
/* ─── cards page local filter state ─── */
var cardsFilterValue = 'all';

function setupSearchAndFilter() {
  var searchInput = document.getElementById('cards-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      filterStudentsCards();
    });
  }
}

function setupFilterToggle() {
  var filterBtn = document.getElementById('filter-toggle-btn');
  if (!filterBtn) return;

  var options = [
    { value: 'all',     label: 'الكل' },
    { value: 'present', label: 'الحاضرون' },
    { value: 'absent',  label: 'الغائبون' }
  ];
  var idx = 0;

  filterBtn.addEventListener('click', function() {
    idx = (idx + 1) % options.length;
    cardsFilterValue = options[idx].value;
    var labelEl = document.getElementById('filter-label');
    if (labelEl) labelEl.textContent = options[idx].label;
    filterBtn.classList.toggle('active', idx > 0);
    filterStudentsCards();
  });
}

function updateFilterLabel() {}

/* ═══════════════════════════════════
   ■ Attendance Modal
   ═══════════════════════════════════ */
function setupAttendanceModal() {
  var attCta = document.getElementById('attendance-cta-btn');
  if (attCta) attCta.addEventListener('click', openAttendanceModal);

  var saveBtn = document.getElementById('btn-save-attendance');
  if (saveBtn) {
    saveBtn.addEventListener('click', function() {
      saveAllAttendance();
      renderStudentsCards();
      renderHonorBoardCards();
      renderDashboardAlerts();
      updateDashboardCards();
      closeModal('modal-attendance');
    });
  }
}

/* ═══════════════════════════════════
   ■ Student Modals
   ═══════════════════════════════════ */
function setupStudentModals() {
  var btnAdd = document.getElementById('btn-add-student');
  if (btnAdd) btnAdd.addEventListener('click', openAddStudentModal);

  var btnSaveNew = document.getElementById('btn-save-new-student');
  if (btnSaveNew) btnSaveNew.addEventListener('click', saveNewStudent);

  var btnCancelNew = document.getElementById('btn-cancel-new-student');
  if (btnCancelNew) btnCancelNew.addEventListener('click', function() { closeModal('modal-add-student'); });

  var newNameInput = document.getElementById('new-student-name');
  if (newNameInput) newNameInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') saveNewStudent(); });

  var btnSaveEdit = document.getElementById('btn-save-edit-student');
  if (btnSaveEdit) btnSaveEdit.addEventListener('click', saveEditStudent);

  var btnCancelEdit = document.getElementById('btn-cancel-edit-student');
  if (btnCancelEdit) btnCancelEdit.addEventListener('click', function() { closeModal('modal-edit-student'); });

  var fabAdd = document.getElementById('fab-add-student');
  if (fabAdd) fabAdd.addEventListener('click', openAddStudentModal);

  // Surah full checkboxes
  var memFull = document.getElementById('edit-mem-full');
  if (memFull) memFull.addEventListener('change', function() {
    var f = document.getElementById('edit-mem-from');
    var t = document.getElementById('edit-mem-to');
    if (f) f.disabled = this.checked;
    if (t) t.disabled = this.checked;
  });

  var revFull = document.getElementById('edit-rev-full');
  if (revFull) revFull.addEventListener('change', function() {
    var f = document.getElementById('edit-rev-from');
    var t = document.getElementById('edit-rev-to');
    if (f) f.disabled = this.checked;
    if (t) t.disabled = this.checked;
  });
}

/* ═══════════════════════════════════
   ■ Dashboard Period Pills
   ═══════════════════════════════════ */
function setupPeriodPills() {
  var pills = document.querySelectorAll('.dashboard-period-pill');
  pills.forEach(function(pill) {
    pill.addEventListener('click', function() {
      pills.forEach(function(p) { p.classList.remove('active'); });
      this.classList.add('active');
      var period = this.getAttribute('data-period');
      var sel = document.getElementById('dashboard-period-select');
      if (sel) sel.value = period;
      updateDashboardCards();
      renderHonorBoardCards();
    });
  });

  var sel = document.getElementById('dashboard-period-select');
  if (sel) sel.addEventListener('change', function() {
    updateDashboardCards();
    renderHonorBoardCards();
  });
}

/* ═══════════════════════════════════
   ■ Reports Period Pills
   ═══════════════════════════════════ */
function setupReportsPeriodPills() {
  var pills = document.querySelectorAll('.report-period-pill');
  pills.forEach(function(pill) {
    pill.addEventListener('click', function() {
      pills.forEach(function(p) { p.classList.remove('active'); });
      this.classList.add('active');
      var period = this.getAttribute('data-period');
      if (typeof renderReportsFull === 'function') renderReportsFull(period);
    });
  });
}

/* ═══════════════════════════════════
   ■ Export Buttons (Header)
   ═══════════════════════════════════ */
function setupExportButtons() {
  var btnExcel = document.getElementById('btn-export-excel');
  var btnPdf   = document.getElementById('btn-export-pdf');
  var btnBak   = document.getElementById('btn-export');

  if (btnExcel) btnExcel.addEventListener('click', exportToExcel);
  if (btnPdf)   btnPdf.addEventListener('click',   exportToPDF);
  if (btnBak)   btnBak.addEventListener('click',   exportToJSON);
}

/* ═══════════════════════════════════
   ■ Import
   ═══════════════════════════════════ */
function setupImport() {
  var btnImport = document.getElementById('btn-import');
  if (btnImport) btnImport.addEventListener('click', function() {
    var fi = document.getElementById('import-file');
    if (fi) fi.click();
  });

  var fileInput = document.getElementById('import-file');
  if (fileInput) fileInput.addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(evt) {
      try {
        var data = JSON.parse(evt.target.result);
        if (data.students)      saveToStorage('students',      data.students);
        if (data.dailyRecords)  saveToStorage('dailyRecords',  data.dailyRecords);
        showToast('تم استيراد البيانات بنجاح');
        renderStudentsCards();
        updateDashboardCards();
        renderHonorBoardCards();
        renderDashboardAlerts();
        if (typeof renderWeeklyReport === 'function') renderWeeklyReport();
      } catch(err) {
        showToast('خطأ في قراءة الملف', 'error');
      }
    };
    reader.readAsText(file);
    this.value = '';
  });
}

function exportToJSON() {
  var data = {
    students:     getAllStudents(),
    dailyRecords: getDailyRecords(),
    exportedAt: new Date().toISOString()
  };
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'halaqah_backup_' + getTodayDate() + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('تم تصدير النسخة الاحتياطية');
}

/* ═══════════════════════════════════
   ■ Excel Export
   ═══════════════════════════════════ */
function exportToExcel() {
  if (typeof XLSX === 'undefined') { showToast('مكتبة Excel غير متوفرة', 'error'); return; }
  var students = getAllStudents();
  var rows = students.map(function(s, i) {
    var records = getRecordsForPeriod(s.id, 'all');
    var valid   = records.filter(function(r) { return isClassDay(r.date); });
    var present = valid.filter(function(r) { return r.present; });
    var avg = present.length > 0 ? (present.reduce(function(a,r) { return a+r.rating; }, 0)/present.length).toFixed(1) : 0;
    return {
      'م': i+1, 'الاسم': s.name,
      'الأجزاء': s.partsMemorized,
      'أيام الحضور': present.length,
      'إجمالي الأيام': valid.length,
      'متوسط التقييم': avg,
      'الحفظ الحالي': (s.currentHifz && s.currentHifz.surah) ? s.currentHifz.surah : '-'
    };
  });
  var ws = XLSX.utils.json_to_sheet(rows);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'حلقتنا');
  XLSX.writeFile(wb, 'حلقتنا_' + getTodayDate() + '.xlsx');
  showToast('تم تصدير ملف Excel بنجاح');
}

/* ═══════════════════════════════════
   ■ PDF Export
   ═══════════════════════════════════ */
function exportToPDF() {
  if (typeof html2canvas === 'undefined') { showToast('مكتبة PDF غير متوفرة', 'error'); return; }
  showToast('جاري تحضير PDF...', 'success');
  var el = document.getElementById('page-reports');
  if (!el) el = document.body;
  var jsPDFLib = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDFLib) { showToast('مكتبة jsPDF غير متوفرة', 'error'); return; }
  html2canvas(el, { scale: 1, useCORS: true }).then(function(canvas) {
    var pdf = new jsPDFLib('p', 'mm', 'a4');
    var pdfW = pdf.internal.pageSize.getWidth();
    var rW = pdfW - 20;
    var rH = (canvas.height * rW) / canvas.width;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, rW, rH);
    pdf.save('تقرير_حلقتنا_' + getTodayDate() + '.pdf');
    showToast('تم إنشاء PDF بنجاح');
  }).catch(function() { showToast('حدث خطأ في PDF', 'error'); });
}

/* ═══════════════════════════════════
   ■ Admin Tools
   ═══════════════════════════════════ */
function setupAdminTools() {
  var btnGen = document.getElementById('btn-generate-mock');
  var btnDel = document.getElementById('btn-delete-mock');

  if (btnGen) btnGen.addEventListener('click', function() {
    generateMockData();
    renderStudentsCards();
    updateDashboardCards();
    renderHonorBoardCards();
    renderDashboardAlerts();
    updateMockDataStatus();
  });

  if (btnDel) btnDel.addEventListener('click', async function() {
    var ok = await showConfirm('هل أنت متأكد من حذف جميع البيانات؟\nلا يمكن التراجع عن هذا الإجراء.', 'تحذير: حذف كامل');
    if (ok) {
      localStorage.removeItem('students');
      localStorage.removeItem('dailyRecords');
      renderStudentsCards();
      updateDashboardCards();
      renderHonorBoardCards();
      renderDashboardAlerts();
      updateMockDataStatus();
      showToast('تم مسح جميع البيانات');
    }
  });
}

function updateMockDataStatus() {
  var students = getAllStudents();
  var hasMock = students.some(function(s) { return s.id && s.id.indexOf('mock-') === 0; });
  var card = document.getElementById('mock-status-card');
  var text = document.getElementById('mock-status-text');
  if (card) card.style.display = hasMock ? 'flex' : 'none';
  if (text) {
    var mockCount = students.filter(function(s) { return s.id && s.id.indexOf('mock-') === 0; }).length;
    text.textContent = hasMock ? ('يوجد ' + mockCount + ' طلاب تجريبيين') : 'لا توجد بيانات تجريبية';
  }
}

/* ═══════════════════════════════════
   ■ Context Menu
   ═══════════════════════════════════ */
function setupContextMenu() {
  var menu = document.getElementById('context-menu');
  if (!menu) return;

  document.addEventListener('contextmenu', function(e) {
    var card = e.target.closest('.student-card');
    if (!card) { menu.style.display = 'none'; return; }
    e.preventDefault();
    var id = null;
    var btns = card.querySelectorAll('[onclick]');
    btns.forEach(function(b) {
      var m = b.getAttribute('onclick').match(/openStudentProfile\('([^']+)'\)/);
      if (m) id = m[1];
    });
    if (!id) return;
    menu.setAttribute('data-id', id);
    menu.style.display = 'block';
    var x = e.clientX, y = e.clientY;
    if (x + 190 > window.innerWidth)  x = window.innerWidth  - 200;
    if (y + 160 > window.innerHeight) y = window.innerHeight - 170;
    menu.style.right = 'auto';
    menu.style.left  = x + 'px';
    menu.style.top   = y + 'px';
  });

  document.addEventListener('click', function() { if (menu) menu.style.display = 'none'; });

  var ctxProfile = document.getElementById('ctx-profile');
  var ctxEdit    = document.getElementById('ctx-edit');
  var ctxDelete  = document.getElementById('ctx-delete');

  if (ctxProfile) ctxProfile.addEventListener('click', function() {
    var id = menu.getAttribute('data-id'); if (id) openStudentProfile(id);
    menu.style.display = 'none';
  });
  if (ctxEdit) ctxEdit.addEventListener('click', function() {
    var id = menu.getAttribute('data-id'); if (id) openEditStudentModal(id);
    menu.style.display = 'none';
  });
  if (ctxDelete) ctxDelete.addEventListener('click', function() {
    var id = menu.getAttribute('data-id'); if (id) confirmDeleteStudent(id);
    menu.style.display = 'none';
  });
}

/* ═══════════════════════════════════
   ■ Offline Banner
   ═══════════════════════════════════ */
function setupOfflineBanner() {
  var banner = document.getElementById('offline-banner');
  function upd() { if (banner) banner.style.display = navigator.onLine ? 'none' : 'flex'; }
  window.addEventListener('online',  upd);
  window.addEventListener('offline', upd);
  upd();
}

/* ═══════════════════════════════════
   ■ Service Worker
   ═══════════════════════════════════ */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function() {});
  }
}

/* ═══════════════════════════════════
   ■ Mock Data Generator
   ═══════════════════════════════════ */
function generateMockData() {
  var existing = getAllStudents();
  if (existing.some(function(s) { return s.id && s.id.indexOf('mock-') === 0; })) {
    showToast('البيانات التجريبية موجودة بالفعل', 'warning'); return;
  }

  var names = ['أحمد محمد','خالد عبدالله','عمر سعيد','يوسف إبراهيم','علي حسن',
               'محمد فهد','سعد ناصر','عبدالرحمن أحمد','فيصل عمر','زياد طارق'];

  var students = names.map(function(name, i) {
    return {
      id: 'mock-' + i + '-' + Date.now(),
      name: name,
      currentHifz:   { surah: SURAHS[i+60] ? SURAHS[i+60].name : '', surahNumber: i+61, from: '1', to: '10', isFull: false, details: 'الآيات 1-10' },
      currentReview: { surah: SURAHS[i+50] ? SURAHS[i+50].name : '', surahNumber: i+51, from: '', to: '', isFull: true, details: 'كاملة' },
      partsMemorized: Math.floor(Math.random() * 15) + 5,
      createdAt: new Date().toISOString()
    };
  });

  students.forEach(function(s) { saveStudent(s); });

  // Generate class records for past 8 weeks
  var classDates = [];
  var today = new Date();
  for (var i = 0; i < 60; i++) {
    var d = new Date(today);
    d.setDate(today.getDate() - i);
    var dateStr = d.toISOString().slice(0, 10);
    if (isClassDay(dateStr)) classDates.push(dateStr);
  }

  students.forEach(function(s) {
    classDates.forEach(function(date) {
      var present = Math.random() > 0.15;
      var rating  = present ? (Math.floor(Math.random() * 4) + 7) : 5;
      saveDailyRecord({ studentId: s.id, date: date, present: present, rating: rating, note: '' });
    });
  });

  showToast('تم إنشاء ' + names.length + ' طلاب تجريبيين بسجلات حضور');
}
