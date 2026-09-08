import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createCreativeBaseLayout} from '../lib/builtin-base-layouts.ts';
import {favoriteFromLayout,placeFavorite} from '../lib/formation-favorites.ts';
import {exportPortableBases,parsePortableBases,mergePersonalBases} from '../lib/portable-base-library.ts';
import {BUILD_AREAS_KEY,readBuildAreas,checkBuildAreas} from '../lib/build-areas.ts';
import {createBlankProject} from '../lib/wulfram.ts';
import {withEntranceRouting,readEntranceRouting,inspectEntranceRouting,ENTRANCE_ROUTING_KEY} from '../lib/entrance-routing.ts';
import {placeReservations} from '../lib/portable-reservations.ts';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json'));
const options={size:'small',x:2800,y:4000,rotation:35,radius:2400,targetCount:9,checkAccess:true};
const blank=()=>{const p=createBlankProject('Portable',129);p.terrain.worldWidth=12000;p.terrain.worldHeight=8000;return p;};
void test('Explicit entrances survive versioned favorite relocation; downgrade and missing targets reject',()=>{
 const p=blank(),placement={...options,targetCount:12};
 const original=createCreativeBaseLayout(p,manifest,'offset-bastion','offset','portable-contract',placement);
 const policy={version:1,bindings:[1,2].map(team=>({team,corridorId:`offset-bastion-approach-${team}`,direction:'forward'}))};
 const layout=withEntranceRouting(p,manifest,original,policy),favorite=favoriteFromLayout(layout,placement,'entrance-saved',p);
 assert.equal(favorite.reservations.version,3);
 const raw=exportPortableBases([favorite]);assert.equal(JSON.parse(raw).version,4);
 assert.deepEqual(parsePortableBases(raw),[favorite]);
 for(const version of [1,2,3]){const downgrade=JSON.parse(raw);downgrade.version=version;assert.throws(()=>parsePortableBases(JSON.stringify(downgrade)),/version/);}
 for(const version of [1,2]){const oldReservation=structuredClone(favorite);oldReservation.reservations.version=version;assert.throws(()=>exportPortableBases([oldReservation]),/reservations|reservation version 3/);}
 const target=blank();target.terrain.worldWidth=14000;target.terrain.worldHeight=10000;
 const nextPlacement={...placement,x:3500,y:5000,rotation:90},before=structuredClone({target,favorite});
 const copy=placeFavorite(target,manifest,favorite,nextPlacement,'entrance-copy');
 assert.deepEqual(readEntranceRouting(copy.metadata[ENTRANCE_ROUTING_KEY]),policy);
 assert.equal(inspectEntranceRouting(target,manifest,copy).length,2);
 assert.deepEqual(favoriteFromLayout(copy,nextPlacement,'again',target).reservations.entranceRouting,policy);
 assert.deepEqual({target,favorite},before);
 const invalid=structuredClone(favorite.reservations);invalid.entranceRouting.bindings[0].corridorId='missing';
 const copyBefore=structuredClone(copy);assert.throws(()=>placeReservations(target,manifest,copy,nextPlacement,invalid),/missing/);assert.deepEqual(copy,copyBefore);
 const corridor=readBuildAreas(copy.metadata[BUILD_AREAS_KEY])[0],a=corridor.points[0],b=corridor.points[1];
 copy.entities.push({id:'blocker',token:'g',team:2,position:[(a[0]+b[0])/2,(a[1]+b[1])/2,0],rotation:[0,0,0],active:1});
 const blockedBefore=structuredClone(copy);
 assert.throws(()=>placeReservations(target,manifest,copy,nextPlacement,favorite.reservations),/overlaps reserved space/);assert.deepEqual(copy,blockedBefore);
});
function fixture(){const p=blank(),layout=createCreativeBaseLayout(p,manifest,'frontier-camp','trial','contract',options);return {p,layout};}
void test('Edited Frontier corridors survive portable export, relocation, rotation and saving again',()=>{
 const {p,layout}=fixture(),areas=readBuildAreas(layout.metadata[BUILD_AREAS_KEY]);
 areas[0].points.splice(1,0,[(areas[0].points[0][0]+areas[0].points[1][0])/2+20,(areas[0].points[0][1]+areas[0].points[1][1])/2]);areas[0].width=280;areas[1].name='Edited second reserve';layout.metadata[BUILD_AREAS_KEY]=JSON.stringify(areas);
 const before=structuredClone({p,layout}),f=favoriteFromLayout(layout,options,'saved',p),raw=exportPortableBases([f]);
 assert.equal(JSON.parse(raw).version,3);assert.deepEqual(parsePortableBases(raw),[f]);
 const target=blank();target.terrain.worldWidth=14000;target.terrain.worldHeight=10000;
 const placement={...options,x:3500,y:5000,rotation:90},targetBefore=structuredClone(target),copy=placeFavorite(target,manifest,f,placement,'copy');
 const moved=readBuildAreas(copy.metadata[BUILD_AREAS_KEY]);assert.equal(moved[0].points.length,3);assert.equal(moved[0].width,280);assert.equal(moved[1].name,'Edited second reserve');assert.deepEqual(checkBuildAreas(moved,copy.entities,14000,10000,manifest),[]);
 const savedAgain=favoriteFromLayout(copy,placement,'again',target);
 f.reservations.areas.forEach((a,i)=>a.points.forEach((point,j)=>point.forEach((n,k)=>assert.ok(Math.abs(n-savedAgain.reservations.areas[i].points[j][k])<1e-8))));
 assert.equal(copy.metadata['formation.snapPolicy'],'shared-footprint-v2');assert.equal(copy.entities.length,18);
 assert.deepEqual({p,layout},before);assert.deepEqual(target,targetBefore);
 const changed=structuredClone(f);changed.reservations.areas[0].width-=10;assert.equal(mergePersonalBases([f],[changed]).added,1);
});
void test('Unsupported schemas and unsafe reservation reuse fail without editing maps',()=>{
 const {p,layout}=fixture(),f=favoriteFromLayout(layout,options,'saved',p),before=structuredClone(p);
 const doc=JSON.parse(exportPortableBases([f]));doc.version=2;assert.throws(()=>parsePortableBases(JSON.stringify(doc)),/version 3/);
 for(const mutate of [v=>v.version=2,v=>v.areas[0].side=2,v=>v.areas[0].points=[[0,0],[0,0]],v=>v.areas[0].team='1',v=>v.snapPolicy='legacy']){
  const bad=structuredClone(f);mutate(bad.reservations);assert.throws(()=>exportPortableBases([bad]));
 }
 assert.throws(()=>favoriteFromLayout(layout,options,'missing'),/source map/);
 assert.throws(()=>placeFavorite(p,manifest,f,{...options,radius:550},'bad'),/yellow/);
 const occupied=structuredClone(f);occupied.reservations.areas[0].points=[[-350,-250],[-350,250]];
 assert.throws(()=>placeFavorite(p,manifest,occupied,options,'bad'),/reserved space/);
 const unsupported=structuredClone(layout);unsupported.metadata[BUILD_AREAS_KEY]=JSON.stringify([{id:'manual',name:'Manual',kind:'clear',team:'all',x:10,y:10,width:50,height:50}]);
 assert.throws(()=>favoriteFromLayout(unsupported,options,'bad',p),/whole map/);
 const edge=structuredClone(f);edge.reservations.areas[0].points=[[2800,-250],[2800,250]];
 assert.throws(()=>placeFavorite(p,manifest,edge,{...options,x:9400,rotation:0,radius:4000},'edge'),/outside|map|boundary/);
 const asymmetric=blank();asymmetric.terrain.heights=asymmetric.terrain.heights.map((_,i)=>i%129*2);
 assert.throws(()=>placeFavorite(asymmetric,manifest,f,options,'asymmetric'),/matching paired terrain support/);
 assert.deepEqual(p,before);
});

