'use client';

import { useEffect, useState } from 'react';

export default function NotificationManager() {
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Controlla permesso attuale
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Registra service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registrato:', registration);
          checkSubscription(registration);
        })
        .catch((error) => {
          console.error('Errore registrazione Service Worker:', error);
        });
    }
  }, []);

  const checkSubscription = async (registration) => {
    const subscription = await registration.pushManager.getSubscription();
    setIsSubscribed(!!subscription);
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('Il tuo browser non supporta le notifiche');
      return;
    }

    if (!('serviceWorker' in navigator)) {
      alert('Il tuo browser non supporta i service worker');
      return;
    }

    setLoading(true);

    try {
      // Richiedi permesso
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        // Ottieni service worker registration
        const registration = await navigator.serviceWorker.ready;

        // Chiedi VAPID public key al server
        const vapidResponse = await fetch('/api/notifications/vapid-key');
        const { publicKey } = await vapidResponse.json();

        // Converti chiave in formato corretto
        const convertedVapidKey = urlBase64ToUint8Array(publicKey);

        // Sottoscrivi a push notifications
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });

        // Salva subscription sul server
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(subscription)
        });

        setIsSubscribed(true);
        alert('✅ Notifiche attivate! Riceverai promemoria automatici per organizzare il weekend.');
      } else {
        alert('❌ Permesso negato. Non riceverai notifiche automatiche.');
      }
    } catch (error) {
      console.error('Errore:', error);
      alert('Errore nell\'attivazione delle notifiche: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'test' })
      });
      alert('✅ Notifica test inviata! Controlla se l\'hai ricevuta.');
    } catch (error) {
      alert('Errore invio notifica test: ' + error.message);
    }
  };

  // Helper function per convertire VAPID key
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  if (permission === 'denied') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 text-sm">
          ❌ Le notifiche sono bloccate. Abilitale dalle impostazioni del browser per ricevere promemoria automatici.
        </p>
      </div>
    );
  }

  if (permission === 'granted' && isSubscribed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <p className="text-green-800 text-sm font-medium">
            ✅ Notifiche attive
          </p>
          <button
            onClick={sendTestNotification}
            className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
          >
            Invia test
          </button>
        </div>
        <p className="text-green-700 text-xs mt-1">
          Riceverai promemoria automatici per organizzare il weekend
        </p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <p className="text-blue-900 font-medium text-sm mb-2">
        🔔 Attiva le notifiche automatiche
      </p>
      <p className="text-blue-800 text-xs mb-3">
        Riceverai promemoria settimanali per organizzare le uscite con gli amici
      </p>
      <button
        onClick={requestPermission}
        disabled={loading}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition-colors disabled:opacity-50"
      >
        {loading ? 'Attivazione...' : '🔔 Attiva notifiche'}
      </button>
    </div>
  );
}