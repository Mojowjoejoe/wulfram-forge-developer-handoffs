import test from 'node:test';
import assert from 'node:assert/strict';
import {threeLaneAnchorPlan,threeLaneAnchorRequiredCounts,threeLaneAnchorTemplate} from '../lib/three-lane-anchor.ts';
import fs from 'node:fs';
import {buildBaseLibrary,filterBaseLibrary,REVIEWED_CREATIVE_FAMILY_IDS} from '../lib/base-library.ts';
import {structureTerrainClearance} from '../lib/wulfram.ts';
import {distanceToSegment} from '../lib/build-areas.ts';
void test('Versioned Anchor recipes retain reviewed golden topology and original-model placements',()=>{
 const golden=JSON.parse(fs.readFileSync('tests/fixtures/three-lane-anchor-golden.json','utf8')),manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json','utf8'));
 assert.equal(golden.format,'three-lane-anchor-golden');assert.equal(golden.version,1);assert.equal(golden.cases.length,8);
 assert.deepEqual(golden.cases.map(c=>`${c.size}:${c.targetCount}`),['small:0','small:24','standard:0','standard:30','large:0','large:39','massive:0','massive:51']);
 for(const c of golden.cases)assert.deepEqual(threeLaneAnchorTemplate(golden.seed,c.size,manifest,c.targetCount),c.recipe,`${c.size}/${c.targetCount}: existing recipes must not drift silently`);
});
void test('Exact counts add defenses across three yards without changing court topology or default recipes',()=>{
 const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json','utf8'));
 assert.throws(()=>threeLaneAnchorTemplate('counts-0','small',manifest,120),/cannot fit/);
 for(const [i,size] of ['small','standard','large','massive'].entries())for(let seed=0;seed<12;seed++){
  const name=`counts-${seed}`,minimum=[15,21,30,42][i],base=threeLaneAnchorTemplate(name,size,manifest);
  assert.deepEqual(base,threeLaneAnchorTemplate(name,size,manifest,0));assert.deepEqual(base,threeLaneAnchorTemplate(name,size,manifest,minimum));
  for(const count of [minimum+1,minimum+9]){
   const result=threeLaneAnchorTemplate(name,size,manifest,count);assert.equal(result.template.units.length,count);assert.equal(result.plan.version,'three-lane-anchor-v2');assert.equal(result.template.id,result.plan.version);assert.equal(result.template.sourceMap,result.plan.version);
   const normalized=structuredClone(result.plan);normalized.version=base.plan.version;normalized.courts.forEach((c,j)=>c.defenseYard.roles=base.plan.courts[j].defenseYard.roles);assert.deepEqual(normalized,base.plan);
   for(const token of ['e','u','r','f','d'])assert.equal(result.template.units.filter(u=>u.token===token).length,base.template.units.filter(u=>u.token===token).length);
  }
  for(const count of [-1,minimum-1,120.5,121,NaN,Infinity])assert.throws(()=>threeLaneAnchorTemplate(name,size,manifest,count),/count/);
 }
});
void test('Searchable Anchor card preserves fixed terrain semantics and is admitted to Creative',()=>{
 const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json','utf8'));
 for(const [i,size] of ['small','standard','large','massive'].entries()){
  const entries=buildBaseLibrary([],[],manifest,size),anchor=entries.find(e=>e.id==='three-lane-anchor');assert.ok(anchor);assert.equal(anchor.error,undefined);assert.equal(anchor.category,'Creative');assert.equal(anchor.modeledCount,[15,21,30,42][i]);assert.equal(anchor.reservationBands.length,8);assert.ok(anchor.planBounds.width>0&&anchor.planBounds.height>0);
  const filter={query:'three courts',category:'Creative',count:'all',role:'all',terrain:'all'};assert.ok(filterBaseLibrary(entries,filter).includes(anchor));assert.ok(!filterBaseLibrary(entries,{...filter,terrain:'adaptive'}).includes(anchor));assert.ok(filterBaseLibrary(entries,{...filter,terrain:'fixed'}).includes(anchor));
 }
 assert.ok(REVIEWED_CREATIVE_FAMILY_IDS.includes('three-lane-anchor'));assert.equal(REVIEWED_CREATIVE_FAMILY_IDS.length,21);
});

