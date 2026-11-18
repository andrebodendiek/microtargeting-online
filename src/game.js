// Spiellogik: Zustandsänderungen und Ansichten (Lehrkraft/Beamer/SchülerIn)
import crypto from 'node:crypto';
import {
  CATEGORIES, CAT, POSTS, POST, ROUND1, ADS, AD, PHASES, AVATARS, GROUP_LETTERS,
  PARTY, PARTY_MESSAGES, INFERENCES, QUIZ, FAIRNESS, PAUSES, PAGES, applyContent, DEFAULT_CONTENT,
} from '../public/shared/content.js';
import { normalizeAvatar, randomAvatar } from '../public/shared/avatar.js';

export const OPTIONAL_PHASES = PHASES.filter((p) => p.optional).map((p) => p.id);

// Inhaltspaket des Raums aktivieren. Alle Aktionen und Ansichten laufen synchron,
// daher genügt es, das Paket vor jedem Zugriff auf einen Raum einzusetzen.
export function useContent(room) {
  applyContent(room?.content || DEFAULT_CONTENT);
  if (room && !room.quiz) { // ältere gespeicherte Räume ergänzen
    room.quiz = { idx: -1, open: false, revealed: false, startedAt: 0, answers: {} };
    room.werkbankTest ??= false; room.fairRule ??= false;
  }
}

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

export function createRoom(code, content = null) {
  const now = Date.now();
  return {
    code, key: rid(18), createdAt: now, updatedAt: now,
    content: content ? JSON.parse(JSON.stringify(content)) : null,
    phase: 'lobby',
    enabled: Object.fromEntries(OPTIONAL_PHASES.map((id) => [id, true])),
    settings: { maxLikes: 10, budget: 0, groupCount: 7 },
    nextId: 1,
    players: {},
    groups: null,
    adWork: {},
    voteRevealed: false,
    hiddenNotes: {},
    werkbankTest: false,
    fairRule: false,
    quiz: { idx: -1, open: false, revealed: false, startedAt: 0, answers: {} },
    pause: null, pauseAnswers: {},
    shortsStopped: false,
  };
}
export const QUIZ_SECONDS = 20;

// ---------------------------------------------------------------- Hilfen
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Nur echte, aktive Spieler-IDs (Zahl, eigener Schlüssel, nicht entfernt)
const validPid = (room, id) => Number.isInteger(id) && Object.hasOwn(room.players, id) && !room.players[id].kicked;
const playersOf = (room) => Object.values(room.players).filter((p) => !p.kicked).sort((a, b) => a.id - b.id);
export const activePhases = (room) => PHASES.filter((p) => !p.optional || room.enabled[p.id] !== false);

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

// ---------------------------------------------------------------- Registrierung (simuliert)
// Nur der Namensteil der Adresse wird angenommen – @bubbl.mail ist fest, echte Adressen sind so nicht eingebbar.
export const MAIL_DOMAIN = 'bubbl.mail';
const LOCAL_RE = /^[a-z0-9][a-z0-9._-]{1,19}$/;
export class JoinError extends Error {}
export function checkRegistration(room, reg = {}) {
  const local = String(reg.email || '').trim().toLowerCase().replace(/@.*$/, '');
  if (!LOCAL_RE.test(local)) throw new JoinError('Bitte eine Adresse mit 2–20 Zeichen (a–z, 0–9, Punkt, Minus) ausdenken.');
  if (playersOf(room).some((q) => q.email === `${local}@${MAIL_DOMAIN}`)) throw new JoinError('Diese Adresse ist schon vergeben – bitte eine andere ausdenken.');
  const year = Number(reg.birthYear);
  const nowY = new Date().getFullYear();
  const birthYear = Number.isInteger(year) && year >= nowY - 25 && year <= nowY - 8 ? year : null;
  const c = reg.consent && typeof reg.consent === 'object' ? reg.consent : {};
  if (c.agb !== true) throw new JoinError('Ohne Zustimmung zu den AGB geht es nicht weiter.');
  return {
    email: `${local}@${MAIL_DOMAIN}`, name: local.split(/[._-]/)[0] || local, birthYear,
    avatar: normalizeAvatar(reg.avatar) || randomAvatar(),
    consent: { agb: true, newsletter: c.newsletter !== false, agbOpened: c.agbOpened === true, agbMs: clamp(Math.round(Number(c.agbMs) || 0), 0, 3_600_000) },
  };
}

function newPlayer(room, reg) {
  const id = room.nextId++;
  const r = reg && reg.email ? reg : { email: null, name: `nutzer${id}`, birthYear: null, avatar: normalizeAvatar(reg?.avatar) || randomAvatar(), consent: { agb: true, newsletter: true, agbOpened: false, agbMs: 0 } };
  const p = {
    id, token: rid(18), avatar: r.avatar, email: r.email, name: r.name, birthYear: r.birthYear, consent: r.consent, mailRead: {},
    joinedAt: Date.now(), group: null,
    likes: [], feedDone: false,
    track: { dwell: {}, opens: {}, read: {}, events: 0, scrollPx: 0, sessionMs: 0 },
    ratings: {}, inferFb: {},
    bubble: { feed: [], likes: [], explore: 0 },
    vote: null, reflect: { opinion: null, pro: '', con: '' },
    trackLog: [], fair: {},
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
    id: GROUP_LETTERS[i], cats: [], ads: [],
    weights: { ...START_WEIGHTS },
  }));
  CAT_IDS.forEach((c, i) => groups[i % n].cats.push(c));
  ADS.forEach((a, i) => groups[i % n].ads.push(a.id));
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

