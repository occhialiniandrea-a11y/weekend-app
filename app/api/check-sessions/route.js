import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const SESSIONS_FILE = path.join(process.cwd(), 'data', 'voting-sessions.json');
const TELEGRAM_USERS_FILE = path.join(process.cwd(), 'data', 'telegram-users.json');

async function readSessions() {
  if (!existsSync(SESSIONS_FILE)) {
    return {};
  }
  const data = await readFile(SESSIONS_FILE, 'utf-8');
  return JSON.parse(data);
}

async function readTelegramUsers() {
  if (!existsSync(TELEGRAM_USERS_FILE)) {
    return [];
  }
  const data = await readFile(TELEGRAM_USERS_FILE, 'utf-8');
  return JSON.parse(data);
}

async function sendTelegramMessage(chatIds, message) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  const results = await Promise.allSettled(
    chatIds.map(chatId =>
      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      })
    )
  );
  
  return results.filter(r => r.status === 'fulfilled').length;
}

export async function GET(request) {
  try {
    const sessions = await readSessions();
    const users = await readTelegramUsers();
    const activeUsers = users.filter(u => u.active);
    
    if (activeUsers.length === 0) {
      return Response.json({ message: 'Nessun utente attivo', sent: 0 });
    }

    const now = new Date();
    const notifications = [];
    
    // Controlla ogni sessione attiva
    for (const [sessionId, session] of Object.entries(sessions)) {
      if (session.status !== 'active' || !session.deadline) continue;
      
      const deadline = new Date(session.deadline);
      const hoursUntilDeadline = (deadline - now) / (1000 * 60 * 60);
      
      // 48 ore prima della deadline (circa 2 giorni)
      if (hoursUntilDeadline > 46 && hoursUntilDeadline <= 50 && !session.reminderSent) {
        const chatIds = activeUsers.map(u => u.chatId);
        const message = 
          `⏰ *Reminder: Votazione aperta!*\n\n` +
          `C'è una sessione di voto attiva per *${session.location}*!\n\n` +
          `🗳️ Vota ora: ${process.env.NEXT_PUBLIC_APP_URL || 'https://weekend-app-one.vercel.app'}/vote/${sessionId}\n\n` +
          `⏱️ Scadenza: ${deadline.toLocaleDateString('it-IT')} alle ${deadline.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
        
        const sent = await sendTelegramMessage(chatIds, message);
        notifications.push({ type: '48h-reminder', sessionId, sent });
      }
      
      // 24 ore prima (1 giorno)
      else if (hoursUntilDeadline > 22 && hoursUntilDeadline <= 26 && !session.lastDayReminderSent) {
        const chatIds = activeUsers.map(u => u.chatId);
        const message = 
          `🔔 *Ultima chiamata!*\n\n` +
          `La votazione per *${session.location}* scade domani!\n\n` +
          `👥 Votanti: ${session.totalVoters || 0}\n` +
          `🗳️ Vota qui: ${process.env.NEXT_PUBLIC_APP_URL || 'https://weekend-app-one.vercel.app'}/vote/${sessionId}\n\n` +
          `Non perdere l'occasione di dire la tua! ⏰`;
        
        const sent = await sendTelegramMessage(chatIds, message);
        notifications.push({ type: '24h-reminder', sessionId, sent });
      }
      
      // Deadline scaduta - annuncia vincitore
      else if (hoursUntilDeadline <= 0 && session.status === 'active') {
        // Calcola vincitore
        const voteCounts = {};
        session.restaurants.forEach(r => {
          voteCounts[r.id] = 0;
        });
        
        Object.values(session.votes || {}).forEach(restaurantId => {
          if (voteCounts[restaurantId] !== undefined) {
            voteCounts[restaurantId]++;
          }
        });
        
        let maxVotes = 0;
        let winnerId = null;
        Object.entries(voteCounts).forEach(([id, votes]) => {
          if (votes > maxVotes) {
            maxVotes = votes;
            winnerId = parseInt(id);
          }
        });
        
        const winner = session.restaurants.find(r => r.id === winnerId);
        
        if (winner && maxVotes > 0) {
          const chatIds = activeUsers.map(u => u.chatId);
          const message = 
            `🏆 *Abbiamo un vincitore!*\n\n` +
            `La votazione per *${session.location}* è conclusa!\n\n` +
            `🥇 *${winner.name}*\n` +
            `⭐ ${winner.rating} • ${winner.price}\n` +
            `📍 ${winner.address}\n\n` +
            `👥 Voti totali: ${maxVotes}\n\n` +
            `🔗 Vedi su Google Maps: ${winner.googleMapsUrl}\n\n` +
            `📞 Ricordatevi di prenotare!`;
          
          const sent = await sendTelegramMessage(chatIds, message);
          notifications.push({ type: 'winner-announcement', sessionId, winner: winner.name, sent });
          
          // Aggiorna stato sessione (dovresti implementare writeSession)
          session.status = 'completed';
        }
      }
    }
    
    if (notifications.length === 0) {
      return Response.json({ message: 'Nessuna notifica da inviare', checked: Object.keys(sessions).length });
    }
    
    return Response.json({ 
      success: true, 
      notifications,
      totalSent: notifications.reduce((sum, n) => sum + n.sent, 0)
    });

  } catch (error) {
    console.error('Errore check sessioni:', error);
    return Response.json(
      { error: 'Errore controllo sessioni', details: error.message },
      { status: 500 }
    );
  }
}