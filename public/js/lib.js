// Gemeinsame Bausteine für alle Ansichten (Preact + htm, ohne Build-Schritt)
import { h, render } from 'preact';
import { useState, useEffect, useRef, useMemo, useCallback } from 'preact/hooks';
import htm from 'htm';
import { io } from '/socket.io/socket.io.esm.min.js';
import { CATEGORIES, CAT, POST, AD, PAGES, PHASE, GROUP_LETTERS, GROUP_COLORS, applyContent } from '/shared/content.js';
import { avatarShapes, randomAvatar, AVATAR_PARTS, normalizeAvatar } from '/shared/avatar.js';
export { randomAvatar, normalizeAvatar };

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
        if (res?.joinError) { setError(res.joinError); setStatus('needJoin'); return; }
        if (res?.token) store.set(`bubbl:token:${msg.code}`, res.token);
        setError(null); setStatus('ok');
      });
    };
    sock.on('connect', greet);
    sock.on('disconnect', () => setStatus((s) => (s === 'error' ? s : 'offline')));
    sock.on('content', (c) => { applyContent(c); setState((s) => (s ? { ...s } : s)); });
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
    <input class="form-control" type="password" autocomplete="current-password" placeholder="Lehrkraft-Passwort" value=${pw} onInput=${(e) => setPw(e.target.value)} aria-label="Lehrkraft-Passwort" required />
    <button class="btn btn-primary w-100" disabled=${busy || !pw}>${busy ? 'Prüfe …' : 'Anmelden'}</button>
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

// Avatar als SVG (Baukasten) – ältere Räume mit Emoji-Avataren werden weiter unterstützt
export function AvatarArt({ cfg, size = 40, x, y }) {
  const shapes = avatarShapes(cfg);
  return h('svg', { viewBox: '0 0 100 100', width: size, height: size, x, y, class: 'avatar-svg', 'aria-hidden': 'true' },
    h('defs', null, h('clipPath', { id: 'avc' }, h('circle', { cx: 50, cy: 50, r: 50 }))),
    h('g', { 'clip-path': 'url(#avc)' }, shapes.map(([tag, attrs], i) => h(tag, { ...attrs, key: i }))));
}
export const Avatar = ({ id, avatar, size = 40, online, ring, title }) => html`
  <span class=${`avatar ${online === false ? 'off' : ''} ${avatar && typeof avatar === 'object' ? 'has-art' : ''}`} style=${`--s:${size}px;${ring ? `--ring:${ring}` : ''}`} title=${title || (id != null ? `ID ${id}` : '')}>
    ${avatar && typeof avatar === 'object' ? html`<${AvatarArt} cfg=${avatar} size=${size} />` : html`<span class="avatar-emoji">${avatar || '🙂'}</span>`}
    ${id != null && html`<b class="avatar-id">${id}</b>`}
  </span>`;

// Avatar in SVG-Grafiken (Beamer): als verschachteltes SVG oder Emoji-Text
export const AvatarInSvg = ({ avatar, r = 20 }) => (avatar && typeof avatar === 'object'
  ? html`<${AvatarArt} cfg=${avatar} size=${r * 2} x=${-r} y=${-r} />`
  : html`<text class="svg-emoji" y=${r * 0.35} text-anchor="middle" font-size=${r * 1.1}>${avatar}</text>`);

