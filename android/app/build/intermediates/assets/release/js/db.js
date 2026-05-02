/**
 * db.js
 * طبقة التخزين المحلية الموثوقة للتطبيق
 * - FIX 6: StorageService + metadata + snapshots + validation
 * - توافق كامل مع البيانات القديمة في localStorage
 */

const MOCK_DATA_MARKER = '__mock__';
const STORAGE_SCHEMA_VERSION = 2;
const STORAGE_ENVELOPE_FLAG = '__halaqatnaEnvelope';
const STORAGE_META_KEY = 'halaqatna_app_meta';
const STORAGE_DEVICE_KEY = 'halaqatna_device_id';
const STORAGE_SNAPSHOTS_KEY = 'halaqatna_storage_snapshots';
const STORAGE_SNAPSHOT_LIMIT = 6;
const STORAGE_SNAPSHOT_INTERVAL_MS = 15000;
const CORE_STORAGE_KEYS = ['students', 'dailyRecords'];
const STORAGE_SETTINGS_KEYS = [
  'halaqatna_prayer_settings',
  'prayerTimesCache',
  'halaqatna_qibla_calibration',
  'halaqatna_last_back_press'
];

function isLocalStorageAvailable() {
  try {
    localStorage.setItem('__halaqatna_test__', '1');
    localStorage.removeItem('__halaqatna_test__');
    return true;
  } catch (error) {
    return false;
  }
}

function safeJsonParse(raw, fallback = null) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

