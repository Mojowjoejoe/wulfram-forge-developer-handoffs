import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {structureTerrainClearance} from '../lib/wulfram.ts';
import {valleyPocketPlan,valleyPocketRequiredCounts,valleyPocketTemplate} from '../lib/valley-pockets.ts';
import {distanceToSegment} from '../lib/build-areas.ts';
const sizes=['small','standard','large','massive'];
test('Valley Pockets keeps distinct alternating yards and connected full-width floor geometry across sizes and seeds',()=>{
 for(const [index,size] of sizes.entries())for(let seed=0;seed<48;seed++){
  const plan=valleyPocketPlan(`valley-${seed}`,size);
  assert.deepEqual(plan,valleyPocketPlan(`valley-${seed}`,size));
  assert.equal(plan.sites.length,[2,3,4,6][index]);
  assert.equal(Object.values(valleyPocketRequiredCounts(size)).reduce((a,b)=>a+b,0),[10,15,20,30][index]);
  const paths=[plan.passage,...plan.sites.map(s=>s.frontage)];
  for(const [i,site] of plan.sites.entries()){
   if(i){assert.notEqual(site.side,plan.sites[i-1].side);assert.ok(site.center[0]-plan.sites[i-1].center[0]>=640);}
   assert.equal(Math.sign(site.center[1]),site.side);
   const [mouth,end]=site.frontage.points;
   assert.ok(distanceToSegment(...mouth,...plan.passage.points)<1e-9);
   assert.equal(Math.sign(end[1]),site.side);
   assert.ok(Math.abs(Math.hypot(end[0]-site.center[0],end[1]-site.center[1])-350)<1e-9);
   for(const route of paths)assert.ok(distanceToSegment(...site.center,...route.points)>=site.radius+route.width/2+14,'Whole yard must clear every reserved corridor');
   for(const axis of [0,1]){assert.ok(site.center[axis]-site.radius>=plan.bounds.min[axis]);assert.ok(site.center[axis]+site.radius<=plan.bounds.max[axis]);}
  }
  for(const route of paths)for(const point of route.points)for(const axis of [0,1]){assert.ok(point[axis]-route.width/2>=plan.bounds.min[axis]);assert.ok(point[axis]+route.width/2<=plan.bounds.max[axis]);}
  assert.ok(plan.sites[0].roles.includes('r'));assert.ok(plan.sites[1].roles.includes('f'));
 }
});
test('Valley Pockets varies side order, station spacing and setbacks without leaking mutable recipe data',()=>{
 const plans=Array.from({length:48},(_,i)=>valleyPocketPlan(`valley-${i}`,'massive'));
 assert.equal(new Set(plans.map(p=>p.sites[0].side)).size,2);
 assert.ok(new Set(plans.map(p=>Math.round(p.bounds.max[0]-p.bounds.min[0]))).size>20);
 assert.ok(new Set(plans.map(p=>Math.round(p.sites[0].center[1]))).size>20);
 const original=valleyPocketPlan('stable','small'),changed=valleyPocketPlan('stable','small');changed.sites[0].roles.length=0;changed.sites[0].center[0]=999;
 assert.deepEqual(valleyPocketPlan('stable','small'),original);
 assert.throws(()=>valleyPocketPlan('x','unknown'),/Unsupported/);
 assert.throws(()=>valleyPocketPlan('x'.repeat(257),'small'),/seed/);
 assert.throws(()=>valleyPocketRequiredCounts('constructor'),/Unsupported/);
});

test('Original buildings fit all local yard envelopes with exact roles, power reach and clear pad approaches',()=>{
 const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json','utf8')), before=structuredClone(manifest);
 const radius=token=>Math.max(...[1,2].map(team=>structureTerrainClearance({token,team},manifest,0,0).footprint/Math.SQRT2));
 for(const size of sizes)for(let seed=0;seed<48;seed++){
  const built=valleyPocketTemplate(`valley-${seed}`,size,manifest),{template,plan,siteUnitIndices,serviceRoutes}=built;
  assert.deepEqual(built,valleyPocketTemplate(`valley-${seed}`,size,manifest));
  assert.equal(template.unitCount,template.units.length);
  for(const [token,count] of Object.entries(valleyPocketRequiredCounts(size))) assert.equal(template.units.filter(u=>u.token===token).length,count);
  assert.deepEqual(siteUnitIndices.flat(),Array.from({length:template.units.length},(_,i)=>i));
  for(const [i,site] of plan.sites.entries())for(const j of siteUnitIndices[i]){
   const unit=template.units[j];assert.ok(Math.hypot(unit.offset[0]-site.center[0],unit.offset[1]-site.center[1])+radius(unit.token)<=site.radius);
   if(unit.token!=='e')assert.ok(siteUnitIndices[i].some(k=>template.units[k].token==='e'&&Math.hypot(unit.offset[0]-template.units[k].offset[0],unit.offset[1]-template.units[k].offset[1])<=270));
  }
  assert.equal(serviceRoutes.length,2);
  for(const route of serviceRoutes){
   const pad=template.units[route.unitIndex];assert.ok(['r','f'].includes(pad.token));assert.deepEqual(route.points[1],pad.offset);
   assert.deepEqual(route.points[0],plan.sites.find(s=>s.id===route.siteId).frontage.points[1]);
   for(const [i,other] of template.units.entries())if(i!==route.unitIndex){
    assert.ok(Math.hypot(pad.offset[0]-other.offset[0],pad.offset[1]-other.offset[1])-radius(other.token)>=96);
    assert.ok(distanceToSegment(...other.offset,...route.points)-radius(other.token)>=route.width/2+40);
   }
  }
 }
 assert.deepEqual(manifest,before);
 const missing=structuredClone(manifest);missing.models={};assert.throws(()=>valleyPocketTemplate('missing','small',missing),/original/);
});

test('Valley Pockets retains four exact local template reference recipes',()=>{
 const golden=JSON.parse(fs.readFileSync('tests/fixtures/valley-pockets-v1.json','utf8'));
 const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json','utf8'));
 assert.deepEqual(golden.fixtures.map(f=>f.size),sizes);
 for(const f of golden.fixtures){const result=valleyPocketTemplate(golden.seed,f.size,manifest);assert.equal(result.plan.version,golden.version);assert.equal(createHash('sha256').update(JSON.stringify(result)).digest('hex'),f.sha256);}
});
