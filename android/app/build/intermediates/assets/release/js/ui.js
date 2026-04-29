/**
 * ui.js
 * دوال واجهة المستخدم العامة
 * - إظهار وإخفاء العناصر
 * - Modals
 * - Toast notifications
 * - بناء عناصر HTML مشتركة
 */

// ═══════════════════════════════════
// ■ Toast Notifications
// ═══════════════════════════════════

/**
 * عرض رسالة Toast
 * @param {string} message - نص الرسالة
 * @param {string} type - نوع الرسالة: 'success' | 'error' | 'warning'
 */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  // اختيار الأيقونة حسب النوع
  let icon = '';
  if (type === 'success') {
    icon = '<i class="fas fa-check-circle"></i>';
  } else if (type === 'error') {
    icon = '<i class="fas fa-times-circle"></i>';
  } else if (type === 'warning') {
    icon = '<i class="fas fa-exclamation-triangle"></i>';
  }

  toast.innerHTML = `${icon}<span>${message}</span>`;
  container.appendChild(toast);

  // تفعيل الأنيميشن
  requestAnimationFrame(() => {
    toast.classList.add('toast-show');
  });

  // إزالة التوست بعد المدة المحددة
  setTimeout(() => {
    toast.classList.remove('toast-show');
    toast.classList.add('toast-hide');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, TOAST_DURATION);
}

// ═══════════════════════════════════
// ■ Modal Functions
// ═══════════════════════════════════

/**
 * فتح نافذة Modal
 * @param {string} modalId - معرف عنصر الـ Modal
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('modal-active');
    document.body.style.overflow = 'hidden';
  }
}

/**
 * إغلاق نافذة Modal
 * @param {string} modalId - معرف عنصر الـ Modal
 */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('modal-active');
    document.body.style.overflow = '';
  }
}

/**
 * إغلاق Modal عند الضغط على الخلفية
 * @param {Event} e - حدث الضغط
 * @param {string} modalId - معرف الـ Modal
 */
function closeModalOnBackdrop(e, modalId) {
  if (e.target.id === modalId) {
    closeModal(modalId);
  }
}

// ═══════════════════════════════════
// ■ Confirm Dialog
// ═══════════════════════════════════

/**
 * عرض رسالة تأكيد مخصصة (modal مخصص بدلاً من confirm المتصفح)
 * @param {string} message - نص رسالة التأكيد
 * @param {string} title - عنوان التأكيد (اختياري)
 * @returns {Promise<boolean>} true إذا وافق المستخدم
 */
function showConfirm(message, title = 'تأكيد العملية') {
  return new Promise((resolve) => {
    const modal = document.getElementById('modal-custom-confirm');
    const titleEl = document.getElementById('confirm-title');
    const msgEl = document.getElementById('confirm-message');
    const yesBtn = document.getElementById('btn-confirm-yes');
    const noBtn = document.getElementById('btn-confirm-no');

    if (!modal) {
      // fallback لو الـ modal غير موجود
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

    function onYes() { cleanup(); resolve(true); }
    function onNo() { cleanup(); resolve(false); }

    yesBtn.addEventListener('click', onYes);
    noBtn.addEventListener('click', onNo);
  });
}

// ═══════════════════════════════════
// ■ بناء عناصر HTML مشتركة
// ═══════════════════════════════════

/**
 * بناء قائمة منسدلة للسور
 * @param {string} name - اسم عنصر الـ select
 * @param {number} selectedNumber - رقم السورة المختارة
 * @param {string} className - كلاس CSS إضافي
 * @returns {string} HTML الـ select
 */
function buildSurahSelect(name, selectedNumber, className = '') {
  let html = `<select name="${name}" class="surah-select ${className}">`;
  html += `<option value="">-- اختر سورة --</option>`;
  SURAHS.forEach(surah => {
    const selected = surah.number === selectedNumber ? 'selected' : '';
    html += `<option value="${surah.number}" ${selected}>${surah.number}. ${surah.name}</option>`;
  });
  html += `</select>`;
  return html;
}

/**
 * بناء قائمة منسدلة للتقييم
 * @param {string} name - اسم عنصر الـ select
 * @param {number} selectedRating - التقييم المختار
 * @param {string} className - كلاس CSS إضافي
 * @returns {string} HTML الـ select
 */
function buildRatingSelect(name, selectedRating, className = '') {
  let html = `<select name="${name}" class="rating-select ${className}">`;
  RATINGS.forEach(r => {
    const selected = r === selectedRating ? 'selected' : '';
    html += `<option value="${r}" ${selected}>${r}</option>`;
  });
  html += `</select>`;
  return html;
}

/**
 * بناء شريط تقدم
 * @param {number} value - القيمة الحالية
 * @param {number} max - القيمة القصوى
 * @param {string} className - كلاس CSS إضافي
 * @returns {string} HTML شريط التقدم
 */
function buildProgressBar(value, max, className = '') {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
  return `
    <div class="progress-bar ${className}">
      <div class="progress-fill" style="width: ${percentage}%"></div>
    </div>
  `;
}

// ═══════════════════════════════════
// ■ التاريخ الهجري
// ═══════════════════════════════════

/**
 * عرض التاريخ الهجري والميلادي
 * @returns {string} نص التاريخ
 */
function getFormattedDate() {
  const now = new Date();
  
  // التاريخ الميلادي
  const gregorianOptions = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  const gregorian = now.toLocaleDateString('ar-SA', gregorianOptions);
  
  // التاريخ الهجري
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
  } catch (e) {
    // fallback if browser doesn't support islamic calendar
    hijri = now.toLocaleDateString('ar-SA', gregorianOptions);
  }
  
  return { gregorian, hijri };
}

/**
 * تحديث عنصر التاريخ في الصفحة
 */
function updateDateDisplay() {
  const dateEl = document.getElementById('current-date');
  if (dateEl) {
    const { gregorian, hijri } = getFormattedDate();
    dateEl.innerHTML = `<span class="hijri-date">${hijri}</span><span class="gregorian-date">${gregorian}</span>`;
  }
}
