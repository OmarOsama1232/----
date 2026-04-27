/**
 * profile.js
 * إدارة صفحة الملف الشخصي للطالب
 */

let currentProfileStudentId = null;
let profileChart = null;

/**
 * فتح نافذة الملف الشخصي لطالب
 */
function openStudentProfile(studentId) {
  currentProfileStudentId = studentId;
  const student = getStudentById(studentId);
  if (!student) return;
  
  document.getElementById('profile-student-name').textContent = student.name;
  
  // تحديث الشريط الجانبي
  updateProfileSidebar(student);
  
  // تحديث العرض للافتراضي (كل الوقت)
  updateProfileView('all');
  
  openModal('modal-student-profile');
}

/**
 * تحديث معلومات الشريط الجانبي
 */
function updateProfileSidebar(student) {
  const container = document.getElementById('profile-sidebar-info');
  const partsPercentage = Math.round((student.partsMemorized / MAX_PARTS) * 100);
  
  container.innerHTML = `
    <div style="margin-bottom: 15px;">
      <div style="font-size: 13px; color: var(--color-gray);">الأجزاء المحفوظة</div>
      <div style="font-size: 18px; font-weight: bold; color: var(--color-primary);">${student.partsMemorized} / ${MAX_PARTS}</div>
      <div class="progress-bar" style="margin-top: 5px;">
        <div class="progress-fill" style="width: ${partsPercentage}%"></div>
      </div>
    </div>
    <div style="margin-bottom: 15px;">
      <div style="font-size: 13px; color: var(--color-gray);">الحفظ الحالي</div>
      <div style="font-weight: 600;">${formatHifzText(student.currentHifz)}</div>
    </div>
    <div>
      <div style="font-size: 13px; color: var(--color-gray);">المراجعة المطلوبة</div>
      <div style="font-weight: 600;">${formatHifzText(student.currentReview)}</div>
    </div>
  `;
}

/**
 * تحديث العرض بناءً على الفترة الزمنية المحددة
 */
function updateProfileView(period) {
  // تحديث الأزرار
  document.querySelectorAll('.filter-period-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-period') === period) {
      btn.classList.add('active');
    }
  });
  
  const student = getStudentById(currentProfileStudentId);
  if (!student) return;
  
  const records = getRecordsForPeriod(currentProfileStudentId, period);
  // ترتيب السجلات من الأقدم للأحدث للرسم البياني والسجل
  const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));
  
  renderProfileStats(student, sortedRecords, period);
  renderProfileChart(sortedRecords);
  renderProfileTimeline(sortedRecords);
}

/**
 * عرض الإحصائيات في المربعات العلوية
 */
function renderProfileStats(student, records, period) {
  // تصفية أيام الحلقة فقط
  const validRecords = records.filter(r => isClassDay(r.date));
  const presentRecords = validRecords.filter(r => r.present);
  
  const presentDays = presentRecords.length;
  
  // تحديد عدد أيام الحلقة المتوقعة في هذه الفترة
  let expectedDays = 0;
  if (period === 'week') expectedDays = EXPECTED_DAYS_PER_WEEK;
  else if (period === 'month') expectedDays = 8; // تقريبي
  else if (period === 'year') expectedDays = 100; // تقريبي
  else expectedDays = validRecords.length > 0 ? validRecords.length : 1; // كل الوقت
  
  if (period === 'all' && expectedDays < presentDays) expectedDays = presentDays;
  
  // نسبة الحضور
  const attendanceRate = expectedDays > 0 ? Math.min(Math.round((presentDays / expectedDays) * 100), 100) : 0;
  
  // متوسط التقييم وأفضل تقييم
  let totalRating = 0;
  let bestRating = 0;
  
  presentRecords.forEach(r => {
    totalRating += r.rating;
    if (r.rating > bestRating) bestRating = r.rating;
  });
  
  const avgRating = presentDays > 0 ? (totalRating / presentDays).toFixed(1) : '0.0';
  
  document.getElementById('prof-stat-attendance-days').textContent = presentDays;
  document.getElementById('prof-stat-attendance-rate').textContent = attendanceRate + '%';
  document.getElementById('prof-stat-avg-rating').textContent = avgRating;
  document.getElementById('prof-stat-best-rating').textContent = bestRating;
}

/**
 * رسم بياني لتطور التقييم
 */
function renderProfileChart(records) {
  const canvas = document.getElementById('profile-chart');
  if (!canvas) return;
  
  if (profileChart) {
    profileChart.destroy();
  }
  
  const validRecords = records.filter(r => isClassDay(r.date));
  
  const labels = validRecords.map(r => r.date.substring(5)); // إظهار الشهر واليوم فقط MM-DD
  const ratings = validRecords.map(r => r.present ? r.rating : null); // null للغياب
  
  const ctx = canvas.getContext('2d');
  profileChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'التقييم',
        data: ratings,
        borderColor: '#166534',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        pointBackgroundColor: '#22c55e',
        tension: 0.3,
        fill: true,
        spanGaps: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 10
        }
      }
    }
  });
}

/**
 * عرض السجل الزمني (التايم لاين) والملاحظات
 */
