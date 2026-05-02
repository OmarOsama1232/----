/**
 * prayer.js
 * FIX 2:
 * مواقيت الصلاة + إشعارات محلية موثوقة + حالة جدولة واضحة للمستخدم.
 */

const PRAYER_NAMES = {
  Fajr: 'الفجر',
  Sunrise: 'الشروق',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء'
};

const PRAYER_ICONS = {
  Fajr: 'fa-cloud-sun',
  Sunrise: 'fa-sun',
  Dhuhr: 'fa-sun',
  Asr: 'fa-cloud-sun',
  Maghrib: 'fa-cloud-moon',
  Isha: 'fa-moon'
};

const PRAYER_KEYS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const PRAYER_STORAGE_KEY = 'prayerTimesCache';
const PRAYER_SETTINGS_KEY = 'halaqatna_prayer_settings';
const DEFAULT_PRAYER_SETTINGS = {
  enabled: false,
  reminderMinutes: 10,
  permission: 'default',
  scheduleState: 'idle',
  scheduledPrayerCount: 0,
  lastScheduledAt: null,
  lastError: '',
  exactAlarmGranted: null
};

let prayerCountdownInterval = null;

function formatTo12Hour(time24) {
  if (!time24 || !time24.includes(':') || time24 === '--:--') return time24;
  const [hours, minutes] = time24.split(':');
  const period = Number(hours) >= 12 ? 'م' : 'ص';
  const hours12 = (Number(hours) % 12) || 12;
  return `${hours12}:${minutes} ${period}`;
}

function getPrayerSettings() {
  try {
    const raw = localStorage.getItem(PRAYER_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_PRAYER_SETTINGS };
    return { ...DEFAULT_PRAYER_SETTINGS, ...JSON.parse(raw) };
  } catch (error) {
    return { ...DEFAULT_PRAYER_SETTINGS };
  }
}

function savePrayerSettings(settings) {
  localStorage.setItem(PRAYER_SETTINGS_KEY, JSON.stringify({
    ...DEFAULT_PRAYER_SETTINGS,
    ...settings
  }));
}

function updatePrayerSettings(partial) {
  const current = getPrayerSettings();
  const next = { ...current, ...partial };
  savePrayerSettings(next);
  updateStorageStatusCard?.();
  return next;
}

function savePrayerCache(data) {
  localStorage.setItem(PRAYER_STORAGE_KEY, JSON.stringify(data));
}

function getCachedPrayerTimes() {
  try {
    const raw = localStorage.getItem(PRAYER_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.date !== getTodayDate()) return null;
    return data;
  } catch (error) {
    return null;
  }
}

function clearPrayerCache() {
  localStorage.removeItem(PRAYER_STORAGE_KEY);
}

function showPrayerLoading() {
  document.getElementById('next-prayer-name').textContent = 'جاري التحميل...';
  document.getElementById('next-prayer-countdown').textContent = '--:--:--';
}

function showPrayerError(message) {
  document.getElementById('next-prayer-name').textContent = 'غير متاح';
  document.getElementById('next-prayer-countdown').textContent = message || 'تعذر جلب المواقيت';
  const retryButton = document.getElementById('btn-retry-prayer');
  if (retryButton) retryButton.style.display = 'inline-flex';
  document.getElementById('prayer-card')?.classList.add('prayer-error');
}

