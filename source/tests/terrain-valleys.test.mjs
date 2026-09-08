import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateTerrainDetail,previewTerrainDetail,readTerrainDetailOptions,DEFAULT_TERRAIN_DETAIL} from '../lib/terrain-detail-generator.ts';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json'));
const source=JSON.parse(fs.readFileSync('outputs/canyon-citadel-ice-v2/project.json'));
void test('Ice valleys and mixed forms are paired, protected, reproducible and non-mutating',()=>{
  const before=JSON.stringify(source);
  for(const mode of ['valleys','mixed']) {
    const options={...DEFAULT_TERRAIN_DETAIL,mode,depth:40,height:40,textureName:'11ice001'};
    const result=generateTerrainDetail(source,options,manifest);
    assert.equal(result.passed,true);assert.ok(result.protectedPath.length>0);
    assert.ok(result.project.terrain.heights.some((h,i)=>h<source.terrain.heights[i]));
    if(mode==='valleys')assert.ok(result.project.terrain.heights.every((h,i)=>h<=source.terrain.heights[i]));
    else assert.ok(result.project.terrain.heights.some((h,i)=>h>source.terrain.heights[i]));
    assert.deepEqual(result.project.entities,source.entities);
    const loaded=JSON.parse(JSON.stringify(result.project));
    assert.equal(readTerrainDetailOptions(loaded).mode,mode);
    assert.deepEqual(previewTerrainDetail(loaded,options,manifest).project.terrain,result.project.terrain);
    for(let i=0;i<source.terrain.heights.length;i++) {
      const x=i%257*25,y=Math.floor(i/257)*25;
      if(Math.hypot(x-3200,y-3200)<1100)assert.equal(result.project.terrain.heights[i],source.terrain.heights[i]);
    }
  }
  assert.equal(JSON.stringify(source),before);
});
void test('Invalid valley inputs reject and existing hill identity remains compatible',()=>{
  for(const extra of [{mode:'oops'},{mode:'valleys',depth:NaN},{depth:2001},{minDepth:50,depth:40}])assert.throws(()=>generateTerrainDetail(source,{...DEFAULT_TERRAIN_DETAIL,...extra},manifest));
  const old=generateTerrainDetail(source,DEFAULT_TERRAIN_DETAIL,manifest);
  assert.deepEqual(readTerrainDetailOptions(old.project),DEFAULT_TERRAIN_DETAIL);
  assert.deepEqual(old.project.terrain,generateTerrainDetail(source,{...DEFAULT_TERRAIN_DETAIL,mode:'hills'},manifest).project.terrain);
});
