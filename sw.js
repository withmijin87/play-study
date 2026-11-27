/* 놀이 공부방 service worker
   - 화면(HTML): 네트워크 먼저 → 끊기면 저장본
   - css/js(?v=): 저장본 먼저 (버전이 바뀌면 새로 받음)
   - 그림/소리: 한 번 받으면 저장해 두고 다시 씀 (오프라인 가능)
   - Firebase 로그인·DB 요청은 건드리지 않음 */
var V = '11';
var CORE = 'ps-core-v' + V, MEDIA = 'ps-media-v1', LIB = 'ps-lib-v1';
var CORE_FILES = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png',
  'css/style.css?v=' + V,
  'js/config.js?v=' + V, 'js/data-words.js?v=' + V, 'js/data-hanja.js?v=' + V, 'js/game.js?v=' + V,
  'js/review.js?v=' + V, 'js/skin.js?v=' + V, 'js/login.js?v=' + V, 'js/event.js?v=' + V];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CORE).then(function (c) {
    return Promise.all(CORE_FILES.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('ps-core-') === 0 && k !== CORE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function rangeResponse(req, res) {
  var m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
  if (!m) return res;
  return res.arrayBuffer().then(function (buf) {
    var size = buf.byteLength, start = m[1] ? +m[1] : 0, end = m[2] ? Math.min(+m[2], size - 1) : size - 1;
    if (start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
    return new Response(buf.slice(start, end + 1), { status: 206, headers: {
      'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': 'bytes ' + start + '-' + end + '/' + size,
      'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
  });
}

function cacheFirst(cacheName, req, key) {
  key = key || req;
  return caches.open(cacheName).then(function (c) {
    return c.match(key).then(function (hit) {
      if (hit) return hit;
      return fetch(key).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) c.put(key, res.clone());
        return res;
      });
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  /* 화면: 네트워크 먼저 */
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone(); caches.open(CORE).then(function (c) { c.put('index.html', copy); });
      return res;
    }).catch(function () {
      return caches.match('index.html', { ignoreSearch: true }).then(function (r) { return r || caches.match('./'); });
    }));
    return;
  }

  if (url.origin === location.origin) {
    /* 그림·소리: 저장본 먼저 (소리는 구간 요청 지원) */
    if (url.pathname.indexOf('/assets/') >= 0) {
      var plain = new Request(url.href);
      var p = cacheFirst(MEDIA, req, plain);
      e.respondWith(req.headers.get('range') ? p.then(function (res) { return res.status === 200 ? rangeResponse(req, res) : res; }) : p);
      return;
    }
    /* css/js/아이콘: 저장본 먼저 (?v= 로 버전 구분) */
    e.respondWith(caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        if (res.ok) { var copy = res.clone(); caches.open(CORE).then(function (c) { c.put(req, copy); }); }
        return res;
      });
    }));
    return;
  }

  /* Firebase SDK(버전 고정)·글꼴: 저장본 먼저 */
  if (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(cacheFirst(LIB, req));
  }
});
