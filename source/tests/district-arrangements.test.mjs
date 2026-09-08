import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createBlankProject,synchronizeActiveBaseLayout} from '../lib/wulfram.ts';
import {createCreativeBaseLayout} from '../lib/builtin-base-layouts.ts';
import {previewDistrictArrangements} from '../lib/district-arrangements.ts';
import {withDistrictRelationships} from '../lib/editor-constraints.ts';
import {relationshipDistance,readDistrictRelationships,DISTRICT_RELATIONSHIPS_KEY} from '../lib/district-relationships.ts';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json'));
function fixture(){const p=createBlankProject('District trial',65);p.terrain.heights.fill(0);p.terrain.worldWidth=8000;p.terrain.worldHeight=6000;
const layout=createCreativeBaseLayout(p,manifest,'workshop','arrangement-source','test',{size:'small',x:1800,y:2800,rotation:0,radius:1800,targetCount:12,checkAccess:true});p.entities=layout.entities;p.baseLayouts=[layout];p.activeBaseLayoutId=layout.id;
const chosen=p.entities.find(e=>e.token==='g'&&e.team===1);assert.ok(chosen);layout.metadata['forge.districts.v1']=JSON.stringify([{id:'defense',name:'Forward gun',role:'defense',variation:'reposition',entityIds:[chosen.id]},{id:'fixed',name:'Services',locked:true,entityIds:p.entities.filter(e=>e.id!==chosen.id).map(e=>e.id)}]);synchronizeActiveBaseLayout(p);return {p,chosen};}
await test('District previews are deterministic, nonmutating and preserve fixed services and counts',async()=>{
const {p,chosen}=fixture(),before=structuredClone(p);const a=await previewDistrictArrangements(p,manifest,'same-seed',40,()=>{}),b=await previewDistrictArrangements(p,manifest,'same-seed',40,()=>{});
assert.equal(a.candidates.length,3);assert.deepEqual(a.candidates.map(p=>p.entities),b.candidates.map(p=>p.entities));assert.deepEqual(p,before);
for(const c of a.candidates){assert.equal(c.entities.length,p.entities.length);assert.deepEqual(c.entities.filter(e=>e.id!==chosen.id),p.entities.filter(e=>e.id!==chosen.id));assert.notDeepEqual(c.entities.find(e=>e.id===chosen.id).position,chosen.position);assert.deepEqual(c.terrain,p.terrain);}
});
await test('District search rejects missing permission and honors cancellation without edits',async()=>{
const {p}=fixture(),before=structuredClone(p);const controller=new AbortController();controller.abort();await assert.rejects(previewDistrictArrangements(p,manifest,'cancel',40,()=>{},controller.signal),/canceled/);assert.deepEqual(p,before);
p.baseLayouts[0].metadata['forge.districts.v1']='[]';await assert.rejects(previewDistrictArrangements(p,manifest,'none',40,()=>{}),/No eligible/);
});
await test('Arrangement search preserves saved relationships and explains infeasible spacing',async()=>{
  const {p}=fixture(),groups=JSON.parse(p.baseLayouts[0].metadata['forge.districts.v1']);
  const rule={id:'spacing',name:'Defense to services',from:'defense',to:'fixed',min:0,max:100000};
  const d=relationshipDistance(rule,groups,p.entities);assert.ok(Number.isFinite(d));
  const constrained=withDistrictRelationships(p,[{...rule,min:d-45,max:d+45}],manifest);
  const options=await previewDistrictArrangements(constrained,manifest,'relationships',40,()=>{});assert.equal(options.candidates.length,3);
  for(const c of options.candidates){const saved=readDistrictRelationships(c.baseLayouts[0].metadata[DISTRICT_RELATIONSHIPS_KEY])[0];const distance=relationshipDistance(saved,groups,c.entities);assert.ok(distance>=saved.min&&distance<=saved.max);}
  const strict=withDistrictRelationships(p,[{...rule,min:d,max:d}],manifest),before=structuredClone(strict);
  const rejected=await previewDistrictArrangements(strict,manifest,'relationships',40,()=>{});assert.equal(rejected.candidates.length,0);assert.equal(rejected.attempts,24);assert.ok(rejected.failures.some(f=>f.reason.includes('Defense to services')));assert.deepEqual(strict,before);
});
await test('Paired district shifts retain opposite XY positions and require an eligible partner',async()=>{
  const {p,chosen}=fixture();
  await assert.rejects(previewDistrictArrangements(p,manifest,'paired',40,()=>{},undefined,'paired-positions'),/matching opposite-team/);
  const partner=p.entities.find(e=>e.team===2&&e.token===chosen.token&&Math.abs(e.position[0]+chosen.position[0]-p.terrain.worldWidth)<.001&&Math.abs(e.position[1]+chosen.position[1]-p.terrain.worldHeight)<.001);assert.ok(partner);
  const groups=JSON.parse(p.baseLayouts[0].metadata['forge.districts.v1']);groups[1].entityIds=groups[1].entityIds.filter(id=>id!==partner.id);groups.push({...groups[0],id:'partner',name:'Partner gun',entityIds:[partner.id]});p.baseLayouts[0].metadata['forge.districts.v1']=JSON.stringify(groups);
  const original=structuredClone(p);const a=await previewDistrictArrangements(p,manifest,'paired',40,()=>{},undefined,'paired-positions');assert.equal(a.candidates.length,3);
  const b=await previewDistrictArrangements(p,manifest,'paired',40,()=>{},undefined,'paired-positions');assert.deepEqual(a.candidates.map(c=>c.entities),b.candidates.map(c=>c.entities));
  for(const c of a.candidates){const first=c.entities.find(e=>e.id===chosen.id),second=c.entities.find(e=>e.id===partner.id);assert.ok(Math.abs(first.position[0]+second.position[0]-p.terrain.worldWidth)<1e-8);assert.ok(Math.abs(first.position[1]+second.position[1]-p.terrain.worldHeight)<1e-8);assert.deepEqual(first.rotation,chosen.rotation);assert.equal(JSON.parse(c.metadata['districtArrangement.last']).teamPolicy,'paired-positions');assert.deepEqual(c.entities.filter(e=>![chosen.id,partner.id].includes(e.id)),p.entities.filter(e=>![chosen.id,partner.id].includes(e.id)));}
  assert.deepEqual(p,original);
  groups[2].locked=true;p.baseLayouts[0].metadata['forge.districts.v1']=JSON.stringify(groups);await assert.rejects(previewDistrictArrangements(p,manifest,'paired',40,()=>{},undefined,'paired-positions'),/matching opposite-team/);
});
