import test from "node:test";
import assert from "node:assert/strict";
import {createChatAvatarRepair} from "./chatAvatarRepair.mjs";
const thread = (id, extra={}) => ({id,buyerId:"buyer",vendorId:"vendor",...extra});
const flush = () => new Promise((resolve) => setImmediate(resolve));

test("repairs stale threads in bounded batches; skips current, duplicate and unauthorized threads", async () => {
  const calls=[];
  const queue=createChatAvatarRepair({getUid:()=>"vendor",request:async(ids)=>calls.push(ids)});
  const threads=Array.from({length:24},(_,i)=>thread(`oc_${i}`));
  queue.enqueue([...threads,thread("private",{vendorId:"other",buyerId:"other"}),thread("done",{buyer:{avatarVersion:2},vendor:{avatarVersion:2}})]);
  queue.enqueue(threads);
  await flush();
  assert.deepEqual(calls.map(x=>x.length),[10,10,4]);
  assert.equal(new Set(calls.flat()).size,24);
});
test("failure doesn't loop or block the UI; a later visit can retry", async () => {
  let time=0;
  let calls=0;
  let errors=0;
  const queue=createChatAvatarRepair({getUid:()=>"vendor",now:()=>time,request:async()=>{calls++;throw Error("offline");},onError:()=>errors++});
  queue.enqueue([thread("oc_1")]);
  await flush();
  queue.enqueue([thread("oc_1")]);
  await flush();
  assert.equal(calls,1);
  time=60_001;
  queue.enqueue([thread("oc_1")]);
  await flush();
  assert.equal(calls,2);
  assert.equal(errors,2);
});
test("logout/account switch discards queued repairs and late work", async () => {
  let uid="vendor";
  let release;
  const calls=[];
  const queue=createChatAvatarRepair({getUid:()=>uid,request:(ids)=>{calls.push(ids);return new Promise(resolve=>{release=resolve;});}});
  queue.enqueue(Array.from({length:21},(_,i)=>thread(`oc_${i}`)));
  uid=null;
  queue.reset();
  release();
  await flush();
  assert.equal(calls.length,1);
  queue.enqueue([thread("oc_22")]);
  assert.equal(calls.length,1);
});
