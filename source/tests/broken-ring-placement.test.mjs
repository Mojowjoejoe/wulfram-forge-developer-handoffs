import {generateBaseLayout} from '../lib/mcp-commands.ts';
import {checkBrokenRingPlacement} from '../lib/broken-ring-placement.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCreativeBaseLayout} from '../lib/builtin-base-layouts.ts';
import {createBlankProject} from '../lib/wulfram.ts';
import {readBuildAreas, BUILD_AREAS_KEY} from '../lib/build-areas.ts';
function blank(){const p=createBlankProject('Ring source',129);p.terrain.worldWidth=16000;p.terrain.worldHeight=12000;return p;}
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json','utf8'));
const placement={size:'small',x:4000,y:6000,rotation:35,radius:3300,checkAccess:false,terrainAware:false};
await test('Broken Ring destination placement preserves all reservations and paired geometry without changing source',()=>{
 const p=blank(),before=structuredClone(p);
 for(const size of ['small','standard','large','massive']){
  const layout=createCreativeBaseLayout(p,manifest,'broken-ring',size,'destination',{...placement,size});
  const areas=readBuildAreas(layout.metadata[BUILD_AREAS_KEY]);assert.equal(areas.length,10);
  for(let i=0;i<5;i++)for(let j=0;j<areas[i].points.length;j++){
   assert.ok(Math.abs(areas[i].points[j][0]+areas[i+5].points[j][0]-16000)<1e-8);
   assert.ok(Math.abs(areas[i].points[j][1]+areas[i+5].points[j][1]-12000)<1e-8);
  }
  const access=JSON.parse(layout.metadata['formation.brokenRingAccess']);assert.equal(access.routes.length,8);assert.ok(access.routes.every(r=>!r.markers.some(m=>m.severity==='blocked')));
  assert.equal(layout.metadata['formation.version'],'broken-ring-v3');
 }
 assert.deepEqual(p,before);
});
await test('Broken Ring rejects insufficient budgets, bounds and steep passages atomically even with optional access disabled',()=>{
 const p=blank(),before=structuredClone(p);
 assert.throws(()=>createCreativeBaseLayout(p,manifest,'broken-ring','count','seed',{...placement,targetCount:6}),/needs at least/);
 assert.throws(()=>createCreativeBaseLayout(p,manifest,'broken-ring','bounds','seed',{...placement,radius:1000}),/yellow area/);
 assert.deepEqual(p,before);
 p.terrain.heights=p.terrain.heights.map((_,i)=>{const x=(i%129)*16000/128,y=Math.floor(i/129)*12000/128;return Math.abs(y-6000)<150&&Math.min(Math.abs(x-4000),Math.abs(x-12000))<150?400:0;});
 const ridge=structuredClone(p);
 assert.throws(()=>createCreativeBaseLayout(p,manifest,'broken-ring','ridge','seed',{...placement,rotation:0}),/Steep terrain/);
 assert.deepEqual(p,ridge);
});

await test('Broken Ring terrain-aware placement retains sites and rejects a displaced service yard',()=>{
 const p=blank(),before=structuredClone(p);
 const layout=createCreativeBaseLayout(p,manifest,'broken-ring','aware','seed',{...placement,terrainAware:true});
 const plan=JSON.parse(layout.metadata['formation.brokenRingPlan']);
 const candidate={...p,entities:structuredClone(layout.entities),validation:layout.validation};
 for(const entity of candidate.entities.filter(e=>e.token==='r'))entity.position[0]+=800;
 assert.throws(()=>checkBrokenRingPlacement(candidate,manifest,plan,placement.x,placement.y,placement.rotation,placement.radius),/detached/);
 assert.deepEqual(p,before);
});

await test('Existing MCP generator exposes Broken Ring candidate atomically with complete plan metadata',()=>{
 const p=blank(),before=structuredClone(p),request={activeLayoutId:p.activeBaseLayoutId,layoutId:'mcp-ring',style:'broken-ring',seed:'mcp-ring',placement};
 const result=generateBaseLayout(p,request,manifest);
 assert.deepEqual(p,before);assert.equal(result.project.baseLayouts.length,p.baseLayouts.length+1);
 const layout=result.project.baseLayouts.at(-1);assert.equal(result.project.activeBaseLayoutId,layout.id);
 assert.equal(readBuildAreas(layout.metadata[BUILD_AREAS_KEY]).length,10);
 assert.equal(JSON.parse(layout.metadata['formation.brokenRingAccess']).routes.length,8);
 assert.equal(JSON.parse(layout.metadata['formation.brokenRingPlan']).version,'broken-ring-v3');
 assert.throws(()=>generateBaseLayout(result.project,{...request,activeLayoutId:layout.id},manifest),/new layout ID/);
 assert.throws(()=>generateBaseLayout(p,{...request,placement:{...placement,targetCount:6}},manifest),/needs at least/);
 assert.deepEqual(p,before);
});
