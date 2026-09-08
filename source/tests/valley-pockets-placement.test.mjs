import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {modelNameFor,createBlankProject,synchronizeActiveBaseLayout} from '../lib/wulfram.ts';
import {previewValleyPocketPlacement} from '../lib/valley-pockets-placement.ts';
import {COMPOSITION_KEY} from '../lib/composition-budgets.ts';
import {DISTRICTS_KEY} from '../lib/base-districts.ts';
import {generateBaseLayout} from '../lib/mcp-commands.ts';
import {favoriteFromLayout} from '../lib/formation-favorites.ts';
import {buildBaseLibrary} from '../lib/base-library.ts';
import {BUILD_AREAS_KEY} from '../lib/build-areas.ts';
const m=JSON.parse(fs.readFileSync('public/assets/manifest.json','utf8'));
const options={size:'small',x:4000,y:6000,rotation:0,radius:3300};
function blank(){const p=createBlankProject('Valley final',129);p.terrain.worldWidth=16000;p.terrain.worldHeight=12000;return p;}
test('Final paired placement preserves source and stores actual reservations and four exact pad endpoints',()=>{
 for(const size of ['small','standard','large','massive'])for(const rotation of [0,35,90]){
  const p=blank(),before=structuredClone(p),result=previewValleyPocketPlacement(p,m,'valley-0',{...options,size,rotation},'vp');
  assert.deepEqual(p,before);assert.equal(result.access.serviceRoutes.length,4);assert.ok(result.access.serviceRoutes.every(r=>r.markers.length===0));
  assert.deepEqual(result.project.terrain,p.terrain);
  const saved=JSON.parse(result.project.baseLayouts.find(l=>l.id===p.activeBaseLayoutId).metadata['formation.valleyPockets.vp']);assert.deepEqual(saved.plan,result.fitted.plan);
  for(const route of result.access.serviceRoutes){const pad=result.project.entities.find(e=>e.id===route.padId);assert.ok(pad);assert.ok(Math.hypot(pad.position[0]-route.points[1][0],pad.position[1]-route.points[1][1])<1e-6);}
 }
});
test('Existing building obstacles and saved corridors reject atomically',()=>{
 for(const kind of ['building','corridor','unknown']){
  const p=blank();
  if(kind==='building'||kind==='unknown')p.entities.push({id:'existing',token:kind==='unknown'?'*':'g',team:0,position:[4000,6000,0],rotation:[0,0,0],active:1});
  else p.baseLayouts[0].metadata[BUILD_AREAS_KEY]=JSON.stringify([{id:'keep',name:'Reserved entire base',kind:'clear',team:'all',x:2000,y:4000,width:4000,height:4000}]);
  synchronizeActiveBaseLayout(p);const before=structuredClone(p);
  assert.throws(()=>previewValleyPocketPlacement(p,m,'valley-0',options,'vp'),kind==='unknown'?/footprint-checked/:/reservation/);assert.deepEqual(p,before);
 }
});
test('Unrelated existing buildings and inactive layouts remain intact; duplicate IDs reject',()=>{
 const p=blank();p.entities.push({id:'distant',token:'e',team:0,position:[500,500,0],rotation:[0,0,0],active:1});synchronizeActiveBaseLayout(p);
 const prior=structuredClone(p.baseLayouts[0]);prior.id='inactive';p.baseLayouts.push(prior);const before=structuredClone(p);
 const result=previewValleyPocketPlacement(p,m,'valley-0',options,'vp');assert.deepEqual(p,before);assert.deepEqual(result.project.entities[0],p.entities[0]);assert.deepEqual(result.project.baseLayouts[1],prior);
 assert.throws(()=>previewValleyPocketPlacement(result.project,m,'valley-0',options,'vp'),/fresh/);
});

test('Saved composition limits reject additions and locked distant districts remain exact',()=>{
 const p=blank();p.baseLayouts[0].metadata[COMPOSITION_KEY]=JSON.stringify([{team:1,role:'all',min:0,max:5}]);const before=structuredClone(p);
 assert.throws(()=>previewValleyPocketPlacement(p,m,'valley-0',options,'vp'),/limit|maximum|budget/i);assert.deepEqual(p,before);
 const q=blank();q.entities.push({id:'locked-cell',token:'e',team:0,position:[500,500,0],rotation:[0,0,0],active:1});q.baseLayouts[0].metadata[DISTRICTS_KEY]=JSON.stringify([{id:'locked',name:'Keep',entityIds:['locked-cell'],locked:true}]);synchronizeActiveBaseLayout(q);
 const saved=structuredClone(q),result=previewValleyPocketPlacement(q,m,'valley-0',options,'vp');assert.deepEqual(q,saved);assert.deepEqual(result.project.entities[0],q.entities[0]);assert.equal(result.project.baseLayouts[0].metadata[DISTRICTS_KEY],q.baseLayouts[0].metadata[DISTRICTS_KEY]);
});

test('Tilted tall model bounds block the passage and unrelated arrangement settings reject',()=>{
 const p=blank(),manifest=structuredClone(m),token='p';
 const key=modelNameFor({token,team:1});manifest.models[key].bounds={min:[-1,-1,0],max:[1,1,1000]};
 p.entities.push({id:'tilted',token,team:1,position:[4000,6200,0],rotation:[Math.PI/2,0,0],active:1});synchronizeActiveBaseLayout(p);const before=structuredClone(p);
 assert.throws(()=>previewValleyPocketPlacement(p,manifest,'valley-0',options,'vp'),/overlaps|reservation|footprint/);assert.deepEqual(p,before);
 const upright=structuredClone(p);upright.entities[0].rotation=[0,0,0];synchronizeActiveBaseLayout(upright);assert.doesNotThrow(()=>previewValleyPocketPlacement(upright,manifest,'valley-0',options,'vp'));
 assert.throws(()=>previewValleyPocketPlacement(blank(),m,'valley-0',{...options,offsetArrangement:'default'},'vp'),/Offset Bastion/);
});

test('Shared generation creates a new additive layout, keeps old state and requires model evidence for favorites',()=>{
 const p=blank(),before=structuredClone(p),request={activeLayoutId:p.activeBaseLayoutId,layoutId:'pockets-new',style:'valley-pockets',seed:'valley-0',placement:options};
 const result=generateBaseLayout(p,request,m);assert.deepEqual(p,before);assert.equal(result.project.activeBaseLayoutId,request.layoutId);assert.equal(result.project.baseLayouts.length,p.baseLayouts.length+1);assert.deepEqual(result.project.baseLayouts[0],p.baseLayouts[0]);
 const layout=result.project.baseLayouts.find(l=>l.id===request.layoutId);assert.equal(layout.metadata['formation.style'],'valley-pockets');assert.ok(layout.metadata['formation.valleyPockets.pockets-new']);const overlay=JSON.parse(layout.metadata['formation.access']);assert.deepEqual(overlay.blocked,[]);assert.ok(overlay.routes.length>4);assert.ok(overlay.routes.every(route=>route.length>=2&&route.every(p=>p.length===2&&p.every(Number.isFinite))));
 assert.throws(()=>favoriteFromLayout(layout,options,'favorite',result.project),/source map and model evidence/);
 assert.throws(()=>generateBaseLayout(result.project,request,m),/Active layout changed/);
 const entry=buildBaseLibrary([],[],m,'small').find(e=>e.id==='valley-pockets');assert.equal(entry.category,'Creative');assert.equal(entry.modeledCount,10);assert.equal(entry.reservationBands.length,3);
});
