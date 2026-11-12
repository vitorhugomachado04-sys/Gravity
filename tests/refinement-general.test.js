import test from "node:test";
import assert from "node:assert/strict";
import { STAGES } from "../js/stages.js?v=2.3.2";
import { createScenery, footprintsOverlap } from "../js/scenery.js?v=2.3.2";
import { urbanMaterial, structureHit, structureParts } from "../js/urban.js?v=2.3.2";
const pose = (s, h, x = 0) => ({ x, s, h });
test("Moon: narrower distribution, fewer craters and retained pyramids", () => {
  const items = createScenery(STAGES[0]),
    craters = items.filter((e) => e.type === "crater");
  assert.ok(craters.length < 35);
  assert.ok(craters.every((e) => Math.abs(e.x) <= 26));
  assert.ok(items.some((e) => e.type === "rock"));
  for (let i = 0; i < craters.length; i++)
    for (let j = i + 1; j < craters.length; j++)
      assert.equal(footprintsOverlap(craters[i], craters[j], 20), false);
});
test("Earth: coherent road/sidewalk/park/parking plan and buildings inside blocks", () => {
  assert.equal(urbanMaterial(2, 35), "road");
  assert.equal(urbanMaterial(25, 2), "road");
  assert.equal(urbanMaterial(10, 35), "sidewalk");
  assert.equal(urbanMaterial(-25, 22), "park");
  assert.equal(urbanMaterial(25, 22), "parking");
  for (const e of createScenery(STAGES[1]).filter((e) =>
    ["tower", "lowrise"].includes(e.type),
  ))
    for (const x of [-e.size, e.size])
      for (const z of [-e.size, e.size])
        assert.equal(urbanMaterial(e.x + x, e.s + z), "block");
});
test("Earth: pass UNDER the actual bridge opening; collide with deck and supports", () => {
  const e = { type: "bridge", x: 0, s: 50 };
  assert.equal(structureHit(pose(43, 6), pose(57, 6), e), false);
  assert.equal(structureHit(pose(43, 13), pose(57, 13), e), true);
  assert.equal(structureHit(pose(43, 6, 28), pose(57, 6, 28), e), true);
  assert.equal(structureParts("bridge").length, 3);
});
test("Earth: pass ABOVE low structures; same lateral/depth position at low altitude hits", () => {
  const e = { type: "lowgate", x: 0, s: 50 };
  assert.equal(structureHit(pose(43, 13), pose(57, 13), e), false);
  assert.equal(structureHit(pose(43, 7), pose(57, 7), e), true);
  assert.equal(structureHit(pose(10, 7), pose(20, 7), e), false);
});
test("Mars: no lunar pyramids; occasional small craters avoid all formations", () => {
  const items = createScenery(STAGES[2]),
    craters = items.filter((e) => e.type === "crater");
  assert.ok(!items.some((e) => e.type === "rock"));
  assert.ok(!STAGES[2].obstacles.includes("rock"));
  assert.ok(craters.length > 0 && craters.length < 14);
  assert.ok(craters.every((e) => e.size <= 4));
  for (const e of craters)
    for (const other of items)
      if (e !== other) assert.equal(footprintsOverlap(e, other, 6), false);
});

