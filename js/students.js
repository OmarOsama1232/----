/**
 * students.js
 * إدارة الطلاب: إضافة، تعديل، حذف
 * رسم جدول الطلاب الرئيسي
 */

// ═══════════════════════════════════
// ■ إضافة طالب جديد
// ═══════════════════════════════════

/**
 * فتح نافذة إضافة طالب جديد
 */
function openAddStudentModal() {
  const input = document.getElementById('new-student-name');
  if (input) {
    input.value = '';
  }
  openModal('modal-add-student');
  // التركيز على حقل الاسم
  setTimeout(() => {
    if (input) input.focus();
  }, 100);
}

/**
 * حفظ الطالب الجديد من الـ Modal
 */
function saveNewStudent() {
  const input = document.getElementById('new-student-name');
  const name = input.value.trim();
  
  if (!name) {
    showToast('يرجى إدخال اسم الطالب', 'error');
    return;
  }
  
  // إنشاء كائن الطالب الجديد
  const student = {
    id: crypto.randomUUID(),
    name: name,
    currentMemorization: {
      surah: '',
      surahNumber: 0,
      details: ''
    },
    revision: {
      surah: '',
      surahNumber: 0,
      details: ''
    },
    partsMemorized: 0,
    createdAt: new Date().toISOString()
  };
  
  // حفظ في LocalStorage
  saveStudent(student);
  
  // إغلاق الـ Modal
  closeModal('modal-add-student');
  
  // إعادة رسم الواجهة
  renderStudentsTable();
  updateDashboardCards();
  renderWeeklyReport();
  
  showToast(`تمت إضافة الطالب "${name}" بنجاح`);
}

// ═══════════════════════════════════
// ■ تعديل اسم الطالب
// ═══════════════════════════════════

/**
 * فتح نافذة تعديل اسم الطالب
 * @param {string} studentId - معرف الطالب
 */
function openEditStudentModal(studentId) {
  const student = getStudentById(studentId);
  if (!student) return;
  
  const input = document.getElementById('edit-student-name');
  const hiddenId = document.getElementById('edit-student-id');
  
  if (input && hiddenId) {
    input.value = student.name;
    hiddenId.value = student.id;
  }
  
  openModal('modal-edit-student');
  setTimeout(() => {
    if (input) input.focus();
  }, 100);
}

/**
 * حفظ تعديل اسم الطالب
 */
function saveEditStudent() {
  const input = document.getElementById('edit-student-name');
  const hiddenId = document.getElementById('edit-student-id');
  const name = input.value.trim();
  const studentId = hiddenId.value;
  
  if (!name) {
    showToast('يرجى إدخال اسم الطالب', 'error');
    return;
  }
  
  const student = getStudentById(studentId);
  if (!student) return;
  
  student.name = name;
  updateStudent(student);
  
  closeModal('modal-edit-student');
  renderStudentsTable();
  renderWeeklyReport();
  
  showToast(`تم تعديل اسم الطالب بنجاح`);
}

// ═══════════════════════════════════
// ■ حذف طالب
// ═══════════════════════════════════

/**
 * حذف طالب مع تأكيد مخصص (حذف آمن شامل)
 * @param {string} studentId - معرف الطالب
 */
async function confirmDeleteStudent(studentId) {
  const student = getStudentById(studentId);
  if (!student) return;

  const recordsCount = getRecordsForStudent(studentId).length;

  const confirmed = await showConfirm(
    `هل أنت متأكد من حذف الطالب "${student.name}"؟\nسيتم حذف جميع سجلاته (${recordsCount} سجل) نهائياً!\nلا يمكن التراجع عن هذا الإجراء.`,
    'تأكيد حذف الطالب'
  );

  if (confirmed) {
    deleteStudent(studentId);
    renderStudentsTable();
    updateDashboardCards();
    renderWeeklyReport();
    showToast(`تم حذف الطالب "${student.name}" وجميع سجلاته (${recordsCount} سجل)`);
  }
}

// ═══════════════════════════════════
// ■ تعديل بيانات الحفظ والمراجعة
// ═══════════════════════════════════

/**
 * حفظ تعديلات الحفظ الحالي لطالب من الجدول
 * @param {string} studentId - معرف الطالب
 */
function saveMemorizationInline(studentId) {
  const row = document.querySelector(`tr[data-id="${studentId}"]`);
  if (!row) return;
  
  const surahSelect = row.querySelector('.mem-surah-select');
  const detailsInput = row.querySelector('.mem-details-input');
  
  const student = getStudentById(studentId);
  if (!student) return;
  
  const surahNumber = parseInt(surahSelect.value) || 0;
  const surah = SURAHS.find(s => s.number === surahNumber);
  
  student.currentMemorization = {
    surah: surah ? surah.name : '',
    surahNumber: surahNumber,
    details: detailsInput.value.trim()
  };
  
  updateStudent(student);
  showToast('تم حفظ الحفظ الحالي');
}

