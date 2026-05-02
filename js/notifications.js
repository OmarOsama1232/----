/**
 * notifications.js
 * نظام إشعارات الصلاة الكامل لتطبيق حلقتنا
 * - طلب إذن الإشعارات
 * - جدولة الإشعارات بـ setTimeout
 * - إشعارات تعويضية عند فتح التطبيق
 * - حفظ الإعدادات في LocalStorage
 * - دعم Service Worker للخلفية
 */

var NOTIF_STORAGE_KEY = 'prayerNotifSettings';
var NOTIF_SCHEDULED_KEY = 'prayerNotifScheduled';

var _notifTimers = [];
var _notifEnabled = false;

// ═══════════════════════════════════
// ■ قراءة / حفظ إعدادات الإشعارات
// ═══════════════════════════════════

function getNotifSettings() {
  try {
    var raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (!raw) return { enabled: false, reminderMinutes: 5 };
    return JSON.parse(raw);
  } catch (e) {
    return { enabled: false, reminderMinutes: 5 };
  }
}

function saveNotifSettings(settings) {
  try {
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {}
}

// ═══════════════════════════════════
// ■ فحص دعم الإشعارات
// ═══════════════════════════════════

function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

function getNotifStatus() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

// ═══════════════════════════════════
// ■ طلب الإذن
// ═══════════════════════════════════

function requestNotificationPermission(callback) {
  if (!isNotificationSupported()) {
    if (callback) callback('unsupported');
    return;
  }

  if (Notification.permission === 'granted') {
    if (callback) callback('granted');
    return;
  }

  if (Notification.permission === 'denied') {
    if (callback) callback('denied');
    return;
  }

  // طلب الإذن - ندعم كلا الواجهتين: القديمة (callback) والحديثة (Promise)
  try {
    var result = Notification.requestPermission(function(perm) {
      if (callback) callback(perm);
    });
    // الأجهزة الحديثة تُعيد Promise
    if (result && typeof result.then === 'function') {
      result.then(function(perm) {
        if (callback) callback(perm);
      }).catch(function() {
        if (callback) callback('denied');
      });
    }
  } catch (e) {
    if (callback) callback('denied');
  }
}

// ═══════════════════════════════════
// ■ عرض إشعار فوري
// ═══════════════════════════════════

function showPrayerNotification(prayerName, message) {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;

  var title = 'حلقتنا - ' + prayerName;
  var body = message || ('حان وقت صلاة ' + prayerName);
  var options = {
    body: body,
    icon: '/icon-512.png',
    badge: '/icon-512.png',
    dir: 'rtl',
    lang: 'ar',
    tag: 'prayer-' + prayerName,
    renotify: true,
    vibrate: [200, 100, 200],
    requireInteraction: false
  };

  // استخدام Service Worker إذا كان متاحاً (أفضل في الخلفية)
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then(function(reg) {
      reg.showNotification(title, options);
    }).catch(function() {
      // fallback
      try { new Notification(title, options); } catch(e) {}
    });
  } else {
    try { new Notification(title, options); } catch(e) {}
  }
}

// ═══════════════════════════════════
// ■ جدولة الإشعارات لأوقات الصلاة
// ═══════════════════════════════════

function schedulePrayerNotifications(prayerData) {
  // إلغاء المؤقتات السابقة
  clearScheduledNotifications();

  var settings = getNotifSettings();
  if (!settings.enabled) return;
  if (Notification.permission !== 'granted') return;
  if (!prayerData || !prayerData.timings) return;

  var reminderMs = (settings.reminderMinutes || 5) * 60 * 1000;
  var now = new Date();

  var prayerKeys = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  var prayerNamesAr = {
    Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء'
  };

  var scheduledList = [];

  prayerKeys.forEach(function(key) {
    var timeStr = prayerData.timings[key];
    if (!timeStr) return;

    var parts = timeStr.split(':');
    var hours = parseInt(parts[0], 10);
    var minutes = parseInt(parts[1], 10);

    var prayerTime = new Date(now);
    prayerTime.setHours(hours, minutes, 0, 0);

    // وقت الإشعار = وقت الصلاة - وقت التذكير
    var notifTime = new Date(prayerTime.getTime() - reminderMs);
    var diff = notifTime.getTime() - now.getTime();

    if (diff > 0) {
      var arabicName = prayerNamesAr[key] || key;
      var msgReminder = settings.reminderMinutes + ' دقائق على صلاة ' + arabicName;
      var msgNow = 'حان وقت صلاة ' + arabicName + ' الآن';

      // إشعار التذكير قبل الصلاة
      var timerId = setTimeout(function(name, msgR) {
        return function() {
          showPrayerNotification(name, msgR);
        };
      }(arabicName, msgReminder), diff);
      _notifTimers.push(timerId);

      // إشعار عند حلول وقت الصلاة
      var diffAtTime = prayerTime.getTime() - now.getTime();
      if (diffAtTime > 0) {
        var timerId2 = setTimeout(function(name, msgN) {
          return function() {
            showPrayerNotification(name, msgN);
          };
        }(arabicName, msgNow), diffAtTime);
        _notifTimers.push(timerId2);
      }

      scheduledList.push({ key: key, time: prayerTime.getTime() });
    }
  });

  // حفظ قائمة الجدولة في localStorage للتحقق عند فتح التطبيق لاحقاً
  try {
    localStorage.setItem(NOTIF_SCHEDULED_KEY, JSON.stringify({
      date: getTodayDate(),
      prayers: scheduledList,
      reminderMinutes: settings.reminderMinutes || 5
    }));
  } catch(e) {}
}