void test('Offset Bastion version 2 corridors survive edited geometry and cross-map reuse',()=>{
 const p=blank(),placement={...options,targetCount:12},layout=createCreativeBaseLayout(p,manifest,'offset-bastion','offset','portable-contract',placement);
 const areas=readBuildAreas(layout.metadata[BUILD_AREAS_KEY]);areas[0].width=160;areas[1].name='Edited bent approach';layout.metadata[BUILD_AREAS_KEY]=JSON.stringify(areas);
 const before=structuredClone({p,layout}),favorite=favoriteFromLayout(layout,placement,'offset-saved',p),raw=exportPortableBases([favorite]);
 assert.equal(favorite.reservations.version,2);assert.equal(favorite.reservations.family,'offset-bastion');assert.equal(JSON.parse(raw).version,3);assert.deepEqual(parsePortableBases(raw),[favorite]);
 const target=blank();target.terrain.worldWidth=14000;target.terrain.worldHeight=10000;
 const nextPlacement={...placement,x:3500,y:5000,rotation:90},targetBefore=structuredClone(target),copy=placeFavorite(target,manifest,favorite,nextPlacement,'offset-copy');
 const saved=favoriteFromLayout(copy,nextPlacement,'offset-again',target);assert.equal(copy.metadata['formation.reservationPolicy'],'offset-bastion-approach-v1');assert.equal(copy.entities.length,24);
 favorite.reservations.areas.forEach((a,i)=>{assert.equal(saved.reservations.areas[i].name,a.name);assert.equal(saved.reservations.areas[i].width,a.width);a.points.forEach((point,j)=>point.forEach((n,k)=>assert.ok(Math.abs(n-saved.reservations.areas[i].points[j][k])<1e-8)));});
 const bad=structuredClone(favorite);bad.reservations.version=1;assert.throws(()=>exportPortableBases([bad]));bad.reservations.version=2;bad.reservations.areas[1].id='frontier-expansion-2';assert.throws(()=>exportPortableBases([bad]));
 assert.deepEqual({p,layout},before);assert.deepEqual(target,targetBefore);
});

