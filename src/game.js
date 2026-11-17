// Spiellogik: Zustandsänderungen und Ansichten (Lehrkraft/Beamer/SchülerIn)
import crypto from 'node:crypto';
import {
  CATEGORIES, CAT, POSTS, POST, ROUND1, ADS, AD, PHASES, AVATARS, GROUP_LETTERS,
  PARTY_MESSAGES, INFERENCES,
} from '../public/shared/content.js';

const CAT_IDS = CATEGORIES.map((c) => c.id);
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const rid = (n = 24) => crypto.randomBytes(n).toString('base64url');
export function newCode(exists) {
  for (;;) {
    let c = '';
    for (let i = 0; i < 4; i++) c += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
    if (!exists(c)) return c;
  }
}

export function createRoom(code) {
  const now = Date.now();
  return {
    code, key: rid(18), createdAt: now, updatedAt: now,
    phase: 'lobby',
    enabled: { blase: true, wahl: true },
    settings: { maxLikes: 10, budget: 0, groupCount: 7 },
    nextId: 1,
    players: {},
    groups: null,
    adWork: {},
    voteRevealed: false,
    hiddenNotes: {},
    log: [],
  };
}

// ---------------------------------------------------------------- Hilfen
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const playersOf = (room) => Object.values(room.players).filter((p) => !p.kicked).sort((a, b) => a.id - b.id);
export const activePhases = (room) => PHASES.filter((p) => !p.optional || room.enabled[p.id]);

