import { World } from "./world.js?v=2.3.2";
import { STAGES } from "./stages.js?v=2.3.2";
const LOADOUT = ["score", "kills", "lives", "missiles", "weapon"];
export class Campaign {
  constructor(audio, stages = STAGES) {
    this.audio = audio;
    this.stages = stages;
    this.start();
  }
  start() {
    this.index = 0;
    this.checkpoint = null;
    this.load();
  }
  jump(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.stages.length)
      return false;
    this.index = index;
    this.checkpoint = null;
    this.load();
    return true;
  }
  load() {
    this.audio.setStage?.(this.stages[this.index].id);
    this.world = new World(this.audio, this.stages[this.index]);
    if (this.checkpoint)
      for (const key of LOADOUT) this.world[key] = this.checkpoint[key];
  }
  get hasNext() {
    return this.index < this.stages.length - 1;
  }
  advance() {
    if (this.world.status !== "clear" || !this.hasNext) return false;
    this.checkpoint = Object.fromEntries(
      LOADOUT.map((key) => [key, this.world[key]]),
    );
    this.index++;
    this.load();
    return true;
  }
  // Replaying rolls back score and equipment to the stage entrance; no bonus farming.
  restart() {
    this.load();
  }
}
