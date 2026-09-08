import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createCreativeBaseLayout} from '../lib/builtin-base-layouts.ts';
import {favoriteFromLayout,placeFavorite,readFormationFavorites} from '../lib/formation-favorites.ts';
import {createBlankProject} from '../lib/wulfram.ts';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json'));
const blank=()=>{const p=createBlankProject('Sprint',65);p.terrain.heights.fill(0);p.terrain.worldWidth=8000;p.terrain.worldHeight=6000;return p;};
void test('Exact count, sampled access and favorite transplant preserve source and formation',()=>{
  const p=blank(),before=structuredClone(p),options={size:'small',x:1800,y:2800,rotation:25,radius:1800,targetCount:18,checkAccess:true};
  const layout=createCreativeBaseLayout(p,manifest,'anvil','sprint','test',options);
  assert.equal(layout.entities.length,36);assert.equal(JSON.parse(layout.metadata['formation.access']).passed,true);
  const favorite=favoriteFromLayout(layout,options,'saved');
  assert.equal(readFormationFavorites(JSON.stringify([favorite])).length,1);
  const other=blank();other.terrain.worldWidth=10000;
  const copied=placeFavorite(other,manifest,favorite,{...options,x:2500,rotation:0},'copy');
  const one=copied.entities.filter(e=>e.team===1);
  favorite.template.units.forEach((u,i)=>{assert.ok(Math.abs(one[i].position[0]-2500-u.offset[0])<1e-6);assert.ok(Math.abs(one[i].position[1]-2800-u.offset[1])<1e-6);});
  assert.deepEqual(p,before);
});
void test('Impossible budgets and blocked battlefield reject without mutation',()=>{
  const p=blank(),options={size:'large',x:2000,y:3000,rotation:0,radius:1800,targetCount:6,checkAccess:true};
  assert.throws(()=>createCreativeBaseLayout(p,manifest,'anvil','bad','test',options),/at least/);
  p.terrain.heights=p.terrain.heights.map((_,i)=>(i%65)*300);
  const before=structuredClone(p);assert.throws(()=>createCreativeBaseLayout(p,manifest,'starter','bad','test',{...options,targetCount:0}));assert.deepEqual(p,before);
});
