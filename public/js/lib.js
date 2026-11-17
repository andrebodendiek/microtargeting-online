// Gemeinsame Bausteine für alle Ansichten (Preact + htm, ohne Build-Schritt)
import { h, render } from 'preact';
import { useState, useEffect, useRef, useMemo, useCallback } from 'preact/hooks';
import htm from 'htm';
import { io } from '/socket.io/socket.io.esm.min.js';
import { CATEGORIES, CAT, POST, AD, PAGES, PHASE, GROUP_LETTERS, GROUP_COLORS } from '/shared/content.js';

export const html = htm.bind(h);
export { h, render, useState, useEffect, useRef, useMemo, useCallback };

export const qs = new URLSearchParams(location.search);
export const store = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* privat */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* privat */ } },
};

// ------------------------------------------------------------------ Socket
export function useRoom(hello, { onKicked } = {}) {
  const [state, setState] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState(null);
  const sockRef = useRef(null);
  const helloRef = useRef(hello);
  helloRef.current = hello;

  useEffect(() => {
    const sock = io({ transports: ['websocket', 'polling'] });
    sockRef.current = sock;
    const greet = () => {
      const msg = helloRef.current();
      if (!msg) return;
      sock.emit('hello', msg, (res) => {
        if (res?.auth) { setError(res.error); setStatus('auth'); return; }
        if (res?.error) { setError(res.error); setStatus('error'); return; }
        if (res?.needJoin) { setStatus('needJoin'); return; }
        if (res?.token) store.set(`bubbl:token:${msg.code}`, res.token);
        setError(null); setStatus('ok');
      });
    };
    sock.on('connect', greet);
    sock.on('disconnect', () => setStatus((s) => (s === 'error' ? s : 'offline')));
    sock.on('state', (s) => setState(s));
    sock.on('kicked', () => { setError('Du wurdest aus dem Raum entfernt.'); setStatus('error'); onKicked?.(); });
    sock.on('roomDeleted', () => { setError('Dieser Raum wurde beendet.'); setStatus('error'); });
    sock.greet = greet;
    return () => sock.close();
  }, []);

  const act = useCallback((type, data) => sockRef.current?.emit('act', { type, data }), []);
  return { state, status, error, act, sock: sockRef };
}

// ------------------------------------------------------------------ Lehrkraft-Anmeldung
export async function teacherStatus() {
  try { const r = await fetch('/api/me', { cache: 'no-store' }); return await r.json(); } catch { return { teacher: false, configured: true }; }
}
export async function teacherLogout() { await fetch('/api/logout', { method: 'POST' }); }

export function TeacherLogin({ onSuccess, configured = true, compact }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Anmeldung fehlgeschlagen.');
      onSuccess?.();
    } catch (e2) { setErr(e2.message); setBusy(false); setPw(''); }
  }
  if (!configured) return html`<p class="login-note">🔒 Der Lehrkraft-Zugang ist noch nicht eingerichtet. Auf dem Server muss die Umgebungsvariable <code>TEACHER_PASSWORD</code> gesetzt werden.</p>`;
  return html`<form class=${`login ${compact ? 'compact' : ''}`} onSubmit=${submit}>
    ${!compact && html`<p class="login-note">🔒 Nur für Lehrkräfte. Bitte mit dem Lehrkraft-Passwort anmelden.</p>`}
    <input class="field" type="password" autocomplete="current-password" placeholder="Lehrkraft-Passwort" value=${pw} onInput=${(e) => setPw(e.target.value)} aria-label="Lehrkraft-Passwort" required />
    <button class="btn primary block" disabled=${busy || !pw}>${busy ? 'Prüfe …' : 'Anmelden'}</button>
    ${err && html`<p class="login-err">${err}</p>`}
  </form>`;
}

export function LoginScreen({ title = 'Lehrkraft-Bereich' }) {
  const [cfg, setCfg] = useState(true);
  useEffect(() => { teacherStatus().then((s) => setCfg(s.configured)); }, []);
  return html`<main class="login-screen"><div class="card login-card">
    <${Logo} size=${38} />
    <h2>${title}</h2>
    <${TeacherLogin} configured=${cfg} onSuccess=${() => location.reload()} />
    <a class="muted small-link" href="/">← Zur Startseite</a>
  </div></main>`;
}

// ------------------------------------------------------------------ kleine Komponenten
export const Logo = ({ size = 28, sub }) => html`
  <span class="logo" style=${`--s:${size}px`}>
    <span class="logo-mark" aria-hidden="true"><i></i></span>
    <span class="logo-word">bubbl</span>
    ${sub && html`<span class="logo-sub">${sub}</span>`}
  </span>`;

