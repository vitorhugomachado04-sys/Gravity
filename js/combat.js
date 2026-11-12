// Enemy parameters are shared by spawning, impact handling and tests.
// Satellite was previously an invulnerable obstacle despite its fighter sprite.
export const ENEMIES = Object.freeze({
  scout: { hp: 1, points: 100, half: { x: 2.4, s: 3, h: 2 }, speed: 5 },
  zigzag: { hp: 2, points: 200, half: { x: 2.4, s: 3, h: 2 }, speed: 3 },
  shooter: { hp: 3, points: 300, half: { x: 2.4, s: 3, h: 2 }, speed: 3 },
  satellite: { hp: 2, points: 200, half: { x: 2.4, s: 3, h: 2.2 }, speed: 0 },
});
/** Swept relative segment vs box: handles both bullet AND target motion,
 * including lateral movement, without accepting a hit at the wrong depth. */
export function sweptHit(from, to, targetBefore, targetAfter, half) {
  let enter = 0,
    exit = 1;
  for (const axis of ["x", "s", "h"]) {
    const a = from[axis] - targetBefore[axis],
      b = to[axis] - targetAfter[axis],
      delta = b - a,
      r = half[axis];
    if (Math.abs(delta) < 1e-9) {
      if (Math.abs(a) > r) return false;
      continue;
    }
    let lo = (-r - a) / delta,
      hi = (r - a) / delta;
    if (lo > hi) [lo, hi] = [hi, lo];
    enter = Math.max(enter, lo);
    exit = Math.min(exit, hi);
    if (enter > exit) return false;
  }
  return true;
}
