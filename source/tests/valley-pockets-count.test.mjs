import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {valleyPocketTemplate} from '../lib/valley-pockets.ts';
import {countedValleyPocketTemplate} from '../lib/valley-pockets-count.ts';
import {previewValleyPocketPlacement} from '../lib/valley-pockets-placement.ts';
import {createBlankProject} from '../lib/wulfram.ts';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json','utf8'));
const sizes=['small','standard','large','massive'];
test('Counts preserve V1 defaults and fixed service yards while adding deterministic defenses',()=>{
 for(const [index,size] of sizes.entries())for(let seed=0;seed<12;seed++){
  const key=`count-${seed}`,base=valleyPocketTemplate(key,size,manifest),before=structuredClone(base);
  for(const target of [undefined,0,base.template.unitCount])assert.deepEqual(countedValleyPocketTemplate(key,size,manifest,target),base);
  const target=[14,19,24,34][index],built=countedValleyPocketTemplate(key,size,manifest,target);
  assert.equal(built.template.unitCount,target);assert.deepEqual(built,countedValleyPocketTemplate(key,size,manifest,target));
  assert.deepEqual(built.template.units.slice(0,base.template.unitCount),base.template.units);assert.deepEqual(built.serviceRoutes,base.serviceRoutes);
  assert.equal(built.plan.version,'valley-pockets-v2');assert.deepEqual(built.plan.passage,base.plan.passage);assert.deepEqual(built.plan.sites.map(s=>s.center),base.plan.sites.map(s=>s.center));
  assert.deepEqual(built.siteUnitIndices.flat().sort((a,b)=>a-b),Array.from({length:target},(_,i)=>i));assert.deepEqual(base,before);
 }
});
test('Expanded counts pass final terrain/power/reservation checks and persist the chosen count',()=>{
 for(const [index,size] of sizes.entries())for(const terrain of ['flat','valley','irregular']){
  const p=createBlankProject('Count destination',129);p.terrain.worldWidth=16000;p.terrain.worldHeight=12000;
  p.terrain.heights=p.terrain.heights.map((_,i)=>terrain==='flat'?0:terrain==='valley'?Math.abs(Math.floor(i/129)-64)*4:40*Math.cos((i%129-64)/10)*Math.cos((Math.floor(i/129)-64)/10));
  const before=structuredClone(p),targetCount=[14,19,24,34][index],placement={size,x:4000,y:6000,rotation:35,radius:3300,targetCount};
  const result=previewValleyPocketPlacement(p,manifest,'count-0',placement,'counted');
  for(const team of [1,2])assert.equal(result.layout.entities.filter(e=>e.team===team).length,targetCount);
  assert.ok(result.access.serviceRoutes.every(r=>r.markers.length===0));assert.equal(JSON.parse(result.project.baseLayouts[0].metadata['formation.valleyPockets.counted']).placement.targetCount,targetCount);assert.deepEqual(p,before);
 }
});
test('Impossible and invalid counts reject without modifying source or manifest',()=>{
 const before=structuredClone(manifest);
 for(const target of [-1,6,NaN,Infinity,10.5,121])assert.throws(()=>countedValleyPocketTemplate('reject','small',manifest,target),/needs/);
 assert.throws(()=>countedValleyPocketTemplate('reject','small',manifest,120),/cannot fit exactly/);
 assert.deepEqual(manifest,before);
});

test('Expanded Valley Pockets V2 reference fixtures remain stable',()=>{
 const fixtures=JSON.parse(fs.readFileSync('tests/fixtures/valley-pockets-v2-count.json','utf8'));
 assert.equal(fixtures.length,4);
 for(const {seed,size,targetCount,sha256} of fixtures){
  const result=countedValleyPocketTemplate(seed,size,manifest,targetCount);
  assert.equal(createHash('sha256').update(JSON.stringify(result)).digest('hex'),sha256,`${size} count ${targetCount}`);
 }
});
