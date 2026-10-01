import test from "node:test";
import assert from "node:assert/strict";
import {createVendorDeliveryLocationCheck} from "./vendorDeliveryLocationCheck.mjs";

test("location check reports only server-confirmed flags and rejects failure/invalid responses", async () => {
  const user = {uid: "vendor"};
  for (const needsSupport of [true, false]) {
    const check = createVendorDeliveryLocationCheck({currentUser: () => user, call: async data => {
      assert.deepEqual(data, {}); return {data: {needsSupport}};
    }});
    assert.equal(await check("vendor"), needsSupport);
    await assert.rejects(check("other"), /account-changed/);
  }
  await assert.rejects(createVendorDeliveryLocationCheck({currentUser: () => null})("vendor"), /account-changed/);
  await assert.rejects(createVendorDeliveryLocationCheck({currentUser: () => user, call: async () => ({data: {}})})("vendor"), /invalid-response/);
  await assert.rejects(createVendorDeliveryLocationCheck({currentUser: () => user, call: async () => {throw Error("offline");}})("vendor"), /offline/);
});
test("late responses cannot cross logout, account switch or a new session for the same vendor", async () => {
  for (const next of [null, {uid: "other"}, {uid: "vendor"}]) {
    let user = {uid: "vendor"}, finish;
    const check = createVendorDeliveryLocationCheck({currentUser: () => user, call: () => new Promise(resolve => {finish = resolve;})});
    const promise = check("vendor");
    user = next;
    finish({data: {needsSupport: true}});
    await assert.rejects(promise, /account-changed/);
  }
});
