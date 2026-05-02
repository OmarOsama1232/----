/**
 * qibla.js
 * FIX 3:
 * بوصلة القبلة مع تحسين الثبات، تشخيص الجودة، ومعايرة أكثر دقة.
 */

const QIBLA_STORAGE_KEY = 'halaqatna_qibla_calibration';
const MAKKAH_COORDS = { lat: 21.4225, lng: 39.8262 };
const MAX_HEADING_SAMPLES = 8;

const qiblaState = {
  heading: null,
  qiblaBearing: null,
  location: null,
  locationAccuracy: null,
  orientationStarted: false,
  nativeCompassActive: false,
  headingSource: 'unknown',
  headingQuality: 'ضعيفة',
  calibrationOffset: 0,
  headingTimeoutId: null,
  headingSamples: [],
  calibrating: false,
  calibrationCollector: []
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

function shortestAngleDifference(from, to) {
  let diff = normalizeDegrees(to) - normalizeDegrees(from);
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

function averageCircularDegrees(values) {
  if (!values.length) return null;
  const vectors = values.reduce((accumulator, current) => {
    const radians = current * Math.PI / 180;
    accumulator.sin += Math.sin(radians);
    accumulator.cos += Math.cos(radians);
    return accumulator;
  }, { sin: 0, cos: 0 });

  return normalizeDegrees(Math.atan2(vectors.sin, vectors.cos) * 180 / Math.PI);
}

function calculateHeadingJitter(values) {
  if (values.length < 2) return 0;
  let total = 0;
  for (let index = 1; index < values.length; index += 1) {
    total += Math.abs(shortestAngleDifference(values[index - 1], values[index]));
  }
  return total / (values.length - 1);
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

function getHeadingQualityLabel() {
  const jitter = calculateHeadingJitter(qiblaState.headingSamples);
  if (qiblaState.headingSamples.length < 3) return 'ضعيفة';
  if (qiblaState.locationAccuracy != null && qiblaState.locationAccuracy > 250) return 'متوسطة';
  if (jitter <= 8) return 'جيدة';
  if (jitter <= 18) return 'متوسطة';
  return 'ضعيفة';
}

function updateQiblaDiagnostics() {
  const sourceEl = document.getElementById('qibla-diagnostics-source');
  const qualityEl = document.getElementById('qibla-diagnostics-quality');
  const accuracyEl = document.getElementById('qibla-diagnostics-accuracy');
  const samplesEl = document.getElementById('qibla-diagnostics-samples');

  if (sourceEl) {
    sourceEl.textContent = qiblaState.headingSource === 'native' ? 'مستشعر Android' : 'مستشعر المتصفح';
  }
  if (qualityEl) {
    qualityEl.textContent = qiblaState.headingQuality;
  }
  if (accuracyEl) {
    accuracyEl.textContent = qiblaState.locationAccuracy == null
      ? 'غير معروفة'
      : `${Math.round(qiblaState.locationAccuracy)} م`;
  }
  if (samplesEl) {
    samplesEl.textContent = String(qiblaState.headingSamples.length);
  }
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
      statusText.textContent = 'حرّك الهاتف ببطء على شكل رقم 8 إذا كانت القراءة غير مستقرة.';
    } else if (qiblaState.locationAccuracy != null && qiblaState.locationAccuracy > 250) {
      statusText.textContent = 'تم تحديد القبلة، لكن دقة الموقع منخفضة نسبيًا. يُفضل الوقوف في مكان مفتوح.';
    } else if (qiblaState.headingQuality === 'ضعيفة') {
      statusText.textContent = 'اتجاه القبلة ظاهر، لكن القراءة تحتاج حركة أهدأ أو معايرة.';
    } else {
      statusText.textContent = qiblaState.headingSource === 'native'
        ? 'يتم استخدام مستشعر الجهاز الأصلي للحصول على أفضل ثبات ممكن.'
        : 'تم مزامنة اتجاه القبلة مع مستشعر المتصفح وموقعك الحالي.';
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

  updateQiblaDiagnostics();
}

function pushHeadingSample(degrees) {
  const previous = qiblaState.headingSamples[qiblaState.headingSamples.length - 1];
  if (previous != null && Math.abs(shortestAngleDifference(previous, degrees)) > 120) {
    return;
  }

  qiblaState.headingSamples.push(degrees);
  if (qiblaState.headingSamples.length > MAX_HEADING_SAMPLES) {
    qiblaState.headingSamples.shift();
  }

  if (qiblaState.calibrating) {
    qiblaState.calibrationCollector.push(degrees);
  }
}

function handleQiblaHeading(degrees, source = 'web') {
  if (!Number.isFinite(degrees)) return;
  pushHeadingSample(normalizeDegrees(degrees));

  const smoothed = averageCircularDegrees(qiblaState.headingSamples);
  if (smoothed == null) return;

  qiblaState.heading = smoothed;
  qiblaState.headingSource = source;
  qiblaState.headingQuality = getHeadingQualityLabel();
  renderQiblaState();
}

function stopQiblaCompass() {
  window.removeEventListener('deviceorientationabsolute', onQiblaOrientation);
  window.removeEventListener('deviceorientation', onQiblaOrientation);
  clearTimeout(qiblaState.headingTimeoutId);
  qiblaState.orientationStarted = false;
  qiblaState.calibrating = false;
  qiblaState.calibrationCollector = [];

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
        renderQiblaState('جارٍ تفعيل مستشعر الجهاز الأصلي لرفع الدقة...');
      } else {
        renderQiblaState('هذا الجهاز لا يدعم مستشعر البوصلة أو لا يمكن الوصول إليه.');
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
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      });
    }, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 180000
    });
  });
}

