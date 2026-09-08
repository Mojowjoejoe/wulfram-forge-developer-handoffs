import {createHash} from 'node:crypto';
import {favoriteFromLayout,placeFavorite} from '../lib/formation-favorites.ts';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {brokenRingTemplateV3} from '../lib/broken-ring-v3.ts';
import {createCreativeBaseLayout} from '../lib/builtin-base-layouts.ts';
import {checkBrokenRingPlacement} from '../lib/broken-ring-placement.ts';
import {createBlankProject,structureTerrainClearance} from '../lib/wulfram.ts';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json','utf8'));
const radius=t=>Math.max(...[1,2].map(team=>structureTerrainClearance({token:t,team},manifest,0,0).footprint/Math.SQRT2));
test('V3 retains counts and96u service endpoint room across192 reproducible local plans',()=>{
 for(const [index,size] of ['small','standard','large','massive'].entries())for(let n=0;n<48;n++){
  const result=brokenRingTemplateV3(`macro-${n}`,size,manifest);assert.deepEqual(result,brokenRingTemplateV3(`macro-${n}`,size,manifest));assert.equal(result.template.units.length,[18,23,28,38][index]);
  for(const pad of result.template.units.filter(e=>['r','f'].includes(e.token)))for(const other of result.template.units.filter(e=>e!==pad))assert.ok(Math.hypot(pad.offset[0]-other.offset[0],pad.offset[1]-other.offset[1])-radius(other.token)>=96);
 }
});
test('V3 fixes seed3 service routes for both teams after adaptation and rejects narrowed final placement',()=>{
 for(const size of ['small','standard','large','massive'])for(const terrainAware of [false,true]){
  const p=createBlankProject('V3',129);p.terrain.worldWidth=16000;p.terrain.worldHeight=12000;const before=structuredClone(p);
  const placement={size,x:4000,y:6000,rotation:0,radius:3300,terrainAware,checkAccess:false};
  const l=createCreativeBaseLayout(p,manifest,'broken-ring','v3','broken-ring-visual-3',placement),access=JSON.parse(l.metadata['formation.brokenRingAccess']).serviceAccess;
  assert.equal(l.metadata['formation.version'],'broken-ring-v3');assert.equal(access.clearance,96);assert.equal(access.routes.length,4);assert.ok(access.routes.every(r=>r.markers.length===0));assert.deepEqual(p,before);
  const trial={...p,entities:structuredClone(l.entities),validation:l.validation},pad=trial.entities.find(e=>e.token==='r'&&e.team===1),uplink=trial.entities.find(e=>e.token==='u'&&e.team===1);
  const dx=uplink.position[0]-pad.position[0],dy=uplink.position[1]-pad.position[1],length=Math.hypot(dx,dy);uplink.position[0]=pad.position[0]+dx/length*(radius('u')+78);uplink.position[1]=pad.position[1]+dy/length*(radius('u')+78);
  assert.throws(()=>checkBrokenRingPlacement(trial,manifest,JSON.parse(l.metadata['formation.brokenRingPlan']),4000,6000,0,3300),/service pad needs more clearance/);
 }
});

test('V3 final checks cover expanded counts and adapted terrain, including favorite reuse',()=>{
 for(const size of ['small','standard','large','massive'])for(const terrain of ['flat','valley','irregular']){
  const p=createBlankProject('V3 adaptation',129);p.terrain.worldWidth=16000;p.terrain.worldHeight=12000;
  p.terrain.heights=p.terrain.heights.map((_,i)=>terrain==='flat'?0:terrain==='valley'?Math.abs(Math.floor(i/129)-64)*8:100*Math.cos((i%129-64)/10)*Math.cos((Math.floor(i/129)-64)/10));
  const placement={size,x:4000,y:6000,rotation:35,radius:3300,terrainAware:true,checkAccess:false,targetCount:{small:20,standard:25,large:30,massive:40}[size]},before=structuredClone(p);
  const l=createCreativeBaseLayout(p,manifest,'broken-ring','expanded','broken-ring-visual-3',placement);
  const access=JSON.parse(l.metadata['formation.brokenRingAccess']).serviceAccess;assert.equal(access.clearance,96);assert.ok(access.routes.every(r=>!r.markers.length));
  for(const team of [1,2])assert.equal(l.entities.filter(e=>e.team===team).length,placement.targetCount);
  const favorite=favoriteFromLayout(l,placement,'v3-expanded',p),copy=placeFavorite(p,manifest,favorite,placement,'v3-reused');
  assert.equal(JSON.parse(copy.metadata['formation.brokenRingAccess']).serviceAccess.clearance,96);assert.deepEqual(p,before);
 }
});
test('V3 favorites reject narrowed service endpoints without changing destination or favorite',()=>{
 const p=createBlankProject('V3 portable',129);p.terrain.worldWidth=16000;p.terrain.worldHeight=12000;
 const placement={size:'small',x:4000,y:6000,rotation:0,radius:3300,terrainAware:false,checkAccess:false};
 const l=createCreativeBaseLayout(p,manifest,'broken-ring','original','broken-ring-visual-3',placement),favorite=favoriteFromLayout(l,placement,'v3',p);
 const pad=favorite.template.units.find(e=>e.token==='r'),u=favorite.template.units.find(e=>e.token==='u'),dx=u.offset[0]-pad.offset[0],dy=u.offset[1]-pad.offset[1],d=Math.hypot(dx,dy);
 u.offset=[pad.offset[0]+dx/d*(radius('u')+78),pad.offset[1]+dy/d*(radius('u')+78)];const before=structuredClone({p,favorite});
 assert.throws(()=>placeFavorite(p,manifest,favorite,placement,'bad'),/service pad needs more clearance/);assert.deepEqual({p,favorite},before);
});

test('V3 recipe fixtures preserve all four local plans and building arrangements',()=>{
 const golden=JSON.parse(fs.readFileSync('tests/fixtures/broken-ring-v3.json','utf8'));assert.deepEqual(golden.fixtures.map(f=>f.size),['small','standard','large','massive']);
 for(const f of golden.fixtures){const result=brokenRingTemplateV3(golden.seed,f.size,manifest);assert.equal(result.plan.version,golden.version);assert.equal(createHash('sha256').update(JSON.stringify(result)).digest('hex'),f.sha256);}
});
