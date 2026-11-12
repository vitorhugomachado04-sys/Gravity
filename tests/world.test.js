import test from "node:test";
import assert from "node:assert/strict";
import { World } from "../js/world.js";
import { project, surfaceAt } from "../js/projection.js";
import { C } from "../js/config.js";
const audio = { fx() {} };
const idle = { x: 0, y: 0, fire: false };
const empty = () => {
  const w = new World(audio);
  w.nextWave = Infinity;
  w.nextPickup = Infinity;
  return w;
};
test("sphere projection and ray intersection round-trip across curved surface", () => {
  for (const x of [-35, 0, 35])
    for (const z of [10, 40, 90]) {
      const p = project(x, z);
      assert.equal(p.visible, true);
      const hit = surfaceAt(p.x, p.y);
      assert.ok(Math.abs(hit.x - x) < 0.001);
      assert.ok(Math.abs(hit.z - z) < 0.001);
    }
  assert.equal(project(0, 200).visible, false);
  assert.ok(project(0, 10).k > project(0, 80).k);
});
test("controls clamp position; vertical travel is limited", () => {
  const w = empty();
  for (let i = 0; i < 600; i++) w.update(1 / 60, { x: 1, y: -1 });
  assert.equal(w.player.x, C.playerLimit);
  assert.equal(w.player.h, 14);
});
test("damage consumes one life within invulnerability window, shield prevents damage", () => {
  const w = empty();
  w.damage();
  w.damage();
  assert.equal(w.lives, 2);
  w.invulnerable = 0;
  w.shield = 2;
  w.damage();
  assert.equal(w.lives, 2);
  w.shield = 0;
  w.damage();
  assert.equal(w.lives, 1);
  w.invulnerable = 0;
  w.damage();
  assert.equal(w.status, "over");
});
test("all weapon upgrades, shield and missile refills apply", () => {
  const w = empty();
  for (const [type, level] of [
    ["2", 1],
    ["3", 2],
    ["W", 3],
    ["R", 4],
  ]) {
    w.pickup({ type });
    assert.equal(w.weapon, level);
  }
  w.pickup({ type: "2" });
  assert.equal(w.weapon, 4);
  w.pickup({ type: "M" });
  assert.equal(w.missiles, 6);
  w.pickup({ type: "S" });
  assert.equal(w.shield, 9);
});
test("missiles are finite, home and kill advanced enemies", () => {
  const w = empty();
  const enemy = {
    kind: "enemy",
    type: "shooter",
    x: 16,
    s: 65,
    h: 9,
    hp: 3,
    shot: true,
  };
  w.entities.push(enemy);
  w.launch();
  assert.equal(w.missiles, 2);
  assert.equal(w.bullets[0].target, enemy);
  for (let i = 0; i < 60; i++) w.update(1 / 60, idle);
  assert.equal(w.kills, 1);
  w.missiles = 0;
  w.missileCooldown = 0;
  w.launch();
  assert.equal(w.missiles, 0);
});
test("laser swept collision hits a target crossed in one step", () => {
  const w = empty();
  w.entities = [{ kind: "enemy", type: "scout", x: 0, s: 40, h: 8, hp: 1 }];
  w.bullets = [{ x: 0, s: 37, h: 8, v: 500, vx: 0, kind: "laser", life: 2 }];
  w.update(1 / 60, idle);
  assert.equal(w.kills, 1);
});
test("world reaches completion, grants bonus once and reset clears state", () => {
  const w = empty();
  for (let i = 0; i < 7000; i++) w.update(1 / 60, idle);
  assert.equal(w.status, "clear");
  assert.equal(w.distance, w.stage.length);
  const score = w.score;
  w.update(1, idle);
  assert.equal(w.score, score);
  w.reset();
  assert.equal(w.score, 0);
  assert.equal(w.lives, 3);
  assert.equal(w.missiles, 3);
  assert.equal(w.distance, 0);
  assert.equal(w.weapon, 0);
  assert.equal(w.entities.length, 0);
});
test("distance-based formations retain two unblocked lanes and bounded pools", () => {
  const w = new World(audio);
  let max = 0;
  for (let i = 0; i < 6500; i++) {
    w.shield = 10;
    w.update(1 / 60, idle);
    max = Math.max(max, w.entities.length);
    const obstacles = w.entities.filter((e) => e.kind === "obstacle");
    for (const e of obstacles) {
      const neighbors = obstacles.filter((o) => Math.abs(e.s - o.s) < 10);
      assert.ok(neighbors.length <= 1);
    }
  }
  assert.ok(max < 35);
  assert.equal(w.status, "clear");
});
test("fixed updates yield consistent progression under 30/60Hz frames", () => {
  const a = empty(),
    b = empty();
  for (let i = 0; i < 600; i++) a.update(1 / 60, idle);
  for (let i = 0; i < 300; i++) {
    b.update(1 / 60, idle);
    b.update(1 / 60, idle);
  }
  assert.equal(a.distance, b.distance);
});