// ---------------------------------------------------------------- Algorithmus-Werkbank
// Signale je Person und Kategorie: Likes, Verweildauer (je 10 s), Artikel geöffnet, Lesezeit (je 10 s)
export const START_WEIGHTS = { like: 1, dwell: 0, open: 0, read: 0, threshold: 0 };
export const WEIGHT_KEYS = ['like', 'dwell', 'open', 'read', 'threshold'];
function features(p) {
  const f = Object.fromEntries(CAT_IDS.map((c) => [c, { like: 0, dwell: 0, open: 0, read: 0 }]));
  for (const id of p.likes) if (POST[id]) f[POST[id].cat].like++;
  for (const post of ROUND1) {
    const x = f[post.cat]; const t = p.track;
    x.dwell += Math.min(30, (t.dwell[post.id] || 0) / 1000) / 10;
    x.open += t.opens[post.id] ? 1 : 0;
    x.read += Math.min(60, (t.read[post.id] || 0) / 1000) / 10;
  }
  return f;
}
// Trainingsdaten = erste vier Anzeigen, Testdaten = restliche (unbekannte) Anzeigen
export const splitAds = () => ({ train: ADS.slice(0, 4).map((a) => a.id), test: ADS.slice(4).map((a) => a.id) });
function targetsByWeights(room, w) {
  const budget = budgetOf(room);
  const ps = playersOf(room);
  const feats = Object.fromEntries(ps.map((p) => [p.id, features(p)]));
  const out = {};
  for (const ad of ADS) {
    out[ad.id] = ps.map((p) => {
      let s = 0;
      for (const c of ad.cats) { const x = feats[p.id][c]; s += w.like * x.like + w.dwell * x.dwell + w.open * x.open + w.read * x.read; }
      return { id: p.id, s };
    }).filter((x) => x.s > 0 && x.s > w.threshold).sort((a, b) => b.s - a.s || a.id - b.id).slice(0, budget).map((x) => x.id);
  }
  return out;
}
function scoreTargets(room, T, adIds) {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  for (const p of playersOf(room)) for (const a of adIds) {
    const r = p.ratings[a]; if (r == null) continue;
    const shown = !!T[a]?.includes(p.id);
    if (shown && r > 0) tp++; else if (shown) fp++; else if (r > 0) fn++; else tn++;
  }
  const precision = tp + fp ? tp / (tp + fp) : null;
  const recall = tp + fn ? tp / (tp + fn) : null;
  const f1 = precision && recall ? (2 * precision * recall) / (precision + recall) : (precision === 0 || recall === 0 ? 0 : null);
  return { tp, fp, fn, tn, precision, recall, f1 };
}
function werkbankResult(room, w) {
  const T = targetsByWeights(room, w); const { train, test } = splitAds();
  return { train: scoreTargets(room, T, train), test: scoreTargets(room, T, test) };
}
function werkbankBaselines(room) {
  const { train, test } = splitAds();
  const human = humanTargets(room); const algo = algoTargets(room);
  return {
    human: { train: scoreTargets(room, human, train), test: scoreTargets(room, human, test) },
    algo: { train: scoreTargets(room, algo, train), test: scoreTargets(room, algo, test) },
  };
}

// ---------------------------------------------------------------- Fairness-Check
function fairnessTargets(room) {
  const budget = budgetOf(room);
  const ps = playersOf(room);
  const scored = ps.map((p) => { const pr = profileOf(p); return { id: p.id, s: (FAIRNESS.proxyCats || []).reduce((a, c) => a + (pr.full[c] || 0), 0), top: topCat(pr.full) || 'none' }; });
  if (!room.fairRule) return scored.filter((x) => x.s > 0).sort((a, b) => b.s - a.s || a.id - b.id).slice(0, budget).map((x) => x.id);
  // Fairness-Regel: Budget reihum auf alle Interessengruppen verteilen
  const byTop = {};
  for (const x of scored.sort((a, b) => b.s - a.s || a.id - b.id)) (byTop[x.top] ||= []).push(x.id);
  const queues = Object.values(byTop); const out = [];
  while (out.length < budget && queues.some((q) => q.length)) for (const q of queues) if (q.length && out.length < budget) out.push(q.shift());
  return out;
}

// ---------------------------------------------------------------- Live-Quiz
function quizScores(room) {
  const scores = {};
  for (const [qi, ans] of Object.entries(room.quiz.answers || {})) {
    const q = QUIZ[qi]; if (!q) continue;
    for (const [pid, a] of Object.entries(ans)) {
      if (a.a === q.correct) scores[pid] = (scores[pid] || 0) + 500 + Math.max(0, Math.round(500 * (1 - a.ms / (QUIZ_SECONDS * 1000))));
      else scores[pid] = scores[pid] || 0;
    }
  }
  return scores;
}

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