/**
 * حفظ تعديلات المراجعة لطالب من الجدول
 * @param {string} studentId - معرف الطالب
 */
function saveRevisionInline(studentId) {
  const row = document.querySelector(`tr[data-id="${studentId}"]`);
  if (!row) return;
  
  const surahSelect = row.querySelector('.rev-surah-select');
  const detailsInput = row.querySelector('.rev-details-input');
  
  const student = getStudentById(studentId);
  if (!student) return;
  
  const surahNumber = parseInt(surahSelect.value) || 0;
  const surah = SURAHS.find(s => s.number === surahNumber);
  
  student.revision = {
    surah: surah ? surah.name : '',
    surahNumber: surahNumber,
    details: detailsInput.value.trim()
  };
  
  updateStudent(student);
  showToast('تم حفظ المراجعة');
}

// ═══════════════════════════════════
// ■ تعديل الأجزاء المحفوظة
// ═══════════════════════════════════

/**
 * زيادة عدد الأجزاء المحفوظة بمقدار 1
 * @param {string} studentId - معرف الطالب
 */
function incrementParts(studentId) {
  const student = getStudentById(studentId);
  if (!student) return;
  
  if (student.partsMemorized < MAX_PARTS) {
    student.partsMemorized += 1;
    updateStudent(student);
    updatePartsDisplay(studentId, student.partsMemorized);
    renderWeeklyReport();
  }
}

/**
 * إنقاص عدد الأجزاء المحفوظة بمقدار 1
 * @param {string} studentId - معرف الطالب
 */
function decrementParts(studentId) {
  const student = getStudentById(studentId);
  if (!student) return;
  
  if (student.partsMemorized > 0) {
    student.partsMemorized -= 1;
    updateStudent(student);
    updatePartsDisplay(studentId, student.partsMemorized);
    renderWeeklyReport();
  }
}

/**
 * تحديث عرض الأجزاء في الجدول بدون إعادة رسم كل الجدول
 * @param {string} studentId - معرف الطالب
 * @param {number} parts - العدد الجديد
 */
function updatePartsDisplay(studentId, parts) {
  const row = document.querySelector(`tr[data-id="${studentId}"]`);
  if (!row) return;
  
  const partsNum = row.querySelector('.parts-number');
  const progressFill = row.querySelector('.parts-progress .progress-fill');
  
  if (partsNum) partsNum.textContent = `${parts}/${MAX_PARTS}`;
  if (progressFill) {
    const percentage = Math.round((parts / MAX_PARTS) * 100);
    progressFill.style.width = `${percentage}%`;
  }
}

// ═══════════════════════════════════
// ■ رسم جدول الطلاب الرئيسي
// ═══════════════════════════════════

/**
 * رسم جدول الطلاب الرئيسي مع بيانات اليوم
 * @param {Array} filteredStudents - مصفوفة الطلاب المعروضة (اختياري)
 */
