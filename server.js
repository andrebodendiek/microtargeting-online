import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import QRCode from 'qrcode';
import { Store } from './src/store.js';
import * as G from './src/game.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

const store = new Store(DATA_DIR);
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(express.json({ limit: '32kb' }));

const nm = (p) => path.join(__dirname, 'node_modules', p);
app.use('/vendor/preact', express.static(nm('preact'), { maxAge: '7d' }));
app.use('/vendor/htm', express.static(nm('htm'), { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'], maxAge: '5m' }));

app.get('/healthz', (_req, res) => res.json({ ok: true, rooms: store.rooms.size }));

// Neuen Raum anlegen (Lehrkraft)
const createLimiter = new Map();
app.post('/api/rooms', (req, res) => {
  const ip = req.ip || 'x';
  const now = Date.now();
  const hits = (createLimiter.get(ip) || []).filter((t) => now - t < 60_000);
  if (hits.length >= 10) return res.status(429).json({ error: 'Zu viele Räume in kurzer Zeit.' });
  hits.push(now); createLimiter.set(ip, hits);
  const room = G.createRoom(G.newCode((c) => store.has(c)));
  store.add(room);
  res.json({ code: room.code, key: room.key });
});

app.get('/api/rooms/:code', (req, res) => {
  const room = store.get(req.params.code);
  if (!room) return res.status(404).json({ error: 'Raum nicht gefunden' });
  res.json({ code: room.code, phase: room.phase });
});

app.get('/api/rooms/:code/export.csv', (req, res) => {
  const room = store.get(req.params.code);
  if (!room || req.query.key !== room.key) return res.status(403).send('Kein Zugriff');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="bubbl-${room.code}.csv"`);
  res.send(G.exportCsv(room));
});

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
  setTimeout(() => { pending.delete(room.code); broadcast(room, entry.players); }, 120);
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
    if (!sock) continue;
    const role = sock.data.role;
    if (role === 'teacher') emitIfChanged(sock, staff ||= G.staffView(room));
    else if (role === 'beamer') emitIfChanged(sock, beamer ||= G.staffView(room, { forBeamer: true }));
    else if (role === 'player' && includePlayers) {
      const p = room.players[sock.data.pid];
      if (!p || p.kicked) { sock.emit('kicked'); sock.disconnect(true); continue; }
      emitIfChanged(sock, G.playerView(room, p));
    }
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
    const room = store.get(msg?.code);
    if (!room) return reply({ error: 'Raum nicht gefunden. Code prüfen!' });
    const role = msg.role;
    if (role === 'teacher' || role === 'beamer') {
      if (msg.key !== room.key) return reply({ error: 'Falscher Lehrkraft-Schlüssel.' });
      sock.data = { code: room.code, role };
    } else {
      let p = msg.token && Object.values(room.players).find((x) => x.token === msg.token);
      if (p?.kicked) return reply({ error: 'Du wurdest aus dem Raum entfernt.' });
      if (!p) {
        if (!msg.join) return reply({ needJoin: true });
        if (Object.values(room.players).filter((x) => !x.kicked).length >= 60) return reply({ error: 'Der Raum ist voll.' });
        p = G.actions.join(room, null, { avatar: msg.avatar });
      }
      sock.data = { code: room.code, role: 'player', pid: p.id };
      reply({ ok: true, token: p.token, id: p.id });
    }
    if (sock.data.role !== 'player') reply({ ok: true });
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
    try { fn(room, p, msg.data || {}); } catch (e) { console.error('Aktion fehlgeschlagen', msg.type, e); return; }
    // Tracking ändert nur die Lehrkraft-/Beamer-Ansicht
    schedule(room, { players: msg.type !== 'track' });
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
