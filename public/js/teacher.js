import {
  html, render, useState, useEffect, useRef, useRoom, Dropdown, SelectMenu, LoginScreen, teacherLogout, store, qs, Logo, Aurora, Avatar, CatChip, GroupBadge,
  CATEGORIES, CAT, PHASE,
} from './lib.js';

import { PHASES, ADS } from '/shared/content.js';
const OPTIONAL = PHASES.filter((p) => p.optional).map((p) => p.id);
const code = (qs.get('c') || '').toUpperCase();
const key = location.hash.slice(1);
const beamerUrl = `/beamer?c=${code}#${key}`;
const joinUrl = `${location.origin}/?c=${code}`;

const HINTS = {
  lobby: 'Beamer-Fenster öffnen und auf den Projektor ziehen (Doppelklick = Vollbild). Die SuS scannen den QR-Code. Wer neu lädt, landet automatisch wieder im eigenen Profil.',
  feed: 'Nicht verraten: bubbl misst ab jetzt heimlich Verweildauer, geöffnete Artikel und Scrollen. Erst im Schritt „Dein Datenprofil“ wird das aufgedeckt. Ca. 5–7 Minuten.',
  auswertung: 'Plenumsphase (ca. 5 Min.): Der Beamer zeigt, wie aus jedem Like automatisch ein Eintrag in der Datenbank wird – im Original die Office-Tabelle, die die Gruppen von Hand füllten. Jede/r sieht auf dem Handy die eigene Zeile. Impulse: Was weiß bubbl jetzt? Wer bekommt welche Werbung? Was fehlt (→ Tracking später)? Danach direkt weiter zu „Werbung platzieren“ – die Gruppen werden dafür automatisch gebildet.',
  werbung: 'Jede Gruppe platziert eine Anzeige mit begrenztem Budget. Parallel targetet der bubbl-Algorithmus dieselben Anzeigen – mit Likes UND Tracking-Daten. Die Ergebnisse werden im nächsten Schritt verglichen.',
  empfang: 'Die SuS bewerten alle Anzeigen (auch die nicht erhaltenen). Daraus ergibt sich Trefferquote (Präzision) und Reichweite für Mensch und Algorithmus. Frage: Warum ist der Algorithmus (meist) besser?',
  profil: 'Aufdeckung: Likes vs. heimlich gemessene Signale. Fragen: Was verrät Verweildauer? Sind die „Vermutungen“ fair? Woher kennen Plattformen Alter, Kaufkraft, politische Haltung?',
  blase: 'Der Feed empfiehlt jetzt nach Interesse – jeder Like verengt ihn weiter. Auf dem Beamer wandern die Avatare zu „ihrem“ Thema. Impuls: Wer schafft es, die Blase mit „Entdecken“ zu verlassen?',
  wahl: 'Jede Person bekommt die Botschaft zu ihrem Hauptinteresse – manche widersprechen sich. Erst abstimmen lassen, dann „Aufdecken“. Bezug: Cambridge Analytica, Dark Ads, DSA-Regeln zu politischer Werbung.',
  werkbank: 'Die Gruppen stellen Gewichte für Likes und Tracking-Signale ein und sehen live Trefferquote, Reichweite und F1 – geprüft an den echten Bewertungen aus „Werbung erhalten“ (Trainingsdaten = erste 4 Anzeigen). Zum Schluss „Testdaten aufdecken“: Wer hat überangepasst (Overfitting)?',
  fairness: 'Ein Angebot für alle (z. B. Ausbildungsplatz) wird klick-optimiert nur an die „typische“ Zielgruppe ausgespielt. Erst antworten lassen, dann diskutieren und die „Fairness-Regel“ einschalten: Wie ändert sich die Verteilung? Begriffe: Proxy-Merkmal, indirekte Diskriminierung.',
  quiz: 'Live-Quiz zur Sicherung. „Frage starten“ → 20 s Antwortzeit → „Auflösen“ zeigt Lösung, Erklärung und Bestenliste. Fragen lassen sich im Inhalts-Editor (auch per KI) anpassen.',
  reflexion: 'Originale Reflexionsfragen aus dem Material. Notizen erscheinen anonym auf dem Beamer und können hier ausgeblendet werden. Am Ende: CSV exportieren.',
};

