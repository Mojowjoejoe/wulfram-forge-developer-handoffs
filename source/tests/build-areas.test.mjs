import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createBlankProject,cloneProject,synchronizeActiveBaseLayout} from '../lib/wulfram.ts';
import {BUILD_AREAS_KEY,readBuildAreas,checkBuildAreas,assertBuildAreas,areaFitsMap,areaOutlinePaths,distanceToSegment} from '../lib/build-areas.ts';
import {withBuildAreas} from '../lib/editor-constraints.ts';
import {editEntities} from '../lib/mcp-commands.ts';
const manifest=JSON.parse(await fs.readFile('public/assets/manifest.json'));
const area={id:'court',name:'Court',kind:'clear',team:'all',x:1500,y:1500,width:300,height:300};
await test('Oriented radii strengthen reservations without shrinking normal clearances',()=>{
 const e={id:'tilted',token:'e',team:1,position:[1400,1600,10],rotation:[0,0,0],active:1};
 assert.deepEqual(checkBuildAreas([area],[e],5000,5000,manifest),[]);
 assert.equal(checkBuildAreas([area],[e],5000,5000,manifest,new Map([[e.id,150]])).length,1);
 const inside={...e,position:[1501,1600,10]};
 assert.equal(checkBuildAreas([area],[inside],5000,5000,manifest,new Map([[e.id,-100]])).length,1);
 assert.throws(()=>checkBuildAreas([area],[e],5000,5000,manifest,new Map([[e.id,NaN]])),/Invalid oriented/);
});
function fixture(){const p=createBlankProject();p.entities=[{id:'a',token:'e',team:1,position:[1000,1000,10],rotation:[0,0,0],active:1}];synchronizeActiveBaseLayout(p);return p;}
await test('Terrain regions protect interpolating heights across layouts without blocking buildings or distant edits',()=>{
  const base=fixture(),t=base.terrain,sx=t.worldWidth/(t.width-1),sy=t.worldHeight/(t.height-1);
  const rule={...area,kind:'terrain',x:10.25*sx,y:10.25*sy,width:sx/2,height:sy/2};
  const p=withBuildAreas(base,[rule],manifest);
  assert.deepEqual(readBuildAreas(JSON.stringify([rule])),[rule]);
  assert.deepEqual(checkBuildAreas([rule],[{...p.entities[0],position:[rule.x,rule.y,10]}],t.worldWidth,t.worldHeight,manifest),[]);
  for(const [x,y] of [[10,10],[11,10],[10,11],[11,11]]){
    const n=cloneProject(p);n.terrain.heights[y*t.width+x]+=1;
    assert.throws(()=>assertBuildAreas(p,n,manifest),/heights are protected/);
    n.baseLayouts[0].metadata[BUILD_AREAS_KEY]='[]';assert.throws(()=>assertBuildAreas(p,n,manifest,true),/heights are protected/);
  }
  const far=cloneProject(p);far.terrain.heights[0]+=1;assertBuildAreas(p,far,manifest);
  const inactive=cloneProject(p);inactive.baseLayouts.push({...structuredClone(inactive.baseLayouts[0]),id:'new',metadata:{},entities:[]});inactive.activeBaseLayoutId='new';inactive.entities=[];
  assertBuildAreas(p,inactive,manifest);const changed=cloneProject(inactive);changed.terrain.heights[10*t.width+10]+=1;assert.throws(()=>assertBuildAreas(inactive,changed,manifest),/heights are protected/);
  const resized=cloneProject(p);resized.terrain.worldWidth+=1;assert.throws(()=>assertBuildAreas(p,resized,manifest),/heights are protected/);
  const removed=withBuildAreas(p,[],manifest);removed.terrain.heights[10*t.width+10]+=1;assertBuildAreas(withBuildAreas(p,[],manifest),removed,manifest);
  assert.throws(()=>readBuildAreas(JSON.stringify([{...rule,team:'1'}])),/all teams/);
});
await test('Areas roundtrip and validate geometry, identity and team scope',()=>{
  assert.deepEqual(readBuildAreas(JSON.stringify([area])),[area]);
  for(const edit of [a=>a.width=0,a=>a.x=-1,a=>a.team='3',a=>a.kind='unknown',a=>a.name='',a=>a.height=null]){const a=structuredClone(area);edit(a);assert.throws(()=>readBuildAreas(JSON.stringify([a])),/Invalid/);}
  assert.throws(()=>readBuildAreas(JSON.stringify([area,area])),/Invalid/);
  assert.ok(checkBuildAreas([{...area,x:4000}],[],4096,4096,manifest)[0].includes('outside'));
});
await test('Containment uses building extents; clear zones and scoped boundaries reject occupied proposals',()=>{
  const p=fixture(),before=cloneProject(p);
  const boundary={...area,kind:'boundary',team:'1',x:500,y:500,width:1000,height:1000};
  assert.deepEqual(checkBuildAreas([boundary],p.entities,4096,4096,manifest),[]);
  assert.ok(checkBuildAreas([{...boundary,x:1000}],p.entities,4096,4096,manifest)[0].includes('outside'));
  assert.deepEqual(checkBuildAreas([{...boundary,team:'2',x:1000}],p.entities,4096,4096,manifest),[]);
  assert.throws(()=>withBuildAreas(p,[{...area,x:900,y:900}],manifest),/reserved space/);
  const applied=withBuildAreas(p,[area],manifest);assert.deepEqual(applied.entities,p.entities);assert.deepEqual(p,before);
  assert.throws(()=>editEntities(applied,[{operation:'move',id:'a',x:1600,y:1600}],manifest),/reserved space/);
  const removed=cloneProject(applied);removed.baseLayouts[0].metadata[BUILD_AREAS_KEY]='[]';assert.throws(()=>assertBuildAreas(applied,removed,manifest),/explicitly/);assertBuildAreas(applied,removed,manifest,true);
});
await test('Inactive layout constraints and generated replacement cannot be silently discarded',()=>{
  const p=withBuildAreas(fixture(),[area],manifest),next=cloneProject(p);
  next.baseLayouts.push({...structuredClone(next.baseLayouts[0]),id:'other',metadata:{},entities:[]});next.activeBaseLayoutId='other';next.entities=[];assertBuildAreas(p,next,manifest);
  next.baseLayouts[0].entities[0].position=[1600,1600,10];assert.throws(()=>assertBuildAreas(p,next,manifest),/reserved space/);
  assert.throws(()=>assertBuildAreas(p,createBlankProject('Replacement'),manifest),/explicitly/);
});
await test('Bent corridors protect segment widths, joints and rounded ends with matching preview geometry',()=>{
  const corridor={id:'link',name:'Link',kind:'corridor',team:'all',width:100,points:[[500,500],[1500,500],[1500,1500]]};
  assert.deepEqual(readBuildAreas(JSON.stringify([corridor])),[corridor]);assert.equal(areaFitsMap(corridor,4096,4096),true);
  const e=fixture().entities[0];
  for(const p of [[1000,500],[1500,500],[1500,1500],[460,500]])assert.ok(checkBuildAreas([corridor],[{...e,position:[...p,10]}],4096,4096,manifest)[0].includes('reserved'));
  assert.deepEqual(checkBuildAreas([corridor],[{...e,position:[800,900,10]}],4096,4096,manifest),[]);
  assert.deepEqual(checkBuildAreas([{...corridor,team:'2'}],[{...e,position:[1000,500,10]}],4096,4096,manifest),[]);
  const paths=areaOutlinePaths(corridor);assert.equal(paths.length,2);
  for(const [i,path] of paths.entries()){assert.deepEqual(path[0],path.at(-1));for(const p of path)assert.ok(Math.abs(distanceToSegment(...p,corridor.points[i],corridor.points[i+1])-50)<1e-8);}
  assert.equal(areaFitsMap({...corridor,points:[[10,500],[1500,500]]},4096,4096),false);
  for(const points of [[[1,1]],[[1,1],[1,1]],[[1,1],[2,NaN]],[[1,1],[2,3,4]]])assert.throws(()=>readBuildAreas(JSON.stringify([{...corridor,points}])));
});
