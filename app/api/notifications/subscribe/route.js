import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'push-subscriptions.json');

async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
  if (!existsSync(SUBSCRIPTIONS_FILE)) {
    await writeFile(SUBSCRIPTIONS_FILE, JSON.stringify([]));
  }
}

async function readSubscriptions() {
  await ensureDataDir();
  const data = await readFile(SUBSCRIPTIONS_FILE, 'utf-8');
  return JSON.parse(data);
}

async function writeSubscriptions(subscriptions) {
  await ensureDataDir();
  await writeFile(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2));
}

export async function POST(request) {
  try {
    const subscription = await request.json();

    if (!subscription || !subscription.endpoint) {
      return Response.json(
        { error: 'Subscription invalida' },
        { status: 400 }
      );
    }

    const subscriptions = await readSubscriptions();
    
    // Controlla se già esiste
    const exists = subscriptions.find(sub => sub.endpoint === subscription.endpoint);
    
    if (!exists) {
      subscriptions.push({
        ...subscription,
        subscribedAt: new Date().toISOString()
      });
      await writeSubscriptions(subscriptions);
    }

    return Response.json({ success: true, message: 'Subscription salvata' });

  } catch (error) {
    console.error('Errore salvataggio subscription:', error);
    return Response.json(
      { error: 'Errore nel salvataggio', details: error.message },
      { status: 500 }
    );
  }
}