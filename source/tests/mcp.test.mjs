import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {editEntities,editTerrain,editTerrainProtection,editLandform,editLane} from '../lib/mcp-commands.ts';
import {BUILD_AREAS_KEY} from '../lib/build-areas.ts';
import {instantiatePairedTemplate} from '../lib/paired-template.ts';
import {synchronizeActiveBaseLayout} from '../lib/wulfram.ts';
import {Client} from '../tools/mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import {StdioClientTransport} from '../tools/mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';
const manifest=JSON.parse(fs.readFileSync(new URL('../public/assets/manifest.json',import.meta.url)));
function fixture(){
  const p={format:'wulfram-map-project',version:1,name:'MCP test',terrain:{width:33,height:17,worldWidth:3200,worldHeight:1600,heights:Array(561).fill(0),textureIds:Array(561).fill(0),tagmap:['gbdirt001'],tagmap2:['gbdirt001']},entities:[],validation:{serviceRadius:300,backupRadius:80,maxSlopeDegrees:22,minSpacing:8},baseLayouts:[],activeBaseLayoutId:'default',updatedAt:'2026-09-06T00:00:00.000Z'};
  const units=[['e',0,0],['e',40,0],['r',0,-150],['f',0,150],['u',-150,0],['L',180,0]].map(([token,x,y])=>({token,offset:[x,y],groundOffset:0,rotation:[0,0,0],active:1}));
  const t={id:'test',name:'test',sourceTeam:1,sourceMap:'test',sourceState:'test',sourceAnchor:[0,0],sourceWorldSize:[3200,1600],unitCount:6,footprint:{width:500,height:500},units};
  for(const team of [1,2])p.entities.push(...instantiatePairedTemplate(t,p.terrain,team===1?[500,800]:[2700,800],team,1,team===1?0:Math.PI,manifest,undefined,prefix=>`${team}-${prefix}`).entities);
  return synchronizeActiveBaseLayout(p);
}
test('mirrored move preserves source, models and active layout',()=>{
  const p=fixture(),before=JSON.stringify(p),e=p.entities.find(e=>e.token==='L'&&e.team===1);
  const r=editEntities(p,[{operation:'move',id:e.id,x:700,mirror:true}],manifest);
  assert.equal(JSON.stringify(p),before);assert.equal(r.affectedIds.length,2);
  assert.deepEqual(r.project.entities.filter(e=>e.token==='L').map(e=>e.position[0]),[700,2500]);
  assert.deepEqual(r.project.baseLayouts[0].entities, r.project.entities);
});
test('invalid second edit rolls back entire batch; power failures reject',()=>{
  const p=fixture(),before=JSON.stringify(p),e=p.entities.find(e=>e.token==='L');
  assert.throws(()=>editEntities(p,[{operation:'move',id:e.id,x:700},{operation:'move',id:'missing',x:4}],manifest),/exactly once/);
  assert.throws(()=>editEntities(p,[{operation:'move',id:e.id,x:1700}],manifest),/validation/);
  assert.throws(()=>editEntities(p,[{operation:'move',id:e.id,x:NaN}],manifest),/finite/);
  assert.equal(JSON.stringify(p),before);
});
test('ambiguous mirrors and duplicate batch targets reject',()=>{
  const p=fixture(),e=p.entities.find(e=>e.token==='L'&&e.team===1),o=p.entities.find(e=>e.token==='L'&&e.team===2);
  assert.throws(()=>editEntities(p,[{operation:'move',id:e.id,mirror:true},{operation:'remove',id:o.id}],manifest),/once/);
  p.entities.push({...o,id:'duplicate'});assert.throws(()=>editEntities(p,[{operation:'move',id:e.id,mirror:true}],manifest),/ambiguous/);
});
test('mirrored add/remove handles both teams',()=>{
  const p=fixture();const r=editEntities(p,[{operation:'add',token:'g',team:1,x:500,y:1030,mirror:true}],manifest);
  assert.equal(r.project.entities.length,p.entities.length+2);
  const removed=editEntities(r.project,[{operation:'remove',id:r.affectedIds[0],mirror:true}],manifest);
  assert.equal(removed.project.entities.length,p.entities.length);
  assert.throws(()=>editEntities(p,[{operation:'add',token:'E',team:1,x:500,y:1030}],manifest),/Unsupported/);
});
test('terrain edits are bounded, mirrored and source-independent',()=>{
  const p=fixture(),before=p.terrain.heights.slice();const r=editTerrain(p,{operation:'raise',x:1600,y:300,radius:250,value:15,mirror:true},manifest);
  assert.deepEqual(p.terrain.heights,before);assert.ok(r.vertices>0);
  for(let i=0;i<before.length;i++)assert.ok(Math.abs(r.project.terrain.heights[i]-r.project.terrain.heights[before.length-1-i])<1e-9);
  assert.throws(()=>editTerrain(p,{operation:'raise',x:100,y:100,radius:0,value:2},manifest),/radius/);
  assert.throws(()=>editTerrain(p,{operation:'texture',x:100,y:100,radius:100,texture:'not-real'},manifest),/texture/);
});
test('real MCP stdio initialization, tool schemas and bad-session errors',async()=>{
  const transport=new StdioClientTransport({command:process.execPath,args:['--experimental-strip-types',fileURLToPath(new URL('../tools/mcp/server.mjs',import.meta.url))],stderr:'pipe'});
  const client=new Client({name:'forge-test',version:'1'});try{
    await client.connect(transport);const {tools}=await client.listTools();assert.equal(tools.length,24);
    for(const name of ['capture_formation_favorite','place_formation_favorite','edit_entities','edit_terrain','edit_terrain_protection','apply_landform','apply_lane','generate_base_layout','set_entrance_routing','undo','export_map'])assert.ok(tools.find(t=>t.name===name).inputSchema.required.includes('expectedRevision'));
    const bad=await client.callTool({name:'get_editor_state',arguments:{sessionId:'0'.repeat(32)}});assert.equal(bad.isError,true);
  }finally{await client.close();}
});

