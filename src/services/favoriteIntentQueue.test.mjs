import test from "node:test";
import assert from "node:assert/strict";
import { createFavoriteIntentQueue } from "./favoriteIntentQueue.mjs";

const tick = () => new Promise((resolve) => setImmediate(resolve));
function fixture({ liked = false, guest = false, restored } = {}) {
  let clock = 1000;
  let timerId = 0;
  const timers = new Map();
  const ids = new Set(liked ? ["p"] : []);
  const views = new Map();
  const requests = [];
  const errors = [];
  const product = { id: "p", wishCount: 6, name: "Top" };
  const queue = createFavoriteIntentQueue({
    readLiked: (id) => ids.has(id),
    publish: (state) => { views.set(state.productId, state); if (state.liked) ids.add(state.productId); else ids.delete(state.productId); },
    save: (payload) => new Promise((resolve, reject) => requests.push({ payload, resolve, reject })),
    onError: (error) => errors.push(error),
    now: () => clock,
    schedule: (callback, delay) => { timers.set(++timerId, { callback, due: clock + delay }); return timerId; },
    cancel: (id) => timers.delete(id),
    sessionId: "session-one",
  });
  queue.setOwner(guest ? null : "buyer", restored);
  const advance = async (ms = 350) => {
    clock += ms;
    for (const [id, task] of [...timers]) if (task.due <= clock) { timers.delete(id); task.callback(); }
    await tick();
  };
  const tap = () => queue.toggle(product);
  const view = () => views.get("p");
  return { queue, tap, view, product, advance, requests, errors, ids };
}

test("rapid taps update immediately but only persist the final choice", async () => {
  const f = fixture();
  for (let i = 0; i < 21; i += 1) {
    const liked = f.tap();
    assert.equal(f.view().wishCount, liked ? 7 : 6);
    await f.advance(90);
  }
  assert.equal(f.requests.length, 0);
  await f.advance();
  assert.equal(f.requests.length, 1);
  assert.equal(f.requests[0].payload.liked, true);
  assert.equal(f.requests[0].payload.sequence, 21);
  f.requests[0].resolve({ liked: true, wishCount: 7 });
  await tick();
  assert.equal(f.view().pending, false);
});

test("failures restore six exactly instead of repeatedly subtracting a like", async () => {
  const f = fixture();
  for (let i = 0; i < 4; i += 1) {
    f.tap();
    assert.equal(f.view().wishCount, 7);
    await f.advance();
    f.requests[i].reject(new Error("unavailable"));
    await tick();
    assert.equal(f.view().wishCount, 6);
    assert.equal(f.view().liked, false);
  }
});

test("taps during a save are retained; an older response cannot replace them", async () => {
  const f = fixture();
  f.tap();
  await f.advance();
  f.tap();
  await f.advance();
  assert.equal(f.requests.length, 1, "only one request for this product is in flight");
  assert.equal(f.view().wishCount, 6);
  f.requests[0].resolve({ liked: true, wishCount: 7 });
  await tick();
  assert.equal(f.view().wishCount, 6);
  assert.equal(f.view().liked, false);
  await f.advance(0);
  assert.equal(f.requests.length, 2);
  assert.equal(f.requests[1].payload.liked, false);
  f.requests[1].resolve({ liked: false, wishCount: 6 });
  await tick();
  assert.equal(f.view().wishCount, 6);
});

test("an older failed request does not roll back a newer tap or show an obsolete error", async () => {
  const f = fixture();
  f.tap();
  await f.advance();
  f.tap();
  f.requests[0].reject(new Error("connection lost"));
  await tick();
  assert.equal(f.view().liked, false);
  assert.equal(f.errors.length, 0);
  await f.advance();
  assert.equal(f.requests[1].payload.liked, false, "still reconcile unknown outcome on the server");
});

test("pending/lagging snapshots cannot erase the user's desired state", async () => {
  const f = fixture();
  f.tap();
  assert.deepEqual(f.queue.reconcile([], true), ["p"]);
  await f.advance();
  f.requests[0].resolve({ liked: true, wishCount: 7 });
  await tick();
  assert.deepEqual(f.queue.reconcile([], true), ["p"], "protect until server listener catches up");
  assert.deepEqual(f.queue.reconcile(["p"], true), ["p"]);
  assert.deepEqual(f.queue.reconcile([], true), [], "a later real unlike on another device is accepted");
  assert.equal(f.view().wishCount, 6);
});

