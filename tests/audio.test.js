import test from "node:test";
import assert from "node:assert/strict";
import { SCORES, scoreEvents } from "../js/score.js?v=2.3.2";
import { AudioSystem } from "../js/audio.js?v=2.3.2";
import { Campaign } from "../js/campaign.js?v=2.3.2";
test("five original scores have distinct arrangements and bounded, finite events", () => {
  const signatures = new Set();
  for (const id of Object.keys(SCORES)) {
    const phrase = Array.from({ length: 256 }, (_, i) => scoreEvents(id, i));
    signatures.add(JSON.stringify(phrase));
    for (const events of phrase) {
      assert.ok(events.length <= 8);
      for (const e of events) {
        assert.ok(e.freq > 0 && Number.isFinite(e.freq));
        assert.ok(e.duration > 0.006 && e.duration < 3);
        assert.ok(e.volume > 0 && e.volume <= 0.04);
        assert.ok(e.end > 0);
      }
    }
    assert.deepEqual(scoreEvents(id, 0), scoreEvents(id, 256));
  }
  assert.equal(signatures.size, 5);
});
test("audio clock schedules ahead, mutes, pauses without backlog and resets on stage change", () => {
  const audio = new AudioSystem();
  audio.context = { state: "running", currentTime: 1 };
  audio.music = true;
  const notes = [];
  audio.musicTone = (e, t) => notes.push({ e, t });
  audio.update(0.016);
  assert.ok(notes.length);
  assert.ok(notes.every((n) => n.t >= 1));
  const count = notes.length;
  audio.music = false;
  audio.context.currentTime = 3;
  audio.update(0.016);
  assert.equal(notes.length, count);
  audio.stopMusic();
  audio.music = true;
  audio.context.currentTime = 100;
  audio.update(0.016);
  assert.ok(notes.slice(count).every((n) => n.t >= 100));
  audio.setStage("mars");
  assert.equal(audio.step, 0);
  assert.equal(audio.stage, "mars");
  assert.equal(audio.nextNote, null);
});
test("campaign chooses soundtrack for start, jump, replay and progression", () => {
  const selected = [];
  const campaign = new Campaign({
    fx() {},
    setStage: (id) => selected.push(id),
  });
  campaign.jump(3);
  campaign.restart();
  campaign.world.status = "clear";
  campaign.advance();
  campaign.start();
  assert.deepEqual(selected, ["moon", "neptune", "neptune", "saturn", "moon"]);
});