test('MCP lane uses shared terrain operation and leaves structures unchanged',()=>{
 const p=JSON.parse(JSON.stringify(fixture())),before=structuredClone(p);
 const lane={points:[[1300,700],[1900,700]],width:200,shoulder:100,floorHeight:40,operation:'cut-fill',mirror:false,placementMode:'manual'};
 const result=editLane(p,lane,manifest);assert.ok(result.vertices>0);assert.deepEqual(result.project.entities,p.entities);assert.deepEqual(p,before);
 assert.equal(JSON.parse(result.project.metadata['terrainLane.last']).floorHeight,40);
 const curved=editLane(p,{...lane,bend:.5},manifest);
 assert.notDeepEqual(curved.project.terrain.heights,result.project.terrain.heights);
 assert.equal(JSON.parse(curved.project.metadata['terrainLane.last']).bend,.5);
 assert.deepEqual(p,before);
});

test('MCP landforms share placement checks and preserve existing protection in manual mode',()=>{
 const p=JSON.parse(JSON.stringify(fixture())),before=structuredClone(p);
 const stamp={preset:'mesa',x:1600,y:800,radius:300,aspect:1,length:600,width:600,rotation:0,amplitude:80,edgePower:2,mirror:false,shapeVersion:'natural-v2'};
 const result=editLandform(p,stamp,'manual',manifest);
 assert.ok(result.vertices>0);assert.deepEqual(result.project.entities,p.entities);assert.deepEqual(p,before);
 assert.throws(()=>editLandform(p,stamp,'protected',manifest));
 assert.throws(()=>editLandform(p,{...stamp,x:500},'manual',manifest),/structure reserve/);
 assert.throws(()=>editLandform(p,{...stamp,allowAreaChanges:true},'manual',manifest),/Unexpected/);
 const protectedProject=editTerrainProtection(p,p.activeBaseLayoutId,{operation:'add',name:'Court',x:1500,y:700,width:200,height:200},manifest).project;
 assert.throws(()=>editLandform(protectedProject,stamp,'manual',manifest),/heights are protected/);
});

