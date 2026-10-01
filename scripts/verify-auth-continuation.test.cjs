const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");
const babel = require("@babel/core");
const parser = require("@babel/parser");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const storage = () => {
  const values = new Map();
  return { getItem: (k) => values.get(k) ?? null, setItem: (k,v) => values.set(k,v), removeItem: (k) => values.delete(k) };
};
function load(file, globals = {}, mocks = {}) {
  const code = babel.transformSync(read(file), { filename: file, babelrc: false, configFile: false, presets: ["@babel/preset-react"], plugins: ["@babel/plugin-transform-modules-commonjs"] }).code;
  const exports = {};
  vm.runInNewContext(code, { exports, console, crypto: webcrypto, require: (id) => mocks[id] || require(id), ...globals }, { filename: file });
  return exports;
}
const makeApi = (s = storage()) => load("src/services/authIntent.js", {sessionStorage: s});
const buyer = { uid: "buyer", isAnonymous: false };
const save = (api, type = "product-offer", payload = {productId: "B"}, returnTo = "/product/B") => api.rememberAuthIntent({type, payload, returnTo});
const claim = (api, extras = {}) => api.claimAuthIntent({types: "product-offer", pathname: "/product/B", uid: buyer.uid, ...extras});

test("intent survives a full document reload with selections, note and query intact", () => {
  const s = storage(), api = makeApi(s);
  const intent = save(api, "product-buy-now", {productId:"B", size:"M", color:"BLUE", qty:2, note:"Please pack carefully"}, "/product/B?source=search");
  const reloaded = makeApi(s);
  assert.equal(reloaded.pendingAuthIntent().id, intent.id);
  assert.equal(reloaded.pendingAuthIntent().payload.qty, 2);
  assert.equal(reloaded.pendingAuthIntent().returnTo, "/product/B?source=search");
  assert.equal(reloaded.claimAuthIntent({uid:buyer.uid}), null);
  reloaded.activateAuthIntent(buyer, "/product/B?source=search", intent.id);
  assert.ok(reloaded.claimAuthIntent({types:"product-buy-now", uid:buyer.uid, pathname:"/product/B"}));
});
test("anonymous identity, wrong account and wrong auth attempt cannot activate or claim", () => {
  const api = makeApi(), intent = save(api);
  assert.equal(api.activateAuthIntent({...buyer, isAnonymous:true}), null);
  assert.equal(api.activateAuthIntent(buyer, "/product/B", "different-attempt"), null);
  api.activateAuthIntent(buyer);
  assert.equal(claim(api, {uid:"other"}), null);
  api.activateAuthIntent({uid:"other"});
  assert.equal(api.pendingAuthIntent(), null);
});
test("wrong product or route never consumes the request; correct product can claim once", () => {
  const api = makeApi(); save(api); api.activateAuthIntent(buyer);
  assert.equal(claim(api, {match:i=>i.payload.productId === "A"}), null);
  assert.equal(claim(api, {pathname:"/product/A"}), null);
  const intent = claim(api, {match:i=>i.payload.productId === "B"});
  assert.ok(intent); assert.equal(claim(api), null);
  assert.ok(api.pendingAuthIntent());
  api.settleAuthIntent(intent, true);
  assert.equal(api.pendingAuthIntent(), null);
});
test("failed action is retained but never auto-repeated until retry is requested", () => {
  const api=makeApi(); save(api); api.activateAuthIntent(buyer);
  const intent=claim(api); api.settleAuthIntent(intent, false);
  assert.equal(api.pendingAuthIntent().phase,"failed"); assert.equal(claim(api),null);
  api.retryAuthIntent(intent.id); assert.ok(claim(api));
  api.settleAuthIntent(intent,true); assert.equal(api.pendingAuthIntent(),null);
});
test("late completion cannot clear a newer user action", () => {
  const api=makeApi(); save(api); api.activateAuthIntent(buyer);
  const first=claim(api), next=save(api,"cart-checkout",{vendorId:"v"},"/latest-cart");
  api.settleAuthIntent(first,true); api.clearAuthIntent(first.id);
  assert.equal(api.pendingAuthIntent().id,next.id);
});
test("profile gate pauses safely and can resume on explicit return", () => {
  const api=makeApi(); save(api); api.activateAuthIntent(buyer);
  const intent=claim(api); api.pauseAuthIntentForProfile(buyer.uid); api.settleAuthIntent(intent,false);
  assert.equal(api.pendingAuthIntent().phase,"waiting-profile"); assert.equal(claim(api),null);
  api.resumeAuthIntentAfterProfile("other"); assert.equal(claim(api),null);
  api.resumeAuthIntentAfterProfile(buyer.uid); assert.ok(claim(api));
});
test("expired/cancelled intents do not resume; unavailable storage fails before redirect", () => {
  const s=storage(), api=makeApi(s); save(api);
  const key="mythrift:pending-auth-intent:v1", data=JSON.parse(s.getItem(key));
  s.setItem(key,JSON.stringify({...data,createdAt:Date.now()-16*60*1000}));
  assert.equal(api.pendingAuthIntent(),null);
  save(api); api.clearAuthIntent(); assert.equal(api.activateAuthIntent(buyer),null);
  const blocked=makeApi({getItem:()=>null,setItem:()=>{throw Error("blocked");},removeItem:()=>{throw Error("blocked");}});
  assert.throws(()=>save(blocked),e=>e.code==="app/auth-storage-unavailable");
  assert.equal(blocked.pendingAuthIntent(),null);
});
test("checkout waits for UID-owned restoration, not merely a preview cache", () => {
  const api=makeApi(); const ready={ownerKey:"user:buyer",hydrated:true,lastSyncedAt:1,status:"ready"};
  assert.equal(api.authCartReady(ready,"buyer"),true);
  assert.equal(api.authCartReady({...ready,ownerKey:"user:other"},"buyer"),false);
  assert.equal(api.authCartReady({...ready,lastSyncedAt:null},"buyer"),false);
  assert.equal(api.authCartReady({...ready,hydrated:false},"buyer"),false);
});

