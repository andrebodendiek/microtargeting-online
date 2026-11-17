import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { validateImage, validateContent, applyItems, Invalid } from '../src/content-store.js';
import { MediaStore } from '../src/images.js';
import { DEFAULT_CONTENT } from '../public/shared/content.js';

test('Standardinhalte haben Fotos mit Quellenangabe', () => {
  const c = validateContent(DEFAULT_CONTENT);
  assert.equal(c.posts.filter((p) => p.image).length, 50);
  assert.equal(c.ads.filter((a) => a.image).length, 7);
  for (const p of c.posts) {
    assert.ok(fs.existsSync(path.join('public', p.image.src)), `Datei fehlt: ${p.image.src}`);
    assert.ok(p.image.credit.creator && p.image.credit.license, `Quellenangabe fehlt bei ${p.id}`);
  }
});

test('Bildpfade: nur eigene Startbilder oder Mediathek, keine fremden Adressen', () => {
  assert.ok(validateImage({ src: '/media/abc123.webp', credit: { creator: 'x', url: 'https://example.org/a' } }, 'T'));
  for (const src of ['https://evil.example/x.webp', '/media/../server.js', '/media/a.svg', 'javascript:alert(1)', '/img/content/a b.webp']) {
    assert.throws(() => validateImage({ src }, 'T'), Invalid, src);
  }
  const v = validateImage({ src: '/media/a.webp', credit: { creator: 'x', url: 'javascript:alert(1)' } }, 'T');
  assert.equal(v.credit.url, undefined, 'unsichere Links werden entfernt');
});

test('Upload: Fotos werden normalisiert, andere Dateien abgelehnt', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bubbl-media-'));
  const m = new MediaStore(dir);
  const png = await sharp({ create: { width: 2000, height: 900, channels: 3, background: '#0C5D6A' } }).png().toBuffer();
  const img = await m.fromUpload(png);
  assert.match(img.src, /^\/media\/[0-9a-f]{16}\.webp$/);
  const meta = await sharp(path.join(m.dir, path.basename(img.src))).metadata();
  assert.equal(meta.format, 'webp'); assert.equal(meta.width, 960); assert.equal(meta.height, 600);
  assert.equal(meta.exif, undefined, 'keine Metadaten');
  await assert.rejects(() => m.fromUpload(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')));
  await assert.rejects(() => m.fromUpload(Buffer.from('kein bild')));
});

test('KI-Ersetzen behält das Foto, wenn kein neues gefunden wurde', () => {
  const base = validateContent(DEFAULT_CONTENT);
  const post = { cat: 'sport', page: 'sportnow', round: 1, time: '1 Std.', art: ['⚽'], bg: ['#111111', '#222222'], headline: 'Neu', teaser: 'Neu …', body: 'Neu.' };
  const out = applyItems(base, [{ kind: 'post', action: 'replace', target_id: 's1', post }]);
  assert.equal(out.posts.find((p) => p.id === 's1').image.src, '/img/content/s1.webp');
});
