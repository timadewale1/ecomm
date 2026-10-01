import test from "node:test";
import assert from "node:assert/strict";
import {createOrderProductReader} from "./orderProductAccess.mjs";

test("complete immutable rows require no network; incomplete rows batch once and never overwrite order prices",async()=>{
  const session={uid:"u"};const calls=[];
  const reader=createOrderProductReader({getSession:()=>session,call:async data=>{
    calls.push(data);return {data:{orders:Object.fromEntries(data.orderIds.map(id=>[id,[{productId:"p",name:"Fallback",price:9999,imageUrl:"photo"}]]))}};
  }});
  const orders=[{id:"complete",cartItems:[{productId:"p",productSnapshot:{name:"Saved",price:200,imageUrl:"saved-photo"}}]},
    ...Array.from({length:45},(_,i)=>({id:"o"+i,cartItems:[{productId:"p",price:i}]}))];
  const result=await reader(orders);
  assert.equal(calls.length,3);assert.deepEqual(calls.map(c=>c.orderIds.length),[20,20,5]);
  assert.equal(result.complete[0].imageUrl,"saved-photo");assert.equal(result.o0[0].price,0);assert.equal(result.o44[0].price,44);
  assert.equal(result.o0[0].name,"Fallback");
});
test("missing listing or offline optional lookup retains every purchased line and retries later",async()=>{
  const session={uid:"u"};let calls=0;
  const reader=createOrderProductReader({getSession:()=>session,call:async()=>{calls++;throw Error("offline");}});
  const orders=[{id:"o",cartItems:[{productId:"gone",name:"Bought",price:100}]}];
  assert.equal((await reader(orders)).o[0].name,"Bought");
  assert.equal((await reader(orders)).o[0].price,100);assert.equal(calls,2);
});
test("account changes (including same-UID re-login) reject a stale historical response",async()=>{
  let session={uid:"u"},finish;
  const reader=createOrderProductReader({getSession:()=>session,call:()=>new Promise(resolve=>{finish=resolve;})});
  const pending=reader([{id:"o",cartItems:[{productId:"p"}]}]);
  session={uid:"u"};finish({data:{orders:{o:[{productId:"p",name:"Private"}]}}});
  await assert.rejects(pending,{code:"auth/session-changed"});
});
test("unmatched remote product rows cannot replace a different purchased item",async()=>{
  const session={uid:"u"};
  const reader=createOrderProductReader({getSession:()=>session,call:async()=>({data:{orders:{o:[{productId:"other",name:"Wrong"}]}}})});
  const result=await reader([{id:"o",cartItems:[{productId:"p",name:"Bought"}]}]);
  assert.equal(result.o[0].name,"Bought");
});
