import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import { ROUND1, AD } from '../public/shared/content.js';
const AD_OF = (id) => AD[id];
import { normalizeAvatar, randomAvatar, AVATAR_KEYS } from '../public/shared/avatar.js';

const reg = (email, consent = {}) => ({ email, avatar: randomAvatar(), consent: { agb: true, ...consent } });

test('Registrierung prüft Adresse, Doppelungen und AGB-Zustimmung', () => {
  const r = G.createRoom('REG1');
  const p = G.actions.join(r, null, reg('Luna.Star@gmail.com'));
  assert.equal(p.email, 'luna.star@bubbl.mail', 'Domain wird immer auf bubbl.mail gesetzt');
  assert.equal(p.name, 'luna');
  assert.throws(() => G.actions.join(r, null, reg('luna.star')), G.JoinError, 'doppelte Adresse');
  assert.throws(() => G.actions.join(r, null, reg('a')), G.JoinError, 'zu kurz');
  assert.throws(() => G.actions.join(r, null, reg('<script>')), G.JoinError, 'Sonderzeichen');
  assert.throws(() => G.actions.join(r, null, { email: 'kiwi', consent: { agb: false } }), G.JoinError, 'ohne AGB');
  const q = G.actions.join(r, null, { email: 'kiwi', avatar: { skin: 99 }, birthYear: 1900, consent: { agb: true, agbMs: 1e12 } });
  assert.ok(normalizeAvatar(q.avatar), 'ungültiger Avatar wird ersetzt');
  assert.equal(q.birthYear, null);
  assert.ok(q.consent.agbMs <= 3_600_000);
});

test('Avatar-Konfiguration wird strikt geprüft', () => {
  const a = randomAvatar();
  assert.deepEqual(normalizeAvatar(a), a);
  assert.equal(normalizeAvatar({ ...a, hair: 1.5 }), null);
  assert.equal(normalizeAvatar({ ...a, bg: -1 }), null);
  assert.equal(normalizeAvatar('🦊'), null);
  assert.deepEqual(Object.keys(normalizeAvatar({ ...a, __proto__: { x: 1 }, evil: 1 })), AVATAR_KEYS);
  const r = G.createRoom('REG2');
  const p = G.actions.join(r, null, reg('max'));
  const before = { ...p.avatar };
  G.actions.avatar(r, p, { avatar: { constructor: 1 } });
  assert.deepEqual(p.avatar, before);
});

test('Postfach: personalisierte Werbe-Mails nur mit Newsletter-Häkchen, Abmeldung wirkt für spätere Mails', () => {
  const r = G.createRoom('REG3');
  const yes = G.actions.join(r, null, reg('nova'));
  const no = G.actions.join(r, null, reg('sky', { newsletter: false }));
  const others = Array.from({ length: 6 }, (_, i) => G.actions.join(r, null, reg(`bot${i}x`)));
  G.actions.setPhase(r, null, { phase: 'feed' });
  // „yes“ liked am meisten und gehört damit sicher zu den Zielgruppen (IDs sind zufällig, Gleichstände hängen nicht mehr an der Reihenfolge)
  for (const x of ROUND1.slice(0, 10)) G.actions.like(r, yes, { postId: x.id });
  for (const p of [no, ...others]) for (const x of ROUND1.slice(0, 5)) G.actions.like(r, p, { postId: x.id });
  for (const ph of ['auswertung', 'werbung']) G.actions.setPhase(r, null, { phase: ph });
  G.actions.autoAds?.(r, null, {});
  G.actions.setPhase(r, null, { phase: 'empfang' });
  const mY = G.mailsFor(r, yes), mN = G.mailsFor(r, no);
  assert.ok(mY.some((m) => m.id === 'welcome'));
  assert.ok(mN.some((m) => m.kind === 'nooffers'));
  assert.ok(!mN.some((m) => m.kind === 'ad' || m.kind === 'recs'), 'ohne Newsletter keine Werbung');
  const adsBefore = mY.filter((m) => m.kind === 'ad').length;
  assert.ok(adsBefore > 0, 'Werbe-Mails vorhanden');
  G.actions.readMail(r, yes, { id: 'welcome' });
  assert.equal(G.mailsFor(r, yes).find((m) => m.id === 'welcome').read, true);
  G.actions.readMail(r, yes, { id: '__proto__' });
  assert.ok(!Object.prototype.hasOwnProperty.call(yes.mailRead, '__proto__'));
  r.phaseAt.empfang -= 10; // Abmeldung erfolgt später
  G.actions.unsubscribe(r, yes);
  assert.equal(G.mailsFor(r, yes).filter((m) => m.kind === 'ad').length, adsBefore, 'bereits erhaltene Mails bleiben');
  G.actions.setPhase(r, null, { phase: 'profil' });
  G.actions.setPhase(r, null, { phase: 'reflexion' });
  assert.ok(!G.mailsFor(r, yes).some((m) => m.kind === 'miss' || m.kind === 'weekly'), 'nach Abmeldung keine neuen Werbe-Mails');
  const pv = G.playerView(r, no);
  assert.ok(pv.mail && Number.isInteger(pv.mail.unread));
});

