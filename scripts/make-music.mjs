// Erzeugt eigene, lizenzfreie Hintergrundmusik (ruhiger Lo-Fi-Stil) per Klangsynthese – ohne fremde Samples.
// Aufruf: node scripts/make-music.mjs <sekunden> <ausgabe.wav> [seed]
// Danach z. B.: ffmpeg -i musik.wav -c:a aac -b:a 128k musik.m4a
import fs from 'node:fs';

const SECS = Number(process.argv[2] || 76);
const OUT = process.argv[3] || 'musik.wav';
const SEED = Number(process.argv[4] || 1);
const SR = 44100;
const N = Math.ceil(SECS * SR);
const L = new Float32Array(N), R = new Float32Array(N);

let s = SEED >>> 0 || 1;
const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

const BPM = 88;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
// Akkordfolge (warm, freundlich): Cmaj7 – Am7 – Fmaj7 – G6, MIDI-Noten
const CHORDS = [
  [48, [60, 64, 67, 71]], [45, [57, 60, 64, 67]], [41, [57, 60, 65, 69]], [43, [59, 62, 67, 69]],
];
const chordAt = (t) => CHORDS[Math.floor(t / BAR) % CHORDS.length];

function add(buf, start, data, gain = 1) { const i0 = Math.floor(start * SR); for (let i = 0; i < data.length && i0 + i < N; i++) if (i0 + i >= 0) buf[i0 + i] += data[i] * gain; }
function stereo(start, data, gain, pan = 0) { add(L, start, data, gain * (1 - Math.max(0, pan))); add(R, start, data, gain * (1 + Math.min(0, pan))); }

// Klangbausteine
function pad(freqs, dur) {
  const n = Math.floor(dur * SR); const out = new Float32Array(n);
  const att = 1.2 * SR, rel = 1.4 * SR;
  for (const f of freqs) for (const det of [-0.12, 0.11]) {
    const fr = f * 2 ** (det / 12); const ph = rnd() * 6.28;
    for (let i = 0; i < n; i++) {
      const t = i / SR; const env = Math.min(1, i / att) * Math.min(1, (n - i) / rel);
      // Sinus + leiser Oberton, sanft vibrierend
      const v = Math.sin(2 * Math.PI * fr * t + ph + 0.15 * Math.sin(2 * Math.PI * 0.3 * t)) + 0.18 * Math.sin(4 * Math.PI * fr * t + ph);
      out[i] += v * env;
    }
  }
  // einfacher Tiefpass für Wärme
  let y = 0; const a = 0.08; for (let i = 0; i < n; i++) { y += a * (out[i] - y); out[i] = y; }
  return out;
}
function pluck(f, dur = 0.9) {
  const n = Math.floor(dur * SR); const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR; const env = Math.exp(-t * 5.5) * Math.min(1, i / 60);
    out[i] = env * (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t * 9) + 0.12 * Math.sin(6 * Math.PI * f * t) * Math.exp(-t * 14));
  }
  return out;
}
function bass(f, dur) {
  const n = Math.floor(dur * SR); const out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; const env = Math.min(1, i / 300) * Math.exp(-t * 1.6) * Math.min(1, (n - i) / 2000); out[i] = env * (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t)); }
  return out;
}
function kick() {
  const n = Math.floor(0.35 * SR); const out = new Float32Array(n);
  let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; const f = 48 + 90 * Math.exp(-t * 28); ph += 2 * Math.PI * f / SR; out[i] = Math.sin(ph) * Math.exp(-t * 9); }
  return out;
}
function hat() {
  const n = Math.floor(0.06 * SR); const out = new Float32Array(n); let prev = 0;
  for (let i = 0; i < n; i++) { const w = rnd() * 2 - 1; const hp = w - prev; prev = w; out[i] = hp * Math.exp(-(i / SR) * 70); }
  return out;
}
function vinyl() { // leises Knistern für den Lo-Fi-Charakter
  for (let i = 0; i < N; i++) { const c = rnd() < 0.0006 ? (rnd() - 0.5) * 0.25 : 0; L[i] += c; R[i] += c * 0.8; }
}

// Arrangement: Intro nur Fläche, dann Arpeggio, dann leiser Beat; am Ende ausklingen
const bars = Math.ceil(SECS / BAR);
const K = kick(), H = hat();
for (let b = 0; b < bars; b++) {
  const t0 = b * BAR; const [root, notes] = CHORDS[b % CHORDS.length];
  const outro = t0 > SECS - BAR * 2;
  stereo(t0, pad(notes.map(mtof), BAR + 1.2), 0.035);
  if (b >= 1) for (let k = 0; k < 2; k++) stereo(t0 + k * BEAT * 2, bass(mtof(root), BEAT * 2), 0.16);
  if (b >= 2 && !outro) {
    const pattern = [0, 2, 1, 3, 2, 1, 3, 2];
    pattern.forEach((idx, k) => { if (rnd() < 0.86) stereo(t0 + k * BEAT / 2, pluck(mtof(notes[idx] + 12), 0.9), 0.07, (k % 2 ? 0.35 : -0.35)); });
  }
  if (b >= 4 && !outro) {
    for (const k of [0, 2]) stereo(t0 + k * BEAT, K, 0.22);
    for (let k = 0; k < 8; k++) if (k % 2 === 1) stereo(t0 + k * BEAT / 2 + (rnd() - 0.5) * 0.01, H, 0.05, 0.2);
  }
}
vinyl();

// Mastering: Ein-/Ausblenden, sanfte Sättigung, Normalisierung
const fin = 2 * SR, fout = 3.5 * SR;
let peak = 0;
for (let i = 0; i < N; i++) {
  const g = Math.min(1, i / fin) * Math.min(1, (N - i) / fout);
  L[i] = Math.tanh(L[i] * 1.2) * g; R[i] = Math.tanh(R[i] * 1.2) * g;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = 0.6 / (peak || 1);
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * norm)) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * norm)) * 32767), 46 + i * 4); }
fs.writeFileSync(OUT, buf);
console.log(`Musik: ${OUT} (${SECS} s)`);
