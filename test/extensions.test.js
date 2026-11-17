import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import { validateContent, applyItems } from '../src/content-store.js';
import { DEFAULT_CONTENT, ROUND1, ADS, QUIZ, POSTS } from '../public/shared/content.js';

function played(n = 8) {
  const r = G.createRoom('TEST');
  G.useContent(r);
  const ps = Array.from({ length: n }, () => G.actions.join(r, null, {}));
  G.actions.setPhase(r, null, { phase: 'feed' });
  // Hälfte liked Sport, alle lesen heimlich Technik
  ps.forEach((p, i) => {
    for (const post of ROUND1.filter((x) => x.cat === (i % 2 ? 'sport' : 'mode'))) G.actions.like(r, p, { postId: post.id });
    const tech = ROUND1.filter((x) => x.cat === 'technik').map((x) => x.id);
    G.actions.track(r, p, { dwell: Object.fromEntries(tech.map((id) => [id, i < 4 ? 5000 : 0])), opens: {}, read: {}, events: 3 });
  });
  for (const ph of ['auswertung', 'werbung', 'empfang']) G.actions.setPhase(r, null, { phase: ph });
  ps.forEach((p, i) => { for (const a of ADS) G.actions.rate(r, p, { adId: a.id, value: a.cats.includes(i % 2 ? 'sport' : 'mode') || (i < 4 && a.cats.includes('technik')) ? 1 : -1 }); });
  return { r, ps };
}

test('Standard-Inhalte sind gültig, ungültige werden abgelehnt', () => {
  const c = validateContent(DEFAULT_CONTENT);
  assert.equal(c.posts.length, 50);
  assert.throws(() => validateContent({ ...DEFAULT_CONTENT, ads: DEFAULT_CONTENT.ads.slice(0, 3) }), /5 bis 8/);
  assert.throws(() => validateContent({ ...DEFAULT_CONTENT, posts: DEFAULT_CONTENT.posts.filter((p) => p.cat !== 'sport') }), /sport/);
});

test('KI-Vorschläge anwenden: ersetzen, hinzufügen, entfernen', () => {
  const base = validateContent(DEFAULT_CONTENT);
  const post = { cat: 'sport', page: 'sportnow', round: 1, time: '1 Std.', art: ['⚽'], bg: ['#111111', '#222222'], headline: 'Neu', teaser: 'Neu …', body: 'Neu.' };
  const out = applyItems(base, [
    { kind: 'post', action: 'replace', target_id: 's1', post },
    { kind: 'post', action: 'add', target_id: null, post: { ...post, headline: 'Dazu' } },
    { kind: 'quiz', action: 'remove', target_id: 'q8' },
    { kind: 'party_message', action: 'replace', party_message: { cat: 'mode', title: 'T', text: 'X', art: '👗' } },
  ]);
  assert.equal(out.posts.find((p) => p.id === 's1').headline, 'Neu');
  assert.equal(out.posts.length, 51);
  assert.equal(out.quiz.length, 7);
  assert.equal(out.partyMessages.mode.title, 'T');
});

test('Raum nutzt eigene Inhaltskopie', () => {
  const custom = validateContent(DEFAULT_CONTENT);
  custom.posts[0].headline = 'Eigene Überschrift';
  const r = G.createRoom('ABCD', custom);
  G.useContent(r);
  assert.equal(POSTS[0].headline, 'Eigene Überschrift');
  G.useContent(G.createRoom('EFGH'));
  assert.notEqual(POSTS[0].headline, 'Eigene Überschrift');
});

test('Werkbank: Tracking-Gewichte verbessern das Targeting, Testdaten getrennt', () => {
  const { r, ps } = played();
  G.actions.setPhase(r, null, { phase: 'werkbank' });
  const g = r.groups.find((x) => x.id === ps[0].group);
  const before = G.staffView(r).werkbank.groups.find((x) => x.id === g.id).result;
  G.actions.weights(r, ps[0], { weights: { like: 1, dwell: 3, open: 0, read: 0, threshold: 0 } });
  const after = G.staffView(r).werkbank.groups.find((x) => x.id === g.id).result;
  assert.ok(after.train.f1 >= before.train.f1);
  assert.equal(G.splitAds().train.length, 4);
  assert.ok(G.playerView(r, ps[0]).werkbank.rank >= 1);
});

test('Fairness: Regel verteilt Anzeige auf alle Interessengruppen', () => {
  const { r, ps } = played();
  G.actions.setPhase(r, null, { phase: 'fairness' });
  ps.forEach((p) => G.actions.fairAnswer(r, p, { key: 'interest', value: true }));
  const unfair = G.staffView(r).fairness;
  assert.ok(unfair.cells.excluded > 0, 'Interessierte werden ausgeschlossen');
  G.actions.fairRule(r, null, { value: true });
  const fair = G.staffView(r).fairness;
  const groupsReached = Object.values(fair.byCat).filter((b) => b.saw > 0).length;
  const groupsBefore = Object.values(unfair.byCat).filter((b) => b.saw > 0).length;
  assert.ok(groupsReached >= groupsBefore);
});

test('Quiz: Punkte nur für richtige Antworten, nur einmal pro Frage', () => {
  const { r, ps } = played(3);
  G.actions.setPhase(r, null, { phase: 'quiz' });
  G.actions.quizNext(r);
  G.actions.quizAnswer(r, ps[0], { idx: 0, a: QUIZ[0].correct });
  G.actions.quizAnswer(r, ps[0], { idx: 0, a: (QUIZ[0].correct + 1) % 4 });
  G.actions.quizAnswer(r, ps[1], { idx: 0, a: (QUIZ[0].correct + 1) % 4 });
  G.actions.quizReveal(r);
  const v = G.staffView(r).quiz;
  assert.equal(v.answered, 2);
  assert.equal(v.leaderboard[0].id, ps[0].id);
  assert.ok(v.leaderboard[0].score > 500);
  assert.equal(G.playerView(r, ps[1]).quiz.score, 0);
});

test('Tracking-Protokoll und DSGVO-Auskunft', () => {
  const { r, ps } = played(2);
  G.actions.setPhase(r, null, { phase: 'profil' });
  const v = G.playerView(r, ps[0]);
  assert.ok(v.trackLog.some((e) => e.req === 'POST /like'));
  assert.ok(v.trackLog.some((e) => e.req === 'POST /track' && e.body.dwell_ms));
  const a = G.auskunft(r, ps[0]);
  assert.equal(a.betroffene_person.nutzer_id, ps[0].id);
  assert.ok(a.gespeicherte_daten.likes.length > 0);
  assert.ok(a.deine_rechte.length >= 5);
});
