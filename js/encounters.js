import { clamp } from "./config.js";
export const COMBAT_LIMITS = Object.freeze({
  enemies: 18,
  enemyBullets: 48,
  particles: 160,
});
export function formation(theme, progress, wave, s) {
  const count =
    theme === "saturn" ? (progress > 0.65 ? 4 : 3) : progress > 0.45 ? 3 : 2;
  const positions =
    count === 2 ? [-16, 16] : count === 3 ? [-20, 0, 20] : [-21, -7, 7, 21];
  const safeX = [-16, 16, 0][wave % 3];
  return positions.map((x, i) => ({
    kind: "enemy",
    type: "shooter",
    x,
    baseX: x,
    s: s + i * 2,
    h: 9,
    hp: 3,
    phase: i,
    shot: false,
    attackTimer: 0.3 + i * 0.2,
    shotsLeft: theme === "saturn" || progress > 0.4 ? 3 : 2,
    pattern: ["aimed", "pair", "lanes"][wave % 3],
    safeX,
    waveId: wave,
  }));
}
export function waveSpacing(theme, progress, wave) {
  const interval = (theme === "saturn" ? 65 : 74) - progress * 12;
  return interval + (wave % 4 === 3 ? 58 : 0);
}
export function hostileVolley(e, player, distance, speed) {
  const flight = Math.max(0.55, (e.s - distance - 8) / (speed + 32)),
    safe = e.safeX;
  const requested =
    e.pattern === "pair"
      ? [player.x - 7, player.x + 7]
      : e.pattern === "lanes"
        ? [e.baseX]
        : [player.x];
  const targets = [];
  for (let x of requested) {
    x = clamp(x, -22, 22);
    if (Math.abs(x - safe) < 7)
      x = clamp(safe + (x < safe ? -10 : 10), -22, 22);
    // At either edge, move to the other side if clamping narrowed the corridor.
    if (Math.abs(x - safe) < 7) x = safe > 0 ? safe - 10 : safe + 10;
    if (targets.every((t) => Math.abs(t - x) > 2)) targets.push(x);
  }
  return targets.map((targetX) => ({
    kind: "enemy",
    x: e.x,
    s: e.s,
    h: e.h,
    v: -32,
    vx: (targetX - e.x) / flight,
    vh: (player.h - e.h) / flight,
    life: 5,
    targetX,
    safeX: safe,
    waveId: e.waveId,
  }));
}