const MODE = { EA: ['person', 'Einzelarbeit'], GA: ['people', 'Gruppenarbeit'], Plenum: ['easel', 'Plenum'] };

// ------------------------------------------------------------------ Einstellungen (Seitenpanel)
function SettingsDrawer({ v, act, onClose }) {
  const s = v.settings;
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, []);
  const num = (k, min, max, label, hint) => html`<div class="cp-set"><label for=${`set-${k}`}><b>${label}</b><small>${hint}</small></label>
    <input id=${`set-${k}`} class="form-control" type="number" min=${min} max=${max} value=${s[k]} onChange=${(e) => act('settings', { [k]: Number(e.target.value) })} /></div>`;
  return html`<div class="cp-drawer-backdrop" onClick=${onClose}>
    <aside class="cp-drawer" onClick=${(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Einstellungen">
      <div class="cp-drawer-head"><h2><i class="bi bi-gear"></i> Einstellungen</h2><button class="icon-btn" onClick=${onClose} aria-label="Schließen"><i class="bi bi-x-lg"></i></button></div>
      <h3 class="cp-sub">Spiel</h3>
      ${num('maxLikes', 1, 22, 'Likes pro Person', 'Original: 10')}
      <div class="cp-set"><label><b>Anzahl Gruppen</b><small>höchstens 7 (eine je Kategorie)</small></label>
        <${SelectMenu} value=${s.groupCount} ariaLabel="Anzahl Gruppen" onChange=${(val) => act('settings', { groupCount: Number(val) })} options=${[1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: n, label: `${n} ${n === 1 ? 'Gruppe' : 'Gruppen'}` }))} /></div>
      ${num('budget', 0, 60, 'Werbebudget je Anzeige', `0 = automatisch (aktuell ${v.budget})`)}
      <h3 class="cp-sub">Erweiterungen im Ablauf</h3>
      <div class="cp-switches">${OPTIONAL.map((id) => html`<label class="form-check form-switch cp-switch">
        <input class="form-check-input" type="checkbox" role="switch" checked=${v.enabled[id]} onChange=${(e) => act('settings', { enabled: { [id]: e.target.checked } })} />
        <span>${PHASE[id].icon} ${PHASE[id].title}</span></label>`)}</div>
      <p class="muted small cp-note">Räume werden 30 Tage nach der letzten Änderung automatisch gelöscht. Es werden keine Namen gespeichert.</p>
    </aside>
  </div>`;
}

// ------------------------------------------------------------------ Ablauf (Seitenleiste)
function Sidebar({ v, act }) {
  const idx = v.phases.indexOf(v.phase);
  return html`<nav class="cp-side" aria-label="Ablauf">
    <div class="cp-side-head"><span>Ablauf</span><small>${idx + 1} / ${v.phases.length}</small></div>
    <ol class="cp-steps">${v.phases.map((id, i) => {
      const st = i < idx ? 'done' : i === idx ? 'now' : 'next';
      const p = PHASE[id];
      const pct = st === 'now' && v.progress.total ? Math.round((v.progress.done / v.progress.total) * 100) : 0;
      return html`<li key=${id}><button type="button" class=${`cp-step ${st}`} aria-current=${st === 'now' ? 'step' : undefined} onClick=${() => act('setPhase', { phase: id })}>
        <span class="cp-num">${st === 'done' ? html`<i class="bi bi-check-lg"></i>` : i + 1}</span>
        <span class="cp-step-text"><b>${p.icon} ${p.title}</b><small>${MODE[p.mode]?.[1] || ''}${p.optional ? ' · Erweiterung' : ''}</small>
          ${st === 'now' && html`<span class="cp-mini"><i style=${`width:${pct}%`}></i></span>`}</span>
      </button></li>`;
    })}</ol>
    <div class="cp-side-foot"><kbd>←</kbd> <kbd>→</kbd> Schritt wechseln</div>
  </nav>`;
}

