/**
 * native.js
 * FIX 2 + FIX 3:
 * جسر موحد بين واجهة الويب وطبقة Android الأصلية.
 */

const HALAQATNA_PERMISSION_NOTIFICATIONS = 'notifications';
const HALAQATNA_PERMISSION_LOCATION = 'location';

window.HalaqatnaNativeBridge = {
  isAndroidApp() {
    try {
      return !!window.HalaqatnaBridge && !!window.HalaqatnaBridge.isAndroidApp && window.HalaqatnaBridge.isAndroidApp();
    } catch (error) {
      return false;
    }
  },

  showNativeToast(message) {
    try {
      if (this.isAndroidApp() && window.HalaqatnaBridge.showNativeToast) {
        window.HalaqatnaBridge.showNativeToast(String(message || ''));
      }
    } catch (error) {
      console.warn('Native toast failed:', error);
    }
  },

  requestNotificationPermission() {
    try {
      if (this.isAndroidApp() && window.HalaqatnaBridge.requestNotificationPermission) {
        window.HalaqatnaBridge.requestNotificationPermission();
        return true;
      }
    } catch (error) {
      console.warn('Notification permission request failed:', error);
    }
    return false;
  },

  requestLocationPermission() {
    try {
      if (this.isAndroidApp() && window.HalaqatnaBridge.requestLocationPermission) {
        window.HalaqatnaBridge.requestLocationPermission();
        return true;
      }
    } catch (error) {
      console.warn('Location permission request failed:', error);
    }
    return false;
  },

  schedulePrayerNotifications(schedule) {
    try {
      if (this.isAndroidApp() && window.HalaqatnaBridge.schedulePrayerNotifications) {
        window.HalaqatnaBridge.schedulePrayerNotifications(JSON.stringify(schedule));
        return true;
      }
    } catch (error) {
      console.warn('Prayer scheduling failed:', error);
    }
    return false;
  },

  cancelPrayerNotifications() {
    try {
      if (this.isAndroidApp() && window.HalaqatnaBridge.cancelPrayerNotifications) {
        window.HalaqatnaBridge.cancelPrayerNotifications();
        return true;
      }
    } catch (error) {
      console.warn('Prayer cancellation failed:', error);
    }
    return false;
  },

  getPrayerNotificationStatus() {
    try {
      if (this.isAndroidApp() && window.HalaqatnaBridge.getPrayerNotificationStatus) {
        const raw = window.HalaqatnaBridge.getPrayerNotificationStatus();
        return raw ? JSON.parse(raw) : null;
      }
    } catch (error) {
      console.warn('Reading prayer notification status failed:', error);
    }
    return null;
  },

  checkExactAlarmPermission() {
    try {
      if (this.isAndroidApp() && window.HalaqatnaBridge.checkExactAlarmPermission) {
        window.HalaqatnaBridge.checkExactAlarmPermission();
        return true;
      }
    } catch (error) {
      console.warn('Exact alarm permission check failed:', error);
    }
    return false;
  },

  openExactAlarmSettings() {
    try {
      if (this.isAndroidApp() && window.HalaqatnaBridge.openExactAlarmSettings) {
        window.HalaqatnaBridge.openExactAlarmSettings();
        return true;
      }
    } catch (error) {
      console.warn('Opening exact alarm settings failed:', error);
    }
    return false;
  },

  startCompass() {
    try {
      if (this.isAndroidApp() && window.HalaqatnaBridge.startCompass) {
        window.HalaqatnaBridge.startCompass();
        return true;
      }
    } catch (error) {
      console.warn('Compass start failed:', error);
    }
    return false;
  },

  stopCompass() {
    try {
      if (this.isAndroidApp() && window.HalaqatnaBridge.stopCompass) {
        window.HalaqatnaBridge.stopCompass();
        return true;
      }
    } catch (error) {
      console.warn('Compass stop failed:', error);
    }
    return false;
  }
};

window.HalaqatnaNative = {
  onPermissionResult(type, status) {
    document.dispatchEvent(new CustomEvent('halaqatna:permission-result', {
      detail: { type, status }
    }));
  },

  onHeadingUpdate(degrees) {
    const parsed = Number(degrees);
    document.dispatchEvent(new CustomEvent('halaqatna:heading-update', {
      detail: { degrees: Number.isFinite(parsed) ? parsed : null }
    }));
  },

  onExactAlarmStatus(granted) {
    document.dispatchEvent(new CustomEvent('halaqatna:exact-alarm-status', {
      detail: { granted: !!granted }
    }));
  }
};
