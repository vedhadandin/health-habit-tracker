
const CACHE = 'hh_uiux_v1';
const urls = ['.','index.html','style.css','script.js','manifest.json','icon-192.png','icon-512.png'];
self.addEventListener('install', e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(urls))); self.skipWaiting(); });
self.addEventListener('activate', e=>{ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', e=>{ e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))); });
self.addEventListener('message', event=>{ if(!event.data) return; if(event.data.type==='show-notification'){ const title = event.data.title || 'Reminder'; const opts = { body: event.data.body || '', renotify:true, tag:'habit', actions:[{action:'snooze', title:'Snooze 10m'},{action:'mark', title:'Mark Done'}] }; self.registration.showNotification(title, opts); } });
self.addEventListener('notificationclick', event=>{ event.notification.close(); const action = event.action; event.waitUntil(clients.matchAll({ type:'window', includeUncontrolled:true }).then(list=>{ if(list.length>0){ list[0].focus(); list[0].postMessage({ type:'notification-action', action, data: event.notification }); } else clients.openWindow('/'); })); });
