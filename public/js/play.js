import {
  html, render, useState, useEffect, useRef, useMemo, useRoom, Dropdown, SelectMenu, AvatarBuilder, AvatarArt, randomAvatar, store, qs, Logo, Aurora, Avatar, CatChip, GroupBadge,
  PostArt, PageHead, AdVisual, Credit, CountUp, Radar, Stepper, Ic, confetti, CATEGORIES, CAT, POST, AD, PHASE, PAGES, fmtCount,
} from './lib.js';
import { ADS, PARTY, PARTY_MESSAGES, CONTRADICTIONS } from '/shared/content.js';
import { TrackingInspector, Auskunft, Werkbank, Fairness, Quiz } from './play-extra.js';
import { IntroPlayer } from './intro.js';

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
const PAGE = (post) => PAGES[post.page] || { name: post.page, handle: post.page };
const Tags = ({ tags }) => tags?.length ? html`<span class="post-tags">${tags.map((t) => html`<span>#${t}</span>`)}</span>` : null;
const likeText = (post, liked) => { const n = (post.stats?.likes || 0) + (liked ? 1 : 0); return n ? html`Gefällt <b>${fmtCount(n)}</b> Mal` : liked ? 'Dir gefällt das' : 'Sei die erste Person, der das gefällt'; };

function Post({ post, liked, canLike, onLike, onOpen, note }) {
  const ref = useRef(null);
  const [burst, setBurst] = useState(0);
  const lastTap = useRef(0);
  useEffect(() => { const el = ref.current; tracker.observe(el); return () => tracker.unobserve(el); }, []);
  const like = () => { if (!liked && !canLike) return; if (!liked) setBurst((b) => b + 1); onLike(); };
  const tapArt = () => { const t = Date.now(); if (t - lastTap.current < 320) { if (!liked) like(); else setBurst((b) => b + 1); } else if (post.format === 'link') setTimeout(() => { if (Date.now() - lastTap.current >= 320) onOpen(post); }, 330); lastTap.current = t; };
  const pg = PAGE(post);
  const st = post.stats || {};
  const isLink = (post.format || 'link') === 'link';
  return html`<article class=${`post card fmt-${post.format || 'link'}`} data-post=${post.id} ref=${ref}>
    <${PageHead} post=${post} extra=${html`${note && html`<span class="post-note">${note}</span>`}<i class="bi bi-three-dots post-more" aria-hidden="true"></i>`} />
    ${isLink && html`<p class="post-caption top">${post.teaser}</p>`}
    <div class="art-wrap" onClick=${tapArt}>
      <${PostArt} post=${post} />
      ${post.format === 'video' && html`<span class="play-btn" aria-hidden="true"><i class="bi bi-play-fill"></i></span><span class="vid-dur">${post.duration || '0:30'}</span>`}
      ${burst > 0 && html`<span class="heart-burst" key=${burst}>❤️</span>`}
    </div>
    ${isLink && html`<button class="link-card" onClick=${() => onOpen(post)}><small>${(pg.domain || `${pg.handle}.de`).toUpperCase()}</small><b>${post.headline}</b></button>`}
    <div class="post-actions">
      <button class=${`icon-btn like-btn ${liked ? 'on' : ''}`} disabled=${!liked && !canLike} onClick=${like} aria-pressed=${liked} aria-label="Gefällt mir"><${Heart} /></button>
      <button class="icon-btn" aria-label="Kommentieren" onClick=${() => onOpen(post)}><${Comment} /></button>
      <button class="icon-btn" aria-label="Teilen"><${Share} /></button>
      ${st.shares > 0 && html`<small class="muted share-n">${fmtCount(st.shares)}× geteilt</small>`}
      <span class="spacer"></span>
      <button class="icon-btn" aria-label="Merken"><${Bookmark} /></button>
    </div>
    <div class="post-body">
      <div class="like-line">${likeText(post, liked)}</div>
      ${!isLink && html`<p class="post-caption"><b>${pg.handle}</b> <span class="cap-head">${post.headline}</span> ${post.teaser} <button class="read-more inline" onClick=${() => onOpen(post)}>mehr</button></p>`}
      <${Tags} tags=${post.tags} />
      ${st.comments > 0 && html`<button class="comments-link" onClick=${() => onOpen(post)}>Alle ${fmtCount(st.comments)} Kommentare ansehen</button>`}
      ${post.comment && html`<p class="top-comment"><b>${post.comment.user}</b> ${post.comment.text}</p>`}
      <small class="post-time">${post.time === '1 Tag' ? 'gestern' : `vor ${post.time.replace('Std.', 'Stunden').replace('Tage', 'Tagen')}`}</small>
    </div>
  </article>`;
}

function ArticleSheet({ post, onClose, liked, canLike, onLike }) {
  useEffect(() => { tracker.open(post.id); return () => tracker.close(); }, [post.id]);
  const pg = PAGE(post);
  const isLink = (post.format || 'link') === 'link';
  const text = `${post.teaser.replace(/\s*…$/, '')} ${post.body.replace(/^…\s*/, '')}`;
  return html`<div class="sheet-backdrop" onClick=${onClose}>
    <div class="sheet" onClick=${(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label=${post.headline}>
      <div class="sheet-grip"></div>
      ${isLink && html`<div class="browser-bar"><i class="bi bi-lock-fill"></i> ${pg.domain || `${pg.handle}.de`}<button class="icon-btn ms-auto" onClick=${onClose} aria-label="Schließen"><i class="bi bi-x-lg"></i></button></div>`}
      ${!isLink && html`<${PageHead} post=${post} extra=${html`<button class="icon-btn ms-auto" onClick=${onClose} aria-label="Schließen"><i class="bi bi-x-lg"></i></button>`} />`}
      ${isLink && html`<div class="article-head"><small class="kicker">${CAT[post.cat]?.name}</small><h2>${post.headline}</h2><small class="muted">${pg.name} · vor ${post.time}</small></div>`}
      <div class="art-wrap"><${PostArt} post=${post} />${post.format === 'video' && html`<span class="play-btn" aria-hidden="true"><i class="bi bi-play-fill"></i></span><span class="vid-dur">${post.duration || '0:30'}</span>`}</div>
      <div class="post-body article">
        <${Credit} image=${post.image} />
        ${!isLink && html`<h3>${post.headline}</h3>`}
        <p>${text}</p>
        <${Tags} tags=${post.tags} />
        <div class="article-actions">
          <button class=${`btn ${liked ? 'liked' : ''}`} disabled=${!liked && !canLike} onClick=${onLike}>${liked ? '❤️ Gefällt dir' : '🤍 Gefällt mir'}</button>
          <button class="btn btn-ghost" onClick=${onClose}>Zurück zum Feed</button>
        </div>
        ${post.comment && html`<div class="comments"><b>Kommentare (${fmtCount(post.stats?.comments || 1)})</b>
          <div class="comment"><span class="c-av"><i class="bi bi-person-fill"></i></span><div><b>${post.comment.user}</b> ${post.comment.text}<small class="muted">${fmtCount(post.comment.likes || 0)} „Gefällt mir“ · Antworten</small></div></div>
          <small class="muted">Kommentare sind in diesem Spiel nur zum Lesen.</small></div>`}
      </div>
    </div>
  </div>`;
}

