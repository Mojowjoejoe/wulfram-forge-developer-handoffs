import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {basePlanBounds} from '../lib/base-plan-bounds.ts';
import {buildBaseLibrary} from '../lib/base-library.ts';
import {MODEL_WORLD_SCALE,modelNameFor} from '../lib/wulfram.ts';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json','utf8'));
void test('Plan envelope includes off-center model boxes, rotation and full corridor endpoints',()=>{
 const name=modelNameFor({token:'e',team:1}),other=modelNameFor({token:'e',team:2}),m=structuredClone(manifest);
 m.models[name].bounds={min:[0,0,0],max:[100,40,10]};m.models[other].bounds={min:[-20,-10,0],max:[150,40,10]};
 const template={units:[{token:'e',offset:[300,200],rotation:[0,0,Math.PI/2]}]};
 const bounds=basePlanBounds(template,m,[[-1000,0],[0,0]]);
 assert.equal(bounds.minX,-1100);assert.ok(bounds.maxX>=300+40*MODEL_WORLD_SCALE-1e-6);assert.ok(bounds.maxY>=200+150*MODEL_WORLD_SCALE-1e-6);assert.equal(bounds.minY,-100);
 assert.throws(()=>basePlanBounds({units:[]},m),/Empty/);
});
void test('Every Offset card reports a rounded-up model-and-corridor envelope without changing recipes',()=>{
 for(const size of ['small','standard','large','massive'])for(const e of buildBaseLibrary([],[],manifest,size).filter(e=>e.id==='offset-bastion')){
  assert.ok(e.planBounds.width>0&&e.planBounds.height>0);
  for(const [x,y] of e.approach){assert.ok(x-100>=e.planBounds.minX-1e-8&&x+100<=e.planBounds.maxX+1e-8);assert.ok(y-100>=e.planBounds.minY-1e-8&&y+100<=e.planBounds.maxY+1e-8);}
  const before=JSON.stringify(e.template);assert.deepEqual(basePlanBounds(e.template,manifest,e.approach),e.planBounds);assert.equal(JSON.stringify(e.template),before);
 }
});
