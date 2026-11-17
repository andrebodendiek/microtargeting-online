import {
  html, render, useState, useEffect, useRef, useRoom, LoginScreen, teacherLogout, store, qs, Logo, Aurora, Avatar, CatChip, GroupBadge, Stepper, Progress,
  CATEGORIES, CAT, PHASE,
} from './lib.js';

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
  reflexion: 'Originale Reflexionsfragen aus dem Material. Notizen erscheinen anonym auf dem Beamer und können hier ausgeblendet werden. Am Ende: CSV exportieren.',
};

function Settings({ v, act }) {
  const s = v.settings;
  const num = (k, min, max, label, hint) => html`<label class="set"><span>${label}<small class="muted">${hint}</small></span>
    <input class="field" type="number" min=${min} max=${max} value=${s[k]} onChange=${(e) => act('settings', { [k]: Number(e.target.value) })} /></label>`;
  return html`<div class="card pad col">
    <h3>⚙️ Einstellungen</h3>
    ${num('maxLikes', 1, 22, 'Likes pro Person', 'Original: 10')}
    ${num('groupCount', 1, 7, 'Anzahl Gruppen', 'max. 7 (eine je Kategorie)')}
    ${num('budget', 0, 60, 'Werbebudget je Anzeige', `0 = automatisch (aktuell ${v.budget})`)}
    <div class="set"><span>Erweiterungen</span>
      <div class="row gap wrap">${['blase', 'wahl'].map((id) => html`<label class="toggle"><input type="checkbox" checked=${v.enabled[id]} onChange=${(e) => act('settings', { enabled: { [id]: e.target.checked } })} /> ${PHASE[id].icon} ${PHASE[id].title}</label>`)}</div>
    </div>
  </div>`;
}

