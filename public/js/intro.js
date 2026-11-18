// Intro-Film „Worum geht's bei bubbl?“ – ca. 75 s, komplett aus der Zeit t berechnet (deterministisch).
// Dadurch läuft er live im Browser (Beamer/Handy) und lässt sich Bild für Bild als MP4 rendern.
import { html, useState, useEffect, useRef, AvatarArt, Logo, CATEGORIES, CAT, POST, AD, randomAvatar } from './lib.js';

export { INTRO_LENGTH } from './intro-length.js';
import { INTRO_LENGTH } from './intro-length.js';

// Zeitplan der Szenen [Start, Ende]
const S = {
  hook: [0, 8], feed: [8, 18], data: [18, 29], profile: [29, 39], target: [39, 49], shorts: [49, 58], goals: [58, 70], go: [70, 76],
};
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };
const out = (x) => 1 - (1 - clamp(x)) ** 3;
// Fortschritt innerhalb eines Zeitfensters (Sekunden relativ zum Szenenstart)
const win = (t, a, b) => clamp((t - a) / (b - a));
// Ein-/Ausblenden einer Szene
const sceneAlpha = (t, [a, b]) => Math.min(out((t - a) / 0.6), out((b - t) / 0.6));

const seeded = (seed) => () => { seed = (Math.imul(seed ^ (seed >>> 15), 2246822507) + 0x9e3779b9) >>> 0; return seed / 4294967296; };
const AVS = Array.from({ length: 12 }, (_, i) => randomAvatar(seeded(i * 7919 + 13)));

const Cap = ({ t, at, children, big }) => html`<p class=${`if-cap ${big ? 'big' : ''}`} style=${`opacity:${out((t - at) / 0.7)};transform:translateY(${(1 - out((t - at) / 0.7)) * 18}px)`}>${children}</p>`;

function Phone({ children, style }) {
  return html`<div class="if-phone" style=${style}><div class="if-notch"></div><div class="if-screen">${children}</div></div>`;
}

// Szene 1: Aufhänger
function Hook({ t }) {
  const p = t - S.hook[0];
  return html`<div class="if-center">
    <div style=${`transform:scale(${0.7 + 0.3 * out(p / 1.2)});opacity:${out(p / 1)}`}><${Logo} size=${72} /></div>
    <${Cap} t=${p} at=${1.4} big>Jeden Tag siehst du Werbung.</${Cap}>
    <${Cap} t=${p} at=${3.6} big><b class="if-accent">Aber warum genau diese?</b></${Cap}>
  </div>`;
}

// Szene 2: Feed – kostenlos, bezahlt wird mit Daten
function Feed({ t }) {
  const p = t - S.feed[0];
  const posts = ['m1', 't1', 's1', 'c2', 'n2', 'e2'].map((id) => POST[id]).filter(Boolean);
  const scroll = ease(win(p, 0.5, 8)) * 760;
  return html`<div class="if-split">
    <${Phone} style=${`transform:translateY(${(1 - out(p / 1)) * 60}px);opacity:${out(p / 0.8)}`}>
      <div class="if-feed" style=${`transform:translateY(${-scroll}px)`}>
        ${posts.map((x) => html`<div class="if-post"><div class="if-post-head"><i style=${`background:${CAT[x.cat].color}`}></i><b>${x.headline.slice(0, 34)}…</b></div>
          ${x.image ? html`<img src=${x.image.src} alt="" />` : html`<div class="if-img-fallback"></div>`}
          <div class="if-post-act"><i class="bi bi-heart"></i><i class="bi bi-chat"></i><i class="bi bi-send"></i></div></div>`)}
      </div>
    </${Phone}>
    <div class="if-text">
      <${Cap} t=${p} at=${0.8}>Soziale Netzwerke sind <b>kostenlos</b>.</${Cap}>
      <${Cap} t=${p} at=${3.2}>Bezahlt wird trotzdem –</${Cap}>
      <${Cap} t=${p} at=${4.8} big><b class="if-accent">mit deinen Daten.</b></${Cap}>
    </div>
  </div>`;
}