export const Aurora = () => html`
  <div class="aurora" aria-hidden="true">
    <span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span><span class="blob b4"></span>
    <span class="grain"></span>
  </div>`;

export const groupColor = (gid) => GROUP_COLORS[Math.max(0, GROUP_LETTERS.indexOf(gid))];

export const Avatar = ({ id, avatar, size = 40, online, ring, title }) => html`
  <span class=${`avatar ${online === false ? 'off' : ''}`} style=${`--s:${size}px;${ring ? `--ring:${ring}` : ''}`} title=${title || (id != null ? `ID ${id}` : '')}>
    <span class="avatar-emoji">${avatar || '🙂'}</span>
    ${id != null && html`<b class="avatar-id">${id}</b>`}
  </span>`;

export const CatChip = ({ cat, on, onClick, small, count }) => {
  const c = CAT[cat];
  if (!c) return null;
  const Tag = onClick ? 'button' : 'span';
  return html`<${Tag} type=${onClick ? 'button' : undefined} class=${`chip cat ${on ? 'on' : ''} ${small ? 'small' : ''}`} style=${`--c:${c.color}`} onClick=${onClick}>
    <span class="chip-dot"></span><span>${c.icon} ${c.name}</span>${count != null && html`<b class="chip-count">${count}</b>`}
  </${Tag}>`;
};

export const GroupBadge = ({ gid, big }) => gid ? html`<span class=${`group-badge ${big ? 'big' : ''}`} style=${`--g:${groupColor(gid)}`}>Gruppe ${gid}</span>` : null;

// Bildfläche eines Beitrags aus Verlauf + Emojis
export const PostArt = ({ post, small }) => html`
  <div class=${`post-art ${small ? 'small' : ''}`} style=${`--a:${post.bg[0]};--b:${post.bg[1]}`}>
    <span class="art-main">${post.art[0]}</span>
    ${post.art[1] && html`<span class="art-2">${post.art[1]}</span>`}
    ${post.art[2] && html`<span class="art-3">${post.art[2]}</span>`}
  </div>`;

export const PageHead = ({ post, extra }) => {
  const pg = PAGES[post.page];
  return html`<div class="post-head">
    <span class="page-av">${pg.avatar}</span>
    <div class="page-meta"><b>${pg.name} <span class="verified" title="verifiziert">✓</span></b><small>@${pg.handle} · ${post.time}</small></div>
    ${extra}
  </div>`;
};

export const AdVisual = ({ ad, compact }) => html`
  <div class=${`ad-visual ${compact ? 'compact' : ''}`} style=${`--a:${ad.bg[0]};--b:${ad.bg[1]}`}>
    <span class="ad-art">${ad.art[0]}</span><span class="ad-art2">${ad.art[1]}</span>
    <div class="ad-copy"><small>${ad.brand}</small><b>${ad.product}</b>${!compact && html`<span>${ad.slogan}</span>`}</div>
    <span class="ad-price">${ad.price}</span>
  </div>`;

export function CountUp({ value, dur = 650, format = (v) => Math.round(v).toLocaleString('de-DE') }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now(); const a = from.current; const b = value;
    if (a === b || matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(b); from.current = b; return; }
    let raf;
    const tick = (t) => {
      const k = Math.min(1, (t - start) / dur); const e = 1 - Math.pow(1 - k, 3);
      setShown(a + (b - a) * e);
      if (k < 1) raf = requestAnimationFrame(tick); else from.current = b;
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); from.current = b; };
  }, [value]);
  return html`<span class="num">${format(shown)}</span>`;
}

export function Progress({ done, total, label, big }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return html`<div class=${`progress ${big ? 'big' : ''}`}>
    <div class="progress-bar"><i style=${`width:${pct}%`}></i></div>
    <span class="progress-label"><b>${done}</b> / ${total} ${label}</span>
  </div>`;
}

export const phaseTitle = (id) => PHASE[id]?.title || id;

// Phasen-Leiste („Stories“ auf dem Handy, Stepper auf dem Beamer)
export function Stepper({ phases, phase, progress, onPick }) {
  const idx = phases.indexOf(phase);
  return html`<ol class="stepper">
    ${phases.map((id, i) => {
      const st = i < idx ? 'done' : i === idx ? 'now' : 'next';
      const pct = st === 'now' && progress?.total ? Math.round((progress.done / progress.total) * 100) : st === 'done' ? 100 : 0;
      const inner = html`<span class="step-icon">${st === 'done' ? '✓' : PHASE[id].icon}</span>
        <span class="step-text"><small>Schritt ${i + 1}</small><b>${PHASE[id].title}</b></span>
        <span class="step-bar"><i style=${`width:${pct}%`}></i></span>`;
      return html`<li class=${`step ${st}`} key=${id}>${onPick ? html`<button type="button" onClick=${() => onPick(id)}>${inner}</button>` : inner}</li>`;
    })}
  </ol>`;
}

