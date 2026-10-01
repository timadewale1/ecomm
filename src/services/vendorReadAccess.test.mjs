import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createPublicVendorReader, createOwnedVendorSummaryReader} from "./vendorReadAccess.mjs";

const snap = (id, data) => ({id, exists: () => !!data, data: () => data});
test("simultaneous product cards coalesce store reads, without caching moderation indefinitely", async () => {
  let reads = 0, resolve;
  const reader = createPublicVendorReader(async (id) => {
    reads++;
    if (reads === 1) return new Promise((done) => { resolve = done; });
    return snap(id, {isPublic:false});
  });
  const first = reader("vendor"), second = reader("vendor");
  assert.equal(first, second);
  await Promise.resolve();
  resolve(snap("vendor", {isPublic:true, shopName:"Store"}));
  assert.equal((await first).shopName, "Store");
  assert.equal(await reader("vendor"), null);
  assert.equal(reads, 2);
  assert.equal(await reader("a/b"), null);
  assert.equal(reads, 2);
});
test("failed reads propagate and are retryable, not converted to missing stores/cart deletion", async () => {
  let attempts = 0;
  const reader = createPublicVendorReader(async (id) => {
    attempts++;
    if (attempts === 1) throw Object.assign(new Error("Temporary failure"), {code:"permission-denied"});
    return snap(id, {isPublic:true});
  });
  await assert.rejects(reader("v"), {code:"permission-denied"});
  assert.equal((await reader("v")).isPublic, true);
});
test("historical summaries deduplicate stores and bound each call to 50 orders", async () => {
  const requests = [];
  const reader = createOwnedVendorSummaryReader({currentUid:()=>"buyer", call:async (request) => {
    requests.push(request);
    return {data:{orders:Object.fromEntries(request.orderIds.map((id)=>[id,{vendorId:id.split(":")[0],shopName:"Store"}]))}};
  }});
  const orders = Array.from({length:101}, (_,i)=>({id:`v${i}:order`,vendorId:`v${i}`}));
  const result = await reader([...orders,{id:"v0:another",vendorId:"v0"}], "buyer");
  assert.equal(Object.keys(result).length, 101);
  assert.deepEqual(requests.map((r)=>r.orderIds.length), [50,50,1]);
  assert.equal(requests[0].orderIds[0], "v0:another");
});
test("logout or account switch discards in-flight summaries and stops subsequent batches", async () => {
  let uid = "buyer", calls = 0;
  const reader = createOwnedVendorSummaryReader({currentUid:()=>uid, call:async () => {
    calls++; uid = "other"; return {data:{orders:{order:{vendorId:"v",shopName:"Store"}}}};
  }});
  const orders = Array.from({length:60},(_,i)=>({id:`o${i}`,vendorId:`v${i}`}));
  assert.deepEqual(await reader(orders, "buyer"), {});
  assert.equal(calls, 1);
  assert.deepEqual(await reader(orders, "buyer"), {});
  assert.equal(calls, 1);
});
test("public discovery no longer downloads raw customer orders or private vendor lists", () => {
  const files = ["topVendorsSlice", "VendorsSlice", "categoriesSlice", "conditionCategoriesSlice",
    "conditionSlice", "categoryProductsSlice", "personalDiscountsPageSlice", "catsection", "exploreSlice"];
  for (const file of files) {
    const source = readFileSync(new URL(`../redux/reducers/${file}.js`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /collection\(db, ["'](?:vendors|orders)["']\)/, file);
    assert.match(source, /publicVendorsQuery/, file);
  }
  const source = readFileSync(new URL("./publicVendors.js", import.meta.url), "utf8");
  assert.match(source, /where\("isPublic", "==", true\)/);
});