function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
function shuffle(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function budgetOf(room) {
  const n = playersOf(room).length;
  return room.settings.budget > 0 ? room.settings.budget : Math.max(1, Math.ceil(n / 2));
}

function newPlayer(room, avatar) {
  const id = room.nextId++;
  const used = new Set(playersOf(room).map((p) => p.avatar));
  const av = AVATARS.includes(avatar) ? avatar : (AVATARS.find((a) => !used.has(a)) || AVATARS[id % AVATARS.length]);
  const p = {
    id, token: rid(18), avatar: av, joinedAt: Date.now(), group: null,
    likes: [], feedDone: false,
    track: { dwell: {}, opens: {}, read: {}, events: 0, scrollPx: 0, sessionMs: 0 },
    ratings: {}, inferFb: {},
    bubble: { feed: [], likes: [], explore: 0 },
    vote: null, reflect: { opinion: null, pro: '', con: '' },
  };
  room.players[id] = p;
  if (room.groups) assignLateJoiner(room, p);
  return p;
}

// ---------------------------------------------------------------- Gruppen
export function formGroups(room) {
  const ps = playersOf(room);
  const n = clamp(Math.min(room.settings.groupCount, Math.max(1, ps.length)), 1, 7);
  const groups = Array.from({ length: n }, (_, i) => ({
    id: GROUP_LETTERS[i], cats: [], ads: [], tally: {}, tallyDone: false,
  }));
  CAT_IDS.forEach((c, i) => groups[i % n].cats.push(c));
  ADS.forEach((a, i) => groups[i % n].ads.push(a.id));
  groups.forEach((g) => g.cats.forEach((c) => { g.tally[c] = {}; }));
  ps.forEach((p, i) => { p.group = groups[i % n].id; });
  room.groups = groups;
  room.adWork = Object.fromEntries(ADS.map((a) => [a.id, { cats: [], targets: [], done: false }]));
}
function assignLateJoiner(room, p) {
  const counts = Object.fromEntries(room.groups.map((g) => [g.id, 0]));
  playersOf(room).forEach((q) => { if (q.group && counts[q.group] != null) counts[q.group]++; });
  p.group = Object.entries(counts).sort((a, b) => a[1] - b[1])[0][0];
}
const groupOf = (room, p) => room.groups?.find((g) => g.id === p.group) || null;

// ---------------------------------------------------------------- Analyse
// Wahre Like-Zahlen pro Kategorie
function likeCounts(p) {
  const r = Object.fromEntries(CAT_IDS.map((c) => [c, 0]));
  for (const id of p.likes) if (POST[id]) r[POST[id].cat]++;
  return r;
}
// Verdeckte Signale (Tracking) pro Beitrag -> Punkte
function postSignal(p, postId) {
  const t = p.track;
  const dwell = (t.dwell[postId] || 0) / 1000;
  const read = (t.read[postId] || 0) / 1000;
  return Math.min(dwell, 30) / 6 + (t.opens[postId] ? 1.5 : 0) + Math.min(read, 60) / 12;
}
// Interessenprofil (0..1) nur aus Likes und aus Likes + Tracking
export function profileOf(p) {
  const likes = likeCounts(p);
  const hidden = Object.fromEntries(CAT_IDS.map((c) => [c, 0]));
  for (const post of POSTS) hidden[post.cat] += postSignal(p, post.id);
  for (const id of p.bubble.likes) if (POST[id]) hidden[POST[id].cat] += 2;
  const full = Object.fromEntries(CAT_IDS.map((c) => [c, likes[c] * 3 + hidden[c]]));
  const norm = (o) => { const m = Math.max(0, ...Object.values(o)); return Object.fromEntries(CAT_IDS.map((c) => [c, m ? o[c] / m : 0])); };
  return { likes, likesN: norm(likes), hidden, hiddenN: norm(hidden), full, fullN: norm(full) };
}
const topCat = (o) => { let best = null; for (const c of CAT_IDS) if (o[c] > 0 && (best == null || o[c] > o[best])) best = c; return best; };

function inferencesOf(p, prof) {
  const out = [];
  const ranked = CAT_IDS.filter((c) => prof.full[c] > 0).sort((a, b) => prof.full[b] - prof.full[a]);
  ranked.slice(0, 2).forEach((c, i) => {
    const list = INFERENCES[c];
    out.push({ key: `${c}-0`, cat: c, text: list[0], basis: i === 0 ? 'Hauptinteresse' : 'Zweitinteresse' });
    if (i === 0) out.push({ key: `${c}-1`, cat: c, text: list[1], basis: 'Hauptinteresse' });
  });
  const tl = topCat(prof.likes), th = topCat(prof.hidden);
  if (th && th !== tl) out.push({ key: `secret-${th}`, cat: th, text: `Interessiert sich heimlich für ${CAT[th].name} – liest viel, liked aber wenig`, basis: 'Tracking' });
  const age = (prof.full.technik > 0.4 * Math.max(...Object.values(prof.full))) ? '13–17 Jahre' : '14–19 Jahre';
  out.push({ key: 'age', cat: null, text: `Geschätztes Alter: ${age}`, basis: 'Statistik ähnlicher Profile' });
  const spend = (prof.full.mode + prof.full.technik) > (prof.full.natur + prof.full.umwelt) ? 'hoch' : 'mittel';
  out.push({ key: 'spend', cat: null, text: `Kaufbereitschaft: ${spend}`, basis: 'Mode/Technik-Interesse' });
  return out;
}

function trackingStats(p) {
  const t = p.track;
  const dwellMs = Object.values(t.dwell).reduce((a, b) => a + b, 0);
  const readMs = Object.values(t.read).reduce((a, b) => a + b, 0);
  const opens = Object.values(t.opens).reduce((a, b) => a + b, 0);
  const secretReads = ROUND1
    .filter((post) => !p.likes.includes(post.id))
    .map((post) => ({ id: post.id, ms: (t.dwell[post.id] || 0) + (t.read[post.id] || 0), opened: !!t.opens[post.id] }))
    .filter((x) => x.ms > 3000 || x.opened)
    .sort((a, b) => b.ms - a.ms).slice(0, 3);
  const longest = Object.entries(t.dwell).sort((a, b) => b[1] - a[1])[0];
  return {
    dwellMs, readMs, opens, events: t.events, scrollPx: t.scrollPx, sessionMs: t.sessionMs,
    dataPoints: t.events + p.likes.length + opens + Object.keys(t.dwell).length,
    secretReads, longest: longest ? { id: longest[0], ms: longest[1] } : null,
  };
}

// Datenbank, wie sie die Gruppen in Schritt 2 erstellt haben
function groupDb(room) {
  const db = Object.fromEntries(CAT_IDS.map((c) => [c, {}]));
  for (const g of room.groups || []) for (const c of g.cats) db[c] = { ...(g.tally[c] || {}) };
  return db;
}
function truthDb(room) {
  const db = Object.fromEntries(CAT_IDS.map((c) => [c, {}]));
  for (const p of playersOf(room)) { const l = likeCounts(p); for (const c of CAT_IDS) if (l[c]) db[c][p.id] = l[c]; }
  return db;
}
function tallyAccuracy(room, g) {
  const truth = truthDb(room);
  let cells = 0, ok = 0;
  for (const c of g.cats) {
    const ids = new Set([...Object.keys(truth[c]), ...Object.keys(g.tally[c] || {})]);
    for (const id of ids) { cells++; if ((truth[c][id] || 0) === (g.tally[c]?.[id] || 0)) ok++; }
  }
  return cells ? ok / cells : 1;
}

// Algorithmus: nutzt Likes UND verdeckte Signale, wählt die besten Treffer im Budget
export function algoTargets(room) {
  const budget = budgetOf(room);
  const ps = playersOf(room);
  const profs = Object.fromEntries(ps.map((p) => [p.id, profileOf(p)]));
  const out = {};
  for (const ad of ADS) {
    out[ad.id] = ps
      .map((p) => ({ id: p.id, s: ad.cats.reduce((a, c) => a + profs[p.id].full[c], 0) }))
      .filter((x) => x.s > 0.5)
      .sort((a, b) => b.s - a.s || a.id - b.id)
      .slice(0, budget)
      .map((x) => x.id);
  }
  return out;
}
function humanTargets(room) {
  return Object.fromEntries(ADS.map((a) => [a.id, (room.adWork[a.id]?.targets || []).slice()]));
}
function receivedAds(room, p, human, algo) {
  return ADS.filter((a) => human[a.id]?.includes(p.id) || algo[a.id]?.includes(p.id)).map((a) => a.id);
}

function duel(room, human, algo) {
  const ps = playersOf(room);
  const calc = (T) => {
    let shown = 0, shownRated = 0, hits = 0, interested = 0, reached = 0, wrongMiss = 0;
    for (const p of ps) for (const a of ADS) {
      const r = p.ratings[a.id];
      const t = T[a.id]?.includes(p.id);
      if (t) shown++;
      if (r == null) continue;
      if (t) { shownRated++; if (r > 0) hits++; }
      if (r > 0) { interested++; if (t) reached++; else wrongMiss++; }
    }
    return { shown, shownRated, hits, precision: shownRated ? hits / shownRated : null, interested, reached, recall: interested ? reached / interested : null };
  };
  return { human: calc(human), algo: calc(algo) };
}

function bubbleDiversity(feedIds) {
  const last = feedIds.slice(-9);
  if (!last.length) return { distinct: 0, mix: {}, index: 1 };
  const mix = {};
  for (const id of last) { const c = POST[id]?.cat; if (c) mix[c] = (mix[c] || 0) + 1; }
  let H = 0;
  for (const v of Object.values(mix)) { const q = v / last.length; H -= q * Math.log(q); }
  return { distinct: Object.keys(mix).length, mix, index: H / Math.log(Math.min(7, last.length) || 1) || 0 };
}

// Filterblase: nächste Beiträge nach Interessen-Gewicht
function extendBubbleFeed(room, p, n, explore = false) {
  const prof = profileOf(p);
  const rnd = seeded(p.id * 7919 + p.bubble.feed.length * 31 + p.bubble.likes.length * 17 + 1);
  const seen = new Set(p.bubble.feed);
  for (let k = 0; k < n; k++) {
    let pool = POSTS.filter((x) => !seen.has(x.id));
    if (!pool.length) break;
    if (explore) {
      // Entdecken: bevorzugt Kategorien, die im Feed bisher fehlen
      const mix = bubbleDiversity(p.bubble.feed).mix;
      const rare = pool.filter((x) => !(mix[x.cat] > 0));
      if (rare.length) pool = rare;
      const pick = pool[Math.floor(rnd() * pool.length)];
      p.bubble.feed.push(pick.id); seen.add(pick.id); continue;
    }
    const weights = pool.map((x) => Math.pow(0.08 + prof.fullN[x.cat], 3));
    const sum = weights.reduce((a, b) => a + b, 0);
    let r = rnd() * sum, i = 0;
    for (; i < pool.length - 1; i++) { r -= weights[i]; if (r <= 0) break; }
    p.bubble.feed.push(pool[i].id); seen.add(pool[i].id);
  }
}

// ---------------------------------------------------------------- Aktionen
export const actions = {
  // --- SchülerInnen
  join(room, _p, { avatar }) { return newPlayer(room, avatar); },
  avatar(room, p, { avatar }) { if (AVATARS.includes(avatar)) p.avatar = avatar; },
  like(room, p, { postId }) {
    if (!POST[postId]) return;
    if (room.phase === 'feed') {
      const i = p.likes.indexOf(postId);
      if (i >= 0) p.likes.splice(i, 1);
      else if (p.likes.length < room.settings.maxLikes && POST[postId].round === 1) p.likes.push(postId);
    } else if (room.phase === 'blase') {
      const i = p.bubble.likes.indexOf(postId);
      if (i >= 0) p.bubble.likes.splice(i, 1);
      else { p.bubble.likes.push(postId); extendBubbleFeed(room, p, 2); }
    }
  },
  feedDone(room, p, { done }) { if (room.phase === 'feed') p.feedDone = !!done; },
  track(room, p, d) {
    if (!['feed', 'blase', 'empfang'].includes(room.phase) || !d || typeof d !== 'object') return;
    const t = p.track;
    const addMap = (src, dst, max) => {
      if (!src || typeof src !== 'object') return;
      for (const [k, v] of Object.entries(src)) if (POST[k] && Number.isFinite(v)) dst[k] = (dst[k] || 0) + clamp(v, 0, max);
    };
    addMap(d.dwell, t.dwell, 5000);
    addMap(d.read, t.read, 5000);
    addMap(d.opens, t.opens, 5);
    if (Number.isFinite(d.events)) t.events += clamp(d.events, 0, 500);
    if (Number.isFinite(d.scrollPx)) t.scrollPx += clamp(d.scrollPx, 0, 50000);
    if (Number.isFinite(d.sessionMs)) t.sessionMs += clamp(d.sessionMs, 0, 5000);
  },
  tally(room, p, { cat, id, count }) {
    const g = groupOf(room, p);
    if (room.phase !== 'auswertung' || !g || g.tallyDone || !g.cats.includes(cat)) return;
    if (!room.players[id]) return;
    const v = clamp(Math.round(count) || 0, 0, room.settings.maxLikes);
    if (v) g.tally[cat][id] = v; else delete g.tally[cat][id];
  },
  tallyDone(room, p, { done }) {
    const g = groupOf(room, p);
    if (room.phase === 'auswertung' && g) g.tallyDone = !!done;
  },
  adCats(room, p, { adId, cat }) {
    const g = groupOf(room, p); const w = room.adWork[adId];
    if (room.phase !== 'werbung' || !g?.ads.includes(adId) || !w || w.done || !CAT[cat]) return;
    const i = w.cats.indexOf(cat);
    if (i >= 0) w.cats.splice(i, 1); else w.cats.push(cat);
  },
  adTarget(room, p, { adId, id }) {
    const g = groupOf(room, p); const w = room.adWork[adId];
    if (room.phase !== 'werbung' || !g?.ads.includes(adId) || !w || w.done || !room.players[id]) return;
    const i = w.targets.indexOf(id);
    if (i >= 0) w.targets.splice(i, 1);
    else if (w.targets.length < budgetOf(room)) w.targets.push(id);
  },
  adDone(room, p, { adId, done }) {
    const g = groupOf(room, p); const w = room.adWork[adId];
    if (room.phase === 'werbung' && g?.ads.includes(adId) && w) w.done = !!done;
  },
  rate(room, p, { adId, value }) {
    if (room.phase !== 'empfang' || !AD[adId]) return;
    if (value === 1 || value === -1) p.ratings[adId] = value; else delete p.ratings[adId];
  },
  infer(room, p, { key, value }) {
    if (room.phase !== 'profil' || typeof key !== 'string' || key.length > 40) return;
    if (value === true || value === false) p.inferFb[key] = value; else delete p.inferFb[key];
  },
  more(room, p, { explore }) {
    if (room.phase !== 'blase' || p.bubble.feed.length > 60) return;
    if (explore) p.bubble.explore++;
    extendBubbleFeed(room, p, 3, !!explore);
  },
  vote(room, p, { score }) {
    if (room.phase !== 'wahl') return;
    const s = Math.round(score);
    if (s >= 1 && s <= 5) p.vote = { score: s, cat: partyCat(p) };
  },
  reflect(room, p, { opinion, pro, con }) {
    if (room.phase !== 'reflexion') return;
    if (opinion != null) { const o = Math.round(opinion); if (o >= 1 && o <= 5) p.reflect.opinion = o; }
    if (typeof pro === 'string') p.reflect.pro = pro.slice(0, 140);
    if (typeof con === 'string') p.reflect.con = con.slice(0, 140);
  },

  // --- Lehrkraft
  setPhase(room, _p, { phase }) {
    const list = activePhases(room);
    if (!list.find((x) => x.id === phase)) return;
    room.phase = phase;
    const idx = list.findIndex((x) => x.id === phase);
    if (idx >= list.findIndex((x) => x.id === 'auswertung') && !room.groups) formGroups(room);
    if (phase === 'blase') for (const p of playersOf(room)) if (!p.bubble.feed.length) extendBubbleFeed(room, p, 6);
  },
  regroup(room) { formGroups(room); },
  setGroup(room, _p, { id, group }) {
    const p = room.players[id];
    if (p && room.groups?.find((g) => g.id === group)) p.group = group;
  },
  kick(room, _p, { id }) { if (room.players[id]) room.players[id].kicked = true; },
  settings(room, _p, s) {
    if (Number.isFinite(s.maxLikes)) room.settings.maxLikes = clamp(Math.round(s.maxLikes), 1, 22);
    if (Number.isFinite(s.budget)) room.settings.budget = clamp(Math.round(s.budget), 0, 60);
    if (Number.isFinite(s.groupCount)) room.settings.groupCount = clamp(Math.round(s.groupCount), 1, 7);
    if (s.enabled && typeof s.enabled === 'object') {
      for (const k of ['blase', 'wahl']) if (typeof s.enabled[k] === 'boolean') room.enabled[k] = s.enabled[k];
      if (!activePhases(room).find((x) => x.id === room.phase)) room.phase = 'reflexion';
    }
  },
  autoTally(room) {
    if (!room.groups) formGroups(room);
    const truth = truthDb(room);
    for (const g of room.groups) { for (const c of g.cats) g.tally[c] = { ...truth[c] }; g.tallyDone = true; }
  },
  autoAds(room) {
    if (!room.groups) formGroups(room);
    const db = groupDb(room); const budget = budgetOf(room);
    for (const ad of ADS) {
      const w = room.adWork[ad.id];
      if (w.done) continue;
      if (!w.cats.length) w.cats = ad.cats.slice();
      w.targets = playersOf(room).map((p) => ({ id: p.id, s: w.cats.reduce((a, c) => a + (db[c][p.id] || 0), 0) }))
        .filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, budget).map((x) => x.id);
      w.done = true;
    }
  },
  revealVote(room, _p, { value }) { room.voteRevealed = !!value; },
  hideNote(room, _p, { key, value }) { if (typeof key === 'string') { if (value) room.hiddenNotes[key] = true; else delete room.hiddenNotes[key]; } },
  resetPlayerData(room) {
    for (const p of playersOf(room)) {
      Object.assign(p, {
        likes: [], feedDone: false, ratings: {}, inferFb: {}, vote: null,
        track: { dwell: {}, opens: {}, read: {}, events: 0, scrollPx: 0, sessionMs: 0 },
        bubble: { feed: [], likes: [], explore: 0 }, reflect: { opinion: null, pro: '', con: '' },
      });
    }
    room.groups = null; room.adWork = {}; room.voteRevealed = false; room.hiddenNotes = {}; room.phase = 'lobby';
  },
};
export const TEACHER_ACTIONS = new Set(['setPhase', 'regroup', 'setGroup', 'kick', 'settings', 'autoTally', 'autoAds', 'revealVote', 'hideNote', 'resetPlayerData']);

