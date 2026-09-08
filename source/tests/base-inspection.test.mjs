import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {inspectPower,baseCameraPose} from '../lib/base-inspection.ts';
import {createBlankProject,modelNameFor} from '../lib/wulfram.ts';
const e=(id,token,x,team=1)=>({id,token,team,position:[x,500,0],rotation:[0,0,0],active:1});
void test('Inspection matches the power margin, excludes enemy cells, and sorts all qualifying sources',()=>{
  const pad=e('pad','r',500),entities=[pad,e('edge','e',770),e('near','e',520),e('outside','e',771),e('enemy','e',501,2)];
  const before=structuredClone(entities),result=inspectPower(pad,entities,280);
  assert.equal(result.status,'powered');assert.deepEqual(result.sources.map(s=>s.cell.id),['near','edge']);assert.equal(result.limit,270);assert.deepEqual(entities,before);
  const unpowered=inspectPower(pad,[pad,entities[3],entities[4]],280);assert.equal(unpowered.status,'unpowered');assert.equal(unpowered.nearest.distance,271);assert.deepEqual(unpowered.sources,[]);
  assert.equal(inspectPower(pad,[pad],280).nearest,undefined);
  assert.equal(inspectPower(entities[1],entities,280).status,'independent');
});
void test('Focus frames the requested team and gives usable empty, narrow, and hillside views',()=>{
  const terrain=createBlankProject('Camera',65).terrain;terrain.heights.fill(300);
  const entities=[e('a','r',500),e('b','e',700),e('other','r',4500,2)];
  const overhead=baseCameraPose(terrain,entities,1,'overhead');assert.equal(overhead.target[0],600);assert.ok(overhead.eye[2]>overhead.target[2]);
  assert.ok(baseCameraPose(terrain,entities,1,'overhead',.5).eye[2]>overhead.eye[2]);
  const ground=baseCameraPose(terrain,entities,2,'ground');assert.equal(ground.target[0],4500);assert.ok(ground.eye[2]>=370);assert.ok(ground.eye[0]<4500);
  assert.equal(baseCameraPose(terrain,entities,0,'overhead'),undefined);
});

void test('Close inspection fits model bounds, handles portrait view and stays above hillside terrain without changing entities',()=>{
 const terrain=createBlankProject('Detail',65).terrain;terrain.heights.fill(300);
 const entity=e('pad','r',500),before=structuredClone(entity);
 const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json'));
 const model=modelNameFor(entity);assert.ok(manifest.models[model]?.bounds);
 const pose=baseCameraPose(terrain,[entity],1,'detail',1,manifest);
 assert.deepEqual(pose.target,entity.position);assert.ok(pose.eye[2]>=330);
 const portrait=baseCameraPose(terrain,[entity],1,'detail',.5,manifest);
 assert.ok(portrait.eye[0]-500>pose.eye[0]-500);
 const larger=structuredClone(manifest);larger.models[model].bounds.min=larger.models[model].bounds.min.map(v=>v*4);larger.models[model].bounds.max=larger.models[model].bounds.max.map(v=>v*4);
 assert.ok(baseCameraPose(terrain,[entity],1,'detail',1,larger).eye[0]>pose.eye[0]);
 assert.deepEqual(entity,before);
 assert.equal(baseCameraPose(terrain,[],1,'detail',1,manifest),undefined);
});
