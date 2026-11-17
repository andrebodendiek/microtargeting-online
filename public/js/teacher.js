import {
  html, render, useState, useEffect, useRef, useRoom, Dropdown, SelectMenu, LoginScreen, teacherLogout, store, qs, Logo, Aurora, Avatar, CatChip, GroupBadge, Stepper, Progress,
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
  auswertung: 'Entspricht der Office-Tabelle aus dem Original: Jede Gruppe zählt die Likes ihrer Kategorie aus. Fehler werden auf dem Beamer nach Abgabe rot gestrichelt markiert – guter Gesprächsanlass. Zeitnot? „Automatisch ausfüllen“.',
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

function Settings({ v, act }) {
  const s = v.settings;
  const num = (k, min, max, label, hint) => html`<label class="set"><span>${label}<small class="muted">${hint}</small></span>
    <input class="form-control" type="number" min=${min} max=${max} value=${s[k]} onChange=${(e) => act('settings', { [k]: Number(e.target.value) })} /></label>`;
  return html`<div class="card pad bb-col">
    <h3><i class="bi bi-gear"></i> Einstellungen</h3>
    ${num('maxLikes', 1, 22, 'Likes pro Person', 'Original: 10')}
    <div class="set"><span>Anzahl Gruppen<small class="muted">max. 7 (eine je Kategorie)</small></span>
      <${SelectMenu} value=${s.groupCount} ariaLabel="Anzahl Gruppen" onChange=${(val) => act('settings', { groupCount: Number(val) })} options=${[1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: n, label: `${n} ${n === 1 ? 'Gruppe' : 'Gruppen'}`, icon: 'people' }))} />
    </div>
    ${num('budget', 0, 60, 'Werbebudget je Anzeige', `0 = automatisch (aktuell ${v.budget})`)}
    <div class="set"><span>Erweiterungen</span>
      <div class="bb-row gap wrap">${OPTIONAL.map((id) => html`<label class="toggle"><input type="checkbox" checked=${v.enabled[id]} onChange=${(e) => act('settings', { enabled: { [id]: e.target.checked } })} /> ${PHASE[id].icon} ${PHASE[id].title}</label>`)}</div>
    </div>
  </div>`;
}

function Tools({ v, act, sock }) {
  const ph = v.phase;
  return html`<div class="card pad bb-col tools">
    <h3><i class="bi bi-tools"></i> Werkzeuge für „${PHASE[ph].title}“</h3>
    <p class="hint">${HINTS[ph]}</p>
    <div class="bb-row gap wrap">
      ${['auswertung', 'werbung'].includes(ph) && html`<button class="btn btn-sm" onClick=${() => confirm('Gruppen neu bilden? Bisherige Gruppen-Eingaben gehen verloren.') && act('regroup')}><i class="bi bi-shuffle"></i> Gruppen neu bilden</button>`}
      ${ph === 'auswertung' && html`<button class="btn btn-sm" onClick=${() => confirm('Alle Tabellen mit den echten Like-Zahlen ausfüllen und abgeben?') && act('autoTally')}>⚡ Auswertung automatisch ausfüllen</button>`}
      ${ph === 'werbung' && html`<button class="btn btn-sm" onClick=${() => confirm('Nicht geschaltete Anzeigen automatisch (nach Datenbank) schalten?') && act('autoAds')}>⚡ Restliche Anzeigen automatisch schalten</button>`}
      ${ph === 'lobby' && html`<button class="btn btn-sm" onClick=${() => sock.current?.emit('useLatestContent', {}, (r) => alert(r?.ok ? 'Neueste Inhalte aus dem Editor wurden übernommen.' : r?.error))}><i class="bi bi-box-arrow-in-down"></i> Neueste Inhalte aus dem Editor übernehmen</button><a class="btn btn-sm" href="/editor" target="bubbl-editor"><i class="bi bi-pencil-square"></i> Inhalts-Editor</a>`}
      ${ph === 'werkbank' && html`<button class=${`btn ${v.werkbank?.test ? '' : 'btn-primary'}`} onClick=${() => act('werkbankTest', { value: !v.werkbank?.test })}>${v.werkbank?.test ? html`<i class="bi bi-eye-slash"></i> Testdaten verbergen` : html`<i class="bi bi-clipboard-data"></i> Testdaten aufdecken`}</button>`}
      ${ph === 'fairness' && html`<button class=${`btn ${v.fairness?.rule ? '' : 'btn-primary'}`} onClick=${() => act('fairRule', { value: !v.fairness?.rule })}>${v.fairness?.rule ? html`<i class="bi bi-shield-check"></i> Fairness-Regel ausschalten` : html`<i class="bi bi-shield-check"></i> Fairness-Regel einschalten`}</button>`}
      ${ph === 'quiz' && v.quiz && html`
        ${v.quiz.idx < v.quiz.total && html`<button class="btn btn-primary" disabled=${v.quiz.open} onClick=${() => act('quizNext')}>${v.quiz.idx < 0 ? html`<i class="bi bi-play-fill"></i> Quiz starten` : v.quiz.idx === v.quiz.total - 1 ? html`<i class="bi bi-flag-fill"></i> Siegerehrung` : html`<i class="bi bi-play-fill"></i> Nächste Frage`}</button>`}
        ${v.quiz.idx >= 0 && v.quiz.idx < v.quiz.total && html`<button class="btn" disabled=${!v.quiz.open} onClick=${() => act('quizReveal')}><i class="bi bi-search"></i> Auflösen (${v.quiz.answered}/${v.players.length})</button>`}
        <button class="btn btn-sm btn-ghost" onClick=${() => confirm('Quiz zurücksetzen? Alle Antworten gehen verloren.') && act('quizReset')}><i class="bi bi-arrow-counterclockwise"></i> Zurücksetzen</button>`}
      ${ph === 'wahl' && html`<button class=${`btn ${v.voteRevealed ? '' : 'btn-primary'}`} onClick=${() => act('revealVote', { value: !v.voteRevealed })}>${v.voteRevealed ? html`<i class="bi bi-eye-slash"></i> Wieder verdecken` : html`<i class="bi bi-search"></i> Botschaften aufdecken`}</button>`}
    </div>
    ${ph === 'reflexion' && v.reflexion && html`<div class="notes-mod">${v.reflexion.notes.length ? v.reflexion.notes.map((n) => html`<label class=${`note-mod ${n.hidden ? 'hidden' : ''}`}>
      <input type="checkbox" checked=${!n.hidden} onChange=${(e) => act('hideNote', { key: n.key, value: !e.target.checked })} />
      <span>${n.kind === 'pro' ? '👍' : '👎'} ${n.text}</span><small class="muted">#${n.id}</small></label>`) : html`<small class="muted">Noch keine Notizen.</small>`}</div>`}
  </div>`;
}

function Players({ v, act }) {
  const groups = v.groups || [];
  const stat = (p) => {
    switch (v.phase) {
      case 'feed': return `${p.likes}/${v.settings.maxLikes} ${p.feedDone ? '✓' : ''}`;
      case 'empfang': return `${p.rated}/${ADS.length} bewertet`;
      case 'profil': return `${p.inferDone} Rückm.`;
      case 'blase': return `${p.bubbleLikes} Likes · ${Math.round((p.bubbleIndex ?? 1) * 100)} % Vielfalt`;
      case 'wahl': return p.voted ? '✓ abgestimmt' : '–';
      case 'reflexion': return p.reflected ? '✓' : '–';
      default: return `${p.likes} Likes`;
    }
  };
  return html`<div class="card pad bb-col">
    <div class="bb-row between"><h3><i class="bi bi-people"></i> Teilnehmende (${v.players.length})</h3><span class="muted small">${v.players.filter((p) => p.online).length} online</span></div>
    <div class="ptable">
      <div class="prow head"><span>ID</span><span>Gruppe</span><span>Status</span><span title="Hauptinteresse laut Likes → laut Tracking">Interesse (Likes → Tracking)</span><span title="gesammelte Datenpunkte">Daten</span><span></span></div>
      ${v.players.map((p) => html`<div class="prow">
        <span class="bb-row gap"><${Avatar} id=${p.id} avatar=${p.avatar} size=${34} online=${p.online} /></span>
        <span>${groups.length ? html`<${SelectMenu} size="sm" value=${p.group || ''} ariaLabel=${`Gruppe von ID ${p.id}`} onChange=${(g) => act('setGroup', { id: p.id, group: g })} options=${groups.map((g) => ({ value: g.id, label: g.id, hint: g.cats.map((c) => CAT[c].name).join(', ') }))} />` : html`<span class="muted">–</span>`}</span>
        <span class="small">${stat(p)}</span>
        <span class="small">${p.topLikes ? CAT[p.topLikes].icon : '·'} → ${p.topFull ? CAT[p.topFull].icon : '·'} ${p.topHidden && p.topHidden !== p.topLikes ? html`<span class="status-pill warn" title="Tracking zeigt anderes Interesse">🕵️ ${CAT[p.topHidden].icon}</span>` : ''}</span>
        <span class="small num">${p.dataPoints ?? '–'}</span>
        <${Dropdown} btnClass="icon-btn" icon="three-dots-vertical" caret=${false} title=${`Aktionen für ID ${p.id}`} items=${[
          { header: `ID ${p.id} ${p.avatar} · ${p.online ? 'online' : 'offline'}` },
          ...(groups.length ? [{ header: 'In Gruppe verschieben' }, ...groups.map((g) => ({ label: `Gruppe ${g.id}`, icon: 'arrow-right-circle', hint: g.cats.map((c) => CAT[c].name).join(', '), active: p.group === g.id, onClick: () => act('setGroup', { id: p.id, group: g.id }) })), { divider: true }] : []),
          { label: 'Aus dem Raum entfernen', icon: 'person-x', danger: true, onClick: () => confirm(`ID ${p.id} entfernen?`) && act('kick', { id: p.id }) },
        ]} />
      </div>`)}
    </div>
    ${groups.length > 0 && html`<div class="group-list">${groups.map((g) => html`<div class="glist-item"><${GroupBadge} gid=${g.id} />${g.cats.map((c) => html`<${CatChip} cat=${c} small />`)}<span class="muted small">${g.members.length} Pers.</span></div>`)}</div>`}
  </div>`;
}

function Preview() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => el.style.setProperty('--scale', el.clientWidth / 1600));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  return html`<div class="card preview">
    <div class="bb-row between pad-s"><b><i class="bi bi-display"></i> Beamer-Vorschau</b><a class="btn btn-sm" href=${beamerUrl} target="bubbl-beamer">Im eigenen Fenster öffnen ↗</a></div>
    <div class="preview-frame" ref=${ref}><iframe src=${beamerUrl} title="Beamer-Vorschau" tabindex="-1"></iframe></div>
  </div>`;
}

