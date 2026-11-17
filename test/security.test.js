import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import { applyContent, POSTS, QUIZ, DEFAULT_CONTENT, POST, CAT } from '../public/shared/content.js';
import { validatePost } from '../src/content-store.js';

function room(n = 3) {
  const r = G.createRoom('SEC1'); G.useContent(r);
  const ps = Array.from({ length: n }, () => G.actions.join(r, null, {}));
  return { r, ps };
}

test('Prototyp-Schlüssel wie "constructor" werden überall abgewiesen', () => {
  const { r, ps } = room();
  assert.equal(POST.constructor, undefined);
  assert.equal(CAT.constructor, undefined);
  G.actions.setPhase(r, null, { phase: 'feed' });
  G.actions.track(r, ps[0], { dwell: { constructor: 4000, toString: 1 }, events: 1 });
  assert.equal(Object.keys(ps[0].track.dwell).length, 0);
  G.actions.like(r, ps[0], { postId: 'constructor' });
  assert.equal(ps[0].likes.length, 0);
  assert.throws(() => validatePost({ ...DEFAULT_CONTENT.posts[0], page: 'constructor' }), /Seite/);
});

test('Personen-IDs müssen echte, aktive Zahlen-IDs sein', () => {
  const { r, ps } = room(4);
  for (const ph of ['feed', 'auswertung', 'werbung']) G.actions.setPhase(r, null, { phase: ph });
  const g = r.groups.find((x) => x.id === ps[0].group);
  const ad = g.ads[0];
  r.settings.budget = 1;
  G.actions.adTarget(r, ps[0], { adId: ad, id: String(ps[1].id) });
  G.actions.adTarget(r, ps[0], { adId: ad, id: 'constructor' });
  assert.equal(r.adWork[ad].targets.length, 0);
  G.actions.adTarget(r, ps[0], { adId: ad, id: ps[1].id });
  assert.deepEqual(r.adWork[ad].targets, [ps[1].id]);
  G.actions.kick(r, null, { id: ps[1].id });
  assert.deepEqual(r.adWork[ad].targets, [], 'Gekickte werden aus Zielgruppen entfernt');
});

test('Nur tatsächlich gezeigte Vermutungen dürfen bewertet werden', () => {
  const { r, ps } = room(1);
  for (const ph of ['feed', 'auswertung', 'werbung', 'empfang', 'profil']) G.actions.setPhase(r, null, { phase: ph });
  G.actions.infer(r, ps[0], { key: 'erfunden-1', value: true });
  assert.equal(Object.keys(ps[0].inferFb).length, 0);
  const real = G.playerView(r, ps[0]).profile.inferences[0].key;
  G.actions.infer(r, ps[0], { key: real, value: true });
  assert.equal(ps[0].inferFb[real], true);
});

test('Unvollständiges Inhaltspaket fällt sauber auf den Standard zurück', () => {
  applyContent({ posts: DEFAULT_CONTENT.posts.slice(0, 3), ads: DEFAULT_CONTENT.ads, party: {}, partyMessages: {}, quiz: null, fairness: {} });
  assert.equal(POSTS.length, DEFAULT_CONTENT.posts.length);
  assert.equal(QUIZ.length, DEFAULT_CONTENT.quiz.length);
});
