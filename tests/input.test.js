import test from "node:test";
import assert from "node:assert/strict";
import { Input } from "../js/input.js?v=2.3.2";
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
  assert.equal(input.read().x, 0); // Touching anywhere starts neutral.
  elements.stick.emit("pointermove", {
    pointerId: 1,
    clientX: 130,
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

test("analog drag is proportional, diagonal, captured outside and resets on cancellation", () => {
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
  const touch = (event, x, y, id = 1) =>
    elements.stick.emit(event, { pointerId: id, clientX: x, clientY: y });
  touch("pointerdown", 70, 60);
  assert.deepEqual(input.axis, { x: 0, y: 0 });
  touch("pointermove", 71, 61);
  assert.equal(Math.hypot(input.axis.x, input.axis.y), 0);
  touch("pointermove", 80, 60);
  const slow = input.axis.x;
  assert.ok(slow > 0 && slow < 0.5);
  touch("pointermove", 90, 60);
  assert.ok(input.axis.x > slow && input.axis.x < 1);
  touch("pointerdown", 10, 10, 2);
  touch("pointermove", 200, 200, 2);
  assert.equal(input.stickId, 1);
  assert.equal(input.axis.y, 0);
  touch("pointermove", 108, 22);
  assert.ok(Math.abs(Math.hypot(input.axis.x, input.axis.y) - 1) < 1e-9);
  assert.ok(input.axis.x > 0 && input.axis.y < 0);
  assert.equal(attrs["data-x"], "1");
  assert.equal(attrs["data-y"], "-1");
  touch("pointermove", -120, 60);
  assert.equal(input.axis.x, -1);
  touch("pointermove", 70, 60);
  assert.deepEqual(input.axis, { x: 0, y: 0 });
  touch("pointermove", 90, 60);
  touch("pointercancel", 90, 60);
  assert.deepEqual(input.axis, { x: 0, y: 0 });
  assert.equal(input.stickOrigin, null);
  touch("pointerdown", 20, 20);
  touch("pointermove", 20, 50);
  assert.ok(input.axis.y > 0);
  input.reset();
  touch("pointermove", 150, 150);
  assert.deepEqual(input.axis, { x: 0, y: 0 });
  touch("pointerdown", 50, 50);
  touch("pointermove", 50, 0);
  touch("pointerup", 50, 0);
  assert.equal(attrs["data-y"], "0");
});
