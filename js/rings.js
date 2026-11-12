import { C } from "./config.js";
import { projectSpace } from "./projection.js";
export const RING_RADII = Object.freeze([
  C.radius * 1.84,
  C.radius * 1.87,
  C.radius * 2.03,
  C.radius * 2.07,
  C.radius * 2.16,
]);
/** A physical annulus centered on Saturn. Camera is INSIDE its inner radius;
 * therefore only immense partial arcs cross the view, never a floating halo. */
export function ringPoint(radius, angle) {
  const tilt = 0.28,
    roll = -0.12,
    u = Math.cos(angle) * radius,
    v = Math.sin(angle) * radius;
  return {
    x: u * Math.cos(roll) - v * Math.sin(roll) * Math.sin(tilt),
    y: u * Math.sin(roll) + v * Math.cos(roll) * Math.sin(tilt),
    z: v * Math.cos(tilt),
  };
}
export function ringSamples(radius, cameraX = 0) {
  return Array.from({ length: 281 }, (_, i) =>
    projectSpace(ringPoint(radius, (i / 280) * Math.PI * 2), cameraX),
  );
}
