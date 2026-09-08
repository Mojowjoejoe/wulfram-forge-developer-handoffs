import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createBlankProject,validateProject} from '../lib/wulfram.ts';
import {createCreativeBaseLayout} from '../lib/builtin-base-layouts.ts';
import {createFormationOptions} from '../lib/formation-options.ts';
import {entranceDistance,ENTRANCE_HALF_WIDTH} from '../lib/formation-terrain.ts';
import {CREATIVE_BASE_LAYOUTS} from '../lib/creative-base-layouts.ts';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json'));
const blank=()=>{const p=createBlankProject('Terrain sprint',129);p.terrain.worldWidth=12000;p.terrain.worldHeight=8000;p.terrain.heights.fill(0);return p;};
const placement={size:'small',x:2800,y:4000,rotation:0,radius:2300,terrainAware:true,checkAccess:true};
for(const terrain of ['flat','valley','hills'])for(const size of ['small','standard','massive'])void test(`${terrain} ${size}: three checked terrain-aware choices and reserved entrance`,()=>{
  const p=blank();p.terrain.heights=p.terrain.heights.map((_,i)=>terrain==='flat'?0:terrain==='valley'?Math.abs(Math.floor(i/129)-64)*12:180*Math.sin(i%129/10)*Math.cos(Math.floor(i/129)/10));
  const before=structuredClone(p),options={...placement,size,entranceDegrees:0};
  const choices=createFormationOptions(p,manifest,'anvil','trial','terrain-sprint',options);
  assert.equal(choices.length,3);assert.ok(choices.every(c=>c.layout),choices.map(c=>c.error).join('\n'));
  assert.equal(new Set(choices.map(c=>JSON.stringify(c.layout.entities.map(e=>e.position)))).size,3);
  for(const {layout} of choices){assert.equal(validateProject({...p,entities:layout.entities,validation:layout.validation}).filter(i=>i.severity==='error').length,0);assert.ok(JSON.parse(layout.metadata['formation.access']).passed);for(const e of layout.entities.filter(e=>e.team===1))assert.ok(entranceDistance(e.position[0]-placement.x,e.position[1]-placement.y,0,placement.radius)>ENTRANCE_HALF_WIDTH);}
  assert.deepEqual(p,before);
});
void test('Adaptation escapes a steep mound while preserving counts and paired symmetry',()=>{
  const p=blank();p.terrain.heights=p.terrain.heights.map((_,i)=>{const x=i%129/128*12000,y=Math.floor(i/129)/128*8000;return 900*Math.exp(-((x-2800)**2+(y-4000)**2)/180**2)+900*Math.exp(-((x-9200)**2+(y-4000)**2)/180**2);});
  assert.throws(()=>createCreativeBaseLayout(p,manifest,'starter','fixed','mound',{...placement,terrainAware:false}));
  const before=structuredClone(p),layout=createCreativeBaseLayout(p,manifest,'starter','adapt','mound',placement);
  assert.ok(JSON.parse(layout.metadata['formation.adaptation']).some(s=>Math.hypot(s.dx,s.dy)>0));
  const a=layout.entities.filter(e=>e.team===1),b=layout.entities.filter(e=>e.team===2);assert.equal(a.length,b.length);
  a.forEach((e,i)=>{assert.ok(Math.abs(e.position[0]+b[i].position[0]-12000)<1e-6);assert.ok(Math.abs(e.position[1]+b[i].position[1]-8000)<1e-6);});assert.deepEqual(p,before);
});
void test('Blocked entrance cannot become an applicable option; invalid direction rejects',()=>{
  const p=blank();const options={...placement,entranceDegrees:180,radius:3500};const before=structuredClone(p);
  const choices=createFormationOptions(p,manifest,'starter','blocked','edge',options);
  assert.ok(choices.every(c=>!c.layout&&c.error&&c.overlay?.blocked.length));assert.deepEqual(p,before);
  assert.throws(()=>createCreativeBaseLayout(p,manifest,'starter','bad','bad',{...placement,entranceDegrees:NaN}),/finite/);
});
for(const style of CREATIVE_BASE_LAYOUTS)void test(`${style.name}: terrain adaptation retains exact budget and seeded geometry`,()=>{
  const p=blank(),options={...placement,size:'small',rotation:35,entranceDegrees:90,targetCount:24};
  const a=createCreativeBaseLayout(p,manifest,style.id,'one','all-styles',options),b=createCreativeBaseLayout(p,manifest,style.id,'two','all-styles',options);
  assert.equal(a.entities.length,48);assert.deepEqual(a.entities.map(e=>e.position),b.entities.map(e=>e.position));
});