// Automatisch erstellte Datenbank: Likes je Person und Kategorie
function likeDb(room) {
  const db = Object.fromEntries(CAT_IDS.map((c) => [c, {}]));
  for (const p of playersOf(room)) { const l = likeCounts(p); for (const c of CAT_IDS) if (l[c]) db[c][p.id] = l[c]; }
  return db;
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

// ---------------------------------------------------------------- bubbl-Postfach (simulierte E-Mails)
// Mails ergeben sich aus dem Spielstand: Phase erreicht + Profil + Einwilligung. Nichts wird wirklich verschickt.
const DISCOUNTS = ['BUBBL20', 'NURHEUTE15', 'FUERDICH10', 'TOPDEAL25'];
export function mailsFor(room, p) {
  const at = room.phaseAt || {};
  const name = p.name || `nutzer${p.id}`;
  const prof = profileOf(p);
  const top = topCat(prof.full); const topH = topCat(prof.hidden);
  const out = [];
  const add = (m) => out.push({ ...m, read: !!p.mailRead?.[m.id] });
  // Newsletter-Zustand zu einem Zeitpunkt (spätere Abmeldung löscht bereits empfangene Mails nicht)
  const sub = (t) => p.consent?.newsletter !== false || (p.consent?.unsubAt && p.consent.unsubAt > t);
  add({ id: 'welcome', at: p.joinedAt, kind: 'welcome', from: 'bubbl Team', fromIcon: 'bubbl', subject: `Willkommen bei bubbl, ${name}! 🎉`, preview: 'Bestätige jetzt deine E-Mail-Adresse und entdecke Beiträge, die zu dir passen.' });
  if (at.auswertung && top && sub(at.auswertung)) {
    const recs = POSTS.filter((x) => x.cat === top && !p.likes.includes(x.id)).slice(0, 2).map((x) => x.id);
    add({ id: 'recs', at: at.auswertung, kind: 'recs', from: 'bubbl', fromIcon: 'bubbl', subject: `${name}, das hier wird dir gefallen 👀`, preview: `Neue Beiträge zu ${CAT[top].name} – ausgewählt nur für dich.`, data: { cat: top, posts: recs } });
  }
  if (at.empfang) {
    if (sub(at.empfang)) {
      const rec = receivedAds(room, p, humanTargets(room), algoTargets(room));
      rec.forEach((adId, i) => {
        const ad = AD[adId]; if (!ad) return;
        const code = DISCOUNTS[(p.id + i) % DISCOUNTS.length];
        add({ id: `ad-${adId}`, at: at.empfang + (i + 1) * 1000, kind: 'ad', from: ad.brand, fromIcon: 'ad', subject: `${name}, ${code.match(/\d+/)} % Rabatt nur für dich – nur heute! ⏰`, preview: `${ad.product}: ${ad.slogan}`, data: { ad: adId, code, cats: ad.cats.filter((c) => prof.full[c] > 0) } });
      });
    } else {
      add({ id: 'nooffers', at: at.empfang, kind: 'nooffers', from: 'bubbl', fromIcon: 'bubbl', subject: `Schade, ${name} 🥺 Bist du dir sicher?`, preview: 'Du verpasst exklusive Angebote. Mit einem Klick bist du wieder dabei …' });
    }
  }
  if (at.profil && topH && sub(at.profil)) {
    const ms = POSTS.filter((x) => x.cat === topH).reduce((a, x) => a + (p.track.dwell[x.id] || 0) + (p.track.read[x.id] || 0), 0);
    add({ id: 'weekly', at: at.profil, kind: 'weekly', from: 'bubbl', fromIcon: 'bubbl', subject: 'Dein bubbl-Wochenrückblick 📊', preview: `Du hast ${Math.max(1, Math.round(ms / 1000))} Sekunden mit ${CAT[topH].name} verbracht. Wir haben da etwas für dich …`, data: { cat: topH, ms, likes: p.likes.length } });
  }
  if (at.wahl) {
    const cat = p.vote?.cat || top || 'mode';
    add({ id: 'party', at: at.wahl, kind: 'party', from: PARTY.name || 'Partei für Morgen', fromIcon: 'party', subject: `${name}, ${PARTY_MESSAGES[cat]?.title || 'deine Stimme zählt!'}`, preview: PARTY_MESSAGES[cat]?.text || '', data: { cat } });
  }
  if (at.reflexion && sub(at.reflexion)) add({ id: 'miss', at: at.reflexion, kind: 'miss', from: 'bubbl', fromIcon: 'bubbl', subject: `Wir vermissen dich, ${name}! 🥺 Hier sind 10 % für dich`, preview: 'Komm zurück – deine Freunde haben 12 neue Beiträge geliked.' });
  return out.sort((a, b) => b.at - a.at);
}
const isAdMail = (m) => m.kind === 'ad' || m.kind === 'miss' || m.kind === 'recs' || m.kind === 'weekly';

// ---------------------------------------------------------------- Shorts-Feed (Kurzvideos, lernt nur aus der Wiedergabezeit)
export const SHORT_AD_EVERY = 5;
const strHash = (t) => { let h = 2166136261; for (const ch of String(t)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export const shortLen = (id) => 7000 + (strHash(id) % 8) * 1000; // 7–14 s je Clip
function shortsOf(p) { return (p.shorts ||= { count: 0, totalMs: 0, watch: {}, cats: [], ads: 0, adMs: 0, swipes: 0, startedAt: 0, lastAt: 0 }); }
// Gewichte: Je länger ein Thema angeschaut wurde, desto häufiger kommt es (quadratisch → schnelle Verengung)
function shortWeights(s) {
  // Wie echte Plattformen: entscheidend ist der angeschaute Anteil („Completion“), nicht nur die absolute Zeit
  return Object.fromEntries(CAT_IDS.map((c) => [c, (1 + (s.score?.[c] || 0)) ** 1.8]));
}
function pickWeighted(weights, rnd) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = rnd() * total;
  for (const [k, w] of Object.entries(weights)) { r -= w; if (r <= 0) return k; }
  return Object.keys(weights)[0];
}
// Clip an Position idx (deterministisch aus Zustand, damit die Vorschau stabil bleibt)
function shortAt(p, s, idx, weights) {
  const rnd = seeded(strHash(`short:${p.id}:${idx}`)); rnd(); rnd(); // Startwerte durchmischen
  if ((idx + 1) % SHORT_AD_EVERY === 0) {
    const top = topCat(s.watch) || CAT_IDS[idx % CAT_IDS.length];
    const fit = ADS.filter((a) => a.cats.includes(top));
    const ad = (fit.length ? fit : ADS)[Math.floor(rnd() * (fit.length || ADS.length))];
    return { id: `ad:${ad.id}:${idx}`, ad: ad.id, cat: top, ms: 9000, idx };
  }
  // 15 % Erkundung: gelegentlich ein zufälliges Thema, um neue Interessen zu testen
  const cat = rnd() < 0.15 ? CAT_IDS[Math.floor(rnd() * CAT_IDS.length)] : pickWeighted(weights, rnd);
  const pool = POSTS.filter((x) => x.cat === cat);
  const post = pool[(Math.floor(rnd() * pool.length) + idx) % pool.length];
  return { id: `${post.id}:${idx}`, post: post.id, cat, ms: shortLen(post.id), idx };
}
export function nextShorts(p, n = 3) {
  const s = shortsOf(p); const w = shortWeights(s);
  return Array.from({ length: n }, (_, k) => shortAt(p, s, s.count + k, w));
}
// Anteil des eigenen Hauptthemas in einem Fenster der Clip-Folge (Verengung)
function topShare(cats, from, to) {
  const part = cats.slice(from, to).filter((c) => c !== 'ad');
  if (!part.length) return null;
  const counts = {}; for (const c of part) counts[c] = (counts[c] || 0) + 1;
  return Math.max(...Object.values(counts)) / part.length;
}
export function shortsStats(p) {
  const s = shortsOf(p);
  const top = topCat(s.watch);
  const nonAd = s.cats.filter((c) => c !== 'ad');
  return {
    count: s.count, totalMs: s.totalMs, ads: s.ads, adMs: s.adMs, swipes: s.swipes,
    top, topWatchShare: top ? (s.watch[top] || 0) / Math.max(1, Object.values(s.watch).reduce((a, b) => a + b, 0)) : 0,
    firstShare: topShare(s.cats, 0, 8), lastShare: topShare(s.cats, -8), topics: new Set(nonAd.slice(-8)).size,
    curve: Array.from({ length: Math.ceil(s.cats.length / 5) }, (_, i) => topShare(s.cats, i * 5, i * 5 + 5)),
  };
}
const SHORT_BUCKETS = [120000, 240000, 360000]; // Grenzen für die Zeit-Schätzung (2/4/6 Min.)
const timeBucket = (ms) => SHORT_BUCKETS.filter((b) => ms >= b).length;

// ---------------------------------------------------------------- Innehalten (Reflexionsfragen auf alle Handys)
const pauseKey = (phase, i) => `${phase}:${i}`;
function pauseView(room, forPlayer) {
  const pz = room.pause;
  if (!pz || pz.phase !== room.phase) return null;
  const item = PAUSES[pz.phase]?.[pz.i];
  if (!item) return null;
  const ans = room.pauseAnswers?.[pauseKey(pz.phase, pz.i)] || {};
  const counts = item.options.map((_, k) => Object.values(ans).filter((a) => a === k).length);
  const v = { phase: pz.phase, i: pz.i, q: item.q, options: item.options, revealed: !!pz.revealed, answered: Object.keys(ans).length, n: playersOf(room).length,
    insight: pz.revealed ? item.insight : null, correct: pz.revealed && Number.isInteger(item.correct) ? item.correct : null };
  if (!forPlayer || pz.revealed) v.counts = counts;
  if (item.compareTime && pz.revealed) {
    const real = item.options.map(() => 0);
    for (const q of playersOf(room)) if (q.shorts?.count) real[timeBucket(q.shorts.totalMs)]++;
    v.real = real;
  }
  if (forPlayer) { v.my = ans[forPlayer.id] ?? null; if (item.compareTime && pz.revealed) v.myReal = forPlayer.shorts?.totalMs || 0; }
  return v;
}

// ---------------------------------------------------------------- Aktionen
export const actions = {
  // --- SchülerInnen
  join(room, _p, reg) { return newPlayer(room, reg?.email ? checkRegistration(room, reg) : reg); },
  avatar(room, p, { avatar }) { const a = normalizeAvatar(avatar); if (a) p.avatar = a; },
  readMail(room, p, { id }) { if (typeof id === 'string' && id.length <= 40 && mailsFor(room, p).some((m) => m.id === id)) (p.mailRead ||= {})[id] = true; },
  unsubscribe(room, p) { if (p.consent) { p.consent.newsletter = false; p.consent.unsubAt = Date.now(); } },
  like(room, p, { postId }) {
    if (!POST[postId]) return;
    if (room.phase === 'feed') {
      const i = p.likes.indexOf(postId);
      if (i >= 0) { p.likes.splice(i, 1); logTrack(p, 'DELETE /like', { post: postId }); }
      else if (p.likes.length < room.settings.maxLikes && POST[postId].round === 1) { p.likes.push(postId); logTrack(p, 'POST /like', { post: postId }); }
    } else if (room.phase === 'blase') {
      const i = p.bubble.likes.indexOf(postId);
      if (i >= 0) p.bubble.likes.splice(i, 1);
      else { p.bubble.likes.push(postId); extendBubbleFeed(room, p, 2); }
    }
  },
  pauseAnswer(room, p, { value }) {
    const pz = room.pause;
    if (!pz || pz.phase !== room.phase || pz.revealed) return;
    const item = PAUSES[pz.phase]?.[pz.i];
    if (!item || !Number.isInteger(value) || value < 0 || value >= item.options.length) return;
    ((room.pauseAnswers ||= {})[pauseKey(pz.phase, pz.i)] ||= {})[p.id] = value;
  },
  shortWatched(room, p, { id, ms }) {
    if (room.phase !== 'shorts' || room.shortsStopped || typeof id !== 'string' || !Number.isFinite(ms)) return;
    const cur = nextShorts(p, 1)[0];
    if (cur.id !== id) return; // nur der aktuell laufende Clip zählt
    const s = shortsOf(p);
    const t = clamp(Math.round(ms), 0, cur.ms + 500);
    s.startedAt ||= Date.now(); s.lastAt = Date.now();
    s.count++; s.totalMs += t;
    if (t < 2000) s.swipes++;
    if (cur.ad) { s.ads++; s.adMs += t; s.cats.push('ad'); }
    else {
      s.watch[cur.cat] = (s.watch[cur.cat] || 0) + t; s.cats.push(cur.cat);
      const done = t / cur.ms; // 0..1: wie viel vom Clip angeschaut wurde
      (s.score ||= {})[cur.cat] = (s.score[cur.cat] || 0) + done * done * 3;
    }
    if (s.cats.length > 400) s.cats.splice(0, s.cats.length - 400);
    logTrack(p, 'POST /shorts/watch', { clip: cur.post || cur.ad, kategorie: cur.ad ? 'werbung' : cur.cat, watch_ms: t, laenge_ms: cur.ms });
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
    // Protokoll für den Tracking-Inspektor: genau das, was angekommen ist (bereinigt)
    const clean = (m) => Object.fromEntries(Object.entries(m && typeof m === 'object' ? m : {}).filter(([k, v]) => POST[k] && Number.isFinite(v)).map(([k, v]) => [k, Math.round(v)]));
    const num = (v, max) => (Number.isFinite(v) ? clamp(Math.round(v), 0, max) : 0);
    const body = { dwell_ms: clean(d.dwell), read_ms: clean(d.read), opens: clean(d.opens), events: num(d.events, 500), scroll_px: num(d.scrollPx, 50000) };
    for (const k of ['dwell_ms', 'read_ms', 'opens']) if (!Object.keys(body[k]).length) delete body[k];
    logTrack(p, 'POST /track', body);
  },
  adCats(room, p, { adId, cat }) {
    const g = groupOf(room, p); const w = room.adWork[adId];
    if (room.phase !== 'werbung' || !g?.ads.includes(adId) || !w || w.done || !CAT[cat]) return;
    const i = w.cats.indexOf(cat);
    if (i >= 0) w.cats.splice(i, 1); else w.cats.push(cat);
  },
  adTarget(room, p, { adId, id }) {
    const g = groupOf(room, p); const w = room.adWork[adId];
    if (room.phase !== 'werbung' || !g?.ads.includes(adId) || !w || w.done || !validPid(room, id)) return;
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
    if (room.phase !== 'profil' || typeof key !== 'string') return;
    if (!inferencesOf(p, profileOf(p)).some((i) => i.key === key)) return; // nur tatsächlich gezeigte Vermutungen
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

  weights(room, p, { weights }) {
    const g = groupOf(room, p);
    if (room.phase !== 'werkbank' || !g || !weights || typeof weights !== 'object') return;
    g.weights ||= { ...START_WEIGHTS };
    for (const k of WEIGHT_KEYS) if (Number.isFinite(weights[k])) g.weights[k] = clamp(Math.round(weights[k] * 2) / 2, 0, 5);
  },
  fairAnswer(room, p, { key, value }) {
    if (room.phase !== 'fairness' || !['interest', 'fair'].includes(key)) return;
    if (value === true || value === false) p.fair[key] = value; else delete p.fair[key];
  },
  quizAnswer(room, p, { idx, a }) {
    const q = room.quiz; const item = QUIZ[q.idx];
    if (room.phase !== 'quiz' || !q.open || idx !== q.idx || !item || !Number.isInteger(a) || a < 0 || a >= item.options.length) return;
    const ms = Date.now() - q.startedAt;
    if (ms > QUIZ_SECONDS * 1000 + 1500) return;
    const ans = (q.answers[q.idx] ||= {});
    if (ans[p.id]) return;
    ans[p.id] = { a, ms };
  },

  // --- Lehrkraft
  werkbankTest(room, _p, { value }) { room.werkbankTest = !!value; },
  fairRule(room, _p, { value }) { room.fairRule = !!value; },
  quizNext(room) {
    if (room.quiz.idx >= QUIZ.length - 1) { room.quiz.idx = QUIZ.length; room.quiz.open = false; return; }
    Object.assign(room.quiz, { idx: room.quiz.idx + 1, open: true, revealed: false, startedAt: Date.now() });
  },
  quizReveal(room) { if (room.quiz.idx >= 0) Object.assign(room.quiz, { open: false, revealed: true }); },
  quizReset(room) { room.quiz = { idx: -1, open: false, revealed: false, startedAt: 0, answers: {} }; },
  setPhase(room, _p, { phase }) {
    const list = activePhases(room);
    if (!list.find((x) => x.id === phase)) return;
    room.phase = phase;
    room.pause = null;
    (room.phaseAt ||= {})[phase] ??= Date.now();
    const idx = list.findIndex((x) => x.id === phase);
    if (idx >= list.findIndex((x) => x.id === 'auswertung') && !room.groups) formGroups(room);
    if (phase === 'blase') for (const p of playersOf(room)) if (!p.bubble.feed.length) extendBubbleFeed(room, p, 6);
  },
  regroup(room) { formGroups(room); },
  // Innehalten
  pauseStart(room, _p, { i }) {
    if (!Number.isInteger(i) || !PAUSES[room.phase]?.[i]) return;
    room.pause = { phase: room.phase, i, revealed: false, at: Date.now() };
    ((room.pauseAnswers ||= {})[pauseKey(room.phase, i)]) ||= {};
  },
  pauseReveal(room, _p, { value }) { if (room.pause) room.pause.revealed = value !== false; },
  pauseStop(room) { room.pause = null; },
  // Intro-Film synchron auf dem Beamer
  introPlay(room) { room.intro = { at: Date.now() }; },
  introStop(room) { room.intro = null; },
  // Shorts
  shortsStop(room, _p, { value }) { room.shortsStopped = value !== false; },
  setGroup(room, _p, { id, group }) {
    const p = validPid(room, id) ? room.players[id] : null;
    if (p && room.groups?.find((g) => g.id === group)) p.group = group;
  },
  kick(room, _p, { id }) {
    if (!validPid(room, id)) return;
    room.players[id].kicked = true;
    // aus Zielgruppen und Auswertungstabellen entfernen, damit kein Budget blockiert bleibt
    for (const w of Object.values(room.adWork || {})) w.targets = w.targets.filter((x) => x !== id);
  },
  settings(room, _p, s) {
    if (Number.isFinite(s.maxLikes)) room.settings.maxLikes = clamp(Math.round(s.maxLikes), 1, 22);
    if (Number.isFinite(s.budget)) room.settings.budget = clamp(Math.round(s.budget), 0, 60);
    if (Number.isFinite(s.groupCount)) room.settings.groupCount = clamp(Math.round(s.groupCount), 1, 7);
    if (s.enabled && typeof s.enabled === 'object') {
      for (const k of OPTIONAL_PHASES) if (typeof s.enabled[k] === 'boolean') room.enabled[k] = s.enabled[k];
      if (!activePhases(room).find((x) => x.id === room.phase)) room.phase = 'reflexion';
    }
  },
  replayDb(room) { room.dbReplay = (room.dbReplay || 0) + 1; },
  autoAds(room) {
    if (!room.groups) formGroups(room);
    const db = likeDb(room); const budget = budgetOf(room);
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
        trackLog: [], fair: {},
      });
    }
    room.groups = null; room.adWork = {}; room.voteRevealed = false; room.hiddenNotes = {}; room.phase = 'lobby';
    room.werkbankTest = false; room.fairRule = false; actions.quizReset(room);
  },
};
export const TEACHER_ACTIONS = new Set(['setPhase', 'regroup', 'setGroup', 'kick', 'settings', 'replayDb', 'autoAds', 'revealVote', 'hideNote', 'resetPlayerData',
  'werkbankTest', 'fairRule', 'quizNext', 'quizReveal', 'quizReset', 'pauseStart', 'pauseReveal', 'pauseStop', 'shortsStop', 'introPlay', 'introStop']);

