import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const IS_VERCEL = Boolean(process.env.VERCEL);

const DATA_DIR = IS_VERCEL ? '/tmp/lgg-squash-data' : path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch (err) {
  console.warn('Could not initialize data directories:', err.message);
}

app.use(express.json({ limit: '15mb' }));
app.use('/src/assets/images', express.static(path.join(__dirname, 'src', 'assets', 'images')));
app.use('/uploads', express.static(UPLOAD_DIR));

function defaultState() {
  return {
    tournaments: [
      {
        id: 'margarita-winter-open-2026',
        title: 'Margarita Winter Open',
        division: 'open',
        ageCategory: 'Open Division',
        dateLabel: '19 December 2026',
        targetIsoDate: '2026-12-19T17:00:00+05:00',
        timeWindow: '1700 – 1930',
        format: 'Best of 3',
        courts: 'The Cooler (Court 1) & The Furnace (Court 2)',
        status: 'upcoming',
        registrationOpen: true,
        locked: false,
        players: [],
        groups: { A: [], B: [] },
        matches: [],
        championName: '',
        notes: 'Second Open championship of the season. Entries open for LGGCC squash players.'
      },
      {
        id: 'lggcc-kids-junior-open-2026',
        title: 'LGGCC Junior Squash Open',
        division: 'kids',
        ageCategory: 'Under 11 & Under 15',
        dateLabel: '26 December 2026',
        targetIsoDate: '2026-12-26T15:30:00+05:00',
        timeWindow: '1530 – 1730',
        format: 'Best of 3 (11 pts)',
        courts: 'The Cooler (Court 1) & The Furnace (Court 2)',
        status: 'upcoming',
        registrationOpen: true,
        locked: false,
        players: [],
        groups: { A: [], B: [] },
        matches: [],
        championName: '',
        notes: 'Dedicated junior brackets for young LGGCC players with supervised scoring.'
      },
      {
        id: 'margarita-open-june-2026',
        title: 'Inaugural Margarita Open',
        division: 'open',
        ageCategory: 'Open Division',
        dateLabel: '14 June 2026',
        targetIsoDate: '2026-06-14T17:00:00+05:00',
        timeWindow: '1700 – 1900',
        format: 'Best of 3',
        courts: 'The Cooler (Court 1) & The Furnace (Court 2)',
        status: 'completed',
        registrationOpen: false,
        locked: true,
        players: [],
        groups: { A: [], B: [] },
        matches: [],
        championName: '',
        notes: 'Inaugural LGGCC edition played on 14 June 2026. Registration closed; archive open for scorekeeping & ladder updates.'
      }
    ],
    rankings: {
      open: {},
      kids: {}
    },
    photos: [
      {
        id: 'seed-cooler-match',
        url: '/src/assets/images/gallery_cooler_match_1795254881715.jpg',
        caption: 'Front-wall rally on Court 1 (The Cooler)',
        eventTitle: 'Inaugural Margarita Open',
        dateLabel: '14 June 2026',
        division: 'open',
        isSeed: true
      },
      {
        id: 'seed-trophy',
        url: '/src/assets/images/gallery_trophy_presentation_1795254881480.jpg',
        caption: 'Margarita Series silverware and match balls',
        eventTitle: 'LGGCC Squash Archive',
        dateLabel: 'Season 2026',
        division: 'club',
        isSeed: true
      },
      {
        id: 'seed-kids-session',
        url: '/src/assets/images/gallery_kids_squash_1795254881555.jpg',
        caption: 'Junior development rally and court footwork',
        eventTitle: 'LGGCC Junior Squash Open',
        dateLabel: 'Season 2026',
        division: 'kids',
        isSeed: true
      }
    ]
  };
}

