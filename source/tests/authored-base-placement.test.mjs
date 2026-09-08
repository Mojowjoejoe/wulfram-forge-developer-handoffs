import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createBlankProject,activateBaseLayout} from '../lib/wulfram.ts';
import {createCreativeBaseLayout} from '../lib/builtin-base-layouts.ts';
import {captureAuthoredBase} from '../lib/authored-base-package.ts';
import {placeAuthoredBase} from '../lib/authored-base-placement.ts';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json'));
function fixture(){
 const project=createBlankProject('Authored placement',65);project.terrain.worldWidth=8000;project.terrain.worldHeight=6000;project.terrain.heights.fill(0);
 const layout=createCreativeBaseLayout(project,manifest,'anvil','authored-source','placement-test',{size:'small',x:1800,y:2800,rotation:25,radius:1800,targetCount:18,checkAccess:true});
 project.baseLayouts.push(layout);activateBaseLayout(project,layout.id);
 const frame={origin:[4000,3000,0],yaw:0};
 return {project,pack:captureAuthoredBase(layout,frame),request:{activeLayoutId:layout.id,layoutId:'reused',frame,terrainMode:'preserve'}};
}
test('new-layout preview preserves old layouts, terrain, source rules and input',()=>{
 const {project,pack,request}=fixture(),before=structuredClone(project);
 const out=placeAuthoredBase(project,pack,request,manifest);
 assert.deepEqual(project,before);assert.deepEqual(out.project.terrain,project.terrain);
 assert.equal(out.project.baseLayouts.length,project.baseLayouts.length+1);assert.equal(out.project.activeBaseLayoutId,'reused');
 assert.deepEqual(out.project.baseLayouts.slice(0,-1),project.baseLayouts);
 assert.deepEqual(out.project.validation,pack.validation);assert.equal(out.affectedIds.length,36);
 out.project.entities.forEach((e,i)=>{e.position.forEach((n,j)=>assert.ok(Math.abs(n-project.entities[i].position[j])<1e-8));e.rotation.forEach((n,j)=>assert.ok(Math.abs(n-project.entities[i].rotation[j])<1e-8));});
});
test('preserved tilt cannot place a model below terrain at an otherwise valid center height',()=>{
 const {project,pack,request}=fixture();pack.geometry.units[0].rotation[0]=.8;
 assert.throws(()=>placeAuthoredBase(project,pack,request,manifest),/model bounds conflict/);
 assert.doesNotThrow(()=>placeAuthoredBase(project,pack,{...request,terrainMode:'conform'},manifest));
});
test('conform handles elevated destination while preserve rejects burial atomically',()=>{
 const {project,pack,request}=fixture();project.terrain.heights.fill(100);const before=structuredClone(project);
 assert.throws(()=>placeAuthoredBase(project,pack,request,manifest),/height conflicts/);
 const out=placeAuthoredBase(project,pack,{...request,terrainMode:'conform'},manifest);
 out.project.entities.forEach((e,i)=>assert.ok(e.position[2]>before.entities[i].position[2]+90));
 assert.deepEqual(project,before);
});
test('stale layout, ID collision, missing models and malformed settings reject',()=>{
 const {project,pack,request}=fixture(),before=structuredClone(project);
 assert.throws(()=>placeAuthoredBase(project,pack,{...request,activeLayoutId:'gone'},manifest),/Active layout/);
 assert.throws(()=>placeAuthoredBase(project,pack,{...request,layoutId:project.activeBaseLayoutId},manifest),/new layout/);
 assert.throws(()=>placeAuthoredBase(project,pack,request,{...manifest,models:{}}),/Missing model/);
 for(const change of [{maxSlopeDegrees:91},{minSpacing:-1},{serviceRadius:NaN}])assert.throws(()=>placeAuthoredBase(project,{...pack,validation:{...pack.validation,...change}},request,manifest),/validation settings/);
 assert.deepEqual(project,before);
});