// ------------------------------------------------------------------ Avatar-Baukasten
const BUILDER_TABS = [
  ['skin', 'Haut', 'palette'], ['hair', 'Frisur', 'scissors'], ['hairColor', 'Haarfarbe', 'droplet'], ['eyes', 'Augen', 'eye'],
  ['mouth', 'Mund', 'emoji-smile'], ['extra', 'Extras', 'eyeglasses'], ['shirt', 'Shirt', 'person'], ['bg', 'Hintergrund', 'circle-half'],
];
export function AvatarBuilder({ value, onChange }) {
  const [tab, setTab] = useState('hair');
  const cur = value || randomAvatar();
  const isColor = typeof AVATAR_PARTS[tab][0] === 'string' && AVATAR_PARTS[tab][0].startsWith('#');
  return html`<div class="av-builder">
    <div class="av-stage"><${AvatarArt} cfg=${cur} size=${132} />
      <button type="button" class="btn btn-sm av-dice" onClick=${() => onChange(randomAvatar())}><i class="bi bi-dice-5"></i> Zufall</button></div>
    <div class="av-tabs" role="tablist">${BUILDER_TABS.map(([k, label, icon]) => html`<button type="button" role="tab" aria-selected=${tab === k} class=${`av-tab ${tab === k ? 'on' : ''}`} onClick=${() => setTab(k)}><i class=${`bi bi-${icon}`}></i><span>${label}</span></button>`)}</div>
    <div class=${`av-options ${isColor ? 'colors' : ''}`}>${AVATAR_PARTS[tab].map((opt, i) => {
      const on = cur[tab] === i;
      return isColor
        ? html`<button type="button" class=${`av-swatch ${on ? 'on' : ''}`} style=${`--sw:${opt}`} aria-label=${`Farbe ${i + 1}`} aria-pressed=${on} onClick=${() => onChange({ ...cur, [tab]: i })}></button>`
        : html`<button type="button" class=${`av-opt ${on ? 'on' : ''}`} aria-pressed=${on} onClick=${() => onChange({ ...cur, [tab]: i })}><${AvatarArt} cfg=${{ ...cur, [tab]: i }} size=${52} /><small>${opt}</small></button>`;
    })}</div>
  </div>`;
}

// Einheitliche Linien-Icons für Kategorien und Schritte (Bootstrap Icons), farbig in der Kategoriefarbe
export const Ic = ({ k, color = true }) => (k ? html`<i class=${`bi bi-${k.bi} ic`} style=${color && k.color ? `color:${k.color}` : ''} aria-hidden="true"></i>` : null);

export const CatChip = ({ cat, on, onClick, small, count }) => {
  const c = CAT[cat];
  if (!c) return null;
  const Tag = onClick ? 'button' : 'span';
  return html`<${Tag} type=${onClick ? 'button' : undefined} class=${`chip cat ${on ? 'on' : ''} ${small ? 'small' : ''}`} style=${`--c:${c.color}`} onClick=${onClick}>
    <span><${Ic} k=${c} /> ${c.name}</span>${count != null && html`<b class="chip-count">${count}</b>`}
  </${Tag}>`;
};

export const GroupBadge = ({ gid, big }) => gid ? html`<span class=${`group-badge ${big ? 'big' : ''}`} style=${`--g:${groupColor(gid)}`}>Gruppe ${gid}</span>` : null;

// Bildfläche eines Beitrags: echtes Foto, sonst Ersatzgrafik aus Verlauf + Emojis
export const PostArt = ({ post, small }) => post.image ? html`
  <div class=${`post-art photo ${small ? 'small' : ''}`}>
    <img src=${post.image.src} alt=${post.image.alt || post.headline || ''} loading="lazy" decoding="async" width="960" height="600" />
  </div>` : html`
  <div class=${`post-art ${small ? 'small' : ''}`} style=${`--a:${post.bg[0]};--b:${post.bg[1]}`}>
    <span class="art-main">${post.art[0]}</span>
    ${post.art[1] && html`<span class="art-2">${post.art[1]}</span>`}
    ${post.art[2] && html`<span class="art-3">${post.art[2]}</span>`}
  </div>`;

