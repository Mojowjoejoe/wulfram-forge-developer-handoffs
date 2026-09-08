import {createHash} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createBlankProject,activateBaseLayout,validateProject} from '../lib/wulfram.ts';
import {createCreativeBaseLayout} from '../lib/builtin-base-layouts.ts';
import {OFFSET_BASTION_ARRANGEMENTS,offsetBastionTemplate,offsetBastionPath,offsetBastionVersion} from '../lib/offset-bastion.ts';
import {withEntranceRouting,inspectEntranceRouting} from '../lib/entrance-routing.ts';
import {favoriteFromLayout,placeFavorite} from '../lib/formation-favorites.ts';
import {parsePortableBases,exportPortableBases} from '../lib/portable-base-library.ts';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json','utf8'));
const blank=()=>{const p=createBlankProject('Arrangements',129);p.terrain.worldWidth=12000;p.terrain.worldHeight=8000;p.terrain.heights.fill(0);return p;};
void test('Versioned arrangement fixtures retain exact building and entrance geometry',()=>{
 const golden=JSON.parse(fs.readFileSync('tests/fixtures/offset-arrangements-v1.json','utf8'));
 for(const c of golden.cases){
  const layout=createCreativeBaseLayout(blank(),manifest,'offset-bastion',`arrangement-${c.arrangement}-${c.size}`,golden.seed,{size:c.size,x:2800,y:4000,rotation:0,radius:2400,checkAccess:true,terrainAware:false,targetCount:0,offsetArrangement:c.arrangement});
  assert.equal(layout.metadata['formation.version'],c.version);
  assert.equal(createHash('sha256').update(JSON.stringify(layout.entities)).digest('hex'),c.layoutHash);
  assert.deepEqual(JSON.parse(layout.metadata['forge.build-areas.v1']),c.areas);
 }
});
void test('Explicit arrangements move whole powered sites and entrance geometry, with deterministic placement',()=>{
 const classic=offsetBastionTemplate('contract','massive',manifest),classicCenters=classic.units.filter(u=>u.token==='e').map(u=>u.offset);
 for(const arrangement of OFFSET_BASTION_ARRANGEMENTS.slice(1)){
  const t=offsetBastionTemplate('contract','massive',manifest,arrangement);assert.deepEqual(t,offsetBastionTemplate('contract','massive',manifest,arrangement));
  assert.notDeepEqual(offsetBastionPath(arrangement),offsetBastionPath());
  const centers=t.units.filter(u=>u.token==='e').map(u=>u.offset);
  assert.equal(centers.length,classicCenters.length);
  assert.ok(centers.filter((p,i)=>Math.hypot(p[0]-classicCenters[i][0],p[1]-classicCenters[i][1])>300).length>=4,'At least two powered sites move substantially');
 }
});
void test('Each arrangement and size retains source, valid powered access and portable exact geometry',()=>{
 for(const arrangement of OFFSET_BASTION_ARRANGEMENTS.slice(1))for(const size of ['small','standard','large','massive']){
  const p=blank(),before=structuredClone(p),placement={size,x:2800,y:4000,rotation:0,radius:2400,targetCount:{small:12,standard:18,large:26,massive:34}[size],checkAccess:true,offsetArrangement:arrangement};
  const generated=createCreativeBaseLayout(p,manifest,'offset-bastion',`test-${arrangement}`,`arrangement-${size}`,placement);
  assert.equal(generated.metadata['formation.version'],offsetBastionVersion(arrangement));
  const policy={version:1,bindings:[1,2].map(team=>({team,corridorId:`offset-bastion-approach-${team}`,direction:'forward'}))};
  const layout=withEntranceRouting(p,manifest,generated,policy),trial=structuredClone(p);trial.baseLayouts.push(layout);activateBaseLayout(trial,layout.id);
  assert.deepEqual(validateProject(trial).filter(i=>i.severity==='error'),[]);
  const favorite=favoriteFromLayout(layout,placement,'saved',p);assert.deepEqual(parsePortableBases(exportPortableBases([favorite])),[favorite]);
  const copy=placeFavorite(p,manifest,favorite,placement,'copy');
  assert.equal(copy.entities.length,layout.entities.length);
  copy.entities.forEach((entity,i)=>{
   const original=layout.entities[i];assert.equal(entity.token,original.token);assert.equal(entity.team,original.team);assert.equal(entity.active,original.active);
   entity.position.forEach((n,k)=>assert.ok(Math.abs(n-original.position[k])<1e-6,'Favorite preserves building position'));
   entity.rotation.forEach((n,k)=>{assert.ok(Math.abs(Math.sin(n)-Math.sin(original.rotation[k]))<1e-6);assert.ok(Math.abs(Math.cos(n)-Math.cos(original.rotation[k]))<1e-6);});
  });
  assert.deepEqual(JSON.parse(copy.metadata['forge.build-areas.v1']),JSON.parse(layout.metadata['forge.build-areas.v1']));
  assert.equal(inspectEntranceRouting(p,manifest,copy).length,2);
  assert.deepEqual(p,before);
 }
});
void test('Unknown or unrelated arrangement values reject rather than falling back to Classic',()=>{
 assert.throws(()=>offsetBastionPath('invented'),/Unknown/);
 assert.throws(()=>createCreativeBaseLayout(blank(),manifest,'starter','bad','seed',{size:'small',x:2800,y:4000,rotation:0,radius:2400,offsetArrangement:'deep-court'}),/only to Offset/);
});
