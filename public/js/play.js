import {
  html, render, useState, useEffect, useRef, useMemo, useRoom, store, qs, Logo, Aurora, Avatar, CatChip, GroupBadge,
  PostArt, PageHead, AdVisual, CountUp, Radar, Stepper, confetti, CATEGORIES, CAT, POST, AD, PHASE,
} from './lib.js';
import { ADS, AVATARS, PARTY, PARTY_MESSAGES, CONTRADICTIONS } from '/shared/content.js';
import { TrackingInspector, Auskunft, Werkbank, Fairness, Quiz } from './play-extra.js';

const code = (qs.get('c') || '').toUpperCase();
const tokenKey = `bubbl:token:${code}`;

// ------------------------------------------------------------------ Heimliches Tracking
// Misst Verweildauer pro Beitrag, geöffnete Artikel, Lesezeit, Scrollen und Interaktionen.
const tracker = {
  act: null, dwell: {}, read: {}, opens: {}, events: 0, scrollPx: 0, sessionMs: 0,
  visible: new Map(), obs: null, lastY: 0, lastTick: performance.now(), readOpen: null, timer: null, active: false,
  start(act) {
    this.act = act;
    if (this.timer) return;
    this.ensure();
    this.lastY = scrollY;
    addEventListener('scroll', () => { if (!this.active) return; const d = Math.abs(scrollY - this.lastY); this.lastY = scrollY; this.scrollPx += d; if (d > 30) this.events++; }, { passive: true });
    addEventListener('pointerdown', () => { if (this.active) this.events++; }, { passive: true });
    document.addEventListener('visibilitychange', () => this.flush());
    this.timer = setInterval(() => this.flush(), 2500);
  },
  ensure() {
    if (this.obs) return;
    this.obs = new IntersectionObserver((entries) => {
      const now = performance.now();
      for (const e of entries) {
        const id = e.target.dataset.post;
        if (e.isIntersecting && e.intersectionRatio >= 0.6) { if (!this.visible.has(id)) this.visible.set(id, now); }
        else if (this.visible.has(id)) { this.add(this.dwell, id, now - this.visible.get(id)); this.visible.delete(id); }
      }
    }, { threshold: [0, 0.6, 1] });
  },
  add(map, id, ms) { if (ms > 0 && ms < 600000) map[id] = (map[id] || 0) + Math.round(ms); },
  observe(el) { if (!el) return; this.ensure(); this.obs.observe(el); },
  unobserve(el) { if (el && this.obs) { this.obs.unobserve(el); const id = el.dataset.post; if (this.visible.has(id)) { this.add(this.dwell, id, performance.now() - this.visible.get(id)); this.visible.delete(id); } } },
  open(id) { if (!this.active) return; this.opens[id] = (this.opens[id] || 0) + 1; this.readOpen = { id, t: performance.now() }; this.events++; },
  close() { if (this.readOpen) { this.add(this.read, this.readOpen.id, performance.now() - this.readOpen.t); this.readOpen = null; } },
  flush() {
    const now = performance.now();
    const hidden = document.visibilityState !== 'visible';
    for (const [id, t] of this.visible) { this.add(this.dwell, id, now - t); this.visible.set(id, now); }
    if (this.readOpen) { this.add(this.read, this.readOpen.id, now - this.readOpen.t); this.readOpen.t = now; }
    if (!hidden && this.active) this.sessionMs += now - this.lastTick;
    this.lastTick = now;
    if (hidden) this.visible.clear();
    if (!this.active || !this.act) { this.reset(); return; }
    const payload = { dwell: this.dwell, read: this.read, opens: this.opens, events: this.events, scrollPx: Math.round(this.scrollPx), sessionMs: Math.round(this.sessionMs) };
    if (Object.keys(this.dwell).length || Object.keys(this.read).length || this.events || this.scrollPx > 0) this.act('track', payload);
    this.reset();
  },
  reset() { this.dwell = {}; this.read = {}; this.opens = {}; this.events = 0; this.scrollPx = 0; this.sessionMs = 0; },
};

