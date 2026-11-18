// Rendert den Intro-Film Bild für Bild als MP4 (1280×720, 25 fps) nach public/video/bubbl-intro.mp4.
// Voraussetzungen: laufender Server (Standard http://localhost:3000), Playwright mit Chromium, ffmpeg.
// Aufruf: node scripts/render-intro.mjs [BASIS-URL]
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'package.json'));
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = await import('playwright')); }
const { INTRO_LENGTH } = await import('../public/js/intro-length.js');

const BASE = process.argv[2] || 'http://localhost:3000';
const FPS = 25;
const OUT = path.join(root, 'public/video/bubbl-intro.mp4');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(`${BASE}/intro?frame=0`);
await page.waitForFunction(() => window.__frame);
await page.waitForTimeout(1500); // Bilder laden

const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
const frames = Math.round(INTRO_LENGTH * FPS);
for (let i = 0; i <= frames; i++) {
  await page.evaluate((t) => window.__frame(t), i / FPS);
  const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % 250 === 0) console.log(`${Math.round((i / frames) * 100)} %`);
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
await browser.close();
console.log(`Fertig: ${OUT}`);
