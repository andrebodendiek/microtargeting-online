// Simuliert eine Klasse (Bots), z. B. zum Testen oder für eine Vorführung.
// Aufruf: node scripts/simulate.js <URL> <RAUMCODE> [Anzahl=16]
import { io } from 'socket.io-client';
import { CATEGORIES, ROUND1, ADS, AVATARS, POST } from '../public/shared/content.js';

const [url = 'http://localhost:3000', code, nArg = '16'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!code) { console.log('Aufruf: node scripts/simulate.js <URL> <RAUMCODE> [Anzahl]'); process.exit(1); }
const N = Number(nArg);
const cats = CATEGORIES.map((c) => c.id);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Bot {
  constructor(i) {
    this.fav = [pick(cats), pick(cats)];
    this.secret = pick(cats);
    this.avatar = AVATARS[i % AVATARS.length];
    this.state = null;
    this.s = io(url, { transports: ['websocket'] });
    this.s.on('state', (st) => { this.state = st; this.react(); });
    this.ready = new Promise((res) => this.s.on('connect', () => this.s.emit('hello', { code, role: 'player', join: true, avatar: this.avatar, token: this.token }, (r) => { this.token = r.token; this.id = r.id; res(); })));
    this.done = {};
  }
  act(type, data) { this.s.emit('act', { type, data }); }
  async react() {
    const st = this.state; const ph = st.phase;
    if (this.done[ph]) return; this.done[ph] = true;
    await sleep(200 + Math.random() * 1500);
    if (ph === 'feed') {
      const likes = ROUND1.filter((p) => this.fav.includes(p.cat) || Math.random() < 0.12).slice(0, st.settings.maxLikes);
      for (const p of likes) { this.act('like', { postId: p.id }); await sleep(80); }
      const dwell = {}; const opens = {}; const read = {};
      for (const p of ROUND1) dwell[p.id] = 800 + Math.random() * 2500 + (p.cat === this.secret ? 4000 : 0) + (this.fav.includes(p.cat) ? 2000 : 0);
      for (const p of ROUND1.filter((p) => p.cat === this.secret)) { opens[p.id] = 1; read[p.id] = 4000 + Math.random() * 4000; }
      this.act('track', { dwell, opens, read, events: 60 + Math.floor(Math.random() * 80), scrollPx: 20000 + Math.random() * 30000, sessionMs: 3000 });
      if (Math.random() < 0.8) this.act('feedDone', { done: true });
    }
    if (ph === 'empfang') {
      for (const a of ADS) { const fits = a.cats.some((c) => this.fav.includes(c) || c === this.secret); this.act('rate', { adId: a.id, value: fits ? (Math.random() < 0.85 ? 1 : -1) : (Math.random() < 0.2 ? 1 : -1) }); await sleep(50); }
    }
    if (ph === 'blase') {
      for (let k = 0; k < 5; k++) {
        await sleep(700);
        const b = this.state?.bubble; if (!b) continue;
        const target = b.feed.find((id) => !b.likes.includes(id) && (this.fav.includes(POST[id].cat) || Math.random() < 0.2));
        if (target) this.act('like', { postId: target }); else this.act('more', {});
      }
      if (Math.random() < 0.25) this.act('more', { explore: true });
    }
    if (ph === 'fairness') {
      this.act('fairAnswer', { key: 'interest', value: Math.random() < 0.55 });
      await sleep(300);
      this.act('fairAnswer', { key: 'fair', value: Math.random() < 0.3 });
    }
    if (ph === 'wahl') this.act('vote', { score: 1 + Math.floor(Math.random() * 5) });
    if (ph === 'reflexion') {
      const pros = ['Ich sehe Werbung, die mich interessiert', 'Weniger nervige Werbung', 'Firmen sparen Geld', 'Man entdeckt passende Produkte'];
      const cons = ['Man wird überwacht', 'Parteien können manipulieren', 'Ich lande in einer Blase', 'Daten werden verkauft', 'Klischees und falsche Vermutungen'];
      this.act('reflect', { opinion: 1 + Math.floor(Math.random() * 5), pro: Math.random() < 0.5 ? pick(pros) : '', con: Math.random() < 0.7 ? pick(cons) : '' });
    }
  }
}

const bots = Array.from({ length: N }, (_, i) => new Bot(i));
await Promise.all(bots.map((b) => b.ready));
console.log(`${N} Bots im Raum ${code}.`);
// Profil-Rückmeldungen und Gruppenarbeit über eigene Listener
for (const b of bots) b.s.on('state', async (st) => {
  if (st.phase === 'quiz' && st.quiz?.open && st.quiz.mine == null && b.qa !== st.quiz.idx) {
    b.qa = st.quiz.idx; await sleep(1500 + Math.random() * 6000);
    b.act('quizAnswer', { idx: st.quiz.idx, a: Math.random() < 0.6 ? 1 : Math.floor(Math.random() * 4) });
  }
  if (st.phase === 'werkbank' && st.group && !b.wb && st.group.members[0]?.id === b.id) {
    b.wb = true; await sleep(800);
    for (let k = 0; k < 3; k++) { b.act('weights', { weights: { like: 1 + Math.round(Math.random() * 6) / 2, dwell: Math.round(Math.random() * 8) / 2, open: Math.round(Math.random() * 4) / 2, read: Math.round(Math.random() * 4) / 2, threshold: 0 } }); await sleep(700); }
  }
  if (st.phase === 'profil' && st.profile && !b.inf) { b.inf = true; for (const i of st.profile.inferences) b.act('infer', { key: i.key, value: Math.random() < 0.55 }); }
  if (st.phase === 'auswertung' && st.group && !b.tal && st.group.members[0]?.id === b.id) {
    b.tal = true; await sleep(800);
    for (const c of st.group.cats) {
      const counts = {};
      for (const [pid, ids] of Object.entries(st.group.postLikes)) if (ROUND1.find((p) => p.id === pid)?.cat === c) for (const id of ids) counts[id] = (counts[id] || 0) + 1;
      for (const [id, n] of Object.entries(counts)) { b.act('tally', { cat: c, id: Number(id), count: Math.random() < 0.08 ? n + 1 : n }); await sleep(60); }
    }
    b.act('tallyDone', { done: true });
  }
  if (st.phase === 'werbung' && st.group && st.adWork && !b.adv && st.group.members[0]?.id === b.id) {
    b.adv = true; await sleep(1000);
    for (const adId of st.group.ads) {
      const ad = ADS.find((a) => a.id === adId);
      const chosen = Math.random() < 0.7 ? ad.cats : [ad.cats[0]];
      for (const c of chosen) { b.act('adCats', { adId, cat: c }); await sleep(60); }
      const ranked = st.ids.map((id) => ({ id, s: chosen.reduce((a, c) => a + (st.db[c]?.[id] || 0), 0) })).filter((x) => x.s > 0).sort((a, b2) => b2.s - a.s).slice(0, st.budget);
      for (const x of ranked) { b.act('adTarget', { adId, id: x.id }); await sleep(60); }
      b.act('adDone', { adId, done: true });
    }
  }
});
process.on('SIGINT', () => process.exit(0));
