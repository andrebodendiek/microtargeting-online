// Musterablauf für Lehrkräfte: Unterrichtsverlauf aus Sicht von Lehrkraft, SchülerInnen und Beamer (druckbar)
import { html, render, useState, Logo, Ic, PHASE } from './lib.js';
import { PAUSES } from '/shared/content.js';
import { ABLAUF, KURZ } from './ablauf-data.js';
import { GUIDE } from './guide.js';

const Img = ({ id, kind }) => html`<img class=${`ab-shot ${kind}`} src=${`/img/ablauf/${id}-${kind}.webp`} alt=${`${kind === 'phone' ? 'Handy-Ansicht' : 'Beamer-Ansicht'}: ${PHASE[id]?.title}`} loading="lazy" onError=${(e) => { e.target.style.display = 'none'; }} />`;

function App() {
  const [kurz, setKurz] = useState(false);
  const steps = ABLAUF.filter((s) => !kurz || KURZ.includes(s.id));
  const total = steps.reduce((a, s) => a + s.min, 0);
  let clock = 0;
  return html`<main class="ab">
    <header class="ab-head">
      <a href="/" class="ab-logo"><${Logo} size=${30} sub="Musterablauf" /></a>
      <div class="ab-actions no-print">
        <div class="ab-switch" role="group" aria-label="Variante">
          <button class=${!kurz ? 'on' : ''} onClick=${() => setKurz(false)}>Doppelstunde</button>
          <button class=${kurz ? 'on' : ''} onClick=${() => setKurz(true)}>Kurzvariante</button>
        </div>
        <button class="btn btn-sm" onClick=${() => print()}><i class="bi bi-printer"></i> Drucken</button>
      </div>
    </header>

    <section class="ab-intro">
      <h1>So läuft eine bubbl-Stunde ab</h1>
      <p class="muted">Pseudo-Ablauf aus Sicht der Lehrkraft und der SchülerInnen – mit den Knöpfen im Cockpit, dem, was auf den Handys passiert, und dem Beamer-Bild. ${kurz ? 'Kurzvariante: nur die Pflichtschritte (optionale Schritte im Cockpit unter „Einstellungen“ abschalten).' : 'Doppelstunde mit allen Erweiterungen.'}</p>
      <div class="ab-meta"><span><i class="bi bi-clock"></i> ca. ${total} Min.</span><span><i class="bi bi-list-ol"></i> ${steps.length} Schritte</span><span><i class="bi bi-phone"></i> ein Gerät pro Person</span><span><i class="bi bi-projector"></i> Beamer</span></div>
      <video class="ab-video no-print" src="/video/bubbl-ablauf.mp4" controls preload="metadata" poster="/img/ablauf/poster.webp"></video>
      <p class="muted small no-print">Demo-Video: echter, automatisch durchgespielter Ablauf mit Test-Schülern (links Beamer, rechts ein Schüler-Handy).</p>
    </section>

    <section class="ab-prep">
      <h2><i class="bi bi-check2-square"></i> Vorbereitung</h2>
      <ul>
        <li>Startseite öffnen, mit dem Lehrkraft-Passwort anmelden, „Raum erstellen“ – es öffnet sich das Cockpit.</li>
        <li>Unter „Einstellungen“ optionale Schritte an- oder abschalten (Werkbank, Fairness, Filterblase, Shorts, Wahlwerbung, Quiz).</li>
        <li>„Beamer öffnen“ und auf den Projektor ziehen (Doppelklick = Vollbild). WLAN für alle Geräte sicherstellen.</li>
        <li>In jedem Schritt: Hinweise zur Durchführung und Innehalten-Fragen direkt im Cockpit.</li>
      </ul>
    </section>

    <ol class="ab-steps">${steps.map((s, i) => {
      const from = clock; clock += s.min;
      const pz = s.innehalten != null ? PAUSES[s.id]?.[s.innehalten] : null;
      const g = GUIDE[s.id];
      return html`<li class="ab-step">
        <div class="ab-step-head">
          <span class="ab-num">${i + 1}</span>
          <div><small class="muted">${from}.–${clock}. Min. · ${g?.sozial || ''}${s.optional ? ' · optional' : ''}</small><h2><${Ic} k=${PHASE[s.id]} color=${false} /> ${s.title}</h2></div>
        </div>
        <div class="ab-grid">
          <div class="ab-col teacher"><h3><i class="bi bi-person-video3"></i> Lehrkraft</h3><p>${s.lehrkraft}</p>
            ${s.knopf.length > 0 && html`<div class="ab-btns">${s.knopf.map((k) => html`<span class="ab-btn">${k}</span>`)}</div>`}</div>
          <div class="ab-col students"><h3><i class="bi bi-phone"></i> SchülerInnen</h3><p>${s.sus}</p></div>
          <div class="ab-col beamer"><h3><i class="bi bi-projector"></i> Beamer</h3><p>${s.beamer}</p></div>
        </div>
        ${pz && html`<p class="ab-pause"><i class="bi bi-pause-circle"></i> <b>Innehalten:</b> „${pz.q}“</p>`}
        <div class="ab-shots"><${Img} id=${s.id} kind="beamer" /><${Img} id=${s.id} kind="phone" /></div>
      </li>`;
    })}</ol>
    <footer class="muted small ab-foot">bubbl – das Microtargeting-Labor · nach einer Unterrichtsidee von Anna Rebmann (WBM Informatik, Kohorte III)</footer>
  </main>`;
}
render(html`<${App} />`, document.getElementById('app'));