function normalizeTournament(t) {
  const status = ['upcoming', 'live', 'completed'].includes(t?.status) ? t.status : 'upcoming';
  const division = t?.division === 'kids' ? 'kids' : 'open';
  const groups = t?.groups && typeof t.groups === 'object'
    ? {
        A: Array.isArray(t.groups.A) ? t.groups.A : [],
        B: Array.isArray(t.groups.B) ? t.groups.B : []
      }
    : { A: [], B: [] };
  return {
    id: String(t?.id || Math.random().toString(36).slice(2, 10)),
    title: String(t?.title || 'Untitled Tournament'),
    division,
    ageCategory: String(t?.ageCategory || (division === 'kids' ? 'Junior Division' : 'Open Division')),
    dateLabel: String(t?.dateLabel || ''),
    targetIsoDate: String(t?.targetIsoDate || ''),
    timeWindow: String(t?.timeWindow || '1700 – 1900'),
    format: String(t?.format || 'Best of 3'),
    courts: String(t?.courts || 'The Cooler (Court 1) & The Furnace (Court 2)'),
    status,
    registrationOpen: status === 'completed' ? false : Boolean(t?.registrationOpen),
    locked: status === 'completed' ? true : Boolean(t?.locked),
    players: Array.isArray(t?.players) ? t.players : [],
    groups,
    matches: Array.isArray(t?.matches) ? t.matches : [],
    championName: String(t?.championName || ''),
    notes: String(t?.notes || '')
  };
}

function normalizeState(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;

  // Legacy single-tournament schema migration
  if (!Array.isArray(raw.tournaments) && (Array.isArray(raw.players) || Array.isArray(raw.matches))) {
    const legacyTourn = {
      ...base.tournaments.find(t => t.id === 'margarita-open-june-2026'),
      players: Array.isArray(raw.players) ? raw.players : [],
      groups: raw.groups || { A: [], B: [] },
      matches: Array.isArray(raw.matches) ? raw.matches : [],
      locked: true,
      registrationOpen: false,
      status: 'completed'
    };
    const otherTourns = base.tournaments.filter(t => t.id !== 'margarita-open-june-2026');
    return {
      tournaments: [...otherTourns, normalizeTournament(legacyTourn)],
      rankings: {
        open: raw.rankings && typeof raw.rankings === 'object' ? raw.rankings : {},
        kids: {}
      },
      photos: base.photos
    };
  }

  const rankingsRaw = raw.rankings && typeof raw.rankings === 'object' ? raw.rankings : {};
  const openRankings = rankingsRaw.open && typeof rankingsRaw.open === 'object'
    ? rankingsRaw.open
    : (!rankingsRaw.open && !rankingsRaw.kids ? rankingsRaw : {});
  const kidsRankings = rankingsRaw.kids && typeof rankingsRaw.kids === 'object' ? rankingsRaw.kids : {};

  return {
    tournaments: Array.isArray(raw.tournaments) ? raw.tournaments.map(normalizeTournament) : base.tournaments,
    rankings: { open: openRankings, kids: kidsRankings },
    photos: Array.isArray(raw.photos) ? raw.photos : base.photos
  };
}

function loadDiskState() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const content = fs.readFileSync(STORE_PATH, 'utf8');
      return normalizeState(JSON.parse(content));
    }
  } catch (err) {
    console.warn('Failed reading store.json, using defaults:', err.message);
  }
  return defaultState();
}

function saveDiskState(nextState) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(nextState, null, 2), 'utf8');
  } catch (err) {
    console.warn('Failed writing store.json:', err.message);
  }
}

let memoryState = loadDiskState();

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
  memoryState = normalizeState(val);
  saveDiskState(memoryState);
  return res.json(memoryState);
});

