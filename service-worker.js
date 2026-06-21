// ============================================================
// Dr収入管理 - Service Worker v20260621-2
// HTMLは常にネットワーク取得、静的リソースのみキャッシュ
// ============================================================

var CACHE_NAME = 'dr-income-cache-v20260621-2';

var STATIC_FILES = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.9.0/dist/tabler-icons.min.css',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.9.0/dist/fonts/tabler-icons.woff2'
];

// ===== インストール: 静的ファイルのみキャッシュ (HTMLは除外) =====
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return Promise.all(
        STATIC_FILES.map(function(url) {
          return cache.add(url).catch(function() {});
        })
      );
    }).then(function() {
      // 即座にアクティブ化（待機しない）
      return self.skipWaiting();
    })
  );
});

// ===== アクティベート: 旧キャッシュを全削除 =====
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key !== CACHE_NAME;
        }).map(function(key) {
          console.log('[SW] 旧キャッシュ削除:', key);
          return caches.delete(key);
        })
      );
    }).then(function() {
      // 既存のクライアントも即座に制御下に置く
      return self.clients.claim();
    })
  );
});

// ===== フェッチ =====
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  var url = event.request.url;

  // HTML は絶対にキャッシュしない・常にネットワーク優先
  if (
    url.indexOf('.html') !== -1 ||
    url.indexOf('?v=') !== -1 ||
    event.request.headers.get('accept').indexOf('text/html') !== -1
  ) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(function() {
        // オフライン時のフォールバック（キャッシュなし）
        return new Response('<h1>オフラインです</h1>', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      })
    );
    return;
  }

  // 静的リソース (CSS/フォント/アイコン): Cache First
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function() {
        return new Response('', { status: 503 });
      });
    })
  );
});
