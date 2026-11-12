import test from "node:test";
import assert from "node:assert/strict";
import { World } from "../js/world.js";
import { ENEMIES, sweptHit } from "../js/combat.js";
import { MOON } from "../js/config.js";
import { createScenery, footprintsOverlap, craterRim } from "../js/scenery.js";
import { clipLine, surfaceAt } from "../js/projection.js";
const silent = { fx() {} },
  idle = { x: 0, y: 0, fire: false };
function isolated() {
  const w = new World(silent);
  w.nextWave = Infinity;
  w.nextPickup = Infinity;
  return w;
}
test("regression: winged satellite spawns as a finite-health enemy", () => {
  const w = new World(silent);
  w.distance = 100;
  w.spawn();
  const e = w.entities.find((e) => e.type === "satellite");
  assert.ok(e);
  assert.equal(e.kind, "enemy");
  assert.equal(e.hp, 2);
});
for (const type of Object.keys(ENEMIES))
  test(`${type}: lasers register damage, destroy, score once and remove`, () => {
    const w = isolated(),
      spec = ENEMIES[type],
      e = {
        kind: "enemy",
        type,
        x: 0,
        baseX: 0,
        s: 50,
        h: 9,
        phase: 0,
        hp: spec.hp,
        shot: true,
      };
    w.entities = [e];
    for (let shot = 0; shot < spec.hp; shot++) {
      // Actual target pose, with lateral motion still enabled during the step.
      w.bullets.push({
        kind: "laser",
        x: e.x,
        s: e.s - 2,
        h: e.h,
        v: 240,
        vx: 0,
        life: 2,
      });
      w.update(1 / 60, idle);
      assert.equal(e.hp, spec.hp - shot - 1);
    }
    assert.equal(w.kills, 1);
    assert.equal(w.entities.length, 0);
    assert.ok(w.score >= spec.points && w.score < spec.points + 2);
    assert.ok(w.particles.length >= 12);
    w.update(1 / 60, idle);
    assert.equal(w.kills, 1);
  });
test("satellite still damages player on a valid body collision", () => {
  const w = isolated();
  w.entities = [
    {
      kind: "enemy",
      type: "satellite",
      x: 0,
      baseX: 0,
      s: 8,
      h: 10,
      phase: 0,
      hp: 2,
    },
  ];
  w.update(1 / 60, idle);
  assert.equal(w.lives, 2);
});
test("relative swept collision catches motion but rejects wrong altitude/depth", () => {
  const half = { x: 2, s: 2, h: 2 },
    a = { x: 0, s: 10, h: 9 },
    b = { x: 0, s: 30, h: 9 };
  assert.equal(
    sweptHit(a, b, { x: -4, s: 20, h: 9 }, { x: 4, s: 20, h: 9 }, half),
    true,
  );
  assert.equal(
    sweptHit(a, b, { x: 0, s: 20, h: 15 }, { x: 0, s: 20, h: 15 }, half),
    false,
  );
  assert.equal(
    sweptHit(a, b, { x: 0, s: 40, h: 9 }, { x: 0, s: 40, h: 9 }, half),
    false,
  );
});
test("lunar footprints are sparse, deterministic, separated and keep pyramids", () => {
  const items = createScenery(MOON);
  assert.deepEqual(items, createScenery(MOON));
  assert.ok(items.some((e) => e.type === "rock"));
  const craters = items.filter((e) => e.type === "crater");
  assert.ok(craters.length < 65);
  assert.ok(craters.length > 15);
  for (let i = 0; i < craters.length; i++)
    for (let j = i + 1; j < craters.length; j++)
      assert.equal(footprintsOverlap(craters[i], craters[j], 14), false);
  assert.ok(craters.every((e) => Math.abs(e.x) <= 70));
});
test("side crater rim vertices project back to real spherical footprints", () => {
  for (const x of [-65, 0, 65]) {
    const e = { x, s: 65, size: 8 };
    const rim = craterRim(e, 0);
    assert.ok(rim.some((p) => p.visible));
    rim.forEach((p, i) => {
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
      if (!p.visible) return;
      const actual = surfaceAt(p.x, p.y),
        a = (i / 48) * Math.PI * 2;
      assert.ok(Math.abs(actual.x - (x + 8 * Math.cos(a))) < 0.001);
      assert.ok(Math.abs(actual.z - (65 + 8 * Math.sin(a))) < 0.001);
    });
  }
});
test("clipping bounds side/near geometry and rejects invisible segments", () => {
  assert.deepEqual(clipLine(-10000, 100, 10000, 100), [0, 100, 239, 100]);
  assert.equal(clipLine(-20, 0, -10, 200), null);
  assert.equal(clipLine(NaN, 0, 10, 10), null);
});
test("dangerous crater generation never intersects decorative footprints", () => {
  const w = new World(silent);
  for (let i = 0; i < 6500; i++) {
    w.shield = 10;
    w.update(1 / 60, idle);
    for (const e of w.entities.filter((e) => e.type === "crater"))
      assert.ok(w.scenery.every((other) => !footprintsOverlap(e, other)));
  }
});
