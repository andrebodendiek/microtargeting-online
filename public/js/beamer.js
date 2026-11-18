import {
  AvatarInSvg, Ic, html, render, useState, useEffect, useRef, useMemo, useRoom, Dropdown, LoginScreen, qs, Logo, Aurora, Avatar, CatChip, GroupBadge, groupColor,
  PostArt, AdVisual, CountUp, Radar, CatBars, Stepper, Progress, confetti, CATEGORIES, CAT, POST, AD, PHASE,
} from './lib.js';
import { ADS, ROUND1, PARTY, PARTY_MESSAGES, CONTRADICTIONS, REFLECTION_QUESTIONS } from '/shared/content.js';
import { WerkbankStage, FairnessStage, QuizStage } from './beamer-extra.js';
import { IntroPlayer, INTRO_LENGTH } from './intro.js';

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
    <span class="mode"><${Ic} k=${p} color=${false} /> ${p.mode === 'GA' ? 'Gruppenarbeit' : p.mode === 'EA' ? 'Einzelarbeit' : 'Plenum'}</span>
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
      <div class="card-head"><h3>Trending auf bubbl</h3></div>
      <div class="trending">${ranking.map(({ post, n }, i) => html`<div class="trend" key=${post.id}>
        <span class="trend-rank">${i + 1}</span><${PostArt} post=${post} small />
        <div class="trend-body"><b>${post.headline}</b><div class="trend-bar"><i style=${`width:${(n / top) * 100}%`}></i></div></div>
        <span class="trend-n">❤️ ${n}</span>
      </div>`)}</div>
    </div>
  </div>`;
}

// Tabelle „Likes je Person und Kategorie“ – db: { kategorie: { id: anzahl } }
function Heatmap({ v, db, tops }) {
  const ids = v.players.map((p) => p.id);
  const maxN = Math.max(1, ...CATEGORIES.flatMap((c) => Object.values(db[c.id] || {})));
  return html`<div class="heatmap" style=${`--cols:${ids.length}`}>
    <div class="hm-row head"><span class="hm-corner">Kategorie ↓ · ID →</span>${ids.map((id) => html`<span class="hm-id">${id}</span>`)}</div>
    ${CATEGORIES.map((c) => html`<div class="hm-row" style=${`--c:${c.color}`}>
      <span class="hm-cat"><span><${Ic} k=${c} /> ${c.name}</span></span>
      ${ids.map((id) => { const n = db[c.id]?.[id] || 0; const top = tops && tops[id] === c.id;
        return html`<span class=${`hm-cell ${n ? 'has' : ''} ${top ? 'top' : ''}`} style=${`--k:${n / maxN}`} title=${`ID ${id} · ${c.name}: ${n}`} key=${`${c.id}-${id}-${n}`}>${n || ''}</span>`; })}
    </div>`)}
    ${tops && html`<div class="hm-row foot"><span class="hm-cat"><b>Hauptinteresse</b></span>${ids.map((id) => html`<span class="hm-top">${tops[id] ? html`<${Ic} k=${CAT[tops[id]]} />` : '·'}</span>`)}</div>`}
  </div>`;
}

const shortHead = (t) => (t.length > 34 ? `${t.slice(0, 32)}…` : t);
function Auswertung({ v }) {
  const events = v.likeEvents || [];
  const [k, setK] = useState(0);
  const lenRef = useRef(0); lenRef.current = events.length;
  // Live-Entstehung: Like für Like in die Tabelle übernehmen (8–20 s), neu startbar über das Cockpit
  useEffect(() => {
    setK(0);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setK(Number.MAX_SAFE_INTEGER); return; }
    const dur = Math.min(20000, Math.max(8000, events.length * 90));
    const stepMs = Math.max(30, dur / Math.max(1, events.length));
    const t = setInterval(() => setK((x) => (x >= lenRef.current ? x : x + 1)), stepMs);
    return () => clearInterval(t);
  }, [v.dbReplay]);
  const shown = Math.min(k, events.length);
  const done = shown >= events.length && events.length > 0;
  const db = useMemo(() => {
    const d = Object.fromEntries(CATEGORIES.map((c) => [c.id, {}]));
    for (const [id, postId] of events.slice(0, shown)) { const c = POST[postId]?.cat; if (c) d[c][id] = (d[c][id] || 0) + 1; }
    return d;
  }, [shown, events.length]);
  const tops = done ? Object.fromEntries(v.players.map((p) => {
    let best = null; for (const c of CATEGORIES) { const n = db[c.id][p.id] || 0; if (n && (!best || n > (db[best][p.id] || 0))) best = c.id; }
    return [p.id, best];
  })) : null;
  const recent = events.slice(Math.max(0, shown - 7), shown).reverse();
  return html`<div class="stack">
    <div class="split db-split">
      <div class="glass stage-card">
        <div class="card-head"><h3>Rohdaten</h3><span class="metric"><b><${CountUp} value=${shown} /></b> / ${events.length} Likes</span></div>
        <p class="muted db-note">Jeder Like wird gespeichert: <b>wer</b> (ID) hat <b>was</b> (Beitrag) geliked – der Beitrag gehört zu einer Kategorie.</p>
        <div class="event-log">${recent.map(([id, postId], i) => { const post = POST[postId]; return html`<div class=${`ev ${i === 0 ? 'new' : ''}`} key=${`${id}-${postId}`}>
          <b class="ev-id">#${id}</b><span class="ev-like">❤️</span><span class="ev-post">„${shortHead(post?.headline || postId)}“</span><span class="ev-arrow">→</span><span class="ev-cat" style=${`--c:${CAT[post?.cat]?.color}`}>${CAT[post?.cat]?.name}</span>
        </div>`; })}
        ${!events.length && html`<p class="muted">Noch keine Likes vorhanden.</p>`}</div>
      </div>
      <div class="glass stage-card grow">
        <div class="card-head"><h3>Datenbank: Likes je Person und Kategorie</h3><span class="muted">${done ? `fertig · ${v.players.length * CATEGORIES.length} Felder` : 'entsteht automatisch …'}</span></div>
        <${Heatmap} v=${v} db=${db} tops=${tops} />
      </div>
    </div>
    ${done && html`<div class="questions-strip">
      <div class="glass q-card"><i class="bi bi-question-circle"></i><b>Was weiß bubbl jetzt über jede/n von euch?</b></div>
      <div class="glass q-card"><i class="bi bi-bullseye"></i><b>Wer sollte Werbung für Laufschuhe bekommen – und wer nicht?</b></div>
      <div class="glass q-card"><i class="bi bi-incognito"></i><b>Was fehlt in der Tabelle? Tipp: alles, was ihr <u>nicht</u> geliked habt …</b></div>
    </div>`}
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
        <circle r="22" /><${AvatarInSvg} avatar=${p.avatar} r=${20} />
        <text class="tnode-id" x="30" y="6">#${p.id}${n > 0 ? html`<tspan class="tnode-n" dx="6">${n}×</tspan>` : ''}</text>
      </g>`; })}
  </svg>`;
}

