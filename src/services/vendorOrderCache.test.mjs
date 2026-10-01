import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {restoreVendorOrderCache} from "./vendorOrderCache.mjs";
const source = readFileSync(new URL("../redux/reducers/orderreducer.js", import.meta.url), "utf8");
const {default: reducer} = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const start = vendorId => ({type: "ORDER_LISTENER_STARTED", payload: {vendorId}});
const set = (vendorId, orders) => ({type: "SET_ORDERS", payload: orders, meta: {vendorId}});
const order = vendorId => ({vendorId, orderId: "order", projectionVersion: 3});

test("pre-privacy and ownerless persisted caches are dropped; valid owner cache is retained", () => {
  for (const value of [undefined, {orders: [{userInfo: {address: "PRIVATE"}}]}, {securityVersion: 3, orders: [order("a")]}]) {
    assert.deepEqual(restoreVendorOrderCache(value).orders, []);
  }
  const restored = restoreVendorOrderCache({securityVersion: 3, ownerVendorId: "a", status: "error", error: "old",
    orders: [order("a"), order("b"), {...order("a"), projectionVersion: 2}], lastSyncedAt: 1});
  assert.deepEqual(restored.orders, [order("a")]);
  assert.equal(restored.status, "idle");
  assert.equal(restored.error, null);
  assert.equal(restored.lastSyncedAt, 1);
});
test("a different account immediately clears old orders; late snapshots and errors are ignored", () => {
  let state = reducer(undefined, start("a"));
  state = reducer(state, set("a", [order("a"), order("b")]));
  assert.deepEqual(state.orders, [order("a")]);
  const next = reducer(state, start("b"));
  assert.deepEqual(next.orders, []);
  for (const action of [set("a", [order("a")]),
    {type: "ORDER_LISTENER_READY", payload: {vendorId: "a"}},
    {type: "ORDER_LISTENER_FAILED", payload: {vendorId: "a", message: "old failure"}}]) {
    assert.equal(reducer(next, action), next);
  }
});
test("same-account refresh preserves orders; logout clears them and rejects late delivery", () => {
  let state = reducer(undefined, start("a"));
  state = reducer(state, set("a", [order("a")]));
  const refresh = reducer(state, start("a"));
  assert.deepEqual(refresh.orders, state.orders);
  assert.equal(refresh.status, "refreshing");
  const cleared = reducer(refresh, {type: "CLEAR_ORDERS"});
  assert.deepEqual(cleared.orders, []);
  assert.equal(reducer(cleared, set("a", [order("a")])), cleared);
});
