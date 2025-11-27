import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Directory per salvare le sessioni (fuori da .next per persistenza)
const DATA_DIR = path.join(process.cwd(), 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'voting-sessions.json');

// Assicura che la directory esista
async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
  if (!existsSync(SESSIONS_FILE)) {
    await writeFile(SESSIONS_FILE, JSON.stringify({}));
  }
}

// Leggi tutte le sessioni
async function readSessions() {
  await ensureDataDir();
  const data = await readFile(SESSIONS_FILE, 'utf-8');
  return JSON.parse(data);
}

// Salva sessioni
async function writeSessions(sessions) {
  await ensureDataDir();
  await writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

// Genera ID univoco
function generateId() {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

export async function POST(request) {
  try {
    const { restaurants, location, groupName, deadline, createdBy } = await request.json();

    if (!restaurants || restaurants.length === 0) {
      return Response.json(
        { error: 'Restaurants richiesti' },
        { status: 400 }
      );
    }

    const sessionId = generateId();
    const sessions = await readSessions();

    // Crea nuova sessione
    sessions[sessionId] = {
      id: sessionId,
      restaurants: restaurants,
      location: location || 'Non specificato',
      groupName: groupName || 'Gruppo Weekend',
      createdBy: createdBy || 'Admin',
      createdAt: new Date().toISOString(),
      deadline: deadline || null,
      votes: {}, // { userId: restaurantId }
      status: 'active', // active, closed, completed
    };

    await writeSessions(sessions);

    return Response.json({
      success: true,
      sessionId: sessionId,
      voteUrl: `/vote/${sessionId}`,
    });

  } catch (error) {
    console.error('Errore creazione sessione:', error);
    return Response.json(
      { error: 'Errore nella creazione della sessione', details: error.message },
      { status: 500 }
    );
  }
}