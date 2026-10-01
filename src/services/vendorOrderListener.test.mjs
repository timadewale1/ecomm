import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import {transformSync} from "esbuild";
const compiled = transformSync(readFileSync(new URL("../custom-hooks/orderListener.js", import.meta.url), "utf8"), {format: "cjs"}).code;
function harness() {
  const auth = {currentUser: {uid: "a"}}, actions = [], listeners = [], refreshes = [], backfills = [];
  const module = {exports: {}};
  const firestore = {
    collection: (_, name) => name, where: (...args) => args, query: (...args) => args,
    onSnapshot: (q, next, fail) => {
      const listener = {q, next, fail, stopped: false}; listeners.push(listener);
      return () => {listener.stopped = true;};
    },
    getDocsFromServer: q => new Promise(resolve => refreshes.push({q, resolve})),
  };
  const actionCreators = {
    setOrders: (orders, vendorId) => ({type: "SET_ORDERS", orders, vendorId}),
    clearOrders: () => ({type: "CLEAR_ORDERS"}),
    orderListenerStarted: vendorId => ({type: "STARTED", vendorId}),
    orderListenerReady: vendorId => ({type: "READY", vendorId}),
    orderListenerFailed: vendorId => ({type: "FAILED", vendorId}),
  };
  vm.runInNewContext(compiled, {module, exports: module.exports, console: {warn(){}, error(){}},
    require: name => {
      if (name === "firebase/firestore") return firestore;
      if (name === "firebase/functions") return {httpsCallable: () => args => new Promise(resolve => backfills.push({args, resolve}))};
      if (name.includes("firebase.config")) return {auth, db: {}, functions: {}};
      if (name.endsWith("/store")) return {dispatch: action => actions.push(action)};
      if (name.endsWith("/orderaction")) return actionCreators;
      throw new Error(`Unexpected import ${name}`);
    }});
  return {...module.exports, auth, actions, listeners, refreshes, backfills};
}
const snapshot = vendorId => ({docs: [{id: "order", data: () => ({vendorId, projectionVersion: 3})}]});
test("vendor badge and orders share an owner-filtered safe view; stale account listeners cannot update it", () => {
  const h = harness();
  h.initializeOrderListener("a");
  assert.equal(h.listeners[0].q[0], "vendorOrderViews");
  assert.equal(h.listeners[0].q[1][0], "vendorId");
  h.listeners[0].next(snapshot("a"));
  assert.equal(h.actions.at(-1).type, "READY");
  h.auth.currentUser = {uid: "b"};
  h.initializeOrderListener("b");
  const count = h.actions.length;
  h.listeners[0].next(snapshot("a"));
  h.listeners[0].fail(new Error("late error"));
  assert.equal(h.actions.length, count);
  assert.equal(h.listeners[0].stopped, true);
  h.listeners[1].next(snapshot("b"));
  assert.equal(h.actions.at(-1).vendorId, "b");
});
test("logout and login to the same UID discard older refresh and backfill results", async () => {
  const h = harness();
  h.initializeOrderListener("a");
  const refresh = h.refreshVendorOrders("a");
  h.removeOrderListener();
  h.auth.currentUser = {uid: "a"};
  h.initializeOrderListener("a");
  const count = h.actions.length;
  h.refreshes[0].resolve(snapshot("a"));
  h.backfills[0].resolve({data: {complete: false, nextCursor: "old-cursor"}});
  await refresh;
  await Promise.resolve();
  assert.equal(h.actions.length, count);
  assert.equal(h.backfills.length, 2);
  const fresh = h.refreshVendorOrders("a");
  h.refreshes[1].resolve(snapshot("a"));
  await fresh;
  assert.equal(h.actions.at(-1).type, "READY");
});
