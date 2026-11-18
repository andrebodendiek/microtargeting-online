// KI-Assistent für den Inhalts-Editor (Claude API)
// Erzeugt überprüfbare Vorschläge (hinzufügen/ersetzen/entfernen), die die Lehrkraft übernimmt.
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'node:crypto';
import { CATEGORIES, PAGES } from '../public/shared/content.js';
import { validatePost, validateAd, validateQuiz } from './content-store.js';

export const AI_MODEL = 'claude-opus-5-5';
export const aiAvailable = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

const CAT_IDS = CATEGORIES.map((c) => c.id);
const PAGE_KEYS = Object.keys(PAGES);
const nullable = (schema) => ({ anyOf: [schema, { type: 'null' }] });
const strArr = { type: 'array', items: { type: 'string' } };
const POST_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['cat', 'page', 'round', 'time', 'art', 'bg', 'headline', 'teaser', 'body', 'image_query', 'format', 'duration', 'sponsored', 'tags', 'stats', 'comment'],
  properties: {
    image_query: { type: 'string', description: 'Kurzer ENGLISCHER Suchbegriff für ein passendes freies Foto (2-4 Wörter, keine Marken, keine Prominenten), z. B. "skatepark ramp"' },
    cat: { type: 'string', enum: CAT_IDS }, page: { type: 'string', enum: PAGE_KEYS }, round: { type: 'integer', enum: [1, 2] },
    time: { type: 'string', description: 'z. B. "3 Std." oder "1 Tag"' },
    art: { ...strArr, description: '1-3 Emojis als Bildmotiv, erstes = Hauptmotiv' },
    bg: { ...strArr, description: 'Genau zwei helle, freundliche Verlaufsfarben im Format #rrggbb' },
    headline: { type: 'string', description: 'max. 100 Zeichen' }, teaser: { type: 'string', description: 'Anreißer, max. 300 Zeichen, endet mit …' },
    body: { type: 'string', description: 'Fortsetzung des Artikels, 2-3 Sätze' },
    format: { type: 'string', enum: ['link', 'photo', 'video'], description: 'link = Nachrichtenartikel, photo = Foto-Post, video = kurzer Clip' },
    duration: { type: 'string', description: 'Nur bei video: Länge im Format m:ss, sonst leer' },
    sponsored: { type: 'string', description: 'Name des (fiktiven) Werbepartners bei bezahlter Partnerschaft eines Creators, sonst leer' },
    tags: { ...strArr, description: '2-4 realistische Hashtags ohne #' },
    stats: { type: 'object', additionalProperties: false, required: ['likes', 'comments', 'shares'], properties: { likes: { type: 'integer' }, comments: { type: 'integer' }, shares: { type: 'integer' } } },
    comment: { type: 'object', additionalProperties: false, required: ['user', 'text', 'likes'], description: 'Realistischer Top-Kommentar eines (fiktiven) Jugendlichen', properties: { user: { type: 'string' }, text: { type: 'string' }, likes: { type: 'integer' } } },
  },
};
const AD_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['label', 'brand', 'product', 'slogan', 'price', 'cta', 'art', 'bg', 'cats', 'image_query'],
  properties: {
    image_query: { type: 'string', description: 'Kurzer ENGLISCHER Suchbegriff für ein neutrales Produktfoto ohne Markenlogo, z. B. "hiking backpack"' },
    label: { type: 'string', description: 'Kurzname, max. 24 Zeichen' }, brand: { type: 'string', description: 'FIKTIVE Marke' },
    product: { type: 'string' }, slogan: { type: 'string' }, price: { type: 'string' }, cta: { type: 'string' },
    art: { ...strArr, description: 'genau 2 Emojis' }, bg: { ...strArr, description: 'zwei kräftige Farben #rrggbb (weiße Schrift muss lesbar sein)' },
    cats: { type: 'array', items: { type: 'string', enum: CAT_IDS }, description: '1-2 passende Zielkategorien' },
  },
};
const QUIZ_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['q', 'options', 'correct', 'explain'],
  properties: { q: { type: 'string' }, options: { ...strArr, description: 'genau 4 Antworten' }, correct: { type: 'integer', enum: [0, 1, 2, 3] }, explain: { type: 'string' } },
};
const PARTY_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['cat', 'title', 'text', 'art'],
  properties: { cat: { type: 'string', enum: CAT_IDS }, title: { type: 'string' }, text: { type: 'string' }, art: { type: 'string' } },
};
const SUBMIT_TOOL = {
  name: 'submit_suggestions',
  description: 'Gib hiermit am Ende deine Vorschläge für das Inhaltspaket ab. Rufe dieses Werkzeug genau einmal auf.',
  strict: true,
  eager_input_streaming: true,
  input_schema: {
    type: 'object', additionalProperties: false, required: ['summary', 'items'],
    properties: {
      summary: { type: 'string', description: 'Kurze Zusammenfassung für die Lehrkraft (2-3 Sätze, Deutsch)' },
      items: {
        type: 'array',
        items: {
          type: 'object', additionalProperties: false,
          required: ['kind', 'action', 'target_id', 'reason', 'post', 'ad', 'quiz', 'party_message'],
          properties: {
            kind: { type: 'string', enum: ['post', 'ad', 'quiz', 'party_message'] },
            action: { type: 'string', enum: ['add', 'replace', 'remove'] },
            target_id: nullable({ type: 'string' }),
            reason: { type: 'string', description: 'Begründung in einem Satz (fachdidaktisch/aktualität)' },
            post: nullable(POST_SCHEMA), ad: nullable(AD_SCHEMA), quiz: nullable(QUIZ_SCHEMA), party_message: nullable(PARTY_SCHEMA),
          },
        },
      },
    },
  },
};

