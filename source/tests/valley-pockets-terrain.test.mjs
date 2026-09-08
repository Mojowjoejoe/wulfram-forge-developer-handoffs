import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createBlankProject} from '../lib/wulfram.ts';
import {valleyPocketTemplate} from '../lib/valley-pockets.ts';
import {fitValleyPocketTerrain} from '../lib/valley-pockets-terrain.ts';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json','utf8'));
const placement={size:'small',x:4000,y:6000,rotation:0,radius:3300};
function map(n=129){const p=createBlankProject('Pockets terrain',n);p.terrain.worldWidth=16000;p.terrain.worldHeight=12000;return p;}
test('Bounded fitter preserves flat/valley/irregular sources across four sizes and twelve seeds',()=>{
 for(const size of ['small','standard','large','massive'])for(const terrain of ['flat','valley','irregular'])for(let seed=0;seed<12;seed++){
  const p=map();p.terrain.heights=p.terrain.heights.map((_,i)=>terrain==='flat'?0:terrain==='valley'?Math.abs(Math.floor(i/129)-64)*4:40*Math.cos((i%129-64)/10)*Math.cos((Math.floor(i/129)-64)/10));
  const before=structuredClone(p),options={...placement,size,rotation:seed%2?35:0};
  const result=fitValleyPocketTerrain(p,manifest,`valley-${seed}`,options);
  assert.deepEqual(result,fitValleyPocketTerrain(p,manifest,`valley-${seed}`,options));assert.deepEqual(p,before);
  for(const [i,shift] of result.shifts.entries()){
   assert.ok(Math.abs(shift.dx)<=160&&Math.abs(shift.dy)<=140);
   const site=result.plan.sites[i],original=result.originalPlan.sites[i];assert.equal(Math.sign(site.center[1]),original.side);assert.ok(Math.abs(site.center[1])>=600);
   assert.deepEqual(site.frontage.points[0],original.frontage.points[0]);
   assert.deepEqual(site.center,[original.center[0]+shift.dx,original.center[1]+shift.dy]);
   if(terrain==='flat')assert.deepEqual([shift.dx,shift.dy],[0,0]);
  }
 }
});
test('Strict saved power, placement bounds and impassable floor reject without mutation',()=>{
 for(const failure of ['power','radius','floor']){
  const p=map(),options={...placement};
  if(failure==='power')p.validation.serviceRadius=80;
  if(failure==='radius')options.radius=200;
  if(failure==='floor')p.terrain.heights=p.terrain.heights.map((_,i)=>Math.abs(Math.floor(i/129)-64)*1000);
  const before=structuredClone(p);
  assert.throws(()=>fitValleyPocketTerrain(p,manifest,'valley-0',options),failure==='power'?/power radius/:/central passage/);assert.deepEqual(p,before);
 }
});
test('Paired terrain obstacle moves a complete yard and reconnects its frontage and service path',()=>{
 const p=map(257),source=valleyPocketTemplate('valley-0','small',manifest),site=source.plan.sites[0];
 const x=placement.x+site.center[0],y=placement.y+site.center[1];
 p.terrain.heights=p.terrain.heights.map((_,i)=>{
  const wx=i%257/256*16000,wy=Math.floor(i/257)/256*12000;
  const d=Math.min(Math.hypot(wx-x,wy-y),Math.hypot(wx-(16000-x),wy-(12000-y)));
  return Math.max(0,1-d/90)*300;
 });
 const before=structuredClone(p);const result=fitValleyPocketTerrain(p,manifest,'valley-0',placement);
 assert.ok(result.shifts.some(s=>s.dx!==0||s.dy!==0));assert.deepEqual(p,before);
 for(const [i,shift] of result.shifts.entries())for(const j of result.siteUnitIndices[i])assert.deepEqual(result.template.units[j].offset,[source.template.units[j].offset[0]+shift.dx,source.template.units[j].offset[1]+shift.dy]);
 for(const route of result.serviceRoutes){assert.deepEqual(route.points[1],result.template.units[route.unitIndex].offset);assert.deepEqual(route.points[0],result.plan.sites.find(s=>s.id===route.siteId).frontage.points[1]);}
 assert.throws(()=>fitValleyPocketTerrain(p,manifest,'valley-0',{...placement,terrainAware:false}),/side-pocket window/);
});

test('Rounded passage caps reject all rotated world edges and their opposite-team counterparts',()=>{
 const p=map(),endpoint=valleyPocketTemplate('valley-0','small',manifest).plan.passage.points[0][0];
 const options=[{rotation:0,x:1-endpoint,y:6000},{rotation:90,x:8000,y:1-endpoint},{rotation:180,x:15999+endpoint,y:6000},{rotation:270,x:8000,y:11999+endpoint}];
 const before=structuredClone(p);
 for(const edge of options)assert.throws(()=>fitValleyPocketTerrain(p,manifest,'valley-0',{...placement,...edge,radius:3300}),/central passage/);
 assert.deepEqual(p,before);
});
