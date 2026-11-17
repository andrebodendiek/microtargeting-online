import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import { ROUND1, ADS, CATEGORIES } from '../public/shared/content.js';

function room(n = 9) {
  const r = G.createRoom('TEST');
  const ps = Array.from({ length: n }, () => G.actions.join(r, null, {}));
  return { r, ps };
}

test('Likes sind auf maxLikes begrenzt und nur in Schritt 1 möglich', () => {
  const { r, ps } = room(1);
  G.actions.like(r, ps[0], { postId: ROUND1[0].id });
  assert.equal(ps[0].likes.length, 0, 'in der Lobby keine Likes');
  G.actions.setPhase(r, null, { phase: 'feed' });
  r.settings.maxLikes = 3;
  for (const p of ROUND1.slice(0, 6)) G.actions.like(r, ps[0], { postId: p.id });
  assert.equal(ps[0].likes.length, 3);
  G.actions.like(r, ps[0], { postId: ROUND1[0].id });
  assert.equal(ps[0].likes.length, 2, 'erneutes Tippen entfernt den Like');
});

test('Gruppen decken alle Kategorien und Anzeigen ab', () => {
  const { r } = room(10);
  G.actions.setPhase(r, null, { phase: 'feed' });
  G.actions.setPhase(r, null, { phase: 'auswertung' });
  assert.equal(r.groups.length, 7);
  assert.deepEqual(r.groups.flatMap((g) => g.cats).sort(), CATEGORIES.map((c) => c.id).sort());
  assert.deepEqual(r.groups.flatMap((g) => g.ads).sort(), ADS.map((a) => a.id).sort());
  const { r: small } = room(3);
  G.formGroups(small);
  assert.equal(small.groups.length, 3);
  assert.equal(small.groups.flatMap((g) => g.cats).length, 7);
});

test('Auswertung, Budget, Algorithmus und Duell', () => {
  const { r, ps } = room(6);
  G.actions.setPhase(r, null, { phase: 'feed' });
  const sport = ROUND1.filter((p) => p.cat === 'sport');
  for (const p of sport) G.actions.like(r, ps[0], { postId: p.id });
  G.actions.track(r, ps[1], { dwell: { [sport[0].id]: 5000 }, read: { [sport[0].id]: 5000 }, opens: { [sport[0].id]: 1 } });
  G.actions.setPhase(r, null, { phase: 'auswertung' });
  G.actions.autoTally(r);
  const v = G.staffView(r);
  assert.equal(v.db.sport[ps[0].id], 3);
  assert.ok(v.groups.every((g) => g.accuracy === 1));
  G.actions.setPhase(r, null, { phase: 'werbung' });
  const g = r.groups.find((x) => x.ads.includes('laufschuh1'));
  const member = ps.find((p) => p.group === g.id);
  G.actions.adCats(r, member, { adId: 'laufschuh1', cat: 'sport' });
  for (const p of ps) G.actions.adTarget(r, member, { adId: 'laufschuh1', id: p.id });
  assert.equal(r.adWork.laufschuh1.targets.length, G.budgetOf(r), 'Budget wird eingehalten');
  const algo = G.algoTargets(r);
  assert.ok(algo.laufschuh1.includes(ps[0].id), 'Like-Fan wird erreicht');
  assert.ok(algo.laufschuh1.includes(ps[1].id), 'heimliche Leserin wird über Tracking erreicht');
  G.actions.setPhase(r, null, { phase: 'empfang' });
  G.actions.rate(r, ps[1], { adId: 'laufschuh1', value: 1 });
  const d = G.staffView(r).duel;
  assert.equal(d.algo.hits >= 1, true);
});

test('Beamer verrät Tracking erst ab Schritt „Dein Datenprofil“', () => {
  const { r } = room(2);
  G.actions.setPhase(r, null, { phase: 'feed' });
  assert.equal(G.staffView(r, { forBeamer: true }).tracking, undefined);
  assert.ok(G.staffView(r).tracking, 'Lehrkraft sieht Tracking immer');
  for (const ph of ['auswertung', 'werbung', 'empfang', 'profil']) G.actions.setPhase(r, null, { phase: ph });
  assert.ok(G.staffView(r, { forBeamer: true }).tracking);
});

test('Filterblase, Wahl und Reflexion', () => {
  const { r, ps } = room(2);
  r.phase = 'blase';
  G.actions.setPhase(r, null, { phase: 'blase' });
  assert.equal(ps[0].bubble.feed.length, 6);
  G.actions.like(r, ps[0], { postId: ps[0].bubble.feed[0] });
  assert.equal(ps[0].bubble.feed.length, 8);
  G.actions.setPhase(r, null, { phase: 'wahl' });
  G.actions.vote(r, ps[0], { score: 4 });
  assert.equal(ps[0].vote.score, 4);
  G.actions.setPhase(r, null, { phase: 'reflexion' });
  G.actions.reflect(r, ps[0], { opinion: 2, pro: 'x'.repeat(500) });
  assert.equal(ps[0].reflect.pro.length, 140);
  assert.ok(G.exportCsv(r).includes('Meinung'));
});

test('Optionale Phasen lassen sich abschalten', () => {
  const { r } = room(1);
  G.actions.settings(r, null, { enabled: { blase: false, wahl: false } });
  assert.deepEqual(G.activePhases(r).map((p) => p.id), ['lobby', 'feed', 'auswertung', 'werbung', 'empfang', 'profil', 'reflexion']);
});
