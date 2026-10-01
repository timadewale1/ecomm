import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { installIOSKeyboardViewport, revealFocusedField } from "./iosKeyboardViewport.mjs";

function fixture({ sheet = false, delayedHandles = false } = {}) {
  const dom = new JSDOM(`<body>${sheet ? '<section data-app-bottom-sheet="sheet">' : ""}<div id="scroller" style="overflow-y:auto"><input id="field"><input id="other"></div>${sheet ? "</section>" : ""}</body>`, { pretendToBeVisual: true });
  const win = dom.window;
  const doc = win.document;
  const field = doc.getElementById("field");
  const other = doc.getElementById("other");
  const scroller = doc.getElementById("scroller");
  const root = doc.documentElement;
  Object.defineProperty(doc, "scrollingElement", { value: root });
  const viewport = new win.EventTarget();
  viewport.height = 400;
  viewport.offsetTop = 0;
  Object.defineProperty(win, "visualViewport", { value: viewport });
  Object.defineProperty(scroller, "scrollHeight", { value: 1200 });
  Object.defineProperty(scroller, "clientHeight", { value: 350 });
  scroller.getBoundingClientRect = () => ({ top: 40, bottom: 390 });
  doc.querySelector("section")?.setAttribute("tabindex", "-1");
  if (sheet) doc.querySelector("section").getBoundingClientRect = () => ({ top: 20, bottom: 400 });
  const positions = { field: 540, other: 800 };
  for (const element of [field, other]) {
    element.getClientRects = () => [element.getBoundingClientRect()];
    element.getBoundingClientRect = () => ({ top: positions[element.id] - scroller.scrollTop, bottom: positions[element.id] - scroller.scrollTop + 40, height: 40 });
  }
  const scrolls = [];
  scroller.scrollBy = (options) => { scrolls.push(options); scroller.scrollTop += options.top; };
  const rootScrolls = [];
  root.scrollBy = (options) => rootScrolls.push(options);
  const frames = new Map();
  let id = 0;
  win.requestAnimationFrame = (callback) => { frames.set(++id, callback); return id; };
  win.cancelAnimationFrame = (key) => frames.delete(key);
  const flush = () => {
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((callback) => callback());
  };
  const callbacks = new Map();
  const removals = [];
  const resolveHandles = [];
  const keyboard = {
    addListener(name, callback) {
      callbacks.set(name, callback);
      const handle = { remove() { removals.push(name); callbacks.delete(name); } };
      return delayedHandles ? new Promise((resolve) => resolveHandles.push(() => resolve(handle))) : Promise.resolve(handle);
    },
  };
  field.focus();
  return { win, doc, field, other, scroller, positions, viewport, keyboard, callbacks, frames, flush, scrolls, rootScrolls, removals, resolveHandles, close: () => dom.window.close() };
}

test("reveals a clipped field immediately and only by the required distance", () => {
  const f = fixture();
  revealFocusedField(f.win, f.doc);
  assert.deepEqual(f.scrolls, [{ top: 214, left: 0, behavior: "instant" }]);
  assert.equal(f.rootScrolls.length, 0);
  revealFocusedField(f.win, f.doc);
  assert.equal(f.scrolls.length, 1, "already-visible fields do not scroll again");
  f.close();
});

test("sheet inputs scroll their own form without moving the background", () => {
  const f = fixture({ sheet: true });
  f.doc.body.style.overflowY = "hidden";
  revealFocusedField(f.win, f.doc);
  assert.equal(f.scrolls.length, 1);
  assert.equal(f.rootScrolls.length, 0);
  f.close();
});

test("non-text, hidden, readonly and removed inputs are ignored", () => {
  const f = fixture();
  f.field.type = "checkbox";
  revealFocusedField(f.win, f.doc);
  f.field.type = "text";
  f.field.readOnly = true;
  revealFocusedField(f.win, f.doc);
  f.field.readOnly = false;
  f.field.getClientRects = () => [];
  revealFocusedField(f.win, f.doc);
  f.field.remove();
  revealFocusedField(f.win, f.doc);
  assert.equal(f.scrolls.length, 0);
  f.close();
});

