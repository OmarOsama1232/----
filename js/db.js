/**
 * db.js
 * طبقة التعامل مع LocalStorage
 * يحتوي على جميع دوال القراءة والكتابة للبيانات
 * مع آلية تحقق وتسجيل في وحدة التحكم
 */

// ═══════════════════════════════════
// ■ علامة البيانات التجريبية
// ═══════════════════════════════════
const MOCK_DATA_MARKER = '__mock__';

// ═══════════════════════════════════
// ■ دوال مساعدة آمنة للتخزين
// ═══════════════════════════════════

/**
 * جلب بيانات من LocalStorage وتحويلها من JSON مع حماية
 */
function getFromStorage(key) {
  try {
    const data = localStorage.getItem(key);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) {
      console.warn(`⚠️ البيانات في المفتاح "${key}" ليست مصفوفة، تم إرجاع مصفوفة فارغة`);
      return [];
    }
    return parsed;
  } catch (e) {
    console.error(`❌ خطأ في قراءة "${key}" من LocalStorage:`, e);
    return [];
  }
}

/**
 * حفظ بيانات في LocalStorage بتحويلها إلى JSON مع حماية
 */
function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    // تحقق فوري من الحفظ
    const verify = localStorage.getItem(key);
    if (!verify) {
      console.error(`❌ فشل التحقق من حفظ "${key}"`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`❌ خطأ في حفظ "${key}" في LocalStorage:`, e);
    if (e.name === 'QuotaExceededError') {
      alert('⚠️ مساحة التخزين ممتلئة! يرجى تصدير نسخة احتياطية وحذف بعض البيانات.');
    }
    return false;
  }
}

/**
 * تسجيل حالة البيانات في وحدة التحكم
 */
function logDataStatus(action) {
  try {
    const students = getAllStudents();
    const records = getDailyRecords();
    console.log(`✅ ${action} — عدد الطلاب: ${students.length} | عدد السجلات: ${records.length}`);
  } catch (e) {
    console.error('❌ خطأ في تسجيل حالة البيانات:', e);
  }
}

