import {
  html, render, useState, useEffect, useRef, useRoom, LoginScreen, qs, Logo, Aurora, Avatar, CatChip, GroupBadge, groupColor,
  PostArt, AdVisual, CountUp, Radar, CatBars, Stepper, Progress, confetti, CATEGORIES, CAT, POST, AD, PHASE,
} from './lib.js';
import { ADS, ROUND1, PARTY, PARTY_MESSAGES, CONTRADICTIONS, REFLECTION_QUESTIONS } from '/shared/content.js';
import { WerkbankStage, FairnessStage, QuizStage } from './beamer-extra.js';

const code = (qs.get('c') || '').toUpperCase();
const key = location.hash.slice(1);
const joinUrl = `${location.origin}/?c=${code}`;
const pct = (x) => (x == null ? '–' : `${Math.round(x * 100)} %`);
const fmtDur = (ms) => { const s = Math.round(ms / 1000); return s >= 3600 ? `${(s / 3600).toFixed(1).replace('.', ',')} h` : s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min` : `${s} s`; };

function JoinBox({ big }) {
  return html`<div class=${`joinbox ${big ? 'big' : ''}`}>
    <img src=${`/api/qr.svg?text=${encodeURIComponent(joinUrl)}`} alt="QR-Code zum Beitreten" />
    <div><small>${location.host}</small><b>${code}</b></div>
  </div>`;
}

function TaskPanel({ v }) {
  const p = PHASE[v.phase];
  return html`<aside class="task-panel glass">
    <span class="mode">${p.mode === 'GA' ? '👥 Gruppenarbeit' : p.mode === 'EA' ? '👤 Einzelarbeit' : '🗣️ Plenum'}</span>
    <ol>${p.task.map((t) => html`<li>${t.replace('{maxLikes}', v.settings.maxLikes)}</li>`)}</ol>
    <${Progress} big done=${v.progress.done} total=${v.progress.total} label=${v.progress.label} />
  </aside>`;
}

// ------------------------------------------------------------------ Phasen
function Lobby({ v }) {
  return html`<div class="lobby">
    <div class="lobby-join glass">
      <h2>Mach mit bei <span class="grad">bubbl</span>!</h2>
      <${JoinBox} big />
      <p>QR-Code scannen oder <b>${location.host}</b> öffnen und den Code eingeben.</p>
    </div>
    <div class="lobby-wall glass">
      <div class="wall-head"><h3>Im Netzwerk</h3><span class="big-count"><${CountUp} value=${v.players.length} /></span></div>
      <div class="wall">${v.players.map((p) => html`<div class="wall-item pop" key=${p.id}><${Avatar} id=${p.id} avatar=${p.avatar} size=${64} online=${p.online} /></div>`)}</div>
      ${!v.players.length && html`<p class="muted center">Noch niemand da … 👀</p>`}
    </div>
  </div>`;
}

function LikeRing({ p, max }) {
  const k = Math.min(1, p.likes / max);
  const done = p.feedDone || p.likes >= max;
  return html`<div class=${`ring ${done ? 'done' : ''}`} style=${`--k:${k}`}>
    <${Avatar} id=${p.id} avatar=${p.avatar} size=${58} online=${p.online} />
    <small>${done ? '✓' : `${p.likes}/${max}`}</small>
  </div>`;
}

function Feed({ v }) {
  const ranking = ROUND1.map((x) => ({ post: x, n: v.postLikes[x.id]?.length || 0 })).sort((a, b) => b.n - a.n).slice(0, 6);
  const top = Math.max(1, ranking[0]?.n || 0);
  return html`<div class="split">
    <div class="glass stage-card">
      <div class="card-head"><h3>Wer liked gerade?</h3><span class="metric"><b><${CountUp} value=${v.totals.likes} /></b> Likes</span></div>
      <div class="rings">${v.players.map((p) => html`<${LikeRing} key=${p.id} p=${p} max=${v.settings.maxLikes} />`)}</div>
    </div>
    <div class="glass stage-card">
      <div class="card-head"><h3>🔥 Trending auf bubbl</h3></div>
      <div class="trending">${ranking.map(({ post, n }, i) => html`<div class="trend" key=${post.id}>
        <span class="trend-rank">${i + 1}</span><${PostArt} post=${post} small />
        <div class="trend-body"><b>${post.headline}</b><div class="trend-bar"><i style=${`width:${(n / top) * 100}%`}></i></div></div>
        <span class="trend-n">❤️ ${n}</span>
      </div>`)}</div>
    </div>
  </div>`;
}

function Heatmap({ v, showTruthDiff }) {
  const ids = v.players.map((p) => p.id);
  const maxN = Math.max(1, ...CATEGORIES.flatMap((c) => Object.values(v.db?.[c.id] || {})));
  return html`<div class="heatmap" style=${`--cols:${ids.length}`}>
    <div class="hm-row head"><span></span>${ids.map((id) => html`<span class="hm-id">${id}</span>`)}</div>
    ${CATEGORIES.map((c) => {
      const g = v.groups.find((x) => x.cats.includes(c.id));
      return html`<div class="hm-row" style=${`--c:${c.color}`}>
        <span class="hm-cat">${g && html`<${GroupBadge} gid=${g.id} />`}<span>${c.icon} ${c.name}</span></span>
        ${ids.map((id) => { const n = v.db?.[c.id]?.[id] || 0; const t = v.truth?.[c.id]?.[id] || 0; const wrong = showTruthDiff && g?.tallyDone && n !== t;
          return html`<span class=${`hm-cell ${n ? 'has' : ''} ${wrong ? 'wrong' : ''}`} style=${`--k:${n / maxN}`} title=${`ID ${id} · ${c.name}: ${n}`}>${n || ''}</span>`; })}
      </div>`;
    })}
  </div>`;
}

function Auswertung({ v }) {
  return html`<div class="stack">
    <div class="glass stage-card grow">
      <div class="card-head"><h3>📊 Unsere Interessen-Datenbank</h3><span class="muted">wird live von den Gruppen befüllt</span></div>
      <${Heatmap} v=${v} showTruthDiff />
    </div>
    <div class="group-strip">${v.groups.map((g) => html`<div class=${`group-card glass ${g.tallyDone ? 'done' : ''}`} style=${`--g:${groupColor(g.id)}`}>
      <div class="bb-row"><${GroupBadge} gid=${g.id} />${g.tallyDone ? html`<span class="status-pill ok">✓ ${pct(g.accuracy)} korrekt</span>` : html`<span class="status-pill warn">${g.filled} Einträge</span>`}</div>
      <div class="bb-row gap">${g.cats.map((c) => html`<span title=${CAT[c].name} class="cat-ico">${CAT[c].icon}</span>`)}<span class="members-mini">${g.members.map((id) => html`<i>${v.players.find((p) => p.id === id)?.avatar}</i>`)}</span></div>
    </div>`)}</div>
  </div>`;
}

// Bipartiter Graph: Anzeigen -> Empfänger*innen
function TargetGraph({ v, targets }) {
  const W = 1000, H = 800;
  const ps = v.players;
  const cols = ps.length > 22 ? 2 : 1;
  const perCol = Math.ceil(ps.length / cols) || 1;
  const py = (i) => 30 + ((i % perCol) + 0.5) * ((H - 60) / perCol);
  const pos = Object.fromEntries(ps.map((p, i) => [p.id, [cols > 1 ? (Math.floor(i / perCol) === 0 ? W - 190 : W - 60) : W - 80, py(i)]]));
  const ay = (i) => 40 + (i + 0.5) * ((H - 80) / ADS.length);
  return html`<svg class="tgraph" viewBox=${`0 0 ${W} ${H}`} role="img" aria-label="Welche Anzeige erreicht wen">
    ${ADS.map((a, i) => (targets[a.id] || []).map((id) => {
      const [x2, y2] = pos[id] || [0, 0]; const y1 = ay(i);
      return html`<path class="tlink" style=${`--c:${a.bg[0]}`} d=${`M300,${y1} C${560},${y1} ${x2 - 220},${y2} ${x2 - 26},${y2}`} />`;
    }))}
    ${ADS.map((a, i) => { const w = v.adWork?.[a.id]; const g = v.groups.find((x) => x.ads.includes(a.id)); const n = (targets[a.id] || []).length;
      return html`<g class=${`tad ${w?.done ? 'done' : ''}`} transform=${`translate(20,${ay(i) - 30})`}>
        <rect width="280" height="60" rx="16" style=${`--c:${a.bg[0]}`} />
        <text x="16" y="40" class="tad-emoji">${a.art[0]}</text>
        <text x="64" y="27" class="tad-name">${a.label}</text>
        <text x="64" y="47" class="tad-sub">${g ? `Gruppe ${g.id}` : ''} · ${n} Pers. ${w?.done ? '✓' : ''}</text>
      </g>`; })}
    ${ps.map((p) => { const [x, y] = pos[p.id]; const n = ADS.filter((a) => targets[a.id]?.includes(p.id)).length;
      return html`<g class="tnode" transform=${`translate(${x},${y})`}>
        <circle r="22" /><text class="tnode-emoji" y="7">${p.avatar}</text>
        <text class="tnode-id" x="30" y="6">#${p.id}${n > 0 ? html`<tspan class="tnode-n" dx="6">${n}×</tspan>` : ''}</text>
      </g>`; })}
  </svg>`;
}

function Werbung({ v }) {
  return html`<div class="split wide-left">
    <div class="glass stage-card"><div class="card-head"><h3>🎯 Wer bekommt welche Werbung?</h3><span class="metric">Budget: <b>${v.budget}</b> Kontakte je Anzeige</span></div>
      <${TargetGraph} v=${v} targets=${v.human || {}} />
    </div>
    <div class="glass stage-card">
      <div class="card-head"><h3>Gewählte Zielgruppen</h3></div>
      <div class="ad-status">${ADS.map((a) => { const w = v.adWork?.[a.id] || { cats: [], targets: [] }; return html`<div class=${`ad-st ${w.done ? 'done' : ''}`}>
        <span class="ad-st-emoji" style=${`--c:${a.bg[0]}`}>${a.art[0]}</span>
        <div><b>${a.label}</b><div class="bb-row wrap gap">${w.cats.length ? w.cats.map((c) => html`<${CatChip} cat=${c} small />`) : html`<small class="muted">noch keine Kategorie</small>`}</div></div>
        <span class="ad-st-n">${w.done ? '✓' : `${w.targets.length}`}</span>
      </div>`; })}</div>
    </div>
  </div>`;
}

function DuelCard({ who, icon, d, win, note }) {
  return html`<div class=${`duel-card glass ${win ? 'win' : ''}`}>
    <div class="duel-head"><span class="duel-icon">${icon}</span><h3>${who}</h3>${win && html`<span class="crown">👑</span>`}</div>
    <div class="duel-main"><b>${d.precision == null ? '–' : html`<${CountUp} value=${d.precision * 100} />`}<small>%</small></b><span>Trefferquote<br/><small class="muted">${d.hits} von ${d.shownRated} gezeigten Anzeigen passten</small></span></div>
    <div class="duel-sub">
      <div><b>${d.recall == null ? '–' : `${Math.round(d.recall * 100)} %`}</b><small>Reichweite: erreichte Interessierte</small></div>
      <div><b>${d.shown}</b><small>ausgespielte Anzeigen</small></div>
    </div>
    <p class="muted duel-note">${note}</p>
  </div>`;
}

function Empfang({ v }) {
  const d = v.duel;
  const ready = d.human.precision != null && d.algo.precision != null && v.progress.done >= Math.max(1, v.progress.total * 0.5);
  const humanWins = ready && (d.human.precision + (d.human.recall || 0)) > (d.algo.precision + (d.algo.recall || 0));
  const algoWins = ready && !humanWins;
  const fired = useRef(false);
  useEffect(() => { if (ready && !fired.current && v.progress.done === v.progress.total) { fired.current = true; confetti(120); } }, [ready, v.progress.done]);
  return html`<div class="stack">
    <div class="duel">
      <${DuelCard} who="Menschen (eure Gruppen)" icon="👥" d=${d.human} win=${humanWins} note="Nur Likes aus der Datenbank – von Hand ausgewertet." />
      <span class="vs">VS</span>
      <${DuelCard} who="bubbl-Algorithmus" icon="🤖" d=${d.algo} win=${algoWins} note="Likes + heimlich gemessene Verweildauer & Klicks – in Millisekunden." />
    </div>
    <div class="glass stage-card">
      <div class="per-ad">${ADS.map((a) => {
        const calc = (T) => { let s = 0, h = 0; for (const id of T[a.id] || []) { const r = v.ratings[id]?.[a.id]; if (r != null) { s++; if (r > 0) h++; } } return { s, h, n: (T[a.id] || []).length }; };
        const hu = calc(v.human || {}), al = calc(v.algo || {});
        const fans = v.players.filter((p) => v.ratings[p.id]?.[a.id] === 1).length;
        return html`<div class="pa"><span class="pa-emoji" style=${`--c:${a.bg[0]}`}>${a.art[0]}</span><b>${a.label}</b>
          <span>👥 ${hu.h}/${hu.s}</span><span>🤖 ${al.h}/${al.s}</span><small class="muted">${fans} fanden sie gut</small></div>`;
      })}</div>
    </div>
  </div>`;
}

function Profil({ v }) {
  const t = v.tracking;
  if (!t) return null;
  const ratio = v.totals.likes ? t.totals.dataPoints / v.totals.likes : 0;
  const attention = ROUND1.map((x) => ({ post: x, ...t.postAttention[x.id] })).map((x) => ({ ...x, secret: x.ms / 1000 / Math.max(1, x.likes) })).sort((a, b) => b.secret - a.secret).slice(0, 4);
  const infTotal = t.infYes + t.infNo;
  return html`<div class="stack">
    <div class="big-stats">
      <div class="bstat glass"><small>Ihr habt vergeben</small><b><${CountUp} value=${v.totals.likes} /></b><span>Likes</span></div>
      <div class="bstat glass glow"><small>bubbl hat gesammelt</small><b><${CountUp} value=${t.totals.dataPoints} /></b><span>Datenpunkte${ratio >= 1.5 ? ` · ${Math.round(ratio)}× mehr!` : ''}</span></div>
      <div class="bstat glass"><small>Gemessene Verweildauer</small><b>${fmtDur(t.totals.dwellMs)}</b><span>ohne dass ihr es gemerkt habt</span></div>
      <div class="bstat glass"><small>Gescrollt</small><b><${CountUp} value=${t.totals.scrollPx * 0.000264} format=${(x) => x.toFixed(1).replace('.', ',')} /> m</b><span>${t.totals.opens} Artikel geöffnet</span></div>
    </div>
    <div class="split">
      <div class="glass stage-card">
        <div class="card-head"><h3>Was Likes zeigen – und was Tracking verrät</h3></div>
        <${CatBars} a=${t.catLikes} b=${t.catHidden} aLabel="Anteil an Likes" bLabel="Anteil an heimlichen Signalen (Verweildauer, Klicks)" />
        <p class="insight">🕵️ Bei <b>${t.differ}</b> von ${v.players.length} Personen verrät das Tracking ein <b>anderes Hauptinteresse</b> als die Likes.</p>
      </div>
      <div class="glass stage-card">
        <div class="card-head"><h3>Lange angesehen, kaum geliked</h3></div>
        <div class="trending">${attention.map((x) => html`<div class="trend"><${PostArt} post=${x.post} small /><div class="trend-body"><b>${x.post.headline}</b><small class="muted">${fmtDur(x.ms)} Blickzeit · ${x.opens}× geöffnet</small></div><span class="trend-n">❤️ ${x.likes}</span></div>`)}</div>
        ${infTotal > 0 && html`<div class="infer-meter"><span>Vermutungen über euch:</span>
          <div class="im-bar"><i class="yes" style=${`flex:${t.infYes}`}>✓ ${t.infYes} stimmen</i><i class="no" style=${`flex:${t.infNo}`}>✗ ${t.infNo} falsch</i></div></div>`}
      </div>
    </div>
  </div>`;
}

function BubbleMap({ v }) {
  const W = 1000, H = 640, cx = W / 2, cy = H / 2, R = 250;
  const hubs = Object.fromEntries(CATEGORIES.map((c, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / CATEGORIES.length; return [c.id, [cx + Math.cos(a) * R * 1.35, cy + Math.sin(a) * R]]; }));
  const place = (p, i) => {
    const mix = p.bubbleMix || {}; const tot = Object.values(mix).reduce((a, b) => a + b, 0);
    let x = cx, y = cy;
    if (tot) { x = 0; y = 0; for (const [c, n] of Object.entries(mix)) { x += hubs[c][0] * n / tot; y += hubs[c][1] * n / tot; } }
    const ang = i * 2.39996, rr = 14 + (i % 5) * 7;
    return [x + Math.cos(ang) * rr, y + Math.sin(ang) * rr];
  };
  return html`<svg class="bubblemap" viewBox=${`0 0 ${W} ${H}`} role="img" aria-label="Filterblasen-Karte">
    <circle class="center-zone" cx=${cx} cy=${cy} r="90" /><text class="center-label" x=${cx} y=${cy + 115} text-anchor="middle">vielfältig</text>
    ${CATEGORIES.map((c) => { const [x, y] = hubs[c.id]; return html`<g class="hub" transform=${`translate(${x},${y})`} style=${`--c:${c.color}`}><circle r="62" /><text y="-4" class="hub-icon">${c.icon}</text><text y="24" class="hub-name">${c.name}</text></g>`; })}
    ${v.players.map((p, i) => { const [x, y] = place(p, i); const idx = p.bubbleIndex ?? 1;
      return html`<g class="bnode" key=${p.id} style=${`transform:translate(${x}px,${y}px)`}><circle r="20" class=${idx < 0.4 ? 'deep' : ''} /><text y="7">${p.avatar}</text></g>`; })}
  </svg>`;
}

function Blase({ v }) {
  const idx = v.players.filter((p) => p.bubbleLen).map((p) => p.bubbleIndex);
  const avg = idx.length ? idx.reduce((a, b) => a + b, 0) / idx.length : 1;
  const deep = v.players.filter((p) => p.bubbleLen && p.bubbleIndex < 0.4).length;
  return html`<div class="split wide-left">
    <div class="glass stage-card"><div class="card-head"><h3>🫧 Wer steckt in welcher Blase?</h3><span class="muted">Je näher an einem Thema, desto einseitiger der Feed</span></div><${BubbleMap} v=${v} /></div>
    <div class="bb-col">
      <div class="glass stage-card center">
        <small class="muted">Durchschnittliche Feed-Vielfalt</small>
        <div class="gauge" style=${`--k:${avg}`}><b>${Math.round(avg * 100)} %</b></div>
        <p><b>${deep}</b> von ${v.players.length} sind schon tief in einer Blase.</p>
      </div>
      <div class="glass stage-card"><p class="insight">Jeder Like macht den Feed ähnlicher. Wer auf <b>🔀 Entdecken</b> drückt, bricht aus der Blase aus – das haben ${v.players.filter((p) => p.explore).length} Personen getan.</p></div>
    </div>
  </div>`;
}

function Wahl({ v }) {
  const w = v.wahl;
  const all = Object.values(w.byCat).reduce((a, b) => ({ n: a.n + b.n, sum: a.sum + b.sum }), { n: 0, sum: 0 });
  if (!v.voteRevealed) {
    return html`<div class="split">
      <div class="glass stage-card center wahl-teaser">
        <span class="party-logo">${PARTY.logo}</span><h2>${PARTY.name}</h2>
        <p>Alle haben gerade eine persönliche Wahlwerbung bekommen.</p>
        <p class="big-q">Haben alle dieselbe Botschaft gesehen? 🤔</p>
      </div>
      <div class="glass stage-card center">
        <small class="muted">Durchschnittliche Sympathie</small>
        <div class="gauge" style=${`--k:${all.n ? (all.sum / all.n - 1) / 4 : 0}`}><b>${all.n ? (all.sum / all.n).toFixed(1).replace('.', ',') : '–'}</b></div>
        <p><b>${w.votes}</b> Stimmen · Skala 1 – 5</p>
      </div>
    </div>`;
  }
  const card = (c) => { const s = w.byCat[c]; return html`<div class="pmsg glass" style=${`--c:${CAT[c].color}`}>
    <small>${CAT[c].icon} an ${CAT[c].name}-Fans · ${s.n} Pers.</small><b>${PARTY_MESSAGES[c].title}</b><span>${PARTY_MESSAGES[c].text}</span>
    <em>Sympathie: ${s.n ? (s.sum / s.n).toFixed(1).replace('.', ',') : '–'}</em></div>`; };
  return html`<div class="stack">
    <div class="contra-grid">
      ${CONTRADICTIONS.map(([a, b, t]) => html`<div class="contra-row">${card(a)}<span class="bolt" title=${t}>⚡<small>${t}</small></span>${card(b)}</div>`)}
      ${(() => { const paired = new Set(CONTRADICTIONS.flatMap(([a, b]) => [a, b])); const singles = CATEGORIES.map((c) => c.id).filter((id) => !paired.has(id)); return singles.map((id) => html`<div class="contra-row single">${card(id)}</div>`); })()}
      <div class="contra-row single"><p class="insight">Eine Partei – <b>${CATEGORIES.length} verschiedene Versprechen</b>. Weil jede Person nur ihre eigene Botschaft sieht, fällt der Widerspruch niemandem auf. So funktioniert politisches Microtargeting (vgl. Cambridge Analytica, 2016).</p></div>
    </div>
  </div>`;
}

function Reflexion({ v }) {
  const r = v.reflexion;
  const max = Math.max(1, ...r.hist);
  const faces = [['😡', 'sehr schlecht'], ['🙁', 'eher schlecht'], ['😐', 'teils/teils'], ['🙂', 'eher gut'], ['🤩', 'sehr gut']];
  return html`<div class="refl">
    <div class="glass stage-card">
      <div class="card-head"><h3>Personalisierte Werbung finden wir …</h3></div>
      <div class="hist">${r.hist.map((n, i) => html`<div class="hbar"><span class="hval">${n}</span><span class="hcol"><i style=${`height:${(n / max) * 100}%`}></i></span><span class="hlab">${faces[i][0]}<small>${faces[i][1]}</small></span></div>`)}</div>
      <ul class="questions">${REFLECTION_QUESTIONS.map((q) => html`<li>${q}</li>`)}</ul>
    </div>
    ${['pro', 'con'].map((kind) => html`<div class="glass stage-card notes-col">
      <div class="card-head"><h3>${kind === 'pro' ? '👍 Vorteile' : '👎 Nachteile & Gefahren'}</h3></div>
      <div class="notes">${r.notes.filter((n) => n.kind === kind).map((n) => html`<div class=${`note ${kind}`} key=${n.key}><span>${n.text}</span><small>${n.avatar}</small></div>`)}</div>
    </div>`)}
  </div>`;
}

const STAGES = { lobby: Lobby, feed: Feed, auswertung: Auswertung, werbung: Werbung, empfang: Empfang, profil: Profil, blase: Blase, wahl: Wahl, reflexion: Reflexion, werkbank: WerkbankStage, fairness: FairnessStage, quiz: QuizStage };

export function BeamerStage({ v }) {
  const Stage = STAGES[v.phase] || Lobby;
  return html`<div class="beamer">
    <header class="b-top">
      <${Logo} size=${34} sub="Microtargeting-Labor" />
      <div class="b-title"><span class="b-icon">${PHASE[v.phase].icon}</span><h1>${PHASE[v.phase].title}</h1></div>
      ${v.phase !== 'lobby' ? html`<${JoinBox} />` : html`<span></span>`}
    </header>
    <${Stepper} phases=${v.phases} phase=${v.phase} progress=${v.progress} />
    <main class=${`b-main ${v.phase === 'lobby' ? 'no-task' : ''}`} key=${v.phase}>
      ${v.phase !== 'lobby' && html`<${TaskPanel} v=${v} />`}
      <section class="b-stage"><${Stage} v=${v} /></section>
    </main>
  </div>`;
}

function App() {
  const { state: v, status, error } = useRoom(() => ({ code, role: 'beamer', key }));
  useEffect(() => {
    const go = () => document.documentElement.requestFullscreen?.().catch(() => {});
    addEventListener('dblclick', go);
    return () => removeEventListener('dblclick', go);
  }, []);
  if (status === 'auth') return html`<${Aurora} /><${LoginScreen} title="Beamer-Ansicht" />`;
  if (status === 'error') return html`<${Aurora} /><div class="b-error glass"><${Logo} size=${40} /><p>${error}</p></div>`;
  if (!v) return html`<${Aurora} /><div class="b-error"><${Logo} size=${60} /></div>`;
  return html`<${Aurora} />${status === 'offline' && html`<div class="offline-banner">Verbindung unterbrochen …</div>`}<${BeamerStage} v=${v} />`;
}

if (document.getElementById('app') && location.pathname.startsWith('/beamer')) render(html`<${App} />`, document.getElementById('app'));