// Szene 3: Likes, Blicke, Sekunden → Datenbank
function Data({ t }) {
  const p = t - S.data[0];
  const cats = CATEGORIES;
  const rows = 6;
  const filled = Math.floor(ease(win(p, 2, 8.5)) * rows * cats.length);
  const signals = [['heart-fill', 'Like', '#f43f5e'], ['eye-fill', 'Blick: 4,2 s', '#1FB0C7'], ['hand-index-thumb-fill', 'Klick', '#7048e8'], ['arrow-down-up', 'Scrollen', '#f59f00']];
  return html`<div class="if-split">
    <div class="if-signals">${signals.map(([ic, label, c], i) => {
      const a = out(win(p, 0.4 + i * 0.6, 1.2 + i * 0.6));
      return html`<span class="if-signal" style=${`opacity:${a};transform:translateX(${(1 - a) * -40}px);--c:${c}`}><i class=${`bi bi-${ic}`}></i>${label}</span>`;
    })}</div>
    <div class="if-db" style=${`opacity:${out(win(p, 1.2, 2.2))}`}>
      <div class="if-db-head"><span>ID</span>${cats.map((c) => html`<span title=${c.name}><i class=${`bi bi-${c.bi}`} style=${`color:${c.color}`}></i></span>`)}</div>
      ${Array.from({ length: rows }, (_, r) => html`<div class="if-db-row"><span>#${r + 1}</span>${cats.map((c, k) => {
        const n = r * cats.length + k; const on = n < filled; const v = (r * 3 + k * 5) % 4;
        return html`<span class=${on ? 'on' : ''} style=${on ? `background:${c.color};opacity:${0.35 + v * 0.2}` : ''}>${on ? v : ''}</span>`;
      })}</div>`)}
    </div>
    <div class="if-caption-bottom">
      <${Cap} t=${p} at=${0.6}>Jeder Like, jeder Blick, jede Sekunde wird gespeichert –</${Cap}>
      <${Cap} t=${p} at=${4.2}><b>auch das, was du gar nicht anklickst.</b></${Cap}>
    </div>
  </div>`;
}

// Szene 4: Aus Daten wird ein Profil
function Profile({ t }) {
  const p = t - S.profile[0];
  const tags = [['Technik-Fan', 'technik'], ['ca. 14 Jahre', null], ['Gamer', 'technik'], ['nascht gern', 'naschen'], ['abends aktiv', null], ['Taschengeld: mittel', null]];
  return html`<div class="if-center">
    <div class="if-profile">
      <div class="if-avatar" style=${`transform:scale(${0.6 + 0.4 * out(p / 1)})`}><${AvatarArt} cfg=${AVS[2]} size=${170} /></div>
      ${tags.map(([label, c], i) => {
        const a = out(win(p, 1 + i * 0.55, 1.7 + i * 0.55)); const ang = (i / tags.length) * Math.PI * 2 - Math.PI / 2;
        return html`<span class="if-tag" style=${`opacity:${a};transform:translate(${Math.cos(ang) * 230 * a}px, ${Math.sin(ang) * 150 * a}px) translate(-50%,-50%);${c ? `--c:${CAT[c].color}` : ''}`}>${label}</span>`;
      })}
    </div>
    <${Cap} t=${p} at=${4.5} big>Aus Daten wird ein <b class="if-accent">Profil</b> – oft ohne dass du es merkst.</${Cap}>
  </div>`;
}

// Szene 5: Microtargeting
function Target({ t }) {
  const p = t - S.target[0];
  const ad = AD.laufschuh1 || Object.values(AD)[0];
  const hits = new Set([1, 4, 7, 9]);
  const fly = ease(win(p, 2.5, 5));
  return html`<div class="if-target">
    <div class="if-ad" style=${`opacity:${out(win(p, 0.3, 1.2))}`}>
      ${ad?.image ? html`<img src=${ad.image.src} alt="" />` : ''}<div><small>Anzeige</small><b>${ad?.product || 'Laufschuh'}</b></div>
    </div>
    <div class="if-crowd">${AVS.map((cfg, i) => {
      const hit = hits.has(i); const glow = hit ? out(win(p, 4.6, 5.4)) : 0; const dim = hit ? 0 : out(win(p, 4.6, 5.4)) * 0.6;
      return html`<div class="if-person" style=${`opacity:${1 - dim};box-shadow:0 0 0 ${glow * 5}px rgba(31,176,199,${glow})`}><${AvatarArt} cfg=${cfg} size=${78} />
        ${hit && fly > 0 && fly < 1 ? html`<i class="if-dot" style=${`opacity:${1 - fly}`}></i>` : ''}</div>`;
    })}</div>
    <div class="if-caption-bottom">
      <${Cap} t=${p} at=${0.8}><b class="if-accent">Microtargeting:</b> Werbung nur für die, die laut Daten am ehesten klicken.</${Cap}>
      <${Cap} t=${p} at=${5.6}>Auch für Politik – mit unterschiedlichen Versprechen für verschiedene Gruppen.</${Cap}>
    </div>
  </div>`;
}