function logTrack(p, req, body) {
  (p.trackLog ||= []).push({ t: Date.now(), req, body });
  if (p.trackLog.length > 60) p.trackLog.splice(0, p.trackLog.length - 60);
}

function partyCat(p) { return topCat(profileOf(p).full) || 'mode'; }

// ---------------------------------------------------------------- Fortschritt
function progress(room, ps) {
  const n = ps.length;
  switch (room.phase) {
    case 'lobby': return { done: n, total: n, label: 'angemeldet' };
    case 'feed': return { done: ps.filter((p) => p.feedDone || p.likes.length >= room.settings.maxLikes).length, total: n, label: 'fertig mit Liken' };
    case 'auswertung': return { done: n, total: n, label: 'Profile automatisch erstellt' };
    case 'werbung': return { done: ADS.filter((a) => room.adWork[a.id]?.done).length, total: ADS.length, label: 'Anzeigen geschaltet' };
    case 'empfang': return { done: ps.filter((p) => ADS.every((a) => p.ratings[a.id] != null)).length, total: n, label: 'haben alles bewertet' };
    case 'profil': return { done: ps.filter((p) => Object.keys(p.inferFb).length >= 3).length, total: n, label: 'haben ihr Profil geprüft' };
    case 'blase': return { done: ps.filter((p) => p.bubble.likes.length >= 3).length, total: n, label: 'haben ≥ 3 Beiträge geliked' };
    case 'wahl': return { done: ps.filter((p) => p.vote).length, total: n, label: 'haben abgestimmt' };
    case 'shorts': return { done: ps.filter((p) => (p.shorts?.count || 0) >= 15).length, total: n, label: 'haben ≥ 15 Shorts gesehen' };
    case 'werkbank': return { done: (room.groups || []).filter((g) => WEIGHT_KEYS.some((k) => (g.weights?.[k] ?? START_WEIGHTS[k]) !== START_WEIGHTS[k])).length, total: (room.groups || []).length, label: 'Gruppen experimentieren' };
    case 'fairness': return { done: ps.filter((p) => p.fair?.interest != null && p.fair?.fair != null).length, total: n, label: 'haben geantwortet' };
    case 'quiz': { const a = room.quiz.answers?.[room.quiz.idx] || {}; return { done: room.quiz.idx >= QUIZ.length ? n : Object.keys(a).length, total: n, label: room.quiz.idx >= 0 && room.quiz.idx < QUIZ.length ? `Antworten auf Frage ${room.quiz.idx + 1}/${QUIZ.length}` : room.quiz.idx >= QUIZ.length ? 'Quiz beendet' : 'Quiz startet gleich' }; }
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
      id: p.id, avatar: p.avatar, group: p.group, online: !!p.online, email: forBeamer ? undefined : p.email,
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
      id: g.id, cats: g.cats, ads: g.ads,
      members: ps.filter((p) => p.group === g.id).map((p) => p.id),
    })),
    voteRevealed: room.voteRevealed,
  };
  if (at('auswertung')) {
    v.db = likeDb(room);
    v.dbReplay = room.dbReplay || 0;
    // Rohdaten-Ereignisse für die Live-Entstehung auf dem Beamer (in Like-Reihenfolge je Person)
    v.likeEvents = ps.flatMap((p) => p.likes.filter((id) => POST[id]).map((id) => [p.id, id]));
  }
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
    // Postfach & Einwilligungen (Dark Patterns aufdecken)
    let adMails = 0, newsletter = 0, agbOpened = 0;
    for (const p of ps) { adMails += mailsFor(room, p).filter(isAdMail).length; if (p.consent?.newsletter !== false) newsletter++; if (p.consent?.agbOpened) agbOpened++; }
    v.consent = { adMails, newsletter, agbOpened, n: ps.length };
    v.tracking = { totals, catLikes, catHidden, postAttention, infYes, infNo,
      differ: players.filter((x) => x.topLikes && x.topHidden && x.topLikes !== x.topHidden).length };
  }
  v.pause = pauseView(room, null);
  v.intro = room.intro && Date.now() - room.intro.at < 90_000 ? { at: room.intro.at, now: Date.now() } : null;
  v.pauses = (PAUSES[room.phase] || []).map((x, i) => ({ i, q: x.q, answered: Object.keys(room.pauseAnswers?.[pauseKey(room.phase, i)] || {}).length }));
  if (at('shorts')) {
    const st = ps.map((p) => shortsStats(p)).filter((x) => x.count > 0);
    const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
    const maxLen = Math.max(0, ...st.map((x) => x.curve.length));
    v.shorts = {
      stopped: !!room.shortsStopped, people: st.length,
      count: st.reduce((a, x) => a + x.count, 0), totalMs: st.reduce((a, x) => a + x.totalMs, 0),
      ads: st.reduce((a, x) => a + x.ads, 0), swipes: st.reduce((a, x) => a + x.swipes, 0),
      firstShare: avg(st.map((x) => x.firstShare).filter((x) => x != null)), lastShare: avg(st.map((x) => x.lastShare).filter((x) => x != null)),
      curve: Array.from({ length: Math.min(maxLen, 12) }, (_, i) => avg(st.map((x) => x.curve[i]).filter((x) => x != null))),
      tops: Object.fromEntries(CAT_IDS.map((c) => [c, st.filter((x) => x.top === c).length])),
      maxMs: Math.max(0, ...st.map((x) => x.totalMs)),
    };
  }
  if (at('wahl')) {
    const byCat = Object.fromEntries(CAT_IDS.map((c) => [c, { n: 0, sum: 0 }]));
    for (const p of ps) if (p.vote) { byCat[p.vote.cat].n++; byCat[p.vote.cat].sum += p.vote.score; }
    v.wahl = { byCat, votes: ps.filter((p) => p.vote).length };
  }
  if (at('werkbank') && room.groups) {
    v.werkbank = {
      test: room.werkbankTest, split: splitAds(),
      baselines: werkbankBaselines(room),
      groups: room.groups.map((g) => ({ id: g.id, weights: g.weights || START_WEIGHTS, result: werkbankResult(room, g.weights || START_WEIGHTS) })),
    };
  }
  if (at('fairness')) {
    const T = new Set(fairnessTargets(room));
    const cells = { reached: 0, excluded: 0, waste: 0, none: 0 };
    const byCat = Object.fromEntries([...CAT_IDS, 'none'].map((c) => [c, { n: 0, saw: 0, interested: 0, excluded: 0 }]));
    let fairYes = 0, fairNo = 0;
    for (const p of ps) {
      const saw = T.has(p.id); const i = p.fair?.interest; const c = topCat(profs[p.id].full) || 'none';
      byCat[c].n++; if (saw) byCat[c].saw++;
      if (i === true) { byCat[c].interested++; if (saw) cells.reached++; else { cells.excluded++; byCat[c].excluded++; } }
      if (i === false) { if (saw) cells.waste++; else cells.none++; }
      if (p.fair?.fair === true) fairYes++; if (p.fair?.fair === false) fairNo++;
    }
    v.fairness = { rule: room.fairRule, shown: T.size, cells, byCat, fairYes, fairNo, targets: [...T] };
  }
  if (at('quiz')) {
    const q = room.quiz; const item = QUIZ[q.idx];
    const ans = q.answers?.[q.idx] || {};
    const counts = item ? item.options.map((_, i) => Object.values(ans).filter((a) => a.a === i).length) : [];
    const scores = quizScores(room);
    v.quiz = {
      idx: q.idx, total: QUIZ.length, open: q.open, revealed: q.revealed, startedAt: q.startedAt, seconds: QUIZ_SECONDS, now: Date.now(),
      item: item ? { q: item.q, options: item.options, correct: q.revealed ? item.correct : null, explain: q.revealed ? item.explain : null } : null,
      counts, answered: Object.keys(ans).length,
      leaderboard: ps.map((p) => ({ id: p.id, avatar: p.avatar, score: scores[p.id] || 0 })).sort((a, b) => b.score - a.score || a.id - b.id).slice(0, 10),
    };
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
    me: { id: p.id, avatar: p.avatar, group: p.group, likes: p.likes, feedDone: p.feedDone, email: p.email, name: p.name, newsletter: p.consent?.newsletter !== false },
  };
  if (phase === 'feed' || phase === 'lobby') v.feed = feedOrder(p.id);
  const mails = mailsFor(room, p);
  v.mail = { list: mails, unread: mails.filter((m) => !m.read).length };
  if (g && phase === 'werbung') {
    const members = playersOf(room).filter((q) => q.group === g.id).map((q) => ({ id: q.id, avatar: q.avatar, online: !!q.online }));
    v.group = { id: g.id, cats: g.cats, ads: g.ads, members };
  }
  if (phase === 'auswertung') {
    // Die eigene Zeile der automatisch erstellten Datenbank
    const counts = likeCounts(p);
    const top = topCat(counts);
    const ps = playersOf(room);
    v.dbRow = { counts, top, sameTop: top ? ps.filter((q) => topCat(likeCounts(q)) === top).length : 0, players: ps.length, rows: ps.length * CAT_IDS.length };
  }
  if (phase === 'werbung' && g) {
    v.db = likeDb(room);
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
    v.consentReveal = { newsletter: p.consent?.newsletter !== false, unsub: !!p.consent?.unsubAt, agbOpened: !!p.consent?.agbOpened, agbMs: p.consent?.agbMs || 0, adMails: mails.filter(isAdMail).length, email: p.email };
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
  v.pause = pauseView(room, p);
  v.introOnBeamer = !!(room.intro && Date.now() - room.intro.at < 80_000);
  if (phase === 'shorts') {
    v.shorts = { queue: nextShorts(p, 3), stopped: !!room.shortsStopped, count: shortsOf(p).count };
    if (room.shortsStopped) v.shorts.stats = shortsStats(p);
  }
  if (phase === 'reflexion') v.reflect = p.reflect;
  if (['profil', 'fairness', 'werkbank', 'shorts'].includes(phase)) v.trackLog = (p.trackLog || []).slice(-25);
  if (phase === 'werkbank' && g) {
    const w = g.weights || START_WEIGHTS;
    const members = playersOf(room).filter((q) => q.group === g.id).map((q) => ({ id: q.id, avatar: q.avatar, online: !!q.online }));
    const all = room.groups.map((x) => ({ id: x.id, f1: werkbankResult(room, x.weights || START_WEIGHTS).train.f1 })).sort((a, b) => (b.f1 ?? -1) - (a.f1 ?? -1));
    v.group = { id: g.id, cats: g.cats, ads: g.ads, members };
    v.werkbank = { budget: budgetOf(room), weights: w, result: werkbankResult(room, w), baselines: werkbankBaselines(room), test: room.werkbankTest, split: splitAds(), rank: all.findIndex((x) => x.id === g.id) + 1, groups: all.length };
  }
  if (phase === 'fairness') {
    const saw = fairnessTargets(room).includes(p.id);
    v.fairness = { saw, answers: p.fair || {}, rule: room.fairRule };
  }
  if (phase === 'quiz') {
    const q = room.quiz; const item = QUIZ[q.idx];
    const mine = q.answers?.[q.idx]?.[p.id];
    const scores = quizScores(room);
    const ranking = playersOf(room).map((x) => ({ id: x.id, s: scores[x.id] || 0 })).sort((a, b) => b.s - a.s || a.id - b.id);
    v.quiz = {
      idx: q.idx, total: QUIZ.length, open: q.open, revealed: q.revealed, startedAt: q.startedAt, seconds: QUIZ_SECONDS, now: Date.now(),
      item: item ? { q: item.q, options: item.options, correct: q.revealed ? item.correct : null, explain: q.revealed ? item.explain : null } : null,
      mine: mine ? mine.a : null, score: scores[p.id] || 0, rank: ranking.findIndex((x) => x.id === p.id) + 1, players: ranking.length,
    };
  }
  return v;
}

