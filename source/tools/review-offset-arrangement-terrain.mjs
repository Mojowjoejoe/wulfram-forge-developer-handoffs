import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createBlankProject,activateBaseLayout,validateProject} from '../lib/wulfram.ts';
import {createCreativeBaseLayout} from '../lib/builtin-base-layouts.ts';
import {withEntranceRouting,inspectEntranceRouting} from '../lib/entrance-routing.ts';
import {analyzeRotationalEntityPairs} from '../lib/balanced-map-analysis.ts';
const out=process.argv[2];if(!out)throw new Error('Supply a new evidence directory.');await fs.mkdir(out);
const manifest=JSON.parse(await fs.readFile('public/assets/manifest.json','utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const policy={version:1,bindings:[1,2].map(team=>({team,corridorId:`offset-bastion-approach-${team}`,direction:'forward'}))};
const report={scope:'Current source, synthetic uneven terrain, explicit entrances. No native/game/novice proof.',cases:[],representatives:[],sourceHashes:{}};
for(const file of ['lib/offset-bastion.ts','lib/builtin-base-layouts.ts','lib/entrance-routing.ts','tools/review-offset-arrangement-terrain.mjs'])report.sourceHashes[file]=hash(await fs.readFile(file));
for(const arrangement of ['wide-front','deep-court','split-wings'])for(const terrain of ['valley','irregular','asymmetric'])for(const size of ['small','standard','large','massive'])for(let index=0;index<12;index++){
 const source=createBlankProject('Offset arrangement terrain review',129);source.terrain.worldWidth=12000;source.terrain.worldHeight=8000;
 source.terrain.heights=source.terrain.heights.map((_,i)=>terrain==='valley'?Math.abs(Math.floor(i/129)-64)*8:terrain==='irregular'?100*Math.cos((i%129-64)/10)*Math.cos((Math.floor(i/129)-64)/10):100*Math.sin(i%129/10)*Math.cos(Math.floor(i/129)/10));
 const before=JSON.stringify(source),seed=`offset-terrain-${index}`,placement={size,x:2800,y:4000,rotation:[0,35,90][index%3],radius:2400,checkAccess:true,terrainAware:index%2===1,targetCount:index>=6?{small:12,standard:18,large:26,massive:34}[size]:0,offsetArrangement:arrangement};
 const row={arrangement,terrain,size,index,seed,placement,sourceHash:hash(before),status:'pending',stage:'generation'};
 let generated,layout;
 try{generated=createCreativeBaseLayout(source,manifest,'offset-bastion',`terrain-${arrangement}-${size}`,seed,placement);}
 catch(error){row.status='rejected';row.reason=String(error);}
 if(generated){
  // Determinism and invariants are test failures, never reported as expected rejections.
  const repeat=createCreativeBaseLayout(source,manifest,'offset-bastion',generated.id,seed,placement);assert.deepEqual(generated.entities,repeat.entities);assert.deepEqual(generated.metadata,repeat.metadata);
  row.stage='entrance-policy';
  try{layout=withEntranceRouting(source,manifest,generated,policy);}catch(error){row.status='rejected';row.reason=String(error);}
 }
 if(layout){
  const saved=structuredClone(source);saved.baseLayouts.push(layout);activateBaseLayout(saved,layout.id);
  assert.deepEqual(validateProject(saved).filter(i=>i.severity==='error'),[]);assert.ok(analyzeRotationalEntityPairs(saved,manifest).passed);assert.deepEqual(saved.terrain,source.terrain);
  const access=inspectEntranceRouting(saved,manifest,layout);assert.equal(access.length,2);assert.ok(access.every(a=>a.routes.length>0));
  row.status='accepted';row.stage='verified';row.layoutHash=hash(JSON.stringify(layout.entities));row.routeCount=access.reduce((n,a)=>n+a.routes.length,0);
  // Keep the predetermined first seed; never substitute an easier seed silently.
  if(index===0){const file=path.join(out,`${arrangement}-${terrain}-${size}.json`),bytes=JSON.stringify(saved);await fs.writeFile(file,bytes,{flag:'wx'});report.representatives.push({arrangement,terrain,size,index,file,sha256:hash(bytes)});}
 }
 assert.equal(JSON.stringify(source),before);report.cases.push(row);
 await fs.appendFile(path.join(out,'cases.jsonl'),JSON.stringify(row)+'\n');
 if(index===11)console.log(`${arrangement} ${terrain} ${size}: ${report.cases.filter(c=>c.arrangement===arrangement&&c.terrain===terrain&&c.size===size&&c.status==='accepted').length}/12 accepted`);
}
report.accepted=report.cases.filter(c=>c.status==='accepted').length;report.rejected=report.cases.length-report.accepted;
await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2),{flag:'wx'});
console.log(JSON.stringify({report:path.join(out,'report.json'),cases:report.cases.length,accepted:report.accepted,rejected:report.rejected}));
