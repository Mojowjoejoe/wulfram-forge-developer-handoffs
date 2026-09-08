import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {checkFormationAccessViaCorridor} from '../lib/formation-access.ts';
import {readBuildAreas,BUILD_AREAS_KEY} from '../lib/build-areas.ts';
const [source,destination]=process.argv.slice(2);if(!source||!destination)throw new Error('Usage: review-entrance-connections <Offset matrix directory> <new report.json>');
const manifest=JSON.parse(await fs.readFile('public/assets/manifest.json','utf8')),cases=[];
for(const terrain of ['flat','valley','irregular'])for(const size of ['small','standard','large','massive']){
 const file=path.join(source,`matrix-${terrain}-${size}.json`),bytes=await fs.readFile(file),project=JSON.parse(bytes),before=JSON.stringify(project);
 const areas=readBuildAreas(project.baseLayouts.find(l=>l.id===project.activeBaseLayoutId).metadata[BUILD_AREAS_KEY]);
 for(const team of [1,2]){
  const area=areas.find(a=>a.id===`offset-bastion-approach-${team}`);assert.equal(area?.kind,'corridor');
  const row={terrain,size,team,file,sha256:createHash('sha256').update(bytes).digest('hex'),passed:false};
  try{const result=checkFormationAccessViaCorridor(project,manifest,team,area.points);row.passed=true;row.result=result;}catch(error){row.error=String(error);}
  assert.equal(JSON.stringify(project),before);assert.deepEqual(await fs.readFile(file),bytes);cases.push(row);
 }
}
const report={scope:'Opt-in authored entrance connection analysis on retained maps; not native GUI, gameplay or family admission',cases,passed:cases.filter(c=>c.passed).length,rejected:cases.filter(c=>!c.passed).length};
await fs.writeFile(destination,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({report:destination,passed:report.passed,rejected:report.rejected}));
