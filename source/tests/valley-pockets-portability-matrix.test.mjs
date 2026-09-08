import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createBlankProject} from '../lib/wulfram.ts';
import {createCreativeBaseLayout} from '../lib/builtin-base-layouts.ts';
import {favoriteFromLayout,placeFavorite} from '../lib/formation-favorites.ts';
import {exportPortableBases,parsePortableBases} from '../lib/portable-base-library.ts';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json','utf8'));
function map(terrain,width,height){const p=createBlankProject('Portability matrix',129);p.terrain.worldWidth=width;p.terrain.worldHeight=height;p.terrain.tagmap=['0:1snow001'];p.terrain.tagmap2=['1snow001'];p.terrain.heights=p.terrain.heights.map((_,i)=>terrain==='flat'?0:terrain==='valley'?Math.abs(Math.floor(i/129)-64)*4:40*Math.cos((i%129-64)/10)*Math.cos((Math.floor(i/129)-64)/10));return p;}
test('96 portable size/terrain/count/seed cases retain complete geometry across maps',()=>{
 const results=[];
 for(const [i,size] of ['small','standard','large','massive'].entries())for(const terrain of ['flat','valley','irregular'])for(const expanded of [false,true])for(let seed=0;seed<4;seed++){
  const p=map(terrain,16000,12000),targetCount=[10,15,20,30][i]+(expanded?4:0),placement={size,x:4000,y:6000,rotation:35,radius:3300,targetCount},key=`count-${seed}`;
  const layout=createCreativeBaseLayout(p,manifest,'valley-pockets','source',key,placement),saved=favoriteFromLayout(layout,placement,'favorite',p,manifest),favorite=parsePortableBases(exportPortableBases([saved]))[0];
  const target=map(terrain,20000,16000);target.entities.push({id:'retained',token:'e',team:0,position:[500,500,0],rotation:[0,0,0],active:1});const before=structuredClone(target),moved={...placement,x:5000,y:8000,rotation:90};
  const copy=placeFavorite(target,manifest,favorite,moved,'reused'),again=favoriteFromLayout(copy,JSON.parse(copy.metadata['formation.placement']),'again',target,manifest);
  assert.deepEqual(again.valleyRecipe,favorite.valleyRecipe);assert.deepEqual(again.template.units,favorite.template.units);assert.deepEqual(target,before);assert.deepEqual(copy.entities.find(e=>e.id==='retained'),target.entities[0]);
  const record=JSON.parse(copy.metadata['formation.valleyPockets.reused']);assert.equal(record.serviceRoutes.length,2);assert.equal(new Set(record.serviceRoutes.map(r=>r.unitIndex)).size,2);
  for(const team of [1,2]){
   assert.equal(copy.entities.filter(e=>e.team===team).length,targetCount);
   for(const [j,u] of favorite.template.units.entries()){const e=copy.entities.find(e=>e.id===`reused-${team}-${j}`),x=team===1?5000-u.offset[1]:15000+u.offset[1],y=team===1?8000+u.offset[0]:8000-u.offset[0];assert.ok(Math.hypot(e.position[0]-x,e.position[1]-y)<1e-6);}
  }
  results.push({size,terrain,targetCount,seed:key,passed:true});
 }
 assert.equal(results.length,96);fs.writeFileSync('outputs/valley-pockets-portability-matrix.json',JSON.stringify({passed:true,evidence:'Source checks only; not native or game proof.',cases:results},null,2));
});
