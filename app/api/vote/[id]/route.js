import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'voting-sessions.json');

async function readSessions() {
  if (!existsSync(SESSIONS_FILE)) {
    return {};
  }
  const data = await readFile(SESSIONS_FILE, 'utf-8');
  return JSON.parse(data);
}

async function writeSessions(sessions) {
  await writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

// GET - Recupera sessione
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const sessions = await readSessions();
    const session = sessions[id];

    if (!session) {
      return Response.json(
        { error: 'Sessione non trovata' },
        { status: 404 }
      );
    }

    // Calcola conteggio voti
    const voteCounts = {};
    session.restaurants.forEach(r => {
      voteCounts[r.id] = 0;
    });

    Object.values(session.votes).forEach(restaurantId => {
      if (voteCounts[restaurantId] !== undefined) {
        voteCounts[restaurantId]++;
      }
    });

    return Response.json({
      session: {
        ...session,
        voteCounts,
        totalVoters: Object.keys(session.votes).length,
      }
    });

  } catch (error) {
    console.error('Errore recupero sessione:', error);
    return Response.json(
      { error: 'Errore nel recupero della sessione', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Vota
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { userId, userName, restaurantId } = await request.json();

    if (!userId || !restaurantId) {
      return Response.json(
        { error: 'userId e restaurantId richiesti' },
        { status: 400 }
      );
    }

    const sessions = await readSessions();
    const session = sessions[id];

    if (!session) {
      return Response.json(
        { error: 'Sessione non trovata' },
        { status: 404 }
      );
    }

    if (session.status !== 'active') {
      return Response.json(
        { error: 'Sessione non più attiva' },
        { status: 400 }
      );
    }

    // Salva o aggiorna voto
    session.votes[userId] = restaurantId;
    
    // Salva anche il nome dell'utente per visualizzazione
    if (!session.voterNames) {
      session.voterNames = {};
    }
    session.voterNames[userId] = userName || 'Anonimo';

    await writeSessions(sessions);

    // Calcola conteggio voti aggiornato
    const voteCounts = {};
    session.restaurants.forEach(r => {
      voteCounts[r.id] = 0;
    });

    Object.values(session.votes).forEach(restaurantId => {
      if (voteCounts[restaurantId] !== undefined) {
        voteCounts[restaurantId]++;
      }
    });

    return Response.json({
      success: true,
      voteCounts,
      totalVoters: Object.keys(session.votes).length,
    });

  } catch (error) {
    console.error('Errore voto:', error);
    return Response.json(
      { error: 'Errore nel salvataggio del voto', details: error.message },
      { status: 500 }
    );
  }
}