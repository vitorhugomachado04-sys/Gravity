export function expeditionIndex(code) {
  const match = /^expedition([1-5])$/i.exec(String(code).trim());
  return match ? Number(match[1]) - 1 : null;
}
export class CheatSequence {
  constructor() {
    this.buffer = "";
    this.last = 0;
  }
  feed(key, now) {
    if (now - this.last > 5000) this.buffer = "";
    this.last = now;
    const next = this.buffer + key.toLowerCase();
    const index = expeditionIndex(next);
    if (index !== null) {
      this.buffer = "";
      return { consumed: true, index };
    }
    this.buffer = "expedition".startsWith(next)
      ? next
      : key.toLowerCase() === "e"
        ? "e"
        : "";
    return { consumed: !!this.buffer, index: null };
  }
}
