/**
 * prayer.js
 * مواقيت الصلاة مع مؤقت تنازلي + إشعارات
 * - جلب المواقيت من Aladhan API
 * - تخزين مؤقت في localStorage ليوم كامل
 * - عد تنازلي للصلاة القادمة
 * - تكامل مع نظام الإشعارات
 */

var PRAYER_NAMES = {
  Fajr: 'الفجر',
  Sunrise: 'الشروق',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء'
};

var PRAYER_ICONS = {
  Fajr: 'fa-cloud-sun',
  Sunrise: 'fa-sun',
  Dhuhr: 'fa-sun',
  Asr: 'fa-cloud-sun',
  Maghrib: 'fa-cloud-moon',
  Isha: 'fa-moon'
};

var PRAYER_KEYS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
var PRAYER_STORAGE_KEY = 'prayerTimesCache';

var prayerCountdownInterval = null;

function formatTo12Hour(time24) {
  if (!time24 || time24.indexOf(':') === -1 || time24 === '--:--') return time24;
  var parts = time24.split(':');
  var hours = parseInt(parts[0], 10);
  var minutes = parts[1];
  var period = (hours >= 12) ? 'م' : 'ص';
  var hours12 = (hours % 12) || 12;
  return hours12 + ':' + minutes + ' ' + period;
}

// ═══════════════════════════════════
// ■ تهيئة مواقيت الصلاة
// ═══════════════════════════════════

function initPrayerTimes() {
  var cached = getCachedPrayerTimes();
  if (cached) {
    displayPrayerData(cached);
    startCountdown(cached);
    // إعادة جدولة الإشعارات إذا كانت مفعلة
    if (typeof schedulePrayerNotifications === 'function') {
      schedulePrayerNotifications(cached);
    }
  } else {
    fetchPrayerTimesWithLocation();
  }

  // اضغط على البطاقة لفتح المودال
  var card = document.getElementById('prayer-card');
  if (card) {
    card.addEventListener('click', function(e) {
      if (e.target.closest && e.target.closest('#btn-retry-prayer')) return;
      if (e.target.id === 'btn-retry-prayer' || (e.target.parentNode && e.target.parentNode.id === 'btn-retry-prayer')) return;
      openModal('modal-prayer-times');
    });
  }

  // تهيئة واجهة الإشعارات
  if (typeof initNotifications === 'function') {
    initNotifications();
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
    function(pos) {
      fetchPrayerTimesFromAPI(pos.coords.latitude, pos.coords.longitude);
    },
    function(err) {
      console.warn('فشل تحديد الموقع:', err.message);
      showPrayerError('لم نتمكن من تحديد موقعك. يرجى السماح بالوصول للموقع.');
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 3600000 }
  );
}

function fetchPrayerTimesFromAPI(lat, lng) {
  var timestamp = Math.floor(Date.now() / 1000);
  var url = 'https://api.aladhan.com/v1/timings/' + timestamp + '?latitude=' + lat + '&longitude=' + lng + '&method=5';

  // نستخدم fetch إذا كان متاحاً وإلا نستخدم XMLHttpRequest
  if (typeof fetch !== 'undefined') {
    fetch(url).then(function(response) {
      if (!response.ok) throw new Error('API error: ' + response.status);
      return response.json();
    }).then(function(data) {
      handlePrayerAPIResponse(data);
    }).catch(function(err) {
      console.error('خطأ في جلب المواقيت:', err);
      showPrayerError('تعذر جلب المواقيت. تحقق من الاتصال بالإنترنت.');
    });
  } else {
    // XMLHttpRequest fallback للمتصفحات القديمة
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            var data = JSON.parse(xhr.responseText);
            handlePrayerAPIResponse(data);
          } catch(e) {
            showPrayerError('تعذر قراءة بيانات المواقيت.');
          }
        } else {
          showPrayerError('تعذر جلب المواقيت. تحقق من الاتصال بالإنترنت.');
        }
      }
    };
    xhr.onerror = function() {
      showPrayerError('تعذر جلب المواقيت. تحقق من الاتصال بالإنترنت.');
    };
    xhr.send();
  }
}

function handlePrayerAPIResponse(data) {
  if (!data || data.code !== 200) {
    showPrayerError('استجابة API غير صالحة');
    return;
  }

  var timings = data.data.timings;
  var prayerData = {
    timings: {},
    date: getTodayDate(),
    timestamp: Date.now(),
    location: {}
  };

  var keys = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  keys.forEach(function(key) {
    prayerData.timings[key] = timings[key];
  });

  savePrayerCache(prayerData);
  displayPrayerData(prayerData);
  startCountdown(prayerData);

  // جدولة الإشعارات بعد جلب المواقيت
  if (typeof schedulePrayerNotifications === 'function') {
    schedulePrayerNotifications(prayerData);
  }

  console.log('تم جلب مواقيت الصلاة بنجاح');
}

// ═══════════════════════════════════
// ■ التخزين المؤقت
// ═══════════════════════════════════