// Profilbild eines Kontos: Creator mit Gesicht (Avatar-Baukasten), Medien mit Monogramm
const hashStr = (t) => { let h = 2166136261; for (const ch of t) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const seeded = (seed) => () => { seed = (Math.imul(seed ^ (seed >>> 15), 2246822507) + 0x9e3779b9) >>> 0; return seed / 4294967296; };
export const AccountPic = ({ page, size = 40 }) => {
  if (!page) return null;
  if (page.kind === 'creator') return html`<span class="acc-pic story" style=${`--s:${size}px`}><${AvatarArt} cfg=${randomAvatar(seeded(hashStr(page.handle)))} size=${size - 6} /></span>`;
  const ini = page.name.replace(/[^\p{L}\p{N} ]/gu, '').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return html`<span class="acc-pic mono" style=${`--s:${size}px;--c:${page.color || '#0C5D6A'}`}>${ini}</span>`;
};
export const fmtCount = (n) => (n >= 1e6 ? `${(n / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio.` : n >= 1e5 ? `${Math.round(n / 1e3)} Tsd.` : n.toLocaleString('de-DE'));

export const PageHead = ({ post, extra }) => {
  const pg = PAGES[post.page] || { name: post.page, handle: post.page };
  return html`<div class="post-head">
    <${AccountPic} page=${pg} />
    <div class="page-meta"><b>${pg.name}${pg.verified !== false && html` <i class="bi bi-patch-check-fill verified-badge" title="verifiziertes Konto"></i>`}</b>
      ${post.sponsored ? html`<small class="partner">Bezahlte Partnerschaft mit <b>${post.sponsored}</b></small>` : html`<small>@${pg.handle} · ${post.time}${pg.followers ? ` · ${pg.followers} Follower` : ''}</small>`}</div>
    ${extra}
  </div>`;
};

// Quellenangabe für Fotos (Lizenzpflicht bei CC BY)
export const Credit = ({ image, prefix = 'Foto' }) => image?.credit ? html`<small class="credit">${prefix}: ${image.credit.url ? html`<a href=${image.credit.url} target="_blank" rel="noopener noreferrer">${image.credit.creator}</a>` : image.credit.creator}${image.credit.license ? ` · ${image.credit.license}` : ''}${image.credit.source ? ` · via Openverse` : ''}</small>` : null;

export const AdVisual = ({ ad, compact }) => html`
  <div class=${`ad-visual ${compact ? 'compact' : ''} ${ad.image ? 'photo' : ''}`} style=${`--a:${ad.bg[0]};--b:${ad.bg[1]}`}>
    ${ad.image ? html`<img class="ad-photo" src=${ad.image.src} alt=${ad.image.alt || ad.product} loading="lazy" decoding="async" width="960" height="600" />`
      : html`<span class="ad-art">${ad.art[0]}</span><span class="ad-art2">${ad.art[1]}</span>`}
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
  return html`<div class=${`bb-progress ${big ? 'big' : ''}`}>
    <div class="bb-progress-bar"><i style=${`width:${pct}%`}></i></div>
    <span class="bb-progress-label"><b>${done}</b> / ${total} ${label}</span>
  </div>`;
}

export const phaseTitle = (id) => PHASE[id]?.title || id;

// Phasen-Leiste: schlanker Segmentbalken (Handy und Beamer). Aktueller Schritt füllt sich mit dem Fortschritt.
export function Stepper({ phases, phase, progress, compact }) {
  const idx = phases.indexOf(phase);
  const next = phases[idx + 1];
  const pct = progress?.total ? Math.round((progress.done / progress.total) * 100) : 0;
  return html`<div class=${`track ${compact ? 'compact' : ''}`}>
    <div class="track-head"><span>Schritt <b>${idx + 1}</b> von ${phases.length}</span>${next && html`<span class="track-next">Als Nächstes: ${PHASE[next].title}</span>`}</div>
    <ol class="track-bar" aria-label="Fortschritt">${phases.map((id, i) => {
      const st = i < idx ? 'done' : i === idx ? 'now' : 'next';
      return html`<li class=${st} key=${id} title=${`Schritt ${i + 1}: ${PHASE[id].title}`} aria-label=${`Schritt ${i + 1}: ${PHASE[id].title}${st === 'now' ? ' (aktuell)' : st === 'done' ? ' (erledigt)' : ''}`}>
        ${st === 'now' && html`<i style=${`width:${Math.max(8, pct)}%`}></i>`}</li>`;
    })}</ol>
  </div>`;
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
    ${labels && CATEGORIES.map((c, i) => { const [x, y] = pt(i, 1.22); return html`<text class="radar-label" x=${x} y=${y} text-anchor="middle" dominant-baseline="middle"><tspan>${c.name}</tspan></text>`; })}
  </svg>`;
}