app.post('/api/tournaments/:id/register', (req, res) => {
  const tournId = req.params.id;
  const t = (memoryState.tournaments || []).find(x => x.id === tournId);
  if (!t) {
    return res.status(404).json({ error: 'Tournament not found' });
  }
  if (t.locked || !t.registrationOpen || t.status === 'completed') {
    return res.status(400).json({ error: 'Registration is closed for this tournament' });
  }
  const body = req.body || {};
  const name = String(body.name || '').trim().slice(0, 60);
  const phone = String(body.phone || '').trim().slice(0, 30);
  if (!name || !phone) {
    return res.status(400).json({ error: 'Player name and phone number are required' });
  }
  const pkr = Math.max(0, parseInt(body.pkr || '0', 10) || 0);
  const guardian = String(body.guardian || '').trim().slice(0, 60);
  const ageGroup = String(body.ageGroup || '').trim().slice(0, 30);

  const player = {
    id: 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    name,
    phone,
    pkr,
    guardian,
    ageGroup
  };
  t.players = Array.isArray(t.players) ? t.players : [];
  t.players.push(player);

  const divKey = t.division === 'kids' ? 'kids' : 'open';
  memoryState.rankings = memoryState.rankings || { open: {}, kids: {} };
  memoryState.rankings[divKey] = memoryState.rankings[divKey] || {};
  if (!memoryState.rankings[divKey][name]) {
    memoryState.rankings[divKey][name] = { rating: 1000, played: 0, wins: 0, losses: 0 };
  }

  saveDiskState(memoryState);
  return res.status(201).json({ player, state: memoryState });
});

app.delete('/api/tournaments/:id/players/:playerId', (req, res) => {
  const { id, playerId } = req.params;
  const t = (memoryState.tournaments || []).find(x => x.id === id);
  if (!t) {
    return res.status(404).json({ error: 'Tournament not found' });
  }
  if (t.locked) {
    return res.status(400).json({ error: 'Cannot remove player after draw is locked' });
  }
  t.players = (t.players || []).filter(p => p.id !== playerId);
  saveDiskState(memoryState);
  return res.json({ state: memoryState });
});

app.post('/api/photos', (req, res) => {
  const { imageDataUrl, caption, eventTitle, dateLabel, division } = req.body || {};
  if (typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Valid image file is required' });
  }
  const match = imageDataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
  if (!match) {
    return res.status(400).json({ error: 'Supported image formats: PNG, JPG, WEBP' });
  }
  const ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 10 * 1024 * 1024) {
    return res.status(413).json({ error: 'Image exceeds 10MB limit' });
  }
  const id = 'photo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  const filename = `${id}.${ext}`;
  let photoUrl = `/uploads/${filename}`;

  if (IS_VERCEL || process.env.FIREBASE_API_KEY) {
    photoUrl = imageDataUrl;
  } else {
    try {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
    } catch (err) {
      return res.status(500).json({ error: 'Could not save uploaded image: ' + err.message });
    }
  }

  const photo = {
    id,
    url: photoUrl,
    caption: String(caption || 'Court action at LGGCC').slice(0, 140),
    eventTitle: String(eventTitle || 'LGG SQUASH').slice(0, 80),
    dateLabel: String(dateLabel || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })).slice(0, 40),
    division: ['open', 'kids', 'club'].includes(division) ? division : 'open',
    isSeed: false
  };

  memoryState.photos = [photo, ...(memoryState.photos || [])];
  saveDiskState(memoryState);
  return res.status(201).json({ photo, photos: memoryState.photos });
});

app.delete('/api/photos/:id', (req, res) => {
  const id = req.params.id;
  const existing = (memoryState.photos || []).find(p => p.id === id);
  if (!existing) {
    return res.status(404).json({ error: 'Photo not found' });
  }
  if (existing.url && existing.url.startsWith('/uploads/')) {
    const filePath = path.join(UPLOAD_DIR, path.basename(existing.url));
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (err) {
      console.warn('Could not unlink uploaded photo:', err.message);
    }
  }
  memoryState.photos = (memoryState.photos || []).filter(p => p.id !== id);
  saveDiskState(memoryState);
  return res.json({ photos: memoryState.photos });
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'index.html'));
});

if (!IS_VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LGG SQUASH server listening on http://0.0.0.0:${PORT}`);
  });
}

export default app;