// ═══════════════════════════════════
// ■ دوال التاريخ
// ═══════════════════════════════════

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateDaysAgo(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateString(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ═══════════════════════════════════
// ■ دوال إدارة الطلاب
// ═══════════════════════════════════

function getAllStudents() {
  return getFromStorage('students');
}

function getStudentById(id) {
  const students = getAllStudents();
  return students.find(s => s.id === id);
}

function saveStudent(student) {
  const students = getAllStudents();
  students.push(student);
  saveToStorage('students', students);
  logDataStatus('تم إضافة طالب');
}

function updateStudent(updatedStudent) {
  const students = getAllStudents();
  const index = students.findIndex(s => s.id === updatedStudent.id);
  if (index !== -1) {
    students[index] = updatedStudent;
    saveToStorage('students', students);
  }
}

/**
 * حذف طالب وجميع سجلاته اليومية (حذف آمن شامل)
 */
function deleteStudent(id) {
  // 1. حذف سجلات الطالب أولاً
  deleteRecordsByStudentId(id);
  // 2. ثم حذف الطالب
  const students = getAllStudents();
  const filtered = students.filter(s => s.id !== id);
  saveToStorage('students', filtered);
  logDataStatus('تم حذف طالب وجميع سجلاته');

  // 3. تحقق نهائي
  const checkStudent = getStudentById(id);
  const checkRecords = getRecordsForStudent(id);
  if (checkStudent || checkRecords.length > 0) {
    console.error(`❌ فشل الحذف الكامل للطالب ${id}`);
  } else {
    console.log(`✅ تم التحقق: الطالب ${id} وجميع سجلاته حُذفت بالكامل`);
  }
}

// ═══════════════════════════════════
// ■ دوال السجلات اليومية
// ═══════════════════════════════════

function getDailyRecords() {
  return getFromStorage('dailyRecords');
}

function getRecordByStudentAndDate(studentId, date) {
  const records = getDailyRecords();
  return records.find(r => r.studentId === studentId && r.date === date);
}

function getRecordsByDate(date) {
  const records = getDailyRecords();
  return records.filter(r => r.date === date);
}

function getRecordsForStudent(studentId) {
  const records = getDailyRecords();
  return records.filter(r => r.studentId === studentId);
}

function getRecordsLast7Days(studentId) {
  const records = getRecordsForStudent(studentId);
  const sevenDaysAgo = getDateDaysAgo(7);
  return records.filter(r => r.date >= sevenDaysAgo);
}

function getRecordsLastNDays(studentId, days) {
  const records = getRecordsForStudent(studentId);
  const nDaysAgo = getDateDaysAgo(days);
  return records.filter(r => r.date >= nDaysAgo);
}

function saveDailyRecord(record) {
  const records = getDailyRecords();
  const existingIndex = records.findIndex(
    r => r.studentId === record.studentId && r.date === record.date
  );

  if (existingIndex !== -1) {
    records[existingIndex] = { ...records[existingIndex], ...record };
  } else {
    record.id = record.id || crypto.randomUUID();
    records.push(record);
  }

  saveToStorage('dailyRecords', records);
}

function deleteRecordsByStudentId(studentId) {
  const records = getDailyRecords();
  const filtered = records.filter(r => r.studentId !== studentId);
  saveToStorage('dailyRecords', filtered);
}

// ═══════════════════════════════════
// ■ دوال النسخ الاحتياطي
// ═══════════════════════════════════

function exportAllData() {
  const data = {
    students: getAllStudents(),
    dailyRecords: getDailyRecords(),
    exportDate: new Date().toISOString(),
    appVersion: '1.1'
  };
  logDataStatus('تم تصدير البيانات');
  return data;
}

function importAllData(data) {
  if (!data || !Array.isArray(data.students) || !Array.isArray(data.dailyRecords)) {
    return false;
  }
  saveToStorage('students', data.students);
  saveToStorage('dailyRecords', data.dailyRecords);
  logDataStatus('تم استيراد البيانات');
  return true;
}

// ═══════════════════════════════════
// ■ تهيئة وتحقق من البيانات
// ═══════════════════════════════════

function initializeStorage() {
  // التحقق من توفر LocalStorage
  try {
    localStorage.setItem('__test__', '1');
    localStorage.removeItem('__test__');
  } catch (e) {
    console.error('❌ LocalStorage غير متاح!');
    alert('⚠️ التخزين المحلي غير متاح في هذا المتصفح. لن يتم حفظ البيانات!');
    return;
  }

  if (localStorage.getItem('students') === null) {
    saveToStorage('students', []);
  }
  if (localStorage.getItem('dailyRecords') === null) {
    saveToStorage('dailyRecords', []);
  }

  // تحقق من صحة البيانات وإصلاحها
  validateAndRepairData();
  logDataStatus('تم تحميل البيانات بنجاح');
}

/**
 * التحقق من صحة البيانات وإصلاح الأخطاء البسيطة
 */
function validateAndRepairData() {
  let repaired = false;

  // تحقق من الطلاب
  let students = getFromStorage('students');
  const validStudents = students.filter(s => {
    if (!s || !s.id || !s.name) {
      console.warn('⚠️ تم العثور على سجل طالب تالف وتمت إزالته:', s);
      repaired = true;
      return false;
    }
    // إصلاح حقول ناقصة
    if (s.currentMemorization) {
      s.currentHifz = { surah: s.currentMemorization.surah, surahNumber: s.currentMemorization.surahNumber, details: s.currentMemorization.details, from: '', to: '', isFull: false };
      delete s.currentMemorization;
      repaired = true;
    }
    if (!s.currentHifz) {
      s.currentHifz = { surah: '', surahNumber: 0, details: '', from: '', to: '', isFull: false };
      repaired = true;
    }

    if (s.revision) {
      s.currentReview = { surah: s.revision.surah, surahNumber: s.revision.surahNumber, details: s.revision.details, from: '', to: '', isFull: false };
      delete s.revision;
      repaired = true;
    }
    if (!s.currentReview) {
      s.currentReview = { surah: '', surahNumber: 0, details: '', from: '', to: '', isFull: false };
      repaired = true;
    }
    if (typeof s.partsMemorized !== 'number') {
      s.partsMemorized = 0;
      repaired = true;
    }
    return true;
  });

  if (validStudents.length !== students.length || repaired) {
    saveToStorage('students', validStudents);
  }

  // تحقق من السجلات
  let records = getFromStorage('dailyRecords');
  const validStudentIds = new Set(validStudents.map(s => s.id));
  const validRecords = records.filter(r => {
    if (!r || !r.studentId || !r.date) {
      console.warn('⚠️ تم العثور على سجل يومي تالف وتمت إزالته:', r);
      return false;
    }
    // إصلاح حقول ناقصة
    if (typeof r.present !== 'boolean') r.present = false;
    if (typeof r.rating !== 'number') r.rating = 0;
    if (typeof r.note !== 'string') r.note = '';
    return true;
  });

  if (validRecords.length !== records.length) {
    saveToStorage('dailyRecords', validRecords);
    repaired = true;
  }

  if (repaired) {
    console.log('🔧 تم إصلاح بعض البيانات التالفة تلقائياً');
  } else {
    console.log('✅ جميع البيانات سليمة ولا تحتاج إصلاح');
  }
}

// ═══════════════════════════════════
// ■ دوال مساعدة إضافية للفترات
// ═══════════════════════════════════

function isClassDay(dateString) {
  const d = new Date(dateString + 'T00:00:00');
  return CLASS_DAYS.includes(d.getDay());
}

function getRecordsForPeriod(studentId, period) {
  const records = getRecordsForStudent(studentId);
  const now = new Date();

  return records.filter(r => {
    const rDate = new Date(r.date + 'T00:00:00');
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

// ═══════════════════════════════════
// ■ البيانات التجريبية (سنة كاملة)
// ═══════════════════════════════════

/**
 * إنشاء بيانات تجريبية لمدة سنة كاملة
 * - أيام الأحد والخميس فقط
 * - بيانات عشوائية منطقية
 * - تميز بعلامة __mock__
 */
function generateMockData() {
  const students = getAllStudents();

  // حالة الحافة: لا يوجد طلاب
  if (students.length === 0) {
    console.warn('⚠️ لا يوجد طلاب لإنشاء بيانات تجريبية لهم');
    return { success: false, reason: 'no_students' };
  }

  // حالة الحافة: بيانات تجريبية موجودة مسبقاً
  const existingRecords = getDailyRecords();
  const hasMockData = existingRecords.some(r => r._mock === MOCK_DATA_MARKER);
  if (hasMockData) {
    console.warn('⚠️ توجد بيانات تجريبية مسبقاً');
    return { success: false, reason: 'already_exists' };
  }

  // حفظ نسخة احتياطية من البيانات الحقيقية
  const backupData = {
    students: JSON.parse(JSON.stringify(students)),
    dailyRecords: JSON.parse(JSON.stringify(existingRecords))
  };
  saveToStorage('_mockBackup', backupData);

  const mockRecords = [];
  const today = new Date();
  const startDate = new Date(today);
  startDate.setFullYear(startDate.getFullYear() - 1);

  const MOCK_NOTES = [
    'ممتاز ما شاء الله', 'يحتاج مراجعة', 'أداء جيد', 'تحسن ملحوظ',
    'يحتاج تركيز أكثر', 'حافظ متميز', 'بارك الله فيه', 'استمر',
    'راجع الصفحة السابقة', 'أحسنت', '', '', '', '', ''
  ];

  students.forEach(student => {
    // لكل طالب نختار نمط أداء عشوائي
    const performanceLevel = Math.random();
    let baseRating, attendanceProb;

    if (performanceLevel > 0.7) {
      // طالب متميز (30%)
      baseRating = 8; attendanceProb = 0.92;
    } else if (performanceLevel > 0.3) {
      // طالب متوسط (40%)
      baseRating = 6; attendanceProb = 0.75;
    } else {
      // طالب ضعيف (30%)
      baseRating = 4; attendanceProb = 0.55;
    }

    const current = new Date(startDate);
    while (current <= today) {
      const dayOfWeek = current.getDay();
      // فقط الأحد (0) والخميس (4)
      if (dayOfWeek === 0 || dayOfWeek === 4) {
        const dateStr = formatDateString(current);
        const isPresent = Math.random() < attendanceProb;
        // تقييم عشوائي حول المستوى الأساسي مع تحسن تدريجي
        const daysSinceStart = Math.floor((current - startDate) / (1000 * 60 * 60 * 24));
        const improvement = Math.min(daysSinceStart / 365, 1) * 1.5;
        let rating = isPresent
          ? Math.max(1, Math.min(10, Math.round(baseRating + improvement + (Math.random() * 3 - 1.5))))
          : 0;

        const note = isPresent && Math.random() > 0.6
          ? MOCK_NOTES[Math.floor(Math.random() * MOCK_NOTES.length)]
          : '';

        mockRecords.push({
          id: crypto.randomUUID(),
          studentId: student.id,
          date: dateStr,
          present: isPresent,
          rating: rating,
          note: note,
          _mock: MOCK_DATA_MARKER
        });
      }
      current.setDate(current.getDate() + 1);
    }
  });

  // دمج السجلات الحقيقية مع التجريبية (بدون الكتابة فوق الحقيقية)
  const allRecords = [...existingRecords];
  mockRecords.forEach(mock => {
    const exists = allRecords.some(
      r => r.studentId === mock.studentId && r.date === mock.date
    );
    if (!exists) {
      allRecords.push(mock);
    }
  });

  saveToStorage('dailyRecords', allRecords);
  logDataStatus('تم إنشاء البيانات التجريبية');

  return {
    success: true,
    recordsAdded: mockRecords.length,
    studentsCount: students.length
  };
}

/**
 * حذف البيانات التجريبية فقط مع الحفاظ على البيانات الحقيقية
 */
function deleteMockData() {
  const records = getDailyRecords();
  const realRecords = records.filter(r => r._mock !== MOCK_DATA_MARKER);
  const mockCount = records.length - realRecords.length;

  if (mockCount === 0) {
    return { success: false, reason: 'no_mock_data' };
  }

  saveToStorage('dailyRecords', realRecords);

  // حذف النسخة الاحتياطية
  try { localStorage.removeItem('_mockBackup'); } catch (e) { /* ignore */ }

  logDataStatus('تم حذف البيانات التجريبية');

  return {
    success: true,
    recordsRemoved: mockCount,
    realRecordsKept: realRecords.length
  };
}

/**
 * التحقق من وجود بيانات تجريبية
 */
function hasMockData() {
  const records = getDailyRecords();
  return records.some(r => r._mock === MOCK_DATA_MARKER);
}
