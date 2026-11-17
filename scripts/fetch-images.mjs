// Lädt freie Fotos (CC0 / CC BY, kommerziell nutzbar) über Openverse für die Standardinhalte,
// schneidet sie einheitlich zu (960×600 WebP, ohne Metadaten) und schreibt die Quellenangaben
// nach public/shared/images.js.
// Aufruf: node scripts/fetch-images.mjs [id …]   (ohne IDs: alle; mit IDs: nur diese neu)
//         Suchbegriff überschreiben: node scripts/fetch-images.mjs s1="soccer match crowd"
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { importOpenverseImage, searchOpenverse } from '../src/images.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(root, 'public/img/content');
const MANIFEST = path.join(root, 'public/shared/images.js');

// Suchbegriffe (englisch liefert bei Openverse deutlich mehr Treffer)
export const QUERIES = {
  m1: 'shopping bags', m2: 'fashion model portrait', m3: 'makeup brushes cosmetics', m4: 'sneakers shoes',
  m5: 'autumn fashion outfit', m6: 'second hand clothes rack', m7: 'hairdresser haircut',
  n1: 'hiking meadow sunshine', n2: 'forest path', n3: 'squirrel autumn', n4: 'red deer stag',
  n5: 'mushroom forest', n6: 'meteor shower night sky', n7: 'seal pup beach',
  u1: 'climate protest earth', u2: 'harbour porpoise', u3: 'planting tree sapling', u4: 'solar panels roof',
  u5: 'plastic waste beach', u6: 'climate strike youth', u7: 'cyclists bike path',
  s1: 'soccer stadium match', s2: 'women basketball game', s3: 'youth football training', s4: 'city marathon runners',
  s5: 'skatepark skateboard', s6: 'beach volleyball', s7: 'judo training',
  t1: 'esports tournament', t2: 'video game controller', t3: 'gaming pc rgb', t4: 'teenager smartphone',
  t5: 'classroom laptop students', t6: 'virtual reality headset', t7: 'smartphone camera', t8: 'streamer microphone setup',
  c1: 'chocolate factory', c2: 'chocolate bar', c3: 'pralines chocolatier', c4: 'donuts',
  c5: 'ice cream cones', c6: 'candy sweets', c7: 'chocolate chip cookies',
  e1: 'vegetables legumes healthy food', e2: 'avocado eggs breakfast', e3: 'salad bowl', e4: 'protein shake',
  e5: 'meal prep containers', e6: 'soft drinks soda cans', e7: 'veggie burger',
  rucksack: 'hiking backpack', laufschuh1: 'trail running shoes', laufschuh2: 'running shoes', schokolade: 'chocolate bar wrapper',
  smartphone: 'smartphone', restaurant1: 'waffle ice cream cafe', restaurant2: 'healthy bowl salad',
  job: 'programmer computer desk',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const args = process.argv.slice(2);
  const overrides = Object.fromEntries(args.filter((a) => a.includes('=')).map((a) => a.split(/=(.*)/s).slice(0, 2)));
  const only = new Set(args.map((a) => a.split('=')[0]));
  const existing = fs.existsSync(MANIFEST) ? (await import(`${MANIFEST}?t=${Date.now()}`)).IMAGES : {};
  const images = { ...existing };
  const used = new Set(Object.values(images).map((x) => x.credit?.id));
  const ids = Object.keys(QUERIES).filter((id) => !only.size || only.has(id));
  for (const id of ids) {
    const q = overrides[id] || QUERIES[id];
    try {
      // „id=@<openverse-id>“ übernimmt genau dieses Foto (Handauswahl)
      if (q.startsWith('@')) {
        const file = path.join(OUT_DIR, `${id}.webp`);
        const meta = await importOpenverseImage(q.slice(1), file);
        images[id] = { src: `/img/content/${id}.webp`, alt: meta.credit.title || id, credit: meta.credit };
        console.log(`✓ ${id} (Handauswahl): ${meta.credit.title} – ${meta.credit.creator} (${meta.credit.license})`);
        await sleep(800); continue;
      }
      const results = await searchOpenverse(q, { pageSize: 20 });
      const pick = results.find((r) => !used.has(r.id) && (r.width || 1000) >= 700 && (!r.height || r.width / r.height >= 1.1)) || results.find((r) => !used.has(r.id));
      if (!pick) { console.log(`✗ ${id}: keine Treffer für „${q}“`); continue; }
      const file = path.join(OUT_DIR, `${id}.webp`);
      const meta = await importOpenverseImage(pick.id, file);
      used.add(pick.id);
      images[id] = { src: `/img/content/${id}.webp`, alt: pick.title?.slice(0, 160) || q, credit: meta.credit };
      console.log(`✓ ${id}: ${pick.title} – ${meta.credit.creator} (${meta.credit.license})`);
    } catch (e) { console.log(`✗ ${id}: ${e.message}`); }
    await sleep(1200); // Openverse anonym: freundlich bleiben
  }
  const sorted = Object.fromEntries(Object.keys(images).sort().map((k) => [k, images[k]]));
  fs.writeFileSync(MANIFEST, `// Automatisch erzeugt von scripts/fetch-images.mjs – Fotos via Openverse (CC0 / CC BY)\nexport const IMAGES = ${JSON.stringify(sorted, null, 2)};\n`);
  console.log(`\n${Object.keys(sorted).length} Bilder im Manifest.`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
