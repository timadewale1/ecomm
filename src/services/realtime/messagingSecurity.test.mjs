import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {transformSync} from 'esbuild';
const require=createRequire(import.meta.url);
const compile=path=>transformSync(readFileSync(new URL(path,import.meta.url),'utf8'),{format:'cjs'}).code;
function harness(path) {
  const auth={currentUser:{uid:'a'}},actions=[],listeners=[],requests=[],events=[];
  const state={buyerOrders:{},buyerOffers:{},notificationsRealtime:{}};
  const module={exports:{}};
  const actionCreators=new Proxy({},{get:(_,type)=>payload=>({type,payload})});
  const snapshotDocument=doc=>({id:doc.id,...doc.data()});
  const firestore={collection:(_,name)=>name,doc:(_,name,uid)=>[name,uid],where:(...args)=>args,
    query:(...args)=>args,orderBy:(...args)=>args,Timestamp:{fromMillis:value=>value},
    onSnapshot:(q,options,next,fail)=>{
      const listener={q,next,fail,stopped:false};listeners.push(listener);return()=>{listener.stopped=true;};
    },getDocsFromServer:q=>new Promise(resolve=>requests.push({q,resolve}))};
  vm.runInNewContext(compile(path),{module,exports:module.exports,
    console:{error(){},warn(){}},window:{setInterval:()=>1,clearInterval(){},dispatchEvent:e=>events.push(e)},
    CustomEvent:class {constructor(name,options){this.name=name;this.detail=options.detail;}},
    require:name=>{
      if(name==='firebase/firestore') return firestore;
      if(name.includes('firebase.config')) return {auth,db:{}};
      if(name.endsWith('/store')) return {dispatch:action=>actions.push(action),getState:()=>state};
      if(name.includes('/reducers/')) return actionCreators;
      if(name.endsWith('serializeFirestore')) return {snapshotDocument,snapshotChanges:snap=>snap.docChanges().map(change=>({type:change.type,id:change.doc.id,data:snapshotDocument(change.doc)}))};
      if(name.endsWith('/offerConversations')) return {repairOfferConversationAvatars(){},resetOfferConversationAvatarRepair(){}};
      throw new Error(`Unexpected import ${name}`);
    }});
  return {...module.exports,auth,actions,listeners,requests,events};
}
const snapshot=(type='order')=>{
  const doc={id:'one',data:()=>({type,userId:'a',buyerId:'a',vendorId:'v',latestEvent:{id:'event',actorRole:'vendor'}}),metadata:{hasPendingWrites:false}};
  return {docs:[doc],docChanges:()=>[{type:'added',doc}],metadata:{fromCache:false}};
};
test('user realtime listeners and manual refreshes ignore an old account before React cleanup occurs',async()=>{
  const h=harness('./userRealtimeSync.js');
  const stop=h.startUserRealtimeSync('a');
  assert.equal(h.listeners.length,5);
  h.listeners[2].next(snapshot());
  assert.equal(h.actions.at(-1).type,'buyerOfferChangesReceived');
  const pending=h.refreshBuyerOffersFromServer('a');
  h.auth.currentUser={uid:'b'};
  const count=h.actions.length;
  for(const listener of h.listeners){listener.next(snapshot());listener.fail(new Error('late'));}
  h.requests[0].resolve(snapshot());await pending;
  assert.equal(h.actions.length,count);
  stop();assert.ok(h.listeners.every(l=>l.stopped));
  h.startUserRealtimeSync('b');
  const newCount=h.actions.length;
  h.listeners[2].next(snapshot());assert.equal(h.actions.length,newCount);
});
test('notification messages remain excluded and same-UID re-login cannot apply an older refresh',async()=>{
  const h=harness('./userRealtimeSync.js');
  h.startUserRealtimeSync('a');
  h.listeners[3].next(snapshot('offer-message'));
  assert.equal(h.actions.at(-1).payload.changes[0].type,'removed');
  const pending=h.refreshNotificationsFromServer('a');
  h.auth.currentUser={uid:'a'};
  h.startUserRealtimeSync('a');
  const count=h.actions.length;
  h.requests[0].resolve(snapshot());await pending;
  assert.equal(h.actions.length,count);
  const fresh=h.refreshNotificationsFromServer('a');
  h.requests[1].resolve(snapshot('offer-message'));await fresh;
  assert.equal(h.actions.at(-1).payload.documents.length,0);
});
test('conversation subscriptions and toast events cannot cross account or role boundaries',()=>{
  const h=harness('./offerConversationSync.js');
  const stop=h.startOfferConversationSync('a','user');
  assert.deepEqual(Array.from(h.listeners[0].q[1]),['buyerId','==','a']);
  h.listeners[0].next(snapshot());
  h.auth.currentUser={uid:'b'};
  const count=h.actions.length;
  h.listeners[0].next(snapshot());h.listeners[0].fail(new Error('late'));
  assert.equal(h.actions.length,count);assert.equal(h.events.length,0);
  stop();assert.equal(h.listeners[0].stopped,true);
  h.startOfferConversationSync('b','vendor');
  assert.deepEqual(Array.from(h.listeners[1].q[1]),['vendorId','==','b']);
});
test('notification optimistic updates and failure rollbacks cannot restore another account data',()=>{
  const module={exports:{}};
  vm.runInNewContext(compile('../../redux/reducers/notificationsRealtimeSlice.js'),{module,exports:module.exports,
    require:name=>{assert.equal(name,'@reduxjs/toolkit');return require(name);}});
  const m=module.exports,reducer=m.default;
  let state=reducer(undefined,m.notificationsSyncStarted('a'));
  state=reducer(state,m.notificationServerSnapshotReplaced({uid:'a',documents:[{id:'n',userId:'a',seen:false}]}));
  state=reducer(state,m.notificationPatched({uid:'a',id:'n',changes:{seen:true}}));
  assert.equal(state.entities.n.seen,true);
  state=reducer(state,m.notificationRemoved({uid:'a',id:'n'}));assert.equal(state.ids.length,0);
  state=reducer(state,m.notificationsSyncStarted('b'));
  const previous=state;
  for(const action of [m.notificationRestored({uid:'a',notification:{id:'n',userId:'a'}}),
    m.notificationRestored({uid:'b',notification:{id:'n',userId:'a'}}),
    m.notificationPatched({uid:'a',id:'n',changes:{seen:false}}),m.notificationRemoved({uid:'a',id:'n'})]) state=reducer(state,action);
  assert.equal(state,previous);
});
