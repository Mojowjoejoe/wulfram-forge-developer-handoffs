import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {CREATIVE_BASE_LAYOUTS} from '../lib/creative-base-layouts.ts';
import {createCreativeBaseLayout} from '../lib/builtin-base-layouts.ts';
import {createBlankProject,validateProject} from '../lib/wulfram.ts';
import {analyzeRotationalEntityPairs} from '../lib/balanced-map-analysis.ts';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json'));
function blank(){const p=createBlankProject('Existing work',65);p.terrain.heights.fill(0);p.terrain.worldWidth=8000;p.terrain.worldHeight=6000;return p;}
for(const spec of CREATIVE_BASE_LAYOUTS)void test(`${spec.name}: seed variation, balanced teams, power, reproducibility, preservation`,()=>{
  const p=blank(),before=structuredClone(p),counts=new Set(),shapes=new Set();
  for(let n=0;n<12;n++){
    const layout=createCreativeBaseLayout(p,manifest,spec.id,'candidate',`seed-${n}`);
    const trial={...p,entities:layout.entities,validation:layout.validation};
    assert.deepEqual(validateProject(trial).filter(i=>i.severity==='error'),[]);
    assert.ok(analyzeRotationalEntityPairs(trial,manifest).passed);
    const one=layout.entities.filter(e=>e.team===1);counts.add(one.length);
    shapes.add(JSON.stringify(one.map(e=>[e.token,e.position])));
    const again=createCreativeBaseLayout(p,manifest,spec.id,'candidate',`seed-${n}`);
    assert.deepEqual(again.entities,layout.entities);
    assert.deepEqual(p,before);
  }
  assert.ok(counts.size>1,'Unit budgets must vary');assert.equal(shapes.size,12);
});
void test('Impossible terrain returns an error and preserves the map',()=>{
  const p=blank();p.terrain.worldWidth=200;p.terrain.worldHeight=200;
  const before=structuredClone(p);assert.throws(()=>createCreativeBaseLayout(p,manifest,'capital','test','tiny'));
  assert.deepEqual(p,before);
});
void test('Size, placement and radius preserve the source and reject undersized areas',()=>{
  const p=blank(),before=structuredClone(p);
  const options={size:'small',x:1800,y:2800,rotation:35,radius:2000};
  const small=createCreativeBaseLayout(p,manifest,'anvil','small','size-test',options);
  const large=createCreativeBaseLayout(p,manifest,'anvil','large','size-test',{...options,size:'large'});
  assert.ok(small.entities.length<large.entities.length);
  assert.throws(()=>createCreativeBaseLayout(p,manifest,'anvil','bad','size-test',{...options,size:'large',radius:100}));
  assert.deepEqual(p,before);
});