// ------------------------------------------------------------------ Aktionen je Schritt
function PhaseActions({ v, act, sock, copy }) {
  const ph = v.phase;
  const b = (label, icon, onClick, primary, disabled) => html`<button class=${`btn ${primary ? 'btn-primary' : ''}`} disabled=${disabled} onClick=${onClick}><i class=${`bi bi-${icon}`}></i> ${label}</button>`;
  switch (ph) {
    case 'lobby': return html`${b('SchülerInnen-Link kopieren', 'link-45deg', copy)}<a class="btn" href=${beamerUrl} target="bubbl-beamer"><i class="bi bi-qr-code"></i> QR-Code auf dem Beamer</a>${b('Neueste Inhalte laden', 'box-arrow-in-down', () => sock.current?.emit('useLatestContent', {}, (r) => alert(r?.ok ? 'Neueste Inhalte aus dem Editor wurden übernommen.' : r?.error)))}`;
    case 'auswertung': return b('Entstehung erneut abspielen', 'play-circle', () => act('replayDb'), true);
    case 'werbung': return html`${b('Restliche Anzeigen automatisch schalten', 'lightning-charge', () => confirm('Nicht geschaltete Anzeigen automatisch (nach Datenbank) schalten?') && act('autoAds'))}${b('Gruppen neu bilden', 'shuffle', () => confirm('Gruppen neu bilden? Bisherige Gruppen-Eingaben gehen verloren.') && act('regroup'))}`;
    case 'werkbank': return b(v.werkbank?.test ? 'Testdaten verbergen' : 'Testdaten aufdecken', v.werkbank?.test ? 'eye-slash' : 'clipboard-data', () => act('werkbankTest', { value: !v.werkbank?.test }), !v.werkbank?.test);
    case 'fairness': return b(v.fairness?.rule ? 'Fairness-Regel ausschalten' : 'Fairness-Regel einschalten', 'shield-check', () => act('fairRule', { value: !v.fairness?.rule }), !v.fairness?.rule);
    case 'wahl': return b(v.voteRevealed ? 'Wieder verdecken' : 'Botschaften aufdecken', v.voteRevealed ? 'eye-slash' : 'search', () => act('revealVote', { value: !v.voteRevealed }), !v.voteRevealed);
    case 'quiz': {
      const q = v.quiz; if (!q) return null;
      return html`${q.idx < q.total && b(q.idx < 0 ? 'Quiz starten' : q.idx === q.total - 1 ? 'Siegerehrung' : 'Nächste Frage', q.idx === q.total - 1 ? 'flag-fill' : 'play-fill', () => act('quizNext'), true, q.open)}
        ${q.idx >= 0 && q.idx < q.total && b(`Auflösen (${q.answered}/${v.players.length})`, 'search', () => act('quizReveal'), false, !q.open)}
        <button class="btn btn-ghost" onClick=${() => confirm('Quiz zurücksetzen? Alle Antworten gehen verloren.') && act('quizReset')}><i class="bi bi-arrow-counterclockwise"></i> Zurücksetzen</button>`;
    }
    case 'reflexion': return html`<a class="btn" href=${`/api/rooms/${code}/export.csv?key=${encodeURIComponent(key)}`}><i class="bi bi-filetype-csv"></i> Ergebnisse als CSV</a>`;
    default: return null;
  }
}

