
const CACHE = 'hh-cache-v2';
const urlsToCache = ['.','index.html','style.css','script.js','manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(urlsToCache)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(r => r || fetch(event.request)));
});

// Listen for messages from page
self.addEventListener('message', event => {
  if(!event.data) return;
  if(event.data.type === 'show-notification'){
    const title = event.data.title || 'Reminder';
    const options = {
      body: event.data.body || '',
      tag: 'habit-reminder',
      renotify: true,
      actions: [
        { action: 'snooze', title: 'Snooze 10m' },
        { action: 'mark', title: 'Mark Done' }
      ]
    };
    self.registration.showNotification(title, options);
  } else if(event.data.type === 'push-subscription'){
    // optional: store on SW side if needed
  }
});

// Handle push events (when real push arrives)
self.addEventListener('push', event => {
  let payload = {};
  try{ payload = event.data.json(); }catch(e){ payload = { title: 'Reminder', body: event.data ? event.data.text() : 'Have a habit!' } }
  const title = payload.title || 'Habit Reminder';
  const options = Object.assign({
    body: payload.body || '',
    tag: 'habit-reminder',
    renotify: true,
    actions: [
      { action: 'snooze', title: 'Snooze 10m' },
      { action: 'mark', title: 'Mark Done' }
    ]
  }, payload.options || {});
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click / action handling
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const action = event.action;
  // Notify clients about action
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) {
        clientList[0].focus();
        clientList[0].postMessage({ type: 'notification-action', action, data: event.notification });
      } else {
        clients.openWindow('/').then(windowClient => {
          // could postMessage after open
        });
      }
    })
  );
});
