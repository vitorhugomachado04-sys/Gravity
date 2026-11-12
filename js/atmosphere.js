import { C, random } from "./config.js?v=2.3.2";
export function cloudPose(e, time) {
  return {
    x: e.x + Math.sin(time * 0.18 + (e.seed || 0) * 6) * 3,
    s: e.s + Math.sin(time * 0.12 + (e.seed || 0) * 3) * 1.5,
  };
}
export function fogVertices(e, time) {
  const pose = cloudPose(e, time);
  return Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2,
      r = 1 + 0.08 * Math.sin(5 * a + time * 0.17);
    return {
      x: pose.x + Math.cos(a) * e.size * r,
      s: pose.s + Math.sin(a) * e.depth * r,
      h: e.h,
    };
  });
}
/** Intersection of the camera-to-ship ray with a higher spherical cloud shell.
 * Occlusion is positional, never a timer randomly hiding the ship. */
export function cloudRayPoint(player, distance, height) {
  if (height <= player.h) return null;
  const theta = C.near / C.radius,
    phi = player.x / C.radius,
    r = C.radius + player.h;
  const origin = {
    x: player.x * 0.18,
    y: C.radius + C.cameraHeight,
    z: -C.cameraBack,
  };
  const target = {
    x: r * Math.sin(phi),
    y: r * Math.cos(theta) * Math.cos(phi),
    z: r * Math.sin(theta) * Math.cos(phi),
  };
  const dx = target.x - origin.x,
    dy = target.y - origin.y,
    dz = target.z - origin.z;
  const a = dx * dx + dy * dy + dz * dz,
    b = 2 * (origin.x * dx + origin.y * dy + origin.z * dz),
    q =
      origin.x ** 2 + origin.y ** 2 + origin.z ** 2 - (C.radius + height) ** 2;
  const disc = b * b - 4 * a * q;
  if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  if (t < 0 || t > 1) return null;
  const x = origin.x + t * dx,
    y = origin.y + t * dy,
    z = origin.z + t * dz;
  return {
    x: Math.asin(x / (C.radius + height)) * C.radius,
    s: distance + Math.atan2(z, y) * C.radius,
  };
}
export function cloudOccludes(e, player, distance, time) {
  const hit = cloudRayPoint(player, distance, e.h);
  if (!hit) return false;
  const center = cloudPose(e, time),
    x = (hit.x - center.x) / e.size,
    z = (hit.s - center.s) / e.depth,
    a = Math.atan2(z, x),
    rim = 1 + 0.08 * Math.sin(5 * a + time * 0.17);
  return x * x + z * z < rim * rim;
}
export function neptuneScenery(stage) {
  const rng = random(stage.seed + 71),
    items = [];
  for (let s = 25; s < stage.length + 220; s += 55)
    for (const side of [-1, 1])
      items.push({
        type: "cloud",
        x: side * (24 + rng() * 43),
        s: s + rng() * 12,
        size: 18 + rng() * 15,
        h: 3 + rng() * 6,
        seed: rng(),
        decor: true,
      });
  for (let s = 75, i = 0; s < stage.length + 220; s += 96, i++)
    items.push({
      type: "fog",
      x: i % 2 === 0 ? 0 : i % 3 === 0 ? -34 : 34,
      s,
      size: 26 + rng() * 14,
      depth: 5 + rng() * 2,
      h: [18, 25, 32][i % 3],
      seed: rng(),
      decor: true,
    });
  for (let s = 170; s < stage.length + 250; s += 310)
    items.push({
      type: "antenna",
      x: (rng() < 0.5 ? -1 : 1) * 43,
      s,
      size: 4,
      height: 31,
      h: 0,
      decor: true,
    });
  return items;
}
