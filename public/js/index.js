import { html, render, useState, useEffect, Logo, Aurora, store, qs, TeacherLogin, teacherStatus, teacherLogout } from './lib.js';

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
        <h1>Das <span class="grad">Microtargeting</span>-Labor</h1>
        <p class="muted">Wie entsteht personalisierte Werbung? Ein Live-Spiel für die ganze Klasse: Likes verteilen, Daten auswerten, Werbung platzieren – und am Ende sehen, was ein soziales Netzwerk wirklich über euch weiß.</p>
      </header>
      <section class="landing-grid stagger">
        <form class="glass panel" onSubmit=${join}>
          <span class="kicker">Für SchülerInnen</span>
          <h2>Raum beitreten</h2>
          <input class="form-control code-input" maxlength="4" autocomplete="off" autocapitalize="characters" placeholder="CODE"
            value=${code} onInput=${(e) => { setCode(e.target.value.toUpperCase()); setErr(''); }} aria-label="Raumcode" />
          <button class="btn btn-primary w-100">Los geht's →</button>
        </form>
        <div class="glass panel">
          <span class="kicker">Für Lehrkräfte</span>
          <h2>Neues Spiel starten</h2>
          <p class="muted small">Erstellt einen Raum mit Code, QR-Code und Beamer-Ansicht. Die SchülerInnen brauchen keine Anmeldung und keine echten Namen.</p>
          ${me == null ? html`<small class="muted">…</small>` : !me.teacher ? html`<${TeacherLogin} configured=${me.configured} onSuccess=${refreshMe} />` : html`
            <button class="btn btn-primary w-100" disabled=${busy} onClick=${create}>${busy ? 'Erstelle …' : '+ Raum erstellen'}</button>
            ${rooms.length > 0 && html`<div class="my-rooms">
              <small class="muted">Deine letzten Räume</small>
              ${rooms.map((r) => html`<a class="room-link" href=${`/teacher?c=${r.code}#${r.key}`}><b>${r.code}</b><span>${new Date(r.at).toLocaleDateString('de-DE')}</span></a>`)}
            </div>`}
            <div class="row-btns"><a class="btn btn-sm" href="/editor"><i class="bi bi-pencil-square"></i> Inhalts-Editor & KI</a><button class="btn btn-sm btn-ghost" onClick=${async () => { await teacherLogout(); refreshMe(); }}><i class="bi bi-box-arrow-right"></i> Abmelden</button></div>`}
        </div>
      </section>
      ${err && html`<p class="error">${err}</p>`}
      <section class="how glass stagger">
        ${[['❤️', 'Liken', 'Alle scrollen durch den bubbl-Feed und verteilen Likes.'], ['📊', 'Auswerten', 'Gruppen erstellen gemeinsam eine Interessen-Datenbank.'], ['🎯', 'Targeten', 'Gruppen platzieren Werbung – gegen einen Algorithmus.'], ['🕵️', 'Enthüllen', 'Tracking, Profile, Filterblase und Wahlwerbung werden sichtbar.']].map(([i, t, d]) => html`
          <div class="how-item"><span>${i}</span><b>${t}</b><small class="muted">${d}</small></div>`)}
      </section>
      <footer class="muted foot">Nach einer Unterrichtsidee von Anna Rebmann (WBM Informatik, Kohorte III) · digital erweitert</footer>
    </main>`;
}
render(html`<${App} />`, document.getElementById('app'));
