import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const aggregate=path.resolve(process.argv[2]??'');const baseline=JSON.parse(await fs.readFile(aggregate,'utf8'));
assert.ok(baseline.finishedAt,'Wait for the existing aggregate to finish before the targeted native rerun.');
const original=baseline.steps.find(s=>s.name==='creative-bases');assert.ok(original&&original.code!==0,'No failed creative step to replace.');
const flags={WULFRAM_BASE_LIBRARY_TEST:'1',WULFRAM_PORTABLE_LIBRARY_TEST:'1',WULFRAM_DISTRICT_TEST:'1',WULFRAM_RELATIONSHIP_TEST:'1'};assert.deepEqual(original.flags,flags);
const sha=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
assert.equal(await sha(baseline.executable),baseline.executableSha256);
const out=await fs.mkdtemp(path.join(path.dirname(aggregate),'creative-rerun-'));
const script=path.resolve('tools/mcp/test-creative-layouts.mjs'),args=['--experimental-strip-types',script,baseline.executable];
const report={passed:false,aggregate,aggregateSha256:await sha(aggregate),executable:baseline.executable,executableSha256:baseline.executableSha256,script,scriptSha256:await sha(script),args,flags,startedAt:new Date().toISOString()};
report.fixtures=[];
for(const file of ['outputs/base-count-layouts-v1/Base-Placement-Five-Layouts.zip','outputs/base-count-layouts-v1/Base-Placement-Five-Layouts.json']){const absolute=path.resolve(file);report.fixtures.push({path:absolute,sha256:await sha(absolute)});}
try{
 const env={...process.env};for(const key of Object.keys(env))if(key.startsWith('WULFRAM_')&&key!=='WULFRAM_NATIVE_OUTPUT_ROOT')delete env[key];Object.assign(env,flags);
 let output='';report.code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{env,windowsHide:true,stdio:['ignore','pipe','pipe']});child.stdout.on('data',d=>{output+=d;});child.stderr.on('data',d=>{output+=d;});child.on('error',reject);child.on('close',resolve);});
 report.log=path.join(out,'creative.log');await fs.writeFile(report.log,output);report.logSha256=await sha(report.log);assert.equal(report.code,0);
 const start=output.indexOf('{');assert.ok(start>=0);const receipt=JSON.parse(output.slice(start));assert.equal(receipt.passed,true);
 report.receipt=path.join(receipt.out,'report.json');const saved=JSON.parse(await fs.readFile(report.receipt,'utf8'));assert.deepEqual(saved,receipt);report.receiptSha256=await sha(report.receipt);
 assert.equal(await sha(script),report.scriptSha256);assert.equal(await sha(baseline.executable),report.executableSha256);assert.equal(await sha(aggregate),report.aggregateSha256);
 for(const fixture of report.fixtures)assert.equal(await sha(fixture.path),fixture.sha256);
 report.buildAssociation='Wrapper-recorded actual invocation and verified EXE hash; legacy child does not embed EXE hash.';report.passed=true;
}catch(error){report.error=error.stack;process.exitCode=1;}
report.finishedAt=new Date().toISOString();await fs.writeFile(path.join(out,'replacement.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
