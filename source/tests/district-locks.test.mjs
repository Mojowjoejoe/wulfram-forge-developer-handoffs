import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createBlankProject,cloneProject,synchronizeActiveBaseLayout} from '../lib/wulfram.ts';
import {assertDistrictLocks} from '../lib/district-locks.ts';
import {DISTRICTS_KEY,readDistricts} from '../lib/base-districts.ts';
import {editEntities,editTerrain} from '../lib/mcp-commands.ts';
const manifest=JSON.parse(await fs.readFile('public/assets/manifest.json'));
function fixture(){const p=createBlankProject('Locked');p.entities=[{id:'a',token:'e',team:1,position:[1000,1000,10],rotation:[0,0,0],active:1}];synchronizeActiveBaseLayout(p);p.baseLayouts[0].metadata[DISTRICTS_KEY]=JSON.stringify([{id:'yard',name:'Yard',entityIds:['a'],locked:true}]);return p;}
await test('Locks reject edits, deletion, metadata bypass and layout replacement atomically',()=>{
  const p=fixture(),before=cloneProject(p);
  for(const edit of [n=>n.entities[0].position[0]++,n=>n.entities[0].team=2,n=>n.entities=[],n=>n.baseLayouts=[],n=>n.baseLayouts[0].metadata[DISTRICTS_KEY]='[]',n=>n.terrain.worldWidth++]){
    const n=cloneProject(p);edit(n);assert.throws(()=>assertDistrictLocks(p,n,manifest),/locked|Unlock/);
  }
  assert.throws(()=>editEntities(p,[{operation:'move',id:'a',x:1200,y:1000}],manifest),/locked/);
  assert.deepEqual(p,before);
});
await test('Supporting heights stay fixed; distant terrain, textures, copies and explicit unlock remain possible',()=>{
  const p=fixture(),near=cloneProject(p);const x=Math.round(1000/(p.terrain.worldWidth/(p.terrain.width-1))),y=Math.round(1000/(p.terrain.worldHeight/(p.terrain.height-1)));near.terrain.heights[y*p.terrain.width+x]++;
  assert.throws(()=>assertDistrictLocks(p,near,manifest),/locked/);
  const far=cloneProject(p);far.terrain.heights[0]++;assertDistrictLocks(p,far,manifest);
  const copy=cloneProject(p);copy.entities.push({...structuredClone(p.entities[0]),id:'copy'});assertDistrictLocks(p,copy,manifest);
  const unlocked=cloneProject(p);const groups=readDistricts(unlocked.baseLayouts[0].metadata[DISTRICTS_KEY]);groups[0].locked=false;unlocked.baseLayouts[0].metadata[DISTRICTS_KEY]=JSON.stringify(groups);
  assert.throws(()=>assertDistrictLocks(p,unlocked,manifest),/locked/);assertDistrictLocks(p,unlocked,manifest,true);
  unlocked.entities[0].position[0]++;assert.throws(()=>assertDistrictLocks(p,unlocked,manifest,true),/locked/);
  assert.throws(()=>readDistricts(JSON.stringify([{...groups[0],locked:'yes'}])),/Invalid/);
});
await test('Inactive locked layouts retain their protected buildings when switching layouts',()=>{
  const p=fixture(),n=cloneProject(p);n.baseLayouts.push({ ...structuredClone(n.baseLayouts[0]),id:'other',metadata:{},entities:[]});n.activeBaseLayoutId='other';n.entities=[];assertDistrictLocks(p,n,manifest);
  n.baseLayouts[0].entities[0].position[1]++;assert.throws(()=>assertDistrictLocks(p,n,manifest),/locked/);
});
await test('Distant MCP sculpting preserves locked heights instead of refitting every building',()=>{
  const p=fixture();
  const result=editTerrain(p,{operation:'raise',x:2000,y:2000,radius:100,value:1},manifest);
  assert.deepEqual(result.project.entities[0],p.entities[0]);
  assert.notDeepEqual(result.project.terrain.heights,p.terrain.heights);
  assert.throws(()=>editTerrain(p,{operation:'raise',x:1000,y:1000,radius:100,value:1},manifest),/locked/);
});