function TaskCard({ phase, settings }) {
  const [open, setOpen] = useState(true);
  const p = PHASE[phase];
  return html`<section class=${`task ${open ? '' : 'closed'}`}>
    <button class="task-head" onClick=${() => setOpen(!open)} aria-expanded=${open}>
      <span class="task-mode"><${Ic} k=${p} color=${false} /> ${p.mode === 'GA' ? 'Gruppenarbeit' : p.mode === 'EA' ? 'Einzelarbeit' : 'Plenum'}</span>
      <b>${p.title}</b>
      <i class=${`bi bi-chevron-${open ? 'up' : 'down'} task-toggle`}></i>
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
    <div class="flash-inner"><span class="flash-icon"><${Ic} k=${p} color=${false} /></span><small>Neuer Schritt</small><h2>${p.title}</h2></div>
  </div>`;
}


// ------------------------------------------------------------------ Phasen
function Lobby({ v, act }) {
  const [edit, setEdit] = useState(false);
  const [film, setFilm] = useState(false);
  return html`<section class="stagger bb-col">
    <button class="glass intro-card" onClick=${() => setFilm(true)}>
      <span class="intro-play"><i class="bi bi-play-fill"></i></span>
      <span><b>Worum geht's bei bubbl?</b><small class="muted">${v.introOnBeamer ? 'Läuft gerade auf dem Beamer' : 'Kurzer Film · 1:16 Min.'}</small></span>
    </button>
    ${film && html`<${IntroPlayer} onClose=${() => setFilm(false)} />`}
    <div class="glass hero-card">
      <${Avatar} avatar=${v.me.avatar} size=${104} />
      ${v.me.email && html`<b class="me-mail"><i class="bi bi-envelope"></i> ${v.me.email}</b>`}
      <small class="muted">Deine Nutzer-ID</small>
      <div class="big-id">#${v.me.id}</div>
      <p class="muted">Merke dir diese Nummer – sie ist dein „Name“ im Netzwerk.</p>
      <button class="btn btn-sm" onClick=${() => setEdit(!edit)}><i class=${`bi bi-${edit ? 'check-lg' : 'brush'}`}></i> ${edit ? 'Fertig' : 'Profilbild ändern'}</button>
    </div>
    ${edit && html`<div class="glass pad"><${AvatarBuilder} value=${v.me.avatar && typeof v.me.avatar === 'object' ? v.me.avatar : randomAvatar()} onChange=${(a) => act('avatar', { avatar: a })} /></div>`}
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
  return html`<section class="bb-col">
    <div class="likes-left glass">
      <div class="like-dots">${Array.from({ length: max }, (_, i) => html`<i class=${i < likes.length ? 'on' : ''}></i>`)}</div>
      <span><b>${max - likes.length}</b> von ${max} Likes übrig</span>
    </div>
    ${order.map((id) => POST[id] && html`<${Post} key=${id} post=${POST[id]} liked=${likes.includes(id)} canLike=${can} onLike=${() => toggle(id)} onOpen=${setOpen} />`)}
    <div class="glass pad center">
      <p>${likes.length === 0 ? 'Du hast noch nichts geliked.' : `Du hast ${likes.length} Beiträge geliked.`}</p>
      <button class=${`btn ${v.me.feedDone ? '' : 'btn-primary'}`} onClick=${() => { act('feedDone', { done: !v.me.feedDone }); if (!v.me.feedDone) confetti(40); }}>
        ${v.me.feedDone ? '✓ Fertig – doch noch ändern' : 'Ich bin fertig'}
      </button>
    </div>
    ${open && html`<${ArticleSheet} post=${open} onClose=${() => setOpen(null)} liked=${likes.includes(open.id)} canLike=${can} onLike=${() => toggle(open.id)} />`}
  </section>`;
}

function GroupHeader({ g, children }) {
  return html`<div class="glass pad group-head">
    <div class="bb-row wrap gap"><${GroupBadge} gid=${g.id} big /> ${g.cats.map((c) => html`<${CatChip} cat=${c} on />`)}</div>
    <div class="members">${g.members.map((m) => html`<${Avatar} id=${m.id} avatar=${m.avatar} size=${36} online=${m.online} />`)}</div>
    ${children}
  </div>`;
}

function Auswertung({ v }) {
  const r = v.dbRow;
  if (!r) return null;
  const max = Math.max(1, ...Object.values(r.counts));
  const liked = v.me.likes.map((id) => POST[id]).filter(Boolean);
  return html`<section class="bb-col stagger">
    <div class="glass pad">
      <span class="kicker">Deine Zeile in der bubbl-Datenbank</span>
      <h3>Nutzer-ID #${v.me.id}</h3>
      <div class="db-row-mine">
        ${CATEGORIES.map((c) => { const n = r.counts[c.id] || 0; return html`<div class=${`db-cell ${n ? 'has' : ''} ${r.top === c.id ? 'top' : ''}`} style=${`--c:${c.color};--k:${n / max}`}>
          <span class="db-cell-icon"><${Ic} k=${c} /></span><b>${n}</b><small>${c.name}</small></div>`; })}
      </div>
      ${r.top ? html`<p class="db-verdict">So sieht bubbl dich: <b>${CATEGORIES.filter((c) => r.counts[c.id] === max).map((c) => c.name).join(' und ')}-Fan</b> – wie ${r.sameTop - 1 > 0 ? `${r.sameTop - 1} weitere Person${r.sameTop - 1 === 1 ? '' : 'en'}` : 'sonst niemand'} in der Klasse.</p>`
        : html`<p class="db-verdict">Du hast nichts geliked – für bubbl bist du (noch) ein unbeschriebenes Blatt. Oder doch nicht? 🤔</p>`}
      <p class="muted small">Die ganze Tabelle hat ${r.players} Zeilen (eine pro Person) und 7 Spalten (eine pro Kategorie) – also ${r.rows} Felder. Erstellt in Millisekunden, ohne dass jemand zählen musste.</p>
    </div>
    ${liked.length > 0 && html`<div class="glass pad">
      <h3>Daraus wurde deine Zeile berechnet</h3>
      <div class="liked-list">${liked.map((p) => html`<div class="liked-item"><${PostArt} post=${p} small /><span>${p.headline}</span><${CatChip} cat=${p.cat} small /></div>`)}</div>
      <p class="muted small">Du hast nur geliked – die Kategorie hat bubbl selbst zugeordnet.</p>
    </div>`}
    <div class="glass pad">
      <h3>Denk mal nach</h3>
      <ol class="think"><li>Welche Werbung würdest du an deiner Stelle als Werbekunde schicken?</li><li>Stimmt das Bild, das die Tabelle von dir zeichnet?</li><li>Was steht <b>nicht</b> in der Tabelle – und könnte bubbl trotzdem wissen?</li></ol>
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
    <div class="pad bb-col">
      <h3>1 · Zu welchen Kategorien passt „${ad.label}“?</h3>
      <div class="bb-row wrap gap">${CATEGORIES.map((c) => html`<${CatChip} cat=${c.id} on=${w.cats.includes(c.id)} onClick=${w.done ? undefined : () => act('adCats', { adId, cat: c.id })} />`)}</div>
      <h3>2 · Wer soll die Anzeige sehen?</h3>
      <div class="budget"><span>Budget</span><div class="budget-bar"><i style=${`width:${(w.targets.length / v.budget) * 100}%`}></i></div><b>${w.targets.length} / ${v.budget}</b></div>
      <div class="db-table" style=${`--n:${CATEGORIES.length}`}>
        <div class="db-row head"><span></span><span>ID</span>${CATEGORIES.map((c) => html`<span class=${w.cats.includes(c.id) ? 'sel' : ''} title=${c.name}><${Ic} k=${c} /></span>`)}<span>Σ</span></div>
        ${rows.map((id) => { const on = w.targets.includes(id); const s = score(id); return html`<button class=${`db-row ${on ? 'on' : ''}`} disabled=${w.done || (!on && full)} onClick=${() => act('adTarget', { adId, id })}>
          <span class="check">${on ? '✓' : ''}</span><span class="db-id">#${id}</span>
          ${CATEGORIES.map((c) => { const n = v.db[c.id]?.[id] || 0; return html`<span class=${`cell ${w.cats.includes(c.id) ? 'sel' : ''}`} style=${`--c:${c.color};--k:${Math.min(1, n / 3)}`}>${n || ''}</span>`; })}
          <span class="db-sum">${w.cats.length ? s : ''}</span>
        </button>`; })}
      </div>
      <button class=${`btn w-100 ${w.done ? '' : 'btn-primary'}`} disabled=${!w.done && (!w.targets.length || !w.cats.length)} onClick=${() => { act('adDone', { adId, done: !w.done }); if (!w.done) confetti(60); }}>
        ${w.done ? '✓ Geschaltet – zurückziehen' : `🚀 Anzeige an ${w.targets.length} Personen ausspielen`}
      </button>
    </div>
  </div>`;
}

function Werbung({ v, act }) {
  const g = v.group;
  if (!g) return html`<div class="glass pad">Du bist noch keiner Gruppe zugeordnet.</div>`;
  return html`<section class="bb-col">
    <${GroupHeader} g=${g}><p class="muted small">Die Tabelle ist die automatisch erstellte Datenbank aus Schritt 3. Hervorgehobene Spalten = eure gewählten Kategorien.</p><//>
    ${g.ads.map((a) => v.adWork[a] && html`<${AdTargeting} key=${a} adId=${a} w=${v.adWork[a]} v=${v} act=${act} />`)}
  </section>`;
}

function RateButtons({ adId, value, act }) {
  return html`<div class="rate">
    <button class=${`btn ${value === 1 ? 'btn-success' : ''}`} onClick=${() => act('rate', { adId, value: value === 1 ? 0 : 1 })}>👍 Passt zu mir</button>
    <button class=${`btn ${value === -1 ? 'btn-danger' : ''}`} onClick=${() => act('rate', { adId, value: value === -1 ? 0 : -1 })}>👎 Passt nicht</button>
  </div>`;
}

function Empfang({ v, act }) {
  const rec = v.received || [];
  const other = ADS.map((a) => a.id).filter((id) => !rec.includes(id));
  const all = ADS.every((a) => v.ratings[a.id] != null);
  useEffect(() => { if (all) confetti(50); }, [all]);
  return html`<section class="bb-col">
    <div class="glass pad"><h3>Dein Feed – jetzt mit Werbung</h3><p class="muted small">${rec.length ? `Du hast ${rec.length} Anzeige${rec.length > 1 ? 'n' : ''} bekommen.` : 'Dir wurde keine Anzeige ausgespielt.'} Bewerte ehrlich, ob sie zu dir passen.</p></div>
    ${rec.map((id) => html`<article class="post card" key=${id}>
      <div class="post-head"><span class="page-av">${AD[id].art[0]}</span><div class="page-meta"><b>${AD[id].brand}</b><span class="sponsored"><b>Gesponsert</b></span></div></div>
      <${AdVisual} ad=${AD[id]} />
      <div class="post-body"><${Credit} image=${AD[id].image} />${AD[id].image ? '' : html`<h3>${AD[id].product}</h3>`}<p>${AD[id].slogan}</p><span class="cta-fake">${AD[id].cta} ›</span>
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
  return html`<section class="bb-col stagger">
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
      <div class="legend"><span class="lg dash" style="--lc:#94a3b8">nur aus deinen Likes</span><span class="lg solid" style="--lc:#0C5D6A">Likes + heimliches Tracking</span></div>
      <${Radar} series=${[{ values: pr.likesN, color: '#94a3b8', label: 'Nur Likes', dashed: true }, { values: pr.fullN, color: '#0C5D6A', label: 'Likes + Tracking' }]} />
    </div>
    ${st.secretReads.length > 0 && html`<div class="glass pad">
      <h3>Heimlich gelesen – aber nicht geliked</h3>
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
    ${v.consentReveal && html`<${ConsentReveal} c=${v.consentReveal} />`}
    <${TrackingInspector} log=${v.trackLog} />
    <${Auskunft} code=${v.code} />
    ${pr.received.length > 0 && html`<div class="glass pad"><h3>Deshalb hast du diese Werbung bekommen</h3><div class="other-ads">${pr.received.map((id) => html`<div class="other-ad"><${AdVisual} ad=${AD[id]} compact /><div class="bb-row wrap gap">${AD[id].cats.map((c) => html`<${CatChip} cat=${c} small />`)}</div></div>`)}</div></div>`}
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
  return html`<section class="bb-col">
    <div class="glass pad bubble-meter sticky-top">
      <div class="bb-row between"><b>🫧 Vielfalt deines Feeds</b><span class=${`status-pill ${level[0]}`}>${level[1]}</span></div>
      <div class="mix-bar">${CATEGORIES.map((c) => d.mix[c.id] ? html`<i style=${`flex:${d.mix[c.id]};background:${c.color}`} title=${`${c.name}: ${d.mix[c.id]}`}></i>` : null)}</div>
      <small class="muted">Letzte 9 Beiträge · ${d.distinct} von 7 Themen</small>
    </div>
    ${b.feed.map((id, i) => POST[id] && html`<${Post} key=${id} post=${POST[id]} liked=${b.likes.includes(id)} canLike=${true} onLike=${() => act('like', { postId: id })} onOpen=${setOpen}
      note=${i >= 6 ? html`<span class="for-you">✨ Für dich</span>` : null} />`)}
    <div class="bb-row gap more-row">
      <button class="btn btn-primary" onClick=${() => act('more', {})}>Mehr laden</button>
      <button class="btn" onClick=${() => act('more', { explore: true })}>🔀 Etwas Neues entdecken</button>
    </div>
    ${fresh > 0 && html`<div class="bb-toast">✨ ${fresh} neue Beiträge – passend zu deinen Likes</div>`}
    ${open && html`<${ArticleSheet} post=${open} onClose=${() => setOpen(null)} liked=${b.likes.includes(open.id)} canLike=${true} onLike=${() => act('like', { postId: open.id })} />`}
  </section>`;
}

function Wahl({ v, act }) {
  const w = v.wahl;
  const msg = PARTY_MESSAGES[w.cat];
  const faces = ['😠', '🙁', '😐', '🙂', '😍'];
  return html`<section class="bb-col stagger">
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
        <small><${Ic} k=${c} /> an ${c.name}-Fans · ${w.counts[c.id]} Pers.${c.id === w.cat ? ' · DU' : ''}</small><b>${PARTY_MESSAGES[c.id].title}</b><span>${PARTY_MESSAGES[c.id].text}</span></div>`)}</div>
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
  return html`<section class="bb-col stagger">
    <div class="glass pad">
      <h3>Personalisierte Werbung finde ich …</h3>
      <div class="scale">${opts.map(([f, l], i) => html`<button class=${`scale-btn ${r.opinion === i + 1 ? 'on' : ''}`} onClick=${() => act('reflect', { opinion: i + 1 })}><span>${f}</span><small>${l}</small></button>`)}</div>
    </div>
    <div class="glass pad bb-col">
      <label class="lbl">👍 Ein Vorteil von Microtargeting:<textarea class="form-control" maxlength="140" rows="2" value=${pro} onInput=${(e) => { setPro(e.target.value); send({ pro: e.target.value }); }} placeholder="z. B. Ich sehe Werbung, die mich interessiert …"></textarea></label>
      <label class="lbl">👎 Ein Nachteil / eine Gefahr:<textarea class="form-control" maxlength="140" rows="2" value=${con} onInput=${(e) => { setCon(e.target.value); send({ con: e.target.value }); }} placeholder="z. B. Parteien können Leute manipulieren …"></textarea></label>
      <small class="muted">${saved ? '✓ gespeichert – erscheint auf dem Beamer (ohne Namen)' : 'Wird automatisch gespeichert und anonym auf dem Beamer gezeigt.'}</small>
    </div>
  </section>`;
}

// ------------------------------------------------------------------ Innehalten (von der Lehrkraft gestartet)
const fmtMin = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} Min.`; };
function PauseOverlay({ pz, act }) {
  const total = pz.counts ? Math.max(1, pz.counts.reduce((a, b) => a + b, 0)) : 1;
  return html`<div class="pause-overlay" role="dialog" aria-modal="true" aria-label="Innehalten">
    <div class="pause-card">
      <span class="pause-kicker"><i class="bi bi-pause-circle"></i> Innehalten</span>
      <h2>${pz.q}</h2>
      <div class="pause-options">${pz.options.map((o, k) => {
        const share = pz.counts ? pz.counts[k] / total : null;
        return html`<button class=${`pause-opt ${pz.my === k ? 'on' : ''} ${pz.correct === k ? 'correct' : ''}`} disabled=${pz.revealed} onClick=${() => act('pauseAnswer', { value: k })}>
          ${share != null && html`<i class="pause-fill" style=${`width:${Math.round(share * 100)}%`}></i>`}
          <span>${o}</span>${share != null && html`<b>${Math.round(share * 100)} %</b>`}</button>`;
      })}</div>
      ${pz.real && html`<p class="pause-real"><i class="bi bi-stopwatch"></i> Deine echte Zeit im Shorts-Feed: <b>${fmtMin(pz.myReal)}</b></p>`}
      ${pz.insight ? html`<p class="pause-insight"><i class="bi bi-lightbulb"></i> ${pz.insight}</p>`
        : html`<p class="muted small center">${pz.my == null ? 'Antworte ehrlich – die Antworten sind anonym.' : 'Danke! Gleich gibt es die Auflösung auf dem Beamer.'}</p>`}
    </div>
  </div>`;
}

// ------------------------------------------------------------------ Shorts-Feed (simuliert: Fotos als „Clips“, Autoplay, Wischen)
function ShortClip({ item, playing, onDone, onSwipe, paused, onTogglePause }) {
  const [t, setT] = useState(0);
  const ref = useRef({ start: 0, acc: 0 });
  useEffect(() => { ref.current = { start: performance.now(), acc: 0 }; setT(0); }, [item.id]);
  useEffect(() => {
    if (!playing || paused) { ref.current.acc += ref.current.start ? performance.now() - ref.current.start : 0; ref.current.start = 0; return; }
    ref.current.start = performance.now();
    let raf;
    const tick = () => {
      const el = ref.current.acc + (performance.now() - ref.current.start);
      setT(el);
      if (el >= item.ms) onDone(item.ms); else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [item.id, playing, paused]);
  const elapsed = () => ref.current.acc + (ref.current.start ? performance.now() - ref.current.start : 0);
  const post = item.post && POST[item.post];
  const ad = item.ad && AD[item.ad];
  const pg = post ? (PAGES[post.page] || {}) : null;
  const img = (post || ad)?.image?.src;
  const st = post?.stats || { likes: 0, comments: 0, shares: 0 };
  const skipIn = ad ? Math.max(0, Math.ceil((3000 - t) / 1000)) : 0;
  return html`<div class="short" onClick=${onTogglePause}>
    ${img ? html`<img class="short-img" src=${img} alt="" key=${item.id} />` : html`<div class="short-img fallback" style=${`--a:${(post || ad).bg[0]};--b:${(post || ad).bg[1]}`}>${(post || ad).art[0]}</div>`}
    <div class="short-shade"></div>
    <div class="short-bar"><i style=${`width:${Math.min(100, (t / item.ms) * 100)}%`}></i></div>
    ${paused && html`<span class="short-paused"><i class="bi bi-pause-fill"></i></span>`}
    <div class="short-side" onClick=${(e) => e.stopPropagation()}>
      <span><i class="bi bi-heart-fill"></i>${fmtCount(Math.round((st.likes || 900) * 1.7))}</span>
      <span><i class="bi bi-chat-dots-fill"></i>${fmtCount(st.comments || 120)}</span>
      <span><i class="bi bi-share-fill"></i>Teilen</span>
    </div>
    <div class="short-info">
      ${ad ? html`<span class="short-sponsor">Gesponsert · ${ad.brand}</span><b>${ad.product}</b><span>${ad.slogan}</span><span class="short-cta">${ad.cta} · ${ad.price}</span>`
        : html`<span class="short-acc">@${pg.handle}${pg.verified !== false ? html` <i class="bi bi-patch-check-fill"></i>` : ''}</span><b>${post.headline}</b>${post.tags?.length ? html`<span class="short-tags">${post.tags.map((x) => `#${x}`).join(' ')}</span>` : ''}`}
    </div>
    <button class="short-next" onClick=${(e) => { e.stopPropagation(); if (!skipIn) onSwipe(elapsed()); }} disabled=${skipIn > 0} aria-label="Nächster Clip">
      ${skipIn > 0 ? html`Überspringen in ${skipIn}` : html`<i class="bi bi-chevron-up"></i> Weiter`}</button>
  </div>`;
}

function ShortsPlayer({ v, act, onClose }) {
  const q = v.shorts.queue;
  const cur = q[0];
  const [paused, setPaused] = useState(false);
  const sent = useRef(null);
  const touch = useRef(null);
  const finish = (ms) => { if (sent.current === cur.id) return; sent.current = cur.id; setPaused(false); act('shortWatched', { id: cur.id, ms }); };
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);
  // Vorladen der nächsten Bilder
  useEffect(() => { q.slice(1).forEach((x) => { const src = (POST[x.post] || AD[x.ad])?.image?.src; if (src) { const i = new Image(); i.src = src; } }); }, [cur?.id]);
  if (!cur) return null;
  return html`<div class="shorts-player"
      onTouchStart=${(e) => { touch.current = e.touches[0].clientY; }}
      onTouchEnd=${(e) => { const d = touch.current - e.changedTouches[0].clientY; touch.current = null; if (d > 60) e.currentTarget.querySelector(".short-next")?.click(); }}
      onWheel=${(e) => { if (e.deltaY > 40) e.currentTarget.querySelector('.short-next')?.click(); }}>
    <div class="shorts-top"><b>Shorts</b><span class="spacer"></span><button class="short-close" onClick=${onClose} aria-label="Shorts schließen"><i class="bi bi-x-lg"></i></button></div>
    <${ShortClip} key=${cur.id} item=${cur} playing=${sent.current !== cur.id} paused=${paused} onTogglePause=${() => setPaused(!paused)} onDone=${finish} onSwipe=${finish} />
  </div>`;
}

function ShortsReveal({ s, log }) {
  if (!s.count) return html`<section class="bb-col"><div class="glass pad"><h2>Du hast keine Shorts angesehen</h2><p class="muted">Auch eine Entscheidung! Schau auf den Beamer: Dort siehst du, wie der Feed die anderen festgehalten hat.</p></div></section>`;
  const pct = (x) => (x == null ? '–' : `${Math.round(x * 100)} %`);
  return html`<section class="bb-col stagger">
    <div class="glass pad reveal-head">
      <span class="kicker">Dein Shorts-Protokoll</span>
      <h2>So hat der Feed dich festgehalten</h2>
      <div class="stat-grid">
        <div class="stat glow"><b>${fmtMin(s.totalMs)}</b><small>im Shorts-Feed</small></div>
        <div class="stat"><b>${s.count}</b><small>Clips angesehen</small></div>
        <div class="stat"><b>${s.ads}</b><small>Werbeclips dazwischen</small></div>
        <div class="stat"><b>0</b><small>Likes nötig</small></div>
      </div>
    </div>
    ${s.top && html`<div class="glass pad">
      <h3>Dein Feed wurde enger</h3>
      <p class="small">Am Anfang war <b>${pct(s.firstShare)}</b> deiner Clips aus einem Thema, am Ende <b>${pct(s.lastShare)}</b>. Dein Hauptthema laut Wiedergabezeit: <b><${Ic} k=${CAT[s.top]} /> ${CAT[s.top].name}</b> (${pct(s.topWatchShare)} deiner Zeit).</p>
      <div class="shorts-curve">${s.curve.map((x, i) => html`<div class="sc-col" title=${`Clips ${i * 5 + 1}–${i * 5 + 5}: ${pct(x)}`}><i style=${`height:${Math.round((x || 0) * 100)}%`}></i><small>${i * 5 + 1}</small></div>`)}</div>
      <small class="muted">Anteil des häufigsten Themas je 5 Clips</small>
    </div>`}
    <div class="glass pad">
      <h3>Warum Shorts so schwer loszulassen sind</h3>
      <ul class="problem-list">
        <li><i class="bi bi-infinity"></i><span><b>Kein Ende:</b> Es gibt keine letzte Seite – nach jedem Clip kommt sofort der nächste.</span></li>
        <li><i class="bi bi-play-circle"></i><span><b>Autoplay:</b> Du musst nichts entscheiden. Weiterschauen ist der Standard, Aufhören kostet Kraft.</span></li>
        <li><i class="bi bi-stopwatch"></i><span><b>Wiedergabezeit ist das Signal:</b> Schon wie lange du hinschaust, steuert den Feed – ganz ohne Like.</span></li>
        <li><i class="bi bi-funnel"></i><span><b>Verengung (Rabbit Hole):</b> Was dich festhält, kommt öfter – auch Themen, die dir nicht guttun.</span></li>
        <li><i class="bi bi-badge-ad"></i><span><b>Werbung im Fluss:</b> Werbeclips sehen aus wie normale Clips und passen genau zu deinem Thema.</span></li>
        <li><i class="bi bi-moon-stars"></i><span><b>Zeit & Schlaf:</b> Kurze Clips fühlen sich wie „nur 5 Minuten“ an – das Zeitgefühl geht verloren.</span></li>
      </ul>
    </div>
    ${log?.length > 0 && html`<${TrackingInspector} log=${log} />`}
  </section>`;
}

function Shorts({ v, act }) {
  const [open, setOpen] = useState(false);
  const s = v.shorts;
  useEffect(() => { if (s.stopped) setOpen(false); }, [s.stopped]);
  if (s.stopped && s.stats) return html`<${ShortsReveal} s=${s.stats} log=${v.trackLog} />`;
  return html`<section class="bb-col">
    <div class="glass pad shorts-start">
      <i class="bi bi-phone-vibrate"></i>
      <h2>bubbl Shorts</h2>
      <p class="muted">Kurze Clips, die automatisch weiterlaufen. Wische nach oben, wenn dich etwas nicht interessiert. ${s.count > 0 ? html`<br />Bisher angesehen: <b>${s.count}</b> Clips.` : ''}</p>
      <button class="btn btn-primary btn-lg w-100" onClick=${() => setOpen(true)}><i class="bi bi-play-fill"></i> ${s.count ? 'Weiter schauen' : 'Shorts starten'}</button>
    </div>
    ${open && html`<${ShortsPlayer} v=${v} act=${act} onClose=${() => setOpen(false)} />`}
  </section>`;
}

// ------------------------------------------------------------------ bubbl-Postfach (simulierte E-Mails)
const fmtTime = (t) => new Date(t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
const FromIcon = ({ m }) => m.fromIcon === 'ad' ? html`<span class="mail-from ad"><i class="bi bi-bag-heart"></i></span>`
  : m.fromIcon === 'party' ? html`<span class="mail-from party" style=${{ background: PARTY.color }}>${PARTY.logo}</span>`
  : html`<span class="mail-from bubbl"><span class="logo-mark" style="--s:18px"><i></i></span></span>`;

function MailBody({ m, act, v }) {
  const d = m.data || {};
  const why = (t) => html`<div class="mail-why"><i class="bi bi-info-circle"></i> <span>${t}</span></div>`;
  const unsub = v.me.newsletter && html`<button class="link-btn mail-unsub" onClick=${() => act('unsubscribe')}>Newsletter abbestellen</button>`;
  if (m.kind === 'ad') {
    const ad = AD[d.ad];
    return html`<div class="bb-col">
      ${ad && html`<${AdVisual} ad=${ad} />`}
      <p>Hallo ${v.me.name || 'du'},<br />weil du dich für <b>${(d.cats || []).map((c) => CAT[c]?.name).filter(Boolean).join(' und ') || 'tolle Dinge'}</b> interessierst, haben wir ein exklusives Angebot für dich:</p>
      <div class="mail-code"><small>Dein persönlicher Code</small><b>${d.code}</b><small>gültig nur heute</small></div>
      ${why(`Du erhältst diese Mail, weil du bei der Anmeldung dem Newsletter zugestimmt hast (das Häkchen war schon gesetzt) und dein Profil zur Zielgruppe „${ad?.product || 'Anzeige'}“ passt.`)}
      ${unsub}
    </div>`;
  }
  if (m.kind === 'recs') return html`<div class="bb-col"><p>Wir haben gesehen, was du magst. Diese Beiträge zu <b>${CAT[d.cat]?.name}</b> hast du noch nicht entdeckt:</p>
    ${(d.posts || []).map((id) => POST[id] && html`<div class="mail-post"><${PostArt} post=${POST[id]} small /><b>${POST[id].headline}</b></div>`)}
    ${why('Ausgewählt aus deinen Likes in der Kategorie, die du am häufigsten geliked hast.')}${unsub}</div>`;
  if (m.kind === 'weekly') return html`<div class="bb-col"><p>Deine Woche auf bubbl: <b>${d.likes}</b> Likes – und <b>${Math.max(1, Math.round(d.ms / 1000))} Sekunden</b> mit <b>${CAT[d.cat]?.name}</b>.</p>
    ${why('Diese Zahl stammt nicht aus deinen Likes, sondern aus dem heimlichen Tracking: wie lange du Beiträge angesehen und Artikel gelesen hast.')}${unsub}</div>`;
  if (m.kind === 'party') return html`<div class="bb-col"><p><b>${m.subject.replace(/^[^,]*,\s*/, '')}</b></p><p>${m.preview}</p>
    ${why('Politische Organisationen können Zielgruppen genauso buchen wie Firmen. Andere bekommen andere Versprechen.')}</div>`;
  if (m.kind === 'nooffers') return html`<div class="bb-col"><p>${m.preview}</p>${why('Du hast den Newsletter abgelehnt oder abbestellt – deshalb bekommst du keine Angebote. Diese „Schade“-Mail ist trotzdem ein Versuch, dich umzustimmen (Confirmshaming).')}</div>`;
  if (m.kind === 'miss') return html`<div class="bb-col"><p>${m.preview}</p><div class="mail-code"><small>Comeback-Code</small><b>COMEBACK10</b></div>${why('„Wir vermissen dich“-Mails sollen dich zurück in die App holen – mehr Zeit in der App bedeutet mehr Daten und mehr Werbung.')}${unsub}</div>`;
  return html`<div class="bb-col"><p>Schön, dass du da bist! Like Beiträge, die dir gefallen – dann zeigen wir dir mehr davon.</p><button class="btn btn-primary" disabled>E-Mail bestätigen</button>
    ${why('Jede Registrierung beginnt mit einer Willkommens-Mail. Ab jetzt weiß bubbl, unter welcher Adresse es dich erreicht.')}</div>`;
}

function Postfach({ v, act, onClose }) {
  const [open, setOpen] = useState(null);
  const list = v.mail?.list || [];
  const m = open && list.find((x) => x.id === open);
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, []);
  const show = (x) => { setOpen(x.id); if (!x.read) act('readMail', { id: x.id }); };
  return html`<div class="sheet-backdrop" onClick=${onClose}><div class="sheet mailbox" onClick=${(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Postfach">
    <div class="sheet-grip"></div>
    <div class="mail-head">
      ${m ? html`<button class="btn btn-sm" onClick=${() => setOpen(null)} aria-label="Zurück"><i class="bi bi-arrow-left"></i></button>` : html`<i class="bi bi-envelope-paper-heart mail-head-icon"></i>`}
      <div><b>${m ? m.from : 'Posteingang'}</b><small class="muted">${v.me.email || ''}</small></div>
      <button class="btn btn-sm ms-auto" onClick=${onClose} aria-label="Schließen"><i class="bi bi-x-lg"></i></button>
    </div>
    ${m ? html`<article class="mail-detail"><h3>${m.subject}</h3><small class="muted">${m.from} · ${fmtTime(m.at)}</small><${MailBody} m=${m} act=${act} v=${v} /></article>`
      : list.length ? html`<ul class="mail-list">${list.map((x) => html`<li><button class=${`mail-item ${x.read ? '' : 'unread'}`} onClick=${() => show(x)}>
          <${FromIcon} m=${x} /><span class="mail-text"><span class="mail-line"><b>${x.from}</b><small>${fmtTime(x.at)}</small></span><span class="mail-subj">${x.subject}</span><small class="muted mail-prev">${x.preview}</small></span></button></li>`)}</ul>`
      : html`<p class="muted center pad">Noch keine Nachrichten.</p>`}
  </div></div>`;
}

function MailButton({ v, act }) {
  const [open, setOpen] = useState(false);
  const n = v.mail?.unread || 0;
  const prev = useRef(n);
  const [ping, setPing] = useState(false);
  useEffect(() => { if (n > prev.current) { setPing(true); navigator.vibrate?.(60); setTimeout(() => setPing(false), 1600); } prev.current = n; }, [n]);
  return html`<button class=${`icon-btn mail-btn ${ping ? 'ping' : ''}`} onClick=${() => setOpen(true)} aria-label=${`Postfach, ${n} ungelesen`} title="Postfach">
      <i class="bi bi-envelope"></i>${n > 0 && html`<span class="mail-badge">${n}</span>`}</button>
    ${open && html`<${Postfach} v=${v} act=${act} onClose=${() => setOpen(false)} />`}`;
}

function ConsentReveal({ c }) {
  return html`<div class="glass pad consent-reveal">
    <span class="kicker"><i class="bi bi-envelope-exclamation"></i> Deine Anmeldung</span>
    <h3>Was du bei der Anmeldung zugestimmt hast</h3>
    <ul class="reveal-list">
      <li class=${c.agbOpened ? 'ok' : 'warn'}><i class=${`bi bi-${c.agbOpened ? 'eye' : 'eye-slash'}`}></i><span>${c.agbOpened ? html`Du hast die Nutzungsbedingungen geöffnet – für <b>${Math.round(c.agbMs / 1000)} Sekunden</b>. Ganz gelesen hätte man sie in etwa 2 Minuten.` : html`Du hast die Nutzungsbedingungen <b>nicht geöffnet</b> – aber zugestimmt. Darin stand u. a.: <i>„Zusätzlich erfasst bubbl automatisch dein Nutzungsverhalten …“</i> und <i>„Dein Interessenprofil darf an Werbepartner und politische Organisationen weitergegeben werden.“</i>`}</span></li>
      <li class=${c.newsletter ? 'warn' : 'ok'}><i class="bi bi-check2-square"></i><span>${c.newsletter ? html`Das Newsletter-Häkchen war <b>schon gesetzt</b> – und du hast es so gelassen. Deshalb bekommst du personalisierte Werbung an <b>${c.email}</b>.` : c.unsub ? html`Du hast den Newsletter später <b>abbestellt</b>. Gut so!` : html`Du hast das vorausgewählte Newsletter-Häkchen <b>entfernt</b>. Sehr aufmerksam!`}</span></li>
      <li><i class="bi bi-envelope-paper"></i><span>Werbe-Mails in deinem Postfach: <b>${c.adMails}</b></span></li>
    </ul>
    <p class="muted small">Vorausgewählte Häkchen sind ein <b>Dark Pattern</b>. Nach DSGVO und Urteil des EuGH (Planet49, 2019) ist eine Einwilligung durch vorangekreuzte Kästchen <b>unwirksam</b>.</p>
  </div>`;
}

// ------------------------------------------------------------------ Profil-Menü (oben rechts)
function PlayerMenu({ v, act }) {
  async function auskunft() {
    const r = await fetch(`/api/rooms/${code}/auskunft`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: store.get(tokenKey) }) });
    if (!r.ok) return alert('Auskunft gerade nicht möglich.');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(await r.json(), null, 2)], { type: 'application/json' }));
    a.download = `bubbl-datenauskunft-id${v.me.id}.json`; a.click();
  }
  return html`<${Dropdown} btnClass="avatar-btn" caret=${false} title="Profil-Menü" label=${html`<${Avatar} id=${v.me.id} avatar=${v.me.avatar} size=${38} />`} items=${[
    { header: `Nutzer-ID #${v.me.id} · Raum ${code}` },
    { label: 'Aufgabe & Fortschritt', icon: 'list-check', hint: PHASE[v.phase].title, onClick: () => scrollTo({ top: 0, behavior: 'smooth' }) },
    { label: 'Intro-Film: Worum geht\'s?', icon: 'film', hint: 'Kurzer Film über Ziele und Ablauf', href: '/intro', target: '_blank' },
    { label: 'Bildnachweise', icon: 'images', hint: 'Fotograf*innen und Lizenzen', href: '/bildnachweise', target: '_blank' },
    { label: 'Meine Daten herunterladen', icon: 'file-earmark-lock', hint: 'Auskunft nach Art. 15 DSGVO', onClick: auskunft },
    { divider: true },
    { label: 'Raum verlassen', icon: 'box-arrow-right', danger: true, hint: 'Dein Profil bleibt im Raum gespeichert', onClick: () => { if (confirm('Raum verlassen? Mit dem gleichen Gerät kommst du über den Raumcode wieder in dein Profil.')) location.href = '/'; } },
  ]} />`;
}

// ------------------------------------------------------------------ App
// AGB mit „versteckten“ Klauseln – wer liest die schon? (wird später im Datenprofil aufgedeckt)
const AGB = [
  ['1. Geltungsbereich', 'Diese Nutzungsbedingungen gelten für alle Dienste von bubbl, einschließlich Feed, Nachrichten, Postfach und Partnerangeboten.'],
  ['2. Registrierung', 'Du versicherst, dass deine Angaben wahr sind. bubbl darf dein Konto jederzeit ohne Angabe von Gründen sperren.'],
  ['3. Inhalte', 'Du räumst bubbl an allen Inhalten, die du hochlädst oder likest, ein weltweites, kostenloses Nutzungsrecht ein.'],
  ['4. Nutzungsdaten', '4.1 bubbl speichert deine Likes. 4.2 Zusätzlich erfasst bubbl automatisch dein Nutzungsverhalten, z. B. wie lange du Beiträge ansiehst, welche Artikel du öffnest und wie weit du scrollst – auch wenn du nichts anklickst.'],
  ['5. Profilbildung', 'Aus deinen Daten erstellt bubbl ein Interessenprofil und leitet Merkmale wie Alter, Kaufkraft oder politische Einstellung ab.'],
  ['6. Personalisierung', 'Inhalte und Reihenfolge deines Feeds werden automatisch an dein Profil angepasst.'],
  ['7. Weitergabe', '7.1 bubbl arbeitet mit Werbepartnern zusammen. 7.2 Werbepartner erhalten Zugriff auf Zielgruppen. 7.3 Dein Interessenprofil darf an Werbepartner und politische Organisationen weitergegeben werden.'],
  ['8. Werbung', 'Werbung wird als „Gesponsert“ gekennzeichnet. Die Auswahl erfolgt automatisch anhand deines Profils.'],
  ['9. E-Mail', '9.1 Mit deiner Anmeldung erhältst du Nachrichten von bubbl und ausgewählten Partnern. 9.2 Eine Abmeldung ist jederzeit möglich, kann aber bis zu 30 Tage dauern.'],
  ['10. Speicherdauer', 'Deine Daten werden so lange gespeichert, wie es für die genannten Zwecke erforderlich ist.'],
  ['11. Änderungen', 'bubbl kann diese Bedingungen jederzeit ändern. Durch die weitere Nutzung stimmst du den Änderungen zu.'],
  ['12. Schlussbestimmungen', 'Sollte eine Bestimmung unwirksam sein, bleiben die übrigen wirksam.'],
];

function AgbSheet({ onClose }) {
  return html`<div class="sheet-backdrop" onClick=${onClose}><div class="sheet agb" onClick=${(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Nutzungsbedingungen">
    <div class="sheet-grip"></div>
    <div class="agb-body"><h3>Nutzungsbedingungen & Datenschutz</h3><small class="muted">Stand: heute · 12 Abschnitte</small>
      ${AGB.map(([t, txt]) => html`<section><b>${t}</b><p>${txt}</p></section>`)}
      <button class="btn btn-primary w-100" onClick=${onClose}>Schließen</button></div>
  </div></div>`;
}

function Join({ onJoin, error }) {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [year, setYear] = useState('');
  const [avatar, setAvatar] = useState(() => randomAvatar());
  const [agb, setAgb] = useState(false);
  const [newsletter, setNewsletter] = useState(true); // Dark Pattern: vorausgewählt
  const [agbOpen, setAgbOpen] = useState(false);
  const agbStat = useRef({ opened: false, ms: 0, since: 0 });
  const local = email.trim().toLowerCase().replace(/@.*$/, '');
  const validMail = /^[a-z0-9][a-z0-9._-]{1,19}$/.test(local);
  const nowY = new Date().getFullYear();
  const openAgb = () => { agbStat.current.opened = true; agbStat.current.since = performance.now(); setAgbOpen(true); };
  const closeAgb = () => { agbStat.current.ms += performance.now() - agbStat.current.since; setAgbOpen(false); };
  const submit = () => onJoin({ email: local, birthYear: year ? Number(year) : null, avatar, consent: { agb, newsletter, agbOpened: agbStat.current.opened, agbMs: Math.round(agbStat.current.ms) } });
  useEffect(() => { if (error && /Adresse/.test(error)) setStep(0); }, [error]);
  const steps = ['Konto', 'Profilbild', 'Zustimmung'];
  return html`<main class="join">
    <${Logo} size=${40} />
    <div class="card join-card">
      <ol class="join-steps">${steps.map((t, i) => html`<li class=${i < step ? 'done' : i === step ? 'now' : ''}><span>${i < step ? html`<i class="bi bi-check-lg"></i>` : i + 1}</span>${t}</li>`)}</ol>
      ${step === 0 && html`<div class="bb-col join-pane">
        <h2>Konto erstellen</h2>
        <label class="ed-like"><span>E-Mail-Adresse</span>
          <div class="input-group mail-group"><input class="form-control" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="20" placeholder="z. B. luna.star" value=${email} onInput=${(e) => setEmail(e.target.value.replace(/\s/g, ''))} /><span class="input-group-text">@bubbl.mail</span></div>
          <small class="muted"><i class="bi bi-incognito"></i> Denk dir eine Adresse aus – nicht deinen echten Namen und nicht deine echte E-Mail.</small></label>
        <label class="ed-like"><span>Geburtsjahr <small class="muted">(freiwillig)</small></span>
          <${SelectMenu} value=${year} placeholder="Keine Angabe" ariaLabel="Geburtsjahr" onChange=${setYear} options=${[{ value: '', label: 'Keine Angabe' }, ...Array.from({ length: 12 }, (_, i) => nowY - 9 - i).map((y) => ({ value: String(y), label: String(y) }))]} /></label>
        <button class="btn btn-primary w-100" disabled=${!validMail} onClick=${() => setStep(1)}>Weiter <i class="bi bi-arrow-right"></i></button>
      </div>`}
      ${step === 1 && html`<div class="bb-col join-pane">
        <h2>Dein Profilbild</h2>
        <${AvatarBuilder} value=${avatar} onChange=${setAvatar} />
        <div class="bb-row gap"><button class="btn" onClick=${() => setStep(0)}><i class="bi bi-arrow-left"></i></button><button class="btn btn-primary flex-grow-1" onClick=${() => setStep(2)}>Weiter <i class="bi bi-arrow-right"></i></button></div>
      </div>`}
      ${step === 2 && html`<div class="bb-col join-pane">
        <h2>Fast geschafft!</h2>
        <div class="join-summary"><${AvatarArt} cfg=${avatar} size=${56} /><div><b>${local}@bubbl.mail</b><small class="muted">Raum ${code}</small></div></div>
        <label class="form-check join-check"><input class="form-check-input" type="checkbox" checked=${agb} onChange=${(e) => setAgb(e.target.checked)} />
          <span>Ich akzeptiere die <button type="button" class="link-btn" onClick=${openAgb}>Nutzungsbedingungen</button> und die Datenschutzerklärung.</span></label>
        <label class="form-check join-check"><input class="form-check-input" type="checkbox" checked=${newsletter} onChange=${(e) => setNewsletter(e.target.checked)} />
          <span>Ja, ich möchte exklusive Angebote und Neuigkeiten von bubbl und Partnern per E-Mail erhalten.</span></label>
        <div class="bb-row gap"><button class="btn" onClick=${() => setStep(1)}><i class="bi bi-arrow-left"></i></button><button class="btn btn-primary flex-grow-1" disabled=${!agb} onClick=${submit}>Konto erstellen <i class="bi bi-check-lg"></i></button></div>
      </div>`}
      ${error && html`<p class="error">${error}</p>`}
    </div>
    <small class="muted center">bubbl ist ein Unterrichtsspiel. Es werden keine echten E-Mails verschickt.</small>
    ${agbOpen && html`<${AgbSheet} onClose=${closeAgb} />`}
  </main>`;
}

function App() {
  const joinRef = useRef(null);
  const { state: v, status, error, act, sock } = useRoom(() => (code ? { code, role: 'player', token: store.get(tokenKey), join: !!joinRef.current, reg: joinRef.current } : null),
    { onKicked: () => store.del(tokenKey) });

  useEffect(() => { if (v) { tracker.start(act); tracker.active = ['feed', 'blase', 'empfang'].includes(v.phase); } }, [v?.phase]);

  if (!code) { location.replace('/'); return null; }
  if (status === 'error') return html`<${Aurora} /><main class="join"><${Logo} size=${40} /><div class="glass pad bb-col center"><h2>Hoppla</h2><p>${error}</p><a class="btn" href="/">Zur Startseite</a></div></main>`;
  if (status === 'needJoin') return html`<${Aurora} /><${Join} error=${error} onJoin=${(reg) => { joinRef.current = reg; sock.current?.greet(); }} />`;
  if (!v) return html`<${Aurora} /><main class="join"><${Logo} size=${46} /><div class="loader"><span class="dots"><i></i><i></i><i></i></span></div></main>`;

  const Phase = { lobby: Lobby, feed: Feed, auswertung: Auswertung, werbung: Werbung, empfang: Empfang, profil: Profil, blase: Blase, wahl: Wahl, reflexion: Reflexion, werkbank: Werkbank, fairness: Fairness, quiz: Quiz, shorts: Shorts }[v.phase] || Lobby;
  return html`
    <${Aurora} />
    ${status === 'offline' && html`<div class="offline-banner">Verbindung unterbrochen – verbinde neu …</div>`}
    <header class="appbar glass">
      <${Logo} size=${26} />
      <span class="spacer"></span>
      ${v.me.group && ['werbung', 'werkbank'].includes(v.phase) && html`<${GroupBadge} gid=${v.me.group} />`}
      <${MailButton} v=${v} act=${act} />
      <${PlayerMenu} v=${v} act=${act} />
    </header>
    <nav class="stories" aria-label="Fortschritt"><${Stepper} phases=${v.phases} phase=${v.phase} compact /></nav>
    <main class="feed-main">
      <${TaskCard} key=${v.phase} phase=${v.phase} settings=${v.settings} />
      <${Phase} v=${v} act=${act} />
    </main>
    <${PhaseFlash} phase=${v.phase} />
    ${v.pause && html`<${PauseOverlay} pz=${v.pause} act=${act} />`}`;
}

render(html`<${App} />`, document.getElementById('app'));
