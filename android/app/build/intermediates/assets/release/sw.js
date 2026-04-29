/**
 * Service Worker لتطبيق حلقتنا
 * - تخزين مؤقت للملفات الأساسية
 * - دعم العمل بدون إنترنت
 */
const CACHE_NAME = 'halaqatna-v1';
const ASSETS = [
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
  '/js/native.js',
  '/js/qibla.js',
  '/js/backbutton.js',
  '/js/app.js',
  '/icon-512.png',
  '/manifest.json'
];

// تثبيت الـ Service Worker وتخزين الملفات
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('SW: بعض الملفات لم يتم تخزينها:', err);
      });
    })
  );
  self.skipWaiting();
});

// تنشيط الـ Service Worker وحذف الكاش القديم
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// استراتيجية: الشبكة أولاً ثم الكاش
self.addEventListener('fetch', event => {
  // تجاهل الطلبات غير GET والطلبات الخارجية
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // للملفات الخارجية (CDN): حاول الشبكة أولاً ثم الكاش
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // للملفات المحلية: الشبكة أولاً ثم الكاش
  event.respondWith(
    fetch(event.request).then(response => {
      const clone = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      return response;
    }).catch(() => {
      return caches.match(event.request).then(cached => {
        return cached || new Response('أنت تعمل بدون اتصال', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      });
    })
  );
});