function partyCat(p) { return topCat(profileOf(p).full) || 'mode'; }

// ---------------------------------------------------------------- Fortschritt
function progress(room, ps) {
  const n = ps.length;
  switch (room.phase) {
    case 'lobby': return { done: n, total: n, label: 'angemeldet' };
    case 'feed': return { done: ps.filter((p) => p.feedDone || p.likes.length >= room.settings.maxLikes).length, total: n, label: 'fertig mit Liken' };
    case 'auswertung': return { done: (room.groups || []).filter((g) => g.tallyDone).length, total: (room.groups || []).length, label: 'Gruppen fertig' };
    case 'werbung': return { done: ADS.filter((a) => room.adWork[a.id]?.done).length, total: ADS.length, label: 'Anzeigen geschaltet' };
    case 'empfang': return { done: ps.filter((p) => ADS.every((a) => p.ratings[a.id] != null)).length, total: n, label: 'haben alles bewertet' };
    case 'profil': return { done: ps.filter((p) => Object.keys(p.inferFb).length >= 3).length, total: n, label: 'haben ihr Profil geprüft' };
    case 'blase': return { done: ps.filter((p) => p.bubble.likes.length >= 3).length, total: n, label: 'haben ≥ 3 Beiträge geliked' };
    case 'wahl': return { done: ps.filter((p) => p.vote).length, total: n, label: 'haben abgestimmt' };
    case 'reflexion': return { done: ps.filter((p) => p.reflect.opinion != null).length, total: n, label: 'haben Stellung genommen' };
    default: return { done: 0, total: n, label: '' };
  }
}

