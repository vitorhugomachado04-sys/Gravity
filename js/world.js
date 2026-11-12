import { C, MOON, clamp, random } from "./config.js";
import { createScenery, footprintsOverlap } from "./scenery.js";
import { ENEMIES, sweptHit } from "./combat.js";
import {
  formation,
  waveSpacing,
  hostileVolley,
  COMBAT_LIMITS,
} from "./encounters.js";
import { structureHit } from "./urban.js";
export class World {
  constructor(audio, stage = MOON) {
    this.audio = audio;
    this.stage = stage;
    this.reset();
  }
  reset() {
    this.distance = 0;
    this.time = 0;
    this.score = 0;
    this.kills = 0;
    this.lives = 3;
    this.missiles = 3;
    this.weapon = 0;
    this.shield = 0;
    this.invulnerable = 0;
    this.player = { x: 0, h: 8, vx: 0, vh: 0 };
    this.entities = [];
    this.scenery = createScenery(this.stage);
    this.bullets = [];
    this.particles = [];
    this.nextWave = this.stage.combat ? 125 : 85;
    this.nextPickup = 125;
    this.pickupIndex = 0;
    this.cooldown = 0;
    this.missileCooldown = 0;
    this.status = "playing";
    this.rng = random(this.stage.seed);
    this.wave = 0;
    this.notice = `STAGE ${String(this.stage.number || 1).padStart(2, "0")} / ${this.stage.name}`;
    this.noticeTime = 3;
  }
  spawn() {
    const rng = this.rng,
      p = this.distance / this.stage.length;
    // One blocked lane per wave, with at least two clear lanes. World-space
    // separation exceeds projectile/collision windows even at maximum speed.
    while (
      this.distance + 135 > this.nextWave &&
      this.nextWave < this.stage.length - 50
    ) {
      if (this.stage.combat) {
        const group = formation(this.stage.theme, p, this.wave, this.nextWave);
        if (
          this.entities.filter((e) => e.kind === "enemy").length +
            group.length <=
          COMBAT_LIMITS.enemies
        )
          this.entities.push(...group);
        if (this.stage.theme === "neptune" && this.wave % 4 === 2) {
          const x = group[0].safeX === -16 ? 18 : -18;
          this.entities.push({
            kind: "obstacle",
            type: "antenna",
            x,
            baseX: x,
            s: this.nextWave + 24,
            h: 0,
            height: 26,
            size: 4,
            hp: Infinity,
          });
        }
        this.nextWave += waveSpacing(this.stage.theme, p, this.wave);
        this.wave++;
        continue;
      }
      const s = this.nextWave,
        lane = Math.floor(rng() * 3) - 1,
        requestedType = (this.stage.obstacles || [
          "rock",
          "crater",
          "satellite",
          "barrier",
        ])[this.wave % (this.stage.obstacles?.length || 4)];
      const type =
        requestedType === "crater" &&
        this.scenery.some((e) =>
          footprintsOverlap({ x: lane * 18, s, size: 5 }, e),
        )
          ? "rock"
          : requestedType;
      this.entities.push({
        kind: type === "satellite" ? "enemy" : "obstacle",
        type,
        x: ["bridge", "lowgate"].includes(type) ? 0 : lane * 18,
        baseX: ["bridge", "lowgate"].includes(type) ? 0 : lane * 18,
        s,
        h:
          type === "satellite"
            ? 10
            : ["storm", "vortex", "floatBarrier", "debris"].includes(type)
              ? 5
              : 0,
        phase: rng() * 6,
        hp: ENEMIES[type]?.hp ?? Infinity,
      });
      if (this.wave > 1) {
        const enemyLane = lane === 0 ? (rng() < 0.5 ? -1 : 1) : 0,
          type = ["scout", "zigzag", "shooter"][
            Math.floor(rng() * (p < 0.2 ? 1 : 3))
          ];
        this.entities.push({
          kind: "enemy",
          type,
          x: enemyLane * 18,
          baseX: enemyLane * 18,
          s: s + 17,
          h: 9,
          phase: rng() * 6,
          hp: ENEMIES[type].hp,
          shot: false,
        });
      }
      this.nextWave += 43 - 10 * p;
      this.wave++;
    }
    while (
      this.distance + 130 > this.nextPickup &&
      this.nextPickup < this.stage.length - 30
    ) {
      const type = ["2", "3", "W", "R", "M", "S"][this.pickupIndex++ % 6];
      const blocked = this.entities
        .filter(
          (e) => e.kind === "obstacle" && Math.abs(e.s - this.nextPickup) < 14,
        )
        .map((e) => e.baseX);
      const lanes = [-18, 0, 18].filter((x) =>
        blocked.every((b) => Math.abs(b - x) > 10),
      );
      const x = lanes[Math.floor(rng() * lanes.length)] ?? 0;
      this.entities.push({ kind: "pickup", type, x, s: this.nextPickup, h: 8 });
      this.nextPickup += 165;
    }
  }
  fire() {
    const offsets =
      this.weapon === 0 ? [0] : this.weapon === 1 ? [-1.8, 1.8] : [-3, 0, 3];
    for (const x of offsets)
      this.bullets.push({
        x: this.player.x + x,
        s: this.distance + C.near + 2,
        h: this.player.h,
        vx: this.weapon >= 3 ? x * 2.5 : 0,
        v: 140,
        kind: "laser",
        life: 2,
      });
    this.audio.fx("shot");
  }
  launch() {
    if (this.missiles <= 0 || this.missileCooldown > 0) return;
    this.missiles--;
    this.missileCooldown = 0.4;
    const targets = this.entities
      .filter((e) => e.kind === "enemy" && e.s > this.distance + 10)
      .sort((a, b) => a.s - b.s);
    this.bullets.push({
      x: this.player.x,
      s: this.distance + C.near,
      h: this.player.h,
      vx: 0,
      v: 105,
      kind: "missile",
      life: 3,
      target: targets[0],
    });
    this.burst(this.player.x, this.distance + C.near, this.player.h, 6);
    this.audio.fx("missile");
  }
  burst(x, s, h, n = 12) {
    const count = Math.min(n, COMBAT_LIMITS.particles - this.particles.length);
    for (let i = 0; i < count; i++)
      this.particles.push({
        x,
        s,
        h,
        vx: (this.rng() - 0.5) * 24,
        vs: (this.rng() - 0.5) * 20,
        vh: this.rng() * 16,
        life: 0.3 + this.rng() * 0.35,
      });
  }
  damage() {
    if (this.invulnerable > 0 || this.shield > 0) return;
    this.lives--;
    this.invulnerable = C.invulnerability;
    this.burst(this.player.x, this.distance + C.near, this.player.h);
    this.audio.fx("hit");
    if (this.lives <= 0) {
      this.status = "over";
      this.audio.fx("over");
    }
  }
  pickup(e) {
    if ("23WR".includes(e.type)) {
      const level = { 2: 1, 3: 2, W: 3, R: 4 }[e.type];
      this.weapon = Math.max(this.weapon, level);
    }
    if (e.type === "M") this.missiles = Math.min(99, this.missiles + 3);
    if (e.type === "S") this.shield = 9;
    this.score += 50;
    this.notice = {
      2: "DOUBLE SHOT",
      3: "TRIPLE SHOT",
      W: "WIDE SHOT",
      R: "RAPID FIRE",
      M: "+3 MISSILES",
      S: "SHIELD ONLINE",
    }[e.type];
    this.noticeTime = 2;
    this.audio.fx("pickup");
  }
  update(dt, input, special = false) {
    if (this.status !== "playing") return;
    const previousPlayer = {
      x: this.player.x,
      s: this.distance + C.near,
      h: this.player.h,
    };
    this.time += dt;
    const speed =
        this.stage.speed +
        ((this.stage.maxSpeed - this.stage.speed) * this.distance) /
          this.stage.length,
      step = speed * dt;
    this.distance += step;
    this.score += step * 0.8;
    this.shield = Math.max(0, this.shield - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.noticeTime -= dt;
    this.cooldown -= dt;
    this.missileCooldown -= dt;
    const p = this.player,
      smoothing = 1 - Math.exp(-15 * dt);
    p.vx += (input.x * 29 - p.vx) * smoothing;
    p.vh += (-input.y * 9 - p.vh) * smoothing;
    p.x = clamp(p.x + p.vx * dt, -C.playerLimit, C.playerLimit);
    p.h = clamp(p.h + p.vh * dt, 5, 14);
    if (input.fire && this.cooldown <= 0) {
      this.fire();
      this.cooldown = this.weapon === 4 ? 0.095 : 0.23;
    }
    if (special) this.launch();
    this.spawn();
    for (const e of this.entities) {
      if (e.dead) continue;
      e.previous = { x: e.x, s: e.s, h: e.h };
      e.hitFlash = Math.max(0, (e.hitFlash || 0) - dt);
      const z = e.s - this.distance;
      if (e.type === "zigzag")
        e.x = clamp(e.baseX + Math.sin(this.time * 1.9 + e.phase) * 9, -24, 24);
      if (e.type === "satellite")
        e.x = clamp(e.baseX + Math.sin(this.time * 0.8 + e.phase) * 5, -24, 24);
      if (e.kind === "enemy") {
        e.s -= dt * ENEMIES[e.type].speed;
        if (e.type === "shooter" && e.shotsLeft != null) {
          if (z < 98 && z > 40 && e.shotsLeft > 0) {
            e.attackTimer -= dt;
            e.charging = e.attackTimer < 0.3;
            if (e.attackTimer <= 0) {
              const free =
                COMBAT_LIMITS.enemyBullets -
                this.bullets.filter((b) => b.kind === "enemy" && b.life > 0)
                  .length;
              if (free > 0)
                this.bullets.push(
                  ...hostileVolley(e, p, this.distance, speed).slice(0, free),
                );
              e.shotsLeft--;
              e.attackTimer = 0.68;
              e.charging = false;
            }
          } else e.charging = false;
        } else if (e.type === "shooter" && z < 85 && !e.shot) {
          e.shot = true;
          const flight = Math.max(0.5, (z - C.near) / (speed + 34));
          this.bullets.push({
            kind: "enemy",
            x: e.x,
            s: e.s,
            h: e.h,
            v: -34,
            vx: clamp((p.x - e.x) / flight, -18, 18),
            vh: (p.h - e.h) / flight,
            life: 5,
          });
        }
      }
    }
    for (const b of this.bullets) {
      b.life -= dt;
      if (b.life <= 0) continue;
      const previous = { x: b.x, s: b.s, h: b.h };
      if (b.kind === "missile" && b.target && !b.target.dead) {
        const t = b.target;
        b.x += (t.x - b.x) * Math.min(1, dt * 5);
        b.h += (t.h - b.h) * Math.min(1, dt * 5);
      } else b.x += b.vx * dt;
      b.h += (b.vh || 0) * dt;
      b.s += b.v * dt;
      if (b.kind === "enemy") {
        if (
          sweptHit(
            previous,
            b,
            previousPlayer,
            { x: p.x, s: this.distance + C.near, h: p.h },
            { x: 3, s: 4, h: 4 },
          )
        ) {
          this.damage();
          b.life = 0;
        }
      } else
        for (const e of this.entities) {
          if (e.dead || e.kind !== "enemy") continue;
          const half = ENEMIES[e.type].half,
            radius = b.kind === "missile" ? 1.8 : 0.7;
          if (
            sweptHit(previous, b, e.previous || e, e, {
              x: half.x + radius,
              s: half.s + 1,
              h: half.h + radius,
            })
          ) {
            e.hp -= b.kind === "missile" ? 4 : 1;
            b.life = 0;
            e.hitFlash = 0.12;
            this.burst(b.x, e.s, b.h, 3);
            if (e.hp <= 0) {
              e.dead = true;
              this.score += ENEMIES[e.type].points;
              this.kills++;
              this.burst(e.x, e.s, e.h);
              this.audio.fx("explode");
            }
            break;
          }
        }
      if (b.s < this.distance - 20 || b.s > this.distance + 210) b.life = 0;
    }
    // Resolve contacts after projectiles so a destroyed near enemy cannot ram.
    for (const e of this.entities) {
      if (e.dead) continue;
      const z = e.s - this.distance;
      if (this.stage.theme === "city" && e.kind === "obstacle") {
        if (
          structureHit(
            previousPlayer,
            { x: p.x, s: this.distance + C.near, h: p.h },
            e,
          )
        ) {
          this.damage();
          e.dead = true;
        }
        if (z < -12) e.dead = true;
        continue;
      }
      if (Math.abs(z - C.near) < 4.5) {
        const radius = ["barrier", "floatBarrier"].includes(e.type)
          ? 7
          : e.kind === "pickup"
            ? 5
            : 4;
        if (Math.abs(e.x - p.x) < radius) {
          if (e.kind === "pickup") {
            if (Math.abs(e.h - p.h) < 8) {
              this.pickup(e);
              e.dead = true;
            }
          } else {
            this.damage();
            e.dead = true;
          }
        }
      }
      if (z < -12) e.dead = true;
    }
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.s += p.vs * dt;
      p.h += p.vh * dt;
    }
    this.entities = this.entities.filter((e) => !e.dead);
    this.bullets = this.bullets.filter((b) => b.life > 0);
    this.particles = this.particles.filter((p) => p.life > 0);
    if (this.status === "playing" && this.distance >= this.stage.length) {
      this.distance = this.stage.length;
      this.score += 2000 + this.lives * 500;
      this.status = "clear";
      this.audio.fx("clear");
    }
  }
}
