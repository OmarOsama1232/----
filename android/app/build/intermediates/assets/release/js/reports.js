/**
 * reports.js
 * حساب وعرض الإحصائيات والتقارير
 * - بطاقات لوحة التحكم (Dashboard Cards)
 * - التقرير الأسبوعي
 */

// ═══════════════════════════════════
// ■ بطاقات الإحصائيات (Dashboard)
// ═══════════════════════════════════

/**
 * تحديث جميع بطاقات الإحصائيات في لوحة التحكم
 */
function getDashboardPeriod() {
  const select = document.getElementById('dashboard-period-select');
  return select ? select.value : 'week';
}

function updateDashboardCards() {
  updateTotalStudentsCard();
  updatePeriodAttendanceCard();
  updatePeriodAvgRatingCard();
  updateTopStudentCard();
  renderHonorBoard();
}

/**
 * تحديث بطاقة إجمالي الطلاب
 */
function updateTotalStudentsCard() {
  const students = getAllStudents();
  const el = document.getElementById('total-students-count');
  if (el) {
    animateNumber(el, students.length);
  }
}

/**
 * تحديث بطاقة الحضور للفترة المحددة
 */
function updatePeriodAttendanceCard() {
  const students = getAllStudents();
  const totalStudents = students.length;
  const period = getDashboardPeriod();
  
  let totalPresent = 0;
  let maxPossiblePresent = 0;
  
  students.forEach(student => {
    const records = getRecordsForPeriod(student.id, period);
    const validRecords = records.filter(r => isClassDay(r.date));
    
    // للحساب الدقيق للفترة، الحد الأقصى هو عدد الأيام التي تم تسجيلها أو أيام الحلقة
    maxPossiblePresent += validRecords.length > 0 ? validRecords.length : 0;
    totalPresent += validRecords.filter(r => r.present).length;
  });
  
  // إذا لم يكن هناك سجلات أبداً
  if (maxPossiblePresent === 0) maxPossiblePresent = totalStudents; // كقيمة مبدئية

  const percentage = maxPossiblePresent > 0 ? Math.round((totalPresent / maxPossiblePresent) * 100) : 0;
  
  const countEl = document.getElementById('today-attendance-count'); // نفس الـ ID القديم
  const percentEl = document.getElementById('today-attendance-percent');
  const labelEl = countEl ? countEl.previousElementSibling : null;

  if (countEl) countEl.textContent = totalPresent;
  if (percentEl) percentEl.textContent = percentage + '%';
  if (labelEl) {
    labelEl.textContent = period === 'week' ? 'إجمالي الحضور (أسبوعياً)' : 
                          period === 'month' ? 'إجمالي الحضور (شهرياً)' : 
                          period === 'year' ? 'إجمالي الحضور (سنوياً)' : 'إجمالي الحضور (كلياً)';
  }
}

/**
 * تحديث بطاقة متوسط التقييم للفترة المحددة
 */
function updatePeriodAvgRatingCard() {
  const students = getAllStudents();
  let totalRatings = 0;
  let ratingsCount = 0;
  const period = getDashboardPeriod();
  
  students.forEach(student => {
    const records = getRecordsForPeriod(student.id, period);
    records.forEach(r => {
      if (r.present === true) {
        totalRatings += r.rating;
        ratingsCount++;
      }
    });
  });
  
  const avg = ratingsCount > 0 ? (totalRatings / ratingsCount).toFixed(2) : '0.00';
  const el = document.getElementById('weekly-avg-rating'); // نفس العنصر في HTML
  if (el) {
    el.textContent = avg;
    const labelEl = el.previousElementSibling;
    if (labelEl) {
       labelEl.textContent = period === 'week' ? 'متوسط التقييم (أسبوعياً)' : 
                             period === 'month' ? 'متوسط التقييم (شهرياً)' : 
                             period === 'year' ? 'متوسط التقييم (سنوياً)' : 'متوسط التقييم (كلياً)';
    }
  }
}

/**
 * تحديث بطاقة أعلى طالب تقييماً في الفترة المحددة
 */