function parsePrayerDateTime(dateString, time24) {
  const [hours, minutes] = time24.split(':').map(Number);
  const date = new Date(`${dateString}T00:00:00`);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

async function fetchPrayerTimingsForDate(lat, lng, dateObj) {
  const timestamp = Math.floor(dateObj.getTime() / 1000);
  const url = `https://api.aladhan.com/v1/timings/${timestamp}?latitude=${lat}&longitude=${lng}&method=5`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Prayer API error: ${response.status}`);
  }

  const data = await response.json();
  if (data.code !== 200) {
    throw new Error('Invalid prayer API response');
  }

  const date = formatDateString(dateObj);
  const timings = {};
  ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].forEach((key) => {
    timings[key] = data.data.timings[key];
  });

  return { date, timings };
}

function displayPrayerData(data) {
  const card = document.getElementById('prayer-card');
  if (!card) return;

  card.classList.remove('prayer-error', 'prayer-loading');
  const retryButton = document.getElementById('btn-retry-prayer');
  if (retryButton) retryButton.style.display = 'none';

  const grid = document.getElementById('prayer-times-grid');
  if (grid) {
    grid.innerHTML = [...PRAYER_KEYS, 'Sunrise'].map((key) => {
      const icon = PRAYER_ICONS[key] || 'fa-clock';
      const name = PRAYER_NAMES[key] || 'الشروق';
      return `
        <div class="prayer-time-item ${key === 'Sunrise' ? 'prayer-sunrise' : ''}">
          <i class="fas ${icon}"></i>
          <div class="prayer-time-name">${name}</div>
          <div class="prayer-time-value">${formatTo12Hour(data.timings[key] || '--:--')}</div>
        </div>
      `;
    }).join('');
  }

  const locationStatus = document.getElementById('prayer-location-status');
  if (locationStatus && data.location) {
    const accuracyText = data.location.accuracy ? ` • الدقة: ${Math.round(data.location.accuracy)} م` : '';
    locationStatus.textContent = `الموقع الحالي: ${data.location.lat.toFixed(4)}, ${data.location.lng.toFixed(4)}${accuracyText}`;
  }
}

function formatCountdown(ms) {
  if (ms <= 0) return 'حان الآن!';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function startCountdown(data) {
  if (prayerCountdownInterval) clearInterval(prayerCountdownInterval);

  function updateCountdown() {
    const now = new Date();
    let nextPrayer = null;
    let nextPrayerTime = null;
    let smallestDiff = Infinity;

    PRAYER_KEYS.forEach((key) => {
      const time24 = data.timings[key];
      if (!time24) return;

      const prayerDate = parsePrayerDateTime(data.date, time24);
      const diff = prayerDate.getTime() - now.getTime();
      if (diff > 0 && diff < smallestDiff) {
        smallestDiff = diff;
        nextPrayer = key;
        nextPrayerTime = prayerDate;
      }
    });

    const nameEl = document.getElementById('next-prayer-name');
    const timeEl = document.getElementById('next-prayer-countdown');
    if (!nameEl || !timeEl) return;

    if (!nextPrayer) {
      const fajrTime = data.timings.Fajr;
      if (fajrTime) {
        const tomorrow = new Date(`${getTodayDate()}T00:00:00`);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextFajr = parsePrayerDateTime(formatDateString(tomorrow), fajrTime);
        nameEl.textContent = 'الفجر (غدًا)';
        timeEl.textContent = formatCountdown(nextFajr.getTime() - now.getTime());
      } else {
        nameEl.textContent = 'الفجر (غدًا)';
        timeEl.textContent = '--:--:--';
      }
      return;
    }

    nameEl.textContent = PRAYER_NAMES[nextPrayer];
    timeEl.textContent = smallestDiff < 60000 ? 'حان الآن!' : formatCountdown(smallestDiff);
    timeEl.classList.toggle('prayer-now', smallestDiff < 60000);

    if (nextPrayerTime && nextPrayerTime.getTime() < now.getTime()) {
      timeEl.textContent = 'حان الآن!';
    }
  }

  updateCountdown();
  prayerCountdownInterval = setInterval(updateCountdown, 1000);
}

function getPrayerNotificationStatusText(settings) {
  if (!settings.enabled) {
    return 'التذكيرات متوقفة حاليًا.';
  }
  if (settings.permission !== 'granted') {
    return 'يلزم منح إذن الإشعارات أولًا لتفعيل التذكيرات.';
  }
  if (settings.scheduleState === 'scheduled') {
    return `التذكيرات مفعلة قبل الصلاة بـ ${settings.reminderMinutes} دقائق.`;
  }
  if (settings.scheduleState === 'partial') {
    return `تمت جدولة جزء من التذكيرات، وسيُعاد المحاولة تلقائيًا.`;
  }
  if (settings.scheduleState === 'error') {
    return 'حدثت مشكلة أثناء تجهيز التذكيرات.';
  }
  return 'التذكيرات مفعلة بانتظار أول جدولة ناجحة.';
}

function getPrayerNotificationDetailsText(settings) {
  const details = [];
  if (settings.scheduledPrayerCount) {
    details.push(`الإشعارات المجدولة: ${settings.scheduledPrayerCount}`);
  }
  if (settings.lastScheduledAt) {
    details.push(`آخر جدولة: ${new Date(settings.lastScheduledAt).toLocaleString('ar-EG')}`);
  }
  if (settings.lastError) {
    details.push(`آخر ملاحظة: ${settings.lastError}`);
  }
  return details.length ? details.join(' • ') : 'سيتم عرض حالة الجدولة هنا بعد التفعيل.';
}

function renderPrayerNotificationSettings() {
  const settings = getPrayerSettings();
  const toggle = document.getElementById('prayer-notifications-enabled');
  const reminderSelect = document.getElementById('prayer-reminder-minutes');
  const status = document.getElementById('prayer-notification-status');
  const details = document.getElementById('prayer-notification-details');
  const exactAlarmStatus = document.getElementById('prayer-exact-alarm-status');
  const exactAlarmButton = document.getElementById('btn-open-exact-alarm-settings');

  if (toggle) toggle.checked = !!settings.enabled;
  if (reminderSelect) reminderSelect.value = String(settings.reminderMinutes);
  if (status) status.textContent = getPrayerNotificationStatusText(settings);
  if (details) details.textContent = getPrayerNotificationDetailsText(settings);

  if (exactAlarmStatus) {
    if (!window.HalaqatnaNativeBridge?.isAndroidApp?.()) {
      exactAlarmStatus.textContent = 'في المتصفح: التذكيرات الخلفية الكاملة تعتمد على نسخة Android.';
    } else if (settings.exactAlarmGranted === false) {
      exactAlarmStatus.textContent = 'الإشعارات الدقيقة غير مفعلة على النظام، وقد تتأخر بعض التذكيرات.';
    } else if (settings.exactAlarmGranted === true) {
      exactAlarmStatus.textContent = 'الإشعارات الدقيقة مفعلة على الجهاز.';
    } else {
      exactAlarmStatus.textContent = 'جارٍ فحص إمكانية الإشعارات الدقيقة...';
    }
  }

  if (exactAlarmButton) {
    exactAlarmButton.style.display = window.HalaqatnaNativeBridge?.isAndroidApp?.() && settings.exactAlarmGranted === false
      ? 'inline-flex'
      : 'none';
  }
}

async function requestBrowserNotificationPermission() {
  if (!('Notification' in window)) {
    showToast('متصفحك لا يدعم الإشعارات، يرجى استخدام Chrome أو Edge', 'error');
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  updatePrayerSettings({
    permission,
    enabled: permission === 'granted',
    scheduleState: permission === 'granted' ? 'pending' : 'idle'
  });
  renderPrayerNotificationSettings();
  return permission;
}

function browserNotificationsSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

function buildPrayerSchedulePayload(prayerData, tomorrowData = null) {
  const settings = getPrayerSettings();
  const days = [prayerData];
  if (tomorrowData) days.push(tomorrowData);

  return {
    generatedAt: new Date().toISOString(),
    reminderMinutes: Number(settings.reminderMinutes),
    location: prayerData.location,
    days: days.map((day) => ({
      date: day.date,
      prayers: PRAYER_KEYS.map((key) => {
        const prayerAt = parsePrayerDateTime(day.date, day.timings[key]);
        const remindAt = new Date(prayerAt.getTime() - settings.reminderMinutes * 60 * 1000);
        return {
          key,
          name: PRAYER_NAMES[key],
          prayerAt: prayerAt.toISOString(),
          remindAt: remindAt.toISOString()
        };
      })
    }))
  };
}

function syncPrayerStatusFromNative() {
  if (!window.HalaqatnaNativeBridge?.isAndroidApp?.()) {
    return;
  }

  const status = window.HalaqatnaNativeBridge.getPrayerNotificationStatus();
  if (status) {
    updatePrayerSettings({
      scheduleState: status.enabled
        ? (status.lastError ? (status.scheduledPrayerCount > 0 ? 'partial' : 'error') : 'scheduled')
        : 'idle',
      scheduledPrayerCount: Number(status.scheduledPrayerCount) || 0,
      lastScheduledAt: status.lastScheduledAt || null,
      lastError: status.lastError || ''
    });
  }

  window.HalaqatnaNativeBridge.checkExactAlarmPermission();
  renderPrayerNotificationSettings();
}

async function schedulePrayerNotificationsIfNeeded(prayerData, options = {}) {
  const { showFeedback = false } = options;
  const settings = getPrayerSettings();
  if (!settings.enabled || settings.permission !== 'granted') return;

  if (window.HalaqatnaNativeBridge?.isAndroidApp?.()) {
    try {
      let tomorrow = null;
      try {
        const tomorrowDate = new Date(`${prayerData.date}T00:00:00`);
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        tomorrow = await fetchPrayerTimingsForDate(prayerData.location.lat, prayerData.location.lng, tomorrowDate);
        tomorrow.location = prayerData.location;
      } catch (error) {
        console.warn('Tomorrow prayer fetch failed, falling back to today only:', error);
        updatePrayerSettings({ lastError: 'تعذر تحميل مواقيت الغد، تم الاحتفاظ بجدولة اليوم فقط.' });
      }

      const payload = buildPrayerSchedulePayload(prayerData, tomorrow);
      const scheduled = window.HalaqatnaNativeBridge.schedulePrayerNotifications(payload);
      if (!scheduled) {
        updatePrayerSettings({
          scheduleState: 'error',
          lastError: 'تعذر إرسال جدول الإشعارات إلى طبقة Android.'
        });
        renderPrayerNotificationSettings();
        showToast('تعذر جدولة التذكيرات على هذا الجهاز', 'error');
        return;
      }

      syncPrayerStatusFromNative();
      if (showFeedback) {
        showToast('تم تحديث تذكيرات الصلاة بنجاح');
      }
      return;
    } catch (error) {
      console.error(error);
      updatePrayerSettings({
        scheduleState: 'error',
        lastError: 'تعذر تجهيز تذكيرات الصلاة لهذا اليوم.'
      });
      renderPrayerNotificationSettings();
      showToast('تعذر تجهيز تذكيرات الصلاة لهذا اليوم', 'error');
      return;
    }
  }

  if (!browserNotificationsSupported()) {
    showToast('متصفحك لا يدعم الإشعارات، يرجى استخدام Chrome أو Edge', 'error');
    return;
  }

  updatePrayerSettings({
    scheduleState: 'pending',
    lastError: 'الإشعارات الخلفية الموثوقة بعد إغلاق التطبيق متاحة داخل نسخة Android.'
  });
  renderPrayerNotificationSettings();

  if (showFeedback) {
    showToast('تم حفظ الإعدادات، لكن الاعتمادية الكاملة للإشعارات بعد الإغلاق تعمل داخل نسخة Android.', 'warning');
  }
}

async function handlePrayerNotificationsToggle(enabled) {
  updatePrayerSettings({ enabled: !!enabled, scheduleState: enabled ? 'pending' : 'idle', lastError: '' });

  if (!enabled) {
    window.HalaqatnaNativeBridge?.cancelPrayerNotifications?.();
    updatePrayerSettings({
      scheduledPrayerCount: 0,
      lastScheduledAt: null,
      scheduleState: 'idle'
    });
    renderPrayerNotificationSettings();
    showToast('تم إيقاف تذكيرات الصلاة', 'warning');
    return;
  }

  if (window.HalaqatnaNativeBridge?.isAndroidApp?.()) {
    const requested = window.HalaqatnaNativeBridge.requestNotificationPermission();
    if (!requested) {
      updatePrayerSettings({
        enabled: false,
        scheduleState: 'error',
        lastError: 'تعذر طلب إذن الإشعارات من التطبيق.'
      });
      renderPrayerNotificationSettings();
      showToast('تعذر طلب إذن الإشعارات من التطبيق', 'error');
    }
    return;
  }

  if (!browserNotificationsSupported()) {
    updatePrayerSettings({
      enabled: false,
      permission: 'denied',
      scheduleState: 'error',
      lastError: 'المتصفح لا يدعم الإشعارات.'
    });
    renderPrayerNotificationSettings();
    showToast('متصفحك لا يدعم الإشعارات، يرجى استخدام Chrome أو Edge', 'error');
    return;
  }

  const permission = await requestBrowserNotificationPermission();
  if (permission !== 'granted') {
    updatePrayerSettings({
      enabled: false,
      scheduleState: 'idle',
      lastError: 'تم رفض إذن الإشعارات.'
    });
    renderPrayerNotificationSettings();
    showToast('تم رفض إذن الإشعارات', 'error');
    return;
  }

  const cached = getCachedPrayerTimes();
  if (cached) {
    await schedulePrayerNotificationsIfNeeded(cached, { showFeedback: true });
  }
}

async function fetchPrayerTimesWithLocation() {
  showPrayerLoading();

  if (!navigator.geolocation) {
    showPrayerError('المتصفح لا يدعم تحديد الموقع');
    return;
  }

  navigator.geolocation.getCurrentPosition(async (position) => {
    try {
      const prayerData = await fetchPrayerTimingsForDate(position.coords.latitude, position.coords.longitude, new Date());
      prayerData.timestamp = Date.now();
      prayerData.location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
      savePrayerCache(prayerData);
      displayPrayerData(prayerData);
      startCountdown(prayerData);
      await schedulePrayerNotificationsIfNeeded(prayerData);
    } catch (error) {
      console.error(error);
      showPrayerError('تعذر جلب المواقيت. تحقق من الاتصال بالإنترنت.');
    }
  }, (error) => {
    console.warn('Geolocation failed:', error);
    showPrayerError('لم نتمكن من تحديد موقعك. يرجى السماح بالوصول للموقع.');
  }, {
    enableHighAccuracy: true,
    timeout: 12000,
    maximumAge: 3600000
  });
}

function retryPrayerTimes() {
  clearPrayerCache();
  fetchPrayerTimesWithLocation();
}

function initPrayerTimes() {
  const cached = getCachedPrayerTimes();
  if (cached) {
    displayPrayerData(cached);
    startCountdown(cached);
    schedulePrayerNotificationsIfNeeded(cached);
  } else {
    fetchPrayerTimesWithLocation();
  }

  document.getElementById('prayer-card')?.addEventListener('click', (event) => {
    if (event.target.closest('#btn-retry-prayer') || event.target.closest('#btn-qibla-card')) return;
    openModal('modal-prayer-times');
    syncPrayerStatusFromNative();
  });

  document.getElementById('btn-prayer-refresh')?.addEventListener('click', retryPrayerTimes);

  document.getElementById('prayer-notifications-enabled')?.addEventListener('change', async (event) => {
    await handlePrayerNotificationsToggle(event.target.checked);
  });

  document.getElementById('prayer-reminder-minutes')?.addEventListener('change', async (event) => {
    updatePrayerSettings({
      reminderMinutes: Number(event.target.value) || 10,
      scheduleState: 'pending'
    });
    renderPrayerNotificationSettings();
    const cachedData = getCachedPrayerTimes();
    if (cachedData) {
      await schedulePrayerNotificationsIfNeeded(cachedData, { showFeedback: true });
    }
  });

  document.getElementById('btn-open-exact-alarm-settings')?.addEventListener('click', () => {
    const opened = window.HalaqatnaNativeBridge?.openExactAlarmSettings?.();
    if (!opened) {
      showToast('تعذر فتح إعدادات الإشعارات الدقيقة على هذا الجهاز', 'error');
    }
  });

  document.addEventListener('halaqatna:permission-result', async (event) => {
    const { type, status } = event.detail || {};
    if (type === HALAQATNA_PERMISSION_NOTIFICATIONS) {
      const granted = status === 'granted';
      updatePrayerSettings({
        permission: status,
        enabled: granted,
        scheduleState: granted ? 'pending' : 'idle',
        lastError: granted ? '' : 'تم رفض إذن الإشعارات.'
      });
      renderPrayerNotificationSettings();

      if (granted) {
        const cachedData = getCachedPrayerTimes();
        if (cachedData) {
          await schedulePrayerNotificationsIfNeeded(cachedData, { showFeedback: true });
        } else {
          fetchPrayerTimesWithLocation();
        }
      } else {
        showToast('تم رفض إذن الإشعارات', 'error');
      }
    }
  });

  document.addEventListener('halaqatna:exact-alarm-status', (event) => {
    updatePrayerSettings({ exactAlarmGranted: !!event.detail?.granted });
    renderPrayerNotificationSettings();
  });

  const browserPermission = typeof Notification !== 'undefined' ? Notification.permission : 'default';
  if (!window.HalaqatnaNativeBridge?.isAndroidApp?.()) {
    updatePrayerSettings({ permission: browserPermission });
  }

  syncPrayerStatusFromNative();
  renderPrayerNotificationSettings();
}
