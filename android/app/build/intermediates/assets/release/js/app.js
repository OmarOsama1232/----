/**
 * app.js
 * نقطة الدخول الرئيسية للتطبيق
 * - تهيئة التطبيق
 * - ربط الأحداث
 * - FIX 4: التصدير باللقطة (PDF / Print / PNG)
 * - PWA / Offline / Navigation
 */

document.addEventListener('DOMContentLoaded', () => {
  initializeStorage();
  updateDateDisplay();
  renderStudentsTable();
  updateDashboardCards();
  renderWeeklyReport();
  setupEventListeners();
  setupSearchAndFilter();

  const periodSelect = document.getElementById('dashboard-period-select');
  if (periodSelect) {
    periodSelect.addEventListener('change', updateDashboardCards);
  }

  updateMockDataStatus();
  updateStorageStatusCard?.();
  registerServiceWorker();
  setupOfflineDetection();
  setupBottomNavigation();
  setupLongPressMenu();
  setupSwipeToRefresh();
  injectTableDataLabels();

  if (typeof initPrayerTimes === 'function') initPrayerTimes();
  if (typeof initQiblaCompass === 'function') initQiblaCompass();
  if (typeof initBackButton === 'function') initBackButton();
});

// ═══════════════════════════════════════════════════════════
// ■ ربط الأحداث
// ═══════════════════════════════════════════════════════════

function setupEventListeners() {
  document.getElementById('btn-add-student')?.addEventListener('click', openAddStudentModal);
  document.getElementById('btn-save-new-student')?.addEventListener('click', saveNewStudent);
  document.getElementById('btn-cancel-new-student')?.addEventListener('click', () => closeModal('modal-add-student'));
  document.getElementById('btn-save-edit-student')?.addEventListener('click', saveEditStudent);
  document.getElementById('btn-cancel-edit-student')?.addEventListener('click', () => closeModal('modal-edit-student'));
  document.getElementById('btn-save-attendance')?.addEventListener('click', saveAllAttendance);
  document.getElementById('btn-export')?.addEventListener('click', handleExport);
  document.getElementById('btn-export-image')?.addEventListener('click', downloadCurrentReportImage);
  document.getElementById('btn-export-pdf')?.addEventListener('click', exportCurrentReportAsPdf);
  document.getElementById('btn-print-report')?.addEventListener('click', printCurrentReport);
  document.getElementById('btn-import')?.addEventListener('click', () => document.getElementById('import-file')?.click());
  document.getElementById('import-file')?.addEventListener('change', handleImport);
  document.getElementById('btn-close-chart')?.addEventListener('click', () => closeModal('modal-chart'));
  document.getElementById('btn-generate-mock')?.addEventListener('click', handleGenerateMock);
  document.getElementById('btn-delete-mock')?.addEventListener('click', handleDeleteMock);

  document.querySelectorAll('.modal-overlay').forEach((modal) => {
    modal.addEventListener('click', (event) => closeModalOnBackdrop(event, modal.id));
  });

  document.getElementById('new-student-name')?.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') saveNewStudent();
  });

  document.getElementById('edit-student-name')?.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') saveEditStudent();
  });
}

// ═══════════════════════════════════════════════════════════
// ■ البيانات التجريبية
// ═══════════════════════════════════════════════════════════

async function handleGenerateMock() {
  const students = getAllStudents();
  if (students.length === 0) {
    showToast('لا يوجد طلاب لإضافة بيانات تجريبية لهم. أضف طلاباً أولاً.', 'warning');
    return;
  }

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

  setTimeout(() => {
    const result = generateMockData();
    if (result.success) {
      showToast(`تم إنشاء ${result.recordsAdded} سجل تجريبي لـ ${result.studentsCount} طالب`);
      refreshMainViews();
      updateMockDataStatus();
      return;
    }

    if (result.reason === 'no_students') {
      showToast('لا يوجد طلاب!', 'error');
    } else if (result.reason === 'already_exists') {
      showToast('بيانات تجريبية موجودة مسبقاً!', 'warning');
    }
  }, 120);
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
    refreshMainViews();
    updateMockDataStatus();
  }
}

function updateMockDataStatus() {
  const card = document.getElementById('mock-status-card');
  const text = document.getElementById('mock-status-text');
  if (!card || !text) return;

  if (hasMockData()) {
    const records = getDailyRecords();
    const mockCount = records.filter((record) => record._mock === '__mock__').length;
    const realCount = records.length - mockCount;
    card.style.display = 'flex';
    text.textContent = `توجد ${mockCount} سجل تجريبي و ${realCount} سجل حقيقي`;
  } else {
    card.style.display = 'none';
  }
}

// ═══════════════════════════════════════════════════════════
// ■ FIX 4: التصدير باللقطة
// ═══════════════════════════════════════════════════════════

function showExportOverlay(message = 'جاري إنشاء التقرير...') {
  const overlay = document.getElementById('export-loading-overlay');
  const text = document.getElementById('export-loading-text');
  if (!overlay || !text) return;

  text.textContent = message;
  overlay.classList.add('active');
}