async function openQiblaCompass() {
  qiblaState.calibrationOffset = loadQiblaCalibration();
  qiblaState.heading = null;
  qiblaState.qiblaBearing = null;
  qiblaState.location = null;
  qiblaState.locationAccuracy = null;
  qiblaState.headingSamples = [];
  qiblaState.headingQuality = 'ضعيفة';
  openModal('modal-qibla');
  renderQiblaState('جارٍ تحديد الموقع والاتجاه...');

  try {
    const location = await requestQiblaLocation();
    qiblaState.location = { lat: location.lat, lng: location.lng };
    qiblaState.locationAccuracy = location.accuracy;
    qiblaState.qiblaBearing = calculateQiblaBearing(location.lat, location.lng);

    if (location.accuracy > 250) {
      renderQiblaState('تم تحديد موقعك بدقة منخفضة نسبيًا. انتظر قليلًا أو اقترب من مكان مفتوح.');
    } else {
      renderQiblaState('تم تحديد موقعك. حرّك الهاتف ببطء حتى تستقر البوصلة.');
    }

    await requestQiblaOrientation();
  } catch (error) {
    console.error(error);
    window.HalaqatnaNativeBridge?.requestLocationPermission?.();
    renderQiblaState('تعذر الوصول إلى الموقع. يرجى تفعيل الموقع والسماح للتطبيق بالوصول إليه.');
  }
}

function recalibrateQiblaCompass() {
  if (qiblaState.heading == null || qiblaState.headingSamples.length < 2) {
    qiblaState.calibrationOffset = 0;
    saveQiblaCalibration(0);
    renderQiblaState('تمت إعادة الضبط. حرّك الهاتف ببطء ثم أعد المحاولة للمعايرة الدقيقة.');
    return;
  }

  qiblaState.calibrating = true;
  qiblaState.calibrationCollector = [...qiblaState.headingSamples];
  renderQiblaState('جارٍ جمع قراءات المعايرة... أبق الهاتف ثابتًا لثانية واحدة.');

  setTimeout(() => {
    const calibrationHeading = averageCircularDegrees(qiblaState.calibrationCollector);
    qiblaState.calibrating = false;
    qiblaState.calibrationCollector = [];

    if (calibrationHeading == null) {
      renderQiblaState('تعذرت المعايرة. حاول مرة أخرى مع ثبات أكبر للهاتف.');
      return;
    }

    qiblaState.calibrationOffset = calibrationHeading;
    saveQiblaCalibration(calibrationHeading);
    renderQiblaState('تمت المعايرة بنجاح. إذا لاحظت انحرافًا، أعد المحاولة مع حركة أهدأ.');
  }, 1100);
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