// ═══════════════════════════════════
// ■ إلغاء جميع المؤقتات
// ═══════════════════════════════════

function clearScheduledNotifications() {
  _notifTimers.forEach(function(id) { clearTimeout(id); });
  _notifTimers = [];
}

// ═══════════════════════════════════
// ■ إشعارات تعويضية عند فتح التطبيق
// ═══════════════════════════════════

function checkMissedPrayerNotifications() {
  var settings = getNotifSettings();
  if (!settings.enabled) return;
  if (Notification.permission !== 'granted') return;

  try {
    var raw = localStorage.getItem(NOTIF_SCHEDULED_KEY);
    if (!raw) return;
    var data = JSON.parse(raw);
    if (!data || data.date !== getTodayDate()) return;

    var now = Date.now();
    var prayerNamesAr = {
      Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء'
    };

    data.prayers.forEach(function(prayer) {
      // الصلاة التي مضت في آخر 30 دقيقة
      var diff = now - prayer.time;
      if (diff > 0 && diff < 30 * 60 * 1000) {
        var arabicName = prayerNamesAr[prayer.key] || prayer.key;
        showPrayerNotification(arabicName, 'فاتتك صلاة ' + arabicName + '، هل توضأت؟');
      }
    });
  } catch(e) {}
}

// ═══════════════════════════════════
// ■ تفعيل / إلغاء الإشعارات
// ═══════════════════════════════════

function enableNotifications(prayerData, reminderMinutes, onResult) {
  if (!isNotificationSupported()) {
    if (onResult) onResult('unsupported');
    return;
  }

  requestNotificationPermission(function(perm) {
    if (perm === 'granted') {
      var settings = { enabled: true, reminderMinutes: reminderMinutes || 5 };
      saveNotifSettings(settings);
      _notifEnabled = true;

      if (prayerData) {
        schedulePrayerNotifications(prayerData);
      }

      // إرسال رسالة تهيئة للـ SW
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'NOTIF_ENABLED',
          reminderMinutes: reminderMinutes || 5
        });
      }

      if (onResult) onResult('granted');
    } else if (perm === 'denied') {
      if (onResult) onResult('denied');
    } else {
      if (onResult) onResult('dismissed');
    }
  });
}

function disableNotifications() {
  clearScheduledNotifications();
  var settings = getNotifSettings();
  settings.enabled = false;
  saveNotifSettings(settings);
  _notifEnabled = false;

  try { localStorage.removeItem(NOTIF_SCHEDULED_KEY); } catch(e) {}

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'NOTIF_DISABLED' });
  }
}

// ═══════════════════════════════════
// ■ تهيئة زر الإشعارات في الـ UI
// ═══════════════════════════════════

