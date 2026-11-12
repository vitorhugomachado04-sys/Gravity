import test from "node:test";
import assert from "node:assert/strict";
import { Campaign } from "../js/campaign.js";
import { STAGES } from "../js/stages.js";
import { createScenery } from "../js/scenery.js";
import { project } from "../js/projection.js";
import { projectedFace } from "../js/planets.js";
const silent = { fx() {} },
  idle = { x: 0, y: 0, fire: false };
test("all five full-length stages complete, transition in order and keep equipment", () => {
  const campaign = new Campaign(silent);
  assert.equal(campaign.advance(), false);
  for (let index = 0; index < 5; index++) {
    const w = campaign.world;
    assert.equal(w.stage.id, STAGES[index].id);
    w.weapon = 3;
    w.missiles = 5;
    let maxObjects = 0;
    for (let i = 0; i < 7000 && w.status === "playing"; i++) {
      w.shield = 10;
      w.update(1 / 60, idle);
      maxObjects = Math.max(maxObjects, w.entities.length + w.bullets.length);
    }
    assert.equal(w.status, "clear");
    assert.ok(maxObjects < 50);
    const score = w.score,
      weapon = w.weapon,
      missiles = w.missiles;
    if (index < 4) {
      assert.equal(campaign.advance(), true);
      assert.equal(campaign.world.score, score);
      assert.equal(campaign.world.weapon, weapon);
      assert.equal(campaign.world.missiles, missiles);
      assert.equal(campaign.world.distance, 0);
      assert.equal(campaign.world.status, "playing");
      assert.equal(campaign.world.bullets.length, 0);
    } else assert.equal(campaign.advance(), false);
  }
  assert.equal(campaign.hasNext, false);
});
test("stage replay restores entrance snapshot without farming points; new run resets Moon", () => {
  const campaign = new Campaign(silent);
  campaign.world.status = "clear";
  campaign.world.score = 4321;
  campaign.world.weapon = 2;
  campaign.world.lives = 2;
  campaign.world.missiles = 7;
  campaign.advance();
  campaign.world.score += 3000;
  campaign.world.lives = 0;
  campaign.world.missiles = 0;
  campaign.world.status = "over";
  campaign.restart();
  assert.equal(campaign.world.stage.id, "earth");
  assert.equal(campaign.world.score, 4321);
  assert.equal(campaign.world.lives, 2);
  assert.equal(campaign.world.missiles, 7);
  assert.equal(campaign.world.weapon, 2);
  campaign.start();
  assert.equal(campaign.world.stage.id, "moon");
  assert.equal(campaign.world.score, 0);
  assert.equal(campaign.world.lives, 3);
});
test("each world has distinct actual geometry, not just another ground pattern", () => {
  const expected = [
    ["crater", "rock"],
    ["tower", "platform"],
    ["mesa", "canyon"],
    ["cloud", "fog", "antenna"],
    [],
  ];
  STAGES.forEach((stage, i) => {
    const scenery = createScenery(stage);
    assert.ok(scenery.length < 300);
    for (const type of expected[i])
      assert.ok(
        scenery.some((e) => e.type === type),
        `${stage.id}: ${type}`,
      );
    for (const e of scenery)
      assert.ok(Number.isFinite(e.x) && Number.isFinite(e.s));
  });
});
test("elevated geometry emerges before its base and clips at curved horizon", () => {
  const base = project(0, 155, 0),
    top = project(0, 155, 45);
  assert.equal(base.visible, false);
  assert.equal(top.visible, true);
  const points = projectedFace(
    [
      { x: -5, s: 155, h: 0 },
      { x: 5, s: 155, h: 0 },
      { x: 5, s: 155, h: 45 },
      { x: -5, s: 155, h: 45 },
    ],
    0,
    0,
  );
  assert.ok(points.length >= 3);
  assert.ok(points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)));
});
