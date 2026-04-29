/**
 * app.js
 * نقطة الدخول الرئيسية للتطبيق
 * - تهيئة التطبيق عند تحميل الصفحة
 * - ربط جميع الأحداث (Event Listeners)
 * - دوال التصدير والاستيراد
 * - إدارة البيانات التجريبية
 * - PWA / Service Worker / Offline
 * - Bottom Navigation / Long Press / Swipe
 */

// ═══════════════════════════════════
// ■ تهيئة التطبيق
// ═══════════════════════════════════

document.addEventListener('DOMContentLoaded', function () {
  // 1. تهيئة LocalStorage
  initializeStorage();

  // 2. عرض التاريخ الحالي
  updateDateDisplay();

  // 3. رسم جدول الطلاب
  renderStudentsTable();

  // 4. بطاقات الإحصائيات
  updateDashboardCards();

  // 5. التقارير الأسبوعية
  renderWeeklyReport();

  // 6. ربط الأحداث
  setupEventListeners();

  // 7. البحث والتصفية
  setupSearchAndFilter();

  // 8. فترة لوحة التحكم
  const periodSelect = document.getElementById('dashboard-period-select');
  if (periodSelect) periodSelect.addEventListener('change', updateDashboardCards);

  // 9. حالة البيانات التجريبية
  updateMockDataStatus();

  // 10. تسجيل Service Worker
  registerServiceWorker();

  // 11. كشف الاتصال بالإنترنت
  setupOfflineDetection();

  // 12. شريط التنقل السفلي
  setupBottomNavigation();

  // 13. Long Press Context Menu
  setupLongPressMenu();

  // 14. Swipe to refresh
  setupSwipeToRefresh();

  // 15. إضافة data-label للجدول (للعرض كبطاقات على الموبايل)
  injectTableDataLabels();

  // 16. مواقيت الصلاة
  if (typeof initPrayerTimes === 'function') initPrayerTimes();

  // 17. زر الرجوع (Android)
  if (typeof initBackButton === 'function') initBackButton();
});

// ═══════════════════════════════════
// ■ ربط الأحداث
// ═══════════════════════════════════

function setupEventListeners() {
  // زر إضافة طالب جديد
  const addBtn = document.getElementById('btn-add-student');
  if (addBtn) addBtn.addEventListener('click', openAddStudentModal);

  // زر حفظ الطالب الجديد من الـ Modal
  const saveNewBtn = document.getElementById('btn-save-new-student');
  if (saveNewBtn) saveNewBtn.addEventListener('click', saveNewStudent);

  // زر إلغاء إضافة طالب
  const cancelNewBtn = document.getElementById('btn-cancel-new-student');
  if (cancelNewBtn) cancelNewBtn.addEventListener('click', () => closeModal('modal-add-student'));

  // إدخال Enter في حقل الاسم الجديد
  const newNameInput = document.getElementById('new-student-name');
  if (newNameInput) {
    newNameInput.addEventListener('keypress', e => { if (e.key === 'Enter') saveNewStudent(); });
  }

  // زر حفظ تعديل الاسم
  const saveEditBtn = document.getElementById('btn-save-edit-student');
  if (saveEditBtn) saveEditBtn.addEventListener('click', saveEditStudent);

  // زر إلغاء تعديل الاسم
  const cancelEditBtn = document.getElementById('btn-cancel-edit-student');
  if (cancelEditBtn) cancelEditBtn.addEventListener('click', () => closeModal('modal-edit-student'));

  // إدخال Enter في حقل تعديل الاسم
  const editNameInput = document.getElementById('edit-student-name');
  if (editNameInput) {
    editNameInput.addEventListener('keypress', e => { if (e.key === 'Enter') saveEditStudent(); });
  }

  // زر تسجيل الحضور والتقييمات
  const saveAttendanceBtn = document.getElementById('btn-save-attendance');
  if (saveAttendanceBtn) saveAttendanceBtn.addEventListener('click', saveAllAttendance);

  // زر تصدير البيانات (نسخة احتياطية)
  const exportBtn = document.getElementById('btn-export');
  if (exportBtn) exportBtn.addEventListener('click', handleExport);

  // زر تصدير Excel
  const exportExcelBtn = document.getElementById('btn-export-excel');
  if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportToExcel);

  // زر تصدير PDF
  const exportPdfBtn = document.getElementById('btn-export-pdf');
  if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportToPDF);

  // زر استيراد البيانات
  const importBtn = document.getElementById('btn-import');
  if (importBtn) importBtn.addEventListener('click', () => document.getElementById('import-file').click());

  // مستمع تغيير ملف الاستيراد
  const importFile = document.getElementById('import-file');
  if (importFile) importFile.addEventListener('change', handleImport);

  // إغلاق الـ Modals عند الضغط على الخلفية
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', e => closeModalOnBackdrop(e, modal.id));
  });

  // زر إغلاق Modal الرسم البياني
  const closeChartBtn = document.getElementById('btn-close-chart');
  if (closeChartBtn) closeChartBtn.addEventListener('click', () => closeModal('modal-chart'));

  // ═══ أزرار البيانات التجريبية ═══
  const genMockBtn = document.getElementById('btn-generate-mock');
  if (genMockBtn) genMockBtn.addEventListener('click', handleGenerateMock);

  const delMockBtn = document.getElementById('btn-delete-mock');
  if (delMockBtn) delMockBtn.addEventListener('click', handleDeleteMock);
}

