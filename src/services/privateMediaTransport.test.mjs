import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrivateMediaTransport} from './privateMediaTransport.mjs';
const response = () => ({ok:true,blob:async()=>new Blob(['photo'],{type:'image/jpeg'}),json:async()=>({storagePath:'private/path'})});
test('private upload uses a header token, raw file and no credentials or persistent cache',async()=>{
 const session={getIdToken:async()=>'secret'},auth={currentUser:session};
 let call;
 const request=createPrivateMediaTransport({auth,endpoint:'https://example.test/media',fetchImpl:async(...args)=>{call=args;return response();}});
 const file=new Blob(['photo'],{type:'image/jpeg'});
 await request({kind:'identity'},{file});
 assert.equal(call[0].includes('secret'),false);
 assert.equal(call[1].headers.Authorization,'Bearer secret');
 assert.equal(call[1].body,file);
 assert.equal(call[1].cache,'no-store');
 assert.equal(call[1].credentials,'omit');
});
test('anonymous checkout owners may request proof reads but cannot upload',async()=>{
 const auth={currentUser:{isAnonymous:true,getIdToken:async()=>'token'}};
 const request=createPrivateMediaTransport({auth,endpoint:'https://example.test/media',fetchImpl:async()=>response()});
 assert.equal((await request({entityType:'order',entityId:'own'})).type,'image/jpeg');
 await assert.rejects(request({kind:'identity'},{file:new Blob(['photo'])}),/sign in/);
});
test('account switches during token lookup or response hydration discard private results',async()=>{
 const session={getIdToken:async()=>'token'},auth={currentUser:session};
 const request=createPrivateMediaTransport({auth,endpoint:'https://example.test/media',fetchImpl:async()=>{auth.currentUser={};return response();}});
 await assert.rejects(request({}),/account changed/);
 auth.currentUser=session;
 session.getIdToken=async()=>{auth.currentUser=null;return 'token';};
 await assert.rejects(request({}),/account changed/);
});
test('failed image responses surface an actionable message and never become blob URLs',async()=>{
 const auth={currentUser:{getIdToken:async()=>'token'}};
 const request=createPrivateMediaTransport({auth,endpoint:'https://example.test/media',fetchImpl:async()=>({ok:false,json:async()=>({error:'Image unavailable'})})});
 await assert.rejects(request({}),/Image unavailable/);
 const wrong=createPrivateMediaTransport({auth,endpoint:'https://example.test/media',fetchImpl:async()=>({ok:true,blob:async()=>new Blob(['bad'],{type:'text/html'})})});
 await assert.rejects(wrong({}),/could not be displayed/);
});
