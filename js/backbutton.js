/**
 * backbutton.js
 * التحكم في زر الرجوع (Android Back Button)
 * - إغلاق المودالات المفتوحة
 * - إغلاق الملف الشخصي
 * - رسالة "اضغط مرة أخرى للخروج"
 */

let lastBackPressTime = 0;

function initBackButton() {
  // أضف حالة أولية في السجل
  history.pushState({ page: 'main' }, '', location.href);

  // معالج حدث الرجوع
  window.addEventListener('popstate', handleBackButton);
}

function handleBackButton(event) {
  // 1. هل يوجد مودال مفتوح؟ أغلقه
  const openModal = document.querySelector('.modal-overlay.active');
  if (openModal) {
    closeModal(openModal.id);
    // أعد إضافة الحالة حتى لا يخرج المستخدم
    history.pushState({ page: 'modal' }, '', location.href);
    return;
  }

  // 2. هل قائمة السياق مفتوحة؟
  const ctxMenu = document.getElementById('context-menu');
  if (ctxMenu && ctxMenu.style.display === 'block') {
    ctxMenu.style.display = 'none';
    history.pushState({ page: 'context' }, '', location.href);
    return;
  }

  // 3. نحن في الصفحة الرئيسية — رسالة "اضغط مرة أخرى للخروج"
  const now = Date.now();
  if (now - lastBackPressTime < 2000) {
    // ضغط مرتين خلال 2 ثانية — السماح بالخروج
    return; // لا نضيف pushState، ندع المتصفح يتعامل
  }

  lastBackPressTime = now;
  showToast('اضغط مرة أخرى للخروج من التطبيق', 'warning');
  history.pushState({ page: 'exit-guard' }, '', location.href);
}

// ═══════════════════════════════════
// ■ إضافة pushState عند فتح المودالات
// ═══════════════════════════════════

// نغلف openModal الأصلية لإضافة pushState
const _originalOpenModal = typeof openModal === 'function' ? openModal : null;

function openModalWithHistory(modalId) {
  if (_originalOpenModal) {
    _originalOpenModal(modalId);
  }
  history.pushState({ page: 'modal', modalId: modalId }, '', location.href);
}

// ═══════════════════════════════════
// ■ إضافة pushState عند فتح الملف الشخصي
// ═══════════════════════════════════

// نغلف openStudentProfile الأصلية
const _originalOpenProfile = typeof openStudentProfile === 'function' ? openStudentProfile : null;

// override سيتم في app.js بعد تحميل كل الملفات
