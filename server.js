import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '1mb' }));

let memoryState = {
  players: [],
  locked: false,
  groups: { A: [], B: [] },
  matches: [],
  rankings: {}
};

app.get('/api/config', (_req, res) => {
  const apiKey = process.env.FIREBASE_API_KEY || '';
  if (!apiKey) {
    return res.json({ firebaseConfig: null });
  }
  return res.json({
    firebaseConfig: {
      apiKey,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
      databaseURL: process.env.FIREBASE_DATABASE_URL || '',
      projectId: process.env.FIREBASE_PROJECT_ID || '',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.FIREBASE_APP_ID || '',
      measurementId: process.env.FIREBASE_MEASUREMENT_ID || ''
    }
  });
});

app.get('/api/tournament', (_req, res) => {
  res.json(memoryState);
});

app.put('/api/tournament', (req, res) => {
  const val = req.body;
  if (!val || typeof val !== 'object') {
    return res.status(400).json({ error: 'Invalid tournament state' });
  }
  memoryState = {
    players: Array.isArray(val.players) ? val.players : [],
    locked: Boolean(val.locked),
    groups: val.groups && typeof val.groups === 'object'
      ? { A: Array.isArray(val.groups.A) ? val.groups.A : [], B: Array.isArray(val.groups.B) ? val.groups.B : [] }
      : { A: [], B: [] },
    matches: Array.isArray(val.matches) ? val.matches : [],
    rankings: val.rankings && typeof val.rankings === 'object' ? val.rankings : {}
  };
  return res.json(memoryState);
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Margarita Open server listening on http://0.0.0.0:${PORT}`);
});
