import { fogVertices, cloudOccludes } from "./atmosphere.js?v=2.3.2";
import { urbanInk } from "./urban.js?v=2.3.2";
import { C, WEAPONS, random, clamp } from "./config.js?v=2.3.2";
import { project, surfaceAt, clipLine } from "./projection.js?v=2.3.2";
import { craterRim } from "./scenery.js?v=2.3.2";
import {
  drawPlanetObject,
  drawPlanetSky,
  projectedFace,
  drawBridgeOcclusion,
} from "./planets.js?v=2.3.2";
import { ICONS } from "./icons.js?v=2.3.2";
import { bitmapText } from "./font.js?v=2.3.2";
const sprites = {
  ship: [
    "000010000",
    "000111000",
    "000111000",
    "101111101",
    "111111111",
    "111010111",
    "100010001",
  ],
  scout: ["1000001", "0111110", "0011100", "0001000"],
  zigzag: ["0010100", "1111111", "0101010", "1000001"],
  shooter: ["0111110", "1101011", "1111111", "0100010"],
  satellite: ["1100011", "1101011", "1111111", "1101011", "1100011"],
};
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
    const r = random(7);
    this.stars = Array.from({ length: 55 }, () => ({
      x: r() * 240,
      y: 42 + r() * 140,
      s: r() > 0.92 ? 2 : 1,
    }));
    this.terrain = [];
    for (let y = 55; y < 325; y++)
      for (let x = 0; x < 240; x++) {
        const p = surfaceAt(x, y);
        if (p) this.terrain.push({ x, y, ...{ wx: p.x, wz: p.z } });
      }
    this.horizon = Array.from({ length: 240 }, (_, x) => ({
      x,
      y: this.terrain.find((p) => p.x === x)?.y ?? 200,
    }));
    this.background = document.createElement("canvas");
    this.background.width = 240;
    this.background.height = 400;
    this.bg = this.background.getContext("2d");
    this.frame = 0;
  }

  rect(x, y, w, h, color = C.white) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(
      Math.round(x),
      Math.round(y),
      Math.max(1, Math.round(w)),
      Math.max(1, Math.round(h)),
    );
  }
  line(x0, y0, x1, y1, color = C.white) {
    const clipped = clipLine(x0, y0, x1, y1, 240, 400);
    if (!clipped) return;
    [x0, y0, x1, y1] = clipped;
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    let dx = Math.abs(x1 - x0),
      sx = x0 < x1 ? 1 : -1,
      dy = -Math.abs(y1 - y0),
      sy = y0 < y1 ? 1 : -1,
      err = dx + dy;
    for (let i = 0; i < 1000; i++) {
      this.rect(x0, y0, 1, 1, color);
      if (x0 === x1 && y0 === y1) break;
      const e = 2 * err;
      if (e >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
  polygon(points, color = C.purple, outline = false) {
    if (points.length < 3) return;
    const low = Math.max(65, Math.ceil(Math.min(...points.map((p) => p.y)))),
      high = Math.min(324, Math.floor(Math.max(...points.map((p) => p.y))));
    for (let y = low; y <= high; y++) {
      const crossings = [];
      for (let i = 0; i < points.length; i++) {
        const a = points[i],
          b = points[(i + 1) % points.length];
        if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y))
          crossings.push(a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y));
      }
      crossings.sort((a, b) => a - b);
      for (let i = 0; i + 1 < crossings.length; i += 2) {
        const left = Math.max(0, Math.ceil(crossings[i])),
          right = Math.min(239, Math.floor(crossings[i + 1]));
        if (right >= left) this.rect(left, y, right - left + 1, 1, color);
      }
    }
    if (outline)
      for (let i = 0; i < points.length; i++)
        this.line(
          points[i].x,
          points[i].y,
          points[(i + 1) % points.length].x,
          points[(i + 1) % points.length].y,
        );
  }
  fogPolygon(points) {
    if (points.length < 3) return;
    const low = Math.max(65, Math.ceil(Math.min(...points.map((p) => p.y)))),
      high = Math.min(324, Math.floor(Math.max(...points.map((p) => p.y))));
    for (let y = low; y <= high; y++) {
      const edges = [];
      for (let i = 0; i < points.length; i++) {
        const a = points[i],
          b = points[(i + 1) % points.length];
        if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y))
          edges.push(a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y));
      }
      edges.sort((a, b) => a - b);
      for (let i = 0; i + 1 < edges.length; i += 2) {
        const left = Math.max(0, Math.ceil(edges[i])),
          right = Math.min(239, Math.floor(edges[i + 1]));
        // Batch solid runs; preserve one transparent pixel in eight.
        let start = left;
        for (let x = left; x <= right + 1; x++)
          if (x > right || (x + y * 3) % 8 === 0) {
            if (x > start) this.rect(start, y, x - start, 1, C.purple);
            start = x + 1;
          }
        for (let x = left; x <= right; x++)
          if ((x + y * 3) % 8 !== 0 && (x * 3 + y * 5) % 23 === 0)
            this.rect(x, y, 1, 1, C.white);
      }
    }
  }
  enemyProjectile(b, d, cameraX) {
    const p = project(b.x, b.s - d, b.h, cameraX);
    if (!p.visible) return;
    const radius = Math.max(2, p.k * 1.2);
    this.rect(
      p.x - radius - 1,
      p.y - radius - 1,
      radius * 2 + 3,
      radius * 2 + 3,
      C.purple,
    );
    this.ring(p.x, p.y, radius, radius);
    this.rect(p.x, p.y, 1, 1);
  }
  text(t, x, y, size = 7, align = "left", color = C.white) {
    bitmapText(this.ctx, t, x, y, size, align, color);
  }
  sprite(type, x, y, scale = 1) {
    const data = sprites[type];
    const unit = Math.max(1, Math.round(scale));
    data.forEach((row, iy) =>
      [...row].forEach((pixel, ix) => {
        if (pixel === "1")
          this.rect(
            x + (ix - row.length / 2) * unit,
            y + (iy - data.length / 2) * unit,
            unit,
            unit,
          );
      }),
    );
  }
  ring(x, y, rx, ry, color = C.white) {
    let prev = null;
    for (let i = 0; i <= 32; i++) {
      const a = (i / 32) * Math.PI * 2,
        p = { x: x + Math.cos(a) * rx, y: y + Math.sin(a) * ry };
      if (prev) this.line(prev.x, prev.y, p.x, p.y, color);
      prev = p;
    }
  }
  ground(distance, theme = "moon") {
    // Binary ordered dithering, anchored to spherical surface coordinates.
    // No alpha, gradient or third color is introduced into the canvas.
    const image = this.bg.createImageData(240, 400),
      data = image.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 106;
      data[i + 1] = 101;
      data[i + 2] = 158;
      data[i + 3] = 255;
    }
    for (const p of this.terrain) {
      const z = p.wz + distance;
      let wave =
        Math.sin(z * 0.065 + Math.sin(p.wx * 0.024) * 2) +
        Math.cos(p.wx * 0.052 - z * 0.024);
      let density = wave > 0.7 ? 29 : wave < -0.8 ? 67 : 47;
      if (theme === "city") {
        if (urbanInk(p.wx, z)) {
          const i = (p.y * 240 + p.x) * 4;
          data[i] = data[i + 1] = data[i + 2] = 255;
        }
        continue;
      }
      if (theme === "mars") {
        wave = Math.sin(p.wx * 0.11 + Math.sin(z * 0.025) * 3);
        density = wave > 0.7 ? 23 : wave < -0.5 ? 71 : 47;
      }
      if (theme === "neptune") {
        wave = Math.sin(
          z * 0.07 + Math.sin(p.wx * 0.04 + this.time * 0.2) * 2.5,
        );
        density = wave > 0.55 ? 17 : wave < -0.6 ? 79 : 41;
      }
      if (theme === "saturn") {
        wave = Math.sin(z * 0.1 + p.wx * 0.007);
        density = wave > 0.5 ? 47 : 101;
      }
      if ((p.x * 3 + p.y * 7) % density === 0) {
        const i = (p.y * 240 + p.x) * 4;
        data[i] = data[i + 1] = data[i + 2] = 255;
      }
    }
    this.bg.putImageData(image, 0, 0);
  }
  crater(e, distance, cameraX) {
    for (const factor of [1, 0.65]) {
      const rim = craterRim(e, distance, cameraX, factor);
      for (let i = 1; i < rim.length; i++) {
        const a = rim[i - 1],
          b = rim[i];
        if (a.visible && b.visible && a.k < 7 && b.k < 7)
          this.line(a.x, a.y, b.x, b.y);
      }
    }
  }
  object(e, distance, cameraX, decor = false) {
    const z = e.s - distance,
      p = project(e.x, z, e.h || 0, cameraX);
    if (drawPlanetObject(this, e, distance, cameraX)) return;
    if (e.type === "crater") {
      this.crater({ ...e, size: e.size || 5 }, distance, cameraX);
      return;
    }
    if (!p.visible || p.x < -60 || p.x > 300 || p.y > 335) return;
    const k = p.k;
    if (e.kind === "enemy") {
      this.rect(
        p.x - Math.max(5, k * 3),
        p.y - Math.max(3, k * 2),
        Math.max(10, k * 6),
        Math.max(6, k * 4),
        C.purple,
      );
      this.sprite(e.type, p.x, p.y, k * 0.66);
      if (e.charging) {
        this.rect(p.x - 4, p.y - 5, 2, 1);
        this.rect(p.x + 3, p.y - 5, 2, 1);
      }
      if (e.hitFlash > 0)
        this.ring(p.x, p.y, Math.max(4, k * 3), Math.max(3, k * 2));
      return;
    }
    if (e.kind === "pickup") {
      const unit = Math.max(1, Math.round(k * 0.6)),
        size = unit * 6;
      // Chamfered capsule frame; pulse changes corner pixels, never alpha/color.
      this.rect(p.x - size, p.y - size, size * 2, size * 2, C.purple);
      const pulse = Math.floor(this.time * 4) % 2;
      this.line(p.x - size + 3, p.y - size, p.x + size - 3, p.y - size);
      this.line(p.x - size + 3, p.y + size, p.x + size - 3, p.y + size);
      this.line(p.x - size, p.y - size + 3, p.x - size, p.y + size - 3);
      this.line(p.x + size, p.y - size + 3, p.x + size, p.y + size - 3);
      if (pulse) {
        this.rect(p.x - size + 1, p.y - size + 1, 1, 1);
        this.rect(p.x + size - 1, p.y + size - 1, 1, 1);
      }
      ICONS[e.type].forEach((row, y) =>
        [...row].forEach((v, x) => {
          if (v === "1")
            this.rect(
              p.x + (x - 4.5) * unit,
              p.y + (y - 4.5) * unit,
              unit,
              unit,
            );
        }),
      );
      return;
    }
    if (e.type === "satellite") {
      this.sprite("satellite", p.x, p.y, k * 0.65);
      return;
    }
    const size = decor ? e.size : e.type === "barrier" ? 8 : 5,
      w = size * k;
    if (e.type === "barrier") {
      this.rect(p.x - w, p.y - 5 * k, w * 2, 5 * k);
      this.rect(p.x - w + 2, p.y - 4 * k, w * 2 - 4, 2 * k, C.purple);
      for (let i = -w; i < w; i += 5)
        this.line(p.x + i, p.y, p.x + i + 3, p.y - 3 * k);
    } else {
      const h = w * 1.1;
      for (let y = 0; y < h; y++) {
        const rw = w * (1 - y / h);
        this.rect(p.x - rw, p.y - y, rw * 2, 1);
      }
      this.line(p.x, p.y - h, p.x + w * 0.4, p.y, C.purple);
      for (let y = 1; y < h * 0.7; y += 3)
        this.line(
          p.x + 2,
          p.y - y,
          p.x + w * (1 - y / h) - 2,
          p.y - y,
          C.purple,
        );
    }
  }
  draw(world, menu = false) {
    this.time = world.time;
    const c = this.ctx,
      d = world.distance,
      pilot = world.player;
    if (this.frame++ % 2 === 0 || this.stageId !== world.stage.id)
      this.ground(d, world.stage.theme);
    this.stageId = world.stage.id;
    c.drawImage(this.background, 0, 0);
    for (const p of this.horizon) this.rect(p.x, p.y, 1, 1);
    for (const s of this.stars) {
      if (!surfaceAt(s.x, s.y)) this.rect(s.x, s.y, s.s, s.s);
    }
    drawPlanetSky(this, world.stage, world.time, pilot.x);
    const items = world.scenery
      .filter((e) => e.type !== "fog" && e.s - d > -25 && e.s - d < 360)
      .concat(world.entities)
      .sort((a, b) => b.s - a.s);
    c.save();
    c.beginPath();
    c.rect(0, 65, 240, 260);
    c.clip();
    for (const e of items) this.object(e, d, pilot.x, e.decor);
    c.restore();
    for (const b of world.bullets) {
      const p = project(b.x, b.s - d, b.h, pilot.x);
      if (!p.visible) continue;
      if (b.kind === "enemy") {
        this.enemyProjectile(b, d, pilot.x);
      } else {
        this.rect(
          p.x,
          p.y,
          Math.max(1, p.k * 0.65),
          Math.max(2, p.k * (b.kind === "missile" ? 5 : 3)),
        );
        if (b.kind === "missile") this.rect(p.x - 1, p.y + 6, 3, 3);
      }
    }
    for (const v of world.particles) {
      const p = project(v.x, v.s - d, v.h, pilot.x);
      if (p.visible)
        this.rect(p.x, p.y, Math.max(1, p.k * 0.7), Math.max(1, p.k * 0.7));
    }
    const ship = project(pilot.x, C.near, pilot.h, pilot.x),
      shadow = project(pilot.x, C.near, 0, pilot.x);
    this.ring(shadow.x, shadow.y, 10, 3);
    if (world.invulnerable <= 0 || Math.floor(world.time * 12) % 2 === 0) {
      this.rect(ship.x - 12, ship.y - 10, 24, 22, C.purple);
      this.sprite("ship", ship.x, ship.y, 2);
      this.rect(
        ship.x - 2,
        ship.y + 8,
        4,
        4 + (Math.floor(world.time * 18) % 5),
      );
      if (world.shield > 0) this.ring(ship.x, ship.y, 15, 15);
    }
    // Composite only bridge surfaces in front of the ship over its sprite.
    // The same projected solid geometry is used in the ordinary scenery pass.
    c.save();
    c.beginPath();
    c.rect(ship.x - 17, ship.y - 17, 34, 40);
    c.clip();
    for (const e of items)
      if (e.type === "bridge") drawBridgeOcclusion(this, e, d, pilot, ship);
    c.restore();
    const fog = world.scenery
      .filter((e) => e.type === "fog" && e.s - d > -50 && e.s - d < 230)
      .sort((a, b) => b.s - a.s);
    for (const cloud of fog)
      this.fogPolygon(
        projectedFace(fogVertices(cloud, world.time), d, pilot.x),
      );
    if (fog.some((e) => cloudOccludes(e, pilot, d, world.time))) {
      for (const x of [-1, 1])
        for (const y of [-1, 1])
          this.rect(ship.x + x * 12, ship.y + y * 10, 2, 1);
    }
    // Combat silhouettes remain readable through foreground fog for fairness.
    if (fog.length) {
      c.save();
      c.beginPath();
      c.rect(0, 65, 240, 260);
      c.clip();
      for (const e of world.entities)
        if (e.kind !== "pickup") this.object(e, d, pilot.x);
      for (const b of world.bullets)
        if (b.kind === "enemy") this.enemyProjectile(b, d, pilot.x);
      c.restore();
    }
    this.rect(0, 325, 240, 75, C.purple);
    this.line(10, 325, 230, 325);
    if (!menu) {
      this.rect(0, 0, 240, 42, C.purple);
      this.text("SCORE", 10, 11, 6);
      this.text(String(Math.floor(world.score)).padStart(6, "0"), 10, 23, 11);
      this.text(
        `${world.stage.hud || world.stage.name} / ${String(world.stage.number || 1).padStart(2, "0")}`,
        120,
        12,
        7,
        "center",
      );
      this.text(
        `${Math.floor((d / world.stage.length) * 100)}%`,
        120,
        24,
        8,
        "center",
      );
      this.rect(10, 33, 220, 1);
      this.rect(10, 32, 220 * clamp(d / world.stage.length, 0, 1), 3);
      this.text(`LIVES ${"♥".repeat(world.lives)}`, 10, 52, 7);
      this.text(
        `M × ${String(world.missiles).padStart(2, "0")}`,
        230,
        52,
        7,
        "right",
      );
      this.text(WEAPONS[world.weapon], 10, 64, 6);
      if (world.shield > 0)
        this.text(`SHIELD ${Math.ceil(world.shield)}`, 230, 64, 6, "right");
      const gate = world.entities.find(
        (e) =>
          ["bridge", "lowgate"].includes(e.type) &&
          e.s - d > 10 &&
          e.s - d < 100,
      );
      if (gate) {
        this.rect(60, 70, 120, 12, C.purple);
        this.text(
          gate.type === "bridge" ? "DESCEND / BELOW" : "CLIMB / ABOVE",
          120,
          79,
          7,
          "center",
        );
      }
      if (world.noticeTime > 0) {
        this.rect(43, 82, 154, 16, C.purple);
        this.text(world.notice, 120, 93, 7, "center");
      }
    }
  }
}
