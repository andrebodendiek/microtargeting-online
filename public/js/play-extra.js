// Zusätzliche SchülerInnen-Ansichten: Tracking-Inspektor, DSGVO-Auskunft, Algorithmus-Werkbank, Fairness-Check, Live-Quiz
import { html, useState, useEffect, useRef, Avatar, GroupBadge, AdVisual, CatChip, confetti, store, CAT, AD } from './lib.js';
import { ADS, FAIRNESS } from '/shared/content.js';

const pct = (x) => (x == null ? '–' : `${Math.round(x * 100)} %`);
const time = (t) => new Date(t).toLocaleTimeString('de-DE');

// ------------------------------------------------------------------ Tracking-Inspektor
export function TrackingInspector({ log = [] }) {
  const [open, setOpen] = useState(null);
  const entries = log.slice().reverse();
  return html`<div class="glass pad inspector">
    <h3>Tracking-Inspektor</h3>
    <p class="muted small">Das hat dein Handy an den bubbl-Server geschickt – automatisch alle paar Sekunden, ohne dass du etwas angeklickt hast. Genau so arbeiten echte Apps (nur viel häufiger).</p>
    <div class="req-list">
      ${entries.length ? entries.map((e, i) => html`<button class=${`req ${open === i ? 'open' : ''}`} onClick=${() => setOpen(open === i ? null : i)}>
        <span class="req-line"><b class=${`method ${e.req.split(' ')[0].toLowerCase()}`}>${e.req.split(' ')[0]}</b><code>${e.req.split(' ')[1]}</code><small>${time(e.t)}</small></span>
        <pre>${JSON.stringify(e.body, null, open === i ? 2 : 0)}</pre>
      </button>`) : html`<small class="muted">Noch keine Anfragen protokolliert.</small>`}
    </div>
    <p class="muted small">Format: <b>JSON</b> (JavaScript Object Notation) – Schlüssel-Wert-Paare, die Programme leicht lesen können. <code>dwell_ms</code> = Verweildauer in Millisekunden je Beitrag.</p>
  </div>`;
}