// Mount the real React continuation hook with fake boundaries. No credentials,
// Firestore writes, orders, offers or payments are created by this suite.
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", {url:"https://app.shopmythrift.com/product/B"});
global.window=dom.window; global.document=dom.window.document; global.navigator=dom.window.navigator;
global.IS_REACT_ACT_ENVIRONMENT=true;
const React=require("react");
const {render, act, cleanup}=require("@testing-library/react");
function harness(api, initialAuth={currentUser:buyer,currentUserData:{role:"user"},loading:false}) {
  let authState=initialAuth;
  const firebase={currentUser:buyer}, transitions=[], toasts=[];
  const hook=load("src/custom-hooks/useAuthContinuation.jsx",{window:dom.window},{
    "react-router-dom":{useLocation:()=>({pathname:window.location.pathname})},
    "./useAuth":{useAuth:()=>authState},
    "../firebase.config":{auth:firebase},
    "../services/authIntent":api,
    "../services/authTransition.mjs":{beginAuthTransition:()=>{const t={finished:false,finish(){this.finished=true;}};transitions.push(t);return t;}},
    "react-hot-toast":Object.assign((...args)=>toasts.push(args),{dismiss:()=>{}}),
  }).default;
  function Component({options}) {hook(options);return null;}
  let view;
  const draw=async(options)=>{await act(async()=>{
    const element=React.createElement(React.StrictMode,null,React.createElement(Component,{options}));
    if(view)view.rerender(element);else view=render(element);
  });};
  return {draw,setAuth:value=>{authState=value;},firebase,transitions,toasts};
}
test.afterEach(()=>cleanup());
test("mounted StrictMode consumer waits for profile and data, then opens the action once", async()=>{
  const api=makeApi();save(api);api.activateAuthIntent(buyer);
  const h=harness(api,{currentUser:buyer,currentUserData:null,loading:true});let opens=0;
  const options={types:"product-offer",ready:false,match:i=>i.payload.productId==="B",run:()=>{opens++;return true;}};
  await h.draw(options);assert.equal(opens,0);
  h.setAuth({currentUser:buyer,currentUserData:{role:"user"},loading:false});
  await h.draw(options);assert.equal(opens,0);
  await h.draw({...options,ready:true});await h.draw({...options,ready:true});
  assert.equal(opens,1);assert.equal(api.pendingAuthIntent(),null);assert.equal(h.transitions[0].finished,true);
});
test("mounted consumer does not run before login success explicitly activates it",async()=>{
  const api=makeApi();save(api);const h=harness(api);let opens=0;
  await h.draw({types:"product-offer",run:()=>{opens++;return true;}});assert.equal(opens,0);
  await act(async()=>api.activateAuthIntent(buyer));assert.equal(opens,1);
});
test("two mounted consumers cannot execute the same in-flight action",async()=>{
  const api=makeApi();save(api);api.activateAuthIntent(buyer);
  let calls=0, finish;const done=new Promise(r=>finish=r);
  const options={types:"product-offer",run:async()=>{calls++;await done;return true;}};
  const first=harness(api),second=harness(api);await first.draw(options);await second.draw(options);
  assert.equal(calls,1);assert.ok(api.pendingAuthIntent());
  await act(async()=>finish());assert.equal(api.pendingAuthIntent(),null);
});
test("mounted failed request exposes retry and never loops on re-render",async()=>{
  const api=makeApi();save(api);api.activateAuthIntent(buyer);const h=harness(api);let calls=0;
  const options={types:"product-offer",run:()=>{calls++;return calls>1;}};
  await h.draw(options);await h.draw(options);assert.equal(calls,1);assert.equal(h.toasts.length,1);
  await act(async()=>api.retryAuthIntent(api.pendingAuthIntent().id));assert.equal(calls,2);assert.equal(api.pendingAuthIntent(),null);
});
test("an account switch during asynchronous work invalidates the completion guard",async()=>{
  const api=makeApi();save(api);api.activateAuthIntent(buyer);const h=harness(api);let finish, navigations=0;
  const done=new Promise(r=>finish=r);
  await h.draw({types:"product-offer",run:async(i,u,isCurrent)=>{await done;if(isCurrent())navigations++;return true;}});
  h.firebase.currentUser={uid:"other"};await act(async()=>finish());assert.equal(navigations,0);assert.equal(api.pendingAuthIntent(),null);
});

