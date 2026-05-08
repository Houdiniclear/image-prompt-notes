self.addEventListener('install', (e) => {
  console.log('PWA 已安装');
});

self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request));
});
