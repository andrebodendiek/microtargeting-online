// Beamer-Ansichten: Algorithmus-Werkbank, Fairness-Check, Live-Quiz
import { html, useEffect, useRef, Avatar, GroupBadge, groupColor, AdVisual, CountUp, confetti, CATEGORIES, CAT, AD } from './lib.js';
import { FAIRNESS } from '/shared/content.js';
import { useCountdown } from './play-extra.js';

const pct = (x) => (x == null ? '–' : `${Math.round(x * 100)} %`);
const SIG = [['like', '❤️'], ['dwell', '👀'], ['open', '📖'], ['read', '⏱️']];

function F1Bar({ value, test, label }) {
  return html`<div class="f1wrap"><div class="f1bar"><i style=${`width:${(value ?? 0) * 100}%`}></i>${test != null ? html`<i class="test" style=${`width:${test * 100}%`}></i>` : ''}</div><em>${label}</em></div>`;
}

export function WerkbankStage({ v }) {
  const wb = v.werkbank;
  if (!wb) return null;
  const rows = wb.groups.map((g) => ({ ...g, f1: g.result.train.f1, t: g.result.test.f1 })).sort((a, b) => (b.f1 ?? -1) - (a.f1 ?? -1));
  const base = wb.baselines;
  return html`<div class="split wide-left">
    <div class="glass stage-card">
      <div class="card-head"><h3>🛠️ Bestenliste der Algorithmen</h3><span class="muted">Gesamtwert F1 · Trainingsdaten: ${wb.split.train.map((id) => AD[id]?.label).join(', ')}</span></div>
      ${wb.test && html`<div class="legend"><span class="lg solid" style="--lc:#ec4899">Trainingsdaten</span><span class="lg solid" style="--lc:#0ea5e9">Testdaten (${wb.split.test.map((id) => AD[id]?.label).join(', ')})</span></div>`}
      <div class="wb-rows">
        ${rows.map((g, i) => html`<div class="wb-row" key=${g.id}>
          <span class="wb-rank">${i + 1}</span><${GroupBadge} gid=${g.id} />
          <span class="wb-weights">${SIG.map(([k, ic]) => html`<span class="wbw" title=${k}><small>${ic}</small><i style=${`height:${(g.weights[k] / 5) * 100}%`}></i></span>`)}</span>
          <${F1Bar} value=${g.f1} test=${wb.test ? g.t : null} label=${wb.test ? `${pct(g.f1)} → ${pct(g.t)}` : pct(g.f1)} />
        </div>`)}
        <div class="wb-row base"><span class="wb-rank">–</span><span class="base-name">👥 Gruppen (Schritt 4)</span><span></span><${F1Bar} value=${base.human.train.f1} test=${wb.test ? base.human.test.f1 : null} label=${wb.test ? `${pct(base.human.train.f1)} → ${pct(base.human.test.f1)}` : pct(base.human.train.f1)} /></div>
        <div class="wb-row base"><span class="wb-rank">–</span><span class="base-name">🤖 bubbl</span><span></span><${F1Bar} value=${base.algo.train.f1} test=${wb.test ? base.algo.test.f1 : null} label=${wb.test ? `${pct(base.algo.train.f1)} → ${pct(base.algo.test.f1)}` : pct(base.algo.train.f1)} /></div>
      </div>
    </div>
    <div class="glass stage-card glossary">
      <div class="card-head"><h3>Fachbegriffe</h3></div>
      <dl>
        <dt>Gewichtung</dt><dd>Wie stark ein Signal (Like, Verweildauer …) in die Punktzahl einfließt.</dd>
        <dt>Trefferquote (Präzision)</dt><dd>Anteil der gezeigten Anzeigen, die wirklich gepasst haben.</dd>
        <dt>Reichweite (Recall)</dt><dd>Anteil der Interessierten, die die Anzeige auch bekommen haben.</dd>
        <dt>F1-Wert</dt><dd>Verbindet beide Werte zu einer Note (100 % = perfekt).</dd>
        <dt>Trainings- & Testdaten</dt><dd>Mit Trainingsdaten wird eingestellt, mit unbekannten Testdaten ehrlich geprüft.</dd>
        <dt>Overfitting</dt><dd>Zu genau an Trainingsdaten angepasst – bei neuen Daten schlechter.</dd>
      </dl>
    </div>
  </div>`;
}

