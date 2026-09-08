import {createHash} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCreativeBaseLayout} from '../lib/builtin-base-layouts.ts';
import {generateBaseLayout} from '../lib/mcp-commands.ts';
import {createBlankProject,validateProject} from '../lib/wulfram.ts';
import {readBuildAreas,checkBuildAreas,BUILD_AREAS_KEY} from '../lib/build-areas.ts';
import {courtyardRequiredCounts} from '../lib/service-courtyard.ts';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json','utf8'));
const options={size:'small',x:3200,y:5000,rotation:35,radius:2600,targetCount:0,checkAccess:true,terrainAware:false};
function blank(){const p=createBlankProject('Courtyard source',129);p.terrain.worldWidth=14000;p.terrain.worldHeight=10000;return p;}
await test('Courtyard shared placement preserves six reservations, budgets, power and source at every size',()=>{
 const p=blank(),before=structuredClone(p);
 for(const size of ['small','standard','large','massive']){
  const layout=createCreativeBaseLayout(p,manifest,'service-courtyard',`court-${size}`,'pipeline',{...options,size});
  assert.equal(layout.metadata['formation.version'],'service-courtyard-v1');assert.equal(layout.metadata['formation.snapPolicy'],'shared-footprint-v2');
  const areas=readBuildAreas(layout.metadata[BUILD_AREAS_KEY]);assert.equal(areas.length,6);assert.deepEqual(checkBuildAreas(areas,layout.entities,14000,10000,manifest),[]);
  for(const team of [1,2])for(const [token,n] of Object.entries(courtyardRequiredCounts(size)))assert.equal(layout.entities.filter(e=>e.team===team&&e.token===token).length,n);
  assert.deepEqual(validateProject({...p,entities:layout.entities,validation:layout.validation}).filter(i=>i.severity==='error'),[]);
  assert.ok(JSON.parse(layout.metadata['formation.access']).routes.length>0);
  const access=JSON.parse(layout.metadata['formation.courtyardAccess']);assert.equal(access.vehicleWidth,80);assert.equal(access.routes.length,2);assert.ok(access.routes.every(r=>r.points.length===4&&!r.markers.some(m=>m.severity==='blocked')));
 }
 assert.deepEqual(p,before);
});
await test('MCP shared generator produces an isolated candidate with full reserved metadata',()=>{
 const p=blank(),before=structuredClone(p),request={activeLayoutId:p.activeBaseLayoutId,layoutId:'court',style:'service-courtyard',seed:'pipeline',placement:options};
 const result=generateBaseLayout(p,request,manifest);assert.deepEqual(p,before);assert.equal(result.project.baseLayouts.length,p.baseLayouts.length+1);assert.equal(readBuildAreas(result.project.baseLayouts.at(-1).metadata[BUILD_AREAS_KEY]).length,6);
 assert.throws(()=>generateBaseLayout(p,{...request,placement:{...options,targetCount:6}},manifest),/needs at least/);assert.deepEqual(p,before);
 assert.throws(()=>generateBaseLayout(p,{...request,placement:{...options,radius:900}},manifest),/yellow area/);
});

await test('Courtyard rejects a steep central passage even with optional service checks disabled',()=>{
 const p=blank();p.terrain.heights=p.terrain.heights.map((_,i)=>{
  const x=(i%129)*14000/128,y=Math.floor(i/129)*10000/128;
  return Math.abs(y-5000)<150&&Math.min(Math.abs(x-3200),Math.abs(x-10800))<150?400:0;
 });
 const before=structuredClone(p);
 assert.throws(()=>createCreativeBaseLayout(p,manifest,'service-courtyard','blocked','ridge',{...options,rotation:0,checkAccess:false}),/Courtyard through route: Steep terrain/);
 assert.deepEqual(p,before);
});

await test('Courtyard v1 golden geometry, reservations and sampled access stay stable',()=>{
 const golden=JSON.parse(fs.readFileSync('tests/fixtures/service-courtyard-v1.json','utf8'));
 for(const item of golden.cases){
  const layout=createCreativeBaseLayout(blank(),manifest,'service-courtyard',`golden-${item.size}`,golden.seed,{...options,size:item.size});
  assert.equal(layout.metadata['formation.version'],golden.version);
  const content={entities:layout.entities,areas:JSON.parse(layout.metadata[BUILD_AREAS_KEY]),access:JSON.parse(layout.metadata['formation.courtyardAccess'])};
  assert.equal(createHash('sha256').update(JSON.stringify(content)).digest('hex'),item.sha256);
 }
});
