import {captureFormationPackage,placeFormationPackage} from '../lib/mcp-commands.ts';
import {favoriteFromLayout,placeFavorite} from '../lib/formation-favorites.ts';
import {exportPortableBases,parsePortableBases} from '../lib/portable-base-library.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createBlankProject} from '../lib/wulfram.ts';
import {createCreativeBaseLayout} from '../lib/builtin-base-layouts.ts';
import {captureValleyPocketRecipe} from '../lib/valley-pockets-capture.ts';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json','utf8'));
function fixture(){const p=createBlankProject('Capture',129);p.terrain.worldWidth=16000;p.terrain.worldHeight=12000;p.entities.push({id:'retained',token:'e',team:0,position:[500,500,0],rotation:[0,0,0],active:1});const placement={size:'small',x:4000,y:6000,rotation:35,radius:3300,targetCount:14};return {p,placement,layout:createCreativeBaseLayout(p,manifest,'valley-pockets','capture','count-0',placement)};}
test('Capture excludes retained buildings and verifies generated recipe without mutation',()=>{
 const {p,placement,layout}=fixture(),before=structuredClone({p,placement,layout});const saved=captureValleyPocketRecipe(layout,placement,p,manifest);
 assert.equal(saved.template.units.length,14);assert.equal(saved.recipe.targetCount,14);assert.equal(layout.entities.length,29);assert.deepEqual({p,placement,layout},before);
});
test('Capture rejects edited buildings, records, reservations and additional rules',()=>{
 const {p,placement,layout}=fixture();
 for(const edit of [l=>l.entities.find(e=>e.team===1).position[0]+=1,l=>l.entities.find(e=>e.team===1).active=0,l=>l.entities.pop(),l=>{const r=JSON.parse(l.metadata['formation.valleyPockets.capture']);r.serviceRoutes[0].points[0][0]+=1;l.metadata['formation.valleyPockets.capture']=JSON.stringify(r);},l=>{const areas=JSON.parse(l.metadata['forge.build-areas.v1']);areas[0].width+=1;l.metadata['forge.build-areas.v1']=JSON.stringify(areas);},l=>l.metadata['forge.unknown']='true']){
  const bad=structuredClone(layout);edit(bad);const before=structuredClone(bad);assert.throws(()=>captureValleyPocketRecipe(bad,placement,p,manifest));assert.deepEqual(bad,before);
 }
});

test('Valley favorite round trips version7, reuses another map and can be saved again',()=>{
 const {p,placement,layout}=fixture();const favorite=favoriteFromLayout(layout,placement,'saved',p,manifest),raw=exportPortableBases([favorite]);
 assert.equal(JSON.parse(raw).version,7);const restored=parsePortableBases(raw)[0];assert.deepEqual(restored,favorite);
 const target=createBlankProject('Destination',129);target.terrain.worldWidth=20000;target.terrain.worldHeight=16000;target.entities.push({id:'destination-retained',token:'e',team:0,position:[500,500,0],rotation:[0,0,0],active:1});
 const moved={...placement,x:5000,y:8000,rotation:90},before=structuredClone(target),copy=placeFavorite(target,manifest,restored,moved,'reused');
 assert.equal(copy.entities.length,29);assert.deepEqual(copy.entities.find(e=>e.id==='destination-retained'),target.entities[0]);assert.deepEqual(target,before);
 const savedAgain=favoriteFromLayout(copy,JSON.parse(copy.metadata['formation.placement']),'again',target,manifest);
 assert.deepEqual(savedAgain.valleyRecipe,favorite.valleyRecipe);assert.deepEqual(savedAgain.template.units,favorite.template.units);
 const bad=structuredClone(favorite);bad.template.units[0].offset[0]+=1;assert.throws(()=>placeFavorite(target,manifest,bad,moved,'bad'),/differs/);
 const old=JSON.parse(raw);old.version=6;assert.throws(()=>parsePortableBases(JSON.stringify(old)),/version 7/);
 for(const edit of [l=>{const r=JSON.parse(l.metadata['formation.valleyPockets.capture']);r.extra=true;l.metadata['formation.valleyPockets.capture']=JSON.stringify(r);},l=>{const a=JSON.parse(l.metadata['forge.build-areas.v1']);a[0].name='Custom passage';l.metadata['forge.build-areas.v1']=JSON.stringify(a);}]){const bad=structuredClone(layout);edit(bad);assert.throws(()=>captureValleyPocketRecipe(bad,placement,p,manifest),/whole map/);}
});

test('MCP favorite helpers capture current entities and create a new destination state atomically',()=>{
 const {p,placement,layout}=fixture();p.baseLayouts.push(layout);p.activeBaseLayoutId=layout.id;p.entities=structuredClone(layout.entities);p.validation=layout.validation;
 const before=structuredClone(p),packageJson=captureFormationPackage(p,layout.id,'mcp-saved',manifest);assert.deepEqual(p,before);
 const target=createBlankProject('MCP target',129);target.terrain.worldWidth=20000;target.terrain.worldHeight=16000;target.entities.push({id:'destination-retained',token:'e',team:0,position:[500,500,0],rotation:[0,0,0],active:1});
 const r={activeLayoutId:target.activeBaseLayoutId,layoutId:'mcp-reused',favoriteId:'mcp-saved',placement:{...placement,x:5000,y:8000}},unchanged=structuredClone(target);
 const result=placeFormationPackage(target,packageJson,JSON.stringify(r),manifest);assert.equal(result.project.activeBaseLayoutId,r.layoutId);assert.equal(result.project.entities.length,29);assert.deepEqual(result.project.entities.find(e=>e.id==='destination-retained'),target.entities[0]);assert.deepEqual(target,unchanged);
 for(const edit of [v=>v.activeLayoutId='stale',v=>v.layoutId=target.activeBaseLayoutId,v=>v.extra=true,v=>v.placement.radius=-1,v=>v.favoriteId='absent']){const bad=structuredClone(r);edit(bad);assert.throws(()=>placeFormationPackage(target,packageJson,JSON.stringify(bad),manifest));assert.deepEqual(target,unchanged);}
});
