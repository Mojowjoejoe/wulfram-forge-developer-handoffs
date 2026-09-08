import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const [output,sourceReport,...nativeReports]=process.argv.slice(2);
if(!output||!sourceReport||nativeReports.length!==3)throw new Error('Supply new output, source report and three native reports.');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const bytes=await fs.readFile(sourceReport),source=JSON.parse(bytes);
assert.equal(source.cases.length,432);assert.ok(source.cases.every(c=>['accepted','rejected'].includes(c.status)));
for(const [file,expected] of Object.entries(source.sourceHashes))assert.equal(hash(await fs.readFile(file)),expected,`Source changed during review: ${file}`);
for(const r of source.representatives)assert.equal(hash(await fs.readFile(r.file)),r.sha256);
const summary=[];
for(const arrangement of ['wide-front','deep-court','split-wings'])for(const terrain of ['valley','irregular','asymmetric']){
 const rows=source.cases.filter(c=>c.arrangement===arrangement&&c.terrain===terrain);assert.equal(rows.length,48);
 for(const size of ['small','standard','large','massive'])assert.deepEqual(rows.filter(c=>c.size===size).map(c=>c.index),Array.from({length:12},(_,i)=>i));
 summary.push({arrangement,terrain,accepted:rows.filter(c=>c.status==='accepted').length,rejected:rows.filter(c=>c.status==='rejected').length,rejectionStages:[...new Set(rows.filter(c=>c.status==='rejected').map(c=>c.stage))]});
}
const native=[],seen=new Set();let executableHash;
for(const file of nativeReports){
 const raw=await fs.readFile(file),r=JSON.parse(raw);assert.equal(r.passed,true);assert.deepEqual(r.rendererErrors,[]);assert.equal(r.offsetMatrix.length,12);
 assert.equal(hash(await fs.readFile(r.executable)),r.executableSha256);if(executableHash)assert.equal(r.executableSha256,executableHash);executableHash=r.executableSha256;
 const arrangement=r.offsetMatrix[0].arrangement;assert.ok(['wide-front','deep-court','split-wings'].includes(arrangement));assert.ok(!seen.has(arrangement));seen.add(arrangement);
 for(const terrain of ['flat','valley','irregular'])for(const size of ['small','standard','large','massive']){
  const rows=r.offsetMatrix.filter(c=>c.terrain===terrain&&c.size===size);assert.equal(rows.length,1);const row=rows[0];assert.equal(row.arrangement,arrangement);
  for(const key of ['fixturePreserved','previewPreserved','terrainPreserved','undoRedo'])assert.equal(row[key],true);
  const fixture=path.join('outputs/offset-bastion-review-v1',`${terrain}-${size}.json`);assert.equal(hash(await fs.readFile(fixture)),row.fixtureSha256);
 }
 native.push({file,sha256:hash(raw),arrangement,cases:12});
}
await fs.writeFile(output,JSON.stringify({passed:true,sourceReport,sourceReportSha256:hash(bytes),summary,native,executableHash,scope:'Synthetic terrain source sweep and native generation/Undo. Native matrix uses automatic sampled access; explicit entrance-policy evidence is source-only here. No game or family admission proof.'},null,2),{flag:'wx'});
console.log(output);
