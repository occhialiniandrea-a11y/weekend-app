import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const TELEGRAM_USERS_FILE = path.join(DATA_DIR, 'telegram-users.json');

async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
  if (!existsSync(TELEGRAM_USERS_FILE)) {
    await writeFile(TELEGRAM_USERS_FILE, JSON.stringify([]));
  }
}

async function readTelegramUsers() {
  await ensureDataDir();
  const data = await readFile(TELEGRAM_USERS_FILE, 'utf-8');
  return JSON.parse(data);
}

async function writeTelegramUsers(users) {
  await ensureDataDir();
  await writeFile(TELEGRAM_USERS_FILE, JSON.stringify(users, null, 2));
}

export async function POST(request) {
  try {
    const update = await request.json();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN non configurato');
      return Response.json({ ok: true });
    }

    // Gestisci messaggio
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      const firstName = update.message.from.first_name || 'Amico';
      const username = update.message.from.username || null;

      console.log(`Messaggio da ${firstName} (${chatId}): ${text}`);

      // Comando /start
      if (text === '/start') {
        const users = await readTelegramUsers();
        
        const existingUser = users.find(u => u.chatId === chatId);
        
        if (!existingUser) {
          users.push({
            chatId,
            firstName,
            username,
            registeredAt: new Date().toISOString(),
            active: true
          });
          await writeTelegramUsers(users);
        }

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `🎉 Benvenuto ${firstName}!\n\n` +
                  `✅ Notifiche attivate!\n\n` +
                  `Riceverai promemoria settimanali per organizzare il weekend:\n` +
                  `• 🗓️ Lunedì - "Organizziamo il weekend?"\n` +
                  `• ⏰ Mercoledì - "Ultima chiamata per votare!"\n` +
                  `• 🏆 Giovedì - "Abbiamo un vincitore!"\n` +
                  `• 📞 Venerdì - "Ricordati di prenotare!"\n\n` +
                  `Usa /stop per disattivare le notifiche.`
          })
        });
      }
      
      else if (text === '/stop') {
        const users = await readTelegramUsers();
        const userIndex = users.findIndex(u => u.chatId === chatId);
        
        if (userIndex !== -1) {
          users[userIndex].active = false;
          await writeTelegramUsers(users);
          
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `❌ Notifiche disattivate.\n\nUsa /start per riattivarle.`
            })
          });
        }
      }
      
      else if (text === '/help') {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `🤖 Weekend App Bot\n\n` +
                  `Comandi disponibili:\n` +
                  `/start - Attiva notifiche\n` +
                  `/stop - Disattiva notifiche\n` +
                  `/help - Mostra questo messaggio`
          })
        });
      }
    }

    return Response.json({ ok: true });

  } catch (error) {
    console.error('Errore webhook Telegram:', error);
    return Response.json({ ok: true });
  }
}