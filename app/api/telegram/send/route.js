import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const TELEGRAM_USERS_FILE = path.join(process.cwd(), 'data', 'telegram-users.json');

async function readTelegramUsers() {
  if (!existsSync(TELEGRAM_USERS_FILE)) {
    return [];
  }
  const data = await readFile(TELEGRAM_USERS_FILE, 'utf-8');
  return JSON.parse(data);
}

export async function POST(request) {
  try {
    const { type, customMessage } = await request.json();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      return Response.json(
        { error: 'TELEGRAM_BOT_TOKEN non configurato' },
        { status: 500 }
      );
    }

    const users = await readTelegramUsers();
    const activeUsers = users.filter(u => u.active);

    if (activeUsers.length === 0) {
      return Response.json(
        { error: 'Nessun utente attivo' },
        { status: 404 }
      );
    }

    let message;
    switch (type) {
      case 'monday-reminder':
        message = `🗓️ *Weekend in arrivo!*\n\nÈ lunedì! Tempo di organizzare qualcosa di bello per il weekend.\n\nApri l'app e trova il locale perfetto! 🍽️`;
        break;
      case 'wednesday-vote':
        message = `⏰ *Ultima chiamata per votare!*\n\nIl weekend si avvicina! Non dimenticare di votare.\n\nVota ora! 🗳️`;
        break;
      case 'thursday-winner':
        message = `🏆 *Abbiamo un vincitore!*\n\nLa votazione è conclusa! Controlla quale locale ha vinto.\n\n🎉`;
        break;
      case 'friday-booking':
        message = `📞 *Ricordati di prenotare!*\n\nIl weekend è domani! Prenota il tavolo.\n\n✅`;
        break;
      case 'custom':
        message = customMessage || 'Notifica da Weekend App! 📱';
        break;
      default:
        message = '📱 Notifica da Weekend App!';
    }

    const results = await Promise.allSettled(
      activeUsers.map(user =>
        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: user.chatId,
            text: message,
            parse_mode: 'Markdown'
          })
        })
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return Response.json({
      success: true,
      sent: successful,
      failed: failed,
      total: activeUsers.length
    });

  } catch (error) {
    console.error('Errore:', error);
    return Response.json(
      { error: 'Errore invio', details: error.message },
      { status: 500 }
    );
  }
}