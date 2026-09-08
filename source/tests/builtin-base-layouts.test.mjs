import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {BUILTIN_BASE_LAYOUTS,createBuiltinBaseLayout} from '../lib/builtin-base-layouts.ts';
import {createBlankProject} from '../lib/wulfram.ts';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json'));
const source=createBlankProject('Existing map',33);
source.terrain.heights.fill(0);
void test('All global formations adapt to wide and tall terrain without changing the source',()=>{
  for(const [w,h] of [[8000,4800],[4800,8000]])for(const spec of BUILTIN_BASE_LAYOUTS){
    const p=structuredClone(source);p.terrain.worldWidth=w;p.terrain.worldHeight=h;
    const before=structuredClone(p),layout=createBuiltinBaseLayout(p,manifest,spec.id,'test');
    assert.deepEqual(p,before);assert.equal(layout.entities.length,spec.count*2);
    for(const team of [1,2])assert.equal(layout.entities.filter(e=>e.team===team).length,spec.count);
  }
});
void test('Too-small terrain rejects placement without mutating existing layouts',()=>{
  const p=structuredClone(source);p.terrain.worldWidth=300;p.terrain.worldHeight=300;
  const before=structuredClone(p);
  assert.throws(()=>createBuiltinBaseLayout(p,manifest,'ringhold','test'));
  assert.deepEqual(p,before);
});
