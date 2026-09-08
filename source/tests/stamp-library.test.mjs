import test from 'node:test';
import assert from 'node:assert/strict';
import {readStampLibrary,mergeStampLibraries,recoverStampLibrary,STAMP_LIBRARY_KEY} from '../lib/stamp-library.ts';
const stamp={name:'Ridge',options:{preset:'ridge',radius:300,aspect:.5,rotation:0,amplitude:100,edgePower:2,mirror:false,shapeVersion:'natural-v2',seed:'saved',length:900,width:300}};
void test('Mesa and basin settings survive library export/import and identical merges',()=>{
 const entries=['mesa','basin'].map(preset=>({name:preset,options:{...stamp.options,preset}}));
 const loaded=readStampLibrary(JSON.stringify({format:'wulfram-stamp-library',version:1,entries}));
 assert.deepEqual(loaded,entries);assert.deepEqual(mergeStampLibraries(loaded,entries),{entries,added:0,skipped:2});
});
void test('Corrupt library recovery verifies backup before replacing active data',()=>{
  const values=new Map([[STAMP_LIBRARY_KEY,'broken original']]);
  const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
  assert.throws(()=>recoverStampLibrary({...storage,setItem:()=>{throw new Error('quota');}},'failed'),/quota/);
  assert.equal(storage.getItem(STAMP_LIBRARY_KEY),'broken original');
  assert.throws(()=>recoverStampLibrary({...storage,setItem:()=>{}},'lost'),/verify/);
  assert.equal(storage.getItem(STAMP_LIBRARY_KEY),'broken original');
  const key=recoverStampLibrary(storage,'ok');assert.equal(storage.getItem(key),'broken original');assert.equal(storage.getItem(STAMP_LIBRARY_KEY),'[]');
  assert.throws(()=>recoverStampLibrary(storage,'ok'),/already exists/);
});
void test('Stamp libraries retain shape settings and accept legacy arrays or versioned files',()=>{
  assert.deepEqual(readStampLibrary(JSON.stringify([stamp])),[stamp]);
  assert.deepEqual(readStampLibrary(JSON.stringify({format:'wulfram-stamp-library',version:1,entries:[stamp]})),[stamp]);
  assert.throws(()=>readStampLibrary(JSON.stringify({format:'wulfram-stamp-library',version:2,entries:[stamp]})),/supported/);
  const extra=structuredClone(stamp);extra.options.x=42;assert.deepEqual(readStampLibrary(JSON.stringify([extra])),[stamp]);
  for(const [key,value] of [['radius',null],['amplitude',0],['mirror',1],['shapeVersion','future'],['seed',123],['width',1],['naturalness',2]]){
    const invalid=structuredClone(stamp);invalid.options[key]=value;assert.throws(()=>readStampLibrary(JSON.stringify([invalid])));
  }
});
void test('Stamp merging is atomic, preserves conflicts, skips duplicates and never evicts at capacity',()=>{
  const current=[stamp],before=structuredClone(current);
  assert.deepEqual(mergeStampLibraries(current,[stamp]),{entries:current,added:0,skipped:1});
  assert.throws(()=>mergeStampLibraries(current,[{...stamp,options:{...stamp.options,seed:'different'}}]),/already exists/);
  const full=Array.from({length:30},(_,i)=>({...stamp,name:`Stamp ${i}`}));
  assert.throws(()=>mergeStampLibraries(full,[stamp]),/full/);
  assert.deepEqual(current,before);
  assert.equal(mergeStampLibraries(current,[{...stamp,name:'Valley'}]).added,1);
  assert.throws(()=>readStampLibrary(JSON.stringify([...full,stamp])),/30/);
});