void test('Three-Lane Anchor retains three disjoint courts with offset mouths and a connected rear road',()=>{
 for(const size of ['small','standard','large','massive'])for(let seed=0;seed<96;seed++){
  const p=threeLaneAnchorPlan(`anchor-${seed}`,size);assert.deepEqual(p,threeLaneAnchorPlan(`anchor-${seed}`,size));assert.equal(p.courts.length,3);
  const paths=[p.rearRoad,p.serviceConnector,...p.courts.flatMap(c=>[c.mouth,c.rearConnector])];
  for(const [i,c] of p.courts.entries()){
   assert.ok(c.width>=260);assert.ok(c.depth>=340);assert.equal(c.mouth.width,120);
   assert.notEqual(c.mouth.points[0][0],c.mouth.points.at(-1)[0]);
   assert.deepEqual(c.mouth.points.at(-1),[c.center[0],c.center[1]-c.depth/2]);
   assert.ok(Math.abs(c.rearConnector.points[0][1]-(c.center[1]+c.depth/2))<1e-9);
   assert.ok(distanceToSegment(...c.rearConnector.points.at(-1),...p.rearRoad.points)<1e-9);
   for(const other of p.courts.slice(i+1))assert.ok(Math.abs(c.center[0]-other.center[0])>(c.width+other.width)/2);
   for(const other of p.courts){const [x,y]=c.defenseYard.center,nearestX=Math.max(other.center[0]-other.width/2,Math.min(x,other.center[0]+other.width/2)),nearestY=Math.max(other.center[1]-other.depth/2,Math.min(y,other.center[1]+other.depth/2));assert.ok(Math.hypot(x-nearestX,y-nearestY)>=c.defenseYard.radius+14,'Defense yards must clear entire staging courts');}
   for(const route of paths)for(let j=1;j<route.points.length;j++)assert.ok(distanceToSegment(...c.defenseYard.center,route.points[j-1],route.points[j])>=c.defenseYard.radius+route.width/2+14,'Defense yard must clear full-width circulation');
  }
  assert.ok(distanceToSegment(...p.serviceConnector.points[0],...p.rearRoad.points)<1e-9);
  for(const route of paths)for(const point of route.points)for(const axis of [0,1])assert.ok(point[axis]-route.width/2>=p.bounds.min[axis]&&point[axis]+route.width/2<=p.bounds.max[axis]);
 }
});

