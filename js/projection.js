import { C } from "./config.js?v=2.3.2";
/** Surface coordinates: lateral arc x, forward arc z, radial altitude h.
 * Every world object shares this rotating spherical coordinate system. */
export function project(x, z, h = 0, cameraX = 0) {
  const theta = z / C.radius,
    phi = x / C.radius,
    r = C.radius + h;
  const X = r * Math.sin(phi) - cameraX * 0.18,
    Y = r * Math.cos(theta) * Math.cos(phi) - C.radius,
    Z = r * Math.sin(theta) * Math.cos(phi);
  const dy = Y - C.cameraHeight,
    dz = Z + C.cameraBack,
    c = Math.cos(C.pitch),
    s = Math.sin(C.pitch),
    depth = dz * c - dy * s;
  let visible =
    (C.radius + C.cameraHeight) * Math.cos(theta) * Math.cos(phi) -
      C.cameraBack * Math.sin(theta) * Math.cos(phi) >
    C.radius;
  if (h > 0) {
    // Elevated geometry can rise beyond the ground horizon. Occlude only if
    // the camera-to-point ray enters the solid planet before reaching the point.
    const ox = cameraX * 0.18,
      oy = C.radius + C.cameraHeight,
      oz = -C.cameraBack;
    const a = X * X + dy * dy + dz * dz,
      b = 2 * (ox * X + oy * dy + oz * dz),
      q = ox * ox + oy * oy + oz * oz - C.radius * C.radius;
    const disc = b * b - 4 * a * q,
      hit = disc >= 0 ? (-b - Math.sqrt(disc)) / (2 * a) : Infinity;
    visible = hit <= 0 || hit >= 1 - 1e-7;
  }
  return {
    x: 120 + (C.focal * X) / depth,
    y: C.centerY - (C.focal * (dy * c + dz * s)) / depth,
    k: C.focal / depth,
    visible: visible && depth > 5 && z > (h > 15 ? -34 : -12),
  };
}
/** Ray/sphere intersection finds a curved horizon, without flat scrolling layers. */
export function surfaceAt(sx, sy) {
  const dx = (sx - 120) / C.focal,
    dy = -(sy - C.centerY) / C.focal,
    c = Math.cos(C.pitch),
    s = Math.sin(C.pitch);
  const vy = dy * c - s,
    vz = dy * s + c,
    oy = C.radius + C.cameraHeight,
    oz = -C.cameraBack;
  const a = dx * dx + vy * vy + vz * vz,
    b = 2 * (oy * vy + oz * vz),
    q = oy * oy + oz * oz - C.radius * C.radius,
    d = b * b - 4 * a * q;
  if (d < 0) return null;
  const t = (-b - Math.sqrt(d)) / (2 * a);
  if (t < 0) return null;
  return {
    x: Math.asin((dx * t) / C.radius) * C.radius,
    z: Math.atan2(oz + vz * t, oy + vy * t) * C.radius,
  };
}

/** Liang–Barsky clip keeps raster work bounded for partially off-screen rims. */
export function clipLine(x0, y0, x1, y1, width = 240, height = 325) {
  if (![x0, y0, x1, y1].every(Number.isFinite)) return null;
  const dx = x1 - x0,
    dy = y1 - y0;
  let lo = 0,
    hi = 1;
  for (const [p, q] of [
    [-dx, x0],
    [dx, width - 1 - x0],
    [-dy, y0],
    [dy, height - 1 - y0],
  ]) {
    if (p === 0) {
      if (q < 0) return null;
      continue;
    }
    const t = q / p;
    if (p < 0) lo = Math.max(lo, t);
    else hi = Math.min(hi, t);
    if (lo > hi) return null;
  }
  return [x0 + lo * dx, y0 + lo * dy, x0 + hi * dx, y0 + hi * dy];
}

/** Cartesian projection for distant orbital structures, in the same planet-
 * centered frame as the surface. Sphere intersection hides the far side. */
export function projectSpace(point, cameraX = 0) {
  const ox = cameraX * 0.18,
    oy = C.radius + C.cameraHeight,
    oz = -C.cameraBack;
  const dx = point.x - ox,
    dy = point.y - oy,
    dz = point.z - oz,
    c = Math.cos(C.pitch),
    s = Math.sin(C.pitch),
    depth = dz * c - dy * s;
  const a = dx * dx + dy * dy + dz * dz,
    b = 2 * (ox * dx + oy * dy + oz * dz),
    q = ox * ox + oy * oy + oz * oz - C.radius * C.radius;
  const disc = b * b - 4 * a * q,
    t = disc >= 0 ? (-b - Math.sqrt(disc)) / (2 * a) : Infinity;
  return {
    x: 120 + (C.focal * dx) / depth,
    y: C.centerY - (C.focal * (dy * c + dz * s)) / depth,
    k: C.focal / depth,
    depth,
    visible: depth > 5 && (t <= 0 || t >= 1 - 1e-7),
  };
}
