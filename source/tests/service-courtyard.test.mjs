import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {serviceCourtyardTemplate,serviceCourtyardAreas,courtyardRequiredCounts,SERVICE_COURTYARD_ROUTES} from '../lib/service-courtyard.ts';
import {createBlankProject,structureTerrainClearance} from '../lib/wulfram.ts';
import {distanceToSegment} from '../lib/build-areas.ts';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json','utf8'));
await test('Courtyard 48 deterministic samples retain budgets, supply and clear court mouths',()=>{
 const original=JSON.stringify(manifest);
 for(const size of ['small','standard','large','massive'])for(let seed=0;seed<12;seed++){
  const t=serviceCourtyardTemplate(String(seed),size,manifest);assert.deepEqual(t,serviceCourtyardTemplate(String(seed),size,manifest));
  for(const [token,count] of Object.entries(courtyardRequiredCounts(size)))assert.equal(t.units.filter(u=>u.token===token).length,count);
  const radius=token=>Math.max(...[1,2].map(team=>structureTerrainClearance({token,team},manifest,0,0).footprint/Math.SQRT2));
  for(const [i,u] of t.units.entries()){
   for(const route of SERVICE_COURTYARD_ROUTES)assert.ok(distanceToSegment(...u.offset,...route.points)>=route.width/2+radius(u.token)+14);
   for(const v of t.units.slice(i+1))assert.ok(Math.hypot(u.offset[0]-v.offset[0],u.offset[1]-v.offset[1])>=radius(u.token)+radius(v.token)+14);
   if(u.token!=='e')assert.ok(t.units.some(e=>e.token==='e'&&Math.hypot(e.offset[0]-u.offset[0],e.offset[1]-u.offset[1])<270));
  }
 }
 assert.equal(JSON.stringify(manifest),original);
});
await test('Courtyard reservations rotate and mirror without changing the map; invalid inputs reject',()=>{
 const p=createBlankProject('source',65),before=structuredClone(p),areas=serviceCourtyardAreas(p,2000,3000,35);assert.equal(areas.length,6);
 for(let i=0;i<3;i++)for(let j=0;j<2;j++){assert.ok(Math.abs(areas[i].points[j][0]+areas[i+3].points[j][0]-p.terrain.worldWidth)<1e-8);assert.ok(Math.abs(areas[i].points[j][1]+areas[i+3].points[j][1]-p.terrain.worldHeight)<1e-8);}
 assert.deepEqual(p,before);assert.throws(()=>serviceCourtyardAreas(p,NaN,0,0));for(const invalid of ['invalid','constructor','toString','__proto__'])assert.throws(()=>serviceCourtyardTemplate('x',invalid,manifest),/Unsupported/);assert.throws(()=>serviceCourtyardTemplate('x','small',{...manifest,models:{}}),/needs the original/);
});
