import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {previewTerrainLane,applyTerrainLane} from '../lib/terrain-lane.ts';
const manifest=JSON.parse(fs.readFileSync(new URL('../public/assets/manifest.json',import.meta.url)));
const fixture=()=>({format:'wulfram-map-project',version:1,name:'Lane',terrain:{width:81,height:81,worldWidth:4000,worldHeight:4000,heights:Array(6561).fill(300),textureIds:Array(6561).fill(0),tagmap:['canyon003'],tagmap2:['canyon003']},entities:[],baseLayouts:[{id:'default',name:'Default',entities:[],metadata:{}}],activeBaseLayoutId:'default',validation:{serviceRadius:300,backupRadius:80,maxSlopeDegrees:22,minSpacing:8},metadata:{},updatedAt:'2000-01-01T00:00:00.000Z'});
const options={points:[[1000,2000],[3000,2000]],width:200,shoulder:400,floorHeight:0,operation:'cut',mirror:false,placementMode:'manual'};
test('lane cuts a level core with continuous shoulders and exact untouched terrain',()=>{
 const p=fixture(),before=structuredClone(p),r=previewTerrainLane(p,options,manifest);
 assert.deepEqual(p,before);assert.equal(r.project.terrain.heights[40*81+40],0);
 assert.equal(r.project.terrain.heights[46*81+40],150);
 assert.equal(r.project.terrain.heights[50*81+40],300);
 assert.deepEqual(r.project.terrain.textureIds,p.terrain.textureIds);assert.deepEqual(r.project.entities,p.entities);
 assert.deepEqual(r,previewTerrainLane(p,options,manifest));
 assert.equal(JSON.parse(applyTerrainLane(p,options,manifest).project.metadata['terrainLane.last']).version,1);
});
test('cut-only preserves lower ground; cut-fill raises it and mirrored paths remain symmetric',()=>{
 const p=fixture();p.terrain.heights.fill(-20);
 assert.throws(()=>previewTerrainLane(p,options,manifest),/would not change/);
 const fill=previewTerrainLane(p,{...options,operation:'cut-fill'},manifest);assert.equal(fill.project.terrain.heights[40*81+40],0);
 const mirrored=previewTerrainLane(fixture(),{...options,points:[[1000,1200],[2500,1700]],mirror:true},manifest);
 assert.deepEqual(mirrored.project.terrain.heights,[...mirrored.project.terrain.heights].reverse());
});
test('invalid and protected lanes reject atomically, including inactive-layout height rules',()=>{
 const p=fixture(),before=structuredClone(p);
 for(const change of [{width:NaN},{width:80},{shoulder:0},{points:[[0,0],[3000,2000]]},{points:[[1000,1000],[1000,1000]]},{placementMode:'unknown'}])assert.throws(()=>previewTerrainLane(p,{...options,...change},manifest));
 assert.deepEqual(p,before);
 p.baseLayouts.push({id:'other',name:'Protected',entities:[],metadata:{'forge.build-areas.v1':JSON.stringify([{id:'ridge',name:'Protected ridge',kind:'terrain',team:'all',x:1800,y:1800,width:400,height:400}])}});
 const protectedBefore=structuredClone(p);assert.throws(()=>previewTerrainLane(p,options,manifest),/heights are protected/);assert.deepEqual(p,protectedBefore);
});

test('polyline joins use the nearest segment without double cutting overlaps',()=>{
 const p=fixture(),points=[[1000,1000],[2000,2000],[3000,1000]],r=previewTerrainLane(p,{...options,points},manifest);
 assert.equal(r.project.terrain.heights[40*81+40],0);
 assert.equal(r.project.terrain.heights[30*81+30],0);
 assert.equal(r.project.terrain.heights[30*81+50],0);
 assert.deepEqual(r.project.terrain.heights,previewTerrainLane(p,{...options,points:[...points].reverse()},manifest).project.terrain.heights);
 assert.ok(r.project.terrain.heights.every(h=>h>=0&&h<=300));
});


test('curved lane bends either way, retains endpoints and preserves straight compatibility',()=>{
 const p=fixture(),before=structuredClone(p);
 const positive=previewTerrainLane(p,{...options,bend:1},manifest).project.terrain.heights;
 const negative=previewTerrainLane(p,{...options,bend:-1},manifest).project.terrain.heights;
 assert.equal(positive[60*81+40],0);assert.equal(positive[40*81+40],300);
 assert.equal(negative[20*81+40],0);assert.equal(negative[40*81+40],300);
 for(const heights of [positive,negative]){assert.equal(heights[40*81+20],0);assert.equal(heights[40*81+60],0);}
 assert.deepEqual(positive,Array.from({length:81},(_,y)=>negative.slice((80-y)*81,(81-y)*81)).flat());
 assert.deepEqual(previewTerrainLane(p,{...options,bend:0},manifest),previewTerrainLane(p,options,manifest));
 const mirrored=previewTerrainLane(p,{...options,bend:1,mirror:true},manifest).project.terrain.heights;
 assert.deepEqual(mirrored,[...mirrored].reverse());assert.deepEqual(p,before);
 const applied=applyTerrainLane(p,{...options,bend:1},manifest);
 assert.deepEqual(applied.project.terrain.heights,positive);
 assert.equal(JSON.parse(applied.project.metadata['terrainLane.last']).bend,1);
 assert.equal(JSON.parse(applied.project.metadata['terrainLane.last']).version,2);
});

test('curved lane validates bend and its full footprint before changing terrain',()=>{
 const p=fixture(),before=structuredClone(p);
 for(const bend of [NaN,Infinity,-1.1,1.1,null,'0.5'])assert.throws(()=>applyTerrainLane(p,{...options,bend},manifest),/bend/);
 assert.throws(()=>applyTerrainLane(p,{...options,bend:1,points:[[1000,2000],[2000,2000],[3000,2000]]},manifest),/two endpoints/);
 // Endpoints and straight shoulders fit, but the bend reaches the map edge.
 const nearEdge={...options,points:[[1000,2800],[3000,2800]]};
 assert.ok(previewTerrainLane(p,nearEdge,manifest).changed>0);
 assert.throws(()=>applyTerrainLane(p,{...nearEdge,bend:1},manifest),/farther inside/);
 assert.deepEqual(p,before);
});


test('a protected height area on the bend rejects while a straight lane clears it',()=>{
 const p=fixture();
 p.baseLayouts.push({id:'other',name:'Protected',entities:[],metadata:{'forge.build-areas.v1':JSON.stringify([{id:'ridge',name:'Protected ridge',kind:'terrain',team:'all',x:1800,y:2800,width:400,height:400}])}});
 const before=structuredClone(p);
 assert.ok(previewTerrainLane(p,options,manifest).changed>0);
 assert.throws(()=>applyTerrainLane(p,{...options,bend:1},manifest),/heights are protected/);
 assert.deepEqual(p,before);
});