function initNotificationUI() {
  updateNotifUIState();

  var enableBtn = document.getElementById('btn-enable-notif');
  var disableBtn = document.getElementById('btn-disable-notif');
  var reminderSelect = document.getElementById('notif-reminder-select');

  if (enableBtn) {
    enableBtn.addEventListener('click', function() {
      var mins = reminderSelect ? parseInt(reminderSelect.value, 10) : 5;

      if (!isNotificationSupported()) {
        showToast('عذراً، متصفحك لا يدعم الإشعارات. يرجى تحديثه إلى Chrome أو Edge.', 'error');
        return;
      }

      if (Notification.permission === 'denied') {
        showToast('لقد رفضت الإذن سابقاً. يمكنك تغييره من إعدادات المتصفح ← الإشعارات.', 'warning');
        return;
      }

      // الحصول على بيانات الصلاة الحالية
      var prayerData = null;
      try {
        var raw = localStorage.getItem('prayerTimesCache');
        if (raw) prayerData = JSON.parse(raw);
      } catch(e) {}

      enableBtn.disabled = true;
      enableBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التفعيل...';

      enableNotifications(prayerData, mins, function(result) {
        enableBtn.disabled = false;
        if (result === 'granted') {
          showToast('تم تفعيل إشعارات الصلاة بنجاح! ستصلك تنبيهات قبل كل صلاة.', 'success');
          updateNotifUIState();
        } else if (result === 'denied') {
          showToast('تم رفض الإذن. انتقل إلى إعدادات المتصفح وامنح الإذن يدوياً.', 'error');
          updateNotifUIState();
        } else if (result === 'unsupported') {
          showToast('عذراً، متصفحك لا يدعم الإشعارات. يرجى تحديثه إلى Chrome أو Edge.', 'error');
        } else {
          showToast('تم إلغاء الإذن. يمكنك التفعيل في أي وقت.', 'warning');
          updateNotifUIState();
        }
      });
    });
  }

  if (disableBtn) {
    disableBtn.addEventListener('click', function() {
      disableNotifications();
      showToast('تم إلغاء تفعيل إشعارات الصلاة.', 'warning');
      updateNotifUIState();
    });
  }

  if (reminderSelect) {
    reminderSelect.addEventListener('change', function() {
      var settings = getNotifSettings();
      settings.reminderMinutes = parseInt(this.value, 10);
      saveNotifSettings(settings);

      if (settings.enabled && Notification.permission === 'granted') {
        var prayerData = null;
        try {
          var raw = localStorage.getItem('prayerTimesCache');
          if (raw) prayerData = JSON.parse(raw);
        } catch(e) {}
        if (prayerData) schedulePrayerNotifications(prayerData);
        showToast('تم تحديث وقت التذكير.', 'success');
      }
    });
  }
}

function updateNotifUIState() {
  var settings = getNotifSettings();
  var status = getNotifStatus();
  var enableBtn = document.getElementById('btn-enable-notif');
  var disableBtn = document.getElementById('btn-disable-notif');
  var reminderSelect = document.getElementById('notif-reminder-select');
  var notifStatusEl = document.getElementById('notif-status-text');
  var notifSection = document.getElementById('notif-settings-section');

  if (!notifSection) return;

  var isActive = settings.enabled && status === 'granted';

  if (enableBtn) enableBtn.style.display = isActive ? 'none' : 'flex';
  if (disableBtn) disableBtn.style.display = isActive ? 'flex' : 'none';
  if (reminderSelect) {
    reminderSelect.value = String(settings.reminderMinutes || 5);
    reminderSelect.disabled = !isActive;
  }

  if (notifStatusEl) {
    if (status === 'unsupported') {
      notifStatusEl.textContent = 'غير مدعوم في هذا المتصفح';
      notifStatusEl.className = 'notif-status-badge notif-unsupported';
    } else if (isActive) {
      notifStatusEl.textContent = 'مفعّل ✓';
      notifStatusEl.className = 'notif-status-badge notif-active';
    } else if (status === 'denied') {
      notifStatusEl.textContent = 'محظور - تحقق من إعدادات المتصفح';
      notifStatusEl.className = 'notif-status-badge notif-denied';
    } else {
      notifStatusEl.textContent = 'غير مفعّل';
      notifStatusEl.className = 'notif-status-badge notif-inactive';
    }
  }

  if (enableBtn && status === 'unsupported') {
    enableBtn.disabled = true;
    enableBtn.title = 'المتصفح لا يدعم الإشعارات';
  }
}

// ═══════════════════════════════════
// ■ تهيئة النظام الكامل
// ═══════════════════════════════════

function initNotifications() {
  var settings = getNotifSettings();

  // فحص الإشعارات الفائتة
  checkMissedPrayerNotifications();

  // تهيئة الـ UI
  initNotificationUI();

  // إذا كانت الإشعارات مفعلة، أعد الجدولة
  if (settings.enabled && Notification.permission === 'granted') {
    _notifEnabled = true;
    try {
      var raw = localStorage.getItem('prayerTimesCache');
      if (raw) {
        var prayerData = JSON.parse(raw);
        schedulePrayerNotifications(prayerData);
      }
    } catch(e) {}
  }
}
