import test from 'node:test';
import assert from 'node:assert/strict';
import {AUTHORED_LIBRARY_KEY,readAuthoredLibrary,editAuthoredLibrary,commitAuthoredLibrary,findAuthoredBases,recoverAuthoredLibrary,previewAuthoredLibraryImport} from '../lib/authored-base-library.ts';
import {captureAuthoredBase} from '../lib/authored-base-package.ts';
import {DEFAULT_VALIDATION} from '../lib/wulfram.ts';
function entry(id='first',name='Harbor'){
 const base=captureAuthoredBase({id:'source',name:'Hand made base',validation:{...DEFAULT_VALIDATION},metadata:{'forge.districts.v1':JSON.stringify([{id:'power',name:'Supply yard',entityIds:['one'],locked:true}])},updatedAt:'test',entities:[{id:'one',token:'e',team:1,position:[1000,1000,10],rotation:[0,0,0],active:1}]},{origin:[1000,1000,0],yaw:0});
 return {id,name,base};
}
function storage(initial=null){const data=new Map(initial===null?[]:[[AUTHORED_LIBRARY_KEY,initial]]);return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};}
await test('save, search, rename and remove preserve packages and leave source untouched',()=>{
 const source=readAuthoredLibrary(null),before=structuredClone(source),e=entry();
 const saved=editAuthoredLibrary(source,{operation:'save',entry:e},'r1');assert.deepEqual(source,before);
 assert.deepEqual(readAuthoredLibrary(JSON.stringify(saved)),saved);
 assert.equal(findAuthoredBases(saved,'harbor supply')[0].id,e.id);
 const renamed=editAuthoredLibrary(saved,{operation:'rename',id:e.id,name:'Harbor Large'},'r2');assert.deepEqual(renamed.entries[0].base,JSON.parse(JSON.stringify(e.base)));
 const removed=editAuthoredLibrary(renamed,{operation:'remove',id:e.id},'r3');assert.deepEqual(removed.entries,[]);
 const restored=editAuthoredLibrary(removed,{operation:'restore',entries:renamed.entries},'r4');assert.deepEqual(restored.entries,renamed.entries);
});
await test('stale writes and stale Undo reject before touching storage',()=>{
 const s=storage();const first=commitAuthoredLibrary(s,null,{operation:'save',entry:entry()},'r1');
 const second=commitAuthoredLibrary(s,first.raw,{operation:'rename',id:'first',name:'Changed'},'r2');
 assert.throws(()=>commitAuthoredLibrary(s,null,{operation:'save',entry:entry('another','Another')},'r3'),/changed/);
 assert.throws(()=>commitAuthoredLibrary(s,first.raw,{operation:'restore',entries:first.before.entries},'r4'),/changed/);
 assert.equal(s.getItem(AUTHORED_LIBRARY_KEY),second.raw);
});
await test('corrupt data, duplicate names/IDs, bad packages and capacity limits reject',()=>{
 assert.throws(()=>readAuthoredLibrary('{broken'));
 const s=storage('{broken');assert.throws(()=>commitAuthoredLibrary(s,'{broken',{operation:'save',entry:entry()},'r1'));assert.equal(s.getItem(AUTHORED_LIBRARY_KEY),'{broken');
 const library=editAuthoredLibrary(readAuthoredLibrary(null),{operation:'save',entry:entry()},'r1');
 for(const e of [entry('first','Other'),entry('other','HARBOR'),{...entry('other','Other'),base:{}}])assert.throws(()=>editAuthoredLibrary(library,{operation:'save',entry:e},'r2'));
 const full={...library,entries:Array.from({length:50},(_,i)=>entry(`id-${i}`,`Base ${i}`))};
 assert.equal(readAuthoredLibrary(JSON.stringify(full)).entries.length,50);
 assert.throws(()=>editAuthoredLibrary(full,{operation:'save',entry:entry()},'r2'));
 assert.throws(()=>readAuthoredLibrary(' '.repeat(2_000_001)),/2 MB/);
});
await test('quota errors and unverified writes never report success',()=>{
 const s=storage();s.setItem=()=>{throw new Error('Quota exceeded');};
 assert.throws(()=>commitAuthoredLibrary(s,null,{operation:'save',entry:entry()},'r1'),/Quota/);assert.equal(s.getItem(AUTHORED_LIBRARY_KEY),null);
 s.setItem=()=>{};assert.throws(()=>commitAuthoredLibrary(s,null,{operation:'save',entry:entry()},'r1'),/verified/);
});

await test('authored recovery keeps exact corrupt bytes and produces a readable fresh envelope',()=>{
 const damaged='  {broken\n',s=storage(damaged);
 const result=recoverAuthoredLibrary(s,damaged,'recovery-one','fresh');
 assert.equal(s.getItem(result.backupKey),damaged);
 assert.deepEqual(readAuthoredLibrary(s.getItem(AUTHORED_LIBRARY_KEY)),result.after);
 assert.equal(result.after.revision,'fresh');assert.deepEqual(result.after.entries,[]);
 assert.throws(()=>recoverAuthoredLibrary(s,result.raw,'two','next'),/valid/);
 assert.equal(s.getItem(AUTHORED_LIBRARY_KEY),result.raw);
});
await test('authored recovery rejects stale input and bad revision without losing stored bytes',()=>{
 const s=storage('broken');
 assert.throws(()=>recoverAuthoredLibrary(s,'older','one','fresh'),/changed/);
 assert.throws(()=>recoverAuthoredLibrary(s,'broken','one','empty'),/revision/);
 assert.equal(s.getItem(AUTHORED_LIBRARY_KEY),'broken');
 assert.equal(s.getItem(`${AUTHORED_LIBRARY_KEY}-recovery-one`),null);
});

await test('portable library merge skips identical entries regardless of object key order',()=>{
 const source=editAuthoredLibrary(readAuthoredLibrary(null),{operation:'save',entry:entry()},'s1');
 const same=JSON.parse(JSON.stringify(source));same.entries[0]={base:same.entries[0].base,name:same.entries[0].name,id:same.entries[0].id};
 const incoming=editAuthoredLibrary(same,{operation:'save',entry:entry('second','Second')},'s2');
 const before=structuredClone(source),preview=previewAuthoredLibraryImport(source,incoming);
 assert.equal(preview.added,1);assert.equal(preview.skipped,1);assert.deepEqual(source,before);
 const applied=editAuthoredLibrary(source,{operation:'import',library:incoming},'s3');assert.deepEqual(applied.entries,preview.entries);
 assert.deepEqual(readAuthoredLibrary(JSON.stringify(applied)),applied);
});
await test('portable library conflicts and overflow reject the complete merge without storage changes',()=>{
 const source=editAuthoredLibrary(readAuthoredLibrary(null),{operation:'save',entry:entry()},'s1'),raw=JSON.stringify(source),s=storage(raw);
 for(const e of [entry('first','Different'),entry('other','HARBOR')]){
  const incoming=editAuthoredLibrary(readAuthoredLibrary(null),{operation:'save',entry:e},'i1');
  assert.throws(()=>commitAuthoredLibrary(s,raw,{operation:'import',library:incoming},'next'),/conflict/);assert.equal(s.getItem(AUTHORED_LIBRARY_KEY),raw);
 }
 const full={...source,entries:Array.from({length:50},(_,i)=>entry(`id-${i}`,`Name ${i}`))};
 assert.throws(()=>previewAuthoredLibraryImport(full,source),/Invalid authored library/);
});
