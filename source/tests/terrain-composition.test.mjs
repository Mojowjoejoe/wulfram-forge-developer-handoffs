import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readTerrainComposition,compositionStampPlacements,previewTerrainComposition} from '../lib/terrain-composition.ts';
import {applyProjectStamp} from '../lib/terrain-stamp-project.ts';
import {createBlankProject} from '../lib/wulfram.ts';
import {withBuildAreas} from '../lib/editor-constraints.ts';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json'));
const settings={preset:'ridge',radius:250,aspect:.8,rotation:0,amplitude:100,edgePower:2,mirror:false,shapeVersion:'natural-v2',seed:'composition'};
const recipe={version:1,name:'Ridge and channel',stamps:[{id:'ridge',offset:[-300,0],options:settings},{id:'channel',offset:[300,0],options:{...settings,preset:'valley',textureName:'11ice001',textureCoverage:1}}]};
const placement={x:2000,y:2000,rotation:90,safe:false};
void test('Ordered landforms rotate and match sequential stamp terrain without mutating the map',()=>{
 const source=createBlankProject('Composition',65),before=structuredClone(source),options=compositionStampPlacements(recipe,placement);
 assert.ok(Math.abs(options[0].options.x-2000)<1e-8);assert.equal(options[0].options.y,1700);assert.equal(options[1].options.y,2300);assert.equal(options[0].options.rotation,90);
 const preview=previewTerrainComposition(source,manifest,recipe,placement);
 let sequential=source;for(const s of options)sequential=applyProjectStamp(sequential,s.options,manifest,false);
 assert.deepEqual(preview.project.terrain,sequential.terrain);assert.ok(preview.changedVertices>0);assert.equal(preview.steps.length,2);assert.ok(preview.steps.every(s=>s.changedVertices>0));
 assert.deepEqual(source,before);assert.deepEqual(preview.project.entities,source.entities);assert.deepEqual(preview.project.baseLayouts,source.baseLayouts);
 assert.deepEqual(JSON.parse(preview.project.metadata['terrainComposition.last']).composition,recipe);
 assert.deepEqual(previewTerrainComposition(source,manifest,recipe,placement).project.terrain,preview.project.terrain);
});
void test('A rejected later landform leaves earlier work unapplied and respects protected heights',()=>{
 const source=withBuildAreas(createBlankProject('Protected',65),[{id:'protected',name:'Service site',kind:'terrain',team:'all',x:1850,y:2150,width:300,height:300}],manifest),before=structuredClone(source);
 assert.throws(()=>previewTerrainComposition(source,manifest,recipe,placement),/Landform channel:.*protected/);assert.deepEqual(source,before);
});
void test('Composition portability validates versions, identities, settings and placement',()=>{
 assert.deepEqual(readTerrainComposition(JSON.stringify(recipe)),recipe);
 for(const change of [r=>r.version=2,r=>r.stamps=[],r=>r.stamps[1].id='ridge',r=>r.stamps[0].offset=[null,0],r=>r.stamps[0].options.amplitude=-1]){const bad=structuredClone(recipe);change(bad);assert.throws(()=>readTerrainComposition(JSON.stringify(bad)));}
 assert.throws(()=>compositionStampPlacements(recipe,{...placement,rotation:NaN}));
 assert.throws(()=>previewTerrainComposition(createBlankProject(),manifest,recipe,{...placement,safe:true}),/protected|authored|balanced|metadata/i);
});
