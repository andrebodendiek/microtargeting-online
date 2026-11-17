// Inhaltsbibliothek: aktuelles Inhaltspaket, Versionsverlauf, KI-Vorschläge und Automatisierung
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { CATEGORIES, PAGES, DEFAULT_CONTENT } from '../public/shared/content.js';

const CAT_IDS = new Set(CATEGORIES.map((c) => c.id));
const HEX = /^#[0-9a-fA-F]{6}$/;
const ID = /^[a-z0-9_-]{1,24}$/;
const clone = (x) => JSON.parse(JSON.stringify(x));
const newId = (prefix) => `${prefix}${crypto.randomBytes(3).toString('hex')}`;

class Invalid extends Error {}
const str = (v, max, field, { required = true } = {}) => {
  if (v == null || v === '') { if (required) throw new Invalid(`${field} fehlt`); return ''; }
  if (typeof v !== 'string') throw new Invalid(`${field} muss Text sein`);
  const s = v.replace(/\s+/g, ' ').trim();
  if (s.length > max) throw new Invalid(`${field} ist zu lang (max. ${max} Zeichen)`);
  return s;
};
const emojiList = (v, field, min = 1, max = 3) => {
  if (!Array.isArray(v) || v.length < min) throw new Invalid(`${field}: mindestens ${min} Emoji`);
  return v.slice(0, max).map((e, i) => str(e, 16, `${field}[${i}]`));
};
const colors = (v, field) => {
  if (!Array.isArray(v) || v.length !== 2 || !v.every((c) => HEX.test(c))) throw new Invalid(`${field}: zwei Farben im Format #rrggbb`);
  return v.slice();
};
const cats = (v, field, min = 1, max = 3) => {
  if (!Array.isArray(v)) throw new Invalid(`${field}: Liste von Kategorien erwartet`);
  const out = [...new Set(v)].filter((c) => CAT_IDS.has(c));
  if (out.length < min || out.length > max) throw new Invalid(`${field}: ${min}–${max} gültige Kategorien`);
  return out;
};

export function validatePost(p, i = 0) {
  const f = `Beitrag ${p?.id || i + 1}`;
  if (!p || typeof p !== 'object') throw new Invalid(`${f}: ungültig`);
  if (!ID.test(p.id || '')) throw new Invalid(`${f}: ungültige ID`);
  if (!CAT_IDS.has(p.cat)) throw new Invalid(`${f}: unbekannte Kategorie`);
  if (!PAGES[p.page]) throw new Invalid(`${f}: unbekannte Seite`);
  return {
    id: p.id, cat: p.cat, page: p.page, round: p.round === 2 ? 2 : 1,
    time: str(p.time || '1 Std.', 14, `${f} Zeit`), art: emojiList(p.art, `${f} Bild`), bg: colors(p.bg, `${f} Farben`),
    headline: str(p.headline, 100, `${f} Überschrift`), teaser: str(p.teaser, 360, `${f} Anreißer`), body: str(p.body, 700, `${f} Text`),
  };
}
export function validateAd(a, i = 0, { withCats = true } = {}) {
  const f = `Anzeige ${a?.label || i + 1}`;
  if (!a || typeof a !== 'object') throw new Invalid(`${f}: ungültig`);
  if (!ID.test(a.id || '')) throw new Invalid(`${f}: ungültige ID`);
  const out = {
    id: a.id, label: str(a.label, 24, `${f} Kurzname`), brand: str(a.brand, 30, `${f} Marke`), product: str(a.product, 50, `${f} Produkt`),
    slogan: str(a.slogan, 120, `${f} Slogan`), price: str(a.price, 24, `${f} Preis`), cta: str(a.cta || 'Mehr erfahren', 24, `${f} Button`),
    art: emojiList(a.art, `${f} Bild`, 1, 2), bg: colors(a.bg, `${f} Farben`),
  };
  if (withCats) out.cats = cats(a.cats, `${f} Kategorien`);
  return out;
}
export function validateQuiz(q, i = 0) {
  const f = `Quizfrage ${i + 1}`;
  if (!q || typeof q !== 'object') throw new Invalid(`${f}: ungültig`);
  if (!Array.isArray(q.options) || q.options.length !== 4) throw new Invalid(`${f}: genau 4 Antworten`);
  if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3) throw new Invalid(`${f}: richtige Antwort fehlt`);
  return { id: ID.test(q.id || '') ? q.id : newId('q'), q: str(q.q, 160, `${f} Frage`), options: q.options.map((o, k) => str(o, 90, `${f} Antwort ${k + 1}`)), correct: q.correct, explain: str(q.explain, 260, `${f} Erklärung`, { required: false }) };
}

