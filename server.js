import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import QRCode from 'qrcode';
import { Store } from './src/store.js';
import * as G from './src/game.js';
import { DEFAULT_CONTENT } from './public/shared/content.js';
import { createAuth } from './src/auth.js';
import { ContentStore, applyItems, Invalid, validateContent } from './src/content-store.js';
import { generateSuggestions, aiAvailable, AI_MODEL } from './src/ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

const store = new Store(DATA_DIR);
const content = new ContentStore(DATA_DIR);
// Befund 3: Inhaltspakete gespeicherter Räume prüfen – ungültige fallen auf den Standard zurück
for (const room of store.rooms.values()) {
  if (!room.content) continue;
  try { room.content = validateContent(room.content); } catch (e) { console.warn(`Raum ${room.code}: Inhaltspaket ungültig (${e.message}) – nutze Standardinhalte`); room.content = null; }
}
const auth = createAuth({ password: process.env.TEACHER_PASSWORD, secret: process.env.SESSION_SECRET });
if (!auth.configured) console.warn('⚠️  TEACHER_PASSWORD ist nicht gesetzt – der Lehrkraft-Bereich ist gesperrt, bis ein Passwort konfiguriert ist.');
const app = express();
app.disable('x-powered-by');
// Nur so viele Proxy-Hops vertrauen, wie wirklich davor stehen (CapRover/nginx: 1) –
// sonst ließe sich die IP per X-Forwarded-For fälschen und jede Bremse umgehen.
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));
// Befund 4: großer Body nur für das Speichern im Editor, sonst 32 kB
app.use((req, res, next) => (req.path === '/api/content' && req.method === 'PUT' ? express.json({ limit: '1mb' }) : express.json({ limit: '32kb' }))(req, res, next));

// Einfache Zeitfenster-Bremse mit automatischem Aufräumen
const buckets = new Map();
function hit(key, max, windowMs) {
  const now = Date.now();
  const list = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (list.length >= max) { buckets.set(key, list); return false; }
  list.push(now); buckets.set(key, list); return true;
}
const peek = (key, windowMs) => (buckets.get(key) || []).filter((t) => Date.now() - t < windowMs).length;
setInterval(() => { const now = Date.now(); for (const [k, l] of buckets) if (!l.length || now - l[l.length - 1] > 30 * 60_000) buckets.delete(k); }, 5 * 60_000).unref();
process.on('unhandledRejection', (e) => console.error('Unbehandelter Fehler:', e));
process.on('uncaughtException', (e) => console.error('Unerwarteter Fehler:', e));

const nm = (p) => path.join(__dirname, 'node_modules', p);
app.use('/vendor/preact', express.static(nm('preact'), { maxAge: '7d' }));
app.use('/vendor/htm', express.static(nm('htm'), { maxAge: '7d' }));
app.use('/vendor/bootstrap', express.static(nm('bootstrap/dist'), { maxAge: '7d' }));
app.use('/vendor/bootstrap-icons', express.static(nm('bootstrap-icons/font'), { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'], maxAge: '5m' }));

app.get('/healthz', (_req, res) => res.json({ ok: true }));

// ------------------------------------------------------------ Lehrkraft-Anmeldung
const requireTeacher = (req, res, next) => {
  if (auth.isTeacher(req.headers.cookie)) return next();
  res.status(401).json({ error: auth.configured ? 'Bitte als Lehrkraft anmelden.' : 'Lehrkraft-Zugang ist auf dem Server nicht eingerichtet (TEACHER_PASSWORD fehlt).' });
};
app.get('/api/me', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ teacher: auth.isTeacher(req.headers.cookie), configured: auth.configured });
});
app.post('/api/login', (req, res) => {
  const ip = req.ip || 'x';
  const tooMany = { error: 'Zu viele Versuche. Bitte in ein paar Minuten erneut probieren.' };
  if (peek(`login:${ip}`, 5 * 60_000) >= 8 || peek('login:all', 15 * 60_000) >= 60) return res.status(429).json(tooMany);
  if (!auth.configured) return res.status(503).json({ error: 'Lehrkraft-Zugang ist auf dem Server nicht eingerichtet (TEACHER_PASSWORD fehlt).' });
  if (!auth.checkPassword(req.body?.password)) {
    hit(`login:${ip}`, 8, 5 * 60_000); hit('login:all', 60, 15 * 60_000); // auch global, falls viele IPs probieren
    return res.status(401).json({ error: 'Falsches Passwort.' });
  }
  buckets.delete(`login:${ip}`);
  res.setHeader('Set-Cookie', auth.cookieFor(req.secure));
  res.json({ ok: true });
});
app.post('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', auth.clearCookie(req.secure));
  res.json({ ok: true });
});