test("uses visual viewport offset without subtracting the keyboard twice", () => {
  const f = fixture();
  f.viewport.offsetTop = 30;
  f.positions.field = 60;
  revealFocusedField(f.win, f.doc);
  assert.equal(f.scrolls.length, 0);
  f.positions.field = 20;
  revealFocusedField(f.win, f.doc);
  assert.equal(f.scrolls[0].top, -36);
  f.close();
});

test("doesn't move a locked background or oscillate on oversized fields", () => {
  const f = fixture();
  f.field.getBoundingClientRect = () => ({ top: 0, bottom: 900, height: 900 });
  revealFocusedField(f.win, f.doc);
  assert.equal(f.scrolls.length, 0);
  assert.equal(f.rootScrolls.length, 0);
  f.scroller.style.overflowY = "visible";
  f.doc.body.style.overflowY = "hidden";
  f.field.getBoundingClientRect = () => ({ top: 700, bottom: 740, height: 40 });
  revealFocusedField(f.win, f.doc);
  assert.equal(f.rootScrolls.length, 0);
  f.close();
});

test("viewport changes correct bounds while a field stays focused", async () => {
  const f = fixture();
  f.positions.field = 80;
  const stop = installIOSKeyboardViewport(f);
  await Promise.resolve();
  f.callbacks.get("keyboardWillShow")();
  f.flush();
  assert.equal(f.scrolls.length, 0);
  f.viewport.height = 130;
  f.viewport.dispatchEvent(new f.win.Event("resize"));
  f.flush();
  assert.equal(f.scrolls[0].top, 14);
  stop();
  f.close();
});

test("coalesces willShow/resize, follows latest focus, and doesn't fight manual scrolling", async () => {
  const f = fixture();
  const stop = installIOSKeyboardViewport(f);
  await Promise.resolve();
  f.callbacks.get("keyboardWillShow")();
  f.viewport.dispatchEvent(new f.win.Event("resize"));
  f.other.focus();
  assert.equal(f.frames.size, 1);
  f.flush();
  assert.equal(f.scrolls[0].top, 474, "reads latest focus, not stale first input");
  f.callbacks.get("keyboardDidShow")();
  f.flush();
  assert.equal(f.scrolls.length, 1, "didShow is only a final bounds check");
  f.viewport.dispatchEvent(new f.win.Event("scroll"));
  assert.equal(f.frames.size, 0, "manual scrolling doesn't snap back to input");
  stop();
  assert.equal(f.removals.length, 4);
  f.close();
});

test("hide and teardown cancel pending work, including late listener registration", async () => {
  const f = fixture({ delayedHandles: true });
  const stop = installIOSKeyboardViewport(f);
  f.callbacks.get("keyboardWillShow")();
  assert.equal(f.doc.body.classList.contains("native-keyboard-open"), true);
  f.callbacks.get("keyboardWillHide")();
  assert.equal(f.frames.size, 0);
  assert.equal(f.doc.body.classList.contains("native-keyboard-open"), false);
  f.callbacks.get("keyboardWillShow")();
  const staleHide = f.callbacks.get("keyboardDidHide");
  stop();
  f.doc.body.classList.add("native-keyboard-open");
  staleHide();
  assert.equal(f.doc.body.classList.contains("native-keyboard-open"), true, "disposed listeners cannot change a new owner's state");
  f.resolveHandles.forEach((resolve) => resolve());
  await Promise.resolve();
  assert.equal(f.removals.length, 4);
  f.viewport.dispatchEvent(new f.win.Event("resize"));
  f.other.focus();
  f.flush();
  assert.equal(f.scrolls.length, 0);
  assert.equal(f.frames.size, 0);
  f.close();
});
