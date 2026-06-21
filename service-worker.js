// ============================================================
// Dr収入管理 - Service Worker
// キャッシュ名: dr-income-cache-v1
// ============================================================

var CACHE_NAME = 'dr-income-cache-v1';

var CACHE_FILES = [
  './doctor_dashboard_pwa.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.9.0/dist/tabler-icons.min.css',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.9.0/dist/fonts/tabler-icons.woff2'
];

// ===== インストール: 必須ファイルをキャッシュ =====
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // アイコンはオプション（なくてもアプリは動く）
      var required = [
        './doctor_dashboard_pwa.html',
        './manifest.json'
      ];
      var optional = [
        './icon-192.png',
        './icon-512.png',
        'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.9.0/dist/tabler-icons.min.css',
        'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.9.0/dist/fonts/tabler-icons.woff2'
      ];
      // 必須ファイルをキャッシュ
      return cache.addAll(required).then(function() {
        // オプションは失敗してもOK
        return Promise.all(optional.map(function(url) {
          return cache.add(url).catch(function() {});
        }));
      });
    }).then(function() {
      // 新しいSWをすぐにアクティブ化
      return self.skipWaiting();
    })
  );
});

// ===== アクティベート: 古いキャッシュを削除 =====
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key !== CACHE_NAME;
        }).map(function(key) {
          return caches.delete(key);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ===== フェッチ: Network First → Cache Fallback =====
self.addEventListener('fetch', function(event) {
  // POST等は無視
  if (event.request.method !== 'GET') return;

  var url = event.request.url;

  // ?v= キャッシュバスターは常にネットワーク優先
  if (url.indexOf('?v=') !== -1) {
    event.respondWith(
      fetch(event.request).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          // キャッシュに保存する際はバスターなしURLで
          var cleanUrl = url.split('?v=')[0];
          caches.open(CACHE_NAME).then(function(cache) {
            var cleanRequest = new Request(cleanUrl);
            cache.put(cleanRequest, clone);
          });
        }
        return response;
      }).catch(function() {
        return caches.match(event.request);
      })
    );
    return;
  }

  // HTMLは Network First（更新を優先しつつオフライン対応）
  if (event.request.headers.get('accept') &&
      event.request.headers.get('accept').indexOf('text/html') !== -1) {
    event.respondWith(
      fetch(event.request).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function() {
        return caches.match(event.request);
      })
    );
    return;
  }

  // その他は Cache First（CSS/フォント等）
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