// Horizontale Balken je Kategorie (zwei Messgrößen als Anteile – gleiche Skala 0..100 %)
export function CatBars({ a, b, aLabel, bLabel }) {
  const sa = Object.values(a).reduce((x, y) => x + y, 0) || 1;
  const sb = b ? Object.values(b).reduce((x, y) => x + y, 0) || 1 : 1;
  const max = Math.max(...CATEGORIES.map((c) => Math.max(a[c.id] / sa, b ? b[c.id] / sb : 0)), 0.01);
  return html`<div class="catbars">
    <div class="legend"><span class="lg solid">${aLabel}</span>${b && html`<span class="lg hatch">${bLabel}</span>`}</div>
    ${CATEGORIES.map((c) => {
      const pa = a[c.id] / sa, pb = b ? b[c.id] / sb : 0;
      return html`<div class="catbar-row" style=${`--c:${c.color}`}>
        <span class="catbar-name"><${Ic} k=${c} /> ${c.name}</span>
        <div class="catbar-tracks">
          <div class="catbar" title=${`${aLabel}: ${Math.round(pa * 100)} %`}><i style=${`width:${(pa / max) * 86}%`}></i><em>${Math.round(pa * 100)} %</em></div>
          ${b && html`<div class="catbar hatch" title=${`${bLabel}: ${Math.round(pb * 100)} %`}><i style=${`width:${(pb / max) * 86}%`}></i><em>${Math.round(pb * 100)} %</em></div>`}
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
  const colors = ['#0C5D6A', '#1FB0C7', '#25b232', '#f59e0b', '#2d3133'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i');
    s.style.cssText = `left:${Math.random() * 100}%;background:${colors[i % colors.length]};animation-delay:${Math.random() * 0.4}s;animation-duration:${1.6 + Math.random() * 1.4}s;transform:rotate(${Math.random() * 360}deg)`;
    host.appendChild(s);
  }
  document.body.appendChild(host);
  setTimeout(() => host.remove(), 3400);
}

export { CATEGORIES, CAT, POST, AD, PAGES, PHASE };

// ------------------------------------------------------------------ Moderne Dropdown-Menüs (Bootstrap-Optik, eigene Logik)
// items: [{ label, icon, hint, onClick, href, target, danger, disabled, active, divider, header }]
// Menü wird per position:fixed an den Auslöser gehängt – so schneiden Tabellen/Scrollbereiche es nicht ab.
function useMenu() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btn = useRef(null);
  const menu = useRef(null);
  const place = useCallback(() => {
    const el = btn.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const mh = menu.current?.offsetHeight || 0; const mw = menu.current?.offsetWidth || 220;
    const below = innerHeight - r.bottom > mh + 12 || r.top < mh + 12;
    let left = Math.min(Math.max(8, r.right - mw), innerWidth - mw - 8);
    setPos({ top: below ? r.bottom + 6 : r.top - mh - 6, left, minWidth: Math.max(r.width, 180), up: !below, alignStart: r.left + mw < innerWidth - 8 ? r.left : null });
  }, []);
  useEffect(() => {
    if (!open) return;
    place(); requestAnimationFrame(place);
    const outside = (e) => { if (!menu.current?.contains(e.target) && !btn.current?.contains(e.target)) setOpen(false); };
    const key = (e) => {
      if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); }
      if (e.key === 'Tab') setOpen(false);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = [...(menu.current?.querySelectorAll('.dropdown-item:not(.disabled)') || [])];
        const i = items.indexOf(document.activeElement);
        items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
      }
    };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', key);
    addEventListener('scroll', place, true); addEventListener('resize', place);
    return () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', key); removeEventListener('scroll', place, true); removeEventListener('resize', place); };
  }, [open]);
  // Größe des Menüs ändert sich nach dem ersten Rendern (Mindestbreite, Inhalte) → neu ausrichten
  useEffect(() => {
    if (!open || !menu.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => place()); ro.observe(menu.current); return () => ro.disconnect();
  }, [open, !!pos]);
  useEffect(() => { if (open && pos) (menu.current?.querySelector('.dropdown-item.active') || menu.current?.querySelector('.dropdown-item:not(.disabled)'))?.focus({ preventScroll: true }); }, [open, !!pos]);
  return { open, setOpen, pos, btn, menu };
}

