import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

test("revenue privacy survives remount/reload, is account-scoped, and syncs changes", async () => {
  const dom = new JSDOM("", {url: "https://example.test"});
  globalThis.window = dom.window;
  globalThis.CustomEvent = dom.window.CustomEvent;
  try {
    const visibility = await import("./vendorRevenueVisibility.mjs?first-session");
    assert.equal(visibility.readRevenueHidden(null), true);
    assert.equal(visibility.readRevenueHidden("a"), false);
    let updates = 0;
    const unsubscribe = visibility.subscribeRevenueVisibility("a", () => updates++);
    visibility.toggleRevenueHidden("a");
    assert.equal(updates, 1);
    assert.equal(visibility.readRevenueHidden("a"), true);
    assert.equal(visibility.readRevenueHidden("b"), false);
    // Fresh module simulates an app restart with only durable storage retained.
    const reloaded = await import("./vendorRevenueVisibility.mjs?second-session");
    assert.equal(reloaded.readRevenueHidden("a"), true);
    reloaded.toggleRevenueHidden("a");
    assert.equal(reloaded.readRevenueHidden("a"), false);
    const thirdSession = await import("./vendorRevenueVisibility.mjs?third-session");
    assert.equal(thirdSession.readRevenueHidden("a"), false);
    const key = "mythrift.vendor.revenue-hidden.v1:a";
    window.localStorage.setItem(key, "true");
    window.dispatchEvent(new window.StorageEvent("storage", {key, newValue: "true"}));
    assert.equal(visibility.readRevenueHidden("a"), true);
    assert.equal(updates, 3);
    unsubscribe();
    visibility.toggleRevenueHidden("a");
    assert.equal(updates, 3);
    assert.equal(visibility.readRevenueHidden("a"), false);
  } finally {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.CustomEvent;
  }
});

test("unavailable storage does not crash or prevent hiding revenue", async () => {
  const dom = new JSDOM("", {url: "https://example.test"});
  globalThis.window = dom.window;
  globalThis.CustomEvent = dom.window.CustomEvent;
  try {
    const visibility = await import("./vendorRevenueVisibility.mjs?blocked-storage");
    Object.defineProperty(window, "localStorage", {get() {throw new Error("Storage blocked");}});
    visibility.toggleRevenueHidden("private-vendor");
    assert.equal(visibility.readRevenueHidden("private-vendor"), true);
    visibility.toggleRevenueHidden("private-vendor");
    assert.equal(visibility.readRevenueHidden("private-vendor"), false);
  } finally {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.CustomEvent;
  }
});
