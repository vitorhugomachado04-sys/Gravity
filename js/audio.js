export class AudioSystem {
  constructor() {
    this.sound = true;
    this.music = false;
    this.context = null;
    this.tick = 0;
    this.note = 0;
    this.voices = new Set();
    this.track = null;
  }
  unlock() {
    if (!this.context) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      this.context = new Audio();
    }
    this.context.resume().catch(() => {});
  }
  tone(freq, duration = 0.08, type = "square", volume = 0.025, end = freq) {
    if (!this.context || this.context.state !== "running") return;
    const t = this.context.currentTime,
      o = this.context.createOscillator(),
      g = this.context.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(end, 20), t + duration);
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(g);
    g.connect(this.context.destination);
    o.start();
    o.stop(t + duration);
    this.voices.add(o);
    o.onended = () => {
      this.voices.delete(o);
      o.disconnect();
      g.disconnect();
    };
  }
  fx(name) {
    if (!this.sound) return;
    const map = {
      shot: [700, 0.055, "square", 0.012, 240],
      missile: [160, 0.3, "sawtooth", 0.025, 55],
      pickup: [480, 0.25, "triangle", 0.08, 1400],
      hit: [120, 0.22, "sawtooth", 0.06, 25],
      explode: [90, 0.16, "square", 0.035, 20],
      clear: [440, 0.8, "triangle", 0.08, 1760],
      over: [220, 0.8, "triangle", 0.08, 55],
    };
    this.tone(...map[name]);
  }
  update(dt) {
    if (!this.music) return;
    if (this.track) {
      if (this.track.paused) this.track.play().catch(() => {});
      return;
    }
    this.tick -= dt;
    if (this.tick <= 0) {
      this.tick = 0.22;
      const notes = [
        110, 165, 220, 165, 130.81, 196, 261.63, 196, 146.83, 220, 293.66, 220,
        130.81, 196, 164.81, 196,
      ];
      this.tone(notes[this.note++ % notes.length], 0.18, "triangle", 0.035);
    }
  }
  // Future original soundtrack, loaded only when supplied by the project.
  setTrack(url) {
    this.stop();
    this.track = new Audio(url);
    this.track.loop = true;
    this.track.volume = 0.2;
  }
  stop() {
    for (const o of this.voices) {
      try {
        o.stop();
      } catch {}
    }
    if (this.track) this.track.pause();
  }
}
