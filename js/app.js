/**
 * app.js
 * نقطة الدخول الرئيسية للتطبيق
 * - تهيئة التطبيق عند تحميل الصفحة
 * - ربط جميع الأحداث (Event Listeners)
 * - دوال التصدير والاستيراد
 * - إدارة البيانات التجريبية
 * - PWA / Service Worker / Offline
 */

document.addEventListener('DOMContentLoaded', function () {
  // 1. تهيئة LocalStorage
  initializeStorage();

  // 2. عرض التاريخ الحالي
  updateDateDisplay();

  // 3. رسم جدول الطلاب (للحضور)
  renderStudentsTable();

  // 4. رسم بطاقات الطلاب
  if (typeof renderStudentsCards === 'function') renderStudentsCards();

  // 5. بطاقات الإحصائيات
  updateDashboardCards();

  // 6. التقارير الأسبوعية
  renderWeeklyReport();

  // 7. ربط الأحداث
  setupEventListeners();

  // 8. البحث والتصفية
  setupSearchAndFilter();

  // 9. فترة لوحة التحكم
  var periodSelect = document.getElementById('dashboard-period-select');
  if (periodSelect) {
    periodSelect.addEventListener('change', function() {
      updateDashboardCards();
    });
  }

  // 10. حالة البيانات التجريبية
  updateMockDataStatus();

  // 11. تسجيل Service Worker
  registerServiceWorker();

  // 12. كشف الاتصال بالإنترنت
  setupOfflineDetection();

  // 13. شريط التنقل السفلي (من navigation.js)
  if (typeof setupBottomNavigation === 'function') setupBottomNavigation();

  // 14. Long Press Context Menu
  setupLongPressMenu();

  // 15. Swipe to refresh
  setupSwipeToRefresh();

  // 16. إضافة data-label للجدول (للعرض كبطاقات على الموبايل)
  injectTableDataLabels();

  // 17. مواقيت الصلاة
  if (typeof initPrayerTimes === 'function') initPrayerTimes();

  // 18. زر الرجوع (Android)
  if (typeof initBackButton === 'function') initBackButton();

  // 19. تنبيهات لوحة التحكم
  if (typeof renderDashboardAlerts === 'function') renderDashboardAlerts();
});

// ═══════════════════════════════════
// ■ ربط الأحداث
// ═══════════════════════════════════

function setupEventListeners() {
  // زر إضافة طالب جديد
  var addBtn = document.getElementById('btn-add-student');
  if (addBtn) addBtn.addEventListener('click', openAddStudentModal);

  // زر حفظ الطالب الجديد
  var saveNewBtn = document.getElementById('btn-save-new-student');
  if (saveNewBtn) saveNewBtn.addEventListener('click', saveNewStudent);

  // زر إلغاء إضافة طالب
  var cancelNewBtn = document.getElementById('btn-cancel-new-student');
  if (cancelNewBtn) cancelNewBtn.addEventListener('click', function() { closeModal('modal-add-student'); });

  // Enter في حقل الاسم
  var newNameInput = document.getElementById('new-student-name');
  if (newNameInput) {
    newNameInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') saveNewStudent(); });
  }

  // زر حفظ تعديل الطالب
  var saveEditBtn = document.getElementById('btn-save-edit-student');
  if (saveEditBtn) saveEditBtn.addEventListener('click', saveEditStudent);

  // زر إلغاء تعديل الطالب
  var cancelEditBtn = document.getElementById('btn-cancel-edit-student');
  if (cancelEditBtn) cancelEditBtn.addEventListener('click', function() { closeModal('modal-edit-student'); });

  // Enter في حقل تعديل الاسم
  var editNameInput = document.getElementById('edit-student-name');
  if (editNameInput) {
    editNameInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') saveEditStudent(); });
  }

  // زر تسجيل الحضور
  var saveAttendanceBtn = document.getElementById('btn-save-attendance');
  if (saveAttendanceBtn) saveAttendanceBtn.addEventListener('click', saveAllAttendance);

  // زر تصدير البيانات
  var exportBtn = document.getElementById('btn-export');
  if (exportBtn) exportBtn.addEventListener('click', handleExport);

  // زر تصدير Excel
  var exportExcelBtn = document.getElementById('btn-export-excel');
  if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportToExcel);

  // زر تصدير PDF
  var exportPdfBtn = document.getElementById('btn-export-pdf');
  if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportToPDF);

  // زر استيراد البيانات
  var importBtn = document.getElementById('btn-import');
  if (importBtn) importBtn.addEventListener('click', function() { document.getElementById('import-file').click(); });

  // تغيير ملف الاستيراد
  var importFile = document.getElementById('import-file');
  if (importFile) importFile.addEventListener('change', handleImport);

  // إغلاق الـ Modals عند الضغط على الخلفية
  document.querySelectorAll('.modal-overlay').forEach(function(modal) {
    modal.addEventListener('click', function(e) { closeModalOnBackdrop(e, modal.id); });
  });

  // زر إغلاق Modal الرسم البياني
  var closeChartBtn = document.getElementById('btn-close-chart');
  if (closeChartBtn) closeChartBtn.addEventListener('click', function() { closeModal('modal-chart'); });

  // أزرار البيانات التجريبية
  var genMockBtn = document.getElementById('btn-generate-mock');
  if (genMockBtn) genMockBtn.addEventListener('click', handleGenerateMock);

  var delMockBtn = document.getElementById('btn-delete-mock');
  if (delMockBtn) delMockBtn.addEventListener('click', handleDeleteMock);
}