export function FairnessStage({ v }) {
  const f = v.fairness;
  if (!f) return null;
  const c = f.cells;
  const cats = [...CATEGORIES.map((x) => x.id)].filter((id) => f.byCat[id]?.n);
  const votes = f.fairYes + f.fairNo;
  return html`<div class="stack">
    <div class="split">
      <div class="glass stage-card">
        <div class="card-head"><h3>⚖️ Wer hat das Angebot gesehen?</h3><span class=${`status-pill ${f.rule ? 'ok' : 'warn'}`}>Fairness-Regel ${f.rule ? 'AN' : 'AUS'}</span></div>
        <div class="fair-ad"><${AdVisual} ad=${FAIRNESS.ad} compact /></div>
        <div class="fair-matrix">
          <span></span><b>gesehen</b><b>nicht gesehen</b>
          <b>interessiert</b><div class="fm ok"><strong><${CountUp} value=${c.reached} /></strong><small>erreicht</small></div><div class="fm bad"><strong><${CountUp} value=${c.excluded} /></strong><small>ausgeschlossen!</small></div>
          <b>nicht interessiert</b><div class="fm warn"><strong><${CountUp} value=${c.waste} /></strong><small>Streuverlust</small></div><div class="fm"><strong><${CountUp} value=${c.none} /></strong><small>egal</small></div>
        </div>
      </div>
      <div class="glass stage-card">
        <div class="card-head"><h3>Anteil, der die Anzeige sah – nach Hauptinteresse</h3></div>
        <div class="fair-bars">${cats.map((id) => { const b = f.byCat[id]; const share = b.n ? b.saw / b.n : 0; return html`<div class="fb-row" style=${`--c:${CAT[id].color}`}>
          <span>${CAT[id].icon} ${CAT[id].name}</span><div class="fb"><i style=${`width:${share * 100}%`}></i></div><em>${b.saw}/${b.n}${b.excluded ? ` · ${b.excluded} ausgeschl.` : ''}</em></div>`; })}</div>
        <div class="fair-vote"><span>Ist das fair? (${votes} Stimmen)</span>
          <div class="im-bar"><i class="yes" style=${`flex:${f.fairYes || 0.001}`}>⚖️ fair ${f.fairYes}</i><i class="no" style=${`flex:${f.fairNo || 0.001}`}>🚩 unfair ${f.fairNo}</i></div></div>
      </div>
    </div>
    <p class="insight">${FAIRNESS.explain}</p>
  </div>`;
}

const SHAPES = [['▲', '#e11d48'], ['◆', '#2563eb'], ['●', '#d97706'], ['■', '#16a34a']];
export function QuizStage({ v }) {
  const q = v.quiz;
  const left = useCountdown(q);
  const ended = q && q.idx >= q.total;
  const fired = useRef(false);
  useEffect(() => { if (ended && !fired.current) { fired.current = true; confetti(160); } }, [ended]);
  if (!q) return null;
  const board = html`<div class="glass stage-card quiz-board">
    <div class="card-head"><h3>🏅 Bestenliste</h3></div>
    ${q.leaderboard.map((p, i) => html`<div class="lb-row" key=${p.id}><span class="lb-rank">${i + 1}</span><${Avatar} id=${p.id} avatar=${p.avatar} size=${46} /><b><${CountUp} value=${p.score} /></b></div>`)}
  </div>`;
  if (q.idx < 0) return html`<div class="split wide-left"><div class="glass stage-card center quiz-title"><span class="quiz-trophy">🏆</span><h2>Live-Quiz</h2><p>${q.total} Fragen · ${q.seconds} Sekunden pro Frage · schnelle richtige Antworten bringen mehr Punkte</p></div>${board}</div>`;
  if (ended) {
    const top = q.leaderboard.slice(0, 3);
    return html`<div class="split wide-left"><div class="glass stage-card center podium-card"><h2>🎉 Siegerehrung</h2>
      <div class="podium">${[1, 0, 2].map((i) => top[i] && html`<div class=${`pod p${i + 1}`}><${Avatar} id=${top[i].id} avatar=${top[i].avatar} size=${i === 0 ? 96 : 72} /><b>${top[i].score.toLocaleString('de-DE')}</b><div class="pod-block">${i + 1}</div></div>`)}</div>
    </div>${board}</div>`;
  }
  const item = q.item; const max = Math.max(1, ...q.counts);
  return html`<div class="split wide-left">
    <div class="glass stage-card quiz-stage">
      <div class="card-head"><span class="muted">Frage ${q.idx + 1} von ${q.total}</span>${q.open ? html`<span class=${`quiz-clock ${left <= 5 ? 'hot' : ''}`}>${left}</span>` : html`<span class="muted">${q.answered} Antworten</span>`}</div>
      <h2 class="quiz-question">${item.q}</h2>
      <div class="quiz-grid">${item.options.map((o, i) => html`<div class=${`qopt ${q.revealed ? (item.correct === i ? 'correct' : 'dim') : ''}`} style=${`--c:${SHAPES[i][1]}`}>
        <span class="shape">${SHAPES[i][0]}</span><span class="qtext">${o}</span>
        ${q.revealed && html`<span class="qcount"><i style=${`width:${(q.counts[i] / max) * 100}%`}></i><b>${q.counts[i]}</b></span>`}
      </div>`)}</div>
      ${q.open && html`<p class="muted center">${q.answered} von ${v.players.length} haben geantwortet</p>`}
      ${q.revealed && item.explain && html`<p class="insight">💡 ${item.explain}</p>`}
    </div>
    ${board}
  </div>`;
}
export { groupColor };
