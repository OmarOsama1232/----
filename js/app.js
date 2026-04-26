/**
 * app.js
 * نقطة الدخول الرئيسية للتطبيق
 * - تهيئة التطبيق عند تحميل الصفحة
 * - ربط جميع الأحداث (Event Listeners)
 * - دوال التصدير والاستيراد
 * - إدارة البيانات التجريبية
 */

// ═══════════════════════════════════
// ■ تهيئة التطبيق
// ═══════════════════════════════════

document.addEventListener('DOMContentLoaded', function () {
  // 1. تهيئة LocalStorage مع التحقق من صحة البيانات
  initializeStorage();

  // 2. عرض التاريخ الحالي
  updateDateDisplay();

  // 3. رسم جدول الطلاب مع بيانات اليوم المحفوظة
  renderStudentsTable();

  // 4. حساب وعرض بطاقات الإحصائيات
  updateDashboardCards();

  // 5. حساب وعرض جدول التقارير الأسبوعية
  renderWeeklyReport();

  // 6. ربط كل الأزرار بأحداثها
  setupEventListeners();

  // 7. إعداد البحث والتصفية
  setupSearchAndFilter();

  // 8. مستمع تغيير فترة لوحة التحكم
  const periodSelect = document.getElementById('dashboard-period-select');
  if (periodSelect) {
    periodSelect.addEventListener('change', updateDashboardCards);
  }

  // 9. تحديث حالة البيانات التجريبية
  updateMockDataStatus();
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