function Werbung({ v }) {
  return html`<div class="split wide-left">
    <div class="glass stage-card"><div class="card-head"><h3>Wer bekommt welche Werbung?</h3><span class="metric">Budget: <b>${v.budget}</b> Kontakte je Anzeige</span></div>
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
    <div class="duel-head"><i class=${`bi bi-${icon} duel-icon`}></i><h3>${who}</h3>${win && html`<span class="crown"><i class="bi bi-trophy-fill"></i> vorn</span>`}</div>
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
      <${DuelCard} who="Menschen (eure Gruppen)" icon="people" d=${d.human} win=${humanWins} note="Nur Likes aus der Datenbank – von Hand ausgewertet." />
      <span class="vs">VS</span>
      <${DuelCard} who="bubbl-Algorithmus" icon="cpu" d=${d.algo} win=${algoWins} note="Likes + heimlich gemessene Verweildauer & Klicks – in Millisekunden." />
    </div>
    <div class="glass stage-card">
      <div class="per-ad">${ADS.map((a) => {
        const calc = (T) => { let s = 0, h = 0; for (const id of T[a.id] || []) { const r = v.ratings[id]?.[a.id]; if (r != null) { s++; if (r > 0) h++; } } return { s, h, n: (T[a.id] || []).length }; };
        const hu = calc(v.human || {}), al = calc(v.algo || {});
        const fans = v.players.filter((p) => v.ratings[p.id]?.[a.id] === 1).length;
        return html`<div class="pa"><span class="pa-emoji" style=${`--c:${a.bg[0]}`}>${a.art[0]}</span><b>${a.label}</b>
          <span title="Menschen"><i class="bi bi-people"></i> ${hu.h}/${hu.s}</span><span title="Algorithmus"><i class="bi bi-cpu"></i> ${al.h}/${al.s}</span><small class="muted">${fans} fanden sie gut</small></div>`;
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
    ${v.consent && v.consent.n > 0 && html`<div class="glass stage-card consent-strip">
      <div class="cs-item"><i class="bi bi-file-earmark-text"></i><b>${v.consent.n - v.consent.agbOpened} von ${v.consent.n}</b><span>haben den AGB zugestimmt, ohne sie zu öffnen</span></div>
      <div class="cs-item"><i class="bi bi-check2-square"></i><b>${v.consent.newsletter} von ${v.consent.n}</b><span>haben das vorausgewählte Newsletter-Häkchen gelassen</span></div>
      <div class="cs-item"><i class="bi bi-envelope-paper-heart"></i><b>${v.consent.adMails}</b><span>personalisierte Werbe-Mails verschickt</span></div>
    </div>`}
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
    ${CATEGORIES.map((c) => { const [x, y] = hubs[c.id]; return html`<g class="hub" transform=${`translate(${x},${y})`} style=${`--c:${c.color}`}><circle r="62" /><text y="8" class="hub-name">${c.name}</text></g>`; })}
    ${v.players.map((p, i) => { const [x, y] = place(p, i); const idx = p.bubbleIndex ?? 1;
      return html`<g class="bnode" key=${p.id} style=${`transform:translate(${x}px,${y}px)`}><circle r="20" class=${idx < 0.4 ? 'deep' : ''} /><${AvatarInSvg} avatar=${p.avatar} r=${18} /></g>`; })}
  </svg>`;
}

