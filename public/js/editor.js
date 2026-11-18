// Inhalts-Editor mit KI-Assistent (nur für angemeldete Lehrkräfte)
import { html, render, useState, useEffect, useRef, Logo, Aurora, CatChip, PostArt, AdVisual, LoginScreen, Dropdown, SelectMenu, CATEGORIES, CAT, PAGES } from './lib.js';

const clone = (x) => JSON.parse(JSON.stringify(x));
const uid = (p) => `${p}${Math.random().toString(36).slice(2, 8)}`;
const api = async (url, opts = {}) => {
  const r = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) { const e = new Error(d.error || 'Bitte anmelden'); e.auth = true; throw e; }
  if (!r.ok) throw new Error(d.error || `Fehler ${r.status}`);
  return d;
};
const splitEmoji = (s) => [...new Intl.Segmenter('de', { granularity: 'grapheme' }).segment(s)].map((x) => x.segment).filter((x) => x.trim());

// ------------------------------------------------------------------ Formular-Bausteine
const Field = ({ label, children, hint }) => html`<label class="ed-field"><span>${label}${hint && html`<small class="muted"> · ${hint}</small>`}</span>${children}</label>`;
const Text = ({ value, onInput, max, area, rows = 2 }) => area
  ? html`<textarea class="form-control" rows=${rows} maxlength=${max} value=${value || ''} onInput=${(e) => onInput(e.target.value)}></textarea>`
  : html`<input class="form-control" maxlength=${max} value=${value || ''} onInput=${(e) => onInput(e.target.value)} />`;
const Emojis = ({ value, onInput, max = 3 }) => html`<input class="form-control emoji-in" value=${(value || []).join(' ')} onInput=${(e) => onInput(splitEmoji(e.target.value).slice(0, max))} placeholder="z. B. 🎮 🏆" />`;
const Colors = ({ value, onInput }) => html`<span class="colors">${[0, 1].map((i) => html`<input type="color" value=${value?.[i] || '#cccccc'} onInput=${(e) => { const n = [...(value || ['#cccccc', '#cccccc'])]; n[i] = e.target.value; onInput(n); }} />`)}</span>`;
const CatPick = ({ value = [], onInput, max = 3 }) => html`<div class="bb-row wrap gap">${CATEGORIES.map((c) => html`<${CatChip} cat=${c.id} small on=${value.includes(c.id)} onClick=${() => onInput(value.includes(c.id) ? value.filter((x) => x !== c.id) : [...value, c.id].slice(-max))} />`)}</div>`;
const Select = ({ value, onInput, options }) => html`<${SelectMenu} value=${value} onChange=${onInput} options=${options.map(([v, l, hint]) => ({ value: v, label: l, hint }))} />`;
const move = (arr, i, d) => { const a = arr.slice(); const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; };

// ------------------------------------------------------------------ Bildfeld: Foto suchen (Openverse), hochladen, entfernen
function ImageField({ image, onChange, query }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef(null);
  async function upload(file) {
    if (!file) return;
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/images/upload', { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      onChange(d);
    } catch (e) { setErr(e.message || 'Upload fehlgeschlagen'); } finally { setBusy(false); }
  }
  return html`<div class="img-field">
    <div class="img-prev" onDragOver=${(e) => e.preventDefault()} onDrop=${(e) => { e.preventDefault(); upload(e.dataTransfer.files[0]); }}>
      ${image ? html`<img src=${image.src} alt=${image.alt || ''} />` : html`<span class="muted"><i class="bi bi-image"></i> kein Foto – Ersatzgrafik</span>`}
      ${busy && html`<span class="img-busy"><span class="spinner"></span></span>`}
    </div>
    <div class="img-side">
      <div class="bb-row gap wrap">
        <button type="button" class="btn btn-sm btn-primary" onClick=${() => setOpen(true)}><i class="bi bi-search"></i> Foto suchen</button>
        <button type="button" class="btn btn-sm" onClick=${() => fileRef.current?.click()}><i class="bi bi-upload"></i> Hochladen</button>
        ${image && html`<button type="button" class="btn btn-sm btn-ghost" onClick=${() => onChange(undefined)}><i class="bi bi-x-lg"></i> Entfernen</button>`}
        <input type="file" accept="image/*" hidden ref=${fileRef} onChange=${(e) => upload(e.target.files[0])} />
      </div>
      ${image && html`<input class="form-control form-control-sm" maxlength="160" placeholder="Bildbeschreibung (für Screenreader)" value=${image.alt || ''} onInput=${(e) => onChange({ ...image, alt: e.target.value })} />`}
      ${image?.credit && html`<small class="muted">Foto: ${image.credit.creator}${image.credit.license ? ` · ${image.credit.license}` : ''}</small>`}
      <small class="muted">Datei auch per Ziehen auf die Vorschau. Wird automatisch auf 960×600 zugeschnitten.</small>
      ${err && html`<small class="error">${err}</small>`}
    </div>
    ${open && html`<${ImageSearch} initial=${query} onClose=${() => setOpen(false)} onPick=${(img) => { onChange(img); setOpen(false); }} />`}
  </div>`;
}