function renderStudentsTable(filteredStudents) {
  const tbody = document.getElementById('students-tbody');
  if (!tbody) return;
  
  const students = filteredStudents || getAllStudents();
  const today = getTodayDate();
  const todayRecords = getRecordsByDate(today);
  
  if (students.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-table">
          <div class="empty-state">
            <i class="fas fa-users"></i>
            <p>لا يوجد طلاب بعد</p>
            <p class="empty-hint">اضغط على "إضافة طالب جديد" للبدء</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  let html = '';
  const topStudents = typeof getTopStudentsWeekly === 'function' ? getTopStudentsWeekly() : [];

  students.forEach((student, index) => {
    // جلب سجل اليوم لهذا الطالب
    const todayRecord = todayRecords.find(r => r.studentId === student.id);
    const isPresent = todayRecord ? todayRecord.present : false;
    const rating = todayRecord ? todayRecord.rating : 5;
    const note = todayRecord ? (todayRecord.note || '') : '';
    
    // حساب بيانات الشارات وألوان الصفوف
    const last7Records = getRecordsLast7Days(student.id);
    const validLast7 = last7Records.filter(r => isClassDay(r.date));
    
    let presentCount = 0;
    let sumRating = 0;

    validLast7.forEach(r => {
      if (r.present) {
        presentCount++;
        sumRating += r.rating;
      }
    });

    // لحساب 3 أيام متتالية، نحتاج لفترة أطول (لأن الأسبوع فيه يومان فقط)
    const last14Records = getRecordsForPeriod(student.id, 'month').filter(r => isClassDay(r.date)).slice(-6); // آخر 6 أيام حلقة
    let maxConsecutive10 = 0;
    let currentConsecutive10 = 0;
    
    const sortedDaysFor10s = [...last14Records].sort((a, b) => a.date.localeCompare(b.date));
    sortedDaysFor10s.forEach(r => {
      if (r.present && r.rating === 10) {
        currentConsecutive10++;
        if (currentConsecutive10 > maxConsecutive10) maxConsecutive10 = currentConsecutive10;
      } else {
        currentConsecutive10 = 0;
      }
    });

    // لون الصف حسب التقييم
    let rowClass = '';
    if (presentCount > 0) {
      const avgRating = sumRating / presentCount;
      if (avgRating >= 8) rowClass = 'row-high';
      else if (avgRating >= 5) rowClass = 'row-mid';
      else rowClass = 'row-low';
    }

    // الشارات
    const isTop5 = topStudents.some(t => t.student.id === student.id);
    const isFullAttendance = presentCount >= EXPECTED_DAYS_PER_WEEK;
    const has3Consecutive10s = maxConsecutive10 >= 3;

    let badgesHtml = '<div class="student-badges">';
    if (isTop5) badgesHtml += '<span class="badge-icon" title="نجم الأسبوع: من أفضل 5 طلاب">🌟</span>';
    if (isFullAttendance) badgesHtml += '<span class="badge-icon" title="شارة الحضور: حضور كامل">✅</span>';
    if (has3Consecutive10s) badgesHtml += '<span class="badge-icon" title="شارة التميز: تقييم 10 لثلاثة أيام متتالية">💎</span>';
    badgesHtml += '</div>';

    const partsPercentage = Math.round((student.partsMemorized / MAX_PARTS) * 100);
    
    html += `
      <tr data-id="${student.id}" class="${rowClass}">
        <td class="col-num">${index + 1}</td>
        <td class="col-name">
          ${badgesHtml}
          <a href="#" class="student-name-link" onclick="openStudentProfile('${student.id}'); return false;">${student.name}</a>
        </td>
        <td class="col-memorization">
          <div class="inline-edit-group">
            ${buildSurahSelect('mem-surah', student.currentMemorization.surahNumber, 'mem-surah-select')}
            <input type="text" class="mem-details-input inline-input" 
                   value="${student.currentMemorization.details}" 
                   placeholder="التفاصيل...">
            <button class="btn-save-inline" onclick="saveMemorizationInline('${student.id}')" title="حفظ">
              <i class="fas fa-save"></i>
            </button>
          </div>
        </td>
        <td class="col-revision">
          <div class="inline-edit-group">
            ${buildSurahSelect('rev-surah', student.revision.surahNumber, 'rev-surah-select')}
            <input type="text" class="rev-details-input inline-input" 
                   value="${student.revision.details}" 
                   placeholder="التفاصيل...">
            <button class="btn-save-inline" onclick="saveRevisionInline('${student.id}')" title="حفظ">
              <i class="fas fa-save"></i>
            </button>
          </div>
        </td>
        <td class="col-parts">
          <div class="parts-control">
            <button class="btn-parts btn-parts-minus" onclick="decrementParts('${student.id}')">
              <i class="fas fa-minus"></i>
            </button>
            <span class="parts-number">${student.partsMemorized}/${MAX_PARTS}</span>
            <button class="btn-parts btn-parts-plus" onclick="incrementParts('${student.id}')">
              <i class="fas fa-plus"></i>
            </button>
          </div>
          <div class="progress-bar parts-progress">
            <div class="progress-fill" style="width: ${partsPercentage}%"></div>
          </div>
        </td>
        <td class="col-attendance">
          <label class="checkbox-wrapper">
            <input type="checkbox" class="attendance-checkbox" 
                   data-student-id="${student.id}" 
                   ${isPresent ? 'checked' : ''}>
            <span class="checkbox-custom"></span>
          </label>
        </td>
        <td class="col-rating">
          ${buildRatingSelect('rating', rating, 'daily-rating-select')}
        </td>
        <td class="col-note">
          <input type="text" class="note-input inline-input" 
                 value="${note}" 
                 placeholder="ملاحظة..." 
                 data-student-id="${student.id}">
        </td>
        <td class="col-actions">
          <div class="actions-group">
            <button class="btn-action btn-edit" onclick="openEditStudentModal('${student.id}')" title="تعديل الاسم">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-action btn-delete" onclick="confirmDeleteStudent('${student.id}')" title="حذف">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
}