void test('Favorites cannot silently drop authoring rules when there are no reserved areas',()=>{
 const {p,layout}=fixture();
 for(const key of ['forge.districts.v1','forge.composition-budgets.v1','forge.district-relationships.v1']){
 const ordinary=structuredClone(layout);delete ordinary.metadata['forge.build-areas.v1'];delete ordinary.metadata['formation.reservationPolicy'];ordinary.metadata['formation.version']='ordinary';ordinary.metadata[key]='[{"saved":"rule"}]';
 const before=structuredClone(ordinary);assert.throws(()=>favoriteFromLayout(ordinary,options,'unsafe',p),/additional authoring rules.*whole map/);assert.deepEqual(ordinary,before);
 }
 const ordinary=structuredClone(layout);ordinary.metadata={'formation.version':'ordinary','forge.districts.v1':'[]'};assert.ok(favoriteFromLayout(ordinary,options,'plain',p).template.units.length);
});

void test('Courtyard reservations retain both through-courts across versioned portable relocation',()=>{
 const p=blank();p.terrain.worldWidth=14000;p.terrain.worldHeight=10000;
 const placement={...options,x:3200,y:5000,radius:2600,targetCount:0},layout=createCreativeBaseLayout(p,manifest,'service-courtyard','court','portable',placement);
 const original=structuredClone({p,layout}),favorite=favoriteFromLayout(layout,placement,'court-favorite',p),raw=exportPortableBases([favorite]);
 assert.equal(favorite.reservations.version,4);assert.equal(JSON.parse(raw).version,5);assert.deepEqual(parsePortableBases(raw),[favorite]);
 for(const version of [1,2,3,4]){const old=JSON.parse(raw);old.version=version;assert.throws(()=>parsePortableBases(JSON.stringify(old)),/version/);}
 const next={...placement,x:3400,y:5000,rotation:90},copy=placeFavorite(p,manifest,favorite,next,'court-copy');
 const areas=readBuildAreas(copy.metadata[BUILD_AREAS_KEY]);assert.equal(areas.length,6);assert.deepEqual(checkBuildAreas(areas,copy.entities,14000,10000,manifest),[]);
 assert.equal(copy.metadata['formation.reservationPolicy'],'service-courtyard-v1');assert.equal(JSON.parse(copy.metadata['formation.courtyardAccess']).routes.length,2);
 const recaptured=favoriteFromLayout(copy,next,'court-again',p);
 favorite.reservations.areas.forEach((a,i)=>a.points.forEach((point,j)=>point.forEach((n,k)=>assert.ok(Math.abs(n-recaptured.reservations.areas[i].points[j][k])<1e-8))));
 for(const mutate of [r=>r.areas.pop(),r=>r.areas[1].id=r.areas[0].id,r=>r.areas[0].side=2,r=>r.areas[0].width=40]){const bad=structuredClone(favorite);mutate(bad.reservations);assert.throws(()=>exportPortableBases([bad]),/Courtyard/);}
 const disconnected=structuredClone(favorite);disconnected.reservations.areas[1].points[1][0]+=20;
 assert.throws(()=>placeFavorite(p,manifest,disconnected,next,'bad'),/connect/);
 const ridge=structuredClone(p);ridge.terrain.heights=ridge.terrain.heights.map((_,i)=>{const x=i%129*14000/128,y=Math.floor(i/129)*10000/128;return Math.abs(y-5000)<150&&Math.min(Math.abs(x-3200),Math.abs(x-10800))<150?400:0;});
 const ridgeBefore=structuredClone(ridge);assert.throws(()=>placeFavorite(ridge,manifest,favorite,{...placement,rotation:0,checkAccess:false},'ridge'),/Courtyard through route/);assert.deepEqual(ridge,ridgeBefore);
 assert.deepEqual({p,layout},original);
});