// Für einen gemischten Feed in Schritt 1: Reihenfolge pro Person zufällig, aber stabil
export function feedOrder(id) { return shuffle(ROUND1.map((x) => x.id), seeded(id * 104729 + 7)); }

// Datenauskunft nach Art. 15 DSGVO (für die eigene ID)
export function auskunft(room, p) {
  const prof = profileOf(p); const ts = trackingStats(p);
  const human = humanTargets(room); const algo = algoTargets(room);
  return {
    titel: 'Auskunft nach Art. 15 DSGVO – bubbl (Unterrichtssimulation)',
    erstellt_am: new Date().toISOString(),
    verantwortlicher: 'bubbl – Microtargeting-Labor (Raum ' + room.code + ')',
    betroffene_person: { nutzer_id: p.id, email: p.email, geburtsjahr: p.birthYear ?? null, beigetreten: new Date(p.joinedAt).toISOString(),
      einwilligungen: { agb: !!p.consent?.agb, newsletter: p.consent?.newsletter !== false, agb_geoeffnet: !!p.consent?.agbOpened, agb_lesezeit_s: Math.round((p.consent?.agbMs || 0) / 1000) } },
    verarbeitungszwecke: ['Personalisierte Werbung (Microtargeting)', 'Empfehlung von Beiträgen (Feed)', 'Politische Werbung'],
    kategorien_von_daten: ['Interaktionen (Likes)', 'Nutzungsverhalten (Verweildauer, geöffnete Artikel, Lesezeit, Scrollen)', 'Abgeleitete Interessen und Vermutungen (Profiling)', 'Bewertungen und Abstimmungen'],
    empfaenger: ['Werbekunden (Gruppen ' + (room.groups || []).map((g) => g.id).join(', ') + ')', 'bubbl-Werbealgorithmus', 'Partei für Morgen (politische Werbung)'],
    speicherdauer: '30 Tage nach der letzten Aktivität im Raum',
    herkunft: 'Direkt bei dir erhoben – größtenteils automatisch, ohne aktive Eingabe',
    automatisierte_entscheidungen_profiling: {
      hinweis: 'Art. 22 DSGVO: Aus deinem Verhalten wurde automatisch ein Interessenprofil berechnet, das bestimmt, welche Werbung du siehst.',
      interessenprofil_nur_likes: prof.likesN, interessenprofil_mit_tracking: prof.fullN,
      vermutungen: inferencesOf(p, prof).map((i) => i.text),
      ausgespielte_werbung: ADS.filter((a) => human[a.id]?.includes(p.id) || algo[a.id]?.includes(p.id)).map((a) => a.product),
    },
    gespeicherte_daten: {
      likes: p.likes.map((id) => POST[id]?.headline || id),
      verweildauer_ms_je_beitrag: p.track.dwell, lesezeit_ms_je_beitrag: p.track.read, geoeffnete_artikel: p.track.opens,
      interaktionen_gesamt: ts.events, gescrollt_px: p.track.scrollPx, datenpunkte_gesamt: ts.dataPoints,
      werbebewertungen: p.ratings, empfangene_mails: mailsFor(room, p).map((m) => ({ von: m.from, betreff: m.subject, gelesen: m.read })), filterblase_likes: p.bubble.likes, shorts: p.shorts ? { angesehen: p.shorts.count, wiedergabezeit_s: Math.round(p.shorts.totalMs / 1000), wiedergabezeit_je_kategorie_ms: p.shorts.watch, werbeclips: p.shorts.ads } : null, wahl_sympathie: p.vote?.score ?? null,
      fairness_antworten: p.fair || {}, reflexion: p.reflect,
      protokoll_letzte_anfragen: (p.trackLog || []).slice(-20),
    },
    deine_rechte: ['Berichtigung (Art. 16)', 'Löschung (Art. 17)', 'Einschränkung der Verarbeitung (Art. 18)', 'Datenübertragbarkeit (Art. 20)', 'Widerspruch gegen Profiling/Direktwerbung (Art. 21)', 'Beschwerde bei der Datenschutzaufsichtsbehörde (Art. 77)'],
  };
}