// ═══════════════════════════════════
// ■ البيانات التجريبية
// ═══════════════════════════════════

async function handleGenerateMock() {
  const students = getAllStudents();

  // حالة الحافة: لا يوجد طلاب
  if (students.length === 0) {
    showToast('لا يوجد طلاب لإضافة بيانات تجريبية لهم. أضف طلاباً أولاً.', 'warning');
    return;
  }

  // حالة الحافة: بيانات تجريبية موجودة
  if (hasMockData()) {
    showToast('توجد بيانات تجريبية بالفعل! احذف القديمة أولاً قبل إنشاء بيانات جديدة.', 'warning');
    return;
  }

  const confirmed = await showConfirm(
    `سيتم إنشاء بيانات تجريبية لمدة سنة كاملة لجميع الطلاب (${students.length} طالب).\nسيتم إنشاء سجلات أيام الأحد والخميس فقط.\nالبيانات الحقيقية الموجودة لن تتأثر.\n\nهل تريد المتابعة؟`,
    'إنشاء بيانات تجريبية'
  );

  if (!confirmed) return;

  showToast('جاري إنشاء البيانات التجريبية...', 'success');

  // تأخير بسيط لعرض الرسالة قبل العملية الثقيلة
  setTimeout(() => {
    const result = generateMockData();

    if (result.success) {
      showToast(`تم إنشاء ${result.recordsAdded} سجل تجريبي لـ ${result.studentsCount} طالب`);
      renderStudentsTable();
      updateDashboardCards();
      renderWeeklyReport();
      updateMockDataStatus();
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

  const confirmed = await showConfirm(
    'سيتم حذف جميع البيانات التجريبية مع الحفاظ على البيانات الحقيقية.\nهل تريد المتابعة؟',
    'حذف البيانات التجريبية'
  );

  if (!confirmed) return;

  const result = deleteMockData();

  if (result.success) {
    showToast(`تم حذف ${result.recordsRemoved} سجل تجريبي. البيانات الحقيقية (${result.realRecordsKept} سجل) سليمة.`);
    renderStudentsTable();
    updateDashboardCards();
    renderWeeklyReport();
    updateMockDataStatus();
  }
}

function updateMockDataStatus() {
  const card = document.getElementById('mock-status-card');
  const text = document.getElementById('mock-status-text');
  if (!card || !text) return;

  if (hasMockData()) {
    const records = getDailyRecords();
    const mockCount = records.filter(r => r._mock === '__mock__').length;
    const realCount = records.length - mockCount;
    card.style.display = 'flex';
    text.textContent = `توجد ${mockCount} سجل تجريبي و ${realCount} سجل حقيقي`;
  } else {
    card.style.display = 'none';
  }
}

// ═══════════════════════════════════
// ■ التصدير
// ═══════════════════════════════════

function handleExport() {
  const data = exportAllData();
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const today = getTodayDate();
  const filename = `حلقتنا-backup-${today}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast(`تم تصدير البيانات بنجاح: ${filename}`);
}

function exportToExcel() {
  if (typeof XLSX === 'undefined') {
    showToast('المكتبة غير متوفرة، تحقق من الاتصال بالإنترنت', 'error');
    return;
  }

  const students = getAllStudents();
  const today = getTodayDate();
  const todayRecords = getRecordsByDate(today);

  const excelData = students.map((s, index) => {
    const record = todayRecords.find(r => r.studentId === s.id);
    return {
      'م': index + 1,
      'اسم الطالب': s.name,
      'الحفظ الحالي': s.currentMemorization.surah + (s.currentMemorization.details ? ` - ${s.currentMemorization.details}` : ''),
      'المراجعة': s.revision.surah + (s.revision.details ? ` - ${s.revision.details}` : ''),
      'الأجزاء المحفوظة': s.partsMemorized,
      'حضور اليوم': record && record.present ? 'حاضر' : 'غائب',
      'التقييم': record ? record.rating : '-',
      'ملاحظات اليوم': record ? (record.note || '') : ''
    };
  });

  const ws = XLSX.utils.json_to_sheet(excelData);
  if (!ws['!dir']) ws['!dir'] = 'rtl';

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "الطلاب");
  XLSX.writeFile(wb, `تقرير_الطلاب_${today}.xlsx`);

  showToast('تم تصدير ملف Excel بنجاح');
}

function exportToPDF() {
  if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
    showToast('المكتبة غير متوفرة، تحقق من الاتصال بالإنترنت', 'error');
    return;
  }

  showToast('جاري تحضير ملف PDF، يرجى الانتظار...', 'success');

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'mm', 'a4');
  const tableEl = document.getElementById('main-table-wrapper');

  html2canvas(tableEl, { scale: 1.5, useCORS: true }).then(canvas => {
    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const margin = 10;
    const renderWidth = pdfWidth - (margin * 2);
    const pdfHeight = (canvas.height * renderWidth) / canvas.width;

    pdf.text("تقرير حلقة تحفيظ القرآن - حلقتنا", pdfWidth / 2, 10, { align: "center" });
    pdf.addImage(imgData, 'PNG', margin, 15, renderWidth, pdfHeight);

    const today = getTodayDate();
    pdf.save(`تقرير_${today}.pdf`);
    showToast('تم إنشاء ملف PDF بنجاح');
  }).catch(err => {
    console.error(err);
    showToast('حدث خطأ أثناء إنشاء PDF', 'error');
  });
}

// ═══════════════════════════════════
// ■ الاستيراد
// ═══════════════════════════════════

function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.name.endsWith('.json')) {
    showToast('يرجى اختيار ملف JSON صالح', 'error');
    e.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = async function (event) {
    try {
      const data = JSON.parse(event.target.result);

      if (!data.students || !data.dailyRecords) {
        showToast('الملف غير صالح: يجب أن يحتوي على students و dailyRecords', 'error');
        return;
      }

      const confirmed = await showConfirm(
        `سيتم استبدال جميع البيانات الحالية بالبيانات المستوردة!\nالملف يحتوي على ${data.students.length} طالب و ${data.dailyRecords.length} سجل.\nهل أنت متأكد؟`,
        'تأكيد استيراد البيانات'
      );

      if (confirmed) {
        const success = importAllData(data);
        if (success) {
          showToast('تم استيراد البيانات بنجاح! جاري إعادة تحميل الصفحة...');
          setTimeout(() => location.reload(), 1500);
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
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('✅ Service Worker مسجل:', reg.scope);
    }).catch(err => {
      console.warn('⚠️ فشل تسجيل Service Worker:', err);
    });
  }
}

// ═══════════════════════════════════
// ■ كشف الاتصال بالإنترنت
// ═══════════════════════════════════

function setupOfflineDetection() {
  const banner = document.getElementById('offline-banner');
  if (!banner) return;

  function updateStatus() {
    banner.style.display = navigator.onLine ? 'none' : 'flex';
  }

  window.addEventListener('online', () => {
    updateStatus();
    showToast('تم استعادة الاتصال بالإنترنت');
  });
  window.addEventListener('offline', () => {
    updateStatus();
    showToast('أنت تعمل بدون اتصال — البيانات المحلية متاحة', 'warning');
  });

  updateStatus();
}

// ═══════════════════════════════════
// ■ شريط التنقل السفلي
// ═══════════════════════════════════

function setupBottomNavigation() {
  const navItems = document.querySelectorAll('.bottom-nav-item[data-section]');
  const navSave = document.getElementById('nav-save-attendance');

  navItems.forEach(item => {
    item.addEventListener('click', function () {
      navItems.forEach(n => n.classList.remove('active'));
      this.classList.add('active');

      const sectionId = this.getAttribute('data-section');
      const section = document.getElementById(sectionId);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // FAB في الشريط السفلي
  if (navSave) {
    navSave.addEventListener('click', () => saveAllAttendance());
  }

  // FAB العائم
  const fabSave = document.getElementById('fab-save');
  if (fabSave) {
    fabSave.addEventListener('click', () => saveAllAttendance());
  }
}

// ═══════════════════════════════════
// ■ Long Press Context Menu
// ═══════════════════════════════════

let longPressTimer = null;
let longPressStudentId = null;

function setupLongPressMenu() {
  const menu = document.getElementById('context-menu');
  if (!menu) return;

  // إغلاق القائمة عند الضغط في أي مكان
  document.addEventListener('click', () => { menu.style.display = 'none'; });
  document.addEventListener('touchstart', (e) => {
    if (!menu.contains(e.target)) menu.style.display = 'none';
  }, { passive: true });

  // مستمعات أزرار القائمة
  document.getElementById('ctx-profile')?.addEventListener('click', () => {
    if (longPressStudentId) openStudentProfile(longPressStudentId);
  });
  document.getElementById('ctx-edit')?.addEventListener('click', () => {
    if (longPressStudentId) openEditStudentModal(longPressStudentId);
  });
  document.getElementById('ctx-delete')?.addEventListener('click', () => {
    if (longPressStudentId) confirmDeleteStudent(longPressStudentId);
  });

  // Long press على الجدول (event delegation)
  const tbody = document.getElementById('students-tbody');
  if (!tbody) return;

  tbody.addEventListener('touchstart', function (e) {
    const nameLink = e.target.closest('.student-name-link');
    if (!nameLink) return;

    const row = nameLink.closest('tr[data-id]');
    if (!row) return;

    longPressTimer = setTimeout(() => {
      e.preventDefault();
      longPressStudentId = row.getAttribute('data-id');

      const touch = e.touches[0];
      const x = Math.min(touch.clientX, window.innerWidth - 220);
      const y = Math.min(touch.clientY, window.innerHeight - 160);

      menu.style.left = x + 'px';
      menu.style.top = y + 'px';
      menu.style.display = 'block';

      // haptic feedback if supported
      if (navigator.vibrate) navigator.vibrate(30);
    }, 500);
  }, { passive: false });

  tbody.addEventListener('touchend', () => clearTimeout(longPressTimer));
  tbody.addEventListener('touchmove', () => clearTimeout(longPressTimer));
}

// ═══════════════════════════════════
// ■ Swipe to Refresh
// ═══════════════════════════════════

function setupSwipeToRefresh() {
  let startY = 0;
  let pulling = false;
  const main = document.getElementById('main-content');
  if (!main) return;

  main.addEventListener('touchstart', (e) => {
    if (window.scrollY === 0) {
      startY = e.touches[0].clientY;
      pulling = true;
    }
  }, { passive: true });

  main.addEventListener('touchmove', (e) => {
    if (!pulling) return;
    const diff = e.touches[0].clientY - startY;
    if (diff > 120) {
      pulling = false;
      showToast('جاري تحديث البيانات...', 'success');
      setTimeout(() => {
        renderStudentsTable();
        updateDashboardCards();
        renderWeeklyReport();
        updateMockDataStatus();
        showToast('تم تحديث البيانات');
      }, 300);
    }
  }, { passive: true });

  main.addEventListener('touchend', () => { pulling = false; }, { passive: true });
}

// ═══════════════════════════════════
// ■ إضافة data-label للجدول (بطاقات الموبايل)
// ═══════════════════════════════════

function injectTableDataLabels() {
  const labels = ['م', 'الاسم', 'الحفظ', 'المراجعة', 'الأجزاء', 'الحضور', 'التقييم', 'ملاحظات', 'إجراءات'];

  // مراقب لإضافة data-label عند تحديث الجدول
  const tbody = document.getElementById('students-tbody');
  if (!tbody) return;

  const observer = new MutationObserver(() => {
    tbody.querySelectorAll('tr[data-id]').forEach(row => {
      const cells = row.querySelectorAll('td');
      cells.forEach((td, i) => {
        if (labels[i] && !td.getAttribute('data-label')) {
          td.setAttribute('data-label', labels[i]);
        }
      });
    });
  });

  observer.observe(tbody, { childList: true, subtree: false });

  // تشغيل أولي
  tbody.querySelectorAll('tr[data-id]').forEach(row => {
    const cells = row.querySelectorAll('td');
    cells.forEach((td, i) => {
      if (labels[i]) td.setAttribute('data-label', labels[i]);
    });
  });
}
