import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { generateBalancedProject } from '../lib/balanced-map-generator.ts';
import { instantiateBaseTemplate, structureTerrainClearance } from '../lib/wulfram.ts';
import { instantiatePairedTemplate } from '../lib/paired-template.ts';
import { analyzeRotationalEntityPairs } from '../lib/balanced-map-analysis.ts';
const manifest = JSON.parse(fs.readFileSync(new URL('../public/assets/manifest.json', import.meta.url)));
const source = JSON.parse(fs.readFileSync(new URL('../public/assets/base-templates.json', import.meta.url))).templates.find(t => t.id === 'kairo-team-2-base-1');

void test('generated flak pairs preserve bottom clearance across different team model origins', () => {
  const template = { ...source, units: source.units.filter(u => u.token === 's').slice(0, 1).map(u => ({ ...u, offset: [0, 0] })) };
  const before = JSON.stringify(template);
  const g = generateBalancedProject({ seed: 'clearance-proof', topology: 'open-field', relief: 1, size: 33 }, template, manifest);
  g.project.terrain.heights.fill(0);
  const pairs = fn => [1, 2].flatMap((team, index) => fn(template, g.project.terrain, g.baseAnchors[index], team, 1, index * Math.PI, manifest).entities);
  const old = pairs(instantiateBaseTemplate);
  assert.equal(analyzeRotationalEntityPairs({ ...g.project, entities: old }, manifest).passed, false, 'Reproduces legacy source offset bug on flat ground');
  const corrected = pairs(instantiatePairedTemplate);
  assert.equal(analyzeRotationalEntityPairs({ ...g.project, entities: corrected }, manifest).passed, true);
  const bottoms = corrected.map(e => e.position[2] - structureTerrainClearance(e, manifest, 0, 0).modelBottom);
  assert.ok(Math.abs(bottoms[0] - bottoms[1]) < 1e-8);
  assert.equal(corrected[1].position[2], old[1].position[2], 'Preserve original source-team clearance');
  assert.equal(JSON.stringify(template), before);
  corrected[1].position[2] += 2;
  assert.equal(analyzeRotationalEntityPairs({ ...g.project, entities: corrected }, manifest).passed, false, 'Real mismatch still rejected');
});

void test('Opt-in shared footprint fixes symmetric valley pairs without copying asymmetric heights',async()=>{
 const {frontierCampTemplate}=await import('../lib/frontier-camp.ts');
 const {placeFormation}=await import('../lib/builtin-base-layouts.ts');
 const {createBlankProject}=await import('../lib/wulfram.ts');
 const p=createBlankProject('Shared footprint regression',129);p.terrain.worldWidth=12000;p.terrain.worldHeight=8000;
 p.terrain.heights=p.terrain.heights.map((_,i)=>Math.abs(Math.floor(i/129)-64)*8);
 const template=frontierCampTemplate('frontier-review-0','small',manifest),before=structuredClone(p),sourceBefore=structuredClone(template),placement={size:'small',x:2800,y:4000,rotation:0,radius:2400};
 const old=placeFormation(p,manifest,template,'test','test',{},placement);
 assert.equal(analyzeRotationalEntityPairs({...p,entities:old.entities},manifest).passed,false,'Reproduce different footprint sampling on symmetric valley');
 const corrected=placeFormation(p,manifest,template,'test','test',{},placement,'shared-footprint-v2');
 assert.equal(corrected.metadata['formation.snapPolicy'],'shared-footprint-v2');assert.equal(old.metadata['formation.snapPolicy'],undefined);
 assert.equal(analyzeRotationalEntityPairs({...p,entities:corrected.entities},manifest).passed,true);
 assert.deepEqual(placeFormation(p,manifest,template,'test','test',{},placement).entities,old.entities,'Legacy behavior remains the default');
 assert.deepEqual(p,before);assert.deepEqual(template,sourceBefore);
 p.terrain.heights.fill(0);
 assert.deepEqual(placeFormation(p,manifest,template,'test','test',{},placement,'shared-footprint-v2').entities,placeFormation(p,manifest,template,'test','test',{},placement).entities,'Flat placements unchanged');
 p.terrain.heights=p.terrain.heights.map((_,i)=>(i%129)/128*50);
 const asymmetric=placeFormation(p,manifest,template,'test','test',{},placement,'shared-footprint-v2');
 assert.equal(analyzeRotationalEntityPairs({...p,entities:asymmetric.entities},manifest).passed,false,'Do not force equal heights across asymmetric terrain');
});