const SYSTEM = `Du bist Redakteur*in und Informatik-Fachdidaktiker*in für „bubbl“, ein Unterrichtsspiel zu Microtargeting in der Sekundarstufe I (13-16 Jahre, Informatikunterricht in Niedersachsen, Region Ostfriesland/Norden).

Das Spiel: SchülerInnen liken Beiträge eines fiktiven sozialen Netzwerks in 7 festen Kategorien (${CATEGORIES.map((c) => `${c.id} = ${c.name}`).join(', ')}). Gruppen werten die Likes aus und platzieren Werbeanzeigen, die zu 1-2 Kategorien passen. Eine fiktive Partei schickt jeder Interessengruppe eine eigene Wahlbotschaft; einige Botschaften widersprechen sich bewusst paarweise. Ein Live-Quiz sichert die Fachbegriffe (Microtargeting, Tracking, Profiling, Filterblase, Proxy-Merkmal, DSGVO, Trainings-/Testdaten).

Regeln für deine Vorschläge:
- Beiträge wirken wie echte Social-Media-Posts mit aktuellen, für Jugendliche interessanten Themen. Nutze die Websuche, um aktuelle Anlässe zu finden, formuliere aber selbst (keine Zitate, keine Links).
- Wirke realistisch wie ein echtes Netzwerk: Mische die Formate (link = Artikel eines Nachrichtenkontos, photo/video = Post eines Creators oder Lokalkontos), passende Reichweitenzahlen (stats), 2-4 Hashtags und einen glaubwürdigen Top-Kommentar. Creator-Posts haben gelegentlich eine bezahlte Partnerschaft (sponsored = fiktiver Werbepartner) mit Rabattcode im Text. Konten (page): ${Object.entries(PAGES).map(([k, p]) => `${k} = ${p.name} (${p.kind}${p.cat ? `, ${p.cat}` : ''})`).join('; ')}.
- Jeder Beitrag passt eindeutig in GENAU eine Kategorie – sonst funktioniert die Auswertung nicht. Kategorien bleiben ausgewogen (Runde 1: 3-4 Beiträge je Kategorie).
- Nur fiktive Marken, fiktive Personen und die fiktive Partei. Keine echten Parteien, Politiker*innen, Influencer*innen oder Unternehmen als Werbetreibende. Echte Ereignisse, Orte, Sportwettbewerbe und Studien dürfen als Thema vorkommen.
- Altersgerecht, sachlich korrekt, ohne Gewalt, Angstmache oder Diskriminierung. Deutsch, Schreibweise mit Gendersternchen wie im Bestand.
- Werbeanzeigen haben 1-2 eindeutige Zielkategorien; kombiniere Kategorien so, dass die Zuordnung eine kleine Denkaufgabe ist.
- Wahlbotschaften: kurz, plakativ, je Kategorie eine; Widerspruchspaare (Technik↔Umweltschutz, Sport↔Natur, Naschen↔Ernährung) müssen sich weiterhin klar widersprechen.
- Zu jedem Beitrag und jeder Anzeige gehört image_query: ein kurzer englischer Suchbegriff für ein frei lizenziertes Foto (Motiv, keine Marken, keine Prominenten, keine Kinder im Mittelpunkt).
- Quizfragen: eindeutig eine richtige von 4 Antworten, fachlich präzise, mit kurzer Erklärung.
- Schlage nur sinnvolle Änderungen vor (höchstens 14 Einträge). Bei "replace"/"remove" gib target_id aus dem Bestand an; bei "add" target_id = null. Fülle nur das zum kind passende Feld, alle anderen null.
- Gib deine Vorschläge am Ende ausschließlich über das Werkzeug submit_suggestions ab.`;

function compactContent(c) {
  return {
    posts: c.posts.map((p) => ({ id: p.id, cat: p.cat, round: p.round, time: p.time, headline: p.headline })),
    ads: c.ads.map((a) => ({ id: a.id, label: a.label, product: a.product, cats: a.cats })),
    partyMessages: Object.fromEntries(Object.entries(c.partyMessages).map(([k, m]) => [k, m.title])),
    quiz: c.quiz.map((q) => ({ id: q.id, q: q.q })),
  };
}