// ------------------------------------------------------------------ DSGVO-Auskunft
export function Auskunft({ code }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function load() {
    setBusy(true); setErr('');
    try {
      const r = await fetch(`/api/rooms/${code}/auskunft`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: store.get(`bubbl:token:${code}`) }) });
      if (!r.ok) throw new Error('Auskunft nicht möglich.');
      setData(await r.json());
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  function download() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `bubbl-datenauskunft-id${data.betroffene_person.nutzer_id}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const d = data;
  return html`<div class="glass pad">
    <h3>Datenauskunft nach Art. 15 DSGVO</h3>
    <p class="muted small">Du hast das Recht zu erfahren, welche Daten ein Unternehmen über dich speichert. Fordere deine Auskunft an!</p>
    <button class="btn btn-primary" disabled=${busy} onClick=${load}>${busy ? 'Wird erstellt …' : d ? 'Aktualisieren' : 'Meine Daten anfordern'}</button>
    ${err && html`<p class="error">${err}</p>`}
    ${d && html`<div class="auskunft">
      <div class="letter">
        <small class="muted">${d.verantwortlicher} · ${new Date(d.erstellt_am).toLocaleString('de-DE')}</small>
        <b>Auskunft für Nutzer-ID #${d.betroffene_person.nutzer_id} ${d.betroffene_person.avatar}</b>
        <dl>
          <dt>Zwecke</dt><dd>${d.verarbeitungszwecke.join(' · ')}</dd>
          <dt>Datenkategorien</dt><dd>${d.kategorien_von_daten.join(' · ')}</dd>
          <dt>Empfänger</dt><dd>${d.empfaenger.join(' · ')}</dd>
          <dt>Herkunft</dt><dd>${d.herkunft}</dd>
          <dt>Speicherdauer</dt><dd>${d.speicherdauer}</dd>
          <dt>Profiling (Art. 22)</dt><dd>${d.automatisierte_entscheidungen_profiling.hinweis}<br/>Vermutungen: ${d.automatisierte_entscheidungen_profiling.vermutungen.join('; ') || '–'}</dd>
          <dt>Gespeichert</dt><dd>${d.gespeicherte_daten.likes.length} Likes, ${Object.keys(d.gespeicherte_daten.verweildauer_ms_je_beitrag).length} Beiträge mit Verweildauer, ${d.gespeicherte_daten.datenpunkte_gesamt} Datenpunkte, ${d.gespeicherte_daten.protokoll_letzte_anfragen.length} protokollierte Anfragen</dd>
          <dt>Deine Rechte</dt><dd>${d.deine_rechte.join(' · ')}</dd>
        </dl>
      </div>
      <button class="btn" onClick=${download}>⬇︎ Vollständige Daten herunterladen (JSON)</button>
    </div>`}
  </div>`;
}

// ------------------------------------------------------------------ Algorithmus-Werkbank
const SIGNALS = [
  ['like', '❤️ Likes', 'pro Like in der Kategorie'],
  ['dwell', '👀 Verweildauer', 'pro 10 Sekunden Ansehen'],
  ['open', '📖 Artikel geöffnet', 'pro geöffnetem Artikel'],
  ['read', '⏱️ Lesezeit', 'pro 10 Sekunden Lesen'],
];
const fmtW = (x) => x.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function Confusion({ r }) {
  return html`<div class="confusion">
    <div class="cm tp"><b>${r.tp}</b><small>richtig gezeigt</small></div>
    <div class="cm fp"><b>${r.fp}</b><small>unnötig gezeigt</small></div>
    <div class="cm fn"><b>${r.fn}</b><small>Interessierte verpasst</small></div>
    <div class="cm tn"><b>${r.tn}</b><small>richtig weggelassen</small></div>
  </div>`;
}
function Metric({ label, value, hint, big }) {
  return html`<div class=${`metric-box ${big ? 'big' : ''}`}><b>${pct(value)}</b><span>${label}</span>${hint && html`<small class="muted">${hint}</small>`}</div>`;
}

export function Werkbank({ v, act }) {
  const wb = v.werkbank;
  const g = v.group;
  const [wLocal, setW] = useState(wb?.weights);
  const timer = useRef(null);
  const editing = useRef(0);
  useEffect(() => { if (Date.now() - editing.current > 1200) setW(wb?.weights); }, [JSON.stringify(wb?.weights)]);
  if (!wb || !g) return html`<div class="glass pad">Du bist noch keiner Gruppe zugeordnet.</div>`;
  const w = wLocal || wb.weights; // falls die Gruppe erst nachträglich zugeordnet wurde
  const change = (k, val) => {
    const next = { ...w, [k]: val }; setW(next); editing.current = Date.now();
    clearTimeout(timer.current); timer.current = setTimeout(() => act('weights', { weights: next }), 180);
  };
  const r = wb.result.train;
  const terms = SIGNALS.filter(([k]) => w[k] > 0).map(([k, l]) => `${fmtW(w[k])} × ${l.split(' ').slice(1).join(' ').toLowerCase()}`);
  return html`<section class="bb-col">
    <div class="glass pad group-head">
      <div class="bb-row wrap gap"><${GroupBadge} gid=${g.id} big /><span class="status-pill ok">Platz ${wb.rank} von ${wb.groups}</span></div>
      <div class="members">${g.members.map((m) => html`<${Avatar} id=${m.id} avatar=${m.avatar} size=${34} online=${m.online} />`)}</div>
      <p class="muted small">Alle in eurer Gruppe sehen und verändern dieselben Regler.</p>
    </div>
    <div class="glass pad bb-col">
      <h3>Euer Targeting-Algorithmus</h3>
      ${SIGNALS.map(([k, label, hint]) => html`<label class="slider">
        <span class="slider-head"><b>${label}</b><em>${fmtW(w[k])}</em></span>
        <input type="range" min="0" max="5" step="0.5" value=${w[k]} onInput=${(e) => change(k, Number(e.target.value))} />
        <small class="muted">Gewicht ${hint}</small>
      </label>`)}
      <label class="slider">
        <span class="slider-head"><b>🚧 Mindestpunktzahl</b><em>${fmtW(w.threshold)}</em></span>
        <input type="range" min="0" max="5" step="0.5" value=${w.threshold} onInput=${(e) => change('threshold', Number(e.target.value))} />
        <small class="muted">Nur wer mehr Punkte hat, bekommt die Anzeige</small>
      </label>
      <pre class="pseudo">${`für jede Anzeige:
  für jede Person:
    punkte = ${terms.length ? terms.join('\n           + ') : '0'}
             (nur Kategorien der Anzeige)
  zeige die Anzeige den ${wb.budget} Personen
  mit den meisten Punkten, falls punkte > ${fmtW(w.threshold)}`}</pre>
    </div>
    <div class="glass pad bb-col">
      <h3>Ergebnis mit Trainingsdaten</h3>
      <p class="muted small">Geprüft an euren echten Bewertungen der Anzeigen ${wb.split.train.map((id) => AD[id]?.label).join(', ')}.</p>
      <div class="metrics"><${Metric} big label="Gesamtwert (F1)" value=${r.f1} hint="verbindet beide Werte" /><${Metric} label="Trefferquote" value=${r.precision} hint="gezeigt & passend" /><${Metric} label="Reichweite" value=${r.recall} hint="Interessierte erreicht" /></div>
      <${Confusion} r=${r} />
      <div class="compare">
        <span>👥 Gruppen (Schritt 4): <b>${pct(wb.baselines.human.train.f1)}</b></span>
        <span>🤖 bubbl: <b>${pct(wb.baselines.algo.train.f1)}</b></span>
      </div>
    </div>
    ${wb.test ? html`<div class="glass pad bb-col test-card">
      <span class="kicker">Aufgedeckt</span>
      <h3>Und mit neuen Testdaten?</h3>
      <p class="muted small">Anzeigen, die euer Algorithmus noch nie „gesehen“ hat: ${wb.split.test.map((id) => AD[id]?.label).join(', ')}.</p>
      <div class="metrics"><${Metric} big label="F1 Testdaten" value=${wb.result.test.f1} /><${Metric} label="F1 Training" value=${r.f1} /></div>
      <p class="small">${wb.result.test.f1 != null && r.f1 != null && wb.result.test.f1 < r.f1 - 0.1 ? '⚠️ Deutlich schlechter als im Training: Euer Algorithmus ist an die Trainingsdaten überangepasst (Overfitting).' : '✓ Euer Algorithmus funktioniert auch mit neuen Daten ähnlich gut – er verallgemeinert.'}</p>
    </div>` : ''}
  </section>`;
}

// ------------------------------------------------------------------ Fairness-Check
export function Fairness({ v, act }) {
  const f = v.fairness; const ad = FAIRNESS.ad;
  const a = f.answers || {};
  const yesNo = (key, val, label) => html`<button class=${`btn ${a[key] === val ? (val ? 'btn-success' : 'btn-danger') : ''}`} onClick=${() => act('fairAnswer', { key, value: a[key] === val ? null : val })}>${label}</button>`;
  const done = a.interest != null && a.fair != null;
  return html`<section class="bb-col stagger">
    ${f.saw ? html`<article class="post card">
      <div class="post-head"><span class="page-av">${ad.art[0]}</span><div class="page-meta"><b>${ad.brand}</b><span class="sponsored"><b>Gesponsert</b></span></div></div>
      <${AdVisual} ad=${ad} />
      <div class="post-body"><h3>${ad.product}</h3><p>${ad.slogan}</p><span class="status-pill ok">✓ Diese Anzeige wurde dir gezeigt</span></div>
    </article>` : html`<article class="post card not-shown">
      <div class="post-head"><span class="page-av">🚫</span><div class="page-meta"><b>Diese Anzeige hast du NICHT gesehen</b><span class="sponsored">Der Algorithmus hat dich aussortiert</span></div></div>
      <div class="greyed"><${AdVisual} ad=${ad} /></div>
      <div class="post-body"><h3>${ad.product}</h3><p>${ad.slogan}</p></div>
    </article>`}
    <div class="glass pad bb-col">
      <h3>${FAIRNESS.question}</h3>
      <div class="rate">${yesNo('interest', true, '👍 Ja, interessant')}${yesNo('interest', false, '👎 Eher nicht')}</div>
      <h3>${FAIRNESS.fairQuestion}</h3>
      <div class="rate">${yesNo('fair', true, '⚖️ Ja, fair')}${yesNo('fair', false, '🚩 Nein, unfair')}</div>
    </div>
    ${done && html`<div class="glass pad"><span class="kicker">Hintergrund</span><p>${FAIRNESS.explain}</p>
      <div class="bb-row wrap gap">${(FAIRNESS.proxyCats || []).map((c) => html`<${CatChip} cat=${c} small />`)}<small class="muted">= Ersatzmerkmal (Proxy), nach dem ausgewählt wurde</small></div></div>`}
  </section>`;
}

// ------------------------------------------------------------------ Live-Quiz
const SHAPES = [['▲', '#e11d48'], ['◆', '#2563eb'], ['●', '#d97706'], ['■', '#16a34a']];
export function useCountdown(q) {
  const [, tick] = useState(0);
  const offset = useRef(0);
  useEffect(() => { offset.current = (q?.now || Date.now()) - Date.now(); }, [q?.now]);
  useEffect(() => { if (!q?.open) return; const t = setInterval(() => tick((x) => x + 1), 250); return () => clearInterval(t); }, [q?.open, q?.idx]);
  if (!q?.open) return 0;
  return Math.max(0, Math.ceil((q.startedAt + q.seconds * 1000 - (Date.now() + offset.current)) / 1000));
}
export function Quiz({ v, act }) {
  const q = v.quiz;
  const left = useCountdown(q);
  const prevRevealed = useRef(false);
  useEffect(() => { if (q.revealed && !prevRevealed.current && q.mine === q.item?.correct) confetti(60); prevRevealed.current = q.revealed; }, [q.revealed]);
  if (q.idx < 0) return html`<div class="glass pad center quiz-wait"><span class="big-emoji">🏆</span><h2>Gleich geht's los!</h2><p class="muted">Schau auf den Beamer.</p></div>`;
  if (q.idx >= q.total) return html`<div class="glass pad center quiz-wait"><span class="big-emoji">🎉</span><h2>Quiz beendet</h2><p>Platz <b>${q.rank}</b> von ${q.players} · <b>${q.score.toLocaleString('de-DE')}</b> Punkte</p></div>`;
  const item = q.item;
  return html`<section class="bb-col">
    <div class="glass pad">
      <div class="bb-row between"><small class="muted">Frage ${q.idx + 1} von ${q.total}</small>${q.open && html`<span class=${`status-pill ${left <= 5 ? 'bad' : 'warn'}`}>⏱ ${left} s</span>`}</div>
      <h2 class="quiz-q">${item.q}</h2>
      ${q.open && html`<div class="quiz-timer"><i style=${`width:${(left / q.seconds) * 100}%`}></i></div>`}
    </div>
    <div class="quiz-options">
      ${item.options.map((o, i) => {
        const chosen = q.mine === i; const correct = q.revealed && item.correct === i; const wrong = q.revealed && chosen && !correct;
        return html`<button class=${`quiz-opt ${chosen ? 'chosen' : ''} ${correct ? 'correct' : ''} ${wrong ? 'wrong' : ''}`} style=${`--c:${SHAPES[i][1]}`}
          disabled=${!q.open || q.mine != null || left <= 0} onClick=${() => act('quizAnswer', { idx: q.idx, a: i })}>
          <span class="shape">${SHAPES[i][0]}</span><span>${o}</span>${correct ? html`<b>✓</b>` : wrong ? html`<b>✗</b>` : ''}
        </button>`;
      })}
    </div>
    ${q.mine != null && !q.revealed && html`<div class="glass pad center">✓ Antwort eingeloggt – warte auf die Auflösung.</div>`}
    ${q.open && q.mine == null && left <= 0 && html`<div class="glass pad center">⏰ Zeit abgelaufen.</div>`}
    ${q.revealed && html`<div class=${`glass pad ${q.mine === item.correct ? 'quiz-right' : 'quiz-wrong'}`}>
      <h3>${q.mine === item.correct ? '🎉 Richtig!' : q.mine == null ? '😶 Keine Antwort' : '❌ Leider falsch'}</h3>
      <p>${item.explain}</p>
      <p class="muted small">Dein Stand: <b>${q.score.toLocaleString('de-DE')}</b> Punkte · Platz ${q.rank} von ${q.players}</p>
    </div>`}
  </section>`;
}
export { ADS };
