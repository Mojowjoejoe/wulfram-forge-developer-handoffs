import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createBlankProject,structureTerrainClearance} from '../lib/wulfram.ts';
import {routeLength,routePoint,routeCameraPose,routeClearance} from '../lib/route-inspection.ts';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json'));
const entity=(id,token,x,y)=>({id,token,team:1,position:[x,y,0],rotation:[0,0,0],active:1});
void test('Scrubbing follows arc length and remains finite at corners and repeated endpoints',()=>{
  const route=[[0,0],[100,0],[100,300],[100,300]];assert.equal(routeLength(route),400);assert.deepEqual(routePoint(route,.5),[100,100]);assert.deepEqual(routePoint(route,2),[100,300]);assert.deepEqual(routePoint(route,-1),[0,0]);
  const p=createBlankProject();for(const progress of [0,.25,.5,1]){const pose=routeCameraPose(p,route,progress);assert.ok([...pose.eye,...pose.target].every(Number.isFinite));assert.equal(pose.eye[2],70);}
});
void test('Continuous segment clearance changes with width and exempts only a destination service pad',()=>{
  const p=createBlankProject('Clearance',65);p.terrain.heights.fill(0);const gun=entity('gun','g',505,500);
  const radius=structureTerrainClearance(gun,manifest,0,0).footprint/Math.SQRT2;gun.position[1]+=radius+50;
  p.entities=[gun,entity('pad','r',900,500)];const before=structuredClone(p),route=[[100,500],[900,500]];
  assert.equal(routeClearance(p,manifest,route,20).length,0);assert.equal(routeClearance(p,manifest,route,80)[0].severity,'tight');assert.equal(routeClearance(p,manifest,route,120)[0].severity,'blocked');assert.ok(Math.abs(routeClearance(p,manifest,route,120)[0].x-505)<1e-6);
  p.entities.push(entity('other-pad','r',600,500));assert.ok(routeClearance(p,manifest,route,80).some(m=>m.message.includes('Repair Pad')));
  p.entities.pop();assert.deepEqual(p,before);assert.throws(()=>routeClearance(p,manifest,route,NaN));
});
void test('Width samples flag terrain slopes and map boundaries including the final endpoint',()=>{
  const p=createBlankProject('Edge',65);p.terrain.heights.fill(0);p.terrain.worldWidth=1000;p.terrain.worldHeight=1000;
  assert.ok(routeClearance(p,manifest,[[200,50],[800,50]],120).some(m=>m.message.includes('edge')));
  p.terrain.heights=p.terrain.heights.map((_,i)=>i%65*100);
  assert.ok(routeClearance(p,manifest,[[200,500],[800,500]],80).some(m=>m.message.includes('Steep')));
});
