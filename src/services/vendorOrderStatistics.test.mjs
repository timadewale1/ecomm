import test from "node:test";
import assert from "node:assert/strict";
import {vendorOrderStatistics as stats} from "./vendorOrderStatistics.mjs";

const order = (id, extra = {}) => ({id, vendorId: "v", paymentStatus: "success", vendorStatus: "pending", ...extra});
const pile = (id, extra = {}) => order(id, {kind: "stockpile", stockpileDocId: "pile-1", vendorStatus: "accepted", stockpile: {id: "pile-1", status: "active"}, ...extra});
const sum = (result) => assert.equal(result.total, result.fulfilled + result.unfulfilled + result.closed);

test("initial stockpile plus any number of repiles counts once", () => {
  assert.deepEqual(stats([pile("one"), pile("two"), pile("three", {vendorStatus:"pending"})]),
    {total:1,fulfilled:0,unfulfilled:1,closed:0});
});
test("declined repiles never add a fulfilled order or cancel a completed pile", () => {
  const stockpile = {id:"pile-1",status:"delivered",deliveryStatus:"delivered"};
  assert.deepEqual(stats([pile("one",{stockpile}),pile("two",{stockpile}),pile("no",{stockpile,vendorStatus:"declined",progressStatus:"Declined",deliveryStatus:"delivered"})]),
    {total:1,fulfilled:1,unfulfilled:0,closed:0});
});
test("a fully declined pile closes once; rejecting one addition doesn't close an accepted pile", () => {
  assert.equal(stats([pile("one",{vendorStatus:"declined"}),pile("two",{vendorStatus:"declined"})]).closed,1);
  assert.equal(stats([pile("one"),pile("two",{vendorStatus:"declined"})]).unfulfilled,1);
  assert.equal(stats([pile("one",{vendorStatus:"declined",deliveryStatus:"delivered",stockpile:{status:"delivered"}})]).fulfilled,0);
});
test("closing, inactive, expiring and courier handover aren't fulfilment", () => {
  for (const state of ["active","awaiting_delivery_request","closing","awaiting_delivery_payment","booking","in_transit","cancelled"]) {
    const result=stats([pile("one",{stockpile:{status:state,isActive:false},vendorHandover:{confirmedAt:1}})]);
    assert.equal(result.unfulfilled,1,state);
    sum(result);
  }
});
test("the freshest pile projection wins over the newest repile's order status", () => {
  assert.equal(stats([
    pile("one",{projectedAt:{seconds:30},stockpile:{status:"delivered"}}),
    pile("two",{createdAt:{seconds:40},projectedAt:{seconds:20},stockpile:{status:"active"},progressStatus:"Pending"}),
  ]).fulfilled,1);
});
test("legacy piles require all non-declined additions complete", () => {
  assert.equal(stats([pile("one",{stockpile:null,progressStatus:"Delivered"}),pile("two",{stockpile:null})]).unfulfilled,1);
  assert.equal(stats([pile("one",{stockpile:null,progressStatus:"Delivered"}),pile("two",{stockpile:null,vendorStatus:"declined"})]).fulfilled,1);
  assert.equal(stats([pile("legacy",{stockpile:{status:"cancelled",isActive:false},orderDelivered:true})]).fulfilled,1);
});
test("normal deliveries, pickups and closed orders reconcile with the total", () => {
  const result=stats([
    order("delivery",{progressStatus:"Delivered"}),order("pickup",{pickupStatus:"collected"}),
    order("pending"),order("declined",{vendorStatus:"declined"}),
    order("cancelled",{progressStatus:"Cancelled"}),order("failed-courier",{deliveryStatus:"cancelled"}),
  ]);
  assert.deepEqual(result,{total:6,fulfilled:2,unfulfilled:2,closed:2});
  sum(result);
});
test("unpaid drafts don't count, legacy paid orders do, refunds don't erase history", () => {
  const result=stats([
    order("unpaid",{paymentStatus:"pending"}),order("draft",{paymentStatus:"initialized"}),
    order("legacy",{paymentStatus:null,orderDelivered:true}),
    order("refund",{paymentStatus:"refunded"}),order("after-delivery-refund",{paymentStatus:"refunded",progressStatus:"Delivered"}),
  ]);
  assert.deepEqual(result,{total:3,fulfilled:2,unfulfilled:0,closed:1});
});
test("duplicate records, missing pile IDs and vendor boundaries are safe", () => {
  assert.equal(stats([order("one"),order("one")]).total,1);
  assert.equal(stats([pile("one",{stockpileDocId:null,stockpile:null}),pile("two",{stockpileDocId:null,stockpile:null})]).total,2);
  assert.equal(stats([pile("one"),pile("two",{vendorId:"other-vendor"})]).total,2);
  assert.deepEqual(stats(null),{total:0,fulfilled:0,unfulfilled:0,closed:0});
});