// ---------------------------------------------------------------- Ansichten
export function staffView(room, { forBeamer = false } = {}) {
  const ps = playersOf(room);
  const list = activePhases(room);
  const idx = list.findIndex((x) => x.id === room.phase);
  const at = (id) => idx >= list.findIndex((x) => x.id === id) && list.some((x) => x.id === id);
  const human = humanTargets(room);
  const algo = algoTargets(room);
  const profs = Object.fromEntries(ps.map((p) => [p.id, profileOf(p)]));
  const revealTracking = !forBeamer || at('profil');

  const players = ps.map((p) => {
    const prof = profs[p.id];
    const base = {
      id: p.id, avatar: p.avatar, group: p.group, online: !!p.online,
      likes: p.likes.length, feedDone: p.feedDone,
      rated: Object.keys(p.ratings).length,
      inferDone: Object.keys(p.inferFb).length,
      voted: !!p.vote, reflected: p.reflect.opinion != null,
      bubbleLikes: p.bubble.likes.length,
      likeProfile: prof.likesN,
    };
    if (revealTracking) {
      const ts = trackingStats(p);
      Object.assign(base, {
        fullProfile: prof.fullN, hiddenProfile: prof.hiddenN,
        topLikes: topCat(prof.likes), topHidden: topCat(prof.hidden), topFull: topCat(prof.full),
        dataPoints: ts.dataPoints, dwellMs: ts.dwellMs + ts.readMs, opens: ts.opens,
        inferFb: p.inferFb,
      });
    }
    if (at('blase')) {
      const d = bubbleDiversity(p.bubble.feed);
      Object.assign(base, { bubbleMix: d.mix, bubbleIndex: d.index, bubbleLen: p.bubble.feed.length, explore: p.bubble.explore });
    }
    return base;
  });

  // Likes je Beitrag (nur Runde 1)
  const postLikes = Object.fromEntries(ROUND1.map((x) => [x.id, []]));
  for (const p of ps) for (const id of p.likes) postLikes[id]?.push(p.id);

  const v = {
    code: room.code, phase: room.phase, phases: list.map((x) => x.id), enabled: room.enabled,
    settings: room.settings, budget: budgetOf(room), progress: progress(room, ps),
    players, postLikes,
    totals: { likes: ps.reduce((a, p) => a + p.likes.length, 0) },
    groups: (room.groups || []).map((g) => ({
      id: g.id, cats: g.cats, ads: g.ads, tallyDone: g.tallyDone,
      members: ps.filter((p) => p.group === g.id).map((p) => p.id),
      accuracy: g.tallyDone ? tallyAccuracy(room, g) : null,
      filled: g.cats.reduce((a, c) => a + Object.keys(g.tally[c] || {}).length, 0),
    })),
    voteRevealed: room.voteRevealed,
  };
  if (at('auswertung')) { v.db = groupDb(room); v.truth = truthDb(room); }
  if (at('werbung')) {
    v.adWork = room.adWork;
    v.human = human;
  }
  if (at('empfang') || !forBeamer) {
    v.algo = algo;
    v.duel = duel(room, human, algo);
    v.ratings = Object.fromEntries(ps.map((p) => [p.id, p.ratings]));
  }
  if (revealTracking) {
    const totals = { events: 0, dwellMs: 0, opens: 0, dataPoints: 0, scrollPx: 0 };
    const catLikes = Object.fromEntries(CAT_IDS.map((c) => [c, 0]));
    const catHidden = Object.fromEntries(CAT_IDS.map((c) => [c, 0]));
    const postAttention = Object.fromEntries(ROUND1.map((x) => [x.id, { ms: 0, opens: 0, likes: postLikes[x.id].length }]));
    for (const p of ps) {
      const ts = trackingStats(p);
      totals.events += ts.events; totals.dwellMs += ts.dwellMs + ts.readMs; totals.opens += ts.opens;
      totals.dataPoints += ts.dataPoints; totals.scrollPx += ts.scrollPx;
      for (const c of CAT_IDS) { catLikes[c] += profs[p.id].likes[c]; catHidden[c] += profs[p.id].hidden[c]; }
      for (const x of ROUND1) { postAttention[x.id].ms += (p.track.dwell[x.id] || 0) + (p.track.read[x.id] || 0); postAttention[x.id].opens += p.track.opens[x.id] || 0; }
    }
    let infYes = 0, infNo = 0;
    for (const p of ps) for (const val of Object.values(p.inferFb)) val ? infYes++ : infNo++;
    v.tracking = { totals, catLikes, catHidden, postAttention, infYes, infNo,
      differ: players.filter((x) => x.topLikes && x.topHidden && x.topLikes !== x.topHidden).length };
  }
  if (at('wahl')) {
    const byCat = Object.fromEntries(CAT_IDS.map((c) => [c, { n: 0, sum: 0 }]));
    for (const p of ps) if (p.vote) { byCat[p.vote.cat].n++; byCat[p.vote.cat].sum += p.vote.score; }
    v.wahl = { byCat, votes: ps.filter((p) => p.vote).length };
  }
  if (at('reflexion')) {
    const hist = [0, 0, 0, 0, 0];
    const notes = [];
    for (const p of ps) {
      if (p.reflect.opinion) hist[p.reflect.opinion - 1]++;
      for (const kind of ['pro', 'con']) {
        const text = p.reflect[kind].trim();
        const key = `${p.id}-${kind}`;
        if (text && (!forBeamer || !room.hiddenNotes[key])) notes.push({ key, kind, text, id: p.id, avatar: p.avatar, hidden: !!room.hiddenNotes[key] });
      }
    }
    v.reflexion = { hist, notes };
  }
  return v;
}