// Szene 6: Feeds halten fest (Shorts, Filterblase)
function Shorts({ t }) {
  const p = t - S.shorts[0];
  const ids = ['t1', 't3', 't2', 't6', 't4', 't8'];
  const k = Math.min(ids.length - 1, Math.floor(p / 1.3));
  const local = (p % 1.3) / 1.3;
  const post = POST[ids[k]];
  return html`<div class="if-split">
    <${Phone} style="background:#000">
      ${post?.image && html`<img class="if-short" src=${post.image.src} alt="" style=${`transform:scale(${1.12 - local * 0.1})`} />`}
      <div class="if-short-bar"><i style=${`width:${local * 100}%`}></i></div>
      <span class="if-short-count">${k + 1}</span>
    </${Phone}>
    <div class="if-text">
      <${Cap} t=${p} at=${0.5}>Feeds und Shorts lernen mit:</${Cap}>
      <${Cap} t=${p} at=${2.2}><b>Was dich festhält, kommt öfter.</b></${Cap}>
      <${Cap} t=${p} at=${4.6}>Das Ergebnis: Filterblase, Autoplay ohne Ende –</${Cap}>
      <${Cap} t=${p} at=${6.2} big><b class="if-accent">und viel mehr Zeit am Handy als geplant.</b></${Cap}>
    </div>
  </div>`;
}

// Szene 7: Ziele
const GOALS = [
  ['database', 'Verstehen, wie Plattformen Daten sammeln – auch heimlich.'],
  ['bullseye', 'Erleben, wie aus Daten Profile und gezielte Werbung werden.'],
  ['cpu', 'Selbst einen Algorithmus bauen – und sehen, wo er unfair wird.'],
  ['shield-check', 'Wissen, wie ihr eure Daten und eure Zeit schützt.'],
];
function Goals({ t }) {
  const p = t - S.goals[0];
  return html`<div class="if-goals">
    <${Cap} t=${p} at=${0.2} big><b>Das ist euer Ziel heute:</b></${Cap}>
    <ol>${GOALS.map(([ic, txt], i) => { const a = out(win(p, 1.2 + i * 2, 2 + i * 2)); return html`<li style=${`opacity:${a};transform:translateX(${(1 - a) * 40}px)`}><i class=${`bi bi-${ic}`}></i><span>${txt}</span></li>`; })}</ol>
  </div>`;
}

// Szene 8: Los geht's
function Go({ t }) {
  const p = t - S.go[0];
  return html`<div class="if-center">
    <${Cap} t=${p} at=${0.2}>Heute seid <b>ihr</b> das soziale Netzwerk <b class="if-accent">bubbl</b>.</${Cap}>
    <div class="if-wall">${AVS.slice(0, 8).map((cfg, i) => { const a = out(win(p, 0.8 + i * 0.12, 1.4 + i * 0.12)); return html`<span style=${`opacity:${a};transform:translateY(${(1 - a) * 30}px)`}><${AvatarArt} cfg=${cfg} size=${70} /></span>`; })}</div>
    <${Cap} t=${p} at=${2.2}>Keine echten Namen. Alles bleibt im Klassenraum.</${Cap}>
    <${Cap} t=${p} at=${3.6} big><b class="if-accent">Los geht's!</b></${Cap}>
  </div>`;
}

const SCENES = [['hook', Hook], ['feed', Feed], ['data', Data], ['profile', Profile], ['target', Target], ['shorts', Shorts], ['goals', Goals], ['go', Go]];

export function IntroFilm({ t }) {
  return html`<div class="intro-film">
    ${SCENES.map(([k, C]) => { const [a, b] = S[k]; if (t < a - 0.1 || t > b + 0.1) return null; return html`<section class="if-scene" key=${k} style=${`opacity:${sceneAlpha(t, S[k])}`}><${C} t=${t} /></section>`; })}
    <div class="if-progress"><i style=${`width:${(clamp(t / INTRO_LENGTH)) * 100}%`}></i></div>
  </div>`;
}

