"""game/ 안의 모든 파일 목록으로 sw.js(서비스 워커) 캐시 목록을 다시 만든다. 배포 전마다 실행.
사용: python tools/build_sw.py [버전태그]
"""
import os, sys, json, datetime
G = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "game")
ver = sys.argv[1] if len(sys.argv) > 1 else datetime.datetime.now().strftime("%Y%m%d%H%M")
files = []
for root, _, fs in os.walk(G):
    for f in fs:
        p = os.path.relpath(os.path.join(root, f), G).replace("\\", "/")
        if f.startswith("_") or f == "sprites.json" or p == "sw.js":
            continue
        files.append(p)
files = sorted(set(files))
sw = r'''// 서비스 워커 — 앱 셸과 에셋을 캐시해 오프라인/홈 화면 앱으로 동작 (캐시 이름을 바꾸면 새 버전 배포)
const CACHE = "poko-focus-v%s";
const ASSETS = %s;
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((a) => new Request(a, { cache: "reload" }))).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// 앱 셸(HTML·JS·CSS·매니페스트)은 네트워크 우선 → 새 배포가 첫 로드에 바로 반영, 오프라인이면 캐시.
// 그림·음원 같은 에셋은 캐시 우선.
const SHELL = /\.(html|js|css|json)$|\/$/;
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  const put = (res) => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); } return res; };
  if (SHELL.test(url.pathname)) {
    e.respondWith(fetch(e.request).then(put).catch(() => caches.match(e.request).then((hit) => hit || caches.match("index.html"))));
  } else {
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then(put).catch(() => caches.match("index.html"))));
  }
});
''' % (ver, json.dumps(files, ensure_ascii=False, indent=1))
open(os.path.join(G, "sw.js"), "w", encoding="utf-8").write(sw)
print(f"sw.js: {len(files)} files, cache v{ver}")