export function playerView(room, p) {
  const list = activePhases(room);
  const phase = room.phase;
  const g = groupOf(room, p);
  const v = {
    code: room.code, phase, phases: list.map((x) => x.id), settings: room.settings,
    me: { id: p.id, avatar: p.avatar, group: p.group, likes: p.likes, feedDone: p.feedDone },
  };
  if (phase === 'feed' || phase === 'lobby') v.feed = feedOrder(p.id);
  if (g && ['auswertung', 'werbung'].includes(phase)) {
    const members = playersOf(room).filter((q) => q.group === g.id).map((q) => ({ id: q.id, avatar: q.avatar, online: !!q.online }));
    v.group = { id: g.id, cats: g.cats, ads: g.ads, members, tallyDone: g.tallyDone };
  }
  if (phase === 'auswertung' && g) {
    const postLikes = {};
    for (const q of playersOf(room)) for (const id of q.likes) if (g.cats.includes(POST[id]?.cat)) (postLikes[id] ||= []).push(q.id);
    v.group.postLikes = postLikes;
    v.group.tally = Object.fromEntries(g.cats.map((c) => [c, g.tally[c] || {}]));
    v.ids = playersOf(room).map((q) => q.id);
  }
  if (phase === 'werbung' && g) {
    v.db = groupDb(room);
    v.ids = playersOf(room).map((q) => q.id);
    v.budget = budgetOf(room);
    v.adWork = Object.fromEntries(g.ads.map((a) => [a, room.adWork[a]]));
  }
  if (phase === 'empfang') {
    v.received = receivedAds(room, p, humanTargets(room), algoTargets(room));
    v.ratings = p.ratings;
  }
  if (phase === 'profil') {
    const prof = profileOf(p);
    v.profile = {
      likesN: prof.likesN, fullN: prof.fullN, likes: prof.likes,
      stats: trackingStats(p), inferences: inferencesOf(p, prof), fb: p.inferFb,
      received: receivedAds(room, p, humanTargets(room), algoTargets(room)),
    };
  }
  if (phase === 'blase') {
    v.bubble = { feed: p.bubble.feed, likes: p.bubble.likes, diversity: bubbleDiversity(p.bubble.feed) };
  }
  if (phase === 'wahl') {
    v.wahl = { cat: p.vote?.cat || partyCat(p), vote: p.vote?.score || null, revealed: room.voteRevealed };
    if (room.voteRevealed) {
      const counts = Object.fromEntries(CAT_IDS.map((c) => [c, 0]));
      for (const q of playersOf(room)) counts[q.vote?.cat || partyCat(q)]++;
      v.wahl.counts = counts;
    }
  }
  if (phase === 'reflexion') v.reflect = p.reflect;
  return v;
}

