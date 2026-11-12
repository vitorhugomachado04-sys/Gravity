import { SCORES, scoreEvents } from "./score.js?v=2.3.2";
export class AudioSystem {
  constructor() {
    this.sound = true;
    this.music = false;
    this.context = null;
    this.tick = 0;
    this.note = 0;
    this.voices = new Set();
    this.track = null;
    this.stage = "moon";
    this.musicVoices = new Set();
    this.nextNote = null;
    this.step = 0;
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
  setStage(id) {
    this.stopMusic();
    this.stage = SCORES[id] ? id : "moon";
    this.step = 0;
  }
  musicTone(event, when) {
    const ctx = this.context;
    if (this.musicVoices.size >= 40) return;
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.type = event.wave;
    osc.frequency.setValueAtTime(event.freq, when);
    osc.frequency.exponentialRampToValueAtTime(
      event.end,
      when + event.duration,
    );
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(event.volume, when + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + event.duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    const voice = { osc, gain };
    this.musicVoices.add(voice);
    osc.onended = () => {
      this.musicVoices.delete(voice);
      osc.disconnect();
      gain.disconnect();
    };
    osc.start(when);
    osc.stop(when + event.duration + 0.01);
  }
  update(dt) {
    if (!this.music || !this.context || this.context.state !== "running")
      return;
    if (this.track) {
      if (this.track.paused) this.track.play().catch(() => {});
      return;
    }
    const now = this.context.currentTime,
      unit = 60 / SCORES[this.stage].bpm / 4;
    if (this.nextNote === null || this.nextNote < now - 0.15)
      this.nextNote = now + 0.015;
    while (this.nextNote < now + 0.1) {
      for (const event of scoreEvents(this.stage, this.step))
        this.musicTone(event, this.nextNote + (event.delay || 0));
      this.step = (this.step + 1) % 256;
      this.nextNote += unit;
    }
  }
  stopMusic() {
    const now = this.context?.currentTime || 0;
    for (const { osc, gain } of this.musicVoices) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0.0001, now, 0.008);
      try {
        osc.stop(now + 0.03);
      } catch {}
    }
    this.nextNote = null;
    if (this.track) this.track.pause();
  }
  // Future original soundtrack, loaded only when supplied by the project.
  setTrack(url) {
    this.stop();
    this.track = new Audio(url);
    this.track.loop = true;
    this.track.volume = 0.2;
  }
  stop() {
    this.stopMusic();
    for (const o of this.voices) {
      try {
        o.stop();
      } catch {}
    }
    if (this.track) this.track.pause();
  }
}