void test('Broken Ring versioned favorites retain complete plan, all routes and destination checks',()=>{
 const p=blank();p.terrain.worldWidth=16000;p.terrain.worldHeight=12000;
 const placement={...options,x:4000,y:6000,radius:3000,targetCount:0},layout=createCreativeBaseLayout(p,manifest,'broken-ring','ring','portable',placement);
 const before=structuredClone({p,layout}),favorite=favoriteFromLayout(layout,placement,'ring-favorite',p),raw=exportPortableBases([favorite]);
 assert.equal(favorite.reservations.version,5);assert.equal(favorite.reservations.brokenRingPlan.version,'broken-ring-v3');assert.equal(JSON.parse(raw).version,6);assert.deepEqual(parsePortableBases(raw),[favorite]);
 const reordered=structuredClone(favorite);reordered.reservations.brokenRingPlan=Object.fromEntries(Object.entries(reordered.reservations.brokenRingPlan).reverse());assert.equal(JSON.parse(exportPortableBases([reordered])).version,6);
 for(const version of [1,2,3,4,5]){const old=JSON.parse(raw);old.version=version;assert.throws(()=>parsePortableBases(JSON.stringify(old)),/version/);}
 const target=blank();target.terrain.worldWidth=18000;target.terrain.worldHeight=14000;
 const next={...placement,x:4500,y:7000,rotation:90},copy=placeFavorite(target,manifest,favorite,next,'ring-copy');
 assert.equal(readBuildAreas(copy.metadata[BUILD_AREAS_KEY]).length,10);assert.equal(JSON.parse(copy.metadata['formation.brokenRingAccess']).routes.length,8);
 assert.deepEqual(JSON.parse(copy.metadata['formation.brokenRingPlan']),favorite.reservations.brokenRingPlan);
 const again=favoriteFromLayout(copy,next,'ring-again',target);assert.deepEqual(again.reservations.brokenRingPlan,favorite.reservations.brokenRingPlan);
 for(const mutate of [r=>r.areas.pop(),r=>r.areas[0].points[0][0]+=20,r=>r.brokenRingPlan.sites[0].center[0]+=800,r=>r.version=4]){
  const bad=structuredClone(favorite);mutate(bad.reservations);assert.throws(()=>exportPortableBases([bad]));
 }
 assert.deepEqual({p,layout},before);
});

void test('Actual v93 favorite retains v1 geometry after v2 becomes the default',()=>{
 const raw=fs.readFileSync('tests/fixtures/broken-ring-v1-portable.json','utf8');
 const [favorite]=parsePortableBases(raw),before=structuredClone(favorite);
 assert.equal(favorite.reservations.brokenRingPlan.version,'broken-ring-v1');
 assert.deepEqual(parsePortableBases(exportPortableBases([favorite])),[favorite]);
 const target=blank();target.terrain.worldWidth=18000;target.terrain.worldHeight=14000;
 const original=structuredClone(target),placement={...options,size:'large',x:4500,y:7000,rotation:90,radius:3300,targetCount:0};
 const copy=placeFavorite(target,manifest,favorite,placement,'legacy-ring');
 assert.equal(copy.metadata['formation.reservationPolicy'],'broken-ring-v1');
 assert.deepEqual(JSON.parse(copy.metadata['formation.brokenRingPlan']),before.reservations.brokenRingPlan);
 assert.deepEqual(favoriteFromLayout(copy,placement,'legacy-again',target).reservations.brokenRingPlan,before.reservations.brokenRingPlan);
 const bad=structuredClone(favorite);bad.reservations.brokenRingPlan.version='broken-ring-v4';
 assert.throws(()=>exportPortableBases([bad]),/Unsupported Broken Ring/);
 const relabeled=structuredClone(favorite);relabeled.reservations.brokenRingPlan.version='broken-ring-v2';
 assert.throws(()=>exportPortableBases([relabeled]),/Invalid Broken Ring/);
 assert.deepEqual(favorite,before);assert.deepEqual(target,original);
});

void test('Actual v94 v2 favorite retains its saved recipe under the v3 default',()=>{
 const [favorite]=parsePortableBases(fs.readFileSync('tests/fixtures/broken-ring-v2-portable.json','utf8'));
 const target=blank();target.terrain.worldWidth=18000;target.terrain.worldHeight=14000;
 const placement={...options,size:'large',x:4500,y:7000,rotation:90,radius:3300,targetCount:0};
 const copy=placeFavorite(target,manifest,favorite,placement,'v2-retained');
 assert.equal(copy.metadata['formation.reservationPolicy'],'broken-ring-v2');
 const edited=structuredClone(favorite);edited.reservations.brokenRingPlan.sites[0].center[0]+=1e-5;assert.throws(()=>exportPortableBases([edited]),/Invalid Broken Ring/);
 const extra=structuredClone(favorite);extra.reservations.brokenRingPlan.extra=1;assert.throws(()=>exportPortableBases([extra]),/Invalid Broken Ring/);
 assert.deepEqual(JSON.parse(copy.metadata['formation.brokenRingPlan']),favorite.reservations.brokenRingPlan);
 assert.deepEqual(parsePortableBases(exportPortableBases([favorite])),[favorite]);
});
