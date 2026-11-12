import { CheatSequence } from "./cheats.js";
import { clamp } from "./config.js";
export class Input {
  constructor(onPause, onStart, onCheat = () => {}) {
    const cheats = new CheatSequence();
    this.keys = new Set();
    this.pointers = new Map();
    this.axis = { x: 0, y: 0 };
    this.special = false;
    this.enabled = false;
    const handled = [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "Space",
      "ShiftLeft",
      "ShiftRight",
      "Escape",
      "Enter",
    ];
    window.addEventListener("keydown", (e) => {
      if (e.target?.matches?.('input, textarea, [contenteditable="true"]'))
        return;
      if (
        !e.repeat &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        e.key?.length === 1
      ) {
        const result = cheats.feed(e.key, performance.now());
        if (result.consumed) {
          e.preventDefault();
          if (result.index !== null) {
            this.reset();
            onCheat(result.index);
          }
          return;
        }
      }
      if (!handled.includes(e.code)) return;
      if (
        e.target instanceof HTMLButtonElement &&
        ["Space", "Enter"].includes(e.code) &&
        !(this.enabled && ["fire", "missile"].includes(e.target.id))
      )
        return;
      e.preventDefault();
      if (!e.repeat) {
        if (e.code === "Escape") onPause();
        if (e.code === "Enter") onStart();
        if (e.code.startsWith("Shift") && this.enabled) this.special = true;
      }
      this.keys.add(e.code);
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    const stick = document.querySelector("#stick"),
      knob = document.querySelector("#knob");
    const feedback = () => {
      stick.setAttribute?.("data-x", String(this.axis.x));
      stick.setAttribute?.("data-y", String(this.axis.y));
    };
    const move = (e) => {
      const r = stick.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) / (r.width / 2),
        y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
      // Four digital directions plus diagonals; a small neutral center avoids drift.
      this.axis = {
        x: Math.abs(x) > 0.24 ? Math.sign(x) : 0,
        y: Math.abs(y) > 0.24 ? Math.sign(y) : 0,
      };
      feedback();
    };
    stick.addEventListener("pointerdown", (e) => {
      if (!this.enabled || this.stickId != null) return;
      this.stickId = e.pointerId;
      stick.setPointerCapture(e.pointerId);
      move(e);
    });
    stick.addEventListener("pointermove", (e) => {
      if (e.pointerId === this.stickId) move(e);
    });
    const release = (e) => {
      if (e.pointerId === this.stickId) {
        this.stickId = null;
        this.axis = { x: 0, y: 0 };
        knob.style.transform = "";
        feedback();
      }
    };
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"])
      stick.addEventListener(ev, release);
    for (const id of ["fire", "missile"]) {
      const b = document.getElementById(id);
      b.addEventListener("pointerdown", (e) => {
        if (!this.enabled || b.getAttribute?.("aria-disabled") === "true")
          return;
        b.setPointerCapture(e.pointerId);
        this.pointers.set(e.pointerId, id);
        b.classList.add("pressed");
        if (id === "missile") this.special = true;
      });
      for (const ev of ["pointerup", "pointercancel", "lostpointercapture"])
        b.addEventListener(ev, (e) => {
          this.pointers.delete(e.pointerId);
          if (![...this.pointers.values()].includes(id))
            b.classList.remove("pressed");
        });
    }
  }
  read() {
    const k = this.keys;
    return {
      x: clamp(
        this.axis.x +
          Number(k.has("KeyD") || k.has("ArrowRight")) -
          Number(k.has("KeyA") || k.has("ArrowLeft")),
        -1,
        1,
      ),
      y: clamp(
        this.axis.y +
          Number(k.has("KeyS") || k.has("ArrowDown")) -
          Number(k.has("KeyW") || k.has("ArrowUp")),
        -1,
        1,
      ),
      fire: k.has("Space") || [...this.pointers.values()].includes("fire"),
    };
  }
  reset() {
    this.keys.clear();
    this.pointers.clear();
    this.axis = { x: 0, y: 0 };
    this.special = false;
    this.stickId = null;
    document.querySelector("#knob").style.transform = "";
    const pad = document.querySelector("#stick");
    pad.setAttribute?.("data-x", "0");
    pad.setAttribute?.("data-y", "0");
    document
      .querySelectorAll(".pressed")
      .forEach((b) => b.classList.remove("pressed"));
  }
}
