import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createCreativeBaseLayout} from '../lib/builtin-base-layouts.ts';
import {BUILD_AREAS_KEY,checkBuildAreas} from '../lib/build-areas.ts';
import {createBlankProject,activateBaseLayout,validateProject} from '../lib/wulfram.ts';
import {analyzeRotationalEntityPairs} from '../lib/balanced-map-analysis.ts';
const manifest=JSON.parse(await fs.readFile('public/assets/manifest.json','utf8'));
const out=await fs.mkdtemp('outputs/broken-ring-review-');
const sha=text=>createHash('sha256').update(text).digest('hex');
const report={finished:false,version:'broken-ring-v3',cases:[],representatives:[],limits:'Offline destination acceptance only. No GUI, portable favorite, native or gameplay evidence.'};
for(const terrain of ['flat','valley','irregular','asymmetric'])for(const size of ['small','standard','large','massive'])for(let n=0;n<12;n++){
 const p=createBlankProject('Broken Ring review',129);p.terrain.tagmap=['0:1snow001'];p.terrain.tagmap2=['1snow001'];p.terrain.worldWidth=16000;p.terrain.worldHeight=12000;
 p.terrain.heights=p.terrain.heights.map((_,i)=>terrain==='flat'?0:terrain==='valley'?Math.abs(Math.floor(i/129)-64)*8:terrain==='irregular'?100*Math.cos((i%129-64)/10)*Math.cos((Math.floor(i/129)-64)/10):100*Math.sin(i%129/10)*Math.cos(Math.floor(i/129)/10));
 const seed=`broken-ring-review-${n}`,placement={size,x:4000,y:6000,rotation:[0,35,90][n%3],radius:3300,checkAccess:true,terrainAware:n%2===1,targetCount:n>=6?{small:20,standard:25,large:30,massive:40}[size]:0};
 const before=JSON.stringify(p),record={terrain,size,seed,placement,sourceSha256:sha(before),accepted:false};
 let layout;
 try{layout=createCreativeBaseLayout(p,manifest,'broken-ring',`ring-${size}`,seed,placement);}
 catch(error){record.reason=error.message;}
 // Assertion failures are harness failures, never silently counted as terrain rejections.
 assert.equal(JSON.stringify(p),before,'Source changed');
 if(layout){
  const areas=JSON.parse(layout.metadata[BUILD_AREAS_KEY]),trial={...p,entities:layout.entities,validation:layout.validation};
  assert.equal(areas.length,10);assert.deepEqual(checkBuildAreas(areas,layout.entities,16000,12000,manifest),[]);
  assert.deepEqual(validateProject(trial).filter(i=>i.severity==='error'),[]);
  assert.ok(analyzeRotationalEntityPairs(trial,manifest).passed);
  const access=JSON.parse(layout.metadata['formation.brokenRingAccess']);assert.equal(access.routes.length,8);assert.ok(access.routes.every(r=>!r.markers.some(m=>m.severity==='blocked')));
  assert.equal(JSON.parse(layout.metadata['formation.brokenRingPlan']).version,report.version);assert.equal(access.serviceAccess.clearance,96);assert.equal(access.serviceAccess.routes.length,4);assert.ok(access.serviceAccess.routes.every(r=>r.markers.length===0));
  for(const team of [1,2])if(placement.targetCount)assert.equal(layout.entities.filter(e=>e.team===team).length,placement.targetCount);
  const repeat=createCreativeBaseLayout(p,manifest,'broken-ring',`ring-${size}`,seed,placement);
  assert.deepEqual({...layout,updatedAt:''},{...repeat,updatedAt:''});assert.equal(JSON.stringify(p),before);
  record.accepted=true;record.candidateSeed=layout.metadata['formation.candidateSeed'];record.entitySha256=sha(JSON.stringify(layout.entities));
  if(!report.representatives.some(r=>r.terrain===terrain&&r.size===size)){
   const saved=structuredClone(p);saved.baseLayouts.push(layout);activateBaseLayout(saved,layout.id);
   const file=`${out}/${terrain}-${size}.json`,content=JSON.stringify(saved);await fs.writeFile(file,content);
   report.representatives.push({terrain,size,file,sha256:sha(content)});
  }
 }
 report.cases.push(record);
 if(n===11){await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log(`${terrain} ${size}: ${report.cases.filter(c=>c.terrain===terrain&&c.size===size&&c.accepted).length}/12 accepted`);}
}
report.finished=true;await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({report:`${out}/report.json`,accepted:report.cases.filter(c=>c.accepted).length,rejected:report.cases.filter(c=>!c.accepted).length}));