// Abspieler mit Steuerung. startAt: Startzeitpunkt (ms, Server-Zeit) für synchrones Abspielen auf dem Beamer
export function IntroPlayer({ onClose, startOffset = 0, autoClose = false }) {
  const [t, setT] = useState(startOffset);
  const [playing, setPlaying] = useState(true);
  const base = useRef({ wall: performance.now(), t: startOffset });
  useEffect(() => {
    if (!playing) return;
    base.current = { wall: performance.now(), t };
    let raf;
    const tick = () => {
      const nt = base.current.t + (performance.now() - base.current.wall) / 1000;
      if (nt >= INTRO_LENGTH) { setT(INTRO_LENGTH); setPlaying(false); if (autoClose) setTimeout(() => onClose?.(), 1500); return; }
      setT(nt); raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose?.(); if (e.key === ' ') { e.preventDefault(); setPlaying((x) => !x); } }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, []);
  // Hintergrundmusik (selbst erzeugt), synchron zur Animation; Stummschalten wird gemerkt
  const audio = useRef(null);
  const [muted, setMuted] = useState(() => { try { return localStorage.getItem('bubbl:introMuted') === '1'; } catch { return false; } });
  const [blocked, setBlocked] = useState(false);
  if (!audio.current && typeof Audio !== 'undefined') { audio.current = new Audio('/audio/bubbl-intro.m4a'); audio.current.preload = 'auto'; audio.current.volume = 0.8; }
  const startAudio = () => {
    const a = audio.current; if (!a) return;
    a.muted = muted;
    try { a.currentTime = Math.min(base.current.t, INTRO_LENGTH); } catch { /* noch nicht geladen */ }
    a.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
  };
  useEffect(() => { if (playing) startAudio(); else audio.current?.pause(); }, [playing]);
  useEffect(() => () => audio.current?.pause(), []);
  useEffect(() => { if (audio.current) audio.current.muted = muted; try { localStorage.setItem('bubbl:introMuted', muted ? '1' : '0'); } catch { /* privat */ } }, [muted]);
  const ended = t >= INTRO_LENGTH;
  const frame = useRef(null);
  const [k, setK] = useState(0.5);
  useEffect(() => { const el = frame.current; if (!el) return; const ro = new ResizeObserver(() => setK(el.clientWidth / 1280)); ro.observe(el); return () => ro.disconnect(); }, []);
  return html`<div class="intro-overlay" role="dialog" aria-modal="true" aria-label="Intro-Film: Worum geht es bei bubbl?">
    <div class="intro-frame" ref=${frame}><div class="intro-scale" style=${`transform:scale(${k})`}><${IntroFilm} t=${t} /></div></div>
    <div class="intro-ctl">
      <button class="btn btn-sm" onClick=${() => { if (ended) { setT(0); base.current = { wall: performance.now(), t: 0 }; setPlaying(true); } else setPlaying(!playing); }}>
        <i class=${`bi bi-${ended ? 'arrow-counterclockwise' : playing ? 'pause-fill' : 'play-fill'}`}></i> ${ended ? 'Nochmal' : playing ? 'Pause' : 'Weiter'}</button>
      ${blocked && !muted && playing ? html`<button class="btn btn-sm btn-primary" onClick=${startAudio}><i class="bi bi-volume-up-fill"></i> Ton an</button>`
        : html`<button class="btn btn-sm" onClick=${() => setMuted(!muted)} title=${muted ? 'Musik an' : 'Musik aus'} aria-label=${muted ? 'Musik an' : 'Musik aus'}><i class=${`bi bi-volume-${muted ? 'mute' : 'up'}-fill`}></i></button>`}
      <span class="intro-time">${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')} / 1:${String(INTRO_LENGTH - 60).padStart(2, '0')}</span>
      <a class="btn btn-sm" href="/video/bubbl-intro.mp4" download title="Als MP4-Video herunterladen"><i class="bi bi-download"></i><span class="intro-lbl"> MP4</span></a>
      ${onClose && html`<button class="btn btn-sm" onClick=${onClose} title="Schließen"><i class="bi bi-x-lg"></i><span class="intro-lbl"> Schließen</span></button>`}
    </div>
    <p class="intro-rotate"><i class="bi bi-phone-landscape"></i> Tipp: Handy quer halten</p>
  </div>`;
}
