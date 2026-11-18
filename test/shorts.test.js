import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import { randomAvatar } from '../public/shared/avatar.js';

const setup = () => {
  const r = G.createRoom('SHRT');
  const ps = Array.from({ length: 4 }, (_, i) => G.actions.join(r, null, { email: `user${i}x`, avatar: randomAvatar(), consent: { agb: true } }));
  G.actions.setPhase(r, null, { phase: 'shorts' });
  return { r, ps };
};

test('Shorts: Feed verengt sich allein durch Wiedergabezeit, Werbung jeder 5. Clip', () => {
  const r = G.createRoom('SHRT');
  const ps = Array.from({ length: 20 }, (_, i) => G.actions.join(r, null, { email: `user${i}x`, avatar: randomAvatar(), consent: { agb: true } }));
  G.actions.setPhase(r, null, { phase: 'shorts' });
  let tops = 0, first = 0, last = 0;
  for (const p of ps) {
    // Nur Technik lange anschauen, alles andere schnell wegwischen
    for (let k = 0; k < 40; k++) {
      const cur = G.nextShorts(p, 1)[0];
      G.actions.shortWatched(r, p, { id: cur.id, ms: cur.ad ? 3000 : cur.cat === 'technik' ? cur.ms : 500 });
    }
    const st = G.shortsStats(p);
    assert.equal(st.count, 40);
    assert.equal(st.ads, 8, 'jeder 5. Clip ist Werbung');
    assert.equal(p.likes.length, 0, 'kein einziges Like nötig');
    if (st.top === 'technik') tops++;
    first += st.firstShare; last += st.lastShare;
  }
  assert.ok(tops >= 18, `Technik als Hauptthema erkannt bei ${tops}/20`);
  assert.ok(last / 20 > first / 20 + 0.2, `Verengung im Schnitt: ${(first / 20).toFixed(2)} → ${(last / 20).toFixed(2)}`);
});

test('Shorts: nur der aktuelle Clip zählt, Zeit wird begrenzt, Stopp sperrt', () => {
  const { r, ps } = setup();
  const p = ps[1];
  const [a, b] = G.nextShorts(p, 2);
  G.actions.shortWatched(r, p, { id: b.id, ms: 5000 });
  assert.equal(G.shortsStats(p).count, 0, 'übersprungener Clip zählt nicht');
  G.actions.shortWatched(r, p, { id: a.id, ms: 9e9 });
  assert.ok(G.shortsStats(p).totalMs <= a.ms + 500);
  G.actions.shortsStop(r, null, { value: true });
  const c = G.nextShorts(p, 1)[0];
  G.actions.shortWatched(r, p, { id: c.id, ms: 1000 });
  assert.equal(G.shortsStats(p).count, 1);
  assert.ok(G.playerView(r, p).shorts.stats, 'nach dem Stopp gibt es die Auswertung');
});

test('Innehalten: Frage starten, antworten, auflösen; Phasenwechsel beendet', () => {
  const { r, ps } = setup();
  G.actions.pauseStart(r, null, { i: 99 });
  assert.equal(r.pause, null, 'ungültige Frage');
  G.actions.pauseStart(r, null, { i: 1 });
  G.actions.pauseAnswer(r, ps[0], { value: 1 });
  G.actions.pauseAnswer(r, ps[1], { value: 7 });
  G.actions.pauseAnswer(r, ps[2], { value: '1' });
  let pv = G.playerView(r, ps[0]).pause;
  assert.equal(pv.my, 1); assert.equal(pv.counts, undefined, 'vor dem Auflösen keine Verteilung auf dem Handy');
  const sv = G.staffView(r, { forBeamer: true }).pause;
  assert.deepEqual(sv.counts, [0, 1, 0, 0]); assert.equal(sv.insight, null);
  G.actions.pauseReveal(r, null, {});
  pv = G.playerView(r, ps[0]).pause;
  assert.equal(pv.correct, 1); assert.ok(pv.insight);
  G.actions.pauseAnswer(r, ps[3], { value: 0 });
  assert.equal(G.staffView(r).pause.answered, 1, 'nach dem Auflösen keine Antworten mehr');
  G.actions.setPhase(r, null, { phase: 'wahl' });
  assert.equal(G.playerView(r, ps[0]).pause, null);
});
