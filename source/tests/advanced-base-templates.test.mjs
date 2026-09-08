import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {ADVANCED_BASE_PRESETS} from '../lib/advanced-base-templates.ts';
import {instantiatePairedTemplate} from '../lib/paired-template.ts';
import {synchronizeActiveBaseLayout,validateProject,structureTerrainClearance} from '../lib/wulfram.ts';
import {analyzeRotationalEntityPairs} from '../lib/balanced-map-analysis.ts';

const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json'));
function blank(){return {format:'wulfram-map-project',version:1,name:'Advanced base validation',terrain:{width:129,height:129,worldWidth:6400,worldHeight:6400,heights:Array(129*129).fill(0),textureIds:Array(129*129).fill(0),tagmap:['gbdirt001'],tagmap2:['gbdirt001']},entities:[],validation:{serviceRadius:300,backupRadius:80,maxSlopeDegrees:22,minSpacing:8},baseLayouts:[],activeBaseLayoutId:'default',updatedAt:'2026-09-06T00:00:00.000Z'};}
for(const preset of ADVANCED_BASE_PRESETS)void test(`${preset.template.name}: power, actual model spacing, rotation and paired state`,()=>{
  const t=preset.template;
  assert.equal(t.unitCount,t.units.length);assert.ok(preset.recommendedDiameter<=2000);
  for(const yaw of [0,Math.PI/4,Math.PI/2,Math.PI]){
    const p=blank();
    for(const team of [1,2]){
      let n=0;const r=instantiatePairedTemplate(t,p.terrain,team===1?[1600,3200]:[4800,3200],team,1,yaw+(team===2?Math.PI:0),manifest,undefined,()=>`${team}-${n++}`);
      assert.equal(r.skippedWithoutModel,0);assert.equal(r.scale,1);p.entities.push(...r.entities);
    }
    synchronizeActiveBaseLayout(p);
    assert.deepEqual(validateProject(p).filter(i=>i.severity==='error'),[]);
    assert.ok(analyzeRotationalEntityPairs(p,manifest).passed);
    for(const team of [1,2]){
      const entities=p.entities.filter(e=>e.team===team);
      const radius=e=>structureTerrainClearance(e,manifest,0,0).footprint/Math.SQRT2;
      for(let i=0;i<entities.length;i++)for(let j=i+1;j<entities.length;j++)assert.ok(Math.hypot(entities[i].position[0]-entities[j].position[0],entities[i].position[1]-entities[j].position[1])-radius(entities[i])-radius(entities[j])>=8,'Actual model footprints must not overlap.');
      const cells=entities.filter(e=>e.token==='e');
      for(const e of entities.filter(e=>['g','s','L','r','f'].includes(e.token)))assert.ok(cells.filter(c=>Math.hypot(c.position[0]-e.position[0],c.position[1]-e.position[1])<=290).length>=2,`${e.token} needs both primary and backup coverage.`);
    }
  }
});
for(const preset of ADVANCED_BASE_PRESETS)void test(`${preset.template.name}: departure corridors remain clear at 1x`,()=>{
  const p=blank(),r=instantiatePairedTemplate(preset.template,p.terrain,[1600,3200],1,1,0,manifest);
  for(const route of preset.routes)for(let i=1;i<route.length;i++){
    const a=route[i-1],b=route[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    for(let d=0;d<=length;d+=10){const x=1600+a[0]+(b[0]-a[0])*d/length,y=3200+a[1]+(b[1]-a[1])*d/length;
      for(const e of r.entities)assert.ok(Math.hypot(x-e.position[0],y-e.position[1])-structureTerrainClearance(e,manifest,0,0).footprint/Math.SQRT2>=60,`${preset.template.name}: 120u corridor blocked by ${e.token}`);
    }
  }
});