test('Migration ersetzt unveränderte alte Standardbeiträge, eigene bleiben', async () => {
  const fs = await import('node:fs'); const os = await import('node:os'); const path = await import('node:path');
  const { ContentStore } = await import('../src/content-store.js');
  const { DEFAULT_CONTENT } = await import('../public/shared/content.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bubbl-mig-'));
  const old = JSON.parse(JSON.stringify(DEFAULT_CONTENT));
  old.posts[0].headline = 'Shopping-Gutschein zu gewinnen!';
  old.posts[1].headline = 'Mein eigener Beitrag';
  fs.writeFileSync(path.join(dir, 'content.json'), JSON.stringify({ current: old, history: [], suggestions: [] }));
  const st = new ContentStore(dir);
  assert.equal(st.current.posts[0].headline, DEFAULT_CONTENT.posts[0].headline);
  assert.equal(st.current.posts[1].headline, 'Mein eigener Beitrag');
  assert.equal(new ContentStore(dir).data.postsVersion, '2026-11');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('Werbe-Mail kommt verzögert nach jedem Like und bezieht sich darauf, auch nach Entfernen', () => {
  const r = G.createRoom('LIKE');
  const p = G.actions.join(r, null, { email: 'mia', avatar: randomAvatar(), consent: { agb: true } });
  const q = G.actions.join(r, null, { email: 'tom', avatar: randomAvatar(), consent: { agb: true, newsletter: false } });
  G.actions.setPhase(r, null, { phase: 'feed' });
  const post = ROUND1[0];
  G.actions.like(r, p, { postId: post.id }); G.actions.like(r, q, { postId: post.id });
  const t0 = p.likeAt[post.id];
  assert.equal(G.mailsFor(r, p, t0 + 1000).filter((m) => m.kind === 'likead').length, 0, 'noch nicht sofort');
  const later = G.mailsFor(r, p, t0 + G.likeMailDelay(0) + 10).filter((m) => m.kind === 'likead');
  assert.equal(later.length, 1);
  assert.equal(later[0].data.post, post.id);
  assert.ok(AD_OF(later[0].data.ad).cats.includes(post.cat), 'Anzeige passt zur Kategorie des Likes');
  assert.equal(G.mailsFor(r, q, t0 + 60000).filter((m) => m.kind === 'likead').length, 0, 'ohne Newsletter keine Like-Werbung');
  G.actions.like(r, p, { postId: post.id }); // Like zurücknehmen
  const after = G.mailsFor(r, p, t0 + 60000).find((m) => m.kind === 'likead');
  assert.ok(after && after.data.stillLiked === false, 'Mail bleibt, auch wenn der Like entfernt wurde');
  G.actions.setPhase(r, null, { phase: 'auswertung' });
  const b = G.playerView(r, p).browse;
  assert.ok(b && b.posts.length > 20 && b.ads.length > 0, 'Stöber-Feed mit Anzeigen ab Schritt 3');
});