// CSV-Export (Datenbank nach Original-Tabelle 02_Auswertung)
export function exportCsv(room) {
  const ps = playersOf(room);
  const head = ['ID', 'E-Mail (fiktiv)', 'Gruppe', ...CATEGORIES.map((c) => `Likes ${c.name}`), ...CATEGORIES.map((c) => `Profil ${c.name} (mit Tracking)`), 'Verweildauer s', 'Datenpunkte', ...ADS.map((a) => `Bewertung ${a.label}`), 'Wahl-Sympathie', 'Meinung (1-5)', 'Pro', 'Contra', 'Fairness: interessiert', 'Fairness: fair?', 'Quiz-Punkte'];
  const qs = quizScores(room);
  const rows = ps.map((p) => {
    const prof = profileOf(p); const ts = trackingStats(p);
    return [p.id, p.email || '', p.group || '', ...CAT_IDS.map((c) => prof.likes[c]), ...CAT_IDS.map((c) => prof.fullN[c].toFixed(2)),
      Math.round((ts.dwellMs + ts.readMs) / 1000), ts.dataPoints, ...ADS.map((a) => p.ratings[a.id] ?? ''), p.vote?.score ?? '',
      p.reflect.opinion ?? '', p.reflect.pro, p.reflect.con, p.fair?.interest ?? '', p.fair?.fair ?? '', qs[p.id] ?? ''];
  });
  const esc = (x) => { const s = String(x ?? ''); return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return '﻿' + [head, ...rows].map((r) => r.map(esc).join(';')).join('\n');
}
export { playersOf };