function renderProfileTimeline(records) {
  const container = document.getElementById('profile-timeline');
  if (!container) return;
  
  // عرض من الأحدث للأقدم
  const reversedRecords = [...records].reverse();
  
  if (reversedRecords.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:20px; color:#6b7280;">لا توجد سجلات في هذه الفترة</div>';
    return;
  }
  
  let html = '';
  reversedRecords.forEach(r => {
    // إخفاء الأيام التي ليست أيام حلقة إذا لم يكن فيها حضور أو ملاحظة
    if (!isClassDay(r.date) && !r.present && !r.note) return;
    
    const statusText = r.present ? `<span style="color:var(--color-primary-light);"><i class="fas fa-check-circle"></i> حاضر (التقييم: ${r.rating})</span>` : `<span style="color:var(--color-danger);"><i class="fas fa-times-circle"></i> غائب</span>`;
    
    const noteHtml = r.note ? `<div style="margin-top: 8px; background: #fffbeb; padding: 8px; border-radius: 4px; border-right: 3px solid var(--color-accent); font-size: 13px;"><strong>ملاحظة:</strong> ${r.note}</div>` : '';
    
    html += `
      <div class="timeline-item">
        <div class="timeline-date">${r.date}</div>
        <div class="timeline-content">
          <div>${statusText}</div>
          ${noteHtml}
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

/**
 * طباعة تقرير الطالب (PDF)
 */
function printStudentProfile() {
  showToast('جاري تجهيز تقرير الطالب للطباعة...', 'success');
  
  document.body.classList.add('print-profile-mode');
  
  // دالة لإزالة الكلاس بعد الانتهاء من الطباعة أو إلغائها
  const afterPrint = () => {
    document.body.classList.remove('print-profile-mode');
    window.removeEventListener('afterprint', afterPrint);
  };
  window.addEventListener('afterprint', afterPrint);
  
  // تأخير بسيط للسماح للمتصفح بتطبيق الـ CSS قبل استدعاء نافذة الطباعة
  setTimeout(() => {
    window.print();
    // fallback في حال لم يعمل الحدث afterprint على بعض المتصفحات
    setTimeout(() => {
      document.body.classList.remove('print-profile-mode');
    }, 2000);
  }, 500);
}

/**
 * تصدير بيانات الطالب إلى Excel
 */
function exportStudentExcel() {
  if (typeof XLSX === 'undefined') {
    showToast('مكتبة SheetJS غير متوفرة', 'error');
    return;
  }

  if (!currentProfileStudentId) return;
  const student = getStudentById(currentProfileStudentId);
  if (!student) return;

  const records = getRecordsForStudent(currentProfileStudentId);
  const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));

  if (sortedRecords.length === 0) {
    showToast('لا توجد بيانات كافية للتصدير', 'warning');
    return;
  }

  const wb = XLSX.utils.book_new();

  // Sheet 1: السجل الكامل
  const historyData = [
    ['التاريخ', 'الحالة', 'التقييم', 'الملاحظة']
  ];
  
  sortedRecords.forEach(r => {
    historyData.push([
      r.date,
      r.present ? 'حاضر' : 'غائب',
      r.present ? r.rating : '-',
      r.note || ''
    ]);
  });
  
  const wsHistory = XLSX.utils.aoa_to_sheet(historyData);
  // دعم اتجاه النص (من اليمين لليسار)
  if(!wsHistory['!views']) wsHistory['!views'] = [];
  wsHistory['!views'].push({ rightToLeft: true });
  wsHistory['!dir'] = 'rtl';
  
  XLSX.utils.book_append_sheet(wb, wsHistory, "السجل الكامل");

  // Sheet 2: ملخص البيانات
  const validRecords = sortedRecords.filter(r => isClassDay(r.date));
  const presentDays = validRecords.filter(r => r.present).length;
  let totalRating = 0;
  validRecords.filter(r => r.present).forEach(r => totalRating += r.rating);
  const avgRating = presentDays > 0 ? (totalRating / presentDays).toFixed(2) : 0;
  
  const summaryData = [
    ['الاسم', student.name],
    ['الأجزاء المحفوظة', `${student.partsMemorized} من ${MAX_PARTS}`],
    ['الحفظ الحالي', formatHifzText(student.currentHifz)],
    ['المراجعة المطلوبة', formatHifzText(student.currentReview)],
    ['إجمالي أيام الحضور', presentDays],
    ['متوسط التقييم', avgRating]
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  if(!wsSummary['!views']) wsSummary['!views'] = [];
  wsSummary['!views'].push({ rightToLeft: true });
  wsSummary['!dir'] = 'rtl';
  
  XLSX.utils.book_append_sheet(wb, wsSummary, "ملخص البيانات");

  XLSX.writeFile(wb, `تقرير_الطالب_${student.name.replace(/ /g, '_')}.xlsx`);
  showToast('تم تصدير ملف Excel بنجاح', 'success');
}

/**
 * حذف الطالب من داخل الملف الشخصي
 */
async function deleteStudentFromProfile() {
  if (!currentProfileStudentId) return;
  const student = getStudentById(currentProfileStudentId);
  if (!student) return;

  const recordsCount = getRecordsForStudent(currentProfileStudentId).length;

  const confirmed = await showConfirm(
    `هل أنت متأكد من حذف الطالب "${student.name}" بجميع بياناته (${recordsCount} سجل)؟\nلا يمكن التراجع عن هذا الإجراء.`,
    'تأكيد حذف الطالب'
  );

  if (confirmed) {
    deleteStudent(currentProfileStudentId);
    closeModal('modal-student-profile');
    renderStudentsTable();
    updateDashboardCards();
    renderWeeklyReport();
    showToast('تم حذف الطالب بنجاح');
  }
}

/**
 * تعديل بيانات الطالب من داخل الملف الشخصي
 */
function openEditStudentFromProfile() {
  if (!currentProfileStudentId) return;
  closeModal('modal-student-profile');
  openEditStudentModal(currentProfileStudentId);
}