void test('Original-scale buildings fit every yard with powered roles and unobstructed pad branches',()=>{
 const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json','utf8')),before=structuredClone(manifest);
 const radius=token=>Math.max(...[1,2].map(team=>structureTerrainClearance({token,team},manifest,0,0).footprint/Math.SQRT2));
 for(const size of ['small','standard','large','massive'])for(let seed=0;seed<48;seed++){
  const result=threeLaneAnchorTemplate(`units-${seed}`,size,manifest),{template,plan,yardUnitIndices,serviceRoutes}=result;
  assert.deepEqual(result,threeLaneAnchorTemplate(`units-${seed}`,size,manifest));
  assert.equal(template.unitCount,template.units.length);const actual={};for(const u of template.units)actual[u.token]=(actual[u.token]??0)+1;assert.deepEqual(actual,threeLaneAnchorRequiredCounts(size));
  assert.deepEqual(yardUnitIndices.flat(),template.units.map((_,i)=>i));
  const yards=[...plan.courts.map(c=>c.defenseYard),plan.serviceYard];
  for(const [i,yard] of yards.entries())for(const index of yardUnitIndices[i]){const u=template.units[index];assert.ok(Math.hypot(u.offset[0]-yard.center[0],u.offset[1]-yard.center[1])+radius(u.token)<=yard.radius);if(['g','s','L','r','f'].includes(u.token))assert.ok(yardUnitIndices[i].filter(j=>template.units[j].token==='e'&&Math.hypot(u.offset[0]-template.units[j].offset[0],u.offset[1]-template.units[j].offset[1])<=270).length===2,'Both local cells cover powered buildings within provisional 270u budget');}
  for(const [i,u] of template.units.entries())for(const v of template.units.slice(i+1))assert.ok(Math.hypot(u.offset[0]-v.offset[0],u.offset[1]-v.offset[1])>=radius(u.token)+radius(v.token)+14);
  assert.equal(serviceRoutes.length,2);
  assert.equal(result.entranceRoutes.length,3);
  for(const [index,entrance] of result.entranceRoutes.entries()){
   const court=plan.courts[index];assert.equal(entrance.courtId,court.id);assert.deepEqual(entrance.points.slice(0,4),court.mouth.points);assert.ok(entrance.points.some(p=>p[0]===court.rearConnector.points[0][0]&&p[1]===court.rearConnector.points[0][1]));assert.deepEqual(entrance.points.at(-1),plan.serviceConnector.points.at(-1));
   assert.equal(entrance.padRoutes.length,2);
   for(const u of template.units)for(let j=1;j<entrance.points.length;j++)assert.ok(distanceToSegment(...u.offset,entrance.points[j-1],entrance.points[j])>=radius(u.token)+entrance.width/2+14);
   for(const route of entrance.padRoutes){assert.deepEqual(route.points.slice(0,-1),entrance.points);assert.deepEqual(route.points.at(-1),template.units[route.unitIndex].offset);for(const [i,u] of template.units.entries())if(i!==route.unitIndex)for(let j=1;j<route.points.length;j++)assert.ok(distanceToSegment(...u.offset,route.points[j-1],route.points[j])>=radius(u.token)+route.width/2+14);}
  }
  for(const route of serviceRoutes){assert.deepEqual(route.points[0],plan.serviceConnector.points.at(-1));assert.deepEqual(route.points.at(-1),template.units[route.unitIndex].offset);for(const [i,u] of template.units.entries())if(i!==route.unitIndex){assert.ok(distanceToSegment(...u.offset,...route.points)>=radius(u.token)+route.width/2+14);assert.ok(Math.hypot(u.offset[0]-route.points.at(-1)[0],u.offset[1]-route.points.at(-1)[1])>=radius(u.token)+96);}}
 }
 assert.deepEqual(manifest,before);
 const missing=structuredClone(manifest);missing.models={};assert.throws(()=>threeLaneAnchorTemplate('x','small',missing),/original/);
});

void test('Size increases roles without removing topology; seeds change proportions and returns are independent',()=>{
 const totals=['small','standard','large','massive'].map(s=>Object.values(threeLaneAnchorRequiredCounts(s)).reduce((a,b)=>a+b,0));assert.deepEqual(totals,[15,21,30,42]);
 for(const size of ['small','standard','large','massive']){const counts=threeLaneAnchorRequiredCounts(size);assert.equal(counts.e,8);assert.equal(counts.r,1);assert.equal(counts.f,1);assert.equal(counts.u,1);}
 const plans=Array.from({length:32},(_,i)=>threeLaneAnchorPlan(String(i),'standard'));assert.ok(new Set(plans.map(p=>p.courts[0].center[0])).size>24);assert.ok(new Set(plans.map(p=>p.courts[0].depth)).size>24);
 const changed=threeLaneAnchorPlan('stable','small');changed.courts[0].defenseYard.roles.length=0;assert.equal(threeLaneAnchorPlan('stable','small').courts[0].defenseYard.roles.length,3);
 assert.throws(()=>threeLaneAnchorPlan('x','constructor'),/Unsupported/);assert.throws(()=>threeLaneAnchorPlan('x'.repeat(257),'small'),/seed/);
});