const SCOPE_LABEL = { posts: 'Beiträge', ads: 'Werbeanzeigen', party: 'Wahlbotschaften', quiz: 'Quizfragen' };
function taskText({ mode, topic, scope }) {
  const today = new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
  const sc = (scope?.length ? scope : Object.keys(SCOPE_LABEL)).filter((s) => SCOPE_LABEL[s]).map((s) => SCOPE_LABEL[s]).join(', ');
  if (mode === 'topic') return `Heute ist der ${today}. Die Lehrkraft wünscht Inhalte zu folgendem Thema bzw. Schwerpunkt: „${topic}“. Recherchiere kurz aktuelle Bezüge und schlage passende neue oder ersetzende Inhalte vor. Bereiche: ${sc}.`;
  return `Heute ist der ${today}. Führe einen Aktualitäts-Check durch: Welche Inhalte wirken veraltet (z. B. vergangene Turniere, alte Zahlen, abgelaufene Trends) und durch welche aktuellen, für Jugendliche relevanten Themen sollten sie ersetzt werden? Recherchiere aktuelle Anlässe. Bereiche: ${sc}.${topic ? ` Zusätzlicher Schwerpunkt der Lehrkraft: „${topic}“.` : ''}`;
}

// Prüft und normalisiert die KI-Ausgabe – nichts Ungeprüftes landet im Editor
function cleanItems(raw, content) {
  const ids = { post: new Set(content.posts.map((p) => p.id)), ad: new Set(content.ads.map((a) => a.id)), quiz: new Set(content.quiz.map((q) => q.id)) };
  const out = [];
  for (const it of Array.isArray(raw) ? raw.slice(0, 16) : []) {
    try {
      const base = { id: crypto.randomBytes(4).toString('hex'), kind: it.kind, action: it.action, target_id: it.target_id || null, reason: String(it.reason || '').slice(0, 300), status: 'pending' };
      const iq = String(it.post?.image_query || it.ad?.image_query || '').replace(/[^\p{L}\p{N} -]/gu, '').trim().slice(0, 80);
      if (iq) base.image_query = iq;
      if (it.action !== 'add' && it.kind !== 'party_message' && !ids[it.kind]?.has(base.target_id)) continue;
      if (it.kind === 'post') { if (it.action !== 'remove') base.post = validatePost({ ...it.post, id: 'tmp' }); }
      else if (it.kind === 'ad') { if (it.action !== 'remove') base.ad = validateAd({ ...it.ad, id: 'tmp' }); }
      else if (it.kind === 'quiz') { if (it.action !== 'remove') base.quiz = validateQuiz({ ...it.quiz, id: 'tmp' }); }
      else if (it.kind === 'party_message') {
        const m = it.party_message; if (!m || !CAT_IDS.includes(m.cat)) continue;
        base.action = 'replace'; base.target_id = m.cat;
        base.party_message = { cat: m.cat, title: String(m.title).slice(0, 70), text: String(m.text).slice(0, 240), art: String(m.art || '🗳️').slice(0, 16) };
      } else continue;
      out.push(base);
    } catch { /* ungültigen Vorschlag verwerfen */ }
  }
  return out;
}

export async function generateSuggestions({ mode = 'refresh', topic = '', scope = [], content, signal }) {
  const client = new Anthropic({ timeout: 10 * 60 * 1000 });
  const messages = [{ role: 'user', content: `${taskText({ mode, topic, scope })}\n\nAktueller Bestand (gekürzt):\n${JSON.stringify(compactContent(content))}` }];
  const tools = [{ type: 'web_search_20260209', name: 'web_search', max_uses: 5 }, SUBMIT_TOOL];
  for (let round = 0; round < 6; round++) {
    const stream = client.beta.messages.stream({
      model: AI_MODEL,
      max_tokens: 32000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      system: SYSTEM,
      tools,
      messages,
    }, { signal });
    const msg = await stream.finalMessage();
    if (msg.stop_reason === 'refusal') throw new Error('Die KI hat diese Anfrage abgelehnt. Bitte das Thema anders formulieren.');
    if (msg.stop_reason === 'max_tokens') throw new Error('Die Antwort der KI war zu lang. Bitte den Umfang verkleinern.');
    const call = msg.content.find((b) => b.type === 'tool_use' && b.name === SUBMIT_TOOL.name);
    if (call) {
      const input = call.input && typeof call.input === 'object' ? call.input : {};
      return { summary: String(input.summary || '').slice(0, 800), items: cleanItems(input.items, content), usage: msg.usage };
    }
    messages.push({ role: 'assistant', content: msg.content });
    if (msg.stop_reason === 'pause_turn') continue; // Websuche läuft noch – fortsetzen
    messages.push({ role: 'user', content: 'Bitte gib deine Vorschläge jetzt über das Werkzeug submit_suggestions ab.' });
  }
  throw new Error('Die KI hat keine Vorschläge abgegeben. Bitte erneut versuchen.');
}