function App() {
  const { state: v, status, error, act, sock } = useRoom(() => ({ code, role: 'teacher', key }));
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (v && key) {
      const rooms = store.get('bubbl:rooms', []);
      if (!rooms.find((r) => r.code === code)) store.set('bubbl:rooms', [{ code, key, at: Date.now() }, ...rooms].slice(0, 12));
    }
  }, [!!v]);

  if (!code || !key) return html`<${Aurora} /><main class="t-error card pad">Link unvollständig. Bitte den Lehrkraft-Link (mit #Schlüssel) verwenden.</main>`;
  if (status === 'auth') return html`<${Aurora} /><${LoginScreen} title=${`Raum ${code} · Lehrkraft`} />`;
  if (status === 'error') return html`<${Aurora} /><main class="t-error card pad"><p>${error}</p><a class="btn" href="/">Zur Startseite</a></main>`;
  if (!v) return html`<${Aurora} /><main class="t-error"><${Logo} size=${40} /></main>`;

  const idx = v.phases.indexOf(v.phase);
  const go = (d) => { const n = v.phases[idx + d]; if (n) act('setPhase', { phase: n }); };
  const deleteRoom = () => { if (confirm('Raum endgültig löschen? Alle Daten gehen verloren.')) { sock.current?.emit('deleteRoom', { key }); store.set('bubbl:rooms', store.get('bubbl:rooms', []).filter((r) => r.code !== code)); setTimeout(() => location.replace('/'), 300); } };
  const copy = async () => { try { await navigator.clipboard.writeText(joinUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { prompt('Link kopieren:', joinUrl); } };

  return html`<${Aurora} />
    ${status === 'offline' && html`<div class="offline-banner">Verbindung unterbrochen – verbinde neu …</div>`}
    <header class="t-top glass">
      <${Logo} size=${28} sub="Lehrkraft" />
      <div class="t-code"><small>Raumcode</small><b>${v.code}</b></div>
      <span class="spacer"></span>
      ${copied && html`<span class="status-pill ok"><i class="bi bi-check2"></i> Link kopiert</span>`}
      <a class="btn btn-sm btn-primary" href=${beamerUrl} target="bubbl-beamer"><i class="bi bi-display"></i> Beamer öffnen</a>
      <${Dropdown} btnClass="btn btn-sm" icon="door-open" label="Raum" items=${[
        { header: `Raum ${v.code} · ${v.players.length} Teilnehmende` },
        { label: 'SchülerInnen-Link kopieren', icon: 'link-45deg', hint: joinUrl.replace(/^https?:\/\//, ''), onClick: copy },
        { label: 'Beitrittsseite öffnen', icon: 'qr-code', hint: 'Zum Testen als SchülerIn', href: joinUrl, target: '_blank' },
        { label: 'Daten als CSV exportieren', icon: 'filetype-csv', href: `/api/rooms/${code}/export.csv?key=${encodeURIComponent(key)}` },
        { divider: true },
        { label: 'Neueste Inhalte übernehmen', icon: 'box-arrow-in-down', hint: 'Nur vor Spielbeginn', disabled: v.phase !== 'lobby', onClick: () => sock.current?.emit('useLatestContent', {}, (r) => alert(r?.ok ? 'Neueste Inhalte aus dem Editor wurden übernommen.' : r?.error)) },
        { label: 'Neue Runde starten', icon: 'arrow-counterclockwise', hint: 'Spieldaten löschen, Teilnehmende bleiben', onClick: () => confirm('Alle Spieldaten (Likes, Gruppen, Bewertungen …) löschen und zur Lobby zurückkehren? Die Teilnehmenden bleiben im Raum.') && act('resetPlayerData') },
        { label: 'Raum löschen', icon: 'trash', danger: true, onClick: deleteRoom },
      ]} />
      <${Dropdown} btnClass="btn btn-sm btn-ghost" icon="person-circle" label="Lehrkraft" items=${[
        { label: 'Inhalts-Editor & KI', icon: 'pencil-square', href: '/editor', target: 'bubbl-editor' },
        { label: 'Startseite / meine Räume', icon: 'house', href: '/' },
        { divider: true },
        { label: 'Abmelden', icon: 'box-arrow-right', onClick: async () => { await teacherLogout(); location.replace('/'); } },
      ]} />
    </header>
    <main class="t-main">
      <section class="card pad bb-col phase-ctl">
        <div class="bb-row between wrap gap">
          <div><small class="muted">Aktueller Schritt ${idx + 1} von ${v.phases.length}</small><h2>${PHASE[v.phase].icon} ${PHASE[v.phase].title}</h2></div>
          <div class="bb-row gap">
            <${Dropdown} btnClass="btn" icon="list-ol" label="Springen" items=${[{ header: 'Zu Schritt springen' }, ...v.phases.map((id, i) => ({ label: `${i + 1}. ${PHASE[id].title}`, icon: i < idx ? 'check-circle' : i === idx ? 'record-circle' : 'circle', hint: PHASE[id].optional ? 'Erweiterung' : undefined, active: id === v.phase, onClick: () => act('setPhase', { phase: id }) }))]} />
            <button class="btn" disabled=${idx <= 0} onClick=${() => go(-1)}><i class="bi bi-chevron-left"></i> Zurück</button>
            <button class="btn btn-primary big-next" disabled=${idx >= v.phases.length - 1} onClick=${() => go(1)}>${v.phases[idx + 1] ? `Weiter: ${PHASE[v.phases[idx + 1]].title} ▶` : html`<i class="bi bi-flag-fill"></i> Letzter Schritt`}</button>
          </div>
        </div>
        <${Stepper} phases=${v.phases} phase=${v.phase} progress=${v.progress} onPick=${(p) => act('setPhase', { phase: p })} />
        <${Progress} big done=${v.progress.done} total=${v.progress.total} label=${v.progress.label} />
      </section>
      <div class="t-grid">
        <div class="bb-col">
          <${Tools} v=${v} act=${act} sock=${sock} />
          <${Players} v=${v} act=${act} />
        </div>
        <div class="bb-col">
          <${Preview} />
          <${Settings} v=${v} act=${act} />
          <div class="card pad bb-col danger-zone">
            <h3><i class="bi bi-exclamation-triangle"></i> Raum verwalten</h3>
            <div class="bb-row gap wrap">
              <button class="btn btn-sm" onClick=${() => confirm('Alle Spieldaten (Likes, Gruppen, Bewertungen …) löschen und zur Lobby zurückkehren? Die Teilnehmenden bleiben im Raum.') && act('resetPlayerData')}><i class="bi bi-arrow-counterclockwise"></i> Neue Runde (Daten zurücksetzen)</button>
              <button class="btn btn-sm btn-outline-danger" onClick=${deleteRoom}><i class="bi bi-trash"></i> Raum löschen</button>
            </div>
            <small class="muted">Räume werden 30 Tage nach der letzten Änderung automatisch gelöscht. Es werden keine Namen gespeichert.</small>
          </div>
        </div>
      </div>
    </main>`;
}

render(html`<${App} />`, document.getElementById('app'));