function Tools({ v, act }) {
  const ph = v.phase;
  return html`<div class="card pad col tools">
    <h3>🧰 Werkzeuge für „${PHASE[ph].title}“</h3>
    <p class="hint">${HINTS[ph]}</p>
    <div class="row gap wrap">
      ${['auswertung', 'werbung'].includes(ph) && html`<button class="btn small" onClick=${() => confirm('Gruppen neu bilden? Bisherige Gruppen-Eingaben gehen verloren.') && act('regroup')}>🔀 Gruppen neu bilden</button>`}
      ${ph === 'auswertung' && html`<button class="btn small" onClick=${() => confirm('Alle Tabellen mit den echten Like-Zahlen ausfüllen und abgeben?') && act('autoTally')}>⚡ Auswertung automatisch ausfüllen</button>`}
      ${ph === 'werbung' && html`<button class="btn small" onClick=${() => confirm('Nicht geschaltete Anzeigen automatisch (nach Datenbank) schalten?') && act('autoAds')}>⚡ Restliche Anzeigen automatisch schalten</button>`}
      ${ph === 'wahl' && html`<button class=${`btn ${v.voteRevealed ? '' : 'primary'}`} onClick=${() => act('revealVote', { value: !v.voteRevealed })}>${v.voteRevealed ? '🙈 Wieder verdecken' : '🔍 Botschaften aufdecken'}</button>`}
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
      case 'empfang': return `${p.rated}/7 bewertet`;
      case 'profil': return `${p.inferDone} Rückm.`;
      case 'blase': return `${p.bubbleLikes} Likes · ${Math.round((p.bubbleIndex ?? 1) * 100)} % Vielfalt`;
      case 'wahl': return p.voted ? '✓ abgestimmt' : '–';
      case 'reflexion': return p.reflected ? '✓' : '–';
      default: return `${p.likes} Likes`;
    }
  };
  return html`<div class="card pad col">
    <div class="row between"><h3>👥 Teilnehmende (${v.players.length})</h3><span class="muted small">${v.players.filter((p) => p.online).length} online</span></div>
    <div class="ptable">
      <div class="prow head"><span>ID</span><span>Gruppe</span><span>Status</span><span title="Hauptinteresse laut Likes → laut Tracking">Interesse (Likes → Tracking)</span><span title="gesammelte Datenpunkte">Daten</span><span></span></div>
      ${v.players.map((p) => html`<div class="prow">
        <span class="row gap"><${Avatar} id=${p.id} avatar=${p.avatar} size=${34} online=${p.online} /></span>
        <span>${groups.length ? html`<select class="field mini" value=${p.group || ''} onChange=${(e) => act('setGroup', { id: p.id, group: e.target.value })}>${groups.map((g) => html`<option value=${g.id}>${g.id}</option>`)}</select>` : html`<span class="muted">–</span>`}</span>
        <span class="small">${stat(p)}</span>
        <span class="small">${p.topLikes ? CAT[p.topLikes].icon : '·'} → ${p.topFull ? CAT[p.topFull].icon : '·'} ${p.topHidden && p.topHidden !== p.topLikes ? html`<span class="status-pill warn" title="Tracking zeigt anderes Interesse">🕵️ ${CAT[p.topHidden].icon}</span>` : ''}</span>
        <span class="small num">${p.dataPoints ?? '–'}</span>
        <button class="icon-btn" title="Entfernen" onClick=${() => confirm(`ID ${p.id} entfernen?`) && act('kick', { id: p.id })}>✕</button>
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
    <div class="row between pad-s"><b>📺 Beamer-Vorschau</b><a class="btn small" href=${beamerUrl} target="bubbl-beamer">Im eigenen Fenster öffnen ↗</a></div>
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
  const copy = async () => { try { await navigator.clipboard.writeText(joinUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { prompt('Link kopieren:', joinUrl); } };

  return html`<${Aurora} />
    ${status === 'offline' && html`<div class="offline-banner">Verbindung unterbrochen – verbinde neu …</div>`}
    <header class="t-top glass">
      <${Logo} size=${28} sub="Lehrkraft" />
      <div class="t-code"><small>Raumcode</small><b>${v.code}</b></div>
      <span class="spacer"></span>
      <button class="btn small" onClick=${copy}>${copied ? '✓ Kopiert' : '🔗 SuS-Link kopieren'}</button>
      <a class="btn small primary" href=${beamerUrl} target="bubbl-beamer">📺 Beamer öffnen</a>
      <a class="btn small" href=${`/api/rooms/${code}/export.csv?key=${encodeURIComponent(key)}`}>⬇︎ CSV</a>
      <button class="btn small ghost" title="Abmelden" onClick=${async () => { await teacherLogout(); location.replace('/'); }}>⎋ Abmelden</button>
    </header>
    <main class="t-main">
      <section class="card pad col phase-ctl">
        <div class="row between wrap gap">
          <div><small class="muted">Aktueller Schritt ${idx + 1} von ${v.phases.length}</small><h2>${PHASE[v.phase].icon} ${PHASE[v.phase].title}</h2></div>
          <div class="row gap">
            <button class="btn" disabled=${idx <= 0} onClick=${() => go(-1)}>◀ Zurück</button>
            <button class="btn primary big-next" disabled=${idx >= v.phases.length - 1} onClick=${() => go(1)}>${v.phases[idx + 1] ? `Weiter: ${PHASE[v.phases[idx + 1]].title} ▶` : '🏁 Letzter Schritt'}</button>
          </div>
        </div>
        <${Stepper} phases=${v.phases} phase=${v.phase} progress=${v.progress} onPick=${(p) => act('setPhase', { phase: p })} />
        <${Progress} big done=${v.progress.done} total=${v.progress.total} label=${v.progress.label} />
      </section>
      <div class="t-grid">
        <div class="col">
          <${Tools} v=${v} act=${act} />
          <${Players} v=${v} act=${act} />
        </div>
        <div class="col">
          <${Preview} />
          <${Settings} v=${v} act=${act} />
          <div class="card pad col danger-zone">
            <h3>⚠️ Raum verwalten</h3>
            <div class="row gap wrap">
              <button class="btn small" onClick=${() => confirm('Alle Spieldaten (Likes, Gruppen, Bewertungen …) löschen und zur Lobby zurückkehren? Die Teilnehmenden bleiben im Raum.') && act('resetPlayerData')}>↺ Neue Runde (Daten zurücksetzen)</button>
              <button class="btn small danger" onClick=${() => { if (confirm('Raum endgültig löschen? Alle Daten gehen verloren.')) { sock.current?.emit('deleteRoom', { key }); store.set('bubbl:rooms', store.get('bubbl:rooms', []).filter((r) => r.code !== code)); setTimeout(() => location.replace('/'), 300); } }}>🗑 Raum löschen</button>
            </div>
            <small class="muted">Räume werden 30 Tage nach der letzten Änderung automatisch gelöscht. Es werden keine Namen gespeichert.</small>
          </div>
        </div>
      </div>
    </main>`;
}

render(html`<${App} />`, document.getElementById('app'));
