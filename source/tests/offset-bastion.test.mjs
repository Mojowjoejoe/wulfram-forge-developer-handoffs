import {createHash} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {offsetBastionTemplate,offsetBastionAreas,offsetBastionRequiredCounts,assertOffsetBastionComposition} from '../lib/offset-bastion.ts';
import {createCreativeBaseLayout} from '../lib/builtin-base-layouts.ts';
import {createBlankProject} from '../lib/wulfram.ts';
import {checkBuildAreas,BUILD_AREAS_KEY} from '../lib/build-areas.ts';
const manifest=JSON.parse(await fs.readFile(new URL('../public/assets/manifest.json',import.meta.url),'utf8'));
test('Offset Bastion retains deterministic roles and its bent approach through paired placement',()=>{
 const p=createBlankProject('Offset test',129);p.terrain.worldWidth=12000;p.terrain.worldHeight=8000;const original=JSON.stringify(p);
 for(const size of ['small','standard','large','massive']){
  const t=offsetBastionTemplate('contract',size,manifest);assert.deepEqual(t,offsetBastionTemplate('contract',size,manifest));assertOffsetBastionComposition(t,size);
  const layout=createCreativeBaseLayout(p,manifest,'offset-bastion','offset','contract',{size,x:2800,y:4000,radius:2400,rotation:35,checkAccess:true});
  const areas=JSON.parse(layout.metadata[BUILD_AREAS_KEY]);assert.deepEqual(areas,offsetBastionAreas(p,2800,4000,35));assert.equal(areas[0].points.length,4);
  assert.deepEqual(checkBuildAreas(areas,layout.entities,12000,8000,manifest),[]);assert.deepEqual(JSON.parse(layout.metadata['formation.requiredCounts']),offsetBastionRequiredCounts(size));
 }
 assert.equal(JSON.stringify(p),original);
});
test('infeasible counts and reserved approach extent fail without changing the source',()=>{
 const p=createBlankProject('Offset reject',129);p.terrain.worldWidth=12000;p.terrain.worldHeight=8000;const before=JSON.stringify(p);
 assert.throws(()=>createCreativeBaseLayout(p,manifest,'offset-bastion','bad','count',{size:'small',x:2800,y:4000,radius:2400,rotation:0,targetCount:6}),/needs at least/);
 assert.throws(()=>createCreativeBaseLayout(p,manifest,'offset-bastion','bad','extent',{size:'small',x:2800,y:4000,radius:800,rotation:0}));
 assert.equal(JSON.stringify(p),before);
});

test('version 1 golden placements keep their recorded geometry',async()=>{
 const golden=JSON.parse(await fs.readFile(new URL('./fixtures/offset-bastion-v1.json',import.meta.url),'utf8'));
 const p=createBlankProject('Golden',129);p.terrain.worldWidth=12000;p.terrain.worldHeight=8000;
 for(const c of golden.cases){
  const layout=createCreativeBaseLayout(p,manifest,'offset-bastion',`offset-${c.size}`,golden.seed,{size:c.size,x:2800,y:4000,rotation:0,radius:2400,checkAccess:true,terrainAware:false,targetCount:0});
  assert.equal(layout.metadata['formation.version'],golden.version);assert.equal(layout.entities.filter(e=>e.team===1).length,c.count);
  assert.equal(createHash('sha256').update(JSON.stringify(layout.entities)).digest('hex'),c.layoutHash);
 }
});
