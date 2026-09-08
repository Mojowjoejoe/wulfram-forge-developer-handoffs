import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyManualTerrainBrush} from '../lib/manual-terrain-brush.ts';
import {editTerrain} from '../lib/mcp-commands.ts';
const manifest=JSON.parse(fs.readFileSync(new URL('../public/assets/manifest.json',import.meta.url)));
const fixture=()=>({format:'wulfram-map-project',version:1,name:'Brush parity',terrain:{width:81,height:81,worldWidth:1000,worldHeight:1000,heights:Array(6561).fill(0),textureIds:Array(6561).fill(0),tagmap:['canyon003'],tagmap2:['canyon003']},entities:[],baseLayouts:[{id:'default',name:'Default',entities:[],metadata:{}}],activeBaseLayoutId:'default',validation:{serviceRadius:300,backupRadius:80,maxSlopeDegrees:22,minSpacing:8},metadata:{},updatedAt:'2000-01-01T00:00:00.000Z'});
const brush={profile:'editor-v1',tool:'sculpt',x:500,y:500,radius:100,strength:100,shape:'round',falloff:'hard'};
const at=(p,x,y)=>p.terrain.heights[y*81+x];

test('editor shapes and exact-height/falloff formulas retain their visible meanings',()=>{
 const p=fixture();
 assert.equal(at(applyManualTerrainBrush(p,{...brush,shape:'square'},manifest).project,46,46),7);
 assert.equal(at(applyManualTerrainBrush(p,brush,manifest).project,46,46),0);
 assert.equal(at(applyManualTerrainBrush(p,{...brush,shape:'diamond'},manifest).project,46,42),7);
 assert.equal(at(applyManualTerrainBrush(p,{...brush,shape:'diamond'},manifest).project,46,43),0);
 const stamp={...brush,tool:'stamp',targetHeight:42};
 assert.equal(at(applyManualTerrainBrush(p,stamp,manifest).project,44,40),42);
 assert.equal(at(applyManualTerrainBrush(p,{...stamp,falloff:'linear'},manifest).project,44,40),21);
 assert.equal(at(applyManualTerrainBrush(p,{...stamp,falloff:'soft'},manifest).project,44,40),42*Math.pow(.5,1.65));
 assert.equal(at(applyManualTerrainBrush(p,{...stamp,tool:'level',falloff:'soft'},manifest).project,40,40),42*.34);
});

test('all 54 editor shape/falloff/tool combinations match the MCP entry point without mutating their source',()=>{
 for(const shape of ['round','square','diamond'])for(const falloff of ['soft','linear','hard'])for(const tool of ['sculpt','lower','level','stamp','smooth','paint']){
   const p=fixture();p.terrain.heights[40*81+40]=100;const before=structuredClone(p);
   const request={...brush,shape,falloff,tool,targetHeight:42,texture:Object.keys(manifest.terrainTextures).find(name=>name!=='canyon003')};
   const gui=applyManualTerrainBrush(p,request,manifest),mcp=editTerrain(p,request,manifest);
   assert.deepEqual(mcp.project.terrain,gui.project.terrain,`${shape}/${falloff}/${tool}`);
   assert.deepEqual(mcp.project.entities,before.entities);assert.deepEqual(mcp.project.baseLayouts,before.baseLayouts);assert.deepEqual(p,before);
   assert.ok(mcp.vertices>0);
 }
});

test('smoothing reads the original neighborhood and level samples the center when target is omitted',()=>{
 const p=fixture();p.terrain.heights[40*81+40]=90;
 const smooth=applyManualTerrainBrush(p,{...brush,tool:'smooth'},manifest).project;
 assert.equal(at(smooth,40,40),66);assert.equal(at(smooth,39,40),3);
 const level=applyManualTerrainBrush(p,{...brush,tool:'level'},manifest).project;
 assert.equal(at(level,39,40),90);
});

test('selection preserves outside terrain and nonzero edges; protected height areas reject atomically',()=>{
 const p=fixture();p.terrain.heights[0]=12;const before=structuredClone(p);
 const r=applyManualTerrainBrush(p,{...brush,radius:600,selection:{x:400,y:400,width:200,height:200}},manifest);
 assert.equal(r.project.terrain.heights[0],12);assert.equal(at(r.project,20,20),0);assert.equal(at(r.project,40,40),7);assert.deepEqual(p,before);
 p.baseLayouts[0].metadata['forge.build-areas.v1']=JSON.stringify([{id:'keep',name:'Keep',kind:'terrain',team:'all',x:450,y:450,width:100,height:100}]);
 const protectedBefore=structuredClone(p);assert.throws(()=>editTerrain(p,brush,manifest),/protected/);assert.deepEqual(p,protectedBefore);
});

test('malformed profiles and unsupported heights reject before mutation',()=>{
 const p=fixture(),before=structuredClone(p);
 for(const change of [{profile:'future'},{shape:'hexagon'},{falloff:'unknown'},{strength:NaN},{radius:0},{x:-1},{selection:null},{selection:{x:900,y:0,width:200,height:100}},{tool:'stamp'},{tool:'stamp',targetHeight:5001},{tool:'level',targetHeight:1e308},{targetHeight:Infinity},{mirror:true}])assert.throws(()=>editTerrain(p,{...brush,...change},manifest));
 assert.deepEqual(p,before);
 assert.throws(()=>editTerrain(p,{...brush,tool:'stamp',targetHeight:0},manifest),/would not change/);
});


test('inactive layout protection and unrelated layout metadata survive editor brushes',()=>{
 const p=fixture();p.baseLayouts.push({id:'other',name:'Other state',entities:[],updatedAt:'2000-01-01',metadata:{sentinel:'keep', 'forge.build-areas.v1':JSON.stringify([{id:'keep',name:'Keep',kind:'terrain',team:'all',x:450,y:450,width:100,height:100}])}});
 const before=structuredClone(p);
 const allowed=editTerrain(p,{...brush,x:200,y:200},manifest);
 assert.deepEqual(allowed.project.baseLayouts,before.baseLayouts);assert.deepEqual(p,before);
 assert.throws(()=>editTerrain(p,brush,manifest),/protected/);assert.deepEqual(p,before);
});
