import { structureParts } from "./urban.js";
import { RING_RADII, ringSamples } from "./rings.js";
import { C } from "./config.js";
import { project } from "./projection.js";

const interpolate = (a, b, t) => ({
  x: a.x + (b.x - a.x) * t,
  s: a.s + (b.s - a.s) * t,
  h: a.h + (b.h - a.h) * t,
});
/** Clip a world-space face against planet occlusion before rasterization.
 * Tall towers therefore emerge top-first, even with their bases below horizon. */
export function projectedFace(vertices, distance, cameraX) {
  const result = [],
    at = (v) => project(v.x, v.s - distance, v.h, cameraX);
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i],
      b = vertices[(i + 1) % vertices.length],
      pa = at(a),
      pb = at(b);
    if (pa.visible) result.push(pa);
    if (pa.visible !== pb.visible) {
      let lo = 0,
        hi = 1;
      for (let k = 0; k < 12; k++) {
        const t = (lo + hi) / 2;
        if (at(interpolate(a, b, t)).visible === pa.visible) lo = t;
        else hi = t;
      }
      result.push(at(interpolate(a, b, (lo + hi) / 2)));
    }
  }
  return result.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
}
export function foregroundFace(points, minScale) {
  const result = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length];
    const inside = a.k >= minScale;
    if (inside) result.push(a);
    if (inside !== b.k >= minScale) {
      const t = (minScale - a.k) / (b.k - a.k);
      result.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        k: minScale,
      });
    }
  }
  return result;
}
function face(r, vertices, d, cam, minScale = 0) {
  const ps = foregroundFace(projectedFace(vertices, d, cam), minScale);
  if (ps.length >= 3) r.polygon(ps, C.purple, true);
}
function worldLine(r, a, b, d, cam) {
  const pa = project(a.x, a.s - d, a.h, cam),
    pb = project(b.x, b.s - d, b.h, cam);
  if (pa.visible && pb.visible) r.line(pa.x, pa.y, pb.x, pb.y);
}
function box(
  r,
  e,
  d,
  cam,
  {
    width = e.size,
    depth = e.size,
    height = e.height || 12,
    base = e.h || 0,
    taper = 1,
    minScale = 0,
  } = {},
) {
  const v = (x, s, h) => ({ x: e.x + x, s: e.s + s, h });
  const bottom = [
    v(-width, -depth, base),
    v(width, -depth, base),
    v(width, depth, base),
    v(-width, depth, base),
  ];
  const top = [
    v(-width * taper, -depth * taper, base + height),
    v(width * taper, -depth * taper, base + height),
    v(width * taper, depth * taper, base + height),
    v(-width * taper, depth * taper, base + height),
  ];
  // Side, front and cap; surface depth sorts entire structures consistently.
  const side = e.x < 0 ? 1 : 3,
    next = (side + 1) % 4;
  face(r, [bottom[side], bottom[next], top[next], top[side]], d, cam, minScale);
  face(r, [bottom[0], bottom[1], top[1], top[0]], d, cam, minScale);
  face(r, top, d, cam, minScale);
  return { v, bottom, top };
}
function contour(
  r,
  e,
  d,
  cam,
  { radius = e.size, stretch = 1, h = e.h || 0, lobes = 0, phase = 0 } = {},
) {
  let prev = null;
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2,
      rad = radius * (1 + lobes * Math.sin(a * 5 + phase));
    const p = project(
      e.x + Math.cos(a) * rad,
      e.s - d + Math.sin(a) * rad * stretch,
      h,
      cam,
    );
    if (prev && p.visible && prev.visible) r.line(prev.x, prev.y, p.x, p.y);
    prev = p;
  }
}
export function drawPlanetObject(r, e, d, cam) {
  const type = e.type,
    p = project(e.x, e.s - d, e.h || 0, cam);
  if (type === "antenna") {
    const height = e.height || 26,
      width = e.size || 4;
    const corners = [-1, 1].map((side) => ({
        x: e.x + side * width,
        s: e.s,
        h: 0,
      })),
      top = { x: e.x, s: e.s, h: height };
    for (const v of corners) worldLine(r, v, top, d, cam);
    for (let h = 4; h < height; h += 5) {
      const w = width * (1 - h / height);
      worldLine(
        r,
        { x: e.x - w, s: e.s, h },
        { x: e.x + w, s: e.s, h },
        d,
        cam,
      );
      worldLine(
        r,
        { x: e.x - w, s: e.s, h },
        {
          x: e.x + width * (1 - (h + 5) / height),
          s: e.s,
          h: Math.min(height, h + 5),
        },
        d,
        cam,
      );
    }
    worldLine(
      r,
      { x: e.x - 4, s: e.s, h: height - 5 },
      { x: e.x + 4, s: e.s, h: height - 5 },
      d,
      cam,
    );
    worldLine(r, top, { x: e.x, s: e.s, h: height + 5 }, d, cam);
  } else if (type === "bridge" || type === "lowgate") {
    for (const part of structureParts(type))
      box(r, { ...e, x: e.x + part.x, s: e.s + part.s }, d, cam, {
        width: part.half.x,
        depth: part.half.s,
        height: part.half.h * 2,
        base: part.h - part.half.h,
      });
    const safe = type === "bridge" ? 6 : 12,
      sign = type === "bridge" ? 1 : -1;
    const q = project(e.x, e.s - d, safe, cam);
    if (q.visible) {
      r.line(q.x - 3, q.y - sign * 2, q.x, q.y + sign * 2);
      r.line(q.x + 3, q.y - sign * 2, q.x, q.y + sign * 2);
    }
  } else if (type === "tower" || type === "pylon" || type === "lowrise") {
    const height = e.height || 12,
      width = e.size || 4,
      depth = width;
    box(r, e, d, cam, { width, depth, height });
    for (let h = 4; h < height - 3; h += 6)
      for (let x = -width + 2; x < width - 1; x += 4) {
        const w = project(e.x + x, e.s - d - depth - 0.08, h, cam);
        if (w.visible && w.x >= 0 && w.x < 240 && w.y > 65 && w.y < 325)
          r.rect(w.x, w.y, Math.min(3, w.k * 0.65), Math.min(3, w.k));
      }
    worldLine(
      r,
      { x: e.x, s: e.s, h: height },
      { x: e.x, s: e.s, h: height + 7 },
      d,
      cam,
    );
  } else if (type === "platform" || type === "floatBarrier") {
    box(r, e, d, cam, {
      width: e.size || 8,
      depth: 3,
      height: 2,
      base: e.h || 12,
    });
    for (const x of [-5, 5])
      worldLine(
        r,
        { x: e.x + x, s: e.s, h: (e.h || 12) - 3 },
        { x: e.x + x, s: e.s, h: e.h || 12 },
        d,
        cam,
      );
  } else if (type === "mesa" || type === "ridge") {
    const height = e.height || 9,
      width = e.size || 5;
    box(r, e, d, cam, { width, depth: width * 0.65, height, taper: 0.45 });
    for (let h = 3; h < height - 2; h += 5) {
      const t = h / height,
        w = width * (1 - 0.55 * t);
      worldLine(
        r,
        { x: e.x - w, s: e.s - width * 0.65 * (1 - 0.55 * t) - 0.05, h },
        { x: e.x + w, s: e.s - width * 0.65 * (1 - 0.55 * t) - 0.05, h },
        d,
        cam,
      );
    }
  } else if (type === "canyon") {
    const offsets = [
      [-1, -16],
      [0.2, -10],
      [-0.3, -4],
      [0.6, 3],
      [0, 10],
      [0.4, 16],
    ];
    for (const side of [-1, 1])
      for (let i = 1; i < offsets.length; i++) {
        const point = ([bend, z]) => ({
          x: e.x + bend * e.size + side * e.size,
          s: e.s + z,
          h: 0,
        });
        worldLine(r, point(offsets[i - 1]), point(offsets[i]), d, cam);
      }
  } else if (type === "cloud") {
    contour(r, e, d, cam, {
      stretch: 0.48,
      lobes: 0.15,
      phase: r.time * 0.3 + (e.seed || 0) * 6,
    });
    contour(r, { ...e, x: e.x + 3, s: e.s - 3 }, d, cam, {
      radius: e.size * 0.65,
      stretch: 0.4,
      lobes: 0.12,
      phase: r.time * 0.2,
    });
  } else if (type === "vortex" || type === "storm") {
    const size = e.size || 6;
    for (let j = 0; j < 3; j++)
      contour(r, e, d, cam, {
        radius: size - j * size * 0.25,
        stretch: 0.55,
        lobes: 0.1,
        phase: r.time * 0.9 + j,
      });
  } else if (type === "debris" || type === "boulder") {
    box(r, e, d, cam, {
      width: e.size || 4,
      depth: (e.size || 4) * 0.6,
      height: e.size || 4,
      base: type === "boulder" ? 0 : e.h || 8,
      taper: 0.65,
    });
  } else return false;
  if (e.kind === "obstacle" && p.visible) {
    r.line(p.x - 2, p.y - 9, p.x + 2, p.y - 5);
    r.line(p.x + 2, p.y - 9, p.x - 2, p.y - 5);
  }
  return true;
}
/** Physical orbital bands; projection and occlusion are shared with the planet. */
export function drawPlanetSky(r, stage, time, cameraX = 0) {
  if (stage.theme !== "saturn") return;
  for (const radius of RING_RADII) {
    const points = ringSamples(radius, cameraX);
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i];
      if (a.visible && b.visible && a.y > 65 && b.y > 65)
        r.line(a.x, a.y, b.x, b.y);
    }
  }
  const dust = ringSamples(C.radius * 1.96, cameraX);
  for (let i = 0; i < dust.length; i += 2) {
    const p = dust[i];
    if (p.visible && p.y > 65) r.rect(p.x, p.y, 1, 1);
  }
}

// Reuse the actual bridge faces, clipping against the ship's camera depth.
// Empty space beneath the deck stays empty; distant faces cannot cover the ship.
export function drawBridgeOcclusion(r, e, d, pilot, ship) {
  for (const part of structureParts("bridge"))
    box(r, { ...e, x: e.x + part.x, s: e.s + part.s }, d, pilot.x, {
      width: part.half.x,
      depth: part.half.s,
      height: part.half.h * 2,
      base: part.h - part.half.h,
      minScale: ship.k,
    });
}