function savePrayerCache(data) {
  try {
    localStorage.setItem(PRAYER_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {}
}

function getCachedPrayerTimes() {
  try {
    var raw = localStorage.getItem(PRAYER_STORAGE_KEY);
    if (!raw) return null;
    var data = JSON.parse(raw);
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
  var card = document.getElementById('prayer-card');
  if (!card) return;

  card.classList.remove('prayer-error', 'prayer-loading');

  var grid = document.getElementById('prayer-times-grid');
  if (grid) {
    var html = '';
    PRAYER_KEYS.forEach(function(key) {
      var time = (data.timings[key]) ? formatTo12Hour(data.timings[key]) : '--:--';
      var icon = PRAYER_ICONS[key] || 'fa-clock';
      var name = PRAYER_NAMES[key];
      html += '<div class="prayer-time-item">';
      html += '<i class="fas ' + icon + '"></i>';
      html += '<div class="prayer-time-name">' + name + '</div>';
      html += '<div class="prayer-time-value">' + time + '</div>';
      html += '</div>';
    });

    // إضافة الشروق
    if (data.timings.Sunrise) {
      html += '<div class="prayer-time-item prayer-sunrise">';
      html += '<i class="fas fa-sun"></i>';
      html += '<div class="prayer-time-name">الشروق</div>';
      html += '<div class="prayer-time-value">' + formatTo12Hour(data.timings.Sunrise) + '</div>';
      html += '</div>';
    }

    grid.innerHTML = html;
  }
}

function showPrayerLoading() {
  var nameEl = document.getElementById('next-prayer-name');
  var timeEl = document.getElementById('next-prayer-countdown');
  if (nameEl) nameEl.textContent = 'جاري التحميل...';
  if (timeEl) timeEl.textContent = '--:--:--';
}

function showPrayerError(msg) {
  var nameEl = document.getElementById('next-prayer-name');
  var timeEl = document.getElementById('next-prayer-countdown');
  var retryBtn = document.getElementById('btn-retry-prayer');

  if (nameEl) nameEl.textContent = 'غير متاح';
  if (timeEl) timeEl.textContent = msg || 'تعذر جلب المواقيت';
  if (retryBtn) retryBtn.style.display = 'inline-flex';

  var card = document.getElementById('prayer-card');
  if (card) card.classList.add('prayer-error');
}

// ═══════════════════════════════════
// ■ العد التنازلي
// ═══════════════════════════════════

function startCountdown(data) {
  if (prayerCountdownInterval) clearInterval(prayerCountdownInterval);

  function updateCountdown() {
    var now = new Date();
    var nextPrayer = null;
    var nextTime = null;
    var smallestDiff = Infinity;

    PRAYER_KEYS.forEach(function(key) {
      var timeStr = data.timings[key];
      if (!timeStr) return;

      var parts = timeStr.split(':');
      var hours = parseInt(parts[0], 10);
      var minutes = parseInt(parts[1], 10);

      var prayerDate = new Date(now);
      prayerDate.setHours(hours, minutes, 0, 0);

      var diff = prayerDate - now;
      if (diff > 0 && diff < smallestDiff) {
        smallestDiff = diff;
        nextPrayer = key;
        nextTime = prayerDate;
      }
    });

    var nameEl = document.getElementById('next-prayer-name');
    var timeEl = document.getElementById('next-prayer-countdown');
    var retryBtn = document.getElementById('btn-retry-prayer');

    if (retryBtn) retryBtn.style.display = 'none';

    if (!nextPrayer) {
      if (nameEl) nameEl.textContent = 'الفجر (غداً)';
      if (timeEl) {
        var fajrStr = data.timings.Fajr;
        if (fajrStr) {
          var fp = fajrStr.split(':');
          var fh = parseInt(fp[0], 10);
          var fm = parseInt(fp[1], 10);
          var tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(fh, fm, 0, 0);
          timeEl.textContent = formatCountdown(tomorrow - now);
        } else {
          timeEl.textContent = '--:--';
        }
      }

      // إعادة جلب المواقيت عند منتصف الليل
      var midnight = new Date(now);
      midnight.setDate(midnight.getDate() + 1);
      midnight.setHours(0, 1, 0, 0);
      var msToMidnight = midnight - now;
      setTimeout(function() {
        localStorage.removeItem(PRAYER_STORAGE_KEY);
        fetchPrayerTimesWithLocation();
      }, msToMidnight);

      return;
    }

    if (nameEl) nameEl.textContent = PRAYER_NAMES[nextPrayer];
    if (timeEl) timeEl.textContent = formatCountdown(smallestDiff);

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
  var totalSeconds = Math.floor(ms / 1000);
  var hours = Math.floor(totalSeconds / 3600);
  var minutes = Math.floor((totalSeconds % 3600) / 60);
  var seconds = totalSeconds % 60;
  var pad = function(n) { return n < 10 ? '0' + n : String(n); };
  return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
}

// ═══════════════════════════════════
// ■ إعادة المحاولة
// ═══════════════════════════════════

function retryPrayerTimes() {
  localStorage.removeItem(PRAYER_STORAGE_KEY);
  fetchPrayerTimesWithLocation();
}
