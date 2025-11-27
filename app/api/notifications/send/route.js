import webpush from 'web-push';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const SUBSCRIPTIONS_FILE = path.join(process.cwd(), 'data', 'push-subscriptions.json');

async function readSubscriptions() {
  if (!existsSync(SUBSCRIPTIONS_FILE)) {
    return [];
  }
  const data = await readFile(SUBSCRIPTIONS_FILE, 'utf-8');
  return JSON.parse(data);
}

// Configura VAPID
function setupVapid() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  
  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys non configurate');
  }

  webpush.setVapidDetails(
    'mailto:your-email@example.com', // Sostituisci con la tua email
    publicKey,
    privateKey
  );
}

export async function POST(request) {
  try {
    const { type } = await request.json();

    setupVapid();
    const subscriptions = await readSubscriptions();

    if (subscriptions.length === 0) {
      return Response.json(
        { error: 'Nessun utente iscritto alle notifiche' },
        { status: 404 }
      );
    }

    // Payload notifica in base al tipo
    let payload;
    switch (type) {
      case 'test':
        payload = {
          title: '🎉 Weekend App',
          body: 'Notifica test! Il sistema funziona correttamente.',
          data: { url: '/' }
        };
        break;
      
      case 'monday-reminder':
        payload = {
          title: '🗓️ Weekend in arrivo!',
          body: 'È lunedì! Vuoi organizzare qualcosa per il weekend?',
          data: { url: '/' }
        };
        break;
      
      case 'wednesday-vote':
        payload = {
          title: '⏰ Ultima chiamata!',
          body: 'Non dimenticare di votare per il locale del weekend!',
          data: { url: '/' }
        };
        break;
      
      case 'thursday-winner':
        payload = {
          title: '🏆 Abbiamo un vincitore!',
          body: 'Controlla quale locale ha vinto la votazione!',
          data: { url: '/' }
        };
        break;
      
      case 'friday-booking':
        payload = {
          title: '📞 Ricordati di prenotare!',
          body: 'Il weekend è vicino, prenota il tavolo per evitare sorprese!',
          data: { url: '/' }
        };
        break;
      
      default:
        payload = {
          title: 'Weekend App',
          body: 'Hai una nuova notifica',
          data: { url: '/' }
        };
    }

    // Invia a tutti gli iscritti
    const results = await Promise.allSettled(
      subscriptions.map(subscription =>
        webpush.sendNotification(subscription, JSON.stringify(payload))
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return Response.json({
      success: true,
      sent: successful,
      failed: failed,
      total: subscriptions.length
    });

  } catch (error) {
    console.error('Errore invio notifica:', error);
    return Response.json(
      { error: 'Errore nell\'invio della notifica', details: error.message },
      { status: 500 }
    );
  }
}