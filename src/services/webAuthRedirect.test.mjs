import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { safeAuthReturnPath, writeWebAuthAttempt, readWebAuthAttempt, updateWebAuthAttempt, clearWebAuthAttempt, WEB_AUTH_REDIRECT_TTL, WEB_AUTH_REDIRECT_KEY } from "./webAuthRedirectState.mjs";
import { createGoogleRedirectCoordinator } from "./googleRedirectCoordinator.mjs";
import { beginAuthTransition, authTransitionSnapshot, releaseAuthTransition, setAuthRouteLoading } from "./authTransition.mjs";

const storage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
};
test("return paths preserve product, checkout and chat queries but reject external/helper URLs", () => {
  for (const value of ["https://evil.test", "//evil.test", "/\\evil.test", "/\nevil.test", "/__/auth/handler", "/auth/google"]) assert.equal(safeAuthReturnPath(value), "/");
  for (const value of ["/profile", "/product/one?size=M#reviews", "/newcheckout/vendor?note=Thank%20you", "/offers/chat/one"]) assert.equal(safeAuthReturnPath(value), value);
});
test("attempts survive reload, preserve origin context, expire and prevent duplicate starts", () => {
  const s = storage();
  const attempt = writeWebAuthAttempt(s, { returnTo: "/product/one", anonymousUid: "anon", requiresCheckoutDetails: true });
  assert.equal(readWebAuthAttempt(s).id, attempt.id);
  assert.equal(readWebAuthAttempt(s).anonymousUid, "anon");
  assert.equal(readWebAuthAttempt(s).requiresCheckoutDetails, true);
  assert.throws(() => writeWebAuthAttempt(s, {returnTo:"/"}), {code:"app/auth-in-progress"});
  clearWebAuthAttempt(s, "old-attempt");
  assert.equal(readWebAuthAttempt(s).id, attempt.id);
  assert.equal(readWebAuthAttempt(s, attempt.createdAt + WEB_AUTH_REDIRECT_TTL + 1), null);
  assert.equal(s.getItem(WEB_AUTH_REDIRECT_KEY), null);
});
test("unavailable storage fails before leaving the application", () => {
  assert.throws(() => writeWebAuthAttempt({ getItem:()=>null, setItem:()=>{throw Error("Blocked");} }, {}), {code:"app/auth-storage-unavailable"});
});
test("completion updates cannot overwrite a different attempt", () => {
  const s=storage(), attempt=writeWebAuthAttempt(s,{});
  assert.throws(()=>updateWebAuthAttempt(s,"other",{phase:"complete"}),{code:"app/auth-session-expired"});
  updateWebAuthAttempt(s,attempt.id,{phase:"authenticated",uid:"buyer"});
  assert.equal(readWebAuthAttempt(s).uid,"buyer");
});
function scenario(overrides = {}) {
  const calls = [];
  let attempt = { id:"attempt", phase:"awaiting-google", returnTo:"/profile" };
  let user = { uid:"buyer", isAnonymous:false };
  const deps = {
    readAttempt:()=>attempt,
    updateAttempt:(id, patch)=>(attempt={...attempt,...patch}),
    startGoogle:async()=>calls.push("google"),
    authReady:async()=>calls.push("auth-ready"),
    getResult:async()=>({user}), currentUser:()=>user,
    completeProfile:async(result)=>{calls.push("profile");return {user:result.user,profile:{profileComplete:true}};},
    importCart:async()=>calls.push("cart"),
    selectExperience:async()=>calls.push("experience"),
    finish:()=>calls.push("finish"), cancel:()=>calls.push("cancel"),
    ...overrides,
  };
  return {calls,deps,run:createGoogleRedirectCoordinator(deps),setUser:value=>{user=value;},setAttempt:value=>{attempt={...attempt,...value};}};
}
test("redirect return provisions before importing cart and navigating, only once under StrictMode", async () => {
  const s=scenario();const one=s.run(),two=s.run();assert.equal(one,two);
  await Promise.all([one,two]);
  assert.deepEqual(s.calls,["auth-ready","profile","cart","experience","finish"]);
});
test("outbound redirect never runs profile or cart operations", async () => {
  const s=scenario();s.setAttempt({phase:"start"});await s.run();assert.deepEqual(s.calls,["google"]);
});
test("cancel/back never resumes an action using an unrelated existing account", async () => {
  const s=scenario({getResult:async()=>null});await s.run();assert.deepEqual(s.calls,["auth-ready","cancel"]);
});
test("reloading after consuming Firebase result resumes only the same authenticated UID", async () => {
  const s=scenario({getResult:async()=>null});s.setAttempt({phase:"authenticated",uid:"buyer"});await s.run();assert.ok(s.calls.includes("finish"));
  const other=scenario({getResult:async()=>null});other.setAttempt({phase:"authenticated",uid:"other"});await other.run();assert.deepEqual(other.calls,["auth-ready","cancel"]);
});
test("vendor rejection never merges the guest cart or chooses a buyer experience", async () => {
  const s=scenario({completeProfile:async()=>{throw Object.assign(Error("Vendor"),{code:"app/vendor-account"});}});
  await assert.rejects(s.run(),{code:"app/vendor-account"});assert.deepEqual(s.calls,["auth-ready"]);
});
test("account switch during cart merge never navigates or changes the experience", async () => {
  const s=scenario();s.deps.importCart=async()=>s.setUser({uid:"other"});
  await assert.rejects(s.run(),{code:"app/auth-session-expired"});assert.deepEqual(s.calls,["auth-ready","profile"]);
});
test("incomplete checkout resumes the details sheet, but ordinary login does not demand details", async () => {
  const incomplete=async(result)=>({user:result.user,profile:{profileComplete:false}});
  const checkout=scenario({completeProfile:incomplete});checkout.setAttempt({requiresCheckoutDetails:true});
  const result=await checkout.run();assert.equal(result.authenticated.user.uid,"buyer");assert.ok(!checkout.calls.includes("finish"));
  const login=scenario({completeProfile:incomplete});await login.run();assert.ok(login.calls.includes("finish"));
});
test("transitions wait for finishing and lazy routes; old completions cannot dismiss new overlays", () => {
  setAuthRouteLoading(false);
  const first=beginAuthTransition(),oldId=authTransitionSnapshot().id;
  releaseAuthTransition(oldId);assert.ok(authTransitionSnapshot());
  const second=beginAuthTransition(),newId=authTransitionSnapshot().id;
  first.cancel();first.finish();assert.equal(authTransitionSnapshot().id,newId);
  setAuthRouteLoading(true);second.finish();releaseAuthTransition(newId);assert.ok(authTransitionSnapshot());
  setAuthRouteLoading(false);releaseAuthTransition(newId);assert.equal(authTransitionSnapshot(),null);
});
test("production proxy precedes SPA fallback and service worker excludes authentication helpers", () => {
  const config=JSON.parse(readFileSync(new URL("../../vercel.json",import.meta.url),"utf8"));
  assert.equal(config.rewrites[0].source,"/__/auth/:path*");
  assert.equal(config.rewrites[0].destination,"https://ecommerce-ba520.firebaseapp.com/__/auth/:path*");
  assert.equal(config.rewrites.at(-1).destination,"/index.html");
  const sw=readFileSync(new URL("../../public/service-worker.js",import.meta.url),"utf8");
  assert.match(sw,/pathname\.startsWith\("\/__\/auth\/"\)/);
});
test("native Google still uses the native plugin and login no longer times the interactive provider", () => {
  const service=readFileSync(new URL("./firebaseAuth.js",import.meta.url),"utf8");
  assert.match(service,/FirebaseAuthentication\.signInWithGoogle\(\{\s*skipNativeAuth: true/);
  const login=readFileSync(new URL("../pages/Login.jsx",import.meta.url),"utf8");
  assert.doesNotMatch(login,/withLoginTimeout\(\s*authenticateBuyerWithProvider/);
});
