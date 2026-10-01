import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {transformSync} from 'esbuild';
import * as scopes from '../../services/chatRequestScope.mjs';
const require=createRequire(import.meta.url), toolkit=require('@reduxjs/toolkit');
const compiled=transformSync(readFileSync(new URL('./chatSlice.js',import.meta.url),'utf8'),{format:'cjs'}).code;
function harness() {
  const auth={currentUser:{uid:'vendor-a'}},profiles=[],listeners=[],prepared=[],readPaths=[];
  const module={exports:{}};
  vm.runInNewContext(compiled,{module,exports:module.exports,AbortController,console:{error(){}},setTimeout,clearTimeout,
    require:name=>{
      if(name==='@reduxjs/toolkit') return toolkit;
      if(name.includes('firebase.config')) return {auth,db:{}};
      if(name.includes('chatRequestScope')) return scopes;
      if(name.includes('legacyInquiryAccess')) return {prepareLegacyInquiryView:async id=>{prepared.push(id);}};
      if(name.includes('chatParticipantProfiles')) return {getChatParticipantProfile:request=>new Promise(resolve=>profiles.push({request,resolve}))};
      if(name==='firebase/firestore') return {
        doc:(_,collection,id)=>({collection,id}),
        getDoc:async ref=>{readPaths.push(ref);return {id:ref.id,exists:()=>true,data:()=>({productId:'product',customerId:'buyer',question:ref.id})};},
        onSnapshot:(ref,next)=>{const listener={ref,next,stopped:false};listeners.push(listener);return()=>{listener.stopped=true;};},
      };
      throw new Error(`Unexpected dependency ${name}`);
    }});
  const store=toolkit.configureStore({reducer:{chat:module.exports.default},middleware:get=>get({serializableCheck:false})});
  return {...module.exports,auth,store,profiles,listeners,prepared,readPaths};
}
const flush=async()=>{for(let i=0;i<8;i++) await Promise.resolve();};
test('legacy question links prepare and read only safe projections, and ignore earlier-account profile responses',async()=>{
  const h=harness();
  const old=h.store.dispatch(h.fetchInquiryDetails('old-question'));await flush();
  h.auth.currentUser={uid:'vendor-b'};
  const fresh=h.store.dispatch(h.fetchInquiryDetails('new-question'));await flush();
  h.profiles[1].resolve({uid:'buyer',displayName:'New Buyer'});await fresh;
  h.profiles[0].resolve({uid:'buyer',displayName:'Old Buyer'});await old;
  assert.equal(h.store.getState().chat.ownerUid,'vendor-b');
  assert.equal(h.store.getState().chat.inquiry.id,'new-question');
  assert.equal(h.store.getState().chat.customer.username,'New Buyer');
  assert.ok(h.readPaths.every(ref=>ref.collection!=='inquiries'));
  assert.deepEqual(h.prepared,['old-question','new-question']);
});
test('legacy question listeners are stopped on navigation and cannot overwrite the next inquiry for the same account',async()=>{
  const h=harness();
  const first=h.store.dispatch(h.fetchInquiryDetails('one'));await flush();
  h.profiles[0].resolve({uid:'buyer',displayName:'Buyer'});await first;
  await h.store.dispatch(h.subscribeToInquiry('one'));
  const second=h.store.dispatch(h.fetchInquiryDetails('two'));await flush();
  assert.equal(h.listeners[0].stopped,true);
  h.profiles[1].resolve({uid:'buyer',displayName:'Buyer'});await second;
  await h.store.dispatch(h.subscribeToInquiry('two'));
  h.listeners[0].next({id:'one',exists:()=>true,data:()=>({question:'stale'})});
  assert.equal(h.store.getState().chat.inquiry.id,'two');
  h.listeners[1].next({id:'two',exists:()=>true,data:()=>({question:'fresh'})});
  assert.equal(h.store.getState().chat.inquiry.question,'fresh');
  h.store.dispatch(h.clearChat());assert.ok(h.listeners.every(l=>l.stopped));
});
test('a late subscription completion after a page closes is immediately unsubscribed',async()=>{
  const h=harness();
  const first=h.store.dispatch(h.fetchInquiryDetails('one'));await flush();
  h.profiles[0].resolve({uid:'buyer',displayName:'Buyer'});await first;
  const subscribing=h.store.dispatch(h.subscribeToInquiry('one'));
  h.store.dispatch(h.clearChat());await subscribing;
  assert.equal(h.listeners[0].stopped,true);
  assert.equal(h.store.getState().chat.inquiryUnsubscribe,null);
});