// ═══════════════════════════════════
// ■ البيانات التجريبية
// ═══════════════════════════════════

async function handleGenerateMock() {
  var students = getAllStudents();
  if (students.length === 0) {
    showToast('لا يوجد طلاب لإضافة بيانات تجريبية. أضف طلاباً أولاً.', 'warning');
    return;
  }
  if (hasMockData()) {
    showToast('توجد بيانات تجريبية بالفعل! احذف القديمة أولاً.', 'warning');
    return;
  }

  var confirmed = await showConfirm(
    'سيتم إنشاء بيانات تجريبية لمدة سنة كاملة لجميع الطلاب (' + students.length + ' طالب).\nأيام الأحد والخميس فقط. البيانات الحقيقية لن تتأثر.\n\nهل تريد المتابعة؟',
    'إنشاء بيانات تجريبية'
  );
  if (!confirmed) return;

  showToast('جاري إنشاء البيانات التجريبية...', 'success');
  setTimeout(function() {
    var result = generateMockData();
    if (result.success) {
      showToast('تم إنشاء ' + result.recordsAdded + ' سجل تجريبي لـ ' + result.studentsCount + ' طالب');
      refreshAllViews();
    } else if (result.reason === 'no_students') {
      showToast('لا يوجد طلاب!', 'error');
    } else if (result.reason === 'already_exists') {
      showToast('بيانات تجريبية موجودة مسبقاً!', 'warning');
    }
  }, 100);
}

async function handleDeleteMock() {
  if (!hasMockData()) {
    showToast('لا توجد بيانات تجريبية لحذفها', 'warning');
    return;
  }

  var confirmed = await showConfirm(
    'سيتم حذف جميع البيانات التجريبية مع الحفاظ على البيانات الحقيقية.\nهل تريد المتابعة؟',
    'حذف البيانات التجريبية'
  );
  if (!confirmed) return;

  var result = deleteMockData();
  if (result.success) {
    showToast('تم حذف ' + result.recordsRemoved + ' سجل تجريبي. البيانات الحقيقية (' + result.realRecordsKept + ' سجل) سليمة.');
    refreshAllViews();
  }
}

function updateMockDataStatus() {
  var card = document.getElementById('mock-status-card');
  var text = document.getElementById('mock-status-text');
  if (!card || !text) return;

  if (hasMockData()) {
    var records = getDailyRecords();
    var mockCount = records.filter(function(r) { return r._mock === '__mock__'; }).length;
    var realCount = records.length - mockCount;
    card.style.display = 'flex';
    text.textContent = 'توجد ' + mockCount + ' سجل تجريبي و ' + realCount + ' سجل حقيقي';
  } else {
    card.style.display = 'none';
  }
}

/**
 * تحديث جميع العروض بعد تغيير البيانات
 */
function refreshAllViews() {
  renderStudentsTable();
  if (typeof renderStudentsCards === 'function') renderStudentsCards();
  updateDashboardCards();
  renderWeeklyReport();
  updateMockDataStatus();
  if (typeof renderDashboardAlerts === 'function') renderDashboardAlerts();
}

// ═══════════════════════════════════
// ■ التصدير
// ═══════════════════════════════════

function handleExport() {
  var data = exportAllData();
  var jsonString = JSON.stringify(data, null, 2);
  var blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var today = getTodayDate();
  var filename = 'حلقتنا-backup-' + today + '.json';
  var link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('تم تصدير البيانات بنجاح: ' + filename);
}

