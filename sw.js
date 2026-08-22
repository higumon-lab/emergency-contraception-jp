/* サービスワーカー
   ねらいは2つです。
   1. ホーム画面に追加したとき、アプリとして扱われるようにする
      （Android では、これがないと「アプリをインストール」が出ません）
   2. 電波が弱い場所・圏外でもページを開けるようにする

   注意: 中身を更新したら CACHE の数字を必ず上げてください。
   上げないと、古い内容が端末に残り続けます。 */

var CACHE = "72h-v1";
var SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/icon-180.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);

  /* 別のサイト（フォントや厚労省へのリンク）には手を出しません */
  if (url.origin !== self.location.origin) return;

  /* ページ本体は、まず通信を試して最新を取りに行きます。
     つながらないときだけ、端末に保存したものを出します。 */
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put("./index.html", copy); });
        return res;
      }).catch(function () {
        return caches.match("./index.html");
      })
    );
    return;
  }

  /* アイコンなどは変わらないので、保存したものを優先します */
  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
