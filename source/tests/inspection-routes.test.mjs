import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createBlankProject} from '../lib/wulfram.ts';
import {BUILD_AREAS_KEY} from '../lib/build-areas.ts';
import {inspectionRoutes,routeInspectionProject,inspectRoutes} from '../lib/inspection-routes.ts';
import {routeClearance,routePoint} from '../lib/route-inspection.ts';
const manifest=JSON.parse(await fs.readFile('public/assets/manifest.json'));
await test('Authored corridor inspection works without service pads and preserves saved point direction and source',()=>{
  const p=createBlankProject();const points=[[1000,1000],[1200,1000],[1200,1200]];
  p.baseLayouts[0].metadata[BUILD_AREAS_KEY]=JSON.stringify([{id:'link',name:'Supply link',kind:'corridor',team:'1',width:120,points}]);
  const before=structuredClone(p),result=inspectionRoutes(p,manifest);
  assert.equal(result.error,'');assert.equal(result.routes.length,1);assert.equal(result.routes[0].kind,'authored');assert.equal(result.routes[0].reservedWidth,120);
  assert.deepEqual(result.routes[0].points,points);assert.deepEqual(routePoint(result.routes[0].points,0),points[0]);assert.deepEqual(routePoint(result.routes[0].points,1),points[2]);
  result.routes[0].points[0][0]=999;assert.deepEqual(p,before);
  assert.equal(inspectionRoutes(p,manifest,false).routes.length,0,'Creative preview can exclude saved-layout corridors');
  p.baseLayouts[0].metadata[BUILD_AREAS_KEY]='invalid';assert.match(inspectionRoutes(p,manifest).error,/Authored corridors/);
});
await test('Authored inspection includes endpoint service buildings while legacy drive-on behavior remains available',()=>{
  const p=createBlankProject();p.terrain.heights.fill(0);p.entities=[{id:'repair',token:'r',team:2,position:[1000,1000,0],rotation:[0,0,0],active:1}];
  const points=[[1000,1000],[1400,1000]];
  assert.equal(routeClearance(p,manifest,points,80).length,0);
  assert.ok(routeClearance(p,manifest,points,80,false).some(m=>m.severity==='blocked'&&m.message.includes('Repair')));
});

await test('Preview route inspection uses only candidate entities and corridors without borrowing saved layout rules',()=>{
 const p=createBlankProject();p.terrain.heights.fill(0);
 const corridor={id:'saved',name:'Saved road',kind:'corridor',team:'all',width:120,points:[[1000,1000],[1400,1000]]};
 p.baseLayouts[0].metadata[BUILD_AREAS_KEY]=JSON.stringify([corridor]);
 const candidate={...structuredClone(p.baseLayouts[0]),id:'candidate',metadata:{[BUILD_AREAS_KEY]:JSON.stringify([{...corridor,id:'candidate-road',name:'Candidate entrance'}])}};
 const before=structuredClone(p),candidateBefore=structuredClone(candidate);
 const preview=routeInspectionProject(p,true,candidate);
 assert.deepEqual(inspectionRoutes(preview,manifest).routes.map(r=>r.id),['candidate-road']);
 assert.equal(inspectionRoutes(routeInspectionProject(p,true),manifest).routes.length,0);
 assert.equal(routeInspectionProject(p,false,candidate),p);
 assert.deepEqual(p,before);assert.deepEqual(candidate,candidateBefore);
});
await test('Route report retains authored direction, width warning and endpoint obstruction without map mutation',()=>{
 const p=createBlankProject();p.terrain.heights.fill(0);
 p.entities=[{id:'gun',token:'g',team:2,position:[1000,1000,0],rotation:[0,0,0],active:1}];
 p.baseLayouts[0].metadata[BUILD_AREAS_KEY]=JSON.stringify([{id:'road',name:'Entrance',kind:'corridor',team:'1',width:120,points:[[1000,1000],[1400,1000]]}]);
 const before=structuredClone(p),result=inspectRoutes(p,manifest,160);
 assert.equal(result.routes[0].length,400);assert.equal(result.routes[0].vehicleWiderThanReservation,true);assert.ok(result.routes[0].markers.some(m=>m.severity==='blocked'));
 assert.deepEqual(result.routes[0].points,[[1000,1000],[1400,1000]]);assert.deepEqual(p,before);
 for(const value of [NaN,0,401,undefined])assert.throws(()=>inspectRoutes(p,manifest,value),/Vehicle width/);
});

await test('Extreme and out-of-map authored geometry returns a diagnostic without sampling or mutation',()=>{
 const p=createBlankProject(),before=structuredClone(p);
 for(const points of [[[1,1],[1e300,1]],[[1,1],[p.terrain.worldWidth+1,1]]]){
  p.baseLayouts[0].metadata[BUILD_AREAS_KEY]=JSON.stringify([{id:'bad',name:'Malformed entrance',kind:'corridor',team:'all',width:100,points}]);
  const snapshot=structuredClone(p),result=inspectRoutes(p,manifest,80);
  assert.equal(result.routes.length,0);assert.match(result.error,/sampling budget|outside the map/);assert.deepEqual(p,snapshot);
 }
 assert.throws(()=>routeClearance(before,manifest,[[1,1],[1e300,1]],80),/sampling budget/);
});

await test('MCP elevation output has a shared sample budget and preserves route summaries',()=>{
 const p=createBlankProject('Budget',65);p.terrain.worldWidth=1000;p.terrain.worldHeight=1000;
 const points=Array.from({length:32},(_,i)=>[i%2?900:100,500]);
 p.baseLayouts[0].metadata[BUILD_AREAS_KEY]=JSON.stringify(Array.from({length:10},(_,i)=>({id:`budget-${i}`,name:`Route ${i}`,kind:'corridor',team:'all',width:80,points})));
 const before=structuredClone(p),r=inspectRoutes(p,manifest,80);assert.equal(r.routes.length,10);
 assert.ok(r.routes.reduce((n,r)=>n+r.elevation.samples.length,0)<=20000);assert.ok(r.routes.some(r=>r.elevation.error));assert.ok(r.routes.some(r=>r.elevation.samples.length));assert.ok(r.routes.every(r=>r.length===24800));assert.deepEqual(p,before);
});

await test('Temporary path inspection works without saved corridors, includes endpoint units and preserves inputs',()=>{
 const p=createBlankProject('Temporary path',65);p.entities=[{id:'end-pad',token:'r',team:1,position:[1400,1000,0],rotation:[0,0,0],active:1}];
 const points=[[1000,1000],[1400,1000]],before=structuredClone(p),input=structuredClone(points),r=inspectRoutes(p,manifest,80,points);
 assert.equal(r.routes.length,1);assert.equal(r.routes[0].kind,'temporary');assert.deepEqual(r.routes[0].points,points);assert.ok(r.routes[0].markers.some(m=>m.message.includes('Repair Pad')));assert.ok(r.routes[0].elevation.samples.length>1);
 r.routes[0].points[0][0]=999;assert.deepEqual(points,input);assert.deepEqual(p,before);
 for(const bad of [[],[[1,1]],[[1,1],[1,1]],[[0,0],[-1,5]],[[0,0],[Infinity,0]],Array.from({length:33},(_,i)=>[i,1])])assert.throws(()=>inspectRoutes(p,manifest,80,bad));
 assert.deepEqual(p,before);
});
