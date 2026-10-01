import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createAccountLookupClient } from "./accountLookupClient.mjs";
import { createAuthProvisioning } from "./authProvisioning.mjs";

test("eligibility never sends a client-supplied email or UID and requires a real login", async () => {
  let user = null;
  const calls = [];
  const client = createAccountLookupClient({currentUser:()=>user,call:async (name,data)=>{
    calls.push({name,data}); return {data:{buyerAllowed:true}};
  }});
  assert.equal(await client.isCurrentAccountBuyer(), false);
  user={uid:"guest",isAnonymous:true}; assert.equal(await client.isCurrentAccountBuyer(),false);
  assert.equal(calls.length,0);
  user={uid:"buyer",email:"private@test.com"};assert.equal(await client.isCurrentAccountBuyer(),true);
  assert.deepEqual(calls,[{name:"getBuyerAccountEligibilityV1",data:{}}]);
});
test("late lookup results cannot continue a switched or signed-out session", async () => {
  let user={uid:"one"}, resolve;
  const client=createAccountLookupClient({currentUser:()=>user,call:()=>new Promise(done=>{resolve=done;})});
  const pending=client.canUseBuyerContactEmail(" Buyer@Example.test ");
  user={uid:"two"};resolve({data:{canUseEmail:true}});
  await assert.rejects(pending,{code:"app/session-changed"});
});
test("malformed responses and failed requests never become available or eligible", async () => {
  const user={uid:"one"};
  for(const data of [{}, {available:"true"},null]) {
    const client=createAccountLookupClient({currentUser:()=>user,call:async()=>({data})});
    await assert.rejects(client.isBuyerUsernameAvailable("Name"),{code:"app/invalid-account-check"});
  }
  const client=createAccountLookupClient({currentUser:()=>user,call:async()=>{throw Error("Offline");}});
  await assert.rejects(client.isCurrentAccountBuyer(),/Offline/);
});
test("provisioning waits for profile completion, not repeated Firestore polling", async () => {
  const guard=createAuthProvisioning();const attempt=guard.begin();attempt.bind("new-user");
  let complete=false;const waiting=guard.wait("new-user").then(()=>{complete=true;});
  await Promise.resolve();assert.equal(complete,false);
  await guard.wait("different-user");assert.equal(complete,false);
  assert.throws(()=>guard.begin(),{code:"app/auth-in-progress"});
  attempt.finish();await waiting;assert.equal(complete,true);
  const next=guard.begin();attempt.finish();
  assert.throws(()=>guard.begin(),{code:"app/auth-in-progress"});
  next.finish();await guard.wait("new-user");
});
test("pending provider hand-off is protected, timeout is recoverable, and restarts have no stale marker", async () => {
  const guard=createAuthProvisioning({timeoutMs:10});const attempt=guard.begin();
  await assert.rejects(guard.wait("new-user"),{code:"app/profile-provisioning-timeout"});
  attempt.finish();await guard.wait("new-user");await createAuthProvisioning().wait("new-user");
});
test("all migrated auth and username screens avoid private-collection queries", () => {
  const paths=["../pages/Login.jsx","../pages/Signup.jsx","../pages/forgetPassword.jsx",
    "../components/PwaModals/AuthModal.jsx","../components/QuickMode/StoreBasket.jsx",
    "../pages/UserSide/ProfileDetails.jsx","./buyerSocialAuth.js","./authHelper.js"];
  for(const path of paths) {
    const source=readFileSync(new URL(path,import.meta.url),"utf8");
    assert.doesNotMatch(source,/\bgetDocs\s*\(|collection\(db,\s*["'](?:users|vendors)["']/m,path);
  }
  const orders=readFileSync(new URL("../pages/UserSide/OrdersCentre.jsx",import.meta.url),"utf8");
  assert.doesNotMatch(orders,/where\(["']email["']/);
  const modal=readFileSync(new URL("../components/PwaModals/AuthModal.jsx",import.meta.url),"utf8");
  assert.match(modal,/const optionalUpdates = \{\}/);
  assert.match(modal,/const isProfileComplete = hasNames && hasEmail && hasPhone && hasLocation/);
  assert.match(modal,/mergeEligibleCart\(pendingUser.uid\)/);
  assert.match(modal,/completeInitialAction\(pendingUser, mergeResult\)/);
  assert.doesNotMatch(modal,/pendingUser\??\.delete/);
});