test("card and details reuse the same count despite stale product props", async () => {
  const f = fixture();
  f.tap();
  await f.advance();
  f.requests[0].resolve({ liked: true, wishCount: 7, favoriteCountUpdatedAtMs: 1500 });
  await tick();
  f.queue.observe({ ...f.product, wishCount: 2 });
  assert.equal(f.view().wishCount, 7);
  f.queue.observe({ ...f.product, wishCount: 8, favoriteCountUpdatedAt: { seconds: 2 } });
  assert.equal(f.view().wishCount, 8, "accept a verifiably newer count");
});

test("logout/account switch cancels queued taps and ignores old responses", async () => {
  const f = fixture();
  f.tap();
  await f.advance();
  f.queue.setOwner("second-buyer");
  f.ids.clear();
  f.queue.observe(f.product);
  f.requests[0].resolve({ liked: true, wishCount: 7 });
  await tick();
  assert.equal(f.view().liked, false);
  f.tap();
  f.queue.setOwner(null);
  await f.advance();
  assert.equal(f.requests.length, 1);
});

test("unsettled intents can resume after restart with the same request sequence", async () => {
  const first = fixture();
  first.tap();
  const restored = { p: first.view().intent };
  first.queue.dispose();
  const f = fixture({ liked: true, restored });
  assert.equal(f.view().wishCount, 7);
  await f.advance();
  assert.equal(f.requests[0].payload.sequence, 1);
  assert.equal(f.requests[0].payload.clientSessionId, restored.p.sessionId);
  assert.equal(f.requests[0].payload.liked, true);
});

test("guests retain immediate local likes without making a server request", async () => {
  const f = fixture({ guest: true });
  f.tap();
  assert.equal(f.view().wishCount, 7);
  f.tap();
  assert.equal(f.view().wishCount, 6);
  f.tap();
  await f.advance();
  assert.equal(f.requests.length, 0);
  assert.equal(f.view().liked, true);
});

test("confirmed state recovered after an ambiguous failure becomes the baseline", async () => {
  const f = fixture();
  f.tap();
  await f.advance();
  const error = Object.assign(new Error("response lost"), { favoriteState: { liked: true, wishCount: 8 } });
  f.requests[0].reject(error);
  await tick();
  assert.equal(f.view().liked, true);
  assert.equal(f.view().wishCount, 8);
});

test("first membership hydration does not double count an existing server like", () => {
  const f = fixture();
  f.queue.observe(f.product);
  f.queue.reconcile(["p"], true);
  assert.equal(f.view().liked, true);
  assert.equal(f.view().wishCount, 6);
  f.queue.reconcile([], true);
  assert.equal(f.view().wishCount, 5);
});

test("guest product re-renders cannot feed the optimistic count back into itself", () => {
  const f = fixture({ guest: true });
  f.tap();
  for (let i = 0; i < 10; i += 1) f.queue.observe({ ...f.product, wishCount: f.view().wishCount });
  assert.equal(f.view().wishCount, 7);
  f.tap();
  assert.equal(f.view().wishCount, 6);
});

test("signing out and back in uses a new session so sequence numbers cannot collide", async () => {
  const f = fixture();
  f.tap();
  await f.advance();
  const firstSession = f.requests[0].payload.clientSessionId;
  f.requests[0].resolve({ liked: true, wishCount: 7 });
  await tick();
  f.queue.setOwner(null);
  f.queue.setOwner("buyer");
  f.tap();
  await f.advance();
  assert.notEqual(f.requests[1].payload.clientSessionId, firstSession);
});

test("a stale sequence response advances once instead of retrying the same rejected revision", async () => {
  const f = fixture();
  f.tap();
  await f.advance();
  f.requests[0].resolve({ liked: false, wishCount: 6, staleRequest: true, clientSequence: 5 });
  await tick();
  await f.advance();
  assert.equal(f.requests[1].payload.sequence, 6);
  assert.equal(f.requests[1].payload.liked, true);
  f.requests[1].resolve({ liked: true, wishCount: 7 });
  await tick();
  assert.equal(f.view().pending, false);
});
