/**
 * profile.js
 * إدارة الملف الشخصي للطالب
 * - عرض الإحصاءات والسجل والرسم البياني
 * - FIX 4: تصدير الملف الشخصي باللقطة
 */

let currentProfileStudentId = null;
let profileChart = null;

function getStudentProfileCaptureElement() {
  return document.getElementById('student-profile-report');
}

function openStudentProfile(studentId) {
  currentProfileStudentId = studentId;
  const student = getStudentById(studentId);
  if (!student) return;

  document.getElementById('profile-student-name').textContent = student.name;
  updateProfileSidebar(student);
  updateProfileView('all');
  openModal('modal-student-profile');
}

function updateProfileSidebar(student) {
  const container = document.getElementById('profile-sidebar-info');
  if (!container) return;

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

function updateProfileView(period) {
  document.querySelectorAll('.filter-period-btn').forEach((button) => {
    button.classList.toggle('active', button.getAttribute('data-period') === period);
  });

  const student = getStudentById(currentProfileStudentId);
  if (!student) return;

  const records = getRecordsForPeriod(currentProfileStudentId, period);
  const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));
  renderProfileStats(sortedRecords, period);
  renderProfileChart(sortedRecords);
  renderProfileTimeline(sortedRecords);
}

function renderProfileStats(records, period) {
  const validRecords = records.filter((record) => isClassDay(record.date));
  const presentRecords = validRecords.filter((record) => record.present);

  const presentDays = presentRecords.length;
  let expectedDays = 0;

  if (period === 'week') expectedDays = EXPECTED_DAYS_PER_WEEK;
  else if (period === 'month') expectedDays = 8;
  else if (period === 'year') expectedDays = 100;
  else expectedDays = validRecords.length > 0 ? validRecords.length : 1;

  if (period === 'all' && expectedDays < presentDays) {
    expectedDays = presentDays;
  }

  const attendanceRate = expectedDays > 0 ? Math.min(Math.round((presentDays / expectedDays) * 100), 100) : 0;
  const ratings = presentRecords.map((record) => record.rating);
  const totalRating = ratings.reduce((sum, rating) => sum + rating, 0);
  const bestRating = ratings.length ? Math.max(...ratings) : 0;
  const avgRating = ratings.length ? (totalRating / ratings.length).toFixed(1) : '0.0';

  document.getElementById('prof-stat-attendance-days').textContent = presentDays;
  document.getElementById('prof-stat-attendance-rate').textContent = `${attendanceRate}%`;
  document.getElementById('prof-stat-avg-rating').textContent = avgRating;
  document.getElementById('prof-stat-best-rating').textContent = bestRating;
}

function renderProfileChart(records) {
  const canvas = document.getElementById('profile-chart');
  if (!canvas) return;

  if (profileChart) profileChart.destroy();

  const validRecords = records.filter((record) => isClassDay(record.date));
  const labels = validRecords.map((record) => record.date.substring(5));
  const ratings = validRecords.map((record) => record.present ? record.rating : null);

  profileChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
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

function renderProfileTimeline(records) {
  const container = document.getElementById('profile-timeline');
  if (!container) return;

  const reversedRecords = [...records].reverse();
  if (reversedRecords.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:20px; color:#6b7280;">لا توجد سجلات في هذه الفترة</div>';
    return;
  }

  container.innerHTML = reversedRecords.map((record) => {
    if (!isClassDay(record.date) && !record.present && !record.note) return '';

    const statusText = record.present
      ? `<span style="color:var(--color-primary-light);"><i class="fas fa-check-circle"></i> حاضر (التقييم: ${record.rating})</span>`
      : `<span style="color:var(--color-danger);"><i class="fas fa-times-circle"></i> غائب</span>`;

    const noteHtml = record.note
      ? `<div style="margin-top: 8px; background: #fffbeb; padding: 8px; border-radius: 4px; border-right: 3px solid var(--color-accent); font-size: 13px;"><strong>ملاحظة:</strong> ${record.note}</div>`
      : '';

    return `
      <div class="timeline-item">
        <div class="timeline-date">${record.date}</div>
        <div class="timeline-content">
          <div>${statusText}</div>
          ${noteHtml}
        </div>
      </div>
    `;
  }).join('');
}

async function exportStudentProfilePdf() {
  if (!currentProfileStudentId) return;
  const student = getStudentById(currentProfileStudentId);
  if (!student) return;

  try {
    const canvas = await captureElementAsCanvas(getStudentProfileCaptureElement(), 'جاري إنشاء ملف PDF لتقرير الطالب...');
    await exportCanvasToPdf(canvas, `حلقتنا-${student.name}-report-${getTodayDate()}.pdf`);
    showToast('تم إنشاء PDF لتقرير الطالب');
  } catch (error) {
    console.error(error);
    showToast('حدث خطأ أثناء إنشاء PDF للطالب', 'error');
  }
}

async function printStudentProfileReport() {
  if (!currentProfileStudentId) return;
  const student = getStudentById(currentProfileStudentId);
  if (!student) return;

  try {
    const canvas = await captureElementAsCanvas(getStudentProfileCaptureElement(), 'جاري تجهيز تقرير الطالب للطباعة...');
    printCanvasImage(canvas, `تقرير الطالب - ${student.name}`);
    showToast('تم تجهيز تقرير الطالب للطباعة');
  } catch (error) {
    console.error(error);
    showToast('حدث خطأ أثناء تجهيز طباعة تقرير الطالب', 'error');
  }
}

async function downloadStudentProfileImage() {
  if (!currentProfileStudentId) return;
  const student = getStudentById(currentProfileStudentId);
  if (!student) return;

  try {
    const canvas = await captureElementAsCanvas(getStudentProfileCaptureElement(), 'جاري تجهيز صورة تقرير الطالب...');
    downloadDataUrl(canvas.toDataURL('image/png', 1.0), `حلقتنا-${student.name}-report-${getTodayDate()}.png`);
    showToast('تم تحميل تقرير الطالب كصورة PNG');
  } catch (error) {
    console.error(error);
    showToast('حدث خطأ أثناء إنشاء صورة تقرير الطالب', 'error');
  }
}

// توافق مع الأسماء السابقة.
const printStudentProfile = printStudentProfileReport;
const exportStudentExcel = downloadStudentProfileImage;

async function deleteStudentFromProfile() {
  if (!currentProfileStudentId) return;
  const student = getStudentById(currentProfileStudentId);
  if (!student) return;

  const recordsCount = getRecordsForStudent(currentProfileStudentId).length;
  const confirmed = await showConfirm(
    `هل أنت متأكد من حذف الطالب "${student.name}" بجميع بياناته (${recordsCount} سجل)؟\nلا يمكن التراجع عن هذا الإجراء.`,
    'تأكيد حذف الطالب'
  );

  if (!confirmed) return;

  deleteStudent(currentProfileStudentId);
  closeModal('modal-student-profile');
  renderStudentsTable();
  updateDashboardCards();
  renderWeeklyReport();
  showToast('تم حذف الطالب بنجاح');
}

function openEditStudentFromProfile() {
  if (!currentProfileStudentId) return;
  closeModal('modal-student-profile');
  openEditStudentModal(currentProfileStudentId);
}
