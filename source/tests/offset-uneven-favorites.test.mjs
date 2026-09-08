import {inspectBuildingSupport} from '../tools/inspect-building-support.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createBlankProject,activateBaseLayout,validateProject} from '../lib/wulfram.ts';
import {createCreativeBaseLayout} from '../lib/builtin-base-layouts.ts';
import {withEntranceRouting,inspectEntranceRouting} from '../lib/entrance-routing.ts';
import {favoriteFromLayout,placeFavorite} from '../lib/formation-favorites.ts';
import {parsePortableBases,exportPortableBases} from '../lib/portable-base-library.ts';
import {analyzeRotationalEntityPairs} from '../lib/balanced-map-analysis.ts';
import {offsetPortabilityTarget} from '../tools/offset-portability-fixtures.mjs';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json','utf8'));
const policy={version:1,bindings:[1,2].map(team=>({team,corridorId:`offset-bastion-approach-${team}`,direction:'forward'}))};
for(const arrangement of ['wide-front','deep-court','split-wings'])for(const size of ['small','standard','large','massive'])for(const terrain of ['valley','irregular'])void test(`${arrangement}/${size} favorite on ${terrain} preserves policy and relative geometry`,()=>{
 const p=createBlankProject('Source',129);p.terrain.worldWidth=12000;p.terrain.worldHeight=8000;p.terrain.heights.fill(0);
 const placement={size,x:2800,y:4000,rotation:0,radius:2400,targetCount:{small:12,standard:18,large:26,massive:34}[size],checkAccess:true,offsetArrangement:arrangement};
 const layout=withEntranceRouting(p,manifest,createCreativeBaseLayout(p,manifest,'offset-bastion','source','uneven-favorite',placement),policy);
 const favorite=favoriteFromLayout(layout,placement,'saved',p),portable=parsePortableBases(exportPortableBases([favorite]))[0];assert.deepEqual(portable,favorite);
 const target=offsetPortabilityTarget(terrain),before=structuredClone(target),destination={...placement,x:3500,y:5000,rotation:90};
 const beforeFavorite=structuredClone(portable);const copy=placeFavorite(target,manifest,portable,destination,'copy');assert.deepEqual(target,before);assert.deepEqual(portable,beforeFavorite);
 assert.deepEqual(JSON.parse(copy.metadata['forge.entrance-routing.v1']),policy);
 const project=structuredClone(target);project.baseLayouts.push(copy);activateBaseLayout(project,copy.id);
 assert.deepEqual(project.terrain,target.terrain);assert.deepEqual(validateProject(project).filter(i=>i.severity==='error'),[]);assert.ok(analyzeRotationalEntityPairs(project,manifest).passed);
 assert.equal(inspectEntranceRouting(project,manifest,copy).length,2);
 for(const support of inspectBuildingSupport(project,manifest))assert.ok(support.minimumGap>=-0.01,`Rendered model vertices below terrain: ${JSON.stringify(support)}`);
 assert.equal(copy.entities.length,layout.entities.length);
 // Both teams rotate around their own source anchors; vertical placement conforms to target terrain.
 for(let i=0;i<copy.entities.length;i++){
  const a=layout.entities[i],b=copy.entities[i],sx=a.team===1?2800:9200,sy=4000,tx=a.team===1?3500:10500,ty=5000;
  assert.equal(b.token,a.token);assert.equal(b.team,a.team);assert.equal(b.active,a.active);
  assert.ok(Math.abs(b.position[0]-(tx-(a.position[1]-sy)))<1e-6);assert.ok(Math.abs(b.position[1]-(ty+(a.position[0]-sx)))<1e-6);
 }
});

void test('Blocked stepped terrain rejects favorite reuse without changing terrain or saved favorite',()=>{
 const p=createBlankProject('Source',129);p.terrain.worldWidth=12000;p.terrain.worldHeight=8000;p.terrain.heights.fill(0);
 const placement={size:'small',x:2800,y:4000,rotation:0,radius:2400,checkAccess:true,offsetArrangement:'wide-front'};
 const layout=withEntranceRouting(p,manifest,createCreativeBaseLayout(p,manifest,'offset-bastion','source','negative-favorite',placement),policy);
 const favorite=favoriteFromLayout(layout,placement,'saved',p),original=structuredClone(favorite),target=offsetPortabilityTarget('valley');
 target.terrain.heights=target.terrain.heights.map((h,i)=>h+(i%129>64?80:0));const before=structuredClone(target);
 assert.throws(()=>placeFavorite(target,manifest,favorite,{...placement,x:3500,y:5000,rotation:90},'rejected'),/Team 2 repair approach blocked/);
 assert.deepEqual(target,before);assert.deepEqual(favorite,original);
});
