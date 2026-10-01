import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {transformSync} from 'esbuild';
const code=transformSync(readFileSync(new URL('./vendorFollow.js',import.meta.url),'utf8'),{format:'cjs'}).code;
function harness() {
 const auth={currentUser:{uid:'buyer'}}, calls=[], listeners=[], module={exports:{}};
 vm.runInNewContext(code,{module,exports:module.exports,require:name=>{
  if(name==='../firebase.config') return {auth,db:{},functions:{}};
  if(name==='firebase/functions') return {httpsCallable:(_,name)=>data=>new Promise((resolve,reject)=>calls.push({name,data,resolve,reject}))};
  if(name==='firebase/firestore') return {
   collection:(_,name)=>name,where:(...args)=>args,limit:n=>n,query:(...args)=>args,
   onSnapshot:(q,next,error)=>{const l={q,next,error,stopped:false};listeners.push(l);return()=>{l.stopped=true;};},
   getDocs:async q=>({empty:!q}),
  };
  throw new Error(name);
 }});
 return {...module.exports,auth,calls,listeners};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('rapid follow/unfollow intents are serialized; identical in-flight actions share the request',async()=>{
 const h=harness();
 const set=shouldFollow=>h.setVendorFollowState({userId:'buyer',vendorId:'store',shouldFollow});
 const first=set(true),duplicate=set(true),second=set(false),last=set(true);
 assert.equal(h.calls.length,1);
 assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0].data)),{vendorId:'store',shouldFollow:true});
 h.calls[0].resolve({data:{followed:true}});await first;await duplicate;await tick();
 assert.equal(h.calls.length,2);assert.equal(h.calls[1].data.shouldFollow,false);
 h.calls[1].resolve({data:{followed:false}});await second;await tick();
 assert.equal(h.calls.length,3);assert.equal(h.calls[2].data.shouldFollow,true);
 h.calls[2].resolve({data:{followed:true}});assert.equal((await last).followed,true);
});
test('queued writes and late results do not cross logout, account switch or same-UID re-login',async()=>{
 for(const replacement of [null,{uid:'other'},{uid:'buyer'}]) {
  const h=harness();
  const first=h.setVendorFollowState({userId:'buyer',vendorId:'store',shouldFollow:true});
  const next=h.setVendorFollowState({userId:'buyer',vendorId:'store',shouldFollow:false});
  const checked=Promise.all([assert.rejects(first,/account changed/),assert.rejects(next,/account changed/)]);
  h.auth.currentUser=replacement;h.calls[0].resolve({data:{followed:true}});await checked;
  assert.equal(h.calls.length,1);
 }
});
test('owner subscriptions use both identity filters and suppress late events',()=>{
 const h=harness(),values=[];
 const stop=h.subscribeVendorFollow('buyer','store',v=>values.push(v));
 assert.deepEqual(JSON.parse(JSON.stringify(h.listeners[0].q)),['follows',['userId','==','buyer'],['vendorId','==','store'],1]);
 h.listeners[0].next({empty:false});assert.deepEqual(values,[true]);
 h.auth.currentUser=null;h.listeners[0].next({empty:true});assert.deepEqual(values,[true]);
 stop();assert.equal(h.listeners[0].stopped,true);
});
test('anonymous or stale identities cannot make a follow request',async()=>{
 const h=harness();
 await assert.rejects(h.setVendorFollowState({userId:'other',vendorId:'store',shouldFollow:true}));
 h.auth.currentUser={uid:'buyer',isAnonymous:true};
 await assert.rejects(h.setVendorFollowState({userId:'buyer',vendorId:'store',shouldFollow:true}));
 assert.equal(h.calls.length,0);
});
