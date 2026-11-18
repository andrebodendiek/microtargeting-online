// Avatar-Baukasten: Konfiguration als kleine Zahlenwerte, gezeichnet als SVG (eigene Grafik, keine fremden Lizenzen).
// Wird von Server (Prüfung) und Browser (Darstellung) gemeinsam genutzt.

export const AVATAR_PARTS = {
  skin: ['#ffdbb4', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5c3a21'],
  hair: ['Kurz', 'Lang', 'Locken', 'Dutt', 'Raspel', 'Zopf', 'Afro', 'Bob', 'Glatze'],
  hairColor: ['#2c1b18', '#4a312c', '#a55728', '#d6b370', '#e8e1e1', '#b55239', '#3b5bdb', '#e64980'],
  eyes: ['Punkte', 'Fröhlich', 'Groß', 'Zwinkern'],
  mouth: ['Lächeln', 'Grinsen', 'Neutral', 'Staunen'],
  extra: ['Nichts', 'Brille', 'Sonnenbrille', 'Cap', 'Kopfhörer', 'Ohrringe'],
  shirt: ['#0C5D6A', '#1FB0C7', '#e03131', '#f59f00', '#2f9e44', '#7048e8', '#343a40', '#f06595'],
  bg: ['#d0ebff', '#ffe3e3', '#d3f9d8', '#fff3bf', '#e5dbff', '#c5f6fa', '#ffe8cc', '#e9ecef'],
};
export const AVATAR_KEYS = Object.keys(AVATAR_PARTS);

// Prüft/normalisiert eine Avatar-Konfiguration; liefert null bei Unsinn
export function normalizeAvatar(a) {
  if (!a || typeof a !== 'object' || Array.isArray(a)) return null;
  const out = {};
  for (const k of AVATAR_KEYS) {
    const v = a[k];
    if (!Number.isInteger(v) || v < 0 || v >= AVATAR_PARTS[k].length) return null;
    out[k] = v;
  }
  return out;
}

export function randomAvatar(rnd = Math.random) {
  return Object.fromEntries(AVATAR_KEYS.map((k) => [k, Math.floor(rnd() * AVATAR_PARTS[k].length)]));
}

// Zeichenanweisungen als einfache Elementliste [tag, attrs] – unabhängig von Preact, damit auch der Server SVG erzeugen könnte
export function avatarShapes(cfg) {
  const c = normalizeAvatar(cfg) || { skin: 1, hair: 0, hairColor: 1, eyes: 0, mouth: 0, extra: 0, shirt: 0, bg: 0 };
  const skin = AVATAR_PARTS.skin[c.skin];
  const hc = AVATAR_PARTS.hairColor[c.hairColor];
  const shirt = AVATAR_PARTS.shirt[c.shirt];
  const ink = '#2d3133';
  const s = [];
  const P = (d, fill, extra = {}) => s.push(['path', { d, fill, ...extra }]);
  const C = (cx, cy, r, fill, extra = {}) => s.push(['circle', { cx, cy, r, fill, ...extra }]);
  s.push(['rect', { x: 0, y: 0, width: 100, height: 100, fill: AVATAR_PARTS.bg[c.bg] }]);
  // Haare hinter dem Kopf
  if (c.hair === 1) P('M24 44 C 22 14, 78 14, 76 44 L 80 84 C 64 90, 36 90, 20 84 Z', hc);
  if (c.hair === 6) C(50, 40, 33, hc);
  if (c.hair === 7) P('M25 46 C 22 16, 78 16, 75 46 L 76 70 L 24 70 Z', hc);
  if (c.hair === 5) P('M70 40 C 88 44, 90 70, 78 80 C 82 64, 78 52, 68 48 Z', hc);
  // Körper, Hals, Kopf, Ohren
  P('M14 100 C 14 76, 32 70, 50 70 C 68 70, 86 76, 86 100 Z', shirt);
  s.push(['rect', { x: 43, y: 60, width: 14, height: 14, rx: 5, fill: skin }]);
  s.push(['rect', { x: 43, y: 66, width: 14, height: 5, fill: '#000', opacity: 0.08 }]);
  C(28, 50, 5.5, skin); C(72, 50, 5.5, skin);
  s.push(['ellipse', { cx: 50, cy: 47, rx: 22, ry: 25, fill: skin }]);
  // Haare vorn
  if (c.hair === 0) P('M27 44 C 26 18, 74 18, 73 44 C 68 32, 52 28, 38 33 C 33 35, 29 39, 27 44 Z', hc);
  if (c.hair === 1 || c.hair === 7) P('M27 46 C 25 18, 75 18, 73 46 C 66 34, 46 30, 34 36 C 31 38, 29 42, 27 46 Z', hc);
  if (c.hair === 2) { for (const [x, y, r] of [[32, 34, 8], [42, 26, 9], [54, 24, 9], [65, 29, 8], [71, 39, 7], [29, 43, 6]]) C(x, y, r, hc); }
  if (c.hair === 3) { P('M27 44 C 26 20, 74 20, 73 44 C 66 31, 34 31, 27 44 Z', hc); C(50, 17, 10, hc); }
  if (c.hair === 4) P('M28 42 C 28 20, 72 20, 72 42 C 64 32, 36 32, 28 42 Z', hc, { opacity: 0.55 });
  if (c.hair === 5) P('M27 44 C 26 18, 74 18, 73 44 C 70 34, 56 29, 40 32 C 33 34, 29 38, 27 44 Z', hc);
  if (c.hair === 6) P('M27 46 C 28 30, 72 30, 73 46 C 66 38, 34 38, 27 46 Z', hc);
  // Augenbrauen
  P('M37 39 Q 42 36 46 39', 'none', { stroke: ink, 'stroke-width': 1.8, 'stroke-linecap': 'round', opacity: 0.7 });
  P('M54 39 Q 58 36 63 39', 'none', { stroke: ink, 'stroke-width': 1.8, 'stroke-linecap': 'round', opacity: 0.7 });
  // Augen
  if (c.eyes === 0) { C(41.5, 47, 2.6, ink); C(58.5, 47, 2.6, ink); }
  if (c.eyes === 1) { P('M38 48 Q 41.5 44 45 48', 'none', { stroke: ink, 'stroke-width': 2.2, 'stroke-linecap': 'round' }); P('M55 48 Q 58.5 44 62 48', 'none', { stroke: ink, 'stroke-width': 2.2, 'stroke-linecap': 'round' }); }
  if (c.eyes === 2) { C(41.5, 47, 4.6, '#fff'); C(58.5, 47, 4.6, '#fff'); C(42.3, 47.6, 2.5, ink); C(59.3, 47.6, 2.5, ink); C(43, 46.6, 0.8, '#fff'); C(60, 46.6, 0.8, '#fff'); }
  if (c.eyes === 3) { C(41.5, 47, 2.6, ink); P('M55 47.5 Q 58.5 45 62 47.5', 'none', { stroke: ink, 'stroke-width': 2.2, 'stroke-linecap': 'round' }); }
  // Wangen
  C(36, 55, 3.6, '#ff8787', { opacity: 0.25 }); C(64, 55, 3.6, '#ff8787', { opacity: 0.25 });
  // Mund
  if (c.mouth === 0) P('M43 57 Q 50 63 57 57', 'none', { stroke: ink, 'stroke-width': 2.2, 'stroke-linecap': 'round' });
  if (c.mouth === 1) P('M42 56 Q 50 66 58 56 Z', '#fff', { stroke: ink, 'stroke-width': 1.8, 'stroke-linejoin': 'round' });
  if (c.mouth === 2) P('M44 59 L 56 59', 'none', { stroke: ink, 'stroke-width': 2.2, 'stroke-linecap': 'round' });
  if (c.mouth === 3) s.push(['ellipse', { cx: 50, cy: 59, rx: 3.6, ry: 4.2, fill: ink }]);
  // Extras
  if (c.extra === 1) { C(41.5, 47, 6.5, 'none', { stroke: ink, 'stroke-width': 1.8 }); C(58.5, 47, 6.5, 'none', { stroke: ink, 'stroke-width': 1.8 }); P('M48 47 L 52 47', 'none', { stroke: ink, 'stroke-width': 1.8 }); }
  if (c.extra === 2) { s.push(['rect', { x: 33, y: 42, width: 15, height: 10, rx: 4, fill: '#1e1e1e' }]); s.push(['rect', { x: 52, y: 42, width: 15, height: 10, rx: 4, fill: '#1e1e1e' }]); P('M48 46 L 52 46', 'none', { stroke: '#1e1e1e', 'stroke-width': 2 }); }
  if (c.extra === 3) { P('M26 38 C 26 14, 74 14, 74 38 Z', shirt); P('M50 37 L 86 37 C 86 42, 60 42, 50 40 Z', shirt); P('M26 38 L 74 38', 'none', { stroke: '#000', 'stroke-width': 1.5, opacity: 0.15 }); }
  if (c.extra === 4) { P('M24 48 C 22 12, 78 12, 76 48', 'none', { stroke: '#343a40', 'stroke-width': 4 }); s.push(['rect', { x: 19, y: 42, width: 10, height: 16, rx: 4, fill: '#343a40' }]); s.push(['rect', { x: 71, y: 42, width: 10, height: 16, rx: 4, fill: '#343a40' }]); }
  if (c.extra === 5) { C(28, 57, 2.4, '#fcc419'); C(72, 57, 2.4, '#fcc419'); }
  return s;
}

// Für Bildbeschreibungen
export function describeAvatar(cfg) {
  const c = normalizeAvatar(cfg);
  if (!c) return 'Avatar';
  return `Avatar: ${AVATAR_PARTS.hair[c.hair]}${c.extra ? `, ${AVATAR_PARTS.extra[c.extra]}` : ''}`;
}
