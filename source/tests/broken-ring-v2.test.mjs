import {createHash} from 'node:crypto';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {brokenRingTemplateV2} from '../lib/broken-ring-v2.ts';
import {brokenRingRequiredCounts} from '../lib/broken-ring.ts';
import {structureTerrainClearance} from '../lib/wulfram.ts';
import {distanceToSegment} from '../lib/build-areas.ts';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json','utf8'));
await test('V2 changes macro aspect and openings while preserving roles, model clearance and connected circulation across 192 samples',()=>{
 const before=structuredClone(manifest);
 const radius=token=>Math.max(...[1,2].map(team=>structureTerrainClearance({token,team},manifest,0,0).footprint/Math.SQRT2));
 for(const size of ['small','standard','large','massive']){
  const aspects=[],rear=[];
  for(let n=0;n<48;n++){
   const {plan,template}=brokenRingTemplateV2(`macro-${n}`,size,manifest);
   assert.deepEqual({plan,template},(()=>{const r=brokenRingTemplateV2(`macro-${n}`,size,manifest);return {plan:r.plan,template:r.template};})());
   assert.equal(plan.version,'broken-ring-v2');assert.equal(template.id,plan.version);
   for(const [token,count] of Object.entries(brokenRingRequiredCounts(size)))assert.equal(template.units.filter(u=>u.token===token).length,count);
   const loop=plan.circulation.points;assert.deepEqual(loop[0],loop.at(-1));assert.ok(loop.length<=32);
   assert.equal(new Set(loop.slice(0,-1).map(p=>JSON.stringify(p))).size,loop.length-1);
   let winding=0;
   for(let i=1;i<loop.length;i++){
    const a=loop[i-1],b=loop[i];
    winding+=Math.atan2(a[0]*b[1]-a[1]*b[0],a[0]*b[0]+a[1]*b[1]);
    assert.ok(distanceToSegment(0,0,a,b)-plan.circulation.width/2>=plan.interiorRadius);
   }
   assert.ok(Math.abs(winding-2*Math.PI)<1e-8);
   const xs=loop.map(p=>p[0]),ys=loop.map(p=>p[1]);aspects.push((Math.max(...xs)-Math.min(...xs))/(Math.max(...ys)-Math.min(...ys)));rear.push(plan.route.points[0][1]);
   for(const branch of plan.serviceRoutes){assert.deepEqual(branch.points[0],plan.route.points[1]);assert.ok(loop.some(p=>p[0]===branch.points[1][0]&&p[1]===branch.points[1][1]));}
   for(const [i,u] of template.units.entries()){
    if(['u','r','f'].includes(u.token))assert.ok(u.offset[0]<0);
    assert.ok(Math.hypot(...u.offset)>=450+radius(u.token)+14);
    for(const route of [plan.route,...plan.serviceRoutes,plan.circulation])for(let j=1;j<route.points.length;j++)assert.ok(distanceToSegment(...u.offset,route.points[j-1],route.points[j])>=route.width/2+radius(u.token)+14);
    for(const v of template.units.slice(i+1))assert.ok(Math.hypot(u.offset[0]-v.offset[0],u.offset[1]-v.offset[1])>=radius(u.token)+radius(v.token)+14);
    if(u.token!=='e')assert.ok(template.units.some(e=>e.token==='e'&&Math.hypot(e.offset[0]-u.offset[0],e.offset[1]-u.offset[1])<270));
   }
  }
  assert.ok(Math.min(...aspects)<.85&&Math.max(...aspects)>1.15,'Both elongated axes must be represented');
  assert.ok(Math.max(...rear)-Math.min(...rear)>400,'Rear opening variation must exceed local jitter');
 }
 assert.deepEqual(manifest,before);
});

await test('V2 full local recipes retain their reviewed versioned reference geometry',()=>{
 const golden=JSON.parse(fs.readFileSync('tests/fixtures/broken-ring-v2.json','utf8'));
 assert.deepEqual(golden.fixtures.map(f=>f.size),['small','standard','large','massive']);
 for(const fixture of golden.fixtures){
  const result=brokenRingTemplateV2(golden.seed,fixture.size,manifest);
  assert.equal(result.plan.version,golden.version);
  assert.equal(createHash('sha256').update(JSON.stringify(result)).digest('hex'),fixture.sha256);
 }
});
