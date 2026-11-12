import test from "node:test";
import assert from "node:assert/strict";
import { expeditionIndex, CheatSequence } from "../js/cheats.js";
import { Campaign } from "../js/campaign.js";
import { foregroundFace, drawBridgeOcclusion } from "../js/planets.js";
import { project } from "../js/projection.js";
import { C } from "../js/config.js";
test("codes accept all five stages, mixed case and reject invalid entries", () => {
  for (let n = 1; n <= 5; n++)
    assert.equal(expeditionIndex(` Expedition${n} `), n - 1);
  for (const code of ["expedition0", "expedition6", "expedition22", "blah"])
    assert.equal(expeditionIndex(code), null);
  const seq = new CheatSequence();
  let result;
  for (const key of "expedition5") result = seq.feed(key, 100);
  assert.equal(result.index, 4);
  seq.feed("e", 200);
  assert.equal(seq.feed("x", 6000).consumed, false);
});
test("jump loads requested world fresh, replay and normal progression still work", () => {
  const c = new Campaign({ fx() {} });
  for (let i = 0; i < 5; i++) {
    c.world.score = 500;
    c.world.lives = 0;
    assert.equal(c.jump(i), true);
    assert.equal(c.index, i);
    assert.equal(c.world.score, 0);
    assert.equal(c.world.lives, 3);
    c.restart();
    assert.equal(c.index, i);
  }
  assert.equal(c.jump(5), false);
  assert.equal(c.index, 4);
  c.jump(1);
  c.world.status = "clear";
  assert.equal(c.advance(), true);
  assert.equal(c.index, 2);
});
test("bridge depth clipping retains foreground surfaces only", () => {
  const face = [
    { x: 0, y: 0, k: 1 },
    { x: 10, y: 0, k: 3 },
    { x: 10, y: 10, k: 3 },
    { x: 0, y: 10, k: 1 },
  ];
  const clipped = foregroundFace(face, 2);
  assert.ok(clipped.every((p) => p.x >= 5 && p.k >= 2));
  assert.deepEqual(foregroundFace(face, 4), []);
  const pilot = { x: 0, h: 6 },
    ship = project(0, C.near, 6, 0);
  let faces = [];
  const renderer = { polygon: (ps) => faces.push(ps) };
  drawBridgeOcclusion(renderer, { x: 0, s: 80 }, 0, pilot, ship);
  assert.equal(faces.length, 0);
  drawBridgeOcclusion(renderer, { x: 0, s: 4 }, 0, pilot, ship);
  assert.ok(faces.length > 0);
  assert.ok(faces.flat().every((p) => p.k >= ship.k - 1e-9));
});
