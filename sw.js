const CACHE_NAME = 'interactive-stories-v1.2';
const STATIC_CACHE_NAME = 'static-v1.2';
const DYNAMIC_CACHE_NAME = 'dynamic-v1.2';

// فایل‌هایی که باید حتماً کش شوند
const STATIC_FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './data/stories.js',
  './manifest.webmanifest',
  // تصاویر داستان‌ها
  './assets/images/s1.jpg',
  './assets/images/s2.jpg',
  './assets/images/s3.jpg',
  './assets/images/s4.jpg',
  './assets/images/s5.jpg',
  './assets/images/s6.jpg',
  './assets/images/s7.jpg',
  './assets/images/s8.jpg',
  './assets/images/s9.jpg',
  './assets/images/s10.jpg',
  './assets/images/s11.jpg',
  './assets/images/s12.jpg',
  './assets/images/s13.jpg',
  './assets/images/s14.jpg',
  './assets/images/s15.jpg',
  './assets/images/s16.jpg',
  './assets/images/s17.jpg',
  './assets/images/s18.jpg',
  './assets/images/s19.jpg',
  './assets/images/s20.jpg',
  './assets/images/placeholder.svg',
  // آیکون‌ها
  './assets/icons/icon-72.png',
  './assets/icons/icon-96.png',
  './assets/icons/icon-128.png',
  './assets/icons/icon-144.png',
  './assets/icons/icon-152.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-384.png',
  './assets/icons/icon-512.png',
  './assets/icons/maskable-icon-192.png',
  './assets/icons/maskable-icon-512.png',
  // فونت‌های گوگل (آفلاین)
  'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700&family=Readex+Pro:wght@400;500;600&family=Cairo+Play:wght@400;500;600;700&display=swap'
];

// نصب Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pre-caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .catch((error) => {
        console.error('[SW] Pre-caching failed:', error);
        // ادامه نصب حتی اگر بعضی فایل‌ها کش نشوند
        return Promise.resolve();
      })
  );
  self.skipWaiting();
});

// فعال‌سازی Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// رهگیری درخواست‌ها (آفلاین کامل)
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  
  // چک کردن اگر درخواست برای فایل‌های استاتیک است
  if (STATIC_FILES.some(file => event.request.url.includes(file.replace('./', '')))) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request);
        })
        .catch(() => {
          // اگر آفلاین است و فایل در کش نیست
          if (event.request.url.includes('.html')) {
            return caches.match('./index.html');
          }
        })
    );
    return;
  }

  // برای سایر درخواست‌ها (فونت‌ها، تصاویر خارجی)
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        
        return fetch(event.request)
          .then((fetchResponse) => {
            // کش کردن پاسخ‌های موفق
            if (fetchResponse.status === 200) {
              const responseClone = fetchResponse.clone();
              caches.open(DYNAMIC_CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                });
            }
            return fetchResponse;
          })
          .catch(() => {
            // اگر آفلاین است، صفحه آفلاین نمایش داده شود
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
            // برای تصاویر، تصویر پیش‌فرض نمایش داده شود
            if (event.request.destination === 'image') {
              return caches.match('./assets/images/placeholder.svg');
            }
          });
      })
  );
});

// مدیریت پیام‌ها از اپلیکیشن اصلی
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// نمایش نوتیفیکیشن نصب
self.addEventListener('beforeinstallprompt', (event) => {
  console.log('[SW] App can be installed');
  event.preventDefault();
  return event;
});