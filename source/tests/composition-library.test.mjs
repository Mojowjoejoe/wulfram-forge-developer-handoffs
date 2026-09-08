import test from 'node:test';
import assert from 'node:assert/strict';
import {readCompositionLibrary,saveCompositionEntry} from '../lib/composition-library.ts';
const recipe={version:1,name:'Ridge',stamps:[{id:'one',offset:[0,0],options:{preset:'ridge',radius:200,aspect:1,rotation:0,amplitude:50,edgePower:2,mirror:false}}]};
void test('Saved recipes update explicitly, rename safely, and preserve source and geometry',()=>{
 const current=saveCompositionEntry([],recipe),before=structuredClone(current);
 assert.throws(()=>saveCompositionEntry(current,recipe),/already saved/);
 const edited=structuredClone(recipe);edited.name='Ridge and pass';edited.stamps[0].offset=[200,-300];
 const next=saveCompositionEntry(current,edited,'Ridge');assert.deepEqual(next,[edited]);assert.deepEqual(current,before);
 assert.throws(()=>saveCompositionEntry(next,recipe,'missing'),/no longer exists/);
 const two=saveCompositionEntry(current,edited);assert.throws(()=>saveCompositionEntry(two,{...edited,name:'Ridge'},edited.name),/already saved/);
});
void test('Malformed and over-capacity libraries reject without dropping recipes',()=>{
 for(const raw of ['null','{}','[{}]',JSON.stringify([recipe,recipe]),' '.repeat(2000001)])assert.throws(()=>readCompositionLibrary(raw));
 const full=Array.from({length:20},(_,i)=>({...structuredClone(recipe),name:`Recipe ${i}`}));assert.equal(readCompositionLibrary(JSON.stringify(full)).length,20);
 assert.throws(()=>saveCompositionEntry(full,recipe),/at most 20/);assert.equal(full.length,20);
});
