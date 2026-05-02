/**
 * Service Worker لتطبيق حلقتنا
 * - تخزين مؤقت للملفات الأساسية
 * - دعم العمل بدون إنترنت
 * - دعم إشعارات الصلاة في الخلفية
 */
var CACHE_NAME = 'halaqatna-v3';
var ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/responsive.css',
  '/js/constants.js',
  '/js/db.js',
  '/js/ui.js',
  '/js/students.js',
  '/js/attendance.js',
  '/js/reports.js',
  '/js/charts.js',
  '/js/profile.js',
  '/js/prayer.js',
  '/js/notifications.js',
  '/js/app.js',
  '/icon-512.png',
  '/manifest.json'
];

// ── تثبيت الـ SW ──
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS).catch(function(err) {
        console.warn('SW: بعض الملفات لم يتم تخزينها:', err);
      });
    })
  );
  self.skipWaiting();
});

// ── تنشيط الـ SW ──
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// ── استراتيجية: الشبكة أولاً ثم الكاش ──
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  var url = new URL(event.request.url);

  // للملفات الخارجية (CDN)
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(event.request).then(function(response) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
        return response;
      }).catch(function() { return caches.match(event.request); })
    );
    return;
  }

  // للملفات المحلية
  event.respondWith(
    fetch(event.request).then(function(response) {
      var clone = response.clone();
      caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
      return response;
    }).catch(function() {
      return caches.match(event.request).then(function(cached) {
        return cached || new Response('أنت تعمل بدون اتصال', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      });
    })
  );
});

// ── استقبال رسائل من الصفحة الرئيسية ──
self.addEventListener('message', function(event) {
  var data = event.data;
  if (!data || !data.type) return;

  if (data.type === 'SHOW_PRAYER_NOTIF') {
    var title = data.title || 'حلقتنا';
    var body = data.body || 'حان وقت الصلاة';
    self.registration.showNotification(title, {
      body: body,
      icon: '/icon-512.png',
      badge: '/icon-512.png',
      dir: 'rtl',
      lang: 'ar',
      tag: data.tag || 'prayer',
      renotify: true,
      vibrate: [200, 100, 200]
    });
  }
});

// ── الضغط على الإشعار → فتح التطبيق ──
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