function walk(node, visit) {
  if(!node||typeof node!=="object")return;visit(node);
  for(const value of Object.values(node))if(Array.isArray(value))value.forEach(v=>walk(v,visit));else if(value&&typeof value==="object")walk(value,visit);
}
function continuationOptions(file, globals) {
  const source=read(file),ast=parser.parse(source,{sourceType:"module",plugins:["jsx"]});let expression;
  walk(ast,node=>{if(node.type==="CallExpression"&&node.callee.name==="useAuthContinuation")expression=node.arguments[0];});
  assert.ok(expression,`Missing continuation in ${file}`);
  return vm.runInNewContext(`(${source.slice(expression.start,expression.end)})`,globals);
}
function namedFunction(file, name, globals) {
  const source=read(file),ast=parser.parse(source,{sourceType:"module",plugins:["jsx"]});let expression;
  walk(ast,node=>{if(node.type==="VariableDeclarator"&&node.id.name===name)expression=node.init;});
  assert.ok(expression,`Missing ${name}`);
  return vm.runInNewContext(`(${source.slice(expression.start,expression.end)})`,globals);
}
test("native/popup completion retains Buy Now selection even when closing clears UI refs",()=>{
  const api=makeApi(), selection={current:{productId:"B",size:"M",color:"BLUE",qty:2}};
  const savedActionRef={current:null};let legacyCalls=0;
  const globals={authIntent:{type:"product-buy-now",returnTo:"/product/B",payload:selection.current},
    savedActionRef,rememberAuthIntent:api.rememberAuthIntent,activateAuthIntent:api.activateAuthIntent,
    clearAuthIntent:api.clearAuthIntent,safeReturnDestination:()=>"/product/B",retainAuthIntentOnComplete:false,
    assertCurrentAccount:user=>assert.equal(user.uid,buyer.uid),toast:()=>{},
    onClose:()=>{selection.current=null;},onComplete:()=>legacyCalls++,
  };
  const file="src/components/PwaModals/AuthModal.jsx";
  namedFunction(file,"preserveInitialAction",globals)();
  namedFunction(file,"completeInitialAction",globals)(buyer);
  assert.equal(selection.current,null);assert.equal(legacyCalls,0);
  const intent=api.claimAuthIntent({types:"product-buy-now",pathname:"/product/B",uid:buyer.uid});
  assert.equal(intent.payload.size,"M");assert.equal(intent.payload.qty,2);
});
test("Google redirect coordinator plus document reload resumes the requested offer, not a home redirect",async()=>{
  const {createGoogleRedirectCoordinator}=await import("../src/services/googleRedirectCoordinator.mjs");
  const s=storage(),before=makeApi(s),saved=save(before),attempt={id:"google-attempt",phase:"awaiting-google",returnTo:"/product/B",intentId:saved.id};
  let finished;
  await createGoogleRedirectCoordinator({readAttempt:()=>attempt,updateAttempt:(id,patch)=>Object.assign(attempt,patch),
    authReady:async()=>{},getResult:async()=>({user:buyer}),currentUser:()=>buyer,
    completeProfile:async()=>({user:buyer,profile:{profileComplete:true}}),importCart:async()=>{},selectExperience:async()=>{},
    cancel:()=>assert.fail("Unexpected cancellation"),finish:(value,uid)=>{finished={...value,phase:"complete",uid};},
  })();
  assert.equal(finished.returnTo,"/product/B");
  const after=makeApi(s);after.activateAuthIntent(buyer,finished.returnTo,finished.intentId);
  const h=harness(after);let opened=0;await h.draw({types:"product-offer",run:()=>{opened++;return true;}});
  assert.equal(opened,1);assert.equal(after.pendingAuthIntent(),null);
});
test("actual follow consumers explicitly follow rather than toggle an existing follow off",async()=>{
  for(const file of ["src/pages/StorePage.jsx","src/components/VendorsData/VendorProfileMoreFromSeller.jsx","src/components/VendorsData/VendorSearchCard.jsx"]){
    let desired;
    const options=continuationOptions(file,{vendor:{id:"v"},vendorId:"v",performFollow:async(user,value)=>{desired=value;return true;}});
    assert.equal(options.match({payload:{vendorId:"other"}}),false);
    await options.run({payload:{vendorId:"v"}},buyer);assert.equal(desired,true);
  }
});
test("real product continuation restores offer selections or exact Buy Now payload",async()=>{
  const calls=[],api=makeApi();save(api,"product-offer",{productId:"B",size:"M",color:"BLUE"});
  const options=continuationOptions("src/pages/UserSide/ProductDetail.jsx",{
    loading:false,product:{id:"B"},id:"B",pendingAuthIntent:api.pendingAuthIntent,authCartReady:api.authCartReady,
    authCartSync:{ownerKey:"user:buyer",hydrated:true,lastSyncedAt:1},currentUser:buyer,
    setSelectedSize:v=>calls.push(["size",v]),setSelectedColor:v=>calls.push(["color",v]),
    setOfferModalOpen:v=>calls.push(["offer",v]),viewSignals:{markOfferOpen:()=>{}},
    handleBuyNow:async(payload,user)=>{calls.push(["buy",payload.qty,user.uid]);return true;},
  });
  api.activateAuthIntent(buyer);const h=harness(api);await h.draw(options);
  assert.deepEqual(calls,[["size","M"],["color","BLUE"],["offer",true]]);
  await act(async()=>{save(api,"product-buy-now",{productId:"B",size:"M",color:"BLUE",qty:2});api.activateAuthIntent(buyer);});
  assert.deepEqual(calls.at(-1),["buy",2,"buyer"]);
});
test("real cart continuation hands off the saved vendor and note only after restoration",async()=>{
  window.history.replaceState(null,"","/latest-cart");
  const api=makeApi();save(api,"cart-checkout",{vendorId:"v",note:"Pack carefully"},"/latest-cart");api.activateAuthIntent(buyer);
  const calls=[],h=harness(api),globals={authCartReady:api.authCartReady,currentUser:buyer,
    cartSync:{ownerKey:"user:buyer",hydrated:true,lastSyncedAt:null},
    setPendingVendorForCheckout:()=>{},setVendorNotes:()=>{},
    requestCheckoutRef:{current:async(v,u,options)=>{calls.push([v,u.uid,options.note]);return true;}},
  };
  await h.draw(continuationOptions("src/pages/Cart.jsx",globals));assert.equal(calls.length,0);
  globals.cartSync.lastSyncedAt=1;
  await h.draw(continuationOptions("src/pages/Cart.jsx",globals));assert.deepEqual(calls,[["v","buyer","Pack carefully"]]);
  window.history.replaceState(null,"","/product/B");
});
test("all quick-auth surfaces have one continuation path, not a competing success callback",()=>{
  for(const file of ["src/pages/Cart.jsx","src/pages/Profile.jsx","src/pages/UserSide/ProductDetail.jsx","src/pages/StorePage.jsx","src/pages/vendor/VendorRatings.jsx","src/components/VendorsData/VendorSearchCard.jsx","src/components/VendorsData/VendorProfileMoreFromSeller.jsx"]){
    const source=read(file);assert.match(source,/useAuthContinuation\(/);assert.doesNotMatch(source,/takeAuthIntent/);
    const ast=parser.parse(source,{sourceType:"module",plugins:["jsx"]});
    walk(ast,node=>{if(node.type==="JSXOpeningElement"&&node.name.name==="QuickAuthModal")assert.ok(!node.attributes.some(a=>a.name?.name==="onComplete"),file);});
  }
});
