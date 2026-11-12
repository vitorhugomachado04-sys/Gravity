export const C = Object.freeze({
  width: 240,
  height: 400,
  purple: "#6A659E",
  white: "#FFFFFF",
  radius: 260,
  focal: 190,
  cameraHeight: 55,
  cameraBack: 35,
  pitch: 0.1,
  centerY: 92,
  playerLimit: 22,
  near: 8,
  invulnerability: 2.3,
});
export const MOON = Object.freeze({
  id: "moon",
  number: 1,
  theme: "moon",
  name: "MOON",
  length: 2400,
  speed: 19,
  maxSpeed: 32,
  seed: 1986,
});
export const WEAPONS = ["SINGLE", "DOUBLE", "TRIPLE", "WIDE", "RAPID"];
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export function random(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
