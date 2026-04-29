/**
 * qibla.js
 * FIX 3:
 * بوصلة القبلة مع الموقع واتجاه الجهاز وبديل Android أصلي.
 */

const QIBLA_STORAGE_KEY = 'halaqatna_qibla_calibration';
const MAKKAH_COORDS = { lat: 21.4225, lng: 39.8262 };

const qiblaState = {
  heading: null,
  qiblaBearing: null,
  location: null,
  orientationStarted: false,
  nativeCompassActive: false,
  headingSource: 'unknown',
  calibrationOffset: 0,
  headingTimeoutId: null
};

function loadQiblaCalibration() {
  try {
    const value = Number(localStorage.getItem(QIBLA_STORAGE_KEY) || 0);
    return Number.isFinite(value) ? value : 0;
  } catch (error) {
    return 0;
  }
}

function saveQiblaCalibration(value) {
  localStorage.setItem(QIBLA_STORAGE_KEY, String(value));
}

function normalizeDegrees(value) {
  return ((value % 360) + 360) % 360;
}

function calculateQiblaBearing(lat, lng) {
  const userLat = lat * Math.PI / 180;
  const userLng = lng * Math.PI / 180;
  const makkahLat = MAKKAH_COORDS.lat * Math.PI / 180;
  const makkahLng = MAKKAH_COORDS.lng * Math.PI / 180;

  const deltaLng = makkahLng - userLng;
  const y = Math.sin(deltaLng);
  const x = Math.cos(userLat) * Math.tan(makkahLat) - Math.sin(userLat) * Math.cos(deltaLng);
  return normalizeDegrees(Math.atan2(y, x) * 180 / Math.PI);
}

function getHeadingFromOrientationEvent(event) {
  if (typeof event.webkitCompassHeading === 'number') {
    return normalizeDegrees(event.webkitCompassHeading);
  }

  if (typeof event.alpha === 'number') {
    return normalizeDegrees(360 - event.alpha);
  }

  return null;
}

function renderQiblaState(message = '') {
  const headingText = document.getElementById('qibla-heading-text');
  const qiblaText = document.getElementById('qibla-angle-text');
  const statusText = document.getElementById('qibla-status-text');
  const compassRose = document.getElementById('qibla-compass-rose');
  const qiblaNeedle = document.getElementById('qibla-needle');
  const qiblaArrow = document.getElementById('qibla-arrow');

  if (headingText) {
    headingText.textContent = qiblaState.heading == null
      ? 'اتجاه الهاتف: غير متاح'
      : `اتجاه الهاتف: ${Math.round(qiblaState.heading)}°`;
  }

  if (qiblaText) {
    qiblaText.textContent = qiblaState.qiblaBearing == null
      ? 'القبلة: غير متاحة'
      : `القبلة: ${Math.round(qiblaState.qiblaBearing)}°`;
  }

  if (statusText) {
    if (message) {
      statusText.textContent = message;
    } else if (qiblaState.heading == null) {
      statusText.textContent = 'حرّك الهاتف على شكل رقم 8 إذا كان الاتجاه غير دقيق.';
    } else {
      statusText.textContent = qiblaState.headingSource === 'native'
        ? 'تم استخدام مستشعر الجهاز الأصلي لرفع الدقة.'
        : 'اتجاه القبلة محدث حسب موقعك واتجاه الهاتف.';
    }
  }

  if (compassRose && qiblaState.heading != null) {
    const correctedHeading = normalizeDegrees(qiblaState.heading - qiblaState.calibrationOffset);
    compassRose.style.transform = `rotate(${-correctedHeading}deg)`;
  }

  if (qiblaNeedle && qiblaState.qiblaBearing != null) {
    qiblaNeedle.style.transform = `translateX(-50%) rotate(${qiblaState.qiblaBearing}deg)`;
  }

  if (qiblaArrow && qiblaState.heading != null && qiblaState.qiblaBearing != null) {
    const correctedHeading = normalizeDegrees(qiblaState.heading - qiblaState.calibrationOffset);
    const relative = normalizeDegrees(qiblaState.qiblaBearing - correctedHeading);
    qiblaArrow.style.transform = `translateX(-50%) rotate(${relative}deg)`;
  }
}

function handleQiblaHeading(degrees, source = 'web') {
  if (!Number.isFinite(degrees)) return;
  qiblaState.heading = normalizeDegrees(degrees);
  qiblaState.headingSource = source;
  renderQiblaState();
}