// Neuen Raum anlegen (Lehrkraft)
app.post('/api/rooms', requireTeacher, (req, res) => {
  if (!hit(`create:${req.ip}`, 10, 60_000)) return res.status(429).json({ error: 'Zu viele Räume in kurzer Zeit.' });
  const room = G.createRoom(G.newCode((c) => store.has(c)), content.current);
  store.add(room);
  res.json({ code: room.code, key: room.key });
});

app.get('/api/rooms/:code', (req, res) => {
  if (!hit(`lookup:${req.ip}`, 30, 60_000)) return res.status(429).json({ error: 'Zu viele Versuche. Kurz warten.' });
  const room = store.get(req.params.code);
  if (!room) return res.status(404).json({ error: 'Raum nicht gefunden' });
  res.json({ code: room.code, phase: room.phase });
});

app.post('/api/rooms/:code/auskunft', (req, res) => {
  if (!hit(`auskunft:${req.ip}`, 30, 60_000)) return res.status(429).json({ error: 'Zu viele Anfragen.' });
  const room = store.get(req.params.code);
  const p = room && Object.values(room.players).find((x) => x.token && x.token === req.body?.token && !x.kicked);
  if (!p) return res.status(403).json({ error: 'Kein Zugriff' });
  G.useContent(room);
  res.setHeader('Cache-Control', 'no-store');
  res.json(G.auskunft(room, p));
});