function ImageSearch({ initial = '', onClose, onPick }) {
  const [q, setQ] = useState(initial);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(null);
  const [err, setErr] = useState('');
  async function search(e) {
    e?.preventDefault(); if (!q.trim()) return;
    setBusy(true); setErr('');
    try { const d = await api(`/api/images/search?q=${encodeURIComponent(q)}`); setRes(d.results); } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }
  async function pick(r) {
    setPicking(r.id); setErr('');
    try { onPick(await api('/api/images/import', { method: 'POST', body: JSON.stringify({ id: r.id }) })); } catch (e) { setErr(e.message); setPicking(null); }
  }
  useEffect(() => { if (initial) search(); const k = (e) => e.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, []);
  return html`<div class="modal-backdrop-bb" onClick=${onClose}>
    <div class="card img-modal" onClick=${(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Foto suchen">
      <div class="bb-row between"><h3><i class="bi bi-images"></i> Freie Fotos suchen</h3><button class="icon-btn" onClick=${onClose} aria-label="Schließen"><i class="bi bi-x-lg"></i></button></div>
      <form class="bb-row gap" onSubmit=${search}><input class="form-control" autofocus value=${q} onInput=${(e) => setQ(e.target.value)} placeholder="Suchbegriff – englisch liefert mehr Treffer, z. B. „skatepark“" /><button class="btn btn-primary" disabled=${busy}>${busy ? '…' : html`<i class="bi bi-search"></i>`} Suchen</button></form>
      <small class="muted">Quelle: Openverse – nur Fotos mit CC0, Public Domain oder CC BY (frei nutzbar, Urheber*in wird automatisch genannt). Bitte keine Fotos mit erkennbaren Prominenten, Marken oder Kindern wählen.</small>
      ${err && html`<p class="error">${err}</p>`}
      <div class="img-grid">${(res || []).map((r) => html`<button type="button" class=${`img-hit ${picking === r.id ? 'picking' : ''}`} disabled=${!!picking} onClick=${() => pick(r)} title=${`${r.title} – ${r.creator} (${r.license})`}>
        <img src=${r.thumb} alt=${r.title} loading="lazy" /><span>${r.creator} · ${r.license === 'by' ? 'CC BY' : r.license === 'cc0' ? 'CC0' : 'PD'}</span>${picking === r.id && html`<span class="img-busy"><span class="spinner"></span></span>`}
      </button>`)}</div>
      ${res && !res.length && html`<p class="muted">Keine Treffer – anderen Begriff probieren.</p>`}
    </div>
  </div>`;
}

// ------------------------------------------------------------------ Tabs
function PostsTab({ c, set }) {
  const [cat, setCat] = useState('all');
  const [open, setOpen] = useState(null);
  const upd = (id, patch) => set({ ...c, posts: c.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const list = c.posts.filter((p) => cat === 'all' || p.cat === cat);
  const add = () => { const id = uid('p'); const nc = cat === 'all' ? 'technik' : cat; set({ ...c, posts: [...c.posts, { id, cat: nc, page: Object.keys(PAGES).find((k) => PAGES[k].cat === nc) || 'norden', round: 1, time: '1 Std.', art: ['✨'], bg: ['#a1c4fd', '#c2e9fb'], headline: 'Neue Überschrift', teaser: 'Anreißer …', body: 'Weiterer Text.' }] }); setOpen(id); };
  return html`<div class="bb-col">
    <div class="bb-row wrap gap"><button class=${`chip ${cat === 'all' ? 'on-all' : ''}`} onClick=${() => setCat('all')}>Alle (${c.posts.length})</button>
      ${CATEGORIES.map((x) => html`<${CatChip} cat=${x.id} small on=${cat === x.id} count=${c.posts.filter((p) => p.cat === x.id && p.round === 1).length} onClick=${() => setCat(x.id)} />`)}</div>
    <p class="muted small">Zahl = Beiträge in Runde 1 (Feed beim Liken, mind. 2 je Kategorie). Runde 2 = zusätzliche Beiträge für die Filterblase.</p>
    ${list.map((p) => html`<div class=${`ed-item ${open === p.id ? 'open' : ''}`} key=${p.id}>
      <button class="ed-head" onClick=${() => setOpen(open === p.id ? null : p.id)}>
        <span class="ed-thumb"><${PostArt} post=${p} small /></span>
        <span class="ed-title"><b>${p.headline}</b><small class="muted">${CAT[p.cat]?.name} · Runde ${p.round} · ${PAGES[p.page]?.name}</small></span>
      </button>
      ${open === p.id && html`<div class="ed-form">
        <div class="ed-grid">
          <${Field} label="Kategorie"><${Select} value=${p.cat} onInput=${(v) => upd(p.id, { cat: v })} options=${CATEGORIES.map((x) => [x.id, x.name])} /><//>
          <${Field} label="Seite"><${Select} value=${p.page} onInput=${(v) => upd(p.id, { page: v })} options=${Object.entries(PAGES).map(([k, pg]) => [k, `${pg.avatar} ${pg.name}`])} /><//>
          <${Field} label="Runde"><${Select} value=${String(p.round)} onInput=${(v) => upd(p.id, { round: Number(v) })} options=${[['1', '1 – Likes verteilen'], ['2', '2 – nur Filterblase']]} /><//>
          <${Field} label="Zeitangabe"><${Text} value=${p.time} max=${14} onInput=${(v) => upd(p.id, { time: v })} /><//>
          <${Field} label="Bild-Emojis" hint="1–3"><${Emojis} value=${p.art} onInput=${(v) => upd(p.id, { art: v })} /><//>
          <${Field} label="Farbverlauf"><${Colors} value=${p.bg} onInput=${(v) => upd(p.id, { bg: v })} /><//>
        </div>
        <${Field} label="Foto"><${ImageField} image=${p.image} query=${p.headline} onChange=${(img) => upd(p.id, { image: img })} /><//>
        <${Field} label="Überschrift"><${Text} value=${p.headline} max=${100} onInput=${(v) => upd(p.id, { headline: v })} /><//>
        <${Field} label="Anreißer"><${Text} area value=${p.teaser} max=${360} onInput=${(v) => upd(p.id, { teaser: v })} /><//>
        <${Field} label="Weiterlesen-Text"><${Text} area rows=${3} value=${p.body} max=${700} onInput=${(v) => upd(p.id, { body: v })} /><//>
        <button class="btn btn-sm btn-outline-danger" onClick=${() => set({ ...c, posts: c.posts.filter((x) => x.id !== p.id) })}><i class="bi bi-trash"></i> Beitrag löschen</button>
      </div>`}
    </div>`)}
    <button class="btn" onClick=${add}>+ Beitrag hinzufügen</button>
  </div>`;
}

function AdForm({ a, upd, withCats = true }) {
  return html`<div class="ed-form">
    <div class="ed-preview"><${AdVisual} ad=${a} /></div>
    <${Field} label="Produktfoto"><${ImageField} image=${a.image} query=${a.product} onChange=${(img) => upd({ image: img })} /><//>
    <div class="ed-grid">
      <${Field} label="Kurzname"><${Text} value=${a.label} max=${24} onInput=${(v) => upd({ label: v })} /><//>
      <${Field} label="Marke" hint="fiktiv"><${Text} value=${a.brand} max=${30} onInput=${(v) => upd({ brand: v })} /><//>
      <${Field} label="Produkt"><${Text} value=${a.product} max=${50} onInput=${(v) => upd({ product: v })} /><//>
      <${Field} label="Preis"><${Text} value=${a.price} max=${24} onInput=${(v) => upd({ price: v })} /><//>
      <${Field} label="Button-Text"><${Text} value=${a.cta} max=${24} onInput=${(v) => upd({ cta: v })} /><//>
      <${Field} label="Bild-Emojis" hint="2"><${Emojis} max=${2} value=${a.art} onInput=${(v) => upd({ art: v })} /><//>
      <${Field} label="Farbverlauf"><${Colors} value=${a.bg} onInput=${(v) => upd({ bg: v })} /><//>
    </div>
    <${Field} label="Slogan"><${Text} value=${a.slogan} max=${120} onInput=${(v) => upd({ slogan: v })} /><//>
    ${withCats && html`<${Field} label="Zielkategorien (Lösung)" hint="1–3"><${CatPick} value=${a.cats} onInput=${(v) => upd({ cats: v })} /><//>`}
  </div>`;
}

function AdsTab({ c, set }) {
  const [open, setOpen] = useState(null);
  const upd = (id, patch) => set({ ...c, ads: c.ads.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
  return html`<div class="bb-col">
    <p class="muted small">Reihenfolge zählt: Anzeigen 1–4 sind in der Algorithmus-Werkbank die <b>Trainingsdaten</b>, die übrigen die <b>Testdaten</b>. 5–8 Anzeigen.</p>
    ${c.ads.map((a, i) => html`<div class=${`ed-item ${open === a.id ? 'open' : ''}`} key=${a.id}>
      <div class="ed-head-row">
        <button class="ed-head" onClick=${() => setOpen(open === a.id ? null : a.id)}>
          <span class="ed-thumb ad" style=${`background:linear-gradient(135deg,${a.bg[0]},${a.bg[1]})`}>${a.art[0]}</span>
          <span class="ed-title"><b>${i + 1}. ${a.label} – ${a.product}</b><small class="muted">${a.cats.map((x) => `${CAT[x]?.name}`).join(' + ')} · ${i < 4 ? 'Training' : 'Test'}</small></span>
        </button>
        <span class="ed-move"><button class="icon-btn" onClick=${() => set({ ...c, ads: move(c.ads, i, -1) })}>↑</button><button class="icon-btn" onClick=${() => set({ ...c, ads: move(c.ads, i, 1) })}>↓</button></span>
      </div>
      ${open === a.id && html`<${AdForm} a=${a} upd=${(patch) => upd(a.id, patch)} />
        <button class="btn btn-sm btn-outline-danger" onClick=${() => set({ ...c, ads: c.ads.filter((x) => x.id !== a.id) })}><i class="bi bi-trash"></i> Anzeige löschen</button>`}
    </div>`)}
    <button class="btn" disabled=${c.ads.length >= 8} onClick=${() => { const id = uid('a'); set({ ...c, ads: [...c.ads, { id, label: 'Neu', brand: 'Marke', product: 'Produkt', slogan: 'Slogan', price: '9,99 €', cta: 'Mehr erfahren', art: ['🛍️', '✨'], bg: ['#4568dc', '#b06ab3'], cats: ['mode'] }] }); setOpen(id); }}>+ Anzeige hinzufügen</button>
  </div>`;
}

function PartyTab({ c, set }) {
  const updMsg = (cat, patch) => set({ ...c, partyMessages: { ...c.partyMessages, [cat]: { ...c.partyMessages[cat], ...patch } } });
  return html`<div class="bb-col">
    <div class="ed-grid">
      <${Field} label="Parteiname" hint="fiktiv"><${Text} value=${c.party.name} max=${40} onInput=${(v) => set({ ...c, party: { ...c.party, name: v } })} /><//>
      <${Field} label="Kürzel"><${Text} value=${c.party.short} max=${8} onInput=${(v) => set({ ...c, party: { ...c.party, short: v } })} /><//>
      <${Field} label="Logo (Emoji)"><${Text} value=${c.party.logo} max=${16} onInput=${(v) => set({ ...c, party: { ...c.party, logo: v } })} /><//>
    </div>
    <p class="muted small">Jede Interessengruppe bekommt ihre eigene Botschaft. Widerspruchspaare: ${c.contradictions.map(([a, b]) => `${CAT[a]?.name} ↔ ${CAT[b]?.name}`).join(', ')}.</p>
    ${CATEGORIES.map((x) => { const m = c.partyMessages[x.id] || {}; return html`<div class="ed-item open" style=${`border-left:4px solid ${x.color}`}>
      <div class="ed-form"><b>An ${x.name}-Fans</b>
        <div class="ed-grid"><${Field} label="Titel"><${Text} value=${m.title} max=${70} onInput=${(v) => updMsg(x.id, { title: v })} /><//><${Field} label="Bild (Emoji)"><${Text} value=${m.art} max=${16} onInput=${(v) => updMsg(x.id, { art: v })} /><//></div>
        <${Field} label="Text"><${Text} area value=${m.text} max=${240} onInput=${(v) => updMsg(x.id, { text: v })} /><//>
      </div></div>`; })}
  </div>`;
}

function QuizTab({ c, set }) {
  const upd = (i, patch) => set({ ...c, quiz: c.quiz.map((q, k) => (k === i ? { ...q, ...patch } : q)) });
  return html`<div class="bb-col">
    ${c.quiz.map((q, i) => html`<div class="ed-item open" key=${q.id}>
      <div class="ed-form">
        <div class="bb-row between"><b>Frage ${i + 1}</b><span class="ed-move"><button class="icon-btn" onClick=${() => set({ ...c, quiz: move(c.quiz, i, -1) })}>↑</button><button class="icon-btn" onClick=${() => set({ ...c, quiz: move(c.quiz, i, 1) })}>↓</button><button class="icon-btn" title="Löschen" onClick=${() => set({ ...c, quiz: c.quiz.filter((_, k) => k !== i) })}><i class="bi bi-trash"></i> </button></span></div>
        <${Text} value=${q.q} max=${160} onInput=${(v) => upd(i, { q: v })} />
        ${q.options.map((o, k) => html`<div class="opt-row"><input type="radio" name=${`c${q.id}`} checked=${q.correct === k} onChange=${() => upd(i, { correct: k })} title="richtige Antwort" /><${Text} value=${o} max=${90} onInput=${(v) => upd(i, { options: q.options.map((x, j) => (j === k ? v : x)) })} /></div>`)}
        <${Field} label="Erklärung (nach dem Auflösen)"><${Text} area value=${q.explain} max=${260} onInput=${(v) => upd(i, { explain: v })} /><//>
      </div>
    </div>`)}
    <button class="btn" disabled=${c.quiz.length >= 15} onClick=${() => set({ ...c, quiz: [...c.quiz, { id: uid('q'), q: 'Neue Frage?', options: ['A', 'B', 'C', 'D'], correct: 0, explain: '' }] })}>+ Frage hinzufügen</button>
  </div>`;
}

function FairnessTab({ c, set }) {
  const f = c.fairness;
  const upd = (patch) => set({ ...c, fairness: { ...f, ...patch } });
  return html`<div class="bb-col">
    <p class="muted small">Ein Angebot, das eigentlich alle betrifft, wird nur nach einem Ersatzmerkmal (Proxy-Kategorie) ausgespielt.</p>
    <div class="ed-item open"><${AdForm} a=${f.ad} withCats=${false} upd=${(patch) => upd({ ad: { ...f.ad, ...patch } })} /></div>
    <${Field} label="Proxy-Kategorien" hint="danach wählt der Algorithmus aus (1–2)"><${CatPick} max=${2} value=${f.proxyCats} onInput=${(v) => upd({ proxyCats: v })} /><//>
    <${Field} label="Frage: Interesse"><${Text} value=${f.question} max=${160} onInput=${(v) => upd({ question: v })} /><//>
    <${Field} label="Frage: Fairness"><${Text} value=${f.fairQuestion} max=${160} onInput=${(v) => upd({ fairQuestion: v })} /><//>
    <${Field} label="Hintergrund-Erklärung"><${Text} area rows=${4} value=${f.explain} max=${600} onInput=${(v) => upd({ explain: v })} /><//>
  </div>`;
}

function HistoryTab({ meta, onRestore }) {
  return html`<div class="bb-col">
    ${meta.history.length ? meta.history.map((h) => html`<div class="hist-row"><span><b>${h.note}</b><small class="muted">${new Date(h.at).toLocaleString('de-DE')} · ${h.by}</small></span>
      <button class="btn btn-sm" onClick=${() => confirm('Diesen Stand (vor der Änderung) wiederherstellen?') && onRestore(h.id)}><i class="bi bi-arrow-counterclockwise"></i> Davor wiederherstellen</button></div>`) : html`<p class="muted">Noch keine Änderungen gespeichert.</p>`}
  </div>`;
}

// ------------------------------------------------------------------ KI-Assistent
const KIND = { post: ['📰', 'Beitrag'], ad: ['🎯', 'Anzeige'], quiz: ['🏆', 'Quizfrage'], party_message: ['🗳️', 'Wahlbotschaft'] };
const ACTION = { add: ['Neu', 'ok'], replace: ['Ersetzt', 'warn'], remove: ['Entfernen', 'bad'] };
function targetLabel(it, c) {
  if (!it.target_id) return null;
  if (it.kind === 'post') return c.posts.find((p) => p.id === it.target_id)?.headline;
  if (it.kind === 'ad') return c.ads.find((a) => a.id === it.target_id)?.product;
  if (it.kind === 'quiz') return c.quiz.find((q) => q.id === it.target_id)?.q;
  if (it.kind === 'party_message') return `${CAT[it.target_id]?.name}: ${c.partyMessages[it.target_id]?.title}`;
  return null;
}
function ItemPreview({ it }) {
  if (it.post) return html`<div class="sug-prev"><${PostArt} post=${it.post} small /><div><b>${it.post.headline}</b><small>${CAT[it.post.cat]?.name} · Runde ${it.post.round}</small><p>${it.post.teaser}</p></div></div>`;
  if (it.ad) return html`<div class="sug-ad"><${AdVisual} ad=${it.ad} compact /><small>${it.ad.cats.map((x) => `${CAT[x]?.name}`).join(' + ')}</small></div>`;
  if (it.quiz) return html`<div class="sug-quiz"><b>${it.quiz.q}</b><ol>${it.quiz.options.map((o, i) => html`<li class=${i === it.quiz.correct ? 'right' : ''}>${o}</li>`)}</ol></div>`;
  if (it.party_message) return html`<div class="sug-quiz"><b>${it.party_message.art} ${it.party_message.title}</b><p>${it.party_message.text}</p></div>`;
  return null;
}

function Assistant({ data, dirty, reload, onApplied, toast }) {
  const [topic, setTopic] = useState('');
  const [scope, setScope] = useState(['posts', 'ads', 'party', 'quiz']);
  const [job, setJob] = useState(() => data.jobs?.find((j) => j.status === 'running') || null);
  const [now, setNow] = useState(Date.now());
  const [auto, setAuto] = useState(data.automation);
  useEffect(() => setAuto(data.automation), [JSON.stringify(data.automation)]);
  useEffect(() => {
    if (!job || job.status !== 'running') return;
    const t = setInterval(async () => {
      setNow(Date.now());
      try {
        const j = await api(`/api/ai/jobs/${job.id}`);
        if (j.status !== 'running') { setJob(j); if (j.status === 'done') { toast(`✨ ${j.set?.items?.length || 0} Vorschläge erhalten`); reload(); } else toast(j.error); }
      } catch (e) { /* weiter versuchen */ }
    }, 2000);
    return () => clearInterval(t);
  }, [job?.id, job?.status]);
  async function start(mode) {
    try { const j = await api('/api/ai/suggest', { method: 'POST', body: JSON.stringify({ mode, topic, scope }) }); setJob(j); } catch (e) { toast(e.message); }
  }
  async function apply(setId, itemIds) {
    if (dirty) return toast('Bitte zuerst deine Änderungen speichern oder verwerfen.');
    try { await api('/api/ai/apply', { method: 'POST', body: JSON.stringify({ setId, itemIds }) }); toast('✓ Übernommen und gespeichert'); onApplied(); } catch (e) { toast(e.message); }
  }
  async function dismiss(setId, itemIds) { try { await api('/api/ai/dismiss', { method: 'POST', body: JSON.stringify({ setId, itemIds }) }); reload(); } catch (e) { toast(e.message); } }
  async function saveAuto(patch) { const next = { ...auto, ...patch }; setAuto(next); try { await api('/api/ai/automation', { method: 'PUT', body: JSON.stringify(next) }); reload(); } catch (e) { toast(e.message); } }
  const running = job?.status === 'running';
  const sec = running ? Math.round((now - job.startedAt) / 1000) : 0;
  const sets = data.suggestions || [];
  const scopes = [['posts', 'Beiträge'], ['ads', 'Anzeigen'], ['party', 'Wahlbotschaften'], ['quiz', 'Quiz']];
  return html`<aside class="bb-col assistant">
    <div class="card pad bb-col ai-card">
      <div class="bb-row between"><h3><i class="bi bi-robot"></i> KI-Assistent</h3>${data.ai.available ? html`<span class="status-pill ok">bereit</span>` : html`<span class="status-pill bad">nicht eingerichtet</span>`}</div>
      ${!data.ai.available ? html`<p class="muted small">Damit die KI Themen aktualisieren kann, muss auf dem Server die Umgebungsvariable <code>ANTHROPIC_API_KEY</code> gesetzt sein (CapRover → App Configs → Environmental Variables).</p>` : html`
        <p class="muted small">Die KI recherchiert aktuelle Themen im Web und schlägt Änderungen vor. Nichts wird ohne deine Zustimmung übernommen.</p>
        <button class="btn btn-primary w-100" disabled=${running} onClick=${() => start('refresh')}><i class="bi bi-arrow-repeat"></i> Aktualitäts-Check starten</button>
        <div class="or">oder Thema vorgeben</div>
        <textarea class="form-control" rows="2" maxlength="300" placeholder="z. B. Fußball-WM 2026 und Klimaschutz in Ostfriesland, Klasse 8" value=${topic} onInput=${(e) => setTopic(e.target.value)}></textarea>
        <div class="bb-row wrap gap">${scopes.map(([k, l]) => html`<label class="toggle small"><input type="checkbox" checked=${scope.includes(k)} onChange=${(e) => setScope(e.target.checked ? [...scope, k] : scope.filter((x) => x !== k))} /> ${l}</label>`)}</div>
        <button class="btn w-100" disabled=${running || !topic.trim()} onClick=${() => start('topic')}><i class="bi bi-stars"></i> Vorschläge zum Thema erzeugen</button>
        ${running && html`<div class="ai-running"><span class="spinner"></span><span>Die KI recherchiert und schreibt … ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}<small class="muted">Das dauert meist 1–3 Minuten.</small></span></div>`}
      `}
    </div>
    ${sets.map((s) => { const pending = s.items.filter((i) => i.status === 'pending'); return html`<div class="card pad bb-col sug-set" key=${s.id}>
      <div class="bb-row between"><b>${s.source === 'auto' ? html`<i class="bi bi-alarm"></i> Automatischer Check` : s.mode === 'topic' ? `✨ ${s.topic}` : html`<i class="bi bi-arrow-repeat"></i> Aktualitäts-Check`}</b><small class="muted">${new Date(s.createdAt).toLocaleString('de-DE')}</small></div>
      ${s.summary && html`<p class="small">${s.summary}</p>`}
      ${pending.length > 1 && html`<div class="bb-row gap"><button class="btn btn-sm btn-primary" onClick=${() => apply(s.id, pending.map((i) => i.id))}>Alle ${pending.length} übernehmen</button><button class="btn btn-sm btn-ghost" onClick=${() => dismiss(s.id)}>Alle verwerfen</button></div>`}
      ${s.items.map((it) => html`<div class=${`sug ${it.status}`} key=${it.id}>
        <div class="bb-row gap wrap"><span>${KIND[it.kind][0]} ${KIND[it.kind][1]}</span><span class=${`status-pill ${ACTION[it.action][1]}`}>${ACTION[it.action][0]}</span>${it.status !== 'pending' && html`<span class="muted small">${it.status === 'applied' ? '✓ übernommen' : 'verworfen'}</span>`}</div>
        ${targetLabel(it, data.content) && html`<small class="muted">statt: „${targetLabel(it, data.content)}“</small>`}
        <${ItemPreview} it=${it} />
        <small class="reason">💡 ${it.reason}</small>
        ${it.status === 'pending' && html`<div class="bb-row gap"><button class="btn btn-sm btn-success" onClick=${() => apply(s.id, [it.id])}>✓ Übernehmen</button><button class="btn btn-sm btn-ghost" onClick=${() => dismiss(s.id, [it.id])}>Verwerfen</button></div>`}
      </div>`)}
    </div>`; })}
    <div class="card pad bb-col">
      <h3><i class="bi bi-alarm"></i> Automatisierung</h3>
      <p class="muted small">Die KI prüft die Inhalte regelmäßig auf Aktualität und legt Vorschläge ab.</p>
      <${Field} label="Automatischer Aktualitäts-Check"><${Select} value=${auto.schedule} onInput=${(v) => saveAuto({ schedule: v })} options=${[['off', 'aus', 'nur manuell'], ['weekly', 'wöchentlich', 'jeden 7. Tag'], ['monthly', 'monatlich', 'alle 30 Tage']]} /><//>
      <${Field} label="Dauerhafter Schwerpunkt" hint="optional"><input class="form-control" maxlength="300" value=${auto.focus} onChange=${(e) => saveAuto({ focus: e.target.value })} placeholder="z. B. regionaler Bezug Ostfriesland" /><//>
      <label class="toggle"><input type="checkbox" checked=${auto.autoApply} onChange=${(e) => saveAuto({ autoApply: e.target.checked })} /> Vorschläge automatisch übernehmen</label>
      ${auto.autoApply && html`<small class="muted"><i class="bi bi-exclamation-triangle"></i> Änderungen gehen dann ohne Prüfung live (laufende Räume behalten ihre Inhalte). Im Verlauf jederzeit rückgängig zu machen.</small>`}
      ${auto.lastRun ? html`<small class="muted">Letzter automatischer Check: ${new Date(auto.lastRun).toLocaleString('de-DE')}</small>` : ''}
    </div>
  </aside>`;
}

// ------------------------------------------------------------------ App
const TABS = [['posts', html`<i class="bi bi-newspaper"></i> Beiträge`], ['ads', html`<i class="bi bi-bullseye"></i> Werbung`], ['party', html`<i class="bi bi-megaphone"></i> Wahlwerbung`], ['quiz', html`<i class="bi bi-trophy"></i> Quiz`], ['fairness', html`<i class="bi bi-shield-check"></i> Fairness`], ['history', html`<i class="bi bi-clock-history"></i> Verlauf`]];
function App() {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(null);
  const [tab, setTab] = useState('posts');
  const [auth, setAuth] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const t = useRef(null);
  const toast = (m) => { setMsg(m); clearTimeout(t.current); t.current = setTimeout(() => setMsg(''), 4500); };
  const load = async (resetDraft = false) => {
    try { const d = await api('/api/content'); setData(d); if (resetDraft || !draft) setDraft(clone(d.content)); } catch (e) { if (e.auth) setAuth(true); else toast(e.message); }
  };
  useEffect(() => { load(true); }, []);
  const dirty = !!(data && draft) && JSON.stringify(draft) !== JSON.stringify(data.content);
  useEffect(() => { const h = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } }; addEventListener('beforeunload', h); return () => removeEventListener('beforeunload', h); });
  if (auth) return html`<${Aurora} /><${LoginScreen} title="Inhalts-Editor" />`;
  if (!data || !draft) return html`<${Aurora} /><main class="t-error"><${Logo} size=${40} /></main>`;
  async function save() {
    setBusy(true);
    try { const d = await api('/api/content', { method: 'PUT', body: JSON.stringify({ content: draft }) }); setData({ ...data, ...d }); setDraft(clone(d.content)); toast('✓ Gespeichert – gilt für alle neuen Räume'); } catch (e) { toast(`⚠️ ${e.message}`); } finally { setBusy(false); }
  }
  async function post(url, body) { try { const d = await api(url, { method: 'POST', body: JSON.stringify(body || {}) }); setData({ ...data, ...d }); setDraft(clone(d.content)); toast('✓ Erledigt'); } catch (e) { toast(e.message); } }
  const Tab = { posts: PostsTab, ads: AdsTab, party: PartyTab, quiz: QuizTab, fairness: FairnessTab }[tab];
  return html`<${Aurora} />
    <header class="t-top glass">
      <${Logo} size=${28} sub="Inhalts-Editor" />
      <span class="spacer"></span>
      ${dirty && html`<span class="status-pill warn">Ungespeicherte Änderungen</span>`}
      <button class="btn btn-sm btn-primary" disabled=${!dirty || busy} onClick=${save}><i class="bi bi-floppy"></i> Speichern</button>
      <${Dropdown} btnClass="btn btn-sm" icon="three-dots" label="Mehr" items=${[
        { label: 'Änderungen verwerfen', icon: 'x-circle', disabled: !dirty, onClick: () => setDraft(clone(data.content)) },
        { label: 'Verlauf anzeigen', icon: 'clock-history', hint: `${data.history.length} gespeicherte Versionen`, onClick: () => setTab('history') },
        { label: 'Inhalte exportieren', icon: 'filetype-json', hint: 'Aktuellen Stand als Datei sichern', onClick: () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data.content, null, 2)], { type: 'application/json' })); a.download = `bubbl-inhalte-${new Date().toISOString().slice(0, 10)}.json`; a.click(); } },
        { label: 'Inhalte importieren …', icon: 'upload', hint: 'JSON-Datei als Entwurf laden', onClick: () => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'application/json'; i.onchange = async () => { try { setDraft(JSON.parse(await i.files[0].text())); toast('Import geladen – prüfen und speichern'); } catch { toast('Datei konnte nicht gelesen werden'); } }; i.click(); } },
        { divider: true },
        { label: 'Auf Standard zurücksetzen', icon: 'arrow-counterclockwise', danger: true, hint: 'Originalmaterial; aktueller Stand bleibt im Verlauf', onClick: () => confirm('Alle Inhalte auf den Standard (Originalmaterial) zurücksetzen? Der aktuelle Stand bleibt im Verlauf.') && post('/api/content/reset') },
      ]} />
      <${Dropdown} btnClass="btn btn-sm btn-ghost" icon="person-circle" label="Lehrkraft" items=${[
        { label: 'Startseite / meine Räume', icon: 'house', href: '/' },
        { divider: true },
        { label: 'Abmelden', icon: 'box-arrow-right', onClick: async () => { await fetch('/api/logout', { method: 'POST' }); location.replace('/'); } },
      ]} />
    </header>
    <main class="ed-main">
      <section class="card pad bb-col ed-panel">
        <nav class="ed-tabs">${TABS.map(([k, l]) => html`<button class=${`ed-tab ${tab === k ? 'on' : ''}`} onClick=${() => setTab(k)}>${l}</button>`)}</nav>
        <p class="muted small">Gespeicherte Inhalte gelten für alle <b>neu erstellten</b> Räume. Ein bestehender Raum übernimmt sie im Cockpit über „Neueste Inhalte übernehmen“ (nur in der Lobby).</p>
        ${tab === 'history' ? html`<${HistoryTab} meta=${data} onRestore=${(id) => post('/api/content/restore', { id })} />` : html`<${Tab} c=${draft} set=${setDraft} />`}
      </section>
      <${Assistant} data=${data} dirty=${dirty} reload=${() => load(false)} onApplied=${() => load(true)} toast=${toast} />
    </main>
    ${msg && html`<div class="bb-toast">${msg}</div>`}`;
}
render(html`<${App} />`, document.getElementById('app'));
