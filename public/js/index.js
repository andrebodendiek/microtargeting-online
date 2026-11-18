import { html, render, useState, useEffect, Dropdown, Logo, Aurora, store, qs, TeacherLogin, teacherStatus, teacherLogout } from './lib.js';

const preset = (qs.get('c') || qs.get('code') || '').toUpperCase();
if (preset) location.replace(`/play?c=${encodeURIComponent(preset)}`);

function App() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const rooms = store.get('bubbl:rooms', []);
  const [me, setMe] = useState(null);
  const refreshMe = () => teacherStatus().then(setMe);
  useEffect(() => { refreshMe(); }, []);

  async function join(e) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c.length < 4) return setErr('Der Raumcode hat 4 Zeichen.');
    const r = await fetch(`/api/rooms/${c}`);
    if (!r.ok) return setErr('Diesen Raum gibt es nicht. Code prüfen!');
    location.href = `/play?c=${c}`;
  }
  async function create() {
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/rooms', { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Fehler');
      store.set('bubbl:rooms', [{ code: d.code, key: d.key, at: Date.now() }, ...rooms].slice(0, 12));
      location.href = `/teacher?c=${d.code}#${d.key}`;
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  return html`
    <${Aurora} />
    <main class="landing">
      <header class="hero stagger">
        <${Logo} size=${54} />
        <h1>Das Microtargeting-Labor</h1>
        <p class="muted">Wie entsteht personalisierte Werbung? Ein Live-Spiel für die ganze Klasse: Likes verteilen, Daten auswerten, Werbung platzieren – und am Ende sehen, was ein soziales Netzwerk wirklich über euch weiß.</p>
        <a class="btn intro-link" href="/intro"><i class="bi bi-play-circle-fill"></i> Intro-Film ansehen (1:16)</a>
      </header>
      <section class="landing-grid stagger">
        <form class="glass panel" onSubmit=${join}>
          <span class="kicker">Für SchülerInnen</span>
          <h2>Raum beitreten</h2>
          <input class="form-control code-input" maxlength="4" autocomplete="off" autocapitalize="characters" placeholder="CODE"
            value=${code} onInput=${(e) => { setCode(e.target.value.toUpperCase()); setErr(''); }} aria-label="Raumcode" />
          <button class="btn btn-primary w-100">Los geht's</button>
        </form>
        <div class="glass panel">
          <span class="kicker">Für Lehrkräfte</span>
          <h2>Neues Spiel starten</h2>
          <a class="small" href="/ablauf"><i class="bi bi-signpost-split"></i> Musterablauf & Demo-Video ansehen</a>
          <p class="muted small">Erstellt einen Raum mit Code, QR-Code und Beamer-Ansicht. Die SchülerInnen melden sich mit ausgedachten Adressen an – ohne echte Namen.</p>
          ${me == null ? html`<small class="muted">…</small>` : !me.teacher ? html`<${TeacherLogin} configured=${me.configured} onSuccess=${refreshMe} />` : html`
            <button class="btn btn-primary w-100" disabled=${busy} onClick=${create}>${busy ? 'Erstelle …' : 'Raum erstellen'}</button>
            ${rooms.length > 0 && html`<div class="my-rooms">
              <small class="muted">Deine letzten Räume</small>
              ${rooms.map((r) => html`<a class="room-link" href=${`/teacher?c=${r.code}#${r.key}`}><b>${r.code}</b><span>${new Date(r.at).toLocaleDateString('de-DE')}</span></a>`)}
            </div>`}
            <div class="row-btns"><${Dropdown} btnClass="btn btn-sm" icon="person-circle" label="Angemeldet als Lehrkraft" align="start" items=${[
              { label: 'Musterablauf & Demo-Video', icon: 'signpost-split', hint: 'So läuft eine Stunde ab', href: '/ablauf' },
              { label: 'Inhalts-Editor & KI', icon: 'pencil-square', hint: 'Beiträge, Anzeigen, Quiz aktualisieren', href: '/editor' },
              ...(rooms.length ? [{ divider: true }, { header: 'Letzte Räume' }, ...rooms.slice(0, 6).map((r) => ({ label: r.code, icon: 'door-open', hint: new Date(r.at).toLocaleDateString('de-DE'), href: `/teacher?c=${r.code}#${r.key}` }))] : []),
              { divider: true },
              { label: 'Abmelden', icon: 'box-arrow-right', onClick: async () => { await teacherLogout(); refreshMe(); } },
            ]} /></div>`}
        </div>
      </section>
      ${err && html`<p class="error">${err}</p>`}
      <section class="how stagger">
        ${[['heart', 'Liken', 'Alle scrollen durch den bubbl-Feed und verteilen Likes.'], ['database', 'Auswerten', 'Gruppen erstellen gemeinsam eine Interessen-Datenbank.'], ['bullseye', 'Targeten', 'Gruppen platzieren Werbung – gegen einen Algorithmus.'], ['incognito', 'Enthüllen', 'Tracking, Profile, Filterblase und Wahlwerbung werden sichtbar.']].map(([i, t, d]) => html`
          <div class="how-item"><i class=${`bi bi-${i}`}></i><b>${t}</b><small class="muted">${d}</small></div>`)}
      </section>
      <footer class="muted foot">Nach einer Unterrichtsidee von Anna Rebmann (WBM Informatik, Kohorte III) · digital erweitert · <a href="/bildnachweise">Bildnachweise</a></footer>
    </main>`;
}
render(html`<${App} />`, document.getElementById('app'));