app.get('/api/rooms/:code/export.csv', requireTeacher, (req, res) => {
  const room = store.get(req.params.code);
  if (!room || req.query.key !== room.key) return res.status(403).send('Kein Zugriff');
  G.useContent(room);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="bubbl-${room.code}.csv"`);
  res.send(G.exportCsv(room));
});

// ------------------------------------------------------------ Inhalts-Editor + KI-Assistent
const sendErr = (res, e) => res.status(e instanceof Invalid ? 400 : 500).json({ error: e instanceof Invalid ? e.message : 'Serverfehler' });
app.get('/api/content', requireTeacher, (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ content: content.current, ...content.meta(), ai: { available: aiAvailable(), model: AI_MODEL }, jobs: [...jobs.values()].map(jobInfo) });
});
app.put('/api/content', requireTeacher, express.json({ limit: '512kb' }), (req, res) => {
  try { res.json({ content: content.save(req.body?.content, req.body?.note || 'Im Editor bearbeitet'), ...content.meta() }); } catch (e) { sendErr(res, e); }
});
app.post('/api/content/reset', requireTeacher, (_req, res) => { try { res.json({ content: content.reset(), ...content.meta() }); } catch (e) { sendErr(res, e); } });
app.post('/api/content/restore', requireTeacher, (req, res) => { try { res.json({ content: content.restore(req.body?.id), ...content.meta() }); } catch (e) { sendErr(res, e); } });

const jobs = new Map();
const jobInfo = (j) => ({ id: j.id, status: j.status, error: j.error, setId: j.setId, startedAt: j.startedAt, mode: j.mode, topic: j.topic });
const aiLimiter = [];
function startAiJob({ mode, topic, scope, source }) {
  const now = Date.now();
  while (aiLimiter.length && now - aiLimiter[0] > 24 * 3600 * 1000) aiLimiter.shift();
  if (aiLimiter.length >= 40) throw new Invalid('Tageslimit für KI-Anfragen erreicht (40). Bitte morgen erneut versuchen.');
  if ([...jobs.values()].some((j) => j.status === 'running')) throw new Invalid('Es läuft bereits eine KI-Anfrage. Bitte kurz warten.');
  aiLimiter.push(now);
  const job = { id: G.rid(6), status: 'running', startedAt: now, mode, topic };
  jobs.set(job.id, job);
  const abort = new AbortController();
  const killer = setTimeout(() => abort.abort(), 8 * 60 * 1000);
  generateSuggestions({ mode, topic, scope, content: content.current, signal: abort.signal })
    .then((r) => {
      const set = { id: G.rid(6), createdAt: Date.now(), source, mode, topic, summary: r.summary, items: r.items };
      content.addSuggestionSet(set);
      job.status = 'done'; job.setId = set.id;
      if (source === 'auto' && content.data.automation.autoApply && set.items.length) {
        try { content.save(applyItems(content.current, set.items), 'Automatisch übernommen (KI)', 'KI-Automatik'); set.items.forEach((i) => { i.status = 'applied'; }); content.persist(); } catch (e) { console.error('Auto-Übernahme fehlgeschlagen:', e.message); }
      }
    })
    .catch((e) => { job.status = 'error'; job.error = abort.signal.aborted ? 'Die KI hat zu lange gebraucht (über 8 Minuten). Bitte erneut versuchen.' : (e?.message || 'Fehler bei der KI-Anfrage'); console.error('KI-Fehler:', e?.message); })
    .finally(() => clearTimeout(killer))
    .finally(() => setTimeout(() => jobs.delete(job.id), 60 * 60 * 1000).unref());
  return job;
}
app.post('/api/ai/suggest', requireTeacher, (req, res) => {
  if (!aiAvailable()) return res.status(503).json({ error: 'KI ist nicht eingerichtet: Auf dem Server fehlt ANTHROPIC_API_KEY.' });
  const mode = req.body?.mode === 'topic' ? 'topic' : 'refresh';
  const topic = String(req.body?.topic || '').slice(0, 300).trim();
  if (mode === 'topic' && !topic) return res.status(400).json({ error: 'Bitte ein Thema eingeben.' });
  const scope = Array.isArray(req.body?.scope) ? req.body.scope.filter((x) => ['posts', 'ads', 'party', 'quiz'].includes(x)) : [];
  try { res.json(jobInfo(startAiJob({ mode, topic, scope, source: 'manual' }))); } catch (e) { sendErr(res, e); }
});
app.get('/api/ai/jobs/:id', requireTeacher, (req, res) => {
  const j = jobs.get(req.params.id);
  if (!j) return res.status(404).json({ error: 'Auftrag nicht gefunden' });
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ...jobInfo(j), set: j.setId ? content.data.suggestions.find((x) => x.id === j.setId) : null });
});
app.post('/api/ai/apply', requireTeacher, (req, res) => {
  const set = content.data.suggestions.find((x) => x.id === req.body?.setId);
  if (!set) return res.status(404).json({ error: 'Vorschläge nicht gefunden' });
  const ids = new Set(Array.isArray(req.body?.itemIds) ? req.body.itemIds : []);
  const items = set.items.filter((i) => ids.has(i.id) && i.status === 'pending');
  if (!items.length) return res.status(400).json({ error: 'Keine offenen Vorschläge ausgewählt' });
  try {
    const saved = content.save(applyItems(content.current, items), `KI-Vorschläge übernommen (${items.length})`);
    items.forEach((i) => { i.status = 'applied'; }); content.persist();
    res.json({ content: saved, ...content.meta() });
  } catch (e) { sendErr(res, e); }
});
app.post('/api/ai/dismiss', requireTeacher, (req, res) => {
  const set = content.data.suggestions.find((x) => x.id === req.body?.setId);
  if (!set) return res.status(404).json({ error: 'Vorschläge nicht gefunden' });
  const ids = new Set(Array.isArray(req.body?.itemIds) ? req.body.itemIds : set.items.map((i) => i.id));
  set.items.forEach((i) => { if (ids.has(i.id) && i.status === 'pending') i.status = 'dismissed'; });
  content.persist();
  res.json(content.meta());
});
app.put('/api/ai/automation', requireTeacher, (req, res) => {
  const a = content.data.automation;
  if (['off', 'weekly', 'monthly'].includes(req.body?.schedule)) a.schedule = req.body.schedule;
  if (typeof req.body?.autoApply === 'boolean') a.autoApply = req.body.autoApply;
  if (typeof req.body?.focus === 'string') a.focus = req.body.focus.slice(0, 300);
  content.persist();
  res.json(content.meta());
});
// Automatischer Aktualitäts-Check nach Zeitplan (stündlich prüfen, ob fällig)
setInterval(() => {
  const a = content.data.automation;
  if (a.schedule === 'off' || !aiAvailable()) return;
  const every = a.schedule === 'weekly' ? 7 : 30;
  if (Date.now() - (a.lastRun || 0) < every * 24 * 3600 * 1000) return;
  try {
    startAiJob({ mode: 'refresh', topic: a.focus, scope: [], source: 'auto' });
    a.lastRun = Date.now(); content.persist(); // erst nach erfolgreichem Start merken
  } catch (e) { console.error('Automatik:', e.message); }
}, 60 * 60 * 1000).unref();

app.get('/api/qr.svg', async (req, res) => {
  const text = String(req.query.text || '').slice(0, 300);
  if (!text) return res.status(400).end();
  const svg = await QRCode.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0b0b1a', light: '#ffffff' } });
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(svg);
});

const server = http.createServer(app);
const io = new Server(server, { serveClient: true, pingInterval: 20000, pingTimeout: 25000, maxHttpBufferSize: 64 * 1024 });

// ------------------------------------------------------------ Broadcast (gedrosselt, nur bei Änderung)
const pending = new Map();
function schedule(room, { players = true } = {}) {
  store.touch(room);
  const cur = pending.get(room.code);
  if (cur) { cur.players ||= players; return; }
  const entry = { players };
  pending.set(room.code, entry);
  setTimeout(() => { pending.delete(room.code); broadcast(room, entry.players).catch((e) => console.error('Broadcast fehlgeschlagen:', room.code, e)); }, 120);
}
function emitIfChanged(sock, view) {
  const s = JSON.stringify(view);
  if (sock.data.last === s) return;
  sock.data.last = s;
  sock.emit('state', view);
}
async function broadcast(room, includePlayers) {
  if (!store.get(room.code)) return;
  const socks = await io.in(room.code).fetchSockets();
  let staff = null, beamer = null;
  for (const s of socks) {
    const sock = io.sockets.sockets.get(s.id);
    // Befund 1: nur Sockets, die wirklich (noch) zu diesem Raum gehören
    if (!sock || sock.data?.code !== room.code) continue;
    const role = sock.data.role;
    try {
      G.useContent(room);
      if (role === 'teacher') emitIfChanged(sock, staff ||= G.staffView(room));
      else if (role === 'beamer') emitIfChanged(sock, beamer ||= G.staffView(room, { forBeamer: true }));
      else if (role === 'player' && includePlayers) {
        const p = Object.hasOwn(room.players, sock.data.pid) ? room.players[sock.data.pid] : null;
        if (!p || p.kicked) { sock.emit('kicked'); sock.disconnect(true); continue; }
        emitIfChanged(sock, G.playerView(room, p));
      }
    } catch (e) { console.error('Ansicht fehlgeschlagen:', room.code, role, e); }
  }
}

function markOnline(room) {
  const online = new Set();
  for (const s of io.sockets.sockets.values()) if (s.data.code === room.code && s.data.role === 'player') online.add(s.data.pid);
  for (const p of Object.values(room.players)) p.online = online.has(p.id);
}

io.on('connection', (sock) => {
  let msgCount = 0;
  const limiter = setInterval(() => { msgCount = 0; }, 1000);

  sock.on('hello', (msg, ack) => {
    const reply = typeof ack === 'function' ? ack : () => {};
    const ip = sock.handshake.address || 'x';
    if (!hit(`hello:${sock.id}`, 10, 60_000)) return reply({ error: 'Zu viele Anmeldeversuche. Bitte Seite neu laden.' });
    const room = store.get(msg?.code);
    if (!room) { hit(`badcode:${ip}`, 1e9, 60_000); return reply({ error: 'Raum nicht gefunden. Code prüfen!' }); }
    if (peek(`badcode:${ip}`, 60_000) > 30) return reply({ error: 'Zu viele Versuche. Kurz warten.' });
    // Ein Socket gehört immer nur zu genau einem Raum
    if (sock.data?.code && sock.data.code !== room.code) sock.leave(sock.data.code);
    const role = msg.role;
    if (role === 'teacher' || role === 'beamer') {
      if (!auth.isTeacher(sock.handshake.headers.cookie)) return reply({ error: 'Bitte als Lehrkraft anmelden.', auth: true });
      if (msg.key !== room.key) return reply({ error: 'Falscher Lehrkraft-Schlüssel.' });
      sock.data = { code: room.code, role };
    } else {
      let p = msg.token && Object.values(room.players).find((x) => x.token === msg.token);
      if (p?.kicked) return reply({ error: 'Du wurdest aus dem Raum entfernt.' });
      if (!p) {
        if (!msg.join) return reply({ needJoin: true });
        if (sock.data?.joined || !hit(`join:${ip}`, 80, 10 * 60_000)) return reply({ error: 'Zu viele neue Profile von diesem Gerät/Netz. Bitte kurz warten.' });
        if (Object.values(room.players).filter((x) => !x.kicked).length >= 60) return reply({ error: 'Der Raum ist voll.' });
        p = G.actions.join(room, null, { avatar: msg.avatar });
      }
      sock.data = { code: room.code, role: 'player', pid: p.id, joined: true };
      reply({ ok: true, token: p.token, id: p.id });
    }
    if (sock.data.role !== 'player') reply({ ok: true });
    sock.emit('content', room.content || DEFAULT_CONTENT);
    sock.join(room.code);
    markOnline(room);
    sock.data.last = null;
    schedule(room);
  });

  sock.on('act', (msg) => {
    if (++msgCount > 40) return; // einfacher Flood-Schutz
    const { code, role, pid } = sock.data || {};
    const room = code && store.get(code);
    if (!room || !msg || typeof msg.type !== 'string') return;
    const fn = G.actions[msg.type];
    if (!fn || msg.type === 'join') return;
    const isTeacherAction = G.TEACHER_ACTIONS.has(msg.type);
    if (isTeacherAction && role !== 'teacher') return;
    if (!isTeacherAction && role !== 'player') return;
    const p = role === 'player' ? room.players[pid] : null;
    if (role === 'player' && (!p || p.kicked)) return;
    G.useContent(room);
    try { fn(room, p, msg.data || {}); } catch (e) { console.error('Aktion fehlgeschlagen', msg.type, e); return; }
    // Tracking ändert nur die Lehrkraft-/Beamer-Ansicht
    schedule(room, { players: msg.type !== 'track' });
  });

  // Neuestes Inhaltspaket in einen Raum übernehmen (nur in der Lobby, damit nichts kaputtgeht)
  sock.on('useLatestContent', (_msg, ack) => {
    const room = store.get(sock.data?.code);
    const reply = typeof ack === 'function' ? ack : () => {};
    if (!room || sock.data.role !== 'teacher') return reply({ error: 'Kein Zugriff' });
    const started = room.groups || Object.values(room.players).some((p) => p.likes.length || Object.keys(p.ratings).length || p.track.events) || Object.keys(room.quiz?.answers || {}).length;
    if (room.phase !== 'lobby' || started) return reply({ error: 'Nur vor Spielbeginn möglich. Tipp: unter „Raum verwalten“ zuerst „Neue Runde“ starten.' });
    room.content = JSON.parse(JSON.stringify(content.current));
    io.in(room.code).emit('content', room.content);
    for (const s of io.sockets.sockets.values()) if (s.data?.code === room.code) s.data.last = null;
    schedule(room);
    reply({ ok: true });
  });

  sock.on('deleteRoom', (msg) => {
    const room = store.get(sock.data?.code);
    if (!room || sock.data.role !== 'teacher' || msg?.key !== room.key) return;
    io.in(room.code).emit('roomDeleted');
    store.remove(room.code);
  });

  sock.on('disconnect', () => {
    clearInterval(limiter);
    const room = sock.data?.code && store.get(sock.data.code);
    if (room) { markOnline(room); schedule(room); }
  });
});

setInterval(() => store.sweep(), 6 * 60 * 60 * 1000).unref();
const shutdown = () => { store.flushAll(); process.exit(0); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

server.listen(PORT, () => console.log(`bubbl läuft auf http://localhost:${PORT}`));
