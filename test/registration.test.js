import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import { ROUND1 } from '../public/shared/content.js';
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
  for (const p of [yes, no, ...others]) for (const x of ROUND1.slice(0, 5)) G.actions.like(r, p, { postId: x.id });
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