function updateTopStudentCard() {
  const students = getAllStudents();
  let topStudent = null;
  let topAvg = -1;
  const period = getDashboardPeriod();
  
  students.forEach(student => {
    const records = getRecordsForPeriod(student.id, period);
    const presentRecords = records.filter(r => r.present === true);
    
    if (presentRecords.length > 0) {
      const sum = presentRecords.reduce((acc, r) => acc + r.rating, 0);
      const avg = sum / presentRecords.length;
      
      if (avg > topAvg) {
        topAvg = avg;
        topStudent = student;
      }
    }
  });
  
  const nameEl = document.getElementById('top-student-name');
  const ratingEl = document.getElementById('top-student-rating');
  
  if (nameEl) {
    nameEl.textContent = topStudent ? topStudent.name : 'لا يوجد';
  }
  if (ratingEl) {
    ratingEl.textContent = topStudent ? topAvg.toFixed(1) : '-';
  }
}

/**
 * أنيميشن تغير الأرقام في البطاقات
 * @param {HTMLElement} element - العنصر المراد تحديثه
 * @param {number} targetValue - القيمة المستهدفة
 */
function animateNumber(element, targetValue) {
  const currentValue = parseInt(element.textContent) || 0;
  const diff = targetValue - currentValue;
  const steps = 20;
  const stepValue = diff / steps;
  let step = 0;
  
  if (diff === 0) {
    element.textContent = targetValue;
    return;
  }
  
  const interval = setInterval(() => {
    step++;
    if (step >= steps) {
      element.textContent = targetValue;
      clearInterval(interval);
    } else {
      element.textContent = Math.round(currentValue + stepValue * step);
    }
  }, 30);
}

// ═══════════════════════════════════
// ■ لوحة الشرف الأسبوعية
// ═══════════════════════════════════

/**
 * الحصول على أفضل الطلاب هذا الأسبوع (أعلى 5)
 * المعيار: 50% تقييم + 50% حضور
 * @returns {Array} مصفوفة بأفضل الطلاب
 */
function getTopStudentsWeekly() {
  const period = getDashboardPeriod();
  const students = getAllStudents();
  const studentScores = [];

  // الحد الأقصى لأيام الحضور حسب الفترة
  let expectedDays = 2; // أسبوعي
  if (period === 'month') expectedDays = 8;
  if (period === 'year') expectedDays = 100;
  if (period === 'all') expectedDays = 200;

  students.forEach(student => {
    const records = getRecordsForPeriod(student.id, period);
    // الفلترة فقط لأيام الحلقة المحددة (الأحد والخميس)
    const validRecords = records.filter(r => isClassDay(r.date));
    const presentRecords = validRecords.filter(r => r.present === true);
    const presentDays = presentRecords.length;
    
    // حساب متوسط التقييم
    let avgRating = 0;
    if (presentRecords.length > 0) {
      const sum = presentRecords.reduce((acc, r) => acc + r.rating, 0);
      avgRating = sum / presentRecords.length;
    }

    // حساب الدرجة المركبة (من 10)
    // التقييم من 10 (وزن 50%) = (avgRating / 10) * 5
    // الحضور من expectedDays (وزن 50%)
    const attendanceRatio = Math.min(presentDays / expectedDays, 1);
    const score = ((avgRating / 10) * 5) + (attendanceRatio * 5);

    studentScores.push({
      student,
      avgRating: avgRating.toFixed(1),
      presentDays,
      expectedDays,
      score
    });
  });

  // ترتيب تنازلي حسب الدرجة
  studentScores.sort((a, b) => b.score - a.score);
  
  // إرجاع أفضل 5 طلاب لديهم درجة أكبر من 0
  return studentScores.filter(s => s.score > 0).slice(0, 5);
}

/**
 * رسم لوحة الشرف
 */