function MenuList({ m, items, align, onPick }) {
  if (!m.open) return null;
  const style = m.pos ? `top:${m.pos.top}px;left:${align === 'start' && m.pos.alignStart != null ? m.pos.alignStart : m.pos.left}px;min-width:${m.pos.minWidth}px` : 'visibility:hidden';
  return html`<ul class=${`dropdown-menu show bb-menu ${m.pos?.up ? 'up' : ''}`} style=${style} ref=${m.menu} role="menu">
    ${items.filter(Boolean).map((it, i) => it.divider ? html`<li key=${i}><hr class="dropdown-divider" /></li>`
      : it.header ? html`<li key=${i}><h6 class="dropdown-header">${it.header}</h6></li>`
      : html`<li key=${i}>${(() => {
        const inner = html`${it.icon && html`<i class=${`bi bi-${it.icon}`}></i>`}<span class="bb-item-text"><span>${it.label}</span>${it.hint && html`<small>${it.hint}</small>`}</span>${it.active && html`<i class="bi bi-check2 bb-check"></i>`}`;
        const cls = `dropdown-item ${it.danger ? 'text-danger' : ''} ${it.disabled ? 'disabled' : ''} ${it.active ? 'active' : ''}`;
        return it.href
          ? html`<a class=${cls} href=${it.href} target=${it.target} role="menuitem" onClick=${() => m.setOpen(false)}>${inner}</a>`
          : html`<button type="button" class=${cls} role="menuitem" disabled=${it.disabled} onClick=${() => { m.setOpen(false); onPick ? onPick(it) : it.onClick?.(); }}>${inner}</button>`;
      })()}</li>`)}
  </ul>`;
}

export function Dropdown({ label, icon, items, align = 'end', btnClass = 'btn', title, caret = true }) {
  const m = useMenu();
  return html`<div class="dropdown bb-dropdown">
    <button type="button" class=${`${btnClass} ${caret ? 'dropdown-toggle' : ''} ${m.open ? 'show' : ''}`} ref=${m.btn} title=${title} aria-label=${title || (typeof label === 'string' ? label : undefined)}
      aria-haspopup="menu" aria-expanded=${m.open} onClick=${() => m.setOpen(!m.open)}>
      ${icon && html`<i class=${`bi bi-${icon}`}></i>`}${label && html`<span>${label}</span>`}
    </button>
    <${MenuList} m=${m} items=${items} align=${align} />
  </div>`;
}

// Modernes Auswahlfeld als Ersatz für <select>: options [{ value, label, icon, emoji, hint }]
export function SelectMenu({ value, options, onChange, size, placeholder = 'Bitte wählen', ariaLabel }) {
  const m = useMenu();
  const cur = options.find((o) => String(o.value) === String(value));
  return html`<div class="dropdown bb-dropdown bb-select">
    <button type="button" class=${`form-select bb-select-btn ${size === 'sm' ? 'form-select-sm' : ''} ${m.open ? 'open' : ''}`} ref=${m.btn} aria-label=${ariaLabel} aria-haspopup="listbox" aria-expanded=${m.open} onClick=${() => m.setOpen(!m.open)}>
      ${cur ? html`${cur.emoji && html`<span class="bb-emoji">${cur.emoji}</span>`}${cur.icon && html`<i class=${`bi bi-${cur.icon}`}></i>`}<span class="bb-select-label">${cur.label}</span>` : html`<span class="muted">${placeholder}</span>`}
    </button>
    <${MenuList} m=${m} align="start" items=${options.map((o) => ({ ...o, label: o.emoji ? html`<span class="bb-emoji">${o.emoji}</span> ${o.label}` : o.label, active: String(o.value) === String(value) }))} onPick=${(it) => onChange(it.value)} />
  </div>`;
}
