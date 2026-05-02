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
    currentHifz: {
      surah: '',
      surahNumber: 0,
      details: '',
      from: '',
      to: '',
      isFull: false
    },
    currentReview: {
      surah: '',
      surahNumber: 0,
      details: '',
      from: '',
      to: '',
      isFull: false
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
  
  const inputName = document.getElementById('edit-student-name');
  const hiddenId = document.getElementById('edit-student-id');
  
  if (inputName && hiddenId) {
    inputName.value = student.name;
    hiddenId.value = student.id;
  }
  
  // Hifz
  const memSurah = document.getElementById('edit-mem-surah');
  if (memSurah && document.getElementById('edit-mem-from')) {
    memSurah.innerHTML = buildSurahSelect('', student.currentHifz?.surahNumber || 0).replace('<select', '<select id="edit-mem-surah" class="modal-input" style="margin-bottom:0;"').replace('</select>', '');
    document.getElementById('edit-mem-from').value = student.currentHifz?.from || '';
    document.getElementById('edit-mem-to').value = student.currentHifz?.to || '';
    document.getElementById('edit-mem-full').checked = student.currentHifz?.isFull || false;
    document.getElementById('edit-mem-from').disabled = student.currentHifz?.isFull || false;
    document.getElementById('edit-mem-to').disabled = student.currentHifz?.isFull || false;
  }
  
  // Review
  const revSurah = document.getElementById('edit-rev-surah');
  if (revSurah && document.getElementById('edit-rev-from')) {
    revSurah.innerHTML = buildSurahSelect('', student.currentReview?.surahNumber || 0).replace('<select', '<select id="edit-rev-surah" class="modal-input" style="margin-bottom:0;"').replace('</select>', '');
    document.getElementById('edit-rev-from').value = student.currentReview?.from || '';
    document.getElementById('edit-rev-to').value = student.currentReview?.to || '';
    document.getElementById('edit-rev-full').checked = student.currentReview?.isFull || false;
    document.getElementById('edit-rev-from').disabled = student.currentReview?.isFull || false;
    document.getElementById('edit-rev-to').disabled = student.currentReview?.isFull || false;
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
  const inputName = document.getElementById('edit-student-name');
  const hiddenId = document.getElementById('edit-student-id');
  const name = inputName.value.trim();
  const studentId = hiddenId.value;
  
  if (!name) {
    showToast('يرجى إدخال اسم الطالب', 'error');
    return;
  }
  
  const student = getStudentById(studentId);
  if (!student) return;
  
  student.name = name;
  
  // Save Hifz
  const memSurahNum = parseInt(document.getElementById('edit-mem-surah')?.value) || 0;
  const memSurahName = memSurahNum ? SURAHS.find(s => s.number === memSurahNum)?.name : '';
  const memFrom = document.getElementById('edit-mem-from')?.value || '';
  const memTo = document.getElementById('edit-mem-to')?.value || '';
  const memFull = document.getElementById('edit-mem-full')?.checked || false;
  
  student.currentHifz = {
    surah: memSurahName,
    surahNumber: memSurahNum,
    from: memFrom,
    to: memTo,
    isFull: memFull,
    details: buildDetailsText(memFrom, memTo, memFull)
  };
  
  // Save Review
  const revSurahNum = parseInt(document.getElementById('edit-rev-surah')?.value) || 0;
  const revSurahName = revSurahNum ? SURAHS.find(s => s.number === revSurahNum)?.name : '';
  const revFrom = document.getElementById('edit-rev-from')?.value || '';
  const revTo = document.getElementById('edit-rev-to')?.value || '';
  const revFull = document.getElementById('edit-rev-full')?.checked || false;
  
  student.currentReview = {
    surah: revSurahName,
    surahNumber: revSurahNum,
    from: revFrom,
    to: revTo,
    isFull: revFull,
    details: buildDetailsText(revFrom, revTo, revFull)
  };

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
    `هل أنت متأكد من حذف الطالب "${student.name}"؟\nسيتم إزالة بياناته فقط، والسجلات (${recordsCount} سجل) ستبقى محفوظة.`,
    'حذف الطالب'
  );

  if (confirmed) {
    /* حذف الملف الشخصي فقط — السجلات تبقى محفوظة */
    var students = getAllStudents();
    var filtered = students.filter(function(s) { return s.id !== studentId; });
    saveToStorage('students', filtered);
    renderStudentsTable();
    updateDashboardCards();
    renderWeeklyReport();
    showToast(`تم حذف "${student.name}" والسجلات محفوظة 📂`);
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
  const fromInput = row.querySelector('.mem-from');
  const toInput = row.querySelector('.mem-to');
  const fullCheck = row.querySelector('.mem-full');
  
  const student = getStudentById(studentId);
  if (!student) return;
  
  const surahNumber = parseInt(surahSelect.value) || 0;
  const surah = SURAHS.find(s => s.number === surahNumber);
  
  const fromVal = fromInput.value;
  const toVal = toInput.value;
  const isFull = fullCheck.checked;
  
  student.currentHifz = {
    surah: surah ? surah.name : '',
    surahNumber: surahNumber,
    from: fromVal,
    to: toVal,
    isFull: isFull,
    details: buildDetailsText(fromVal, toVal, isFull)
  };
  
  updateStudent(student);
  showToast('تم حفظ الحفظ الحالي');
  renderStudentsTable(); // إعادة الرسم لإظهار النص الجديد
}

/**
 * حفظ تعديلات المراجعة لطالب من الجدول
 * @param {string} studentId - معرف الطالب
 */
function saveRevisionInline(studentId) {
  const row = document.querySelector(`tr[data-id="${studentId}"]`);
  if (!row) return;
  
  const surahSelect = row.querySelector('.rev-surah-select');
  const fromInput = row.querySelector('.rev-from');
  const toInput = row.querySelector('.rev-to');
  const fullCheck = row.querySelector('.rev-full');
  
  const student = getStudentById(studentId);
  if (!student) return;
  
  const surahNumber = parseInt(surahSelect.value) || 0;
  const surah = SURAHS.find(s => s.number === surahNumber);
  
  const fromVal = fromInput.value;
  const toVal = toInput.value;
  const isFull = fullCheck.checked;
  
  student.currentReview = {
    surah: surah ? surah.name : '',
    surahNumber: surahNumber,
    from: fromVal,
    to: toVal,
    isFull: isFull,
    details: buildDetailsText(fromVal, toVal, isFull)
  };
  
  updateStudent(student);
  showToast('تم حفظ المراجعة');
  renderStudentsTable(); // إعادة الرسم لإظهار النص الجديد
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
          <div class="hifz-display" id="mem-disp-${student.id}" style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
            <span class="hifz-text" style="font-weight:600; font-size:13px; color:var(--color-primary);">${formatHifzText(student.currentHifz)}</span>
            <button class="btn-action" onclick="toggleEditDisplay('${student.id}', 'mem')" title="تعديل" style="padding:4px; font-size:11px; background:none; border:none; color:var(--color-gray);"><i class="fas fa-edit"></i></button>
          </div>
          <div class="inline-edit-group" id="mem-edit-${student.id}" style="display:none; flex-direction:column; align-items:start; gap:6px;">
            ${buildSurahSelect('mem-surah', student.currentHifz?.surahNumber || 0, 'mem-surah-select inline-input')}
            <div class="ayah-group-container" style="display:flex; gap:4px; align-items:center; flex-wrap:wrap;">
               <input type="number" class="mem-from inline-input" placeholder="من" style="width:40px; padding:4px; text-align:center;" value="${student.currentHifz?.from || ''}" ${student.currentHifz?.isFull ? 'disabled' : ''}>
               <input type="number" class="mem-to inline-input" placeholder="إلى" style="width:40px; padding:4px; text-align:center;" value="${student.currentHifz?.to || ''}" ${student.currentHifz?.isFull ? 'disabled' : ''}>
               <label style="font-size:11px; display:flex; align-items:center; gap:2px;"><input type="checkbox" class="mem-full" onchange="toggleAyahInputs(this)" ${student.currentHifz?.isFull ? 'checked' : ''}> كاملة</label>
               <button class="btn-save-inline" onclick="saveMemorizationInline('${student.id}')" title="حفظ" style="margin-right:auto;"><i class="fas fa-save"></i></button>
               <button class="btn-save-inline" onclick="toggleEditDisplay('${student.id}', 'mem')" title="إلغاء" style="background:#ef4444;"><i class="fas fa-times"></i></button>
            </div>
          </div>
        </td>
        <td class="col-revision">
          <div class="hifz-display" id="rev-disp-${student.id}" style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
            <span class="hifz-text" style="font-weight:600; font-size:13px; color:var(--color-text);">${formatHifzText(student.currentReview)}</span>
            <button class="btn-action" onclick="toggleEditDisplay('${student.id}', 'rev')" title="تعديل" style="padding:4px; font-size:11px; background:none; border:none; color:var(--color-gray);"><i class="fas fa-edit"></i></button>
          </div>
          <div class="inline-edit-group" id="rev-edit-${student.id}" style="display:none; flex-direction:column; align-items:start; gap:6px;">
            ${buildSurahSelect('rev-surah', student.currentReview?.surahNumber || 0, 'rev-surah-select inline-input')}
            <div class="ayah-group-container" style="display:flex; gap:4px; align-items:center; flex-wrap:wrap;">
               <input type="number" class="rev-from inline-input" placeholder="من" style="width:40px; padding:4px; text-align:center;" value="${student.currentReview?.from || ''}" ${student.currentReview?.isFull ? 'disabled' : ''}>
               <input type="number" class="rev-to inline-input" placeholder="إلى" style="width:40px; padding:4px; text-align:center;" value="${student.currentReview?.to || ''}" ${student.currentReview?.isFull ? 'disabled' : ''}>
               <label style="font-size:11px; display:flex; align-items:center; gap:2px;"><input type="checkbox" class="rev-full" onchange="toggleAyahInputs(this)" ${student.currentReview?.isFull ? 'checked' : ''}> كاملة</label>
               <button class="btn-save-inline" onclick="saveRevisionInline('${student.id}')" title="حفظ" style="margin-right:auto;"><i class="fas fa-save"></i></button>
               <button class="btn-save-inline" onclick="toggleEditDisplay('${student.id}', 'rev')" title="إلغاء" style="background:#ef4444;"><i class="fas fa-times"></i></button>
            </div>
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

// ═══════════════════════════════════
// ■ مساعدة للنصوص
// ═══════════════════════════════════

function buildDetailsText(from, to, isFull) {
  if (isFull) return 'كاملة';
  if (from && to) return `الآيات ${from}-${to}`;
  if (from) return `من آية ${from}`;
  if (to) return `إلى آية ${to}`;
  return '';
}

function formatHifzText(hifzObj) {
  if (!hifzObj || !hifzObj.surah) return 'لم يحدد';
  
  if (hifzObj.isFull) {
    return `${hifzObj.surah} (كاملة)`;
  } else if (hifzObj.from && hifzObj.to) {
    return `${hifzObj.surah} (${hifzObj.from}-${hifzObj.to})`;
  } else if (hifzObj.from) {
    return `${hifzObj.surah} (من ${hifzObj.from})`;
  } else if (hifzObj.to) {
    return `${hifzObj.surah} (إلى ${hifzObj.to})`;
  } else if (hifzObj.details) {
    return `${hifzObj.surah} (${hifzObj.details})`; // legacy fallback
  } else {
    return hifzObj.surah;
  }
}

function toggleAyahInputs(checkbox) {
  const container = checkbox.closest('.ayah-group-container');
  if (!container) return;
  const inputs = container.querySelectorAll('input[type="number"]');
  inputs.forEach(input => {
    input.disabled = checkbox.checked;
  });
}

function toggleEditDisplay(studentId, type) {
  const dispId = `${type}-disp-${studentId}`;
  const editId = `${type}-edit-${studentId}`;
  
  const disp = document.getElementById(dispId);
  const edit = document.getElementById(editId);
  
  if (disp && edit) {
    if (disp.style.display === 'none') {
      disp.style.display = 'flex';
      edit.style.display = 'none';
    } else {
      disp.style.display = 'none';
      edit.style.display = 'flex';
    }
  }
}