function createRandomId() {
  if (globalThis.crypto?.randomUUID) {
    return crypto.randomUUID();
  }
  return `halaqatna-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function computeChecksum(value) {
  const input = typeof value === 'string' ? value : JSON.stringify(value);
  let hash = 5381;
  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(index);
  }
  return `h${(hash >>> 0).toString(16)}`;
}

function getDeviceId() {
  const existing = localStorage.getItem(STORAGE_DEVICE_KEY);
  if (existing) return existing;
  const next = createRandomId();
  localStorage.setItem(STORAGE_DEVICE_KEY, next);
  return next;
}

function getDefaultAppMeta() {
  return {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    deviceId: getDeviceId(),
    installedAt: new Date().toISOString(),
    lastSavedAt: null,
    lastSnapshotAt: null,
    lastAction: 'init',
    operationLog: []
  };
}

function readAppMeta() {
  const parsed = safeJsonParse(localStorage.getItem(STORAGE_META_KEY), null);
  return parsed && typeof parsed === 'object'
    ? { ...getDefaultAppMeta(), ...parsed }
    : getDefaultAppMeta();
}

function writeAppMeta(meta) {
  localStorage.setItem(STORAGE_META_KEY, JSON.stringify({
    ...getDefaultAppMeta(),
    ...meta
  }));
}

function appendOperationLog(action, extra = {}) {
  const meta = readAppMeta();
  const nextEntry = {
    action,
    at: new Date().toISOString(),
    ...extra
  };

  meta.lastAction = action;
  meta.lastSavedAt = nextEntry.at;
  meta.operationLog = [nextEntry, ...(meta.operationLog || [])].slice(0, 20);
  writeAppMeta(meta);
}

function buildEnvelope(key, value, reason = 'save') {
  const serializedValue = JSON.stringify(value);
  return {
    [STORAGE_ENVELOPE_FLAG]: true,
    key,
    schemaVersion: STORAGE_SCHEMA_VERSION,
    deviceId: getDeviceId(),
    updatedAt: new Date().toISOString(),
    reason,
    checksum: computeChecksum(serializedValue),
    value
  };
}

function inspectStoredKey(key, fallbackValue) {
  const raw = localStorage.getItem(key);
  if (raw == null) {
    return {
      key,
      exists: false,
      legacy: false,
      corrupted: false,
      fallbackUsed: true,
      value: fallbackValue,
      updatedAt: null,
      checksumValid: true
    };
  }

  const parsed = safeJsonParse(raw, null);
  if (parsed === null) {
    return {
      key,
      exists: true,
      legacy: false,
      corrupted: true,
      fallbackUsed: true,
      value: fallbackValue,
      updatedAt: null,
      checksumValid: false
    };
  }

  if (parsed && typeof parsed === 'object' && parsed[STORAGE_ENVELOPE_FLAG]) {
    const serializedValue = JSON.stringify(parsed.value);
    const checksumValid = parsed.checksum === computeChecksum(serializedValue);
    return {
      key,
      exists: true,
      legacy: false,
      corrupted: false,
      fallbackUsed: false,
      value: parsed.value,
      updatedAt: parsed.updatedAt || null,
      checksumValid
    };
  }

  return {
    key,
    exists: true,
    legacy: true,
    corrupted: false,
    fallbackUsed: false,
    value: parsed,
    updatedAt: null,
    checksumValid: true
  };
}

const StorageService = {
  load(key, fallbackValue = null) {
    return inspectStoredKey(key, fallbackValue).value;
  },

  inspect(key, fallbackValue = null) {
    return inspectStoredKey(key, fallbackValue);
  },

  save(key, value, options = {}) {
    const {
      snapshot = CORE_STORAGE_KEYS.includes(key),
      reason = `save:${key}`,
      skipLog = false
    } = options;

    try {
      const envelope = buildEnvelope(key, value, reason);
      localStorage.setItem(key, JSON.stringify(envelope));

      if (!skipLog) {
        appendOperationLog(reason, { key });
      }

      if (snapshot) {
        this.snapshot(reason);
      }
      return true;
    } catch (error) {
      console.error(`Failed to save key "${key}"`, error);
      if (error?.name === 'QuotaExceededError') {
        alert('مساحة التخزين المحلية ممتلئة. يرجى تنزيل نسخة احتياطية ثم حذف بعض البيانات غير الضرورية.');
      }
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
      appendOperationLog(`remove:${key}`, { key });
      return true;
    } catch (error) {
      console.error(`Failed to remove key "${key}"`, error);
      return false;
    }
  },

  snapshot(reason = 'snapshot') {
    const meta = readAppMeta();
    const lastSnapshotAt = meta.lastSnapshotAt ? new Date(meta.lastSnapshotAt).getTime() : 0;
    const now = Date.now();

    if (now - lastSnapshotAt < STORAGE_SNAPSHOT_INTERVAL_MS) {
      return false;
    }

    try {
      const snapshots = this.getSnapshots();
      const snapshot = {
        id: createRandomId(),
        createdAt: new Date(now).toISOString(),
        reason,
        data: {
          students: this.load('students', []),
          dailyRecords: this.load('dailyRecords', []),
          settings: this.collectSettings(),
          appMeta: readAppMeta()
        }
      };

      const nextSnapshots = [snapshot, ...snapshots].slice(0, STORAGE_SNAPSHOT_LIMIT);
      localStorage.setItem(STORAGE_SNAPSHOTS_KEY, JSON.stringify(nextSnapshots));
      writeAppMeta({
        ...meta,
        lastSnapshotAt: snapshot.createdAt
      });
      return true;
    } catch (error) {
      console.error('Failed to save storage snapshot', error);
      return false;
    }
  },

  getSnapshots() {
    const parsed = safeJsonParse(localStorage.getItem(STORAGE_SNAPSHOTS_KEY), []);
    return Array.isArray(parsed) ? parsed : [];
  },

  collectSettings() {
    return STORAGE_SETTINGS_KEYS.reduce((accumulator, key) => {
      const raw = localStorage.getItem(key);
      if (raw != null) {
        accumulator[key] = safeJsonParse(raw, raw);
      }
      return accumulator;
    }, {});
  },

  applySettings(settings = {}) {
    Object.entries(settings).forEach(([key, value]) => {
      try {
        if (typeof value === 'string') {
          localStorage.setItem(key, value);
        } else {
          localStorage.setItem(key, JSON.stringify(value));
        }
      } catch (error) {
        console.warn(`Failed to restore setting "${key}"`, error);
      }
    });
  },

  getHealthReport() {
    const studentsInfo = this.inspect('students', []);
    const recordsInfo = this.inspect('dailyRecords', []);
    const students = Array.isArray(studentsInfo.value) ? studentsInfo.value : [];
    const records = Array.isArray(recordsInfo.value) ? recordsInfo.value : [];
    const snapshots = this.getSnapshots();
    const meta = readAppMeta();

    const corruptedKeys = [studentsInfo, recordsInfo]
      .filter((item) => item.corrupted || item.checksumValid === false)
      .map((item) => item.key);

    return {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      deviceId: getDeviceId(),
      studentsCount: students.length,
      recordsCount: records.length,
      snapshotsCount: snapshots.length,
      lastSavedAt: meta.lastSavedAt,
      lastSnapshotAt: meta.lastSnapshotAt,
      corruptedKeys,
      legacyKeys: [studentsInfo, recordsInfo].filter((item) => item.legacy).map((item) => item.key),
      healthy: corruptedKeys.length === 0,
      lastAction: meta.lastAction
    };
  },

  restoreLastHealthySnapshot() {
    const snapshots = this.getSnapshots();
    const snapshot = snapshots.find((item) => {
      const data = item?.data;
      return Array.isArray(data?.students) && Array.isArray(data?.dailyRecords);
    });

    if (!snapshot) {
      return false;
    }

    const restored = this.importBundle({
      schemaVersion: STORAGE_SCHEMA_VERSION,
      students: snapshot.data.students,
      dailyRecords: snapshot.data.dailyRecords,
      settings: snapshot.data.settings || {},
      appMeta: snapshot.data.appMeta || {}
    }, { reason: 'restore:snapshot', createSnapshot: false });

    if (restored) {
      appendOperationLog('restore:snapshot', { snapshotId: snapshot.id });
    }
    return restored;
  },

  exportBundle() {
    const meta = readAppMeta();
    return {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      exportDate: new Date().toISOString(),
      appVersion: '1.3',
      deviceId: getDeviceId(),
      students: this.load('students', []),
      dailyRecords: this.load('dailyRecords', []),
      core: {
        students: this.load('students', []),
        dailyRecords: this.load('dailyRecords', [])
      },
      settings: this.collectSettings(),
      appMeta: meta,
      storageHealth: this.getHealthReport()
    };
  },

  importBundle(data, options = {}) {
    const { reason = 'import', createSnapshot = true } = options;
    const students = Array.isArray(data?.core?.students) ? data.core.students : data?.students;
    const dailyRecords = Array.isArray(data?.core?.dailyRecords) ? data.core.dailyRecords : data?.dailyRecords;

    if (!Array.isArray(students) || !Array.isArray(dailyRecords)) {
      return false;
    }

    const currentMeta = readAppMeta();
    if (createSnapshot) {
      this.snapshot(`before:${reason}`);
    }

    const studentsSaved = this.save('students', students, {
      snapshot: false,
      reason: `${reason}:students`,
      skipLog: true
    });
    const recordsSaved = this.save('dailyRecords', dailyRecords, {
      snapshot: false,
      reason: `${reason}:dailyRecords`,
      skipLog: true
    });

    if (!studentsSaved || !recordsSaved) {
      return false;
    }

    if (data.settings && typeof data.settings === 'object') {
      this.applySettings(data.settings);
    }

    writeAppMeta({
      ...currentMeta,
      ...data.appMeta,
      schemaVersion: STORAGE_SCHEMA_VERSION,
      deviceId: getDeviceId(),
      lastAction: reason,
      lastSavedAt: new Date().toISOString()
    });

    if (createSnapshot) {
      this.snapshot(reason);
    }

    appendOperationLog(reason, {
      studentsCount: students.length,
      recordsCount: dailyRecords.length
    });
    return true;
  }
};

function getFromStorage(key, fallback = []) {
  return StorageService.load(key, fallback);
}

function saveToStorage(key, value, options = {}) {
  return StorageService.save(key, value, options);
}

function logDataStatus(action) {
  try {
    const students = getAllStudents();
    const records = getDailyRecords();
    console.log(`${action} — الطلاب: ${students.length} | السجلات: ${records.length}`);
  } catch (error) {
    console.error('Failed to log storage status', error);
  }
}

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

function getAllStudents() {
  const students = getFromStorage('students', []);
  return Array.isArray(students) ? students : [];
}

function getStudentById(id) {
  return getAllStudents().find((student) => student.id === id);
}

function saveStudent(student) {
  const students = getAllStudents();
  students.push(student);
  saveToStorage('students', students, { reason: 'student:create' });
  logDataStatus('تمت إضافة طالب');
}

function updateStudent(updatedStudent) {
  const students = getAllStudents();
  const index = students.findIndex((student) => student.id === updatedStudent.id);
  if (index !== -1) {
    students[index] = updatedStudent;
    saveToStorage('students', students, { reason: 'student:update' });
  }
}

function deleteStudent(id) {
  deleteRecordsByStudentId(id);
  const students = getAllStudents().filter((student) => student.id !== id);
  saveToStorage('students', students, { reason: 'student:delete' });
  logDataStatus('تم حذف طالب وجميع سجلاته');
}

function getDailyRecords() {
  const records = getFromStorage('dailyRecords', []);
  return Array.isArray(records) ? records : [];
}

function getRecordByStudentAndDate(studentId, date) {
  return getDailyRecords().find((record) => record.studentId === studentId && record.date === date);
}

function getRecordsByDate(date) {
  return getDailyRecords().filter((record) => record.date === date);
}

function getRecordsForStudent(studentId) {
  return getDailyRecords().filter((record) => record.studentId === studentId);
}

function getRecordsLast7Days(studentId) {
  const sevenDaysAgo = getDateDaysAgo(7);
  return getRecordsForStudent(studentId).filter((record) => record.date >= sevenDaysAgo);
}

function getRecordsLastNDays(studentId, days) {
  const nDaysAgo = getDateDaysAgo(days);
  return getRecordsForStudent(studentId).filter((record) => record.date >= nDaysAgo);
}

function saveDailyRecord(record) {
  const records = getDailyRecords();
  const existingIndex = records.findIndex(
    (current) => current.studentId === record.studentId && current.date === record.date
  );

  if (existingIndex !== -1) {
    records[existingIndex] = { ...records[existingIndex], ...record };
  } else {
    record.id = record.id || createRandomId();
    records.push(record);
  }

  saveToStorage('dailyRecords', records, { reason: 'record:save' });
}

function deleteRecordsByStudentId(studentId) {
  const filtered = getDailyRecords().filter((record) => record.studentId !== studentId);
  saveToStorage('dailyRecords', filtered, { reason: 'record:deleteByStudent' });
}

function exportAllData() {
  const data = StorageService.exportBundle();
  logDataStatus('تم تصدير البيانات');
  return data;
}

function importAllData(data) {
  const imported = StorageService.importBundle(data, { reason: 'import:bundle', createSnapshot: true });
  if (imported) {
    logDataStatus('تم استيراد البيانات');
  }
  return imported;
}

function validateAndRepairData() {
  let repaired = false;

  const rawStudents = getAllStudents();
  const validStudents = rawStudents.filter((student) => {
    if (!student || !student.id || !student.name) {
      repaired = true;
      return false;
    }

    if (student.currentMemorization) {
      student.currentHifz = {
        surah: student.currentMemorization.surah,
        surahNumber: student.currentMemorization.surahNumber,
        details: student.currentMemorization.details,
        from: '',
        to: '',
        isFull: false
      };
      delete student.currentMemorization;
      repaired = true;
    }

    if (!student.currentHifz) {
      student.currentHifz = { surah: '', surahNumber: 0, details: '', from: '', to: '', isFull: false };
      repaired = true;
    }

    if (student.revision) {
      student.currentReview = {
        surah: student.revision.surah,
        surahNumber: student.revision.surahNumber,
        details: student.revision.details,
        from: '',
        to: '',
        isFull: false
      };
      delete student.revision;
      repaired = true;
    }

    if (!student.currentReview) {
      student.currentReview = { surah: '', surahNumber: 0, details: '', from: '', to: '', isFull: false };
      repaired = true;
    }

    if (typeof student.partsMemorized !== 'number' || Number.isNaN(student.partsMemorized)) {
      student.partsMemorized = 0;
      repaired = true;
    }

    return true;
  });

  if (repaired || validStudents.length !== rawStudents.length) {
    saveToStorage('students', validStudents, { reason: 'repair:students', snapshot: false });
  }

  const validStudentIds = new Set(validStudents.map((student) => student.id));
  const rawRecords = getDailyRecords();
  const validRecords = rawRecords.filter((record) => {
    if (!record || !record.studentId || !record.date) {
      repaired = true;
      return false;
    }

    if (!validStudentIds.has(record.studentId)) {
      repaired = true;
      return false;
    }

    if (typeof record.present !== 'boolean') {
      record.present = false;
      repaired = true;
    }
    if (typeof record.rating !== 'number' || Number.isNaN(record.rating)) {
      record.rating = 0;
      repaired = true;
    }
    if (typeof record.note !== 'string') {
      record.note = '';
      repaired = true;
    }

    return true;
  });

  if (repaired || validRecords.length !== rawRecords.length) {
    saveToStorage('dailyRecords', validRecords, { reason: 'repair:dailyRecords', snapshot: false });
  }

  if (repaired) {
    appendOperationLog('repair:auto');
  }
}

function initializeStorage() {
  if (!isLocalStorageAvailable()) {
    console.error('LocalStorage is unavailable');
    alert('التخزين المحلي غير متاح في هذا المتصفح. لن يتم حفظ البيانات بشكل صحيح.');
    return;
  }

  getDeviceId();

  if (localStorage.getItem('students') === null) {
    saveToStorage('students', [], { reason: 'init:students', snapshot: false });
  }
  if (localStorage.getItem('dailyRecords') === null) {
    saveToStorage('dailyRecords', [], { reason: 'init:dailyRecords', snapshot: false });
  }

  const studentsState = StorageService.inspect('students', []);
  const recordsState = StorageService.inspect('dailyRecords', []);
  if ((studentsState.corrupted || recordsState.corrupted) && StorageService.getSnapshots().length > 0) {
    StorageService.restoreLastHealthySnapshot();
  }

  validateAndRepairData();
  StorageService.snapshot('init');
  updateStorageStatusCard();
  logDataStatus('تم تحميل البيانات بنجاح');
}

function isClassDay(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return CLASS_DAYS.includes(date.getDay());
}

function getRecordsForPeriod(studentId, period) {
  const records = getRecordsForStudent(studentId);
  const now = new Date();

  return records.filter((record) => {
    const recordDate = new Date(`${record.date}T00:00:00`);
    if (period === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);
      return recordDate >= startOfWeek;
    }
    if (period === 'month') {
      return recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear();
    }
    if (period === 'year') {
      return recordDate.getFullYear() === now.getFullYear();
    }
    return true;
  });
}

function generateMockData() {
  const students = getAllStudents();
  if (students.length === 0) {
    return { success: false, reason: 'no_students' };
  }

  const existingRecords = getDailyRecords();
  if (existingRecords.some((record) => record._mock === MOCK_DATA_MARKER)) {
    return { success: false, reason: 'already_exists' };
  }

  saveToStorage('_mockBackup', {
    students: JSON.parse(JSON.stringify(students)),
    dailyRecords: JSON.parse(JSON.stringify(existingRecords))
  }, {
    reason: 'mock:backup',
    snapshot: false
  });

  const mockRecords = [];
  const today = new Date();
  const startDate = new Date(today);
  startDate.setFullYear(startDate.getFullYear() - 1);

  const mockNotes = [
    'ممتاز ما شاء الله',
    'يحتاج مراجعة',
    'أداء جيد',
    'تحسن ملحوظ',
    'يحتاج تركيز أكثر',
    'حافظ متميز',
    'بارك الله فيه',
    'استمر',
    'راجع الصفحة السابقة',
    'أحسنت',
    '',
    '',
    ''
  ];

  students.forEach((student) => {
    const performanceLevel = Math.random();
    let baseRating;
    let attendanceProb;

    if (performanceLevel > 0.7) {
      baseRating = 8;
      attendanceProb = 0.92;
    } else if (performanceLevel > 0.3) {
      baseRating = 6;
      attendanceProb = 0.75;
    } else {
      baseRating = 4;
      attendanceProb = 0.55;
    }

    const current = new Date(startDate);
    while (current <= today) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 4) {
        const dateStr = formatDateString(current);
        const isPresent = Math.random() < attendanceProb;
        const daysSinceStart = Math.floor((current - startDate) / (1000 * 60 * 60 * 24));
        const improvement = Math.min(daysSinceStart / 365, 1) * 1.5;
        const rating = isPresent
          ? Math.max(1, Math.min(10, Math.round(baseRating + improvement + (Math.random() * 3 - 1.5))))
          : 0;

        mockRecords.push({
          id: createRandomId(),
          studentId: student.id,
          date: dateStr,
          present: isPresent,
          rating,
          note: isPresent && Math.random() > 0.6
            ? mockNotes[Math.floor(Math.random() * mockNotes.length)]
            : '',
          _mock: MOCK_DATA_MARKER
        });
      }
      current.setDate(current.getDate() + 1);
    }
  });

  const allRecords = [...existingRecords];
  mockRecords.forEach((mockRecord) => {
    const exists = allRecords.some(
      (record) => record.studentId === mockRecord.studentId && record.date === mockRecord.date
    );
    if (!exists) {
      allRecords.push(mockRecord);
    }
  });

  saveToStorage('dailyRecords', allRecords, { reason: 'mock:generate' });
  logDataStatus('تم إنشاء البيانات التجريبية');
  updateStorageStatusCard();

  return {
    success: true,
    recordsAdded: mockRecords.length,
    studentsCount: students.length
  };
}

function deleteMockData() {
  const records = getDailyRecords();
  const realRecords = records.filter((record) => record._mock !== MOCK_DATA_MARKER);
  const mockCount = records.length - realRecords.length;

  if (mockCount === 0) {
    return { success: false, reason: 'no_mock_data' };
  }

  saveToStorage('dailyRecords', realRecords, { reason: 'mock:delete' });
  StorageService.remove('_mockBackup');
  logDataStatus('تم حذف البيانات التجريبية');
  updateStorageStatusCard();

  return {
    success: true,
    recordsRemoved: mockCount,
    realRecordsKept: realRecords.length
  };
}

function hasMockData() {
  return getDailyRecords().some((record) => record._mock === MOCK_DATA_MARKER);
}

function updateStorageStatusCard() {
  const text = document.getElementById('storage-status-text');
  if (!text) return;

  const report = StorageService.getHealthReport();
  const healthLabel = report.healthy ? 'سليم' : 'بحاجة لمراجعة';
  text.textContent = `الحالة: ${healthLabel} • الطلاب: ${report.studentsCount} • السجلات: ${report.recordsCount} • اللقطات: ${report.snapshotsCount}`;
}

function inspectStorageHealth(showFeedback = true) {
  const report = StorageService.getHealthReport();
  updateStorageStatusCard();

  if (showFeedback) {
    if (report.healthy) {
      showToast(`فحص التخزين ناجح: ${report.studentsCount} طالب و ${report.recordsCount} سجل و ${report.snapshotsCount} لقطات آمنة`);
    } else {
      showToast(`تم اكتشاف مشكلة في: ${report.corruptedKeys.join('، ')}`, 'warning');
    }
  }

  return report;
}

function downloadEmergencyBackup() {
  const data = exportAllData();
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const filename = `حلقتنا-safe-backup-${getTodayDate()}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast('تم تنزيل النسخة الاحتياطية الآمنة بنجاح');
}

async function restoreLastStorageSnapshot() {
  const snapshots = StorageService.getSnapshots();
  if (!snapshots.length) {
    showToast('لا توجد لقطة محلية يمكن الاسترجاع منها', 'warning');
    return;
  }

  const latest = snapshots[0];
  const confirmed = await showConfirm(
    `سيتم استرجاع آخر لقطة سليمة محفوظة بتاريخ ${latest.createdAt}. قد تُفقد آخر تعديلات غير محفوظة في هذه اللقطة. هل تريد المتابعة؟`,
    'استرجاع آخر لقطة سليمة'
  );

  if (!confirmed) return;

  const restored = StorageService.restoreLastHealthySnapshot();
  if (!restored) {
    showToast('تعذر استرجاع آخر لقطة سليمة', 'error');
    return;
  }

  showToast('تم استرجاع آخر لقطة سليمة. سيتم تحديث التطبيق الآن.');
  setTimeout(() => location.reload(), 900);
}
