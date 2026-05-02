/**
 * attendance.js
 * إدارة الحضور والتقييم اليومي
 * - تسجيل الحضور لجميع الطلاب
 * - تصفية الطلاب حسب الحضور
 * - البحث في الطلاب
 */

// ═══════════════════════════════════
// ■ تسجيل الحضور والتقييمات
// ═══════════════════════════════════

/**
 * تسجيل حضور وتقييمات جميع الطلاب الظاهرين في الجدول
 * يمر على كل صف ويحفظ البيانات في LocalStorage
 */
function saveAllAttendance() {
  const tbody = document.getElementById('students-tbody');
  if (!tbody) return;
  
  const rows = tbody.querySelectorAll('tr[data-id]');
  if (rows.length === 0) {
    showToast('لا يوجد طلاب لتسجيل حضورهم', 'warning');
    return;
  }
  
  const today = getTodayDate();
  let savedCount = 0;
  
  rows.forEach(row => {
    const studentId = row.getAttribute('data-id');
    
    // جلب قيم الحضور والتقييم والملاحظة من الصف
    const checkbox = row.querySelector('.attendance-checkbox');
    const ratingSelect = row.querySelector('.daily-rating-select');
    const noteInput = row.querySelector('.note-input');
    
    const present = checkbox ? checkbox.checked : false;
    const rating = ratingSelect ? parseInt(ratingSelect.value) : 5;
    const note = noteInput ? noteInput.value.trim() : '';
    
    // إنشاء أو تحديث السجل
    const record = {
      studentId: studentId,
      date: today,
      present: present,
      rating: rating,
      note: note
    };
    
    saveDailyRecord(record);
    savedCount++;
  });
  
  // تحديث الواجهة
  updateDashboardCards();
  renderWeeklyReport();
  
  showToast(`تم تسجيل حضور ${savedCount} طالب ليوم ${today}`);
}

// ═══════════════════════════════════
// ■ البحث والتصفية
// ═══════════════════════════════════

/**
 * تصفية الطلاب حسب البحث والفلتر
 * يتم استدعاؤها عند تغيير حقل البحث أو الفلتر
 */
function filterStudents() {
  const searchInput = document.getElementById('search-input');
  const filterSelect = document.getElementById('filter-select');
  
  const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const filterValue = filterSelect ? filterSelect.value : 'all';
  
  let students = getAllStudents();
  const today = getTodayDate();
  const todayRecords = getRecordsByDate(today);
  
  // تطبيق البحث بالاسم
  if (searchTerm) {
    students = students.filter(s => s.name.toLowerCase().includes(searchTerm));
  }
  
  // تطبيق فلتر الحضور
  if (filterValue === 'present') {
    students = students.filter(s => {
      const record = todayRecords.find(r => r.studentId === s.id);
      return record && record.present === true;
    });
  } else if (filterValue === 'absent') {
    students = students.filter(s => {
      const record = todayRecords.find(r => r.studentId === s.id);
      return !record || record.present === false;
    });
  }
  
  renderStudentsTable(students);
}

/**
 * إعداد مستمعي أحداث البحث والتصفية
 */
function setupSearchAndFilter() {
  const searchInput = document.getElementById('search-input');
  const filterSelect = document.getElementById('filter-select');
  
  if (searchInput) {
    searchInput.addEventListener('input', filterStudents);
  }
  
  if (filterSelect) {
    filterSelect.addEventListener('change', filterStudents);
  }
}