function Blase({ v }) {
  const idx = v.players.filter((p) => p.bubbleLen).map((p) => p.bubbleIndex);
  const avg = idx.length ? idx.reduce((a, b) => a + b, 0) / idx.length : 1;
  const deep = v.players.filter((p) => p.bubbleLen && p.bubbleIndex < 0.4).length;
  return html`<div class="split wide-left">
    <div class="glass stage-card"><div class="card-head"><h3>Wer steckt in welcher Blase?</h3><span class="muted">Je näher an einem Thema, desto einseitiger der Feed</span></div><${BubbleMap} v=${v} /></div>
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
    <small><${Ic} k=${CAT[c]} /> an ${CAT[c].name}-Fans · ${s.n} Pers.</small><b>${PARTY_MESSAGES[c].title}</b><span>${PARTY_MESSAGES[c].text}</span>
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
      <div class="notes">${r.notes.filter((n) => n.kind === kind).map((n) => html`<div class=${`note ${kind}`} key=${n.key}><span>${n.text}</span><small><${Avatar} avatar=${n.avatar} size=${26} /></small></div>`)}</div>
    </div>`)}
  </div>`;
}

// Intro-Film: startet synchron, wenn die Lehrkraft ihn im Cockpit abspielt; blendet sich am Ende selbst aus
function BeamerIntro({ intro }) {
  const [hidden, setHidden] = useState(null);
  if (!intro || hidden === intro.at) return null;
  const offset = Math.max(0, (intro.now - intro.at) / 1000);
  if (offset > INTRO_LENGTH) return null;
  return html`<${IntroPlayer} key=${intro.at} startOffset=${offset} autoClose onClose=${() => setHidden(intro.at)} />`;
}

// Innehalten: Frage groß über der Bühne, Antworten live, Auflösung mit Erkenntnis
const fmtMinB = (ms) => { const sec = Math.round(ms / 1000); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; };
function PauseStage({ pz }) {
  const total = Math.max(1, (pz.counts || []).reduce((a, b) => a + b, 0));
  const realTotal = pz.real ? Math.max(1, pz.real.reduce((a, b) => a + b, 0)) : 1;
  return html`<div class="b-pause">
    <div class="b-pause-card">
      <div class="b-pause-head"><span><i class="bi bi-pause-circle"></i> Innehalten</span><span class="muted">${pz.answered} / ${pz.n} haben geantwortet</span></div>
      <h2>${pz.q}</h2>
      <div class="b-pause-bars">${pz.options.map((o, k) => { const share = (pz.counts?.[k] || 0) / total; return html`<div class=${`b-pause-row ${pz.correct === k ? 'correct' : ''}`}>
        <span>${o}</span><div class="b-pause-track"><i style=${`width:${Math.round(share * 100)}%`}></i>${pz.real && html`<em style=${`width:${Math.round(((pz.real[k] || 0) / realTotal) * 100)}%`}></em>`}</div><b>${pz.counts?.[k] || 0}</b></div>`; })}</div>
      ${pz.real && html`<div class="b-pause-legend"><span><i class="lg-est"></i> geschätzt</span><span><i class="lg-real"></i> tatsächlich gemessen</span></div>`}
      ${pz.insight && html`<p class="b-pause-insight"><i class="bi bi-lightbulb"></i> ${pz.insight}</p>`}
    </div>
  </div>`;
}

function Shorts({ v }) {
  const s = v.shorts;
  if (!s) return null;
  const pct = (x) => (x == null ? '–' : `${Math.round(x * 100)} %`);
  const minutes = s.totalMs / 60000;
  return html`<div class="stack">
    <div class="big-stats">
      <div class="bstat glass"><small>Clips angesehen</small><b><${CountUp} value=${s.count} /></b><span>von ${s.people} Personen</span></div>
      <div class="bstat glass glow"><small>Gemeinsame Zeit im Feed</small><b>${fmtMinB(s.totalMs)}</b><span>Minuten${s.people ? ` · Ø ${fmtMinB(s.totalMs / s.people)} pro Person` : ''}</span></div>
      <div class="bstat glass"><small>Werbeclips gesehen</small><b><${CountUp} value=${s.ads} /></b><span>jeder 5. Clip</span></div>
      <div class="bstat glass"><small>Likes vergeben</small><b>0</b><span>nur Wiedergabezeit zählt</span></div>
    </div>
    <div class="split">
      <div class="glass stage-card">
        <div class="card-head"><h3>Der Feed wird enger</h3><span class="metric">${pct(s.firstShare)} → <b>${pct(s.lastShare)}</b></span></div>
        <p class="muted">Anteil des jeweils häufigsten Themas pro 5 Clips (Durchschnitt aller)</p>
        <div class="b-curve">${s.curve.map((x, i) => html`<div class="bc-col"><b>${pct(x)}</b><i style=${`height:${Math.round((x || 0) * 100)}%`}></i><small>${i * 5 + 1}–${i * 5 + 5}</small></div>`)}
          ${!s.curve.length && html`<p class="muted">Noch keine Clips angesehen …</p>`}</div>
      </div>
      ${s.stopped ? html`<div class="glass stage-card">
        <div class="card-head"><h3>Die Tricks hinter Shorts</h3></div>
        <ul class="b-problems">
          <li><i class="bi bi-infinity"></i><b>Kein Ende</b><span>Endlos-Feed ohne letzte Seite</span></li>
          <li><i class="bi bi-play-circle"></i><b>Autoplay</b><span>Weiterschauen ist der Standard</span></li>
          <li><i class="bi bi-stopwatch"></i><b>Wiedergabezeit</b><span>Hinschauen reicht als Signal</span></li>
          <li><i class="bi bi-funnel"></i><b>Rabbit Hole</b><span>Was festhält, kommt öfter</span></li>
          <li><i class="bi bi-badge-ad"></i><b>Werbung im Fluss</b><span>sieht aus wie ein normaler Clip</span></li>
          <li><i class="bi bi-moon-stars"></i><b>Zeitgefühl</b><span>„Nur 5 Minuten“ werden ${minutes >= 1 ? 'schnell mehr' : 'zu viel'}</span></li>
        </ul>
      </div>` : html`<div class="glass stage-card">
        <div class="card-head"><h3>Hauptthemen laut Wiedergabezeit</h3></div>
        <${CatBars} a=${Object.fromEntries(Object.entries(s.tops).map(([k, n]) => [k, s.people ? n / s.people : 0]))} aLabel="Anteil der Personen mit diesem Hauptthema" />
        <p class="insight">Niemand hat etwas geliked – trotzdem weiß bubbl, was euch festhält.</p>
      </div>`}
    </div>
  </div>`;
}

const STAGES = { lobby: Lobby, feed: Feed, auswertung: Auswertung, werbung: Werbung, empfang: Empfang, profil: Profil, blase: Blase, wahl: Wahl, reflexion: Reflexion, werkbank: WerkbankStage, fairness: FairnessStage, quiz: QuizStage, shorts: Shorts };

export function BeamerStage({ v }) {
  const Stage = STAGES[v.phase] || Lobby;
  return html`<div class="beamer">
    <header class="b-top">
      <${Logo} size=${34} sub="Microtargeting-Labor" />
      <div class="b-title"><h1>${PHASE[v.phase].title}</h1></div>
      ${v.phase !== 'lobby' ? html`<${JoinBox} />` : html`<span></span>`}
    </header>
    <${Stepper} phases=${v.phases} phase=${v.phase} progress=${v.progress} />
    <main class=${`b-main ${v.phase === 'lobby' ? 'no-task' : ''}`} key=${v.phase}>
      ${v.phase !== 'lobby' && html`<${TaskPanel} v=${v} />`}
      <section class="b-stage"><${Stage} v=${v} /></section>
    </main>
    ${v.pause && html`<${PauseStage} pz=${v.pause} />`}
    <${BeamerIntro} intro=${v.intro} />
  </div>`;
}

// Dezentes Menü unten rechts: Vollbild, Schriftgröße, großer QR-Code
function BeamerMenu() {
  const [scale, setScale] = useState(() => Number(localStorage.getItem('bubbl:beamerScale')) || 1);
  const [qr, setQr] = useState(false);
  const [, rerender] = useState(0);
  useEffect(() => { document.documentElement.style.setProperty('--bscale', scale); try { localStorage.setItem('bubbl:beamerScale', scale); } catch { /* privat */ } }, [scale]);
  useEffect(() => { const h = () => rerender((x) => x + 1); document.addEventListener('fullscreenchange', h); return () => document.removeEventListener('fullscreenchange', h); }, []);
  const full = !!document.fullscreenElement;
  const step = (d) => setScale((s) => Math.round(Math.min(1.4, Math.max(0.8, s + d)) * 100) / 100);
  return html`<div class="beamer-menu">
    <${Dropdown} btnClass="btn btn-sm beamer-menu-btn" icon="sliders" caret=${false} title="Beamer-Einstellungen" items=${[
      { header: 'Beamer' },
      { label: full ? 'Vollbild beenden' : 'Vollbild', icon: full ? 'fullscreen-exit' : 'arrows-fullscreen', hint: 'oder Doppelklick', onClick: () => (full ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()).catch?.(() => {}) },
      { label: 'QR-Code groß anzeigen', icon: 'qr-code', hint: 'für Nachzügler', onClick: () => setQr(true) },
      { header: `Schriftgröße · ${Math.round(scale * 100)} %` },
      { label: 'Größer', icon: 'zoom-in', disabled: scale >= 1.4, onClick: () => step(0.1) },
      { label: 'Kleiner', icon: 'zoom-out', disabled: scale <= 0.8, onClick: () => step(-0.1) },
      { label: 'Zurücksetzen', icon: 'arrow-counterclockwise', disabled: scale === 1, onClick: () => setScale(1) },
    ]} />
    ${qr && html`<div class="qr-overlay" onClick=${() => setQr(false)}><div class="glass qr-card"><${JoinBox} big /><small class="muted">Klicken zum Schließen</small></div></div>`}
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
  return html`<${Aurora} />${status === 'offline' && html`<div class="offline-banner">Verbindung unterbrochen …</div>`}<${BeamerStage} v=${v} /><${BeamerMenu} />`;
}

if (document.getElementById('app') && location.pathname.startsWith('/beamer')) render(html`<${App} />`, document.getElementById('app'));
