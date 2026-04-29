/**
 * ui.js
 * دوال واجهة المستخدم العامة
 * - Toast notifications
 * - Modals
 * - Confirm dialog
 * - Shared UI builders
 */

function syncBodyModalState() {
  const hasOpenModal = document.querySelector('.modal-overlay.modal-active');
  document.body.style.overflow = hasOpenModal ? 'hidden' : '';
}

// ═══════════════════════════════════════════════════════════
// ■ Toast Notifications
// ═══════════════════════════════════════════════════════════

/**
 * عرض رسالة Toast
 * @param {string} message
 * @param {'success'|'error'|'warning'} type
 */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = '';
  if (type === 'success') icon = '<i class="fas fa-check-circle"></i>';
  if (type === 'error') icon = '<i class="fas fa-times-circle"></i>';
  if (type === 'warning') icon = '<i class="fas fa-exclamation-triangle"></i>';

  toast.innerHTML = `${icon}<span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('toast-show');
  });

  setTimeout(() => {
    toast.classList.remove('toast-show');
    toast.classList.add('toast-hide');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, TOAST_DURATION);

  if (window.HalaqatnaNativeBridge?.isAndroidApp?.() && type !== 'success') {
    window.HalaqatnaNativeBridge.showNativeToast(message);
  }
}

// ═══════════════════════════════════════════════════════════
// ■ Modal Functions
// ═══════════════════════════════════════════════════════════

/**
 * فتح نافذة Modal
 * @param {string} modalId
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  modal.classList.add('modal-active');
  syncBodyModalState();

  if (window.HalaqatnaNavigation) {
    window.HalaqatnaNavigation.onModalOpened(modalId);
  }
}

/**
 * إغلاق نافذة Modal
 * @param {string} modalId
 */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  modal.classList.remove('modal-active');
  syncBodyModalState();

  if (window.HalaqatnaNavigation) {
    window.HalaqatnaNavigation.onModalClosed(modalId);
  }
}

/**
 * إغلاق Modal عند الضغط على الخلفية
 * @param {Event} e
 * @param {string} modalId
 */
function closeModalOnBackdrop(e, modalId) {
  if (e.target.id === modalId) {
    closeModal(modalId);
  }
}

// ═══════════════════════════════════════════════════════════
// ■ Confirm Dialog
// ═══════════════════════════════════════════════════════════

/**
 * عرض رسالة تأكيد مخصصة
 * @param {string} message
 * @param {string} title
 * @returns {Promise<boolean>}
 */
function showConfirm(message, title = 'تأكيد العملية') {
  return new Promise((resolve) => {
    const modal = document.getElementById('modal-custom-confirm');
    const titleEl = document.getElementById('confirm-title');
    const msgEl = document.getElementById('confirm-message');
    const yesBtn = document.getElementById('btn-confirm-yes');
    const noBtn = document.getElementById('btn-confirm-no');

    if (!modal || !titleEl || !msgEl || !yesBtn || !noBtn) {
      resolve(confirm(message));
      return;
    }

    titleEl.textContent = title;
    msgEl.textContent = message;
    openModal('modal-custom-confirm');

    function cleanup() {
      yesBtn.removeEventListener('click', onYes);
      noBtn.removeEventListener('click', onNo);
      closeModal('modal-custom-confirm');
    }

    function onYes() {
      cleanup();
      resolve(true);
    }

    function onNo() {
      cleanup();
      resolve(false);
    }

    yesBtn.addEventListener('click', onYes);
    noBtn.addEventListener('click', onNo);
  });
}

// ═══════════════════════════════════════════════════════════
// ■ Shared HTML Builders
// ═══════════════════════════════════════════════════════════

/**
 * بناء قائمة منسدلة للسور
 * @param {string} name
 * @param {number} selectedNumber
 * @param {string} className
 * @returns {string}
 */
function buildSurahSelect(name, selectedNumber, className = '') {
  let html = `<select name="${name}" class="surah-select ${className}">`;
  html += '<option value="">-- اختر سورة --</option>';
  SURAHS.forEach((surah) => {
    const selected = surah.number === selectedNumber ? 'selected' : '';
    html += `<option value="${surah.number}" ${selected}>${surah.number}. ${surah.name}</option>`;
  });
  html += '</select>';
  return html;
}

/**
 * بناء قائمة منسدلة للتقييم
 * @param {string} name
 * @param {number} selectedRating
 * @param {string} className
 * @returns {string}
 */
function buildRatingSelect(name, selectedRating, className = '') {
  let html = `<select name="${name}" class="rating-select ${className}">`;
  RATINGS.forEach((rating) => {
    const selected = rating === selectedRating ? 'selected' : '';
    html += `<option value="${rating}" ${selected}>${rating}</option>`;
  });
  html += '</select>';
  return html;
}

/**
 * بناء شريط تقدم
 * @param {number} value
 * @param {number} max
 * @param {string} className
 * @returns {string}
 */
function buildProgressBar(value, max, className = '') {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
  return `
    <div class="progress-bar ${className}">
      <div class="progress-fill" style="width: ${percentage}%"></div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
// ■ التاريخ الهجري
// ═══════════════════════════════════════════════════════════

function getFormattedDate() {
  const now = new Date();

  const gregorianOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  const gregorian = now.toLocaleDateString('ar-SA', gregorianOptions);

  const hijriOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    calendar: 'islamic-umalqura'
  };

  let hijri = '';
  try {
    hijri = now.toLocaleDateString('ar-SA-u-ca-islamic-umalqura', hijriOptions);
  } catch (error) {
    hijri = now.toLocaleDateString('ar-SA', gregorianOptions);
  }

  return { gregorian, hijri };
}

function updateDateDisplay() {
  const dateEl = document.getElementById('current-date');
  if (!dateEl) return;

  const { gregorian, hijri } = getFormattedDate();
  dateEl.innerHTML = `<span class="hijri-date">${hijri}</span><span class="gregorian-date">${gregorian}</span>`;
}
