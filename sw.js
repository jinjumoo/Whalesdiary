// 고래의 하루 · 오프라인용 서비스워커
const CACHE = 'whale-diary-v1';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  // 데이터·로그인 통신은 건드리지 않음 (Firebase SDK가 자체 처리)
  if(/firestore\.googleapis\.com|identitytoolkit|securetoken|accounts\.google\.com|firebaseapp\.com|apis\.google\.com/.test(url.host + url.pathname)) return;

  if(req.mode === 'navigate'){
    // 온라인이면 항상 최신 index.html, 오프라인이면 저장해둔 것
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }
  // 그 외(스크립트·글꼴·이미지): 저장본을 먼저 보여주고 뒤에서 갱신
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if(res && (res.ok || res.type === 'opaque')){
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
