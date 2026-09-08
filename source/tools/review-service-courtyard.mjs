import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {serviceCourtyardTemplate,serviceCourtyardAreas,SERVICE_COURTYARD_VERSION} from '../lib/service-courtyard.ts';
import {createCreativeBaseLayout} from '../lib/builtin-base-layouts.ts';
import {BUILD_AREAS_KEY,checkBuildAreas} from '../lib/build-areas.ts';
import {createBlankProject,activateBaseLayout,validateProject} from '../lib/wulfram.ts';
import {analyzeRotationalEntityPairs} from '../lib/balanced-map-analysis.ts';
const manifest=JSON.parse(await fs.readFile('public/assets/manifest.json','utf8')),out=await fs.mkdtemp('outputs/service-courtyard-review-');
const report={version:SERVICE_COURTYARD_VERSION,catalogStatus:'experimental-not-listed',cases:[],representatives:[],limits:'Offline power, spacing, pair and reserved-space checks. No game trial, catalog UI or portable favorite acceptance yet.'};
for(const terrain of ['flat','valley','irregular','asymmetric'])for(const size of ['small','standard','large','massive'])for(let n=0;n<12;n++){
 const seed=`courtyard-review-${n}`,p=createBlankProject('Service Courtyard review',129);p.terrain.tagmap=['0:1snow001'];p.terrain.tagmap2=['1snow001'];p.terrain.worldWidth=14000;p.terrain.worldHeight=10000;
 p.terrain.heights=p.terrain.heights.map((_,i)=>terrain==='flat'?0:terrain==='valley'?Math.abs(Math.floor(i/129)-64)*8:terrain==='irregular'?100*Math.cos((i%129-64)/10)*Math.cos((Math.floor(i/129)-64)/10):100*Math.sin(i%129/10)*Math.cos(Math.floor(i/129)/10));
 const before=JSON.stringify(p),record={terrain,size,seed,rotation:[0,35,90][n%3],passed:false};
 try{const template=serviceCourtyardTemplate(seed,size,manifest);assert.deepEqual(template,serviceCourtyardTemplate(seed,size,manifest));
 const placement={size,x:3200,y:5000,rotation:record.rotation,radius:2600,checkAccess:true,terrainAware:n%2===1,targetCount:n>=6?{small:12,standard:18,large:24,massive:36}[size]:0},areas=serviceCourtyardAreas(p,placement.x,placement.y,placement.rotation);
 const layout=createCreativeBaseLayout(p,manifest,'service-courtyard',`courtyard-${size}`,seed,placement);
 record.terrainAware=placement.terrainAware;record.targetCount=placement.targetCount;record.candidateSeed=layout.metadata['formation.candidateSeed'];
 assert.equal(layout.metadata['formation.snapPolicy'],'shared-footprint-v2');assert.deepEqual(JSON.parse(layout.metadata[BUILD_AREAS_KEY]),areas);
 if(placement.targetCount)assert.equal(layout.entities.filter(e=>e.team===1).length,placement.targetCount);
 const trial={...p,entities:layout.entities,validation:layout.validation};assert.deepEqual(validateProject(trial).filter(i=>i.severity==='error'),[]);assert.deepEqual(checkBuildAreas(areas,layout.entities,14000,10000,manifest),[]);record.pairing=analyzeRotationalEntityPairs(trial,manifest);assert.ok(record.pairing.passed,'Strict paired placement failed: '+JSON.stringify(record.pairing));
 record.passed=true;record.countPerTeam=layout.entities.filter(e=>e.team===1).length;record.layoutHash=createHash('sha256').update(JSON.stringify(layout.entities)).digest('hex');
 if(!report.representatives.some(r=>r.terrain===terrain&&r.size===size)){const saved=structuredClone(p);saved.baseLayouts.push(layout);activateBaseLayout(saved,layout.id);const file=`${out}/${terrain}-${size}.json`;await fs.writeFile(file,JSON.stringify(saved));report.representatives.push({terrain,size,file});}
 }catch(e){record.reason=e.message;}
 assert.equal(JSON.stringify(p),before,'Review must not change source fixture');report.cases.push(record);if(n===11){await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log(`${terrain} ${size}: ${report.cases.filter(c=>c.terrain===terrain&&c.size===size&&c.passed).length}/12 accepted`);}
}
await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({cases:report.cases.length,passed:report.cases.filter(c=>c.passed).length,rejected:report.cases.filter(c=>!c.passed).length,representatives:report.representatives.length,report:`${out}/report.json`,reasons:[...new Set(report.cases.filter(c=>!c.passed).map(c=>c.reason))].slice(0,8)}));
