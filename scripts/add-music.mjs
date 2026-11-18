// Legt die selbst erzeugte Hintergrundmusik unter ein Video (Videospur bleibt unverändert).
// Aufruf: node scripts/add-music.mjs <video.mp4> [seed] [lautstaerke 0..1] [m4a-ausgabe]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function addMusic(video, { seed = 1, volume = 0.7, m4a = null } = {}) {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const dur = Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video]).stdout.toString().trim());
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bubbl-musik-'));
  const wav = path.join(tmp, 'musik.wav');
  const r1 = spawnSync('node', [path.join(dir, 'make-music.mjs'), String(Math.ceil(dur)), wav, String(seed)], { stdio: 'inherit' });
  if (r1.status !== 0) throw new Error('Musik konnte nicht erzeugt werden');
  // Videospur ohne vorhandene Tonspur nehmen, Musik leicht absenken, auf Videolänge kürzen
  const out = path.join(tmp, 'mit-musik.mp4');
  const r2 = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-i', wav, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy',
    '-af', `volume=${volume}`, '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' });
  if (r2.status !== 0) throw new Error('Zusammenführen fehlgeschlagen');
  fs.copyFileSync(out, video);
  if (m4a) spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-af', `volume=${volume}`, '-c:a', 'aac', '-b:a', '96k', m4a], { stdio: 'inherit' });
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`Musik ergänzt: ${video}${m4a ? ` (+ ${m4a})` : ''}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [video, seed, volume, m4a] = process.argv.slice(2);
  if (!video) { console.error('Aufruf: node scripts/add-music.mjs <video.mp4> [seed] [lautstaerke] [m4a]'); process.exit(1); }
  addMusic(video, { seed: Number(seed || 1), volume: Number(volume || 0.7), m4a: m4a || null });
}
