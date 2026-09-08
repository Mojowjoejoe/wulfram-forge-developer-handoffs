import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {frontierCampTemplate,frontierExpansionAreas,FRONTIER_CAMP_VERSION} from '../lib/frontier-camp.ts';
import {createCreativeBaseLayout} from '../lib/builtin-base-layouts.ts';
import {BUILD_AREAS_KEY,checkBuildAreas} from '../lib/build-areas.ts';
import {createBlankProject,activateBaseLayout,validateProject} from '../lib/wulfram.ts';
import {analyzeRotationalEntityPairs} from '../lib/balanced-map-analysis.ts';
const manifest=JSON.parse(await fs.readFile('public/assets/manifest.json','utf8')),out='outputs/frontier-camp-review-v3';await fs.mkdir(out,{recursive:true});
const report={version:FRONTIER_CAMP_VERSION,catalogStatus:'experimental-not-listed',cases:[],representatives:[],limits:'Offline power, spacing, pair and reserved-space checks. No game trial, catalog UI or portable favorite acceptance yet.'};
for(const terrain of ['flat','valley','irregular','asymmetric'])for(const size of ['small','standard','large','massive'])for(let n=0;n<12;n++){
 const seed=`frontier-review-${n}`,p=createBlankProject('Frontier Camp review',129);p.terrain.tagmap=['0:1snow001'];p.terrain.tagmap2=['1snow001'];p.terrain.worldWidth=12000;p.terrain.worldHeight=8000;
 p.terrain.heights=p.terrain.heights.map((_,i)=>terrain==='flat'?0:terrain==='valley'?Math.abs(Math.floor(i/129)-64)*8:terrain==='irregular'?100*Math.cos((i%129-64)/10)*Math.cos((Math.floor(i/129)-64)/10):100*Math.sin(i%129/10)*Math.cos(Math.floor(i/129)/10));
 const before=JSON.stringify(p),record={terrain,size,seed,rotation:[0,35,90][n%3],passed:false};
 try{const template=frontierCampTemplate(seed,size,manifest);assert.deepEqual(template,frontierCampTemplate(seed,size,manifest));
 const placement={size,x:2800,y:4000,rotation:record.rotation,radius:2400,checkAccess:true,terrainAware:n%2===1,targetCount:n>=6?{small:9,standard:16,large:24,massive:32}[size]:0},areas=frontierExpansionAreas(p,placement.x,placement.y,placement.rotation);
 const layout=createCreativeBaseLayout(p,manifest,'frontier-camp',`frontier-${size}`,seed,placement);
 record.terrainAware=placement.terrainAware;record.targetCount=placement.targetCount;record.candidateSeed=layout.metadata['formation.candidateSeed'];
 assert.equal(layout.metadata['formation.snapPolicy'],'shared-footprint-v2');assert.deepEqual(JSON.parse(layout.metadata[BUILD_AREAS_KEY]),areas);
 if(placement.targetCount)assert.equal(layout.entities.filter(e=>e.team===1).length,placement.targetCount);
 const trial={...p,entities:layout.entities,validation:layout.validation};assert.deepEqual(validateProject(trial).filter(i=>i.severity==='error'),[]);assert.deepEqual(checkBuildAreas(areas,layout.entities,12000,8000,manifest),[]);record.pairing=analyzeRotationalEntityPairs(trial,manifest);assert.ok(record.pairing.passed,'Strict paired placement failed: '+JSON.stringify(record.pairing));
 record.passed=true;record.countPerTeam=layout.entities.filter(e=>e.team===1).length;record.layoutHash=createHash('sha256').update(JSON.stringify(layout.entities)).digest('hex');
 if(!report.representatives.some(r=>r.terrain===terrain&&r.size===size)){const saved=structuredClone(p);saved.baseLayouts.push(layout);activateBaseLayout(saved,layout.id);const file=`${out}/${terrain}-${size}.json`;await fs.writeFile(file,JSON.stringify(saved));report.representatives.push({terrain,size,file});}
 }catch(e){record.reason=e.message;}
 assert.equal(JSON.stringify(p),before,'Review must not change source fixture');report.cases.push(record);
}
await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({cases:report.cases.length,passed:report.cases.filter(c=>c.passed).length,rejected:report.cases.filter(c=>!c.passed).length,representatives:report.representatives.length,report:`${out}/report.json`,reasons:[...new Set(report.cases.filter(c=>!c.passed).map(c=>c.reason))].slice(0,8)}));