// ------------------------------------------------------------------ Diagramme
// Netz-/Radardiagramm für Interessenprofile (Werte 0..1); series: [{values, color, label, dashed}]
export function Radar({ series, size = 280, labels = true }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - (labels ? 46 : 12);
  const n = CATEGORIES.length;
  const pt = (i, v) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [cx + Math.cos(a) * r * v, cy + Math.sin(a) * r * v]; };
  const ring = (v) => CATEGORIES.map((_, i) => pt(i, v).join(',')).join(' ');
  return html`<svg class="radar" viewBox=${`0 0 ${size} ${size}`} role="img" aria-label="Interessenprofil">
    ${[0.25, 0.5, 0.75, 1].map((v) => html`<polygon class="radar-grid" points=${ring(v)} />`)}
    ${CATEGORIES.map((_, i) => { const [x, y] = pt(i, 1); return html`<line class="radar-axis" x1=${cx} y1=${cy} x2=${x} y2=${y} />`; })}
    ${series.map((s) => html`<polygon class=${`radar-area ${s.dashed ? 'dashed' : ''}`} style=${`--c:${s.color}`}
        points=${CATEGORIES.map((c, i) => pt(i, Math.max(0.03, s.values?.[c.id] || 0)).join(',')).join(' ')}><title>${s.label}</title></polygon>`)}
    ${series.map((s) => CATEGORIES.map((c, i) => { const v = s.values?.[c.id] || 0; if (!v) return null; const [x, y] = pt(i, v); return html`<circle class="radar-dot" style=${`--c:${s.color}`} cx=${x} cy=${y} r="4"><title>${`${s.label} · ${c.name}: ${Math.round(v * 100)} %`}</title></circle>`; }))}
    ${labels && CATEGORIES.map((c, i) => { const [x, y] = pt(i, 1.22); return html`<text class="radar-label" x=${x} y=${y} text-anchor="middle" dominant-baseline="middle"><tspan>${c.icon}</tspan><tspan x=${x} dy="15">${c.name}</tspan></text>`; })}
  </svg>`;
}

// Horizontale Balken je Kategorie (zwei Messgrößen als Anteile – gleiche Skala 0..100 %)
export function CatBars({ a, b, aLabel, bLabel }) {
  const sa = Object.values(a).reduce((x, y) => x + y, 0) || 1;
  const sb = Object.values(b).reduce((x, y) => x + y, 0) || 1;
  const max = Math.max(...CATEGORIES.map((c) => Math.max(a[c.id] / sa, b[c.id] / sb)), 0.01);
  return html`<div class="catbars">
    <div class="legend"><span class="lg solid">${aLabel}</span><span class="lg hatch">${bLabel}</span></div>
    ${CATEGORIES.map((c) => {
      const pa = a[c.id] / sa, pb = b[c.id] / sb;
      return html`<div class="catbar-row" style=${`--c:${c.color}`}>
        <span class="catbar-name">${c.icon} ${c.name}</span>
        <div class="catbar-tracks">
          <div class="catbar" title=${`${aLabel}: ${Math.round(pa * 100)} %`}><i style=${`width:${(pa / max) * 86}%`}></i><em>${Math.round(pa * 100)} %</em></div>
          <div class="catbar hatch" title=${`${bLabel}: ${Math.round(pb * 100)} %`}><i style=${`width:${(pb / max) * 86}%`}></i><em>${Math.round(pb * 100)} %</em></div>
        </div>
      </div>`;
    })}
  </div>`;
}

// Konfetti für Erfolgsmomente
export function confetti(n = 80) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const host = document.createElement('div');
  host.className = 'confetti';
  const colors = ['#7c3aed', '#ec4899', '#f59e0b', '#22c55e', '#3b82f6'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i');
    s.style.cssText = `left:${Math.random() * 100}%;background:${colors[i % colors.length]};animation-delay:${Math.random() * 0.4}s;animation-duration:${1.6 + Math.random() * 1.4}s;transform:rotate(${Math.random() * 360}deg)`;
    host.appendChild(s);
  }
  document.body.appendChild(host);
  setTimeout(() => host.remove(), 3400);
}

export { CATEGORIES, CAT, POST, AD, PAGES, PHASE };