function NowCard({ v, act, sock, copy }) {
  const idx = v.phases.indexOf(v.phase);
  const p = PHASE[v.phase];
  const next = v.phases[idx + 1];
  const go = (d) => { const n = v.phases[idx + d]; if (n) act('setPhase', { phase: n }); };
  const pct = v.progress.total ? Math.round((v.progress.done / v.progress.total) * 100) : 0;
  return html`<section class="card cp-now">
    <div class="cp-now-top">
      <span class="cp-now-icon">${p.icon}</span>
      <div class="cp-now-title"><small>Schritt ${idx + 1} von ${v.phases.length} · <i class=${`bi bi-${MODE[p.mode]?.[0]}`}></i> ${MODE[p.mode]?.[1]}</small><h1>${p.title}</h1></div>
      <div class="cp-now-nav">
        <button class="btn" disabled=${idx <= 0} onClick=${() => go(-1)} title="Vorheriger Schritt (←)"><i class="bi bi-arrow-left"></i></button>
        <button class="btn btn-primary cp-next" disabled=${!next} onClick=${() => go(1)} title="Nächster Schritt (→)">${next ? html`Weiter: ${PHASE[next].title} <i class="bi bi-arrow-right"></i>` : html`<i class="bi bi-flag-fill"></i> Letzter Schritt`}</button>
      </div>
    </div>
    <div class="cp-progress"><div class="cp-bar"><i style=${`width:${pct}%`}></i></div><span><b>${v.progress.done}</b> / ${v.progress.total} ${v.progress.label}</span></div>
    <div class="cp-actions"><${PhaseActions} v=${v} act=${act} sock=${sock} copy=${copy} /></div>
    <details class="cp-hint" open=${idx < 2}><summary><i class="bi bi-lightbulb"></i> Didaktischer Hinweis</summary><p>${HINTS[v.phase]}</p>
      <ul class="cp-tasks">${p.task.map((t) => html`<li>${t.replace('{maxLikes}', v.settings.maxLikes)}</li>`)}</ul></details>
    ${v.phase === 'reflexion' && v.reflexion && html`<div class="cp-notes"><h3>Notizen für den Beamer <small class="muted">(Häkchen = sichtbar)</small></h3>
      ${v.reflexion.notes.length ? v.reflexion.notes.map((n) => html`<label class=${`note-mod ${n.hidden ? 'hidden' : ''}`}>
        <input class="form-check-input" type="checkbox" checked=${!n.hidden} onChange=${(e) => act('hideNote', { key: n.key, value: !e.target.checked })} />
        <span>${n.kind === 'pro' ? '👍' : '👎'} ${n.text}</span><small class="muted">#${n.id}</small></label>`) : html`<small class="muted">Noch keine Notizen.</small>`}</div>`}
  </section>`;
}

// ------------------------------------------------------------------ Teilnehmende
function Players({ v, act }) {
  const groups = v.groups || [];
  const stat = (p) => {
    switch (v.phase) {
      case 'lobby': return p.online ? 'bereit' : 'offline';
      case 'feed': return html`<span class=${p.feedDone ? 'text-success fw-semibold' : ''}>${p.likes}/${v.settings.maxLikes} Likes ${p.feedDone ? '✓' : ''}</span>`;
      case 'empfang': return `${p.rated}/${ADS.length} bewertet`;
      case 'profil': return `${p.inferDone} Rückmeldungen`;
      case 'blase': return `${p.bubbleLikes} Likes · ${Math.round((p.bubbleIndex ?? 1) * 100)} % Vielfalt`;
      case 'wahl': return p.voted ? '✓ abgestimmt' : '–';
      case 'reflexion': return p.reflected ? '✓ Stellung genommen' : '–';
      default: return `${p.likes} Likes`;
    }
  };
  const online = v.players.filter((p) => p.online).length;
  return html`<section class="card cp-card">
    <div class="cp-card-head"><h2><i class="bi bi-people"></i> Teilnehmende</h2><span class="status-pill ok"><i class="bi bi-circle-fill"></i> ${online} online</span><span class="muted small">${v.players.length} gesamt</span></div>
    ${v.players.length === 0 ? html`<div class="cp-empty"><i class="bi bi-qr-code-scan"></i><p>Noch niemand da. Die SchülerInnen scannen den QR-Code auf dem Beamer oder öffnen <b>${location.host}</b> mit dem Code <b>${v.code}</b>.</p></div>` : html`
    <div class="table-responsive"><table class="table table-hover align-middle cp-table">
      <thead><tr><th>ID</th>${groups.length > 0 && html`<th>Gruppe</th>`}<th>Status</th><th title="Hauptinteresse laut Likes → laut Tracking">Interesse</th><th class="text-end" title="gesammelte Datenpunkte">Daten</th><th></th></tr></thead>
      <tbody>${v.players.map((p) => html`<tr key=${p.id}>
        <td><div class="cp-who"><${Avatar} id=${p.id} avatar=${p.avatar} size=${32} online=${p.online} />${p.email && html`<small class="muted" title=${p.email}>${p.email.replace(/@.*/, '')}</small>`}</div></td>
        ${groups.length > 0 && html`<td class="cp-group"><${SelectMenu} size="sm" value=${p.group || ''} ariaLabel=${`Gruppe von ID ${p.id}`} onChange=${(g) => act('setGroup', { id: p.id, group: g })} options=${groups.map((g) => ({ value: g.id, label: g.id, hint: g.cats.map((c) => CAT[c].name).join(', ') }))} /></td>`}
        <td class="small">${stat(p)}</td>
        <td class="small">${p.topLikes ? CAT[p.topLikes].icon : '·'} → ${p.topFull ? CAT[p.topFull].icon : '·'} ${p.topHidden && p.topHidden !== p.topLikes ? html`<span class="status-pill warn" title="Tracking zeigt anderes Interesse">🕵️ ${CAT[p.topHidden].icon}</span>` : ''}</td>
        <td class="small num text-end">${p.dataPoints ?? '–'}</td>
        <td class="text-end"><${Dropdown} btnClass="icon-btn" icon="three-dots-vertical" caret=${false} title=${`Aktionen für ID ${p.id}`} items=${[
          { header: `ID ${p.id}${p.email ? ` · ${p.email}` : ''} · ${p.online ? 'online' : 'offline'}` },
          ...(groups.length ? [{ header: 'In Gruppe verschieben' }, ...groups.map((g) => ({ label: `Gruppe ${g.id}`, icon: 'arrow-right-circle', hint: g.cats.map((c) => CAT[c].name).join(', '), active: p.group === g.id, onClick: () => act('setGroup', { id: p.id, group: g.id }) })), { divider: true }] : []),
          { label: 'Aus dem Raum entfernen', icon: 'person-x', danger: true, onClick: () => confirm(`ID ${p.id} entfernen?`) && act('kick', { id: p.id }) },
        ]} /></td>
      </tr>`)}</tbody>
    </table></div>`}
    ${groups.length > 0 && html`<div class="cp-groups">${groups.map((g) => html`<span class="cp-gitem"><${GroupBadge} gid=${g.id} /> ${g.cats.map((c) => CAT[c].icon).join(' ')} <small class="muted">${g.members.length}</small></span>`)}</div>`}
  </section>`;
}