const Heart = () => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.8 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.3 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>`;
const Comment = () => html`<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.1A8.5 8.5 0 1 1 21 12z"/></svg>`;
const Share = () => html`<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>`;
const Bookmark = () => html`<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;

// ------------------------------------------------------------------ Bausteine
function Post({ post, liked, canLike, onLike, onOpen, note }) {
  const ref = useRef(null);
  const [burst, setBurst] = useState(0);
  const lastTap = useRef(0);
  useEffect(() => { const el = ref.current; tracker.observe(el); return () => tracker.unobserve(el); }, []);
  const like = () => { if (!liked && !canLike) return; if (!liked) setBurst((b) => b + 1); onLike(); };
  const tapArt = () => { const t = Date.now(); if (t - lastTap.current < 320) { if (!liked) like(); else setBurst((b) => b + 1); } lastTap.current = t; };
  return html`<article class="post card" data-post=${post.id} ref=${ref}>
    <${PageHead} post=${post} extra=${note && html`<span class="post-note">${note}</span>`} />
    <div class="art-wrap" onClick=${tapArt}>
      <${PostArt} post=${post} />
      ${burst > 0 && html`<span class="heart-burst" key=${burst}>❤️</span>`}
    </div>
    <div class="post-actions">
      <button class=${`icon-btn like-btn ${liked ? 'on' : ''}`} disabled=${!liked && !canLike} onClick=${like} aria-pressed=${liked} aria-label="Gefällt mir"><${Heart} /></button>
      <button class="icon-btn" aria-label="Kommentieren" onClick=${() => onOpen(post)}><${Comment} /></button>
      <button class="icon-btn" aria-label="Teilen"><${Share} /></button>
      <span class="spacer"></span>
      <button class="icon-btn" aria-label="Merken"><${Bookmark} /></button>
    </div>
    <div class="post-body">
      ${liked && html`<small class="liked-note">Dir gefällt das</small>`}
      <h3>${post.headline}</h3>
      <p>${post.teaser}</p>
      <button class="read-more" onClick=${() => onOpen(post)}>Weiterlesen</button>
    </div>
  </article>`;
}

function ArticleSheet({ post, onClose, liked, canLike, onLike }) {
  useEffect(() => { tracker.open(post.id); return () => tracker.close(); }, [post.id]);
  return html`<div class="sheet-backdrop" onClick=${onClose}>
    <div class="sheet" onClick=${(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <div class="sheet-grip"></div>
      <${PageHead} post=${post} extra=${html`<button class="icon-btn" onClick=${onClose} aria-label="Schließen">✕</button>`} />
      <${PostArt} post=${post} />
      <div class="post-body article">
        <h3>${post.headline}</h3>
        <p>${post.teaser.replace(/\s*…$/, '')} ${post.body.replace(/^…\s*/, '')}</p>
        <div class="article-actions">
          <button class=${`btn ${liked ? 'liked' : ''}`} disabled=${!liked && !canLike} onClick=${onLike}>${liked ? '❤️ Gefällt dir' : '🤍 Gefällt mir'}</button>
          <button class="btn ghost" onClick=${onClose}>Zurück zum Feed</button>
        </div>
      </div>
    </div>
  </div>`;
}

function TaskCard({ phase, settings }) {
  const [open, setOpen] = useState(true);
  const p = PHASE[phase];
  return html`<section class=${`task glass ${open ? '' : 'closed'}`}>
    <button class="task-head" onClick=${() => setOpen(!open)} aria-expanded=${open}>
      <span class="task-icon">${p.icon}</span>
      <span><small>${p.mode === 'GA' ? 'Gruppenarbeit' : p.mode === 'EA' ? 'Einzelarbeit' : 'Plenum'}</small><b>${p.title}</b></span>
      <span class="task-toggle">${open ? '−' : '+'}</span>
    </button>
    ${open && html`<ol class="task-list">${p.task.map((t) => html`<li>${t.replace('{maxLikes}', settings.maxLikes)}</li>`)}</ol>`}
  </section>`;
}

function PhaseFlash({ phase }) {
  const [show, setShow] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setShow(true); scrollTo({ top: 0, behavior: 'smooth' });
    const t = setTimeout(() => setShow(false), 2100);
    return () => clearTimeout(t);
  }, [phase]);
  if (!show) return null;
  const p = PHASE[phase];
  return html`<div class="phase-flash" onClick=${() => setShow(false)}>
    <div class="flash-inner"><span class="flash-icon">${p.icon}</span><small>Neuer Schritt</small><h2>${p.title}</h2></div>
  </div>`;
}

// ------------------------------------------------------------------ Phasen
function Lobby({ v, act }) {
  return html`<section class="stagger col">
    <div class="glass hero-card">
      <${Avatar} avatar=${v.me.avatar} size=${96} />
      <small class="muted">Deine Nutzer-ID</small>
      <div class="big-id">#${v.me.id}</div>
      <p class="muted">Merke dir diese Nummer – sie ist dein „Name“ im Netzwerk.</p>
    </div>
    <div class="glass pad">
      <h3>Profilbild wählen</h3>
      <div class="avatar-grid">
        ${AVATARS.map((a) => html`<button class=${`av-pick ${a === v.me.avatar ? 'on' : ''}`} onClick=${() => act('avatar', { avatar: a })}>${a}</button>`)}
      </div>
    </div>
    <div class="waiting glass"><span class="dots"><i></i><i></i><i></i></span> Warte auf den Start durch die Lehrkraft …</div>
  </section>`;
}

function Feed({ v, act }) {
  const [open, setOpen] = useState(null);
  const likes = v.me.likes;
  const max = v.settings.maxLikes;
  const can = likes.length < max;
  const toggle = (id) => act('like', { postId: id });
  const order = v.feed || [];
  return html`<section class="col">
    <div class="likes-left glass">
      <div class="like-dots">${Array.from({ length: max }, (_, i) => html`<i class=${i < likes.length ? 'on' : ''}></i>`)}</div>
      <span><b>${max - likes.length}</b> von ${max} Likes übrig</span>
    </div>
    ${order.map((id) => POST[id] && html`<${Post} key=${id} post=${POST[id]} liked=${likes.includes(id)} canLike=${can} onLike=${() => toggle(id)} onOpen=${setOpen} />`)}
    <div class="glass pad center">
      <p>${likes.length === 0 ? 'Du hast noch nichts geliked.' : `Du hast ${likes.length} Beiträge geliked.`}</p>
      <button class=${`btn ${v.me.feedDone ? '' : 'primary'}`} onClick=${() => { act('feedDone', { done: !v.me.feedDone }); if (!v.me.feedDone) confetti(40); }}>
        ${v.me.feedDone ? '✓ Fertig – doch noch ändern' : 'Ich bin fertig'}
      </button>
    </div>
    ${open && html`<${ArticleSheet} post=${open} onClose=${() => setOpen(null)} liked=${likes.includes(open.id)} canLike=${can} onLike=${() => toggle(open.id)} />`}
  </section>`;
}

function GroupHeader({ g, children }) {
  return html`<div class="glass pad group-head">
    <div class="row wrap gap"><${GroupBadge} gid=${g.id} big /> ${g.cats.map((c) => html`<${CatChip} cat=${c} on />`)}</div>
    <div class="members">${g.members.map((m) => html`<${Avatar} id=${m.id} avatar=${m.avatar} size=${36} online=${m.online} />`)}</div>
    ${children}
  </div>`;
}

function Auswertung({ v, act }) {
  const g = v.group;
  if (!g) return html`<div class="glass pad">Du bist noch keiner Gruppe zugeordnet. Die Lehrkraft teilt dich gleich ein.</div>`;
  const posts = (cat) => Object.values(POST).filter((p) => p.round === 1 && p.cat === cat);
  return html`<section class="col">
    <${GroupHeader} g=${g}><p class="muted small">Ihr seid für ${g.cats.length > 1 ? 'diese Kategorien' : 'diese Kategorie'} zuständig. Alle Gruppenmitglieder sehen live dieselbe Tabelle.</p><//>
    ${g.cats.map((cat) => html`<div class="glass pad">
      <h3>${CAT[cat].icon} Beiträge zu ${CAT[cat].name}</h3>
      <div class="like-posts">
        ${posts(cat).map((p) => html`<div class="like-post">
          <${PostArt} post=${p} small />
          <div><b>${p.headline}</b>
            <div class="id-stickers">${(g.postLikes[p.id] || []).length ? (g.postLikes[p.id] || []).sort((a, b) => a - b).map((id) => html`<span class="sticker">❤️ ${id}</span>`) : html`<small class="muted">keine Likes</small>`}</div>
          </div>
        </div>`)}
      </div>
    </div>`)}
    <div class="glass pad">
      <h3>Auswertung der Likes</h3>
      <p class="muted small">Tragt für jede ID ein, wie viele Likes sie eurer Kategorie gegeben hat.</p>
      <div class="tally" style=${`--cols:${g.cats.length}`}>
        <div class="tally-row head"><span>ID</span>${g.cats.map((c) => html`<span>${CAT[c].icon} ${CAT[c].name}</span>`)}</div>
        ${v.ids.map((id) => html`<div class="tally-row">
          <span class="tally-id">#${id}</span>
          ${g.cats.map((c) => { const n = g.tally[c]?.[id] || 0; return html`<span class=${`stepper-ctl ${n ? 'has' : ''}`} style=${`--c:${CAT[c].color}`}>
            <button disabled=${g.tallyDone || !n} onClick=${() => act('tally', { cat: c, id, count: n - 1 })} aria-label="weniger">−</button>
            <b>${n ? 'x'.repeat(Math.min(n, 5)) + (n > 5 ? '…' : '') : '·'}</b>
            <button disabled=${g.tallyDone} onClick=${() => act('tally', { cat: c, id, count: n + 1 })} aria-label="mehr">+</button>
          </span>`; })}
        </div>`)}
      </div>
      <button class=${`btn block ${g.tallyDone ? '' : 'primary'}`} onClick=${() => { act('tallyDone', { done: !g.tallyDone }); if (!g.tallyDone) confetti(50); }}>
        ${g.tallyDone ? '✓ Abgegeben – nochmal bearbeiten' : 'Auswertung abgeben'}
      </button>
    </div>
  </section>`;
}

function AdTargeting({ adId, w, v, act }) {
  const ad = AD[adId];
  const score = (id) => w.cats.reduce((a, c) => a + (v.db[c]?.[id] || 0), 0);
  const rows = useMemo(() => v.ids.slice().sort((a, b) => score(b) - score(a) || a - b), [v.ids, w.cats, v.db]);
  const full = w.targets.length >= v.budget;
  return html`<div class="glass ad-work">
    <div class="ad-frame"><${AdVisual} ad=${ad} /></div>
    <div class="pad col">
      <h3>1 · Zu welchen Kategorien passt „${ad.label}“?</h3>
      <div class="row wrap gap">${CATEGORIES.map((c) => html`<${CatChip} cat=${c.id} on=${w.cats.includes(c.id)} onClick=${w.done ? undefined : () => act('adCats', { adId, cat: c.id })} />`)}</div>
      <h3>2 · Wer soll die Anzeige sehen?</h3>
      <div class="budget"><span>Budget</span><div class="budget-bar"><i style=${`width:${(w.targets.length / v.budget) * 100}%`}></i></div><b>${w.targets.length} / ${v.budget}</b></div>
      <div class="db-table" style=${`--n:${CATEGORIES.length}`}>
        <div class="db-row head"><span></span><span>ID</span>${CATEGORIES.map((c) => html`<span class=${w.cats.includes(c.id) ? 'sel' : ''} title=${c.name}>${c.icon}</span>`)}<span>Σ</span></div>
        ${rows.map((id) => { const on = w.targets.includes(id); const s = score(id); return html`<button class=${`db-row ${on ? 'on' : ''}`} disabled=${w.done || (!on && full)} onClick=${() => act('adTarget', { adId, id })}>
          <span class="check">${on ? '✓' : ''}</span><span class="db-id">#${id}</span>
          ${CATEGORIES.map((c) => { const n = v.db[c.id]?.[id] || 0; return html`<span class=${`cell ${w.cats.includes(c.id) ? 'sel' : ''}`} style=${`--c:${c.color};--k:${Math.min(1, n / 3)}`}>${n || ''}</span>`; })}
          <span class="db-sum">${w.cats.length ? s : ''}</span>
        </button>`; })}
      </div>
      <button class=${`btn block ${w.done ? '' : 'primary'}`} disabled=${!w.done && (!w.targets.length || !w.cats.length)} onClick=${() => { act('adDone', { adId, done: !w.done }); if (!w.done) confetti(60); }}>
        ${w.done ? '✓ Geschaltet – zurückziehen' : `🚀 Anzeige an ${w.targets.length} Personen ausspielen`}
      </button>
    </div>
  </div>`;
}

function Werbung({ v, act }) {
  const g = v.group;
  if (!g) return html`<div class="glass pad">Du bist noch keiner Gruppe zugeordnet.</div>`;
  return html`<section class="col">
    <${GroupHeader} g=${g}><p class="muted small">Die Tabelle ist eure gemeinsame Datenbank aus Schritt 2 (alle Gruppen). Hervorgehobene Spalten = eure gewählten Kategorien.</p><//>
    ${g.ads.map((a) => v.adWork[a] && html`<${AdTargeting} key=${a} adId=${a} w=${v.adWork[a]} v=${v} act=${act} />`)}
  </section>`;
}

function RateButtons({ adId, value, act }) {
  return html`<div class="rate">
    <button class=${`btn ${value === 1 ? 'ok' : ''}`} onClick=${() => act('rate', { adId, value: value === 1 ? 0 : 1 })}>👍 Passt zu mir</button>
    <button class=${`btn ${value === -1 ? 'bad-on' : ''}`} onClick=${() => act('rate', { adId, value: value === -1 ? 0 : -1 })}>👎 Passt nicht</button>
  </div>`;
}

function Empfang({ v, act }) {
  const rec = v.received || [];
  const other = ADS.map((a) => a.id).filter((id) => !rec.includes(id));
  const all = ADS.every((a) => v.ratings[a.id] != null);
  useEffect(() => { if (all) confetti(50); }, [all]);
  return html`<section class="col">
    <div class="glass pad"><h3>📬 Dein Feed – jetzt mit Werbung</h3><p class="muted small">${rec.length ? `Du hast ${rec.length} Anzeige${rec.length > 1 ? 'n' : ''} bekommen.` : 'Dir wurde keine Anzeige ausgespielt.'} Bewerte ehrlich, ob sie zu dir passen.</p></div>
    ${rec.map((id) => html`<article class="post card" key=${id}>
      <div class="post-head"><span class="page-av">${AD[id].art[0]}</span><div class="page-meta"><b>${AD[id].brand}</b><span class="sponsored"><b>Gesponsert</b></span></div></div>
      <${AdVisual} ad=${AD[id]} />
      <div class="post-body"><h3>${AD[id].product}</h3><p>${AD[id].slogan}</p><span class="cta-fake">${AD[id].cta} ›</span>
        <${RateButtons} adId=${id} value=${v.ratings[id]} act=${act} />
      </div>
    </article>`)}
    <div class="glass pad">
      <h3>Diese Anzeigen hast du <u>nicht</u> bekommen</h3>
      <p class="muted small">Hätten sie dich interessiert?</p>
      <div class="other-ads">${other.map((id) => html`<div class="other-ad"><${AdVisual} ad=${AD[id]} compact /><${RateButtons} adId=${id} value=${v.ratings[id]} act=${act} /></div>`)}</div>
    </div>
    ${all && html`<div class="glass pad center done-note">✓ Alles bewertet! Schau auf den Beamer: Wer hat besser getroffen – Menschen oder Algorithmus?</div>`}
  </section>`;
}

const fmtS = (ms) => { const s = Math.round(ms / 1000); return s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`; };

function Profil({ v, act }) {
  const pr = v.profile;
  const st = pr.stats;
  return html`<section class="col stagger">
    <div class="glass pad reveal-head">
      <span class="kicker">Vertraulich · nur für dich</span>
      <h2>Was bubbl über dich weiß</h2>
      <p class="muted small">Du hast ${v.me.likes.length} Likes vergeben. Aber bubbl hat noch viel mehr gemessen – ohne dass du es gemerkt hast:</p>
      <div class="stat-grid">
        <div class="stat glow"><b><${CountUp} value=${st.dataPoints} /></b><small>Datenpunkte über dich</small></div>
        <div class="stat"><b>${fmtS(st.dwellMs)}</b><small>Verweildauer auf Beiträgen</small></div>
        <div class="stat"><b><${CountUp} value=${st.opens} /></b><small>Artikel geöffnet</small></div>
        <div class="stat"><b><${CountUp} value=${st.scrollPx * 0.000264} format=${(x) => x.toFixed(1).replace('.', ',')} /> m</b><small>gescrollt</small></div>
      </div>
    </div>
    <div class="glass pad">
      <h3>Dein Interessenprofil</h3>
      <div class="legend"><span class="lg dash" style="--lc:#94a3b8">nur aus deinen Likes</span><span class="lg solid" style="--lc:#ec4899">Likes + heimliches Tracking</span></div>
      <${Radar} series=${[{ values: pr.likesN, color: '#94a3b8', label: 'Nur Likes', dashed: true }, { values: pr.fullN, color: '#ec4899', label: 'Likes + Tracking' }]} />
    </div>
    ${st.secretReads.length > 0 && html`<div class="glass pad">
      <h3>🕵️ Heimlich gelesen – aber nicht geliked</h3>
      <div class="secret-list">${st.secretReads.map((x) => html`<div class="secret"><${PostArt} post=${POST[x.id]} small /><div><b>${POST[x.id].headline}</b><small class="muted">${fmtS(x.ms)} angesehen${x.opened ? ' · Artikel geöffnet' : ''}</small></div></div>`)}</div>
    </div>`}
    <div class="glass pad">
      <h3>Vermutungen über dich</h3>
      <p class="muted small">So ziehen Werbeplattformen Schlüsse aus Daten – oft mit Klischees. Stimmt das?</p>
      <div class="infer-list">
        ${pr.inferences.map((inf) => { const fb = pr.fb[inf.key]; return html`<div class=${`infer ${fb === true ? 'yes' : fb === false ? 'no' : ''}`}>
          <div class="infer-text">${inf.cat && html`<span class="chip-dot" style=${`--c:${CAT[inf.cat].color}`}></span>`}<span><b>${inf.text}</b><small class="muted">Grundlage: ${inf.basis}</small></span></div>
          <div class="infer-btns">
            <button class=${`chip ${fb === true ? 'yes' : ''}`} onClick=${() => act('infer', { key: inf.key, value: fb === true ? null : true })}>✓ stimmt</button>
            <button class=${`chip ${fb === false ? 'no' : ''}`} onClick=${() => act('infer', { key: inf.key, value: fb === false ? null : false })}>✗ stimmt nicht</button>
          </div>
        </div>`; })}
      </div>
    </div>
    <${TrackingInspector} log=${v.trackLog} />
    <${Auskunft} code=${v.code} />
    ${pr.received.length > 0 && html`<div class="glass pad"><h3>Deshalb hast du diese Werbung bekommen</h3><div class="other-ads">${pr.received.map((id) => html`<div class="other-ad"><${AdVisual} ad=${AD[id]} compact /><div class="row wrap gap">${AD[id].cats.map((c) => html`<${CatChip} cat=${c} small />`)}</div></div>`)}</div></div>`}
  </section>`;
}

function Blase({ v, act }) {
  const [open, setOpen] = useState(null);
  const b = v.bubble;
  const d = b.diversity;
  const pct = Math.round(d.index * 100);
  const level = pct >= 70 ? ['ok', 'Bunt gemischt'] : pct >= 40 ? ['warn', 'Wird enger …'] : ['bad', 'Du steckst in der Blase!'];
  const prevLen = useRef(b.feed.length);
  const [fresh, setFresh] = useState(0);
  useEffect(() => { if (b.feed.length > prevLen.current) setFresh(b.feed.length - prevLen.current); prevLen.current = b.feed.length; }, [b.feed.length]);
  useEffect(() => { if (!fresh) return; const t = setTimeout(() => setFresh(0), 2200); return () => clearTimeout(t); }, [fresh]);
  return html`<section class="col">
    <div class="glass pad bubble-meter sticky-top">
      <div class="row between"><b>🫧 Vielfalt deines Feeds</b><span class=${`status-pill ${level[0]}`}>${level[1]}</span></div>
      <div class="mix-bar">${CATEGORIES.map((c) => d.mix[c.id] ? html`<i style=${`flex:${d.mix[c.id]};background:${c.color}`} title=${`${c.name}: ${d.mix[c.id]}`}></i>` : null)}</div>
      <small class="muted">Letzte 9 Beiträge · ${d.distinct} von 7 Themen</small>
    </div>
    ${b.feed.map((id, i) => POST[id] && html`<${Post} key=${id} post=${POST[id]} liked=${b.likes.includes(id)} canLike=${true} onLike=${() => act('like', { postId: id })} onOpen=${setOpen}
      note=${i >= 6 ? html`<span class="for-you">✨ Für dich</span>` : null} />`)}
    <div class="row gap more-row">
      <button class="btn primary" onClick=${() => act('more', {})}>Mehr laden</button>
      <button class="btn" onClick=${() => act('more', { explore: true })}>🔀 Etwas Neues entdecken</button>
    </div>
    ${fresh > 0 && html`<div class="toast">✨ ${fresh} neue Beiträge – passend zu deinen Likes</div>`}
    ${open && html`<${ArticleSheet} post=${open} onClose=${() => setOpen(null)} liked=${b.likes.includes(open.id)} canLike=${true} onLike=${() => act('like', { postId: open.id })} />`}
  </section>`;
}

function Wahl({ v, act }) {
  const w = v.wahl;
  const msg = PARTY_MESSAGES[w.cat];
  const faces = ['😠', '🙁', '😐', '🙂', '😍'];
  return html`<section class="col stagger">
    <article class="post card">
      <div class="post-head"><span class="page-av">${PARTY.logo}</span><div class="page-meta"><b>${PARTY.name} <span class="verified">✓</span></b><span class="sponsored"><b>Gesponsert</b> · Politische Werbung</span></div></div>
      <div class="party-visual"><span>${msg.art}</span><h2>${msg.title}</h2></div>
      <div class="post-body"><p class="party-text">${msg.text}</p></div>
    </article>
    <div class="glass pad">
      <h3>Wie sympathisch findest du die ${PARTY.short}?</h3>
      <div class="scale">${faces.map((f, i) => html`<button class=${`scale-btn ${w.vote === i + 1 ? 'on' : ''}`} onClick=${() => act('vote', { score: i + 1 })}><span>${f}</span><small>${i + 1}</small></button>`)}</div>
    </div>
    ${w.revealed && html`<div class="glass pad reveal-wahl">
      <span class="kicker">Aufgedeckt</span>
      <h3>Die ${PARTY.short} hat ${Object.values(w.counts).filter(Boolean).length} verschiedene Botschaften verschickt!</h3>
      <div class="msg-list">${CATEGORIES.map((c) => html`<div class=${`msg ${c.id === w.cat ? 'mine' : ''}`} style=${`--c:${c.color}`}>
        <small>${c.icon} an ${c.name}-Fans · ${w.counts[c.id]} Pers.${c.id === w.cat ? ' · DU' : ''}</small><b>${PARTY_MESSAGES[c.id].title}</b><span>${PARTY_MESSAGES[c.id].text}</span></div>`)}</div>
      <div class="contra">${CONTRADICTIONS.map(([a, b, t]) => html`<div class="contra-item">⚡ <b>${CAT[a].name}</b> ↔ <b>${CAT[b].name}</b>: ${t}</div>`)}</div>
    </div>`}
  </section>`;
}

function Reflexion({ v, act }) {
  const r = v.reflect;
  const [pro, setPro] = useState(r.pro);
  const [con, setCon] = useState(r.con);
  const [saved, setSaved] = useState(false);
  const timer = useRef(null);
  const send = (data) => { clearTimeout(timer.current); timer.current = setTimeout(() => { act('reflect', data); setSaved(true); setTimeout(() => setSaved(false), 1500); }, 500); };
  const opts = [['😡', 'sehr schlecht'], ['🙁', 'eher schlecht'], ['😐', 'teils, teils'], ['🙂', 'eher gut'], ['🤩', 'sehr gut']];
  return html`<section class="col stagger">
    <div class="glass pad">
      <h3>Personalisierte Werbung finde ich …</h3>
      <div class="scale">${opts.map(([f, l], i) => html`<button class=${`scale-btn ${r.opinion === i + 1 ? 'on' : ''}`} onClick=${() => act('reflect', { opinion: i + 1 })}><span>${f}</span><small>${l}</small></button>`)}</div>
    </div>
    <div class="glass pad col">
      <label class="lbl">👍 Ein Vorteil von Microtargeting:<textarea class="field" maxlength="140" rows="2" value=${pro} onInput=${(e) => { setPro(e.target.value); send({ pro: e.target.value }); }} placeholder="z. B. Ich sehe Werbung, die mich interessiert …"></textarea></label>
      <label class="lbl">👎 Ein Nachteil / eine Gefahr:<textarea class="field" maxlength="140" rows="2" value=${con} onInput=${(e) => { setCon(e.target.value); send({ con: e.target.value }); }} placeholder="z. B. Parteien können Leute manipulieren …"></textarea></label>
      <small class="muted">${saved ? '✓ gespeichert – erscheint auf dem Beamer (ohne Namen)' : 'Wird automatisch gespeichert und anonym auf dem Beamer gezeigt.'}</small>
    </div>
  </section>`;
}

// ------------------------------------------------------------------ App
function Join({ onJoin, error }) {
  const [av, setAv] = useState(AVATARS[Math.floor(Math.random() * AVATARS.length)]);
  return html`<main class="join stagger">
    <${Logo} size=${46} />
    <div class="glass pad col">
      <h2>Willkommen bei bubbl!</h2>
      <p class="muted">Raum <b class="code">${code}</b>. Wähle ein Profilbild – deinen Namen brauchen wir nicht.</p>
      <div class="avatar-grid">${AVATARS.map((a) => html`<button class=${`av-pick ${a === av ? 'on' : ''}`} onClick=${() => setAv(a)}>${a}</button>`)}</div>
      <button class="btn primary block" onClick=${() => onJoin(av)}>Profil erstellen →</button>
      ${error && html`<p class="error">${error}</p>`}
    </div>
    <small class="muted center">Mit dem Beitritt stimmst du zu, dass bubbl alles misst, was du tust. 😉</small>
  </main>`;
}

function App() {
  const joinRef = useRef(null);
  const { state: v, status, error, act, sock } = useRoom(() => (code ? { code, role: 'player', token: store.get(tokenKey), join: !!joinRef.current, avatar: joinRef.current } : null),
    { onKicked: () => store.del(tokenKey) });

  useEffect(() => { if (v) { tracker.start(act); tracker.active = ['feed', 'blase', 'empfang'].includes(v.phase); } }, [v?.phase]);

  if (!code) { location.replace('/'); return null; }
  if (status === 'error') return html`<${Aurora} /><main class="join"><${Logo} size=${40} /><div class="glass pad col center"><h2>Hoppla</h2><p>${error}</p><a class="btn" href="/">Zur Startseite</a></div></main>`;
  if (status === 'needJoin') return html`<${Aurora} /><${Join} error=${error} onJoin=${(av) => { joinRef.current = av; sock.current?.greet(); }} />`;
  if (!v) return html`<${Aurora} /><main class="join"><${Logo} size=${46} /><div class="loader"><span class="dots"><i></i><i></i><i></i></span></div></main>`;

  const Phase = { lobby: Lobby, feed: Feed, auswertung: Auswertung, werbung: Werbung, empfang: Empfang, profil: Profil, blase: Blase, wahl: Wahl, reflexion: Reflexion, werkbank: Werkbank, fairness: Fairness, quiz: Quiz }[v.phase] || Lobby;
  return html`
    <${Aurora} />
    ${status === 'offline' && html`<div class="offline-banner">Verbindung unterbrochen – verbinde neu …</div>`}
    <header class="appbar glass">
      <${Logo} size=${26} />
      <span class="spacer"></span>
      ${v.me.group && ['auswertung', 'werbung', 'werkbank'].includes(v.phase) && html`<${GroupBadge} gid=${v.me.group} />`}
      <${Avatar} id=${v.me.id} avatar=${v.me.avatar} size=${38} />
    </header>
    <nav class="stories" aria-label="Fortschritt"><${Stepper} phases=${v.phases} phase=${v.phase} /></nav>
    <main class="feed-main">
      <${TaskCard} key=${v.phase} phase=${v.phase} settings=${v.settings} />
      <${Phase} v=${v} act=${act} />
    </main>
    <${PhaseFlash} phase=${v.phase} />`;
}

render(html`<${App} />`, document.getElementById('app'));
