import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {transformSync} from 'esbuild';
const require = createRequire(import.meta.url);
const toolkit = require('@reduxjs/toolkit');
const compiled = transformSync(readFileSync(new URL('./vendorChatSlice.js',import.meta.url),'utf8'), {format:'cjs'}).code;

function harness() {
  const auth={currentUser:{uid:'vendor-a'}};
  const pending=[];
  const module={exports:{}};
  vm.runInNewContext(compiled,{module,exports:module.exports,AbortController,Date,setTimeout,clearTimeout,
    require:name=> name==='@reduxjs/toolkit'?toolkit:name.includes('firebase.config')?{auth}:{
      getChatParticipantProfile:request=>new Promise((resolve,reject)=>pending.push({request,resolve,reject})),
    },
  });
  const store=toolkit.configureStore({reducer:{vendorChats:module.exports.default}});
  return {auth,store,pending,fetch:module.exports.fetchCustomerProfile};
}
test('avatar fallbacks coalesce concurrent reads and cache successes', async () => {
  const h=harness();
  const request={customerId:'buyer',conversationId:'chat'};
  const first=h.store.dispatch(h.fetch(request));
  await h.store.dispatch(h.fetch(request));
  assert.equal(h.pending.length,1);
  h.pending[0].resolve({uid:'buyer',displayName:'Buyer',photoURL:'photo'});
  await first;
  await h.store.dispatch(h.fetch(request));
  assert.equal(h.pending.length,1);
  assert.equal(h.store.getState().vendorChats.profiles.buyer.photoURL,'photo');
});
test('account changes isolate caches and discard an earlier account request', async () => {
  const h=harness();
  const first=h.store.dispatch(h.fetch({customerId:'buyer',conversationId:'a'}));
  h.auth.currentUser={uid:'vendor-b'};
  const second=h.store.dispatch(h.fetch({customerId:'buyer',conversationId:'b'}));
  h.pending[1].resolve({uid:'buyer',displayName:'Correct',photoURL:'new'});
  await second;
  h.pending[0].resolve({uid:'buyer',displayName:'Old',photoURL:'old'});
  await first;
  assert.equal(h.store.getState().vendorChats.ownerUid,'vendor-b');
  assert.equal(h.store.getState().vendorChats.profiles.buyer.photoURL,'new');
  h.auth.currentUser=null;
  assert.equal(h.store.dispatch(h.fetch({customerId:'buyer',conversationId:'a'})),undefined);
});
test('failed avatar reads back off rather than triggering a render/request loop', async () => {
  const h=harness();
  const request={customerId:'buyer',inquiryId:'question'};
  const first=h.store.dispatch(h.fetch(request));
  h.pending[0].reject(new Error('Unavailable'));
  await first;
  await h.store.dispatch(h.fetch(request));
  assert.equal(h.pending.length,1);
  assert.equal(h.store.getState().vendorChats.profileRequests.buyer.status,'error');
});
