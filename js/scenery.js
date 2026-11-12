import { C, random } from "./config.js?v=2.3.2";
import { neptuneScenery } from "./atmosphere.js?v=2.3.2";
import { createUrbanScenery } from "./urban.js?v=2.3.2";
import { project } from "./projection.js?v=2.3.2";

/** Geodesic distance between two footprints on the sphere (not screen pixels). */
export function surfaceDistance(a, b) {
  const pa = a.x / C.radius,
    pb = b.x / C.radius,
    delta = (a.s - b.s) / C.radius;
  const dot =
    Math.sin(pa) * Math.sin(pb) + Math.cos(pa) * Math.cos(pb) * Math.cos(delta);
  return C.radius * Math.acos(Math.max(-1, Math.min(1, dot)));
}
export function footprintsOverlap(a, b, gap = 10) {
  // Coordinates belong to a forward arc, not repeated copies of a small globe.
  if (Math.abs(a.s - b.s) > 160) return false;
  return (
    surfaceDistance(a, b) <
    (a.footprint || a.size || 5) + (b.footprint || b.size || 5) + gap
  );
}
export function createScenery(stage) {
  if (stage.theme === "city") return createUrbanScenery(stage);
  if (stage.theme === "mars") return createMarsScenery(stage);
  if (stage.theme === "neptune") return neptuneScenery(stage);
  if (stage.theme === "saturn") return [];
  const rng = random(stage.seed + 71),
    items = [];
  // Absolute world coordinates avoid the old 400-unit recycling seam.
  for (let s = 35; s < stage.length + 180; s += 52) {
    if (rng() < 0.38) continue;
    const e = {
      x: (rng() - 0.5) * 52,
      s: s + rng() * 18,
      size: 4 + rng() * 3,
      h: 0,
      type: "crater",
      decor: true,
    };
    if (items.every((other) => !footprintsOverlap(e, other, 20))) items.push(e);
  }
  // Keep the existing triangular lunar formations, spaced independently.
  for (let s = 65; s < stage.length + 180; s += 87) {
    const e = {
      x: (rng() < 0.5 ? -1 : 1) * (33 + rng() * 64),
      s: s + rng() * 25,
      size: 6 + rng() * 8,
      h: 0,
      type: "rock",
      decor: true,
    };
    if (items.every((other) => !footprintsOverlap(e, other, 8))) items.push(e);
  }
  return items;
}
/** Every rim vertex sits on the same surface as its center. Hidden vertices
 * break the contour at the horizon; canvas clipping handles partial side rims. */
export function craterRim(e, distance, cameraX = 0, factor = 1) {
  return Array.from({ length: 49 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2,
      r = e.size * factor;
    return project(
      e.x + Math.cos(a) * r,
      e.s - distance + Math.sin(a) * r,
      0,
      cameraX,
    );
  });
}

function createMarsScenery(stage) {
  const rng = random(stage.seed + 71),
    items = [];
  const add = (e) => {
    if (items.every((o) => !footprintsOverlap(e, o, 6)))
      items.push({ ...e, h: 0, decor: true });
  };
  for (let s = 28; s < stage.length + 360; s += 58)
    for (const side of [-1, 1]) {
      add({
        type: "mesa",
        x: side * (40 + rng() * 40),
        s: s + rng() * 12,
        size: 9 + rng() * 9,
        height: 12 + rng() * 30,
      });
    }
  for (let s = 90; s < stage.length + 180; s += 170)
    add({
      type: "canyon",
      x: (rng() < 0.5 ? -1 : 1) * (24 + rng() * 10),
      s,
      size: 3 + rng(),
      footprint: 17,
    });
  for (let s = 140; s < stage.length + 160; s += 240)
    add({
      type: "crater",
      x: (rng() - 0.5) * 22,
      s: s + rng() * 25,
      size: 2.8 + rng() * 1.2,
    });
  return items;
}