function stopQiblaCompass() {
  window.removeEventListener('deviceorientationabsolute', onQiblaOrientation);
  window.removeEventListener('deviceorientation', onQiblaOrientation);
  clearTimeout(qiblaState.headingTimeoutId);
  qiblaState.orientationStarted = false;

  if (qiblaState.nativeCompassActive) {
    window.HalaqatnaNativeBridge?.stopCompass?.();
    qiblaState.nativeCompassActive = false;
  }
}

function onQiblaOrientation(event) {
  const heading = getHeadingFromOrientationEvent(event);
  if (heading == null) return;
  handleQiblaHeading(heading, 'web');
}

async function requestQiblaOrientation() {
  stopQiblaCompass();

  try {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== 'granted') {
        renderQiblaState('لم يتم منح إذن مستشعر الاتجاه.');
        return;
      }
    }
  } catch (error) {
    console.warn('Orientation permission request failed:', error);
  }

  window.addEventListener('deviceorientationabsolute', onQiblaOrientation, true);
  window.addEventListener('deviceorientation', onQiblaOrientation, true);
  qiblaState.orientationStarted = true;

  qiblaState.headingTimeoutId = setTimeout(() => {
    if (qiblaState.heading == null) {
      const started = window.HalaqatnaNativeBridge?.startCompass?.();
      if (started) {
        qiblaState.nativeCompassActive = true;
        renderQiblaState('جاري تفعيل مستشعر الجهاز الأصلي...');
      } else {
        renderQiblaState('هذا الجهاز لا يدعم مستشعر البوصلة أو لا يمكن قراءته.');
      }
    }
  }, 2200);
}

function requestQiblaLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('المتصفح لا يدعم تحديد الموقع.'));
      return;
    }

    navigator.geolocation.getCurrentPosition((position) => {
      resolve({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });
    }, (error) => {
      reject(error);
    }, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 300000
    });
  });
}

async function openQiblaCompass() {
  qiblaState.calibrationOffset = loadQiblaCalibration();
  qiblaState.heading = null;
  qiblaState.qiblaBearing = null;
  qiblaState.location = null;
  openModal('modal-qibla');
  renderQiblaState('جاري تحديد الموقع والاتجاه...');

  try {
    const location = await requestQiblaLocation();
    qiblaState.location = location;
    qiblaState.qiblaBearing = calculateQiblaBearing(location.lat, location.lng);
    renderQiblaState('تم تحديد موقعك. حرّك الهاتف ببطء لمزامنة البوصلة.');
    await requestQiblaOrientation();
  } catch (error) {
    console.error(error);
    window.HalaqatnaNativeBridge?.requestLocationPermission?.();
    renderQiblaState('تعذر الوصول إلى الموقع. يرجى تفعيل الموقع والسماح للتطبيق بالوصول إليه.');
  }
}

function recalibrateQiblaCompass() {
  if (qiblaState.heading == null) {
    saveQiblaCalibration(0);
    qiblaState.calibrationOffset = 0;
    renderQiblaState('تمت إعادة الضبط. حرّك الهاتف على شكل رقم 8 لتحسين القراءة.');
    return;
  }

  qiblaState.calibrationOffset = qiblaState.heading;
  saveQiblaCalibration(qiblaState.calibrationOffset);
  renderQiblaState('تمت المعايرة الحالية. حرّك الهاتف ببطء إذا احتجت دقة أعلى.');
}

function initQiblaCompass() {
  qiblaState.calibrationOffset = loadQiblaCalibration();

  document.getElementById('btn-qibla-card')?.addEventListener('click', (event) => {
    event.stopPropagation();
    openQiblaCompass();
  });

  document.getElementById('btn-qibla-header')?.addEventListener('click', openQiblaCompass);
  document.getElementById('btn-open-qibla-from-prayer')?.addEventListener('click', openQiblaCompass);
  document.getElementById('btn-qibla-calibrate')?.addEventListener('click', recalibrateQiblaCompass);
  document.getElementById('btn-qibla-close')?.addEventListener('click', () => closeModal('modal-qibla'));

  document.addEventListener('halaqatna:heading-update', (event) => {
    const heading = event.detail?.degrees;
    if (heading != null) {
      handleQiblaHeading(heading, 'native');
    }
  });

  document.addEventListener('halaqatna:permission-result', (event) => {
    const { type, status } = event.detail || {};
    if (type === HALAQATNA_PERMISSION_LOCATION && status !== 'granted') {
      renderQiblaState('تم رفض إذن الموقع. لا يمكن حساب اتجاه القبلة بدون موقعك الحالي.');
    }
  });
}
