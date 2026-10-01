import test from 'node:test';
import assert from 'node:assert/strict';
import {captureChatSession,createScopedChatCallable} from './chatRequestScope.mjs';
test('chat calls reject missing/anonymous accounts before invoking the server',async()=>{
  let calls=0;
  for(const session of [null,{uid:'guest',isAnonymous:true}]) {
    const call=createScopedChatCallable({getSession:()=>session,invoke:()=>calls++});
    await assert.rejects(call('send',{}),{code:'auth/session-changed'});
  }
  assert.equal(calls,0);
});
test('chat responses from a signed-out, replaced or same-UID renewed session are discarded',async()=>{
  for(const next of [null,{uid:'b'},{uid:'a'}]) {
    let session={uid:'a'},finish;
    const call=createScopedChatCallable({getSession:()=>session,invoke:()=>new Promise(resolve=>{finish=resolve;})});
    const pending=call('send',{});
    session=next;finish({data:{conversationId:'private'}});
    await assert.rejects(pending,{code:'auth/session-changed'});
  }
});
test('token refresh on the same user object and normal requests keep working',async()=>{
  const session={uid:'a'};
  const scope=captureChatSession(()=>session);
  session.token='renewed';scope.assertCurrent();
  const call=createScopedChatCallable({getSession:()=>session,invoke:async(name,payload)=>({name,payload})});
  assert.deepEqual(await call('send',{text:'Hello'}),{name:'send',payload:{text:'Hello'}});
});