// Für einen gemischten Feed in Schritt 1: Reihenfolge pro Person zufällig, aber stabil
export function feedOrder(id) { return shuffle(ROUND1.map((x) => x.id), seeded(id * 104729 + 7)); }

// CSV-Export (Datenbank nach Original-Tabelle 02_Auswertung)
export function exportCsv(room) {
  const ps = playersOf(room);
  const head = ['ID', 'Avatar', 'Gruppe', ...CATEGORIES.map((c) => `Likes ${c.name}`), ...CATEGORIES.map((c) => `Profil ${c.name} (mit Tracking)`), 'Verweildauer s', 'Datenpunkte', ...ADS.map((a) => `Bewertung ${a.label}`), 'Wahl-Sympathie', 'Meinung (1-5)', 'Pro', 'Contra'];
  const rows = ps.map((p) => {
    const prof = profileOf(p); const ts = trackingStats(p);
    return [p.id, p.avatar, p.group || '', ...CAT_IDS.map((c) => prof.likes[c]), ...CAT_IDS.map((c) => prof.fullN[c].toFixed(2)),
      Math.round((ts.dwellMs + ts.readMs) / 1000), ts.dataPoints, ...ADS.map((a) => p.ratings[a.id] ?? ''), p.vote?.score ?? '',
      p.reflect.opinion ?? '', p.reflect.pro, p.reflect.con];
  });
  const esc = (x) => { const s = String(x ?? ''); return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return '﻿' + [head, ...rows].map((r) => r.map(esc).join(';')).join('\n');
}
export { playersOf };