export function validateContent(c) {
  if (!c || typeof c !== 'object') throw new Invalid('Inhalt fehlt');
  const posts = (c.posts || []).map(validatePost);
  const ids = new Set();
  for (const p of posts) { if (ids.has(p.id)) throw new Invalid(`Doppelte Beitrags-ID ${p.id}`); ids.add(p.id); }
  const r1 = posts.filter((p) => p.round === 1);
  for (const cat of CAT_IDS) if (r1.filter((p) => p.cat === cat).length < 2) throw new Invalid(`Kategorie ${cat}: mindestens 2 Beiträge in Runde 1 nötig`);
  if (r1.length > 35) throw new Invalid('Höchstens 35 Beiträge in Runde 1');
  if (posts.length > 90) throw new Invalid('Höchstens 90 Beiträge insgesamt');
  const ads = (c.ads || []).map((a, i) => validateAd(a, i));
  if (ads.length < 5 || ads.length > 8) throw new Invalid('5 bis 8 Werbeanzeigen nötig (für Trainings- und Testdaten)');
  if (new Set(ads.map((a) => a.id)).size !== ads.length) throw new Invalid('Doppelte Anzeigen-ID');
  const party = { name: str(c.party?.name, 40, 'Parteiname'), short: str(c.party?.short, 8, 'Partei-Kürzel'), logo: str(c.party?.logo, 16, 'Partei-Logo'), color: HEX.test(c.party?.color) ? c.party.color : '#7c3aed' };
  const partyMessages = {};
  for (const cat of CAT_IDS) {
    const m = c.partyMessages?.[cat];
    if (!m) throw new Invalid(`Wahlbotschaft für ${cat} fehlt`);
    partyMessages[cat] = { title: str(m.title, 70, `Wahlbotschaft ${cat} Titel`), text: str(m.text, 240, `Wahlbotschaft ${cat} Text`), art: str(m.art, 16, `Wahlbotschaft ${cat} Bild`) };
  }
  const contradictions = (c.contradictions || []).filter((x) => Array.isArray(x) && CAT_IDS.has(x[0]) && CAT_IDS.has(x[1]) && x[0] !== x[1]).slice(0, 4).map((x) => [x[0], x[1], str(x[2], 60, 'Widerspruch')]);
  const quiz = (c.quiz || []).map(validateQuiz);
  if (quiz.length < 3 || quiz.length > 15) throw new Invalid('3 bis 15 Quizfragen nötig');
  const fz = c.fairness || {};
  const fairness = {
    ad: validateAd({ ...fz.ad, id: 'job' }, 0, { withCats: false }),
    proxyCats: cats(fz.proxyCats, 'Fairness: Proxy-Kategorien', 1, 2),
    question: str(fz.question, 160, 'Fairness: Interessensfrage'), fairQuestion: str(fz.fairQuestion, 160, 'Fairness: Fairnessfrage'),
    explain: str(fz.explain, 600, 'Fairness: Erklärung'),
  };
  return { posts, ads, party, partyMessages, contradictions, quiz, fairness };
}

// Vorschläge (KI) auf ein Inhaltspaket anwenden
export function applyItems(content, items) {
  const c = clone(content);
  for (const it of items) {
    const list = { post: c.posts, ad: c.ads, quiz: c.quiz }[it.kind];
    if (list) {
      const idx = it.target_id ? list.findIndex((x) => x.id === it.target_id) : -1;
      if (it.action === 'remove') { if (idx >= 0) list.splice(idx, 1); continue; }
      const data = clone(it[it.kind === 'quiz' ? 'quiz' : it.kind]);
      if (!data) continue;
      if (it.action === 'replace' && idx >= 0) {
        data.id = list[idx].id;
        if (it.kind === 'post') data.round = list[idx].round;
        list[idx] = data;
      } else {
        data.id = newId(it.kind === 'post' ? 'p' : it.kind === 'ad' ? 'a' : 'q');
        if (it.kind === 'post' && data.round !== 2) data.round = data.round || 1;
        list.push(data);
      }
    } else if (it.kind === 'party_message' && it.party_message && CAT_IDS.has(it.party_message.cat)) {
      const { cat, ...m } = it.party_message; c.partyMessages[cat] = m;
    } else if (it.kind === 'fairness' && it.fairness) {
      c.fairness = { ...c.fairness, ...clone(it.fairness), ad: { ...c.fairness.ad, ...(it.fairness.ad || {}) } };
    }
  }
  return validateContent(c);
}

export class ContentStore {
  constructor(dir) {
    this.file = path.join(dir, 'content.json');
    this.data = { current: null, history: [], suggestions: [], automation: { schedule: 'off', autoApply: false, focus: '', lastRun: 0 } };
    try { Object.assign(this.data, JSON.parse(fs.readFileSync(this.file, 'utf8'))); } catch { /* erster Start */ }
    if (this.data.current) { try { this.data.current = validateContent(this.data.current); } catch (e) { console.error('Gespeicherte Inhalte ungültig, nutze Standard:', e.message); this.data.current = null; } }
  }
  get current() { return this.data.current || DEFAULT_CONTENT; }
  persist() {
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data)); fs.renameSync(tmp, this.file);
  }
  save(content, note, by = 'Lehrkraft') {
    const valid = validateContent(content);
    this.data.history.unshift({ id: newId('v'), at: Date.now(), note: String(note || 'Änderung').slice(0, 120), by, content: clone(this.current) });
    this.data.history = this.data.history.slice(0, 20);
    this.data.current = valid;
    this.persist();
    return valid;
  }
  restore(id) {
    const h = this.data.history.find((x) => x.id === id);
    if (!h) throw new Invalid('Version nicht gefunden');
    return this.save(h.content, `Wiederhergestellt: ${new Date(h.at).toLocaleString('de-DE')}`);
  }
  reset() { return this.save(clone(DEFAULT_CONTENT), 'Auf Standard zurückgesetzt'); }
  addSuggestionSet(set) {
    this.data.suggestions.unshift(set);
    this.data.suggestions = this.data.suggestions.slice(0, 12);
    this.persist();
  }
  meta() {
    return {
      history: this.data.history.map(({ id, at, note, by }) => ({ id, at, note, by })),
      suggestions: this.data.suggestions, automation: this.data.automation, custom: !!this.data.current,
    };
  }
}
export { Invalid };
