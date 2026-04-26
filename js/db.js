/**
 * db.js
 * طبقة التعامل مع LocalStorage
 * يحتوي على جميع دوال القراءة والكتابة للبيانات
 */

// ═══════════════════════════════════
// ■ دوال مساعدة
// ═══════════════════════════════════

/**
 * جلب بيانات من LocalStorage وتحويلها من JSON
 * @param {string} key - مفتاح التخزين
 * @returns {Array} المصفوفة المخزنة أو مصفوفة فارغة
 */
function getFromStorage(key) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

/**
 * حفظ بيانات في LocalStorage بتحويلها إلى JSON
 * @param {string} key - مفتاح التخزين
 * @param {*} value - القيمة المراد حفظها
 */
function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/**
 * الحصول على تاريخ اليوم بصيغة YYYY-MM-DD
 * @returns {string} التاريخ بالصيغة المطلوبة
 */
function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * الحصول على تاريخ قبل عدد معين من الأيام بصيغة YYYY-MM-DD
 * @param {number} daysAgo - عدد الأيام للخلف
 * @returns {string} التاريخ بالصيغة المطلوبة
 */
function getDateDaysAgo(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ═══════════════════════════════════
// ■ دوال إدارة الطلاب
// ═══════════════════════════════════

/**
 * جلب جميع الطلاب من LocalStorage
 * @returns {Array} مصفوفة الطلاب
 */
function getAllStudents() {
  return getFromStorage('students');
}

/**
 * جلب طالب واحد بواسطة الـ id
 * @param {string} id - معرف الطالب
 * @returns {Object|undefined} كائن الطالب أو undefined
 */
function getStudentById(id) {
  const students = getAllStudents();
  return students.find(s => s.id === id);
}

/**
 * حفظ طالب جديد في LocalStorage
 * @param {Object} student - كائن الطالب الجديد
 */
function saveStudent(student) {
  const students = getAllStudents();
  students.push(student);
  saveToStorage('students', students);
}

/**
 * تحديث بيانات طالب موجود
 * @param {Object} updatedStudent - كائن الطالب المحدث (يجب أن يحتوي على id)
 */
function updateStudent(updatedStudent) {
  const students = getAllStudents();
  const index = students.findIndex(s => s.id === updatedStudent.id);
  if (index !== -1) {
    students[index] = updatedStudent;
    saveToStorage('students', students);
  }
}

/**
 * حذف طالب وجميع سجلاته اليومية
 * @param {string} id - معرف الطالب
 */
function deleteStudent(id) {
  // حذف سجلات الطالب أولاً
  deleteRecordsByStudentId(id);
  // ثم حذف الطالب
  const students = getAllStudents();
  const filtered = students.filter(s => s.id !== id);
  saveToStorage('students', filtered);
}

// ═══════════════════════════════════
// ■ دوال السجلات اليومية
// ═══════════════════════════════════

/**
 * جلب جميع السجلات اليومية
 * @returns {Array} مصفوفة السجلات
 */
function getDailyRecords() {
  return getFromStorage('dailyRecords');
}

/**
 * جلب سجل طالب معين في يوم معين
 * @param {string} studentId - معرف الطالب
 * @param {string} date - التاريخ بصيغة YYYY-MM-DD
 * @returns {Object|undefined} السجل أو undefined
 */
function getRecordByStudentAndDate(studentId, date) {
  const records = getDailyRecords();
  return records.find(r => r.studentId === studentId && r.date === date);
}

/**
 * جلب جميع سجلات يوم معين
 * @param {string} date - التاريخ بصيغة YYYY-MM-DD
 * @returns {Array} مصفوفة السجلات
 */
function getRecordsByDate(date) {
  const records = getDailyRecords();
  return records.filter(r => r.date === date);
}

/**
 * جلب جميع سجلات طالب معين
 * @param {string} studentId - معرف الطالب
 * @returns {Array} مصفوفة السجلات
 */
function getRecordsForStudent(studentId) {
  const records = getDailyRecords();
  return records.filter(r => r.studentId === studentId);
}

/**
 * جلب سجلات آخر 7 أيام لطالب معين
 * @param {string} studentId - معرف الطالب
 * @returns {Array} مصفوفة السجلات في آخر 7 أيام
 */
function getRecordsLast7Days(studentId) {
  const records = getRecordsForStudent(studentId);
  const sevenDaysAgo = getDateDaysAgo(7);
  return records.filter(r => r.date >= sevenDaysAgo);
}

/**
 * جلب سجلات آخر N أيام لطالب معين
 * @param {string} studentId - معرف الطالب
 * @param {number} days - عدد الأيام
 * @returns {Array} مصفوفة السجلات
 */
function getRecordsLastNDays(studentId, days) {
  const records = getRecordsForStudent(studentId);
  const nDaysAgo = getDateDaysAgo(days);
  return records.filter(r => r.date >= nDaysAgo);
}

/**
 * حفظ أو تحديث سجل يومي
 * إذا كان يوجد سجل لنفس الطالب في نفس اليوم يتم تحديثه
 * وإلا يتم إنشاء سجل جديد
 * @param {Object} record - كائن السجل اليومي
 */
function saveDailyRecord(record) {
  const records = getDailyRecords();
  const existingIndex = records.findIndex(
    r => r.studentId === record.studentId && r.date === record.date
  );
  
  if (existingIndex !== -1) {
    // تحديث السجل الموجود
    records[existingIndex] = { ...records[existingIndex], ...record };
  } else {
    // إنشاء سجل جديد بـ id فريد
    record.id = crypto.randomUUID();
    records.push(record);
  }
  
  saveToStorage('dailyRecords', records);
}

/**
 * حذف جميع سجلات طالب معين
 * @param {string} studentId - معرف الطالب
 */
function deleteRecordsByStudentId(studentId) {
  const records = getDailyRecords();
  const filtered = records.filter(r => r.studentId !== studentId);
  saveToStorage('dailyRecords', filtered);
}

// ═══════════════════════════════════
// ■ دوال النسخ الاحتياطي
// ═══════════════════════════════════

/**
 * تصدير جميع البيانات ككائن JSON
 * @returns {Object} كائن يحتوي على الطلاب والسجلات وتاريخ التصدير
 */
function exportAllData() {
  return {
    students: getAllStudents(),
    dailyRecords: getDailyRecords(),
    exportDate: new Date().toISOString()
  };
}

/**
 * استيراد بيانات من كائن JSON واستبدال البيانات الحالية
 * @param {Object} data - الكائن المستورد (يجب أن يحتوي students و dailyRecords)
 * @returns {boolean} true إذا تم الاستيراد بنجاح
 */
function importAllData(data) {
  if (!data || !Array.isArray(data.students) || !Array.isArray(data.dailyRecords)) {
    return false;
  }
  saveToStorage('students', data.students);
  saveToStorage('dailyRecords', data.dailyRecords);
  return true;
}

/**
 * تهيئة LocalStorage إذا كانت فارغة
 * يُستدعى عند تحميل الصفحة لأول مرة
 */
function initializeStorage() {
  if (localStorage.getItem('students') === null) {
    saveToStorage('students', []);
  }
  if (localStorage.getItem('dailyRecords') === null) {
    saveToStorage('dailyRecords', []);
  }
}

// ═══════════════════════════════════
// ■ دوال مساعدة إضافية للفترات
// ═══════════════════════════════════

/**
 * التحقق مما إذا كان التاريخ يوم حلقة (الأحد أو الخميس)
 * @param {string} dateString 
 */
function isClassDay(dateString) {
  const d = new Date(dateString);
  return CLASS_DAYS.includes(d.getDay());
}

/**
 * جلب سجلات طالب في فترة محددة (أسبوع، شهر، سنة، الكل)
 * @param {string} studentId 
 * @param {string} period 
 */
function getRecordsForPeriod(studentId, period) {
  const records = getRecordsForStudent(studentId);
  const now = new Date();
  
  return records.filter(r => {
    const rDate = new Date(r.date);
    if (period === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);
      return rDate >= startOfWeek;
    } else if (period === 'month') {
      return rDate.getMonth() === now.getMonth() && rDate.getFullYear() === now.getFullYear();
    } else if (period === 'year') {
      return rDate.getFullYear() === now.getFullYear();
    }
    return true; // all
  });
}