function exportToExcel() {
  if (typeof XLSX === 'undefined') {
    showToast('المكتبة غير متوفرة، تحقق من الاتصال بالإنترنت', 'error');
    return;
  }

  var students = getAllStudents();
  var today = getTodayDate();
  var todayRecords = getRecordsByDate(today);

  var excelData = students.map(function(s, index) {
    var record = todayRecords.find(function(r) { return r.studentId === s.id; });
    return {
      'م': index + 1,
      'اسم الطالب': s.name,
      'الحفظ الحالي': (s.currentHifz && s.currentHifz.surah) ? s.currentHifz.surah : '',
      'المراجعة': (s.currentReview && s.currentReview.surah) ? s.currentReview.surah : '',
      'الأجزاء المحفوظة': s.partsMemorized,
      'حضور اليوم': record && record.present ? 'حاضر' : 'غائب',
      'التقييم': record ? record.rating : '-',
      'ملاحظات اليوم': record ? (record.note || '') : ''
    };
  });

  var ws = XLSX.utils.json_to_sheet(excelData);
  if (!ws['!dir']) ws['!dir'] = 'rtl';
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الطلاب');
  XLSX.writeFile(wb, 'تقرير_الطلاب_' + today + '.xlsx');
  showToast('تم تصدير ملف Excel بنجاح');
}

function exportToPDF() {
  if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
    showToast('المكتبة غير متوفرة، تحقق من الاتصال بالإنترنت', 'error');
    return;
  }

  showToast('جاري تحضير ملف PDF، يرجى الانتظار...', 'success');
  var jsPDF = window.jspdf.jsPDF;
  var pdf = new jsPDF('p', 'mm', 'a4');
  var tableEl = document.getElementById('main-table-wrapper');

  html2canvas(tableEl, { scale: 1.5, useCORS: true }).then(function(canvas) {
    var imgData = canvas.toDataURL('image/png');
    var pdfWidth = pdf.internal.pageSize.getWidth();
    var margin = 10;
    var renderWidth = pdfWidth - (margin * 2);
    var pdfHeight = (canvas.height * renderWidth) / canvas.width;
    pdf.text('تقرير حلقة تحفيظ القرآن - حلقتنا', pdfWidth / 2, 10, { align: 'center' });
    pdf.addImage(imgData, 'PNG', margin, 15, renderWidth, pdfHeight);
    var today = getTodayDate();
    pdf.save('تقرير_' + today + '.pdf');
    showToast('تم إنشاء ملف PDF بنجاح');
  }).catch(function(err) {
    console.error(err);
    showToast('حدث خطأ أثناء إنشاء PDF', 'error');
  });
}

// ═══════════════════════════════════
// ■ الاستيراد
// ═══════════════════════════════════

