import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createBlankProject,synchronizeActiveBaseLayout} from '../lib/wulfram.ts';
import {previewThreeLaneAnchorPlacement} from '../lib/three-lane-anchor-placement.ts';
import {BUILD_AREAS_KEY} from '../lib/build-areas.ts';
import {COMPOSITION_KEY} from '../lib/composition-budgets.ts';
import {generateBaseLayout} from '../lib/mcp-commands.ts';
import {favoriteFromLayout} from '../lib/formation-favorites.ts';
import {captureAuthoredBase,exportAuthoredBase,parseAuthoredBase} from '../lib/authored-base-package.ts';
import {placeAuthoredBase} from '../lib/authored-base-placement.ts';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json','utf8'));
const options={size:'small',x:4000,y:6000,rotation:0,radius:3300};
function blank(){const p=createBlankProject('Anchor destination',129);p.terrain.worldWidth=16000;p.terrain.worldHeight=12000;return p;}
void test('Exact count reaches shared placement and overloaded fitting rejects atomically',()=>{
 const p=blank(),before=structuredClone(p);const result=generateBaseLayout(p,{activeLayoutId:p.activeBaseLayoutId,layoutId:'counts',style:'three-lane-anchor',seed:'counts-0',placement:{...options,targetCount:24}},manifest);assert.equal(result.project.entities.length,48);assert.equal(result.project.baseLayouts.at(-1).metadata['formation.version'],'three-lane-anchor-v2');assert.deepEqual(p,before);
 assert.throws(()=>previewThreeLaneAnchorPlacement(p,manifest,'counts-0',{...options,targetCount:120},'crowded'),/cannot fit/);assert.deepEqual(p,before);
});
void test('Authored export preserves all Anchor sockets, reservations and poses on a different map',()=>{
 const source=previewThreeLaneAnchorPlacement(blank(),manifest,'portable-anchor',options,'anchor').project;
 const layout=source.baseLayouts.find(l=>l.id===source.activeBaseLayoutId),pack=parseAuthoredBase(exportAuthoredBase(captureAuthoredBase(layout,{origin:[8000,6000,0],yaw:0})));assert.equal(pack.version,2);
 const destination=blank();destination.name='Larger authored destination';destination.terrain.worldWidth=18000;destination.terrain.worldHeight=14000;const before=structuredClone(destination);
 const result=placeAuthoredBase(destination,pack,{activeLayoutId:destination.activeBaseLayoutId,layoutId:'reused',frame:{origin:[8500,6500,0],yaw:0},terrainMode:'preserve'},manifest);assert.deepEqual(destination,before);
 const reused=result.project.baseLayouts.at(-1);assert.deepEqual(JSON.parse(reused.metadata['forge.entrance-routing.v1']),JSON.parse(layout.metadata['forge.entrance-routing.v1']));
 assert.deepEqual(JSON.parse(reused.metadata[BUILD_AREAS_KEY]),JSON.parse(layout.metadata[BUILD_AREAS_KEY]).map(a=>({...a,points:a.points.map(([x,y])=>[x+500,y+500])})));
 assert.equal(reused.entities.length,layout.entities.length);for(const [i,e] of reused.entities.entries()){const old=layout.entities[i];for(let axis=0;axis<3;axis++)assert.ok(Math.abs(e.position[axis]-old.position[axis]-(axis<2?500:0))<1e-8);assert.deepEqual(e.rotation,JSON.parse(JSON.stringify(old.rotation)));assert.equal(e.token,old.token);assert.equal(e.team,old.team);}
});
void test('Shared GUI/MCP generator creates a separate layout and refuses lossy formation favorites',()=>{
 const p=blank(),before=structuredClone(p),request={activeLayoutId:p.activeBaseLayoutId,layoutId:'anchor-new',style:'three-lane-anchor',seed:'anchor-0',placement:{...options,targetCount:0}};
 const result=generateBaseLayout(p,request,manifest);assert.deepEqual(p,before);assert.equal(result.project.activeBaseLayoutId,'anchor-new');assert.deepEqual(result.project.baseLayouts[0],p.baseLayouts[0]);
 const layout=result.project.baseLayouts.at(-1);assert.equal(layout.metadata['formation.style'],'three-lane-anchor');assert.equal(JSON.parse(layout.metadata['forge.entrance-routing.v1']).sockets.length,6);assert.equal(JSON.parse(layout.metadata['formation.access']).routes.length,12);
 assert.throws(()=>favoriteFromLayout(layout,options,'favorite',result.project,manifest),/authored base|whole map|multiple entrances/i);
});
void test('Paired Anchor destination retains source, saves six unbound sockets and twelve pad paths',()=>{
 for(const size of ['small','standard','large','massive'])for(const rotation of [0,35,90]){
  const p=blank(),before=structuredClone(p),result=previewThreeLaneAnchorPlacement(p,manifest,'anchor-0',{...options,size,rotation},'anchor');
  assert.deepEqual(p,before);assert.deepEqual(result.project.terrain,p.terrain);assert.equal(result.policy.sockets.length,6);assert.ok(result.entrances.every(e=>!e.bound));assert.equal(result.padRoutes.length,12);
  for(const route of result.padRoutes){const pad=result.project.entities.find(e=>e.id===route.padId);assert.ok(Math.hypot(pad.position[0]-route.points.at(-1)[0],pad.position[1]-route.points.at(-1)[1])<1e-6);}
 }
});
void test('Existing entities, inactive layouts and budgets remain authoritative',()=>{
 const p=blank();p.entities.push({id:'distant',token:'e',team:0,position:[500,500,0],rotation:[0,0,0],active:1});synchronizeActiveBaseLayout(p);const inactive=structuredClone(p.baseLayouts[0]);inactive.id='inactive';p.baseLayouts.push(inactive);const before=structuredClone(p);
 const result=previewThreeLaneAnchorPlacement(p,manifest,'anchor-0',options,'anchor');assert.deepEqual(p,before);assert.deepEqual(result.project.entities[0],p.entities[0]);assert.deepEqual(result.project.baseLayouts[1],inactive);
 assert.throws(()=>previewThreeLaneAnchorPlacement(result.project,manifest,'anchor-0',options,'anchor'),/fresh/);
 assert.throws(()=>previewThreeLaneAnchorPlacement(result.project,manifest,'anchor-0',options,'second'),/already has entrance/);
 const budget=blank();budget.baseLayouts[0].metadata[COMPOSITION_KEY]=JSON.stringify([{team:1,role:'all',min:0,max:5}]);const budgetBefore=structuredClone(budget);assert.throws(()=>previewThreeLaneAnchorPlacement(budget,manifest,'anchor-0',options,'anchor'),/maximum|budget|limit/i);assert.deepEqual(budget,budgetBefore);
 const blocked=blank();const source=result.layout.entities[0];blocked.entities=[{...structuredClone(source),id:'obstacle'}];synchronizeActiveBaseLayout(blocked);const blockedBefore=structuredClone(blocked);assert.throws(()=>previewThreeLaneAnchorPlacement(blocked,manifest,'anchor-0',options,'anchor'),/overlaps/);assert.deepEqual(blocked,blockedBefore);
});
void test('Reserved destination rejects without changing the source',()=>{
 const p=blank();p.baseLayouts[0].metadata[BUILD_AREAS_KEY]=JSON.stringify([{id:'keep',name:'Keep clear',kind:'clear',team:'all',x:2000,y:4000,width:4000,height:4000}]);synchronizeActiveBaseLayout(p);const before=structuredClone(p);
 assert.throws(()=>previewThreeLaneAnchorPlacement(p,manifest,'anchor-0',options,'anchor'),/reservation/);assert.deepEqual(p,before);
});
void test('Placement radius is enforced without mutation',()=>{
 for(const radius of [1,-1,NaN,Infinity]){const p=blank(),before=structuredClone(p);assert.throws(()=>previewThreeLaneAnchorPlacement(p,manifest,'anchor-0',{...options,radius},'anchor'),/radius/);assert.deepEqual(p,before);}
 const automatic=previewThreeLaneAnchorPlacement(blank(),manifest,'anchor-0',{...options,targetCount:0},'anchor');assert.equal(automatic.layout.entities.length,30);
});
void test('Gentle paired hills retain terrain and snap all sizes; steep or asymmetric support rejects atomically',()=>{
 const terrain=(p,kind)=>{const t=p.terrain;for(let y=0;y<t.height;y++)for(let x=0;x<t.width;x++){const nx=x/(t.width-1),ny=y/(t.height-1);t.heights[y*t.width+x]=kind==='asymmetric'?nx*120:kind==='steep'?3000*Math.cos(nx*Math.PI*12)*Math.cos(ny*Math.PI*12):20+12*Math.cos(nx*Math.PI*2)*Math.cos(ny*Math.PI*2);}};
 for(const size of ['small','standard','large','massive']){const p=blank();terrain(p,'gentle');const before=structuredClone(p),result=previewThreeLaneAnchorPlacement(p,manifest,'anchor-hills',{...options,size,rotation:35},'hills');assert.deepEqual(p,before);assert.deepEqual(result.project.terrain,p.terrain);assert.ok(result.layout.entities.some(e=>Math.abs(e.rotation[0])+Math.abs(e.rotation[1])>1e-5));assert.ok(result.layout.entities.every(e=>e.position[2]>0));assert.equal(result.padRoutes.length,12);}
 for(const kind of ['steep','asymmetric']){const p=blank();terrain(p,kind);const before=structuredClone(p);assert.throws(()=>previewThreeLaneAnchorPlacement(p,manifest,'anchor-hills',options,'rejected'),/terrain|slope|support/i);assert.deepEqual(p,before);}
});