import { World } from "../js/world.js?v=2.3.2";
import { cloudRayPoint, cloudPose, cloudOccludes } from "../js/atmosphere.js?v=2.3.2";
import {
  formation,
  hostileVolley,
  waveSpacing,
  COMBAT_LIMITS,
} from "../js/encounters.js?v=2.3.2";
import { ringPoint, ringSamples, RING_RADII } from "../js/rings.js?v=2.3.2";
import { C } from "../js/config.js?v=2.3.2";
test("Neptune fog hides ship only where camera ray crosses a higher cloud", () => {
  const player = { x: 0, h: 8 },
    hit = cloudRayPoint(player, 100, 25),
    cloud = {
      type: "fog",
      x: hit.x,
      s: hit.s,
      h: 25,
      size: 30,
      depth: 6,
      seed: 0,
    };
  assert.equal(cloudOccludes(cloud, player, 100, 0), true);
  assert.equal(
    cloudOccludes({ ...cloud, s: cloud.s + 30 }, player, 100, 0),
    false,
  );
  assert.equal(cloudOccludes({ ...cloud, h: 5 }, player, 100, 0), false);
  assert.notDeepEqual(cloudPose(cloud, 1), cloudPose(cloud, 10));
});
test("Neptune keeps cloud layers, adds sparse antennas and removes lightning objects", () => {
  const scene = createScenery(STAGES[3]);
  assert.ok(scene.some((e) => e.type === "cloud"));
  assert.ok(
    new Set(scene.filter((e) => e.type === "fog").map((e) => e.h)).size >= 3,
  );
  assert.ok(scene.filter((e) => e.type === "antenna").length < 12);
  assert.ok(!scene.some((e) => e.type === "storm"));
});
test("intense volleys reserve a real gap and never home after launch", () => {
  for (const theme of ["neptune", "saturn"])
    for (let wave = 0; wave < 9; wave++)
      for (const x of [-22, 0, 22]) {
        const group = formation(theme, 0.8, wave, 95);
        assert.ok(group.length >= 3);
        for (const e of group)
          for (const b of hostileVolley(e, { x, h: 8 }, 0, 30)) {
            assert.ok(Math.abs(b.targetX - b.safeX) >= 7);
            assert.ok(Number.isFinite(b.vx) && Number.isFinite(b.vh));
            assert.equal(b.target, undefined);
          }
      }
  assert.ok(waveSpacing("saturn", 0.7, 3) > waveSpacing("saturn", 0.7, 2) + 50);
});
for (const stage of STAGES.slice(3))
  test(`${stage.name}: full intense combat has bounded pools, visible gaps and short fog occlusion`, () => {
    const world = new World({ fx() {} }, stage),
      seen = new Set();
    let peak = 0,
      streak = 0,
      longest = 0;
    for (let i = 0; i < 7000 && world.status === "playing"; i++) {
      world.shield = 10;
      world.update(1 / 60, { x: 0, y: 0, fire: true });
      const enemies = world.entities.filter((e) => e.kind === "enemy"),
        bullets = world.bullets.filter((b) => b.kind === "enemy");
      peak = Math.max(peak, enemies.length);
      assert.ok(enemies.length <= COMBAT_LIMITS.enemies);
      assert.ok(bullets.length <= COMBAT_LIMITS.enemyBullets);
      assert.ok(world.particles.length <= COMBAT_LIMITS.particles);
      if (stage.id === "saturn")
        assert.ok(world.entities.every((e) => e.kind !== "obstacle"));
      for (const b of bullets) {
        seen.add(b);
        assert.ok(Math.abs(b.targetX - b.safeX) >= 7);
      }
      const hidden = world.scenery.some(
        (e) =>
          e.type === "fog" &&
          cloudOccludes(e, world.player, world.distance, world.time),
      );
      streak = hidden ? streak + 1 : 0;
      longest = Math.max(longest, streak);
    }
    assert.equal(world.status, "clear");
    assert.ok(peak >= 4);
    assert.ok(seen.size > 80);
    assert.ok(longest / 60 < 1);
  });
test("Saturn has no physical scenery or obstacle list", () => {
  assert.deepEqual(createScenery(STAGES[4]), []);
  assert.deepEqual(STAGES[4].obstacles, []);
});
test("Saturn rings are planet-centered world circles with occluded and off-screen portions", () => {
  for (const radius of RING_RADII) {
    assert.ok(radius > C.radius * 1.8);
    for (let a = 0; a < 6.3; a += 0.3) {
      const p = ringPoint(radius, a);
      assert.ok(Math.abs(Math.hypot(p.x, p.y, p.z) - radius) < 1e-7);
    }
    const ps = ringSamples(radius);
    assert.ok(ps.some((p) => !p.visible));
    assert.ok(ps.some((p) => p.visible && p.x < 0));
    assert.ok(ps.some((p) => p.visible && p.x > 240));
    assert.ok(ps.some((p) => p.visible && p.x > 0 && p.x < 240));
    assert.notEqual(ringSamples(radius, 20)[70].x, ps[70].x);
  }
});
test("Earth world integration: altitude controls damage while crossing structures", () => {
  for (const [type, h, hit] of [
    ["bridge", 6, false],
    ["bridge", 13, true],
    ["lowgate", 13, false],
    ["lowgate", 7, true],
  ]) {
    const world = new World({ fx() {} }, STAGES[1]);
    world.nextWave = Infinity;
    world.nextPickup = Infinity;
    world.player.h = h;
    world.entities = [{ kind: "obstacle", type, x: 0, s: 22, h: 0 }];
    for (let i = 0; i < 120; i++)
      world.update(1 / 60, { x: 0, y: 0, fire: false });
    assert.equal(world.lives, hit ? 2 : 3, `${type} at h=${h}`);
    assert.equal(world.entities.length, 0);
  }
});