function hideExportOverlay() {
  const overlay = document.getElementById('export-loading-overlay');
  if (!overlay) return;
  overlay.classList.remove('active');
}

async function captureElementAsCanvas(element, message = 'جاري إنشاء التقرير...') {
  if (!element) {
    throw new Error('No element provided for capture.');
  }

  if (typeof html2canvas === 'undefined') {
    throw new Error('html2canvas is not available.');
  }

  showExportOverlay(message);

  try {
    await new Promise((resolve) => setTimeout(resolve, 80));
    return await html2canvas(element, {
      scale: 2.5,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: document.documentElement.scrollWidth,
      scrollY: -window.scrollY
    });
  } finally {
    hideExportOverlay();
  }
}

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function exportCanvasToPdf(canvas, filename) {
  if (!window.jspdf?.jsPDF) {
    throw new Error('jsPDF is not available.');
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const imageWidth = pageWidth - (margin * 2);
  const imageHeight = (canvas.height * imageWidth) / canvas.width;
  const imageData = canvas.toDataURL('image/png', 1.0);

  let remainingHeight = imageHeight;
  let positionY = margin;

  pdf.addImage(imageData, 'PNG', margin, positionY, imageWidth, imageHeight, undefined, 'FAST');
  remainingHeight -= (pageHeight - margin * 2);

  while (remainingHeight > 0) {
    positionY = remainingHeight - imageHeight + margin;
    pdf.addPage();
    pdf.addImage(imageData, 'PNG', margin, positionY, imageWidth, imageHeight, undefined, 'FAST');
    remainingHeight -= (pageHeight - margin * 2);
  }

  pdf.save(filename);
}

function printCanvasImage(canvas, title) {
  const printWindow = window.open('', '_blank', 'width=900,height=1200');
  if (!printWindow) {
    throw new Error('تعذر فتح نافذة الطباعة.');
  }

  const imageData = canvas.toDataURL('image/png', 1.0);
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body { margin: 0; padding: 16px; background: #fff; font-family: Cairo, sans-serif; }
        img { width: 100%; height: auto; display: block; }
      </style>
    </head>
    <body>
      <img src="${imageData}" alt="${title}">
      <script>
        window.onload = function () {
          setTimeout(function () {
            window.print();
          }, 200);
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

function getMainReportElement() {
  return document.getElementById('main-table-wrapper');
}

async function downloadCurrentReportImage() {
  try {
    const canvas = await captureElementAsCanvas(getMainReportElement(), 'جاري تجهيز صورة التقرير...');
    downloadDataUrl(canvas.toDataURL('image/png', 1.0), `حلقتنا-report-${getTodayDate()}.png`);
    showToast('تم تحميل التقرير كصورة PNG');
  } catch (error) {
    console.error(error);
    showToast('حدث خطأ أثناء إنشاء صورة التقرير', 'error');
  }
}

async function exportCurrentReportAsPdf() {
  try {
    const canvas = await captureElementAsCanvas(getMainReportElement(), 'جاري إنشاء ملف PDF...');
    await exportCanvasToPdf(canvas, `حلقتنا-report-${getTodayDate()}.pdf`);
    showToast('تم إنشاء ملف PDF بنجاح');
  } catch (error) {
    console.error(error);
    showToast('حدث خطأ أثناء إنشاء ملف PDF', 'error');
  }
}

async function printCurrentReport() {
  try {
    const canvas = await captureElementAsCanvas(getMainReportElement(), 'جاري تجهيز التقرير للطباعة...');
    printCanvasImage(canvas, 'تقرير حلقتنا');
    showToast('تم تجهيز التقرير للطباعة');
  } catch (error) {
    console.error(error);
    showToast('حدث خطأ أثناء تجهيز الطباعة', 'error');
  }
}

// إبقاء الأسماء القديمة متوافقة مع أجزاء التطبيق السابقة.
const exportToPDF = exportCurrentReportAsPdf;
const exportToExcel = downloadCurrentReportImage;

// ═══════════════════════════════════════════════════════════
// ■ النسخة الاحتياطية والاستيراد
// ═══════════════════════════════════════════════════════════

function handleExport() {
  const data = exportAllData();
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const filename = `حلقتنا-backup-${getTodayDate()}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast(`تم تصدير البيانات بنجاح: ${filename}`);
}

function handleImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.name.endsWith('.json')) {
    showToast('يرجى اختيار ملف JSON صالح', 'error');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = async (loadEvent) => {
    try {
      const data = JSON.parse(loadEvent.target.result);
      if (!data.students || !data.dailyRecords) {
        showToast('الملف غير صالح: يجب أن يحتوي على students و dailyRecords', 'error');
        return;
      }

      const confirmed = await showConfirm(
        `سيتم استبدال جميع البيانات الحالية بالبيانات المستوردة!\nالملف يحتوي على ${data.students.length} طالب و ${data.dailyRecords.length} سجل.\nهل أنت متأكد؟`,
        'تأكيد استيراد البيانات'
      );

      if (!confirmed) return;

      const success = importAllData(data);
      if (success) {
        showToast('تم استيراد البيانات بنجاح! جاري إعادة تحميل الصفحة...');
        setTimeout(() => location.reload(), 1200);
      } else {
        showToast('حدث خطأ أثناء استيراد البيانات', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('خطأ في قراءة الملف: تأكد أنه ملف JSON صالح', 'error');
    }
  };

  reader.readAsText(file);
  event.target.value = '';
}

// ═══════════════════════════════════════════════════════════
// ■ Service Worker / Offline
// ═══════════════════════════════════════════════════════════

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('./sw.js').then((registration) => {
    console.log('Service Worker registered:', registration.scope);
  }).catch((error) => {
    console.warn('Service Worker registration failed:', error);
  });
}

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

// ═══════════════════════════════════════════════════════════
// ■ Bottom Navigation
// ═══════════════════════════════════════════════════════════

function setupBottomNavigation() {
  document.querySelectorAll('.bottom-nav-item[data-section]').forEach((item) => {
    item.addEventListener('click', () => {
      const sectionId = item.getAttribute('data-section');
      window.HalaqatnaNavigation?.registerSection(sectionId, { behavior: 'smooth' });
    });
  });

  document.getElementById('nav-save-attendance')?.addEventListener('click', saveAllAttendance);
  document.getElementById('fab-save')?.addEventListener('click', saveAllAttendance);
}

// ═══════════════════════════════════════════════════════════
// ■ Long Press Context Menu
// ═══════════════════════════════════════════════════════════

let longPressTimer = null;
let longPressStudentId = null;

function setupLongPressMenu() {
  const menu = document.getElementById('context-menu');
  const tbody = document.getElementById('students-tbody');
  if (!menu || !tbody) return;

  document.addEventListener('click', () => {
    menu.style.display = 'none';
  });

  document.addEventListener('touchstart', (event) => {
    if (!menu.contains(event.target)) {
      menu.style.display = 'none';
    }
  }, { passive: true });

  document.getElementById('ctx-profile')?.addEventListener('click', () => {
    if (longPressStudentId) openStudentProfile(longPressStudentId);
  });
  document.getElementById('ctx-edit')?.addEventListener('click', () => {
    if (longPressStudentId) openEditStudentModal(longPressStudentId);
  });
  document.getElementById('ctx-delete')?.addEventListener('click', () => {
    if (longPressStudentId) confirmDeleteStudent(longPressStudentId);
  });

  tbody.addEventListener('touchstart', (event) => {
    const nameLink = event.target.closest('.student-name-link');
    if (!nameLink) return;

    const row = nameLink.closest('tr[data-id]');
    if (!row) return;

    longPressTimer = setTimeout(() => {
      event.preventDefault();
      longPressStudentId = row.getAttribute('data-id');
      const touch = event.touches[0];
      const x = Math.min(touch.clientX, window.innerWidth - 220);
      const y = Math.min(touch.clientY, window.innerHeight - 160);
      menu.style.left = `${x}px`;
      menu.style.top = `${y}px`;
      menu.style.display = 'block';
      if (navigator.vibrate) navigator.vibrate(30);
    }, 500);
  }, { passive: false });

  tbody.addEventListener('touchend', () => clearTimeout(longPressTimer));
  tbody.addEventListener('touchmove', () => clearTimeout(longPressTimer));
}

// ═══════════════════════════════════════════════════════════
// ■ Swipe To Refresh
// ═══════════════════════════════════════════════════════════

function setupSwipeToRefresh() {
  let startY = 0;
  let pulling = false;
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  mainContent.addEventListener('touchstart', (event) => {
    if (window.scrollY === 0) {
      startY = event.touches[0].clientY;
      pulling = true;
    }
  }, { passive: true });

  mainContent.addEventListener('touchmove', (event) => {
    if (!pulling) return;
    const diff = event.touches[0].clientY - startY;
    if (diff > 120) {
      pulling = false;
      showToast('جاري تحديث البيانات...', 'success');
      setTimeout(() => {
        refreshMainViews();
        updateMockDataStatus();
        showToast('تم تحديث البيانات');
      }, 300);
    }
  }, { passive: true });

  mainContent.addEventListener('touchend', () => {
    pulling = false;
  }, { passive: true });
}

// ═══════════════════════════════════════════════════════════
// ■ تحسين عرض الجدول كبطاقات
// ═══════════════════════════════════════════════════════════

function injectTableDataLabels() {
  const labels = ['م', 'الاسم', 'الحفظ', 'المراجعة', 'الأجزاء', 'الحضور', 'التقييم', 'ملاحظات', 'إجراءات'];
  const tbody = document.getElementById('students-tbody');
  if (!tbody) return;

  const applyLabels = () => {
    tbody.querySelectorAll('tr[data-id]').forEach((row) => {
      const cells = row.querySelectorAll('td');
      cells.forEach((cell, index) => {
        if (labels[index]) {
          cell.setAttribute('data-label', labels[index]);
        }
      });
    });
  };

  const observer = new MutationObserver(applyLabels);
  observer.observe(tbody, { childList: true, subtree: false });
  applyLabels();
}

function refreshMainViews() {
  renderStudentsTable();
  updateDashboardCards();
  renderWeeklyReport();
  updateStorageStatusCard?.();
}
