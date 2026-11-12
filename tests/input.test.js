import test from "node:test";
import assert from "node:assert/strict";
import { Input } from "../js/input.js";
class Element {
  constructor() {
    this.handlers = {};
    this.style = {};
    this.classes = new Set();
    this.classList = {
      add: (c) => this.classes.add(c),
      remove: (c) => this.classes.delete(c),
    };
  }
  addEventListener(name, fn) {
    (this.handlers[name] ??= []).push(fn);
  }
  emit(name, e = {}) {
    for (const fn of this.handlers[name] || []) fn(e);
  }
  setPointerCapture() {}
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 100, height: 100 };
  }
}
test("independent pointer IDs permit joystick + fire + missile, cancellation releases input", () => {
  const elements = Object.fromEntries(
    ["stick", "knob", "fire", "missile"].map((id) => [id, new Element()]),
  );
  globalThis.window = new Element();
  globalThis.document = {
    querySelector: (s) => elements[s.slice(1)],
    getElementById: (id) => elements[id],
    querySelectorAll: () => [elements.fire, elements.missile],
  };
  globalThis.HTMLButtonElement = class {};
  const input = new Input(
    () => {},
    () => {},
  );
  input.enabled = true;
  elements.stick.emit("pointerdown", {
    pointerId: 1,
    clientX: 86,
    clientY: 50,
  });
  elements.fire.emit("pointerdown", { pointerId: 2 });
  elements.missile.emit("pointerdown", { pointerId: 3 });
  assert.equal(input.read().x, 1);
  assert.equal(input.read().fire, true);
  assert.equal(input.special, true);
  elements.missile.emit("pointerup", { pointerId: 3 });
  assert.equal(input.read().fire, true);
  elements.fire.emit("pointercancel", { pointerId: 2 });
  assert.equal(input.read().fire, false);
  elements.stick.emit("lostpointercapture", { pointerId: 1 });
  assert.equal(input.read().x, 0);
  input.reset();
  assert.equal(input.special, false);
});

test("empty missile control rejects touches; Space still fires after touching cockpit buttons", () => {
  const elements = Object.fromEntries(
    ["stick", "knob", "fire", "missile"].map((id) => [id, new Element()]),
  );
  globalThis.window = new Element();
  globalThis.document = {
    querySelector: (s) => elements[s.slice(1)],
    getElementById: (id) => elements[id],
    querySelectorAll: () => [],
  };
  globalThis.HTMLButtonElement = class {};
  const input = new Input(
    () => {},
    () => {},
  );
  input.enabled = true;
  elements.missile.getAttribute = () => "true";
  elements.missile.emit("pointerdown", { pointerId: 4 });
  assert.equal(input.special, false);
  assert.equal(input.pointers.size, 0);
  const target = new HTMLButtonElement();
  target.id = "missile";
  window.emit("keydown", {
    code: "Space",
    target,
    repeat: false,
    preventDefault() {},
  });
  assert.equal(input.read().fire, true);
  window.emit("keyup", { code: "Space" });
  assert.equal(input.read().fire, false);
});

test("D-pad supports diagonals, slides between directions, neutral center and release feedback", () => {
  const elements = Object.fromEntries(
    ["stick", "knob", "fire", "missile"].map((id) => [id, new Element()]),
  );
  const attrs = {};
  elements.stick.setAttribute = (k, v) => (attrs[k] = v);
  globalThis.window = new Element();
  globalThis.document = {
    querySelector: (s) => elements[s.slice(1)],
    getElementById: (id) => elements[id],
    querySelectorAll: () => [],
  };
  globalThis.HTMLButtonElement = class {};
  const input = new Input(
    () => {},
    () => {},
  );
  input.enabled = true;
  elements.stick.emit("pointerdown", {
    pointerId: 1,
    clientX: 85,
    clientY: 15,
  });
  assert.deepEqual(input.axis, { x: 1, y: -1 });
  assert.equal(attrs["data-x"], "1");
  assert.equal(attrs["data-y"], "-1");
  elements.stick.emit("pointermove", {
    pointerId: 1,
    clientX: 15,
    clientY: 85,
  });
  assert.deepEqual(input.axis, { x: -1, y: 1 });
  elements.stick.emit("pointermove", {
    pointerId: 1,
    clientX: 50,
    clientY: 50,
  });
  assert.deepEqual(input.axis, { x: 0, y: 0 });
  elements.stick.emit("pointercancel", { pointerId: 1 });
  assert.equal(attrs["data-x"], "0");
  assert.equal(attrs["data-y"], "0");
});
