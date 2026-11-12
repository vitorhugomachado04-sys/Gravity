import { random } from "./config.js?v=2.3.2";
import { sweptHit } from "./combat.js?v=2.3.2";
const mod = (n, d) => ((n % d) + d) % d;
export const CITY_BLOCK = 64;
/** World-space street plan, sampled through the inverse spherical projection.
 * The same 64-unit blocks determine sidewalks, parks and building footprints. */
export function urbanMaterial(x, s) {
  const ax = Math.abs(mod(x + 32, 64) - 32),
    z = mod(s, 64),
    az = Math.min(z, 64 - z),
    bx = mod(Math.abs(x), 64);
  if (ax < 9 || az < 8) {
    if (ax < 0.35 && az > 12 && mod(s, 10) < 5) return "mark";
    if (az < 0.35 && ax > 13 && mod(x, 10) < 5) return "mark";
    if (ax < 7 && az > 9 && az < 12 && mod(x, 2.8) < 1.4) return "mark";
    if (az < 6 && ax > 10 && ax < 13 && mod(s, 2.8) < 1.4) return "mark";
    return "road";
  }
  if (ax < 11 || az < 10) return "sidewalk";
  if (bx >= 18 && bx <= 34 && z >= 16 && z <= 31) {
    if (Math.floor(s / 64) % 2 === 0 && x < 0) return "park";
    if (x > 0) return "parking";
    return "plaza";
  }
  return "block";
}
export function urbanInk(x, s) {
  const kind = urbanMaterial(x, s),
    z = mod(s, 64),
    bx = mod(Math.abs(x), 64);
  if (kind === "mark") return true;
  if (kind === "sidewalk") return mod(x + s, 5) < 1.1;
  if (kind === "parking")
    return (
      bx < 18.6 ||
      bx > 33.4 ||
      z < 16.6 ||
      z > 30.4 ||
      (mod(z - 16, 4) < 0.45 && bx < 30)
    );
  if (kind === "park")
    return (
      bx < 18.6 ||
      bx > 33.4 ||
      z < 16.6 ||
      z > 30.4 ||
      Math.hypot(mod(bx - 20, 5) - 2.5, mod(z - 18, 5) - 2.5) < 0.8
    );
  if (kind === "plaza")
    return (
      bx < 18.6 ||
      bx > 33.4 ||
      z < 16.6 ||
      z > 30.4 ||
      Math.abs(bx - 26) < 0.35 ||
      Math.abs(z - 23.5) < 0.35
    );
  return false;
}
export function createUrbanScenery(stage) {
  const rng = random(stage.seed + 71),
    items = [];
  for (let s = 0; s < stage.length + 360; s += 64)
    for (const side of [-1, 1]) {
      items.push({
        type: "tower",
        x: side * 43,
        s: s + 43,
        size: 7 + rng() * 2,
        height: Math.floor(s / 64) % 4 === 0 ? 78 : 30 + rng() * 32,
        h: 0,
        decor: true,
      });
      items.push({
        type: "lowrise",
        x: side * 44,
        s: s + 18,
        size: 5,
        height: 5 + rng() * 5,
        h: 0,
        decor: true,
      });
      if (Math.floor(s / 64) % 3 === 1)
        items.push({
          type: "platform",
          x: side * 34,
          s: s + 48,
          size: 7,
          h: 22,
          height: 3,
          decor: true,
        });
    }
  return items;
}
/** Render and collision share these exact solid volumes; openings are empty. */
export function structureParts(type) {
  switch (type) {
    case "bridge":
      return [
        { x: -28, s: 0, h: 6.5, half: { x: 2, s: 3, h: 6.5 } },
        { x: 28, s: 0, h: 6.5, half: { x: 2, s: 3, h: 6.5 } },
        { x: 0, s: 0, h: 13, half: { x: 30, s: 3, h: 1.2 } },
      ];
    case "lowgate":
      return [{ x: 0, s: 0, h: 4.5, half: { x: 30, s: 3, h: 4.5 } }];
    case "pylon":
      return [{ x: 0, s: 0, h: 6, half: { x: 4, s: 4, h: 6 } }];
    case "barrier":
      return [{ x: 0, s: 0, h: 2.5, half: { x: 8, s: 2, h: 2.5 } }];
    default:
      return [];
  }
}
export function structureHit(before, after, e) {
  return structureParts(e.type).some((part) => {
    const center = { x: e.x + part.x, s: e.s + part.s, h: part.h };
    return sweptHit(before, after, center, center, {
      x: part.half.x + 1.4,
      s: part.half.s + 1,
      h: part.half.h + 1.1,
    });
  });
}
