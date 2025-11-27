// Service Worker per gestire notifiche push

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installato');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Attivato');
  event.waitUntil(clients.claim());
});

// Gestione notifiche push
self.addEventListener('push', (event) => {
  console.log('Service Worker: Notifica ricevuta');
  
  let data = {
    title: 'Weekend App',
    body: 'Hai una nuova notifica',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: 'weekend-notification',
    data: {
      url: '/'
    }
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      console.error('Errore parsing notifica:', e);
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Click su notifica
self.addEventListener('notificationclick', (event) => {
  console.log('Notifica cliccata:', event.notification.tag);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Se c'è già una finestra aperta, la porta in primo piano
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Altrimenti apri nuova finestra
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});