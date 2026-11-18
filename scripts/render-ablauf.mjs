// Spielt eine komplette bubbl-Stunde mit Bots durch, fotografiert je Schritt Beamer und ein Schüler-Handy
// und erzeugt daraus (1) Bilder für die Seite /ablauf und (2) das Demo-Video public/video/bubbl-ablauf.mp4.
// Voraussetzungen: laufender Server, Playwright (Chromium), ffmpeg, sharp.
// Aufruf: TEACHER_PASSWORD=… node scripts/render-ablauf.mjs [BASIS-URL]
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'package.json'));
let chromium, devices;
try { ({ chromium, devices } = require('playwright')); } catch { ({ chromium, devices } = await import('playwright')); }
const sharp = require('sharp');
const { ABLAUF } = await import('../public/js/ablauf-data.js');

const B = process.argv[2] || 'http://localhost:3000';
const PW = process.env.TEACHER_PASSWORD;
if (!PW) { console.error('Bitte TEACHER_PASSWORD setzen.'); process.exit(1); }
const IMG = path.join(root, 'public/img/ablauf');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'bubbl-ablauf-'));
fs.mkdirSync(IMG, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- 1) Durchspielen und fotografieren
const login = await fetch(`${B}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: PW }) });
const cookie = login.headers.get('set-cookie').split(';')[0]; const [cn, cv] = cookie.split('=');
const room = await (await fetch(`${B}/api/rooms`, { method: 'POST', headers: { cookie } })).json();
const browser = await chromium.launch();
const tctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); await tctx.addCookies([{ name: cn, value: cv, url: B }]);
const t = await tctx.newPage();
await t.goto(`${B}/teacher?c=${room.code}#${room.key}`); await t.waitForSelector('.cp-now');
const bm = await tctx.newPage(); await bm.setViewportSize({ width: 1600, height: 900 });
await bm.goto(`${B}/beamer?c=${room.code}#${room.key}`);
const ph = await (await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2 })).newPage();
await ph.goto(`${B}/play?c=${room.code}`); await ph.waitForSelector('.join-card');
await ph.fill('.mail-group input', 'luna.star'); await ph.click('text=Weiter'); await ph.click('.av-dice'); await ph.click('text=Weiter');
await ph.click('.join-check input >> nth=0'); await ph.click('text=Konto erstellen'); await ph.waitForSelector('.hero-card');
const sim = spawn('node', ['scripts/simulate.js', B, room.code, '17'], { cwd: root, stdio: 'ignore' });
await sleep(3500);

const shots = {};
async function shoot(id) {
  const task = await ph.$('.task-head[aria-expanded="true"]');
  if (task && !(await ph.$('.shorts-player'))) { await task.click({ timeout: 2000 }).catch(() => {}); await sleep(300); }
  const b = path.join(TMP, `${id}-beamer.png`), p = path.join(TMP, `${id}-phone.png`);
  await bm.screenshot({ path: b }); await ph.screenshot({ path: p });
  shots[id] = { b, p };
  console.log('📸', id);
}
const step = async (title, wait = 4500) => { await t.click(`.cp-step:has-text("${title}")`); await sleep(wait); };
const tryClick = async (pg, sel, timeout = 2000) => { try { await pg.click(sel, { timeout }); return true; } catch { return false; } };

await shoot('lobby');
await step('Likes verteilen', 2500);
for (const b of (await ph.$$('.like-btn')).slice(0, 4)) { await b.click().catch(() => {}); await sleep(300); }
await sleep(14000); await shoot('feed');
await step('Datenbank entsteht', 9000); await shoot('auswertung');
await step('Werbung platzieren', 7000); await shoot('werbung');
await step('Werbung erhalten', 3000);
for (const b of (await ph.$$('.rate button')).filter((_, i) => i % 2 === 0).slice(0, 7)) await b.click().catch(() => {});
await sleep(5000); await shoot('empfang');
await step('Algorithmus-Werkbank', 7000); await shoot('werkbank');
await step('Dein Datenprofil', 6000); await shoot('profil');
await step('Fairness-Check', 6000); await shoot('fairness');
await step('Filterblase', 7000); await shoot('blase');
await step('Shorts-Feed', 2500);
await tryClick(ph, '.shorts-start button'); await sleep(9000); await shoot('shorts');
await tryClick(t, 'button:has-text("Shorts stoppen")'); await sleep(1500);
await tryClick(ph, '.short-close');
await step('Wahlwerbung', 7000); await tryClick(t, 'button:has-text("Botschaften aufdecken")'); await sleep(2500); await shoot('wahl');
await step('Reflexion', 8000); await shoot('reflexion');
await step('Live-Quiz', 2000); await tryClick(t, 'button:has-text("Quiz starten")'); await sleep(7000); await shoot('quiz');
sim.kill(); await browser.close();

// ---------- 2) Bilder für /ablauf (WebP)
for (const [id, s] of Object.entries(shots)) {
  await sharp(s.b).resize(960).webp({ quality: 80 }).toFile(path.join(IMG, `${id}-beamer.webp`));
  await sharp(s.p).resize(390).webp({ quality: 80 }).toFile(path.join(IMG, `${id}-phone.webp`));
}

// ---------- 3) Video-Folien (HTML → PNG) und MP4
const esc = (x) => String(x).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const data = (f) => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`;
const CSS = `*{box-sizing:border-box}body{margin:0;width:1920px;height:1080px;font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#f6f7f8;color:#2d3133;overflow:hidden}
.top{position:absolute;left:60px;top:36px;right:60px;display:flex;align-items:flex-end;justify-content:space-between}
.top small{display:block;font-size:24px;color:#5d6468;font-weight:600}.top h1{margin:4px 0 0;font-size:56px;letter-spacing:-.02em}
.brand{font-size:40px;font-weight:800;color:#0C5D6A;letter-spacing:-.04em}
.bm{position:absolute;left:60px;top:170px;width:1280px;height:720px;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(16,24,40,.12);border:1px solid #e3e7ea}
.bm img{width:100%;height:100%;object-fit:cover}
.lbl{position:absolute;font-size:18px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#5d6468}
.ph{position:absolute;left:1410px;top:170px;width:470px;height:828px;border-radius:52px;background:#1d2326;padding:14px;box-shadow:0 20px 40px rgba(16,24,40,.2)}
.ph img{width:100%;height:100%;object-fit:cover;object-position:top;border-radius:40px}
.boxes{position:absolute;left:60px;top:910px;width:1280px;display:grid;grid-template-columns:1fr 1fr;gap:20px}
.box{border-radius:16px;padding:14px 20px;font-size:23px;line-height:1.3;background:#fff;border:1px solid #e3e7ea;height:140px;overflow:hidden}
.box b{display:block;font-size:16px;letter-spacing:.08em;text-transform:uppercase;color:#0C5D6A;margin-bottom:4px}
.box.l{background:#e9f3f5;border-color:#cfe3e7}
.center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:24px;padding:0 160px}
.center h1{font-size:76px;margin:0;letter-spacing:-.03em}.center p{font-size:34px;color:#5d6468;margin:0;line-height:1.4}
.list{display:grid;grid-template-columns:repeat(3,1fr);gap:14px 40px;font-size:28px;text-align:left;margin-top:10px}
.list span{display:flex;gap:14px}.list i{font-style:normal;font-weight:800;color:#0C5D6A;min-width:40px}`;
const page = await (await chromium.launch()).newPage({ viewport: { width: 1920, height: 1080 } });
const slides = [];
async function slide(name, body, secs) {
  await page.setContent(`<!doctype html><html lang="de"><head><meta charset="utf-8"><style>${CSS}</style></head><body>${body}</body></html>`);
  await page.waitForTimeout(150);
  const f = path.join(TMP, `${String(slides.length).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: f });
  slides.push({ f, secs });
}
const steps = ABLAUF.filter((s) => shots[s.id]);
await slide('titel', `<div class="center"><div class="brand" style="font-size:64px">bubbl</div><h1>So läuft eine bubbl-Stunde ab</h1>
  <p>Musterablauf aus Sicht der Lehrkraft und der SchülerInnen.<br>Links der Beamer, rechts ein Schüler-Handy.</p></div>`, 6);
await slide('ueberblick', `<div class="center"><h1>Der Ablauf</h1><div class="list">${steps.map((s, i) => `<span><i>${i + 1}</i>${esc(s.title)}${s.optional ? ' <small style="color:#8d9498;font-size:20px">(optional)</small>' : ''}</span>`).join('')}</div></div>`, 8);
let clock = 0;
for (const [i, s] of steps.entries()) {
  const from = clock; clock += s.min;
  await slide(s.id, `<div class="top"><div><small>Schritt ${i + 1} von ${steps.length} · ${from}.–${clock}. Minute</small><h1>${esc(s.title)}</h1></div><div class="brand">bubbl</div></div>
    <div class="lbl" style="left:60px;top:140px">Beamer</div><div class="bm"><img src="${data(shots[s.id].b)}"></div>
    <div class="lbl" style="left:1410px;top:140px">Handy einer Schülerin</div><div class="ph"><img src="${data(shots[s.id].p)}"></div>
    <div class="boxes"><div class="box l"><b>Lehrkraft</b>${esc(s.lehrkraft)}</div><div class="box"><b>SchülerInnen</b>${esc(s.sus)}</div></div>`, 9);
}
await slide('ende', `<div class="center"><div class="brand" style="font-size:64px">bubbl</div><h1>Viel Spaß im Unterricht!</h1>
  <p>Ausführliche Hinweise zu jedem Schritt stehen direkt im Cockpit.<br>Druckbarer Ablauf: <b>/ablauf</b></p></div>`, 5);
await page.context().browser().close();

// Poster für das Video
await sharp(slides[0].f).resize(1280).webp({ quality: 80 }).toFile(path.join(IMG, 'poster.webp'));

const segs = [];
for (const [i, s] of slides.entries()) {
  const out = path.join(TMP, `seg${i}.mp4`);
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-t', String(s.secs), '-i', s.f,
    '-vf', `scale=1920:1080,fade=t=in:st=0:d=0.5,fade=t=out:st=${s.secs - 0.5}:d=0.5,format=yuv420p`, '-r', '25', '-c:v', 'libx264', '-preset', 'medium', '-crf', '24', '-tune', 'stillimage', out], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(1);
  segs.push(out);
}
const list = path.join(TMP, 'list.txt');
fs.writeFileSync(list, segs.map((f) => `file '${f}'`).join('\n'));
const OUT = path.join(root, 'public/video/bubbl-ablauf.mp4');
spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
const { addMusic } = await import('./add-music.mjs');
addMusic(OUT, { seed: 3, volume: 0.6 });
console.log(`Fertig: ${OUT} (${slides.length} Folien)`);