function renderHonorBoard() {
  const container = document.getElementById('honor-cards-container');
  if (!container) return;

  const topStudents = getTopStudentsWeekly();

  if (topStudents.length === 0) {
    container.innerHTML = `
      <div style="width: 100%; text-align: center; color: var(--color-gray); padding: 10px;">
        لا توجد بيانات كافية للوحة الشرف هذا الأسبوع.
      </div>
    `;
    return;
  }

  let html = '';
  topStudents.forEach((item, index) => {
    const rankClass = index < 3 ? `rank-${index + 1}` : '';
    html += `
      <div class="honor-card ${rankClass}">
        <div class="honor-rank">${index + 1}</div>
        <div class="honor-name">${item.student.name}</div>
        <div class="honor-stats">
          <span title="التقييم"><i class="fas fa-star"></i> ${item.avgRating}</span>
          <span title="الحضور"><i class="fas fa-calendar-check"></i> ${item.presentDays}/${item.expectedDays}</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ═══════════════════════════════════
// ■ التقرير الأسبوعي
// ═══════════════════════════════════

/**
 * رسم جدول التقارير الأسبوعية لجميع الطلاب
 */
function renderWeeklyReport() {
  const tbody = document.getElementById('weekly-tbody');
  if (!tbody) return;
  
  const students = getAllStudents();
  
  if (students.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-table">
          <div class="empty-state">
            <i class="fas fa-chart-bar"></i>
            <p>لا توجد بيانات للتقارير</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  let html = '';
  students.forEach((student, index) => {
    const records = getRecordsLast7Days(student.id);
    // في التقرير الأسبوعي، نحسب فقط الأحد والخميس
    const validRecords = records.filter(r => isClassDay(r.date));
    const presentRecords = validRecords.filter(r => r.present === true);
    const presentDays = presentRecords.length;
    const attendancePercentage = Math.min(Math.round((presentDays / EXPECTED_DAYS_PER_WEEK) * 100), 100);
    
    // حساب متوسط التقييم (فقط أيام الحضور)
    let avgRating = 0;
    if (presentRecords.length > 0) {
      const sum = presentRecords.reduce((acc, r) => acc + r.rating, 0);
      avgRating = (sum / presentRecords.length).toFixed(1);
    }
    
    // شريط تقدم الأجزاء
    const partsPercentage = Math.round((student.partsMemorized / MAX_PARTS) * 100);
    
    // لون شريط الحضور حسب النسبة
    let attendanceClass = 'progress-low';
    if (attendancePercentage >= 80) {
      attendanceClass = 'progress-high';
    } else if (attendancePercentage >= 50) {
      attendanceClass = 'progress-mid';
    }
    
    html += `
      <tr>
        <td class="col-num">${index + 1}</td>
        <td class="col-name">${student.name}</td>
        <td class="col-attendance-stat">
          <span class="attendance-fraction">${presentDays}/${EXPECTED_DAYS_PER_WEEK}</span>
        </td>
        <td class="col-attendance-bar">
          <div class="progress-bar ${attendanceClass}">
            <div class="progress-fill" style="width: ${attendancePercentage}%"></div>
          </div>
          <span class="progress-label">${attendancePercentage}%</span>
        </td>
        <td class="col-avg-rating">
          <span class="avg-rating-badge ${getRatingBadgeClass(avgRating)}">${avgRating}</span>
        </td>
        <td class="col-parts-stat">
          <div class="parts-stat-group">
            <span class="parts-fraction">${student.partsMemorized}/${MAX_PARTS}</span>
            <div class="progress-bar parts-progress-sm">
              <div class="progress-fill" style="width: ${partsPercentage}%"></div>
            </div>
          </div>
        </td>
        <td class="col-chart-btn">
          <button class="btn-chart" onclick="openChartModal('${student.id}')" title="عرض الرسم البياني">
            <i class="fas fa-chart-line"></i>
          </button>
        </td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
}

/**
 * الحصول على كلاس لون شارة التقييم
 * @param {number|string} rating - قيمة التقييم
 * @returns {string} اسم الكلاس
 */
function getRatingBadgeClass(rating) {
  const num = parseFloat(rating);
  if (num >= 8) return 'badge-excellent';
  if (num >= 6) return 'badge-good';
  if (num >= 4) return 'badge-average';
  return 'badge-poor';
}
