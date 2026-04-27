/**
 * prayer.js
 * مواقيت الصلاة مع مؤقت تنازلي
 * - جلب المواقيت من Aladhan API
 * - تخزين مؤقت في localStorage ليوم كامل
 * - عد تنازلي للصلاة القادمة
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

let prayerCountdownInterval = null;

// ═══════════════════════════════════
// ■ تهيئة مواقيت الصلاة
// ═══════════════════════════════════

function initPrayerTimes() {
  const cached = getCachedPrayerTimes();
  if (cached) {
    displayPrayerData(cached);
    startCountdown(cached);
  } else {
    fetchPrayerTimesWithLocation();
  }

  // اضغط على البطاقة لفتح المودال
  const card = document.getElementById('prayer-card');
  if (card) {
    card.addEventListener('click', (e) => {
      if (e.target.closest('#btn-retry-prayer')) return;
      openModal('modal-prayer-times');
    });
  }
}

// ═══════════════════════════════════
// ■ جلب الموقع + المواقيت
// ═══════════════════════════════════

function fetchPrayerTimesWithLocation() {
  showPrayerLoading();

  if (!navigator.geolocation) {
    showPrayerError('المتصفح لا يدعم تحديد الموقع');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      fetchPrayerTimesFromAPI(pos.coords.latitude, pos.coords.longitude);
    },
    (err) => {
      console.warn('⚠️ فشل تحديد الموقع:', err.message);
      showPrayerError('لم نتمكن من تحديد موقعك. يرجى السماح بالوصول للموقع.');
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 3600000 }
  );
}

async function fetchPrayerTimesFromAPI(lat, lng) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const url = `https://api.aladhan.com/v1/timings/${timestamp}?latitude=${lat}&longitude=${lng}&method=5`;
    const response = await fetch(url);

    if (!response.ok) throw new Error('API error: ' + response.status);

    const data = await response.json();
    if (data.code !== 200) throw new Error('Invalid API response');

    const timings = data.data.timings;
    const prayerData = {
      timings: {},
      date: getTodayDate(),
      timestamp: Date.now(),
      location: { lat, lng }
    };

    // استخراج أوقات الصلوات الخمس + الشروق
    ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].forEach(key => {
      prayerData.timings[key] = timings[key];
    });

    // تخزين مؤقت
    savePrayerCache(prayerData);
    displayPrayerData(prayerData);
    startCountdown(prayerData);

    console.log('✅ تم جلب مواقيت الصلاة بنجاح');
  } catch (err) {
    console.error('❌ خطأ في جلب المواقيت:', err);
    showPrayerError('تعذر جلب المواقيت. تحقق من الاتصال بالإنترنت.');
  }
}

// ═══════════════════════════════════
// ■ التخزين المؤقت
// ═══════════════════════════════════

function savePrayerCache(data) {
  try {
    localStorage.setItem(PRAYER_STORAGE_KEY, JSON.stringify(data));
  } catch (e) { /* ignore */ }
}

