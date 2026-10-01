import test from "node:test";
import assert from "node:assert/strict";
import {createReviewClient, reviewVersion} from "./reviewClient.mjs";
test("reviews never send from the wrong account or apply a previous session response", async () => {
  let session = {uid: "buyer"}, resolve, calls = 0;
  const request = createReviewClient({currentUser: () => session, call: () => {calls++; return new Promise((r) => {resolve = r;});}});
  await assert.rejects(request("submit", {}, "other"));
  assert.equal(calls, 0);
  const pending = request("submit", {}, "buyer");
  session = {uid: "buyer"};
  resolve({data: {review: {id: "old-session"}}});
  await assert.rejects(pending, /account changed/);
});
test("callable timestamps and legacy deletion versions are compatible", async () => {
  const session = {uid: "buyer"};
  const request = createReviewClient({currentUser: () => session, call: async () => ({data: {review: {createdAt: {_seconds: 1, _nanoseconds: 2}}}})});
  const result = await request("submit", {}, "buyer");
  assert.deepEqual(result.review.createdAt, {seconds: 1, nanoseconds: 2});
  assert.equal(reviewVersion(result.review), "legacy:1:2");
});
