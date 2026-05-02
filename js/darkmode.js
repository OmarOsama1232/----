/**
 * darkmode.js
 * إدارة الوضع الليلي (Dark Mode)
 * يحفظ تفضيل المستخدم في LocalStorage
 * يدعم كلاً من: الإعداد اليدوي + تفضيل النظام
 */

(function() {
  var STORAGE_KEY = 'halqatna_theme';
  var ICON_MOON   = 'fas fa-moon';
  var ICON_SUN    = 'fas fa-sun';

  /**
   * تطبيق الثيم على document.documentElement
   */
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    updateToggleIcon(theme);
  }

  /**
   * تحديث أيقونة الزر
   */
  function updateToggleIcon(theme) {
    var btn = document.getElementById('btn-dark-mode');
    if (!btn) return;
    var icon = btn.querySelector('i');
    if (!icon) return;
    icon.className = theme === 'dark' ? ICON_SUN : ICON_MOON;
    btn.setAttribute('title', theme === 'dark' ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي');
    btn.setAttribute('aria-label', btn.getAttribute('title'));
  }

  /**
   * قراءة الثيم المحفوظ أو تفضيل النظام
   */
  function getSavedTheme() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (e) {}

    // الرجوع لتفضيل النظام
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  /**
   * تبديل الوضع
   */
  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    var next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (e) {}
    // تأثير نبضة صغيرة
    var btn = document.getElementById('btn-dark-mode');
    if (btn) {
      btn.style.transform = 'scale(1.25) rotate(30deg)';
      setTimeout(function() { btn.style.transform = ''; }, 200);
    }
  }

  /**
   * تهيئة زر التبديل
   */
  function initDarkMode() {
    var theme = getSavedTheme();
    applyTheme(theme);

    var btn = document.getElementById('btn-dark-mode');
    if (btn) {
      btn.addEventListener('click', toggleTheme);
    }

    // مراقبة تغيير تفضيل النظام
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addListener(function(e) {
        // فقط إذا لم يكن المستخدم قد اختار يدوياً
        try {
          if (!localStorage.getItem(STORAGE_KEY)) {
            applyTheme(e.matches ? 'dark' : 'light');
          }
        } catch (err) {
          applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }

  // تطبيق فوري قبل تحميل الصفحة لمنع وميض الألوان
  (function() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else if (!saved && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    } catch (e) {}
  })();

  // تهيئة بعد تحميل الـ DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDarkMode);
  } else {
    initDarkMode();
  }
})();
