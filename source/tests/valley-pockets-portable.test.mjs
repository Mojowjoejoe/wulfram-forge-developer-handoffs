import {previewValleyPocketPlacement} from '../lib/valley-pockets-placement.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fitValleyPocketTerrain} from '../lib/valley-pockets-terrain.ts';
import {reconstructPortableValley} from '../lib/valley-pockets-portable.ts';
import {createBlankProject} from '../lib/wulfram.ts';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json','utf8'));
test('Portable recipes reconstruct all default and expanded fitted geometries exactly',()=>{
 const project=createBlankProject('Portable',129);project.terrain.worldWidth=16000;project.terrain.worldHeight=12000;
 for(const [i,size] of ['small','standard','large','massive'].entries())for(const expanded of [false,true])for(let seed=0;seed<8;seed++){
  const targetCount=[10,15,20,30][i]+(expanded?4:0),key=`portable-${seed}`;
  const fit=fitValleyPocketTerrain(project,manifest,key,{size,x:4000,y:6000,rotation:35,radius:3300,targetCount});
  const recipe={version:1,recipeVersion:fit.plan.version,seed:key,size,targetCount,shifts:fit.shifts},before=structuredClone(recipe);
  assert.deepEqual(reconstructPortableValley(JSON.parse(JSON.stringify(recipe)),manifest),fit);assert.deepEqual(recipe,before);
 }
});
test('Portable records reject altered versions, membership, shift windows and counts',()=>{
 const p=createBlankProject('Portable',129);p.terrain.worldWidth=16000;p.terrain.worldHeight=12000;
 const fit=fitValleyPocketTerrain(p,manifest,'portable-0',{size:'small',x:4000,y:6000,rotation:0,radius:3300});
 const recipe={version:1,recipeVersion:fit.plan.version,seed:'portable-0',size:'small',targetCount:10,shifts:fit.shifts};
 for(const invalid of [null,42,[],"recipe"])assert.throws(()=>reconstructPortableValley(invalid,manifest));
 for(const change of [r=>r.extra=true,r=>r.shifts[0].extra=true,r=>r.version=2,r=>r.recipeVersion='valley-pockets-v2',r=>r.targetCount=9,r=>r.shifts.pop(),r=>r.shifts[0].siteId='unknown',r=>r.shifts[0].dx=180,r=>r.shifts[0].dy=1,r=>r.shifts[0].dx=Infinity]){const bad=structuredClone(recipe);change(bad);assert.throws(()=>reconstructPortableValley(bad,manifest));}
});

test('Portable reconstruction retains terrain-shifted yards and service endpoints',()=>{
 const p=createBlankProject('Shifted portable',257);p.terrain.worldWidth=16000;p.terrain.worldHeight=12000;
 const placement={size:'small',x:4000,y:6000,rotation:0,radius:3300};
 const flat=fitValleyPocketTerrain(p,manifest,'valley-0',placement),site=flat.plan.sites[0],x=4000+site.center[0],y=6000+site.center[1];
 p.terrain.heights=p.terrain.heights.map((_,i)=>{const wx=i%257/256*16000,wy=Math.floor(i/257)/256*12000,d=Math.min(Math.hypot(wx-x,wy-y),Math.hypot(wx-(16000-x),wy-(12000-y)));return Math.max(0,1-d/90)*300;});
 const fit=fitValleyPocketTerrain(p,manifest,'valley-0',placement);assert.ok(fit.shifts.some(s=>s.dx||s.dy));
 assert.deepEqual(reconstructPortableValley({version:1,recipeVersion:fit.plan.version,seed:'valley-0',size:'small',targetCount:10,shifts:fit.shifts},manifest),fit);
});

test('Portable destination checks preserve the fixed arrangement and reject unsuitable destinations atomically',()=>{
 const source=createBlankProject('Source',129);source.terrain.worldWidth=16000;source.terrain.worldHeight=12000;
 const placement={size:'small',x:4000,y:6000,rotation:0,radius:3300,targetCount:14},fit=fitValleyPocketTerrain(source,manifest,'count-0',placement);
 const recipe={version:1,recipeVersion:fit.plan.version,seed:'count-0',size:'small',targetCount:14,shifts:fit.shifts};
 const target=structuredClone(source);target.terrain.worldWidth=20000;target.terrain.worldHeight=16000;
 const moved={...placement,x:5000,y:8000,rotation:35},before=structuredClone(target);
 const placed=previewValleyPocketPlacement(target,manifest,recipe.seed,moved,'portable',recipe);
 assert.deepEqual(placed.fitted,fit);assert.deepEqual(target,before);
 for(const change of [p=>p.validation.serviceRadius=100,p=>p.terrain.heights=p.terrain.heights.map((_,i)=>Math.abs(Math.floor(i/129)-64)*1000),p=>p.entities.push({...placed.layout.entities[0],id:'obstacle'})]){
  const bad=structuredClone(target);change(bad);const unchanged=structuredClone(bad);
  assert.throws(()=>previewValleyPocketPlacement(bad,manifest,recipe.seed,moved,'rejected',recipe));assert.deepEqual(bad,unchanged);
 }
 assert.throws(()=>previewValleyPocketPlacement(target,manifest,recipe.seed,{...moved,targetCount:15},'changed',recipe),/fixed/);
});