test('MCP protection adds and removes only the selected height rule, preserving other data',()=>{
  const p=JSON.parse(JSON.stringify(fixture())),layout=p.baseLayouts[0],rule={id:'clear',name:'Clear corner',kind:'clear',team:'all',x:0,y:0,width:10,height:10};
  layout.metadata[BUILD_AREAS_KEY]=JSON.stringify([rule]);
  const before=structuredClone(p),edit={operation:'add',name:'Ridge',x:1400,y:600,width:200,height:200};
  const added=editTerrainProtection(p,p.activeBaseLayoutId,edit,manifest);
  assert.deepEqual(p,before);assert.deepEqual(added.project.terrain,p.terrain);assert.deepEqual(added.project.entities,p.entities);
  assert.deepEqual(JSON.parse(added.project.baseLayouts[0].metadata[BUILD_AREAS_KEY])[0],rule);
  assert.throws(()=>editTerrain(added.project,{operation:'raise',x:1500,y:700,radius:50,value:1},manifest),/heights are protected/);
  const texture=Object.keys(manifest.terrainTextures).find(t=>!p.terrain.tagmap.includes(t));
  const painted=editTerrain(added.project,{operation:'texture',x:1500,y:700,radius:100,texture},manifest).project;
  assert.deepEqual(painted.terrain.heights,p.terrain.heights);assert.notDeepEqual(painted.terrain,added.project.terrain);
  assert.equal(painted.baseLayouts[0].metadata[BUILD_AREAS_KEY],added.project.baseLayouts[0].metadata[BUILD_AREAS_KEY]);
  const removed=editTerrainProtection(added.project,p.activeBaseLayoutId,{operation:'remove',id:added.affectedAreaId},manifest);
  assert.deepEqual(removed.project,p);
  const other={...structuredClone(added.project.baseLayouts[0]),id:'other'};added.project.baseLayouts.push(other);added.project.activeBaseLayoutId='other';
  const stillProtected=editTerrainProtection(added.project,'other',{operation:'remove',id:added.affectedAreaId},manifest).project;
  assert.throws(()=>editTerrain(stillProtected,{operation:'raise',x:1500,y:700,radius:50,value:1},manifest),/heights are protected/);
});

test('MCP protection rejects invalid rectangles, wrong layouts, wrong rule kinds and malformed collections atomically',()=>{
  const p=fixture(),add={operation:'add',name:'Ridge',x:1000,y:600,width:200,height:200},before=structuredClone(p);
  for(const edit of [{...add,x:NaN},{...add,x:-1},{...add,width:0},{...add,width:10000},{...add,name:' '},{...add,allowAreaChanges:true},{operation:'remove',id:'missing'},null])assert.throws(()=>editTerrainProtection(p,p.activeBaseLayoutId,edit,manifest));
  assert.throws(()=>editTerrainProtection(p,'wrong',add,manifest),/layout changed/);assert.deepEqual(p,before);
  p.baseLayouts[0].metadata[BUILD_AREAS_KEY]=JSON.stringify([{id:'clear',name:'Clear',kind:'clear',team:'all',x:0,y:0,width:10,height:10}]);
  assert.throws(()=>editTerrainProtection(p,p.activeBaseLayoutId,{operation:'remove',id:'clear'},manifest),/exactly once/);
  p.baseLayouts[0].metadata[BUILD_AREAS_KEY]='invalid';assert.throws(()=>editTerrainProtection(p,p.activeBaseLayoutId,add,manifest));
  p.baseLayouts[0].metadata[BUILD_AREAS_KEY]=JSON.stringify(Array.from({length:50},(_,i)=>({id:String(i),name:'Ridge',kind:'terrain',team:'all',x:1000,y:600,width:200,height:200})));
  const full=structuredClone(p);assert.throws(()=>editTerrainProtection(p,p.activeBaseLayoutId,add,manifest),/collection/);assert.deepEqual(p,full);
});

test('zero-value terrain brush preserves authored entity transforms',()=>{
  const p=JSON.parse(JSON.stringify(fixture())),tower=p.entities.find(e=>e.token==='L'&&e.team===1);
  tower.position[2]+=5;tower.rotation[0]=0.03;tower.rotation[1]=-0.02;
  const before=JSON.stringify(p);
  const result=editTerrain(p,{operation:'raise',x:700,y:800,radius:100,value:0},manifest);
  assert.deepEqual(result.project.terrain.heights,p.terrain.heights);
  assert.deepEqual(result.project.entities,p.entities);
  assert.equal(JSON.stringify(p),before);
});

test('terrain brush preserves distant authored transforms and conforms affected footprint',()=>{
  const p=JSON.parse(JSON.stringify(fixture())),local=p.entities.find(e=>e.token==='L'&&e.team===1),distant=p.entities.find(e=>e.token==='L'&&e.team===2);
  distant.position[2]+=5;distant.rotation[0]=0.03;distant.rotation[1]=-0.02;
  const before=JSON.stringify(p);
  // Only the grid vertex at (700,800) changes: the tower center (680,800)
  // is outside the brush, but its terrain support interpolates that vertex.
  const result=editTerrain(p,{operation:'raise',x:700,y:800,radius:1,value:1},manifest);
  assert.ok(Math.hypot(local.position[0]-700,local.position[1]-800)>1);
  assert.equal(result.project.terrain.heights.filter((h,i)=>h!==p.terrain.heights[i]).length,1);
  const changed=result.project.entities.find(e=>e.id===local.id);
  assert.ok(changed.position[2]>local.position[2]);
  assert.deepEqual(result.project.entities.find(e=>e.id===distant.id),distant);
  assert.equal(JSON.stringify(p),before);
});
