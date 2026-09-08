import {createHash} from 'node:crypto';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createCreativeBaseLayout} from '../lib/builtin-base-layouts.ts';
import {createBlankProject} from '../lib/wulfram.ts';
import {readBuildAreas,checkBuildAreas,BUILD_AREAS_KEY} from '../lib/build-areas.ts';
import {assertEditorConstraints} from '../lib/editor-constraints.ts';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json'));
const options={size:'small',x:2800,y:4000,rotation:35,radius:2400,targetCount:9,checkAccess:true,terrainAware:true};
function blank(){const p=createBlankProject('Keep hand edits',129);p.terrain.worldWidth=12000;p.terrain.worldHeight=8000;return p;}
void test('Frontier pipeline retains roles, exact count, rotated reservations and source',()=>{
 const p=blank(),before=structuredClone(p),l=createCreativeBaseLayout(p,manifest,'frontier-camp','trial','contract',options);
 assert.equal(l.entities.filter(e=>e.team===1).length,9);assert.equal(l.metadata['formation.version'],'frontier-camp-v1');assert.equal(l.metadata['formation.snapPolicy'],'shared-footprint-v2');assert.equal(JSON.parse(l.metadata['formation.requiredCounts']).r,1);
 const areas=readBuildAreas(l.metadata[BUILD_AREAS_KEY]);assert.equal(areas.length,2);assert.deepEqual(checkBuildAreas(areas,l.entities,12000,8000,manifest),[]);
 assert.deepEqual(createCreativeBaseLayout(p,manifest,'frontier-camp','trial','contract',options).entities,l.entities);assert.deepEqual(p,before);
 const applied={...p,baseLayouts:[...p.baseLayouts,l],activeBaseLayoutId:l.id,entities:l.entities};const changed=structuredClone(applied),a=areas[0];changed.entities[0].position[0]=(a.points[0][0]+a.points[1][0])/2;changed.entities[0].position[1]=(a.points[0][1]+a.points[1][1])/2;assert.throws(()=>assertEditorConstraints(applied,changed,manifest),/reserved space/);
});
void test('Frontier rejects infeasible budgets, reservation radius and asymmetric support without edits',()=>{
 const p=blank(),before=structuredClone(p);
 assert.throws(()=>createCreativeBaseLayout(p,manifest,'frontier-camp','bad','small',{...options,targetCount:6}),/needs at least/);
 assert.throws(()=>createCreativeBaseLayout(p,manifest,'frontier-camp','bad','radius',{...options,radius:550,targetCount:0}),/yellow area/);
 assert.deepEqual(p,before);p.terrain.heights=p.terrain.heights.map((_,i)=>i%129*2);const asymmetric=structuredClone(p);
 assert.throws(()=>createCreativeBaseLayout(p,manifest,'frontier-camp','bad','asymmetric',{...options,terrainAware:false}),/matching paired terrain support/);assert.deepEqual(p,asymmetric);
});

void test('Frontier v1 fixed golden placements and rotated expansion strips stay stable',()=>{
 const fixture=JSON.parse(fs.readFileSync('tests/fixtures/frontier-camp-v1.json','utf8'));
 for(const c of fixture.cases){const l=createCreativeBaseLayout(blank(),manifest,'frontier-camp',`golden-${c.size}`,fixture.seed,{size:c.size,x:2800,y:4000,rotation:35,radius:2400,checkAccess:true,terrainAware:false,targetCount:0});
 assert.equal(l.metadata['formation.version'],c.version);assert.equal(createHash('sha256').update(JSON.stringify(l.entities)).digest('hex'),c.entitiesHash);assert.deepEqual(JSON.parse(l.metadata[BUILD_AREAS_KEY]),c.areas);}
});
