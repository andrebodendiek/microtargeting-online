// Bilder: Suche über Openverse (frei lizenzierte Fotos), Import und Upload.
// Alle Bilder werden auf dem eigenen Server gespeichert (keine Abrufe Dritter durch Schülergeräte),
// einheitlich als WebP zugeschnitten und von Metadaten (EXIF, GPS) befreit.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const API = 'https://api.openverse.org/v1';
const UA = 'bubbl-unterrichtsspiel/1.0 (Bildungsprojekt)';
export const IMG_W = 960;
export const IMG_H = 600;
const MAX_BYTES = 12 * 1024 * 1024;
const LICENSES = 'cc0,pdm,by'; // keine NC/ND/SA-Pflichten – frei und kommerziell nutzbar mit Namensnennung

const ID_RE = /^[0-9a-f-]{36}$/;
const LICENSE_NAMES = { cc0: 'CC0', pdm: 'Public Domain', by: 'CC BY' };

async function fetchJson(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
  if (r.status === 429) throw new Error('Openverse: zu viele Anfragen – bitte kurz warten.');
  if (!r.ok) throw new Error(`Openverse antwortet mit ${r.status}`);
  return r.json();
}
async function fetchBuffer(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`Bild nicht ladbar (${r.status})`);
  const len = Number(r.headers.get('content-length') || 0);
  if (len > MAX_BYTES) throw new Error('Bild zu groß');
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error('Bild zu groß');
  return buf;
}

export async function searchOpenverse(q, { pageSize = 20, page = 1 } = {}) {
  const query = String(q || '').trim().slice(0, 120);
  if (!query) return [];
  const url = `${API}/images/?q=${encodeURIComponent(query)}&license=${LICENSES}&mature=false&page_size=${Math.min(20, pageSize)}&page=${page}`;
  const d = await fetchJson(url);
  return (d.results || []).filter((r) => ID_RE.test(r.id)).map((r) => ({
    id: r.id, title: r.title || '', width: r.width || null, height: r.height || null,
    creator: r.creator || 'unbekannt', license: r.license, license_version: r.license_version, source: r.source,
    landing: r.foreign_landing_url,
  }));
}

// Bild normalisieren: Querformat 960×600, WebP, ohne Metadaten
export async function normalizeImage(buf, file) {
  await sharp(buf, { limitInputPixels: 60_000_000 })
    .rotate() // EXIF-Ausrichtung anwenden, danach werden Metadaten verworfen
    .resize(IMG_W, IMG_H, { fit: 'cover', position: sharp.strategy.attention })
    .webp({ quality: 74 })
    .toFile(file);
}

export async function importOpenverseImage(id, file) {
  if (!ID_RE.test(id)) throw new Error('Ungültige Bild-ID');
  const info = await fetchJson(`${API}/images/${id}/`);
  if (!['cc0', 'pdm', 'by'].includes(info.license)) throw new Error('Lizenz nicht erlaubt');
  const buf = await fetchBuffer(`${API}/images/${id}/thumb/?full_size=true`);
  await normalizeImage(buf, file);
  return {
    credit: {
      id, title: String(info.title || '').slice(0, 160), creator: String(info.creator || 'unbekannt').slice(0, 80),
      license: `${LICENSE_NAMES[info.license]}${info.license_version && info.license !== 'pdm' ? ` ${info.license_version}` : ''}`,
      license_url: info.license_url, url: info.foreign_landing_url, source: info.source,
    },
  };
}

// Server: Mediathek im Datenverzeichnis
export class MediaStore {
  constructor(dataDir) {
    this.dir = path.join(dataDir, 'media');
    fs.mkdirSync(this.dir, { recursive: true });
  }
  newFile() { const name = `${crypto.randomBytes(8).toString('hex')}.webp`; return { name, file: path.join(this.dir, name), src: `/media/${name}` }; }
  async fromOpenverse(id) {
    const f = this.newFile();
    const meta = await importOpenverseImage(id, f.file);
    return { src: f.src, alt: meta.credit.title || '', credit: meta.credit };
  }
  async fromUpload(buf) {
    if (!buf?.length || buf.length > MAX_BYTES) throw new Error('Datei fehlt oder ist zu groß (max. 12 MB)');
    const meta = await sharp(buf).metadata().catch(() => null);
    if (!meta || !['jpeg', 'png', 'webp', 'gif', 'heif', 'avif'].includes(meta.format)) throw new Error('Bitte ein Foto (JPG, PNG, WebP) hochladen');
    const f = this.newFile();
    await normalizeImage(buf, f.file);
    return { src: f.src, alt: '', credit: { creator: 'eigenes Foto', license: 'eigene Rechte' } };
  }
  async firstHit(query) {
    const hits = await searchOpenverse(query, { pageSize: 10 });
    const pick = hits.find((r) => (r.width || 1000) >= 700 && (!r.height || r.width / r.height >= 1.1)) || hits[0];
    return pick ? this.fromOpenverse(pick.id) : null;
  }
}