function getCachedPrayerTimes() {
  try {
    const raw = localStorage.getItem(PRAYER_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // تحقق: هل البيانات لنفس اليوم؟
    if (data.date !== getTodayDate()) return null;
    return data;
  } catch (e) {
    return null;
  }
}

// ═══════════════════════════════════
// ■ عرض البيانات
// ═══════════════════════════════════

function displayPrayerData(data) {
  const card = document.getElementById('prayer-card');
  if (!card) return;

  // إخفاء حالة الخطأ والتحميل
  card.classList.remove('prayer-error', 'prayer-loading');

  // تحديث المودال
  const grid = document.getElementById('prayer-times-grid');
  if (grid) {
    grid.innerHTML = PRAYER_KEYS.map(key => {
      const time = data.timings[key] || '--:--';
      const icon = PRAYER_ICONS[key] || 'fa-clock';
      const name = PRAYER_NAMES[key];
      return `
        <div class="prayer-time-item">
          <i class="fas ${icon}"></i>
          <div class="prayer-time-name">${name}</div>
          <div class="prayer-time-value">${time}</div>
        </div>
      `;
    }).join('');

    // إضافة الشروق
    if (data.timings.Sunrise) {
      const sunriseHTML = `
        <div class="prayer-time-item prayer-sunrise">
          <i class="fas fa-sun"></i>
          <div class="prayer-time-name">الشروق</div>
          <div class="prayer-time-value">${data.timings.Sunrise}</div>
        </div>
      `;
      grid.innerHTML = grid.innerHTML.replace('</div>', '</div>' + sunriseHTML);
    }
  }
}

function showPrayerLoading() {
  const nameEl = document.getElementById('next-prayer-name');
  const timeEl = document.getElementById('next-prayer-countdown');
  if (nameEl) nameEl.textContent = 'جاري التحميل...';
  if (timeEl) timeEl.textContent = '--:--:--';
}

function showPrayerError(msg) {
  const nameEl = document.getElementById('next-prayer-name');
  const timeEl = document.getElementById('next-prayer-countdown');
  const retryBtn = document.getElementById('btn-retry-prayer');

  if (nameEl) nameEl.textContent = 'غير متاح';
  if (timeEl) timeEl.textContent = msg || 'تعذر جلب المواقيت';
  if (retryBtn) retryBtn.style.display = 'inline-flex';

  const card = document.getElementById('prayer-card');
  if (card) card.classList.add('prayer-error');
}

// ═══════════════════════════════════
// ■ العد التنازلي
// ═══════════════════════════════════

function startCountdown(data) {
  if (prayerCountdownInterval) clearInterval(prayerCountdownInterval);

  function updateCountdown() {
    const now = new Date();
    const todayStr = getTodayDate();
    let nextPrayer = null;
    let nextTime = null;
    let smallestDiff = Infinity;

    for (const key of PRAYER_KEYS) {
      const timeStr = data.timings[key];
      if (!timeStr) continue;

      const [hours, minutes] = timeStr.split(':').map(Number);
      const prayerDate = new Date(now);
      prayerDate.setHours(hours, minutes, 0, 0);

      const diff = prayerDate - now;
      if (diff > 0 && diff < smallestDiff) {
        smallestDiff = diff;
        nextPrayer = key;
        nextTime = prayerDate;
      }
    }

    const nameEl = document.getElementById('next-prayer-name');
    const timeEl = document.getElementById('next-prayer-countdown');
    const retryBtn = document.getElementById('btn-retry-prayer');

    if (retryBtn) retryBtn.style.display = 'none';

    if (!nextPrayer) {
      // كل الصلوات مضت — انتظر فجر الغد
      if (nameEl) nameEl.textContent = 'الفجر (غداً)';
      if (timeEl) {
        const fajrStr = data.timings.Fajr;
        if (fajrStr) {
          const [h, m] = fajrStr.split(':').map(Number);
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(h, m, 0, 0);
          const diff = tomorrow - now;
          timeEl.textContent = formatCountdown(diff);
        } else {
          timeEl.textContent = data.timings.Fajr || '--:--';
        }
      }

      // أعد جلب المواقيت عند منتصف الليل
      const midnight = new Date(now);
      midnight.setDate(midnight.getDate() + 1);
      midnight.setHours(0, 1, 0, 0);
      const msToMidnight = midnight - now;
      setTimeout(() => {
        localStorage.removeItem(PRAYER_STORAGE_KEY);
        fetchPrayerTimesWithLocation();
      }, msToMidnight);

      return;
    }

    // عرض الصلاة القادمة
    if (nameEl) nameEl.textContent = PRAYER_NAMES[nextPrayer];
    if (timeEl) timeEl.textContent = formatCountdown(smallestDiff);

    // حالة "وقت الصلاة الآن" عندما يتبقى أقل من دقيقة
    if (smallestDiff < 60000) {
      if (timeEl) {
        timeEl.textContent = 'حان الآن!';
        timeEl.classList.add('prayer-now');
      }
    } else {
      if (timeEl) timeEl.classList.remove('prayer-now');
    }
  }

  updateCountdown();
  prayerCountdownInterval = setInterval(updateCountdown, 1000);
}

function formatCountdown(ms) {
  if (ms <= 0) return 'حان الآن!';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ═══════════════════════════════════
// ■ إعادة المحاولة
// ═══════════════════════════════════

function retryPrayerTimes() {
  localStorage.removeItem(PRAYER_STORAGE_KEY);
  fetchPrayerTimesWithLocation();
}