function Preview() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => el.style.setProperty('--scale', el.clientWidth / 1600));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  return html`<section class="card cp-card cp-preview">
    <div class="cp-card-head"><h2><i class="bi bi-display"></i> Beamer</h2><a class="btn btn-sm" href=${beamerUrl} target="bubbl-beamer"><i class="bi bi-box-arrow-up-right"></i> In eigenem Fenster</a></div>
    <div class="preview-frame" ref=${ref}><iframe src=${beamerUrl} title="Beamer-Vorschau" tabindex="-1"></iframe></div>
  </section>`;
}

function App() {
  const { state: v, status, error, act, sock } = useRoom(() => ({ code, role: 'teacher', key }));
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState(false);
  useEffect(() => {
    if (v && key) {
      const rooms = store.get('bubbl:rooms', []);
      if (!rooms.find((r) => r.code === code)) store.set('bubbl:rooms', [{ code, key, at: Date.now() }, ...rooms].slice(0, 12));
    }
  }, [!!v]);
  // Pfeiltasten wechseln den Schritt (nicht beim Tippen oder in offenen Menüs)
  const vRef = useRef(v); vRef.current = v;
  useEffect(() => {
    const k = (e) => {
      const cur = vRef.current; if (!cur || e.altKey || e.ctrlKey || e.metaKey) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.querySelector('.bb-menu, .cp-drawer')) return;
      const i = cur.phases.indexOf(cur.phase);
      const n = e.key === 'ArrowRight' ? cur.phases[i + 1] : e.key === 'ArrowLeft' ? cur.phases[i - 1] : null;
      if (n) { e.preventDefault(); act('setPhase', { phase: n }); }
    };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, []);

  if (!code || !key) return html`<${Aurora} /><main class="t-error card pad">Link unvollständig. Bitte den Lehrkraft-Link (mit #Schlüssel) verwenden.</main>`;
  if (status === 'auth') return html`<${Aurora} /><${LoginScreen} title=${`Raum ${code} · Lehrkraft`} />`;
  if (status === 'error') return html`<${Aurora} /><main class="t-error card pad"><p>${error}</p><a class="btn" href="/">Zur Startseite</a></main>`;
  if (!v) return html`<${Aurora} /><main class="t-error"><${Logo} size=${40} /></main>`;

  const idx = v.phases.indexOf(v.phase);
  const deleteRoom = () => { if (confirm('Raum endgültig löschen? Alle Daten gehen verloren.')) { sock.current?.emit('deleteRoom', { key }); store.set('bubbl:rooms', store.get('bubbl:rooms', []).filter((r) => r.code !== code)); setTimeout(() => location.replace('/'), 300); } };
  const copy = async () => { try { await navigator.clipboard.writeText(joinUrl); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { prompt('Link kopieren:', joinUrl); } };
  const online = v.players.filter((p) => p.online).length;

  return html`
    ${status === 'offline' && html`<div class="offline-banner">Verbindung unterbrochen – verbinde neu …</div>`}
    <header class="cp-top">
      <${Logo} size=${26} sub="Cockpit" />
      <button class="cp-code" onClick=${copy} title="SchülerInnen-Link kopieren"><small>Raum</small><b>${v.code}</b><i class=${`bi bi-${copied ? 'check2' : 'copy'}`}></i></button>
      <span class="cp-online"><i class="bi bi-circle-fill"></i> ${online} online</span>
      ${copied && html`<span class="status-pill ok">Link kopiert</span>`}
      <span class="spacer"></span>
      <button class="btn btn-sm btn-ghost" onClick=${() => setSettings(true)}><i class="bi bi-gear"></i> <span class="cp-hide-sm">Einstellungen</span></button>
      <${Dropdown} btnClass="btn btn-sm btn-ghost" icon="door-open" label="Raum" items=${[
        { header: `Raum ${v.code} · ${v.players.length} Teilnehmende` },
        { label: 'SchülerInnen-Link kopieren', icon: 'link-45deg', hint: joinUrl.replace(/^https?:\/\//, ''), onClick: copy },
        { label: 'Beitrittsseite öffnen', icon: 'qr-code', hint: 'Zum Testen als SchülerIn', href: joinUrl, target: '_blank' },
        { label: 'Daten als CSV exportieren', icon: 'filetype-csv', href: `/api/rooms/${code}/export.csv?key=${encodeURIComponent(key)}` },
        { divider: true },
        { label: 'Neueste Inhalte übernehmen', icon: 'box-arrow-in-down', hint: 'Nur vor Spielbeginn', disabled: v.phase !== 'lobby', onClick: () => sock.current?.emit('useLatestContent', {}, (r) => alert(r?.ok ? 'Neueste Inhalte aus dem Editor wurden übernommen.' : r?.error)) },
        { label: 'Neue Runde starten', icon: 'arrow-counterclockwise', hint: 'Spieldaten löschen, Teilnehmende bleiben', onClick: () => confirm('Alle Spieldaten (Likes, Gruppen, Bewertungen …) löschen und zur Lobby zurückkehren? Die Teilnehmenden bleiben im Raum.') && act('resetPlayerData') },
        { label: 'Raum löschen', icon: 'trash', danger: true, onClick: deleteRoom },
      ]} />
      <a class="btn btn-sm btn-primary" href=${beamerUrl} target="bubbl-beamer"><i class="bi bi-display"></i> <span class="cp-hide-sm">Beamer öffnen</span></a>
      <${Dropdown} btnClass="btn btn-sm btn-ghost" icon="person-circle" items=${[
        { header: 'Lehrkraft' },
        { label: 'Inhalts-Editor & KI', icon: 'pencil-square', href: '/editor', target: 'bubbl-editor' },
        { label: 'Startseite / meine Räume', icon: 'house', href: '/' },
        { divider: true },
        { label: 'Abmelden', icon: 'box-arrow-right', onClick: async () => { await teacherLogout(); location.replace('/'); } },
      ]} title="Lehrkraft-Menü" />
    </header>
    <div class="cp-layout">
      <${Sidebar} v=${v} act=${act} />
      <main class="cp-main">
        <div class="cp-mobile-steps"><${SelectMenu} value=${v.phase} ariaLabel="Schritt wählen" onChange=${(ph) => act('setPhase', { phase: ph })} options=${v.phases.map((id, i) => ({ value: id, label: `${i + 1}. ${PHASE[id].title}`, emoji: i < idx ? '✅' : PHASE[id].icon }))} /></div>
        <${NowCard} v=${v} act=${act} sock=${sock} copy=${copy} />
        <div class="cp-grid">
          <${Players} v=${v} act=${act} />
          <${Preview} />
        </div>
      </main>
    </div>
    ${settings && html`<${SettingsDrawer} v=${v} act=${act} onClose=${() => setSettings(false)} />`}`;
}

render(html`<${App} />`, document.getElementById('app'));