function handleImport(e) {
  var file = e.target.files[0];
  if (!file) return;

  if (!file.name.endsWith('.json')) {
    showToast('يرجى اختيار ملف JSON صالح', 'error');
    e.target.value = '';
    return;
  }

  var reader = new FileReader();
  reader.onload = async function(event) {
    try {
      var data = JSON.parse(event.target.result);
      if (!data.students || !data.dailyRecords) {
        showToast('الملف غير صالح: يجب أن يحتوي على students و dailyRecords', 'error');
        return;
      }
      var confirmed = await showConfirm(
        'سيتم استبدال جميع البيانات الحالية بالبيانات المستوردة!\nالملف يحتوي على ' + data.students.length + ' طالب و ' + data.dailyRecords.length + ' سجل.\nهل أنت متأكد؟',
        'تأكيد استيراد البيانات'
      );
      if (confirmed) {
        var success = importAllData(data);
        if (success) {
          showToast('تم استيراد البيانات بنجاح! جاري إعادة تحميل الصفحة...');
          setTimeout(function() { location.reload(); }, 1500);
        } else {
          showToast('حدث خطأ أثناء استيراد البيانات', 'error');
        }
      }
    } catch (error) {
      showToast('خطأ في قراءة الملف: تأكد أنه ملف JSON صالح', 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// ═══════════════════════════════════
// ■ Service Worker
// ═══════════════════════════════════

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(function(reg) {
      console.log('✅ Service Worker مسجل:', reg.scope);
    }).catch(function(err) {
      console.warn('⚠️ فشل تسجيل Service Worker:', err);
    });
  }
}

// ═══════════════════════════════════
// ■ كشف الاتصال بالإنترنت
// ═══════════════════════════════════

function setupOfflineDetection() {
  var banner = document.getElementById('offline-banner');
  if (!banner) return;

  function updateStatus() {
    banner.style.display = navigator.onLine ? 'none' : 'flex';
  }

  window.addEventListener('online', function() {
    updateStatus();
    showToast('تم استعادة الاتصال بالإنترنت');
  });
  window.addEventListener('offline', function() {
    updateStatus();
    showToast('أنت تعمل بدون اتصال — البيانات المحلية متاحة', 'warning');
  });
  updateStatus();
}

// ═══════════════════════════════════
// ■ Long Press Context Menu
// ═══════════════════════════════════

var longPressTimer = null;
var longPressStudentId = null;

function setupLongPressMenu() {
  var menu = document.getElementById('context-menu');
  if (!menu) return;

  document.addEventListener('click', function() { menu.style.display = 'none'; });
  document.addEventListener('touchstart', function(e) {
    if (!menu.contains(e.target)) menu.style.display = 'none';
  }, { passive: true });

  var ctxProfile = document.getElementById('ctx-profile');
  if (ctxProfile) ctxProfile.addEventListener('click', function() {
    if (longPressStudentId) openStudentProfile(longPressStudentId);
  });

  var ctxEdit = document.getElementById('ctx-edit');
  if (ctxEdit) ctxEdit.addEventListener('click', function() {
    if (longPressStudentId) openEditStudentModal(longPressStudentId);
  });

  var ctxDelete = document.getElementById('ctx-delete');
  if (ctxDelete) ctxDelete.addEventListener('click', function() {
    if (longPressStudentId) confirmDeleteStudent(longPressStudentId);
  });

  // Long press على جدول الحضور
  var tbody = document.getElementById('students-tbody');
  if (tbody) {
    tbody.addEventListener('touchstart', function(e) {
      var nameLink = e.target.closest('.student-name-link');
      if (!nameLink) return;
      var row = nameLink.closest('tr[data-id]');
      if (!row) return;

      longPressTimer = setTimeout(function() {
        e.preventDefault();
        longPressStudentId = row.getAttribute('data-id');
        var touch = e.touches[0];
        var x = Math.min(touch.clientX, window.innerWidth - 220);
        var y = Math.min(touch.clientY, window.innerHeight - 160);
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.style.display = 'block';
        if (navigator.vibrate) navigator.vibrate(30);
      }, 500);
    }, { passive: false });

    tbody.addEventListener('touchend', function() { clearTimeout(longPressTimer); });
    tbody.addEventListener('touchmove', function() { clearTimeout(longPressTimer); });
  }
}

// ═══════════════════════════════════
// ■ Swipe to Refresh
// ═══════════════════════════════════

function setupSwipeToRefresh() {
  var startY = 0;
  var pulling = false;
  var main = document.getElementById('main-content');
  if (!main) return;

  main.addEventListener('touchstart', function(e) {
    if (window.scrollY === 0) {
      startY = e.touches[0].clientY;
      pulling = true;
    }
  }, { passive: true });

  main.addEventListener('touchmove', function(e) {
    if (!pulling) return;
    var diff = e.touches[0].clientY - startY;
    if (diff > 120) {
      pulling = false;
      showToast('جاري تحديث البيانات...', 'success');
      setTimeout(function() {
        refreshAllViews();
        showToast('تم تحديث البيانات');
      }, 300);
    }
  }, { passive: true });

  main.addEventListener('touchend', function() { pulling = false; }, { passive: true });
}

// ═══════════════════════════════════
// ■ إضافة data-label للجدول
// ═══════════════════════════════════

function injectTableDataLabels() {
  var labels = ['م', 'الاسم', 'الحفظ', 'المراجعة', 'الأجزاء', 'الحضور', 'التقييم', 'ملاحظات', 'إجراءات'];
  var tbody = document.getElementById('students-tbody');
  if (!tbody) return;

  var observer = new MutationObserver(function() {
    tbody.querySelectorAll('tr[data-id]').forEach(function(row) {
      var cells = row.querySelectorAll('td');
      cells.forEach(function(td, i) {
        if (labels[i] && !td.getAttribute('data-label')) {
          td.setAttribute('data-label', labels[i]);
        }
      });
    });
  });

  observer.observe(tbody, { childList: true, subtree: false });

  tbody.querySelectorAll('tr[data-id]').forEach(function(row) {
    var cells = row.querySelectorAll('td');
    cells.forEach(function(td, i) {
      if (labels[i]) td.setAttribute('data-label', labels[i]);
    });
  });
}

// ═══════════════════════════════════
// ■ البحث والتصفية (Override)
// ═══════════════════════════════════

function setupSearchAndFilter() {
  var searchInput = document.getElementById('search-input');
  var filterSelect = document.getElementById('filter-select');

  if (searchInput) {
    searchInput.addEventListener('input', function() {
      filterStudents();
      if (typeof filterStudentsCards === 'function') filterStudentsCards();
    });
  }

  if (filterSelect) {
    filterSelect.addEventListener('change', function() {
      filterStudents();
      if (typeof filterStudentsCards === 'function') filterStudentsCards();
    });
  }
}
