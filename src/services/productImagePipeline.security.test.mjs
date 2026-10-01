import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {transformSync} from 'esbuild';
const code=transformSync(readFileSync(new URL('./productImagePipeline.js',import.meta.url),'utf8'),{format:'cjs'}).code;
test('bounded image uploads preserve order, progress and cleanup references while adding ownership metadata',async()=>{
 const calls=[],deleted=[],progress=[],module={exports:{}};
 let active=0,peak=0;
 vm.runInNewContext(code,{module,exports:module.exports,require:name=>{
  if(name==='compressorjs')return class {};
  if(name!=='firebase/storage')throw new Error(name);
  return {ref:(_,path)=>({path}),getDownloadURL:async ref=>`https://example.test/${ref.path}`,deleteObject:async ref=>deleted.push(ref.path),
   uploadBytesResumable:(ref,file,metadata)=>{
    calls.push({ref,file,metadata});active++;peak=Math.max(peak,active);
    const task={snapshot:{ref},cancel(){},on:(_event,onProgress,_error,done)=>setImmediate(()=>{onProgress({bytesTransferred:file.size});active--;done();})};
    return task;
   }};
 }});
 const entries=Array.from({length:8},(_,i)=>({key:String(i),path:`vendor/products/new-product/image-${i}.jpg`,file:{type:'image/jpeg',size:100}}));
 const uploaded=await module.exports.uploadProductImageBatch({storage:{},entries,onProgress:p=>progress.push(p)});
 assert.equal(peak,2);assert.equal(uploaded.length,8);assert.equal(progress.at(-1).percent,100);
 assert.deepEqual(Array.from(uploaded,e=>e.key),entries.map(e=>e.key));
 assert.ok(calls.every(c=>c.metadata.customMetadata.productId==='new-product' && c.metadata.contentType==='image/jpeg'));
 await module.exports.deleteProductImageRefs(uploaded.map(u=>u.storageRef));assert.equal(deleted.length,8);
});
