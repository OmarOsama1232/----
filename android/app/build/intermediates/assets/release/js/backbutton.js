/**
 * backbutton.js
 * FIX 1:
 * مدير تنقل موحد لزر الرجوع في Android والمتصفح/PWA.
 */

const HALAQATNA_BACK_GUARD_MS = 2000;

function buildNavigationManager() {
  const homeSection = 'dashboard-cards';
  let sentinelReady = false;

  return {
    currentSection: homeSection,
    sectionHistory: [homeSection],
    lastBackPressTime: 0,

    init() {
      this.currentSection = homeSection;
      this.sectionHistory = [homeSection];
      this.initializeSentinel();
      window.addEventListener('popstate', () => {
        const outcome = this.handleSystemBack('browser');
        if (outcome !== 'exit') {
          this.rearmSentinel();
        }
      });
      this.syncNavButtons(homeSection);
    },

    initializeSentinel() {
      if (!window.history || !window.history.pushState) return;
      if (sentinelReady) return;
      history.pushState({ halaqatna: 'guard' }, '', location.href);
      sentinelReady = true;
    },

    rearmSentinel() {
      if (!window.history || !window.history.pushState) return;
      history.pushState({ halaqatna: 'guard' }, '', location.href);
      sentinelReady = true;
    },

    syncNavButtons(sectionId) {
      document.querySelectorAll('.bottom-nav-item[data-section]').forEach((item) => {
        item.classList.toggle('active', item.getAttribute('data-section') === sectionId);
      });
    },

    registerSection(sectionId, options = {}) {
      if (!sectionId) return;

      if (this.currentSection !== sectionId) {
        const previousSection = this.currentSection;
        this.currentSection = sectionId;

        if (options.reset) {
          this.sectionHistory = [homeSection];
        }

        if (options.skipHistory !== true) {
          const lastSection = this.sectionHistory[this.sectionHistory.length - 1];
          if (lastSection !== sectionId) {
            this.sectionHistory.push(sectionId);
          }
        }

        if (options.behavior !== 'none') {
          const target = document.getElementById(sectionId);
          if (target) {
            target.scrollIntoView({
              behavior: options.behavior || 'smooth',
              block: 'start'
            });
          }
        }

        this.syncNavButtons(sectionId);
        if (previousSection !== sectionId) {
          this.initializeSentinel();
        }
      } else {
        this.syncNavButtons(sectionId);
      }
    },

    goHome() {
      this.currentSection = homeSection;
      this.sectionHistory = [homeSection];
      this.syncNavButtons(homeSection);
      const target = document.getElementById(homeSection);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },

    getOpenModals() {
      return Array.from(document.querySelectorAll('.modal-overlay.modal-active'));
    },

    getTopModalId() {
      const priority = [
        'modal-qibla',
        'modal-custom-confirm',
        'modal-chart',
        'modal-student-profile',
        'modal-edit-student',
        'modal-add-student',
        'modal-prayer-times'
      ];

      const openIds = this.getOpenModals().map((modal) => modal.id);
      for (const modalId of priority) {
        if (openIds.includes(modalId)) return modalId;
      }

      return openIds.length ? openIds[openIds.length - 1] : null;
    },

    closeTopLayer() {
      const contextMenu = document.getElementById('context-menu');
      if (contextMenu && contextMenu.style.display === 'block') {
        contextMenu.style.display = 'none';
        return true;
      }

      const topModalId = this.getTopModalId();
      if (topModalId) {
        closeModal(topModalId);
        return true;
      }

      return false;
    },

    clearSearchIfNeeded() {
      const searchInput = document.getElementById('search-input');
      const filterSelect = document.getElementById('filter-select');
      const hasSearch = !!searchInput?.value?.trim();
      const nonDefaultFilter = filterSelect && filterSelect.value !== 'all';

      if (hasSearch || nonDefaultFilter) {
        if (searchInput) searchInput.value = '';
        if (filterSelect) filterSelect.value = 'all';
        if (typeof filterStudents === 'function') filterStudents();
        this.registerSection('main-table-wrapper', { skipHistory: true, behavior: 'smooth' });
        showToast('تمت العودة إلى القائمة الرئيسية للطلاب', 'warning');
        return true;
      }

      return false;
    },

    restorePreviousSection() {
      if (this.sectionHistory.length <= 1) return false;

      this.sectionHistory.pop();
      const previousSection = this.sectionHistory[this.sectionHistory.length - 1] || homeSection;
      this.currentSection = previousSection;
      this.syncNavButtons(previousSection);

      const target = document.getElementById(previousSection);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      return previousSection !== homeSection || this.sectionHistory.length > 0;
    },

    onModalOpened() {
      this.initializeSentinel();
    },

    onModalClosed(modalId) {
      if (modalId === 'modal-qibla' && typeof stopQiblaCompass === 'function') {
        stopQiblaCompass();
      }
    },

    handleSystemBack(source = 'native') {
      if (this.closeTopLayer()) {
        return 'handled';
      }

      if (this.restorePreviousSection()) {
        return 'handled';
      }

      if (this.clearSearchIfNeeded()) {
        return 'handled';
      }

      const now = Date.now();
      if (now - this.lastBackPressTime < HALAQATNA_BACK_GUARD_MS) {
        return 'exit';
      }

      this.lastBackPressTime = now;
      showToast('اضغط مرة أخرى للخروج', 'warning');

      if (source === 'native') {
        this.initializeSentinel();
      }

      return 'handled';
    }
  };
}

window.HalaqatnaNavigation = buildNavigationManager();

function initBackButton() {
  window.HalaqatnaNavigation.init();
}

function handleAndroidBackRequest() {
  return window.HalaqatnaNavigation.handleSystemBack('native');
}
