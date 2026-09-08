import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const [destination,...reports]=process.argv.slice(2);
if(!destination||reports.length!==4)throw new Error('Supply a new output JSON and four native report.json paths.');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),cases=[];
let executableHash;
for(const reportPath of reports){
 const bytes=await fs.readFile(reportPath),report=JSON.parse(bytes),r=report.entranceLibrary;
 assert.equal(report.passed,true);assert.deepEqual(report.rendererErrors,[]);
 assert.ok(r&&r.version===4&&r.reservationVersion===3&&r.rotation===90&&r.transformedGeometry&&r.allPadEndpoints&&r.orderedTurns&&r.bindingsPreserved);
 assert.ok(report.offsetPreview.libraryReimport&&report.offsetPreview.mapArchiveRoundTrip&&report.offsetPreview.restartPreserved);
 const actualHash=hash(await fs.readFile(report.executable));assert.equal(actualHash,report.executableSha256);
 if(executableHash)assert.equal(actualHash,executableHash);else executableHash=actualHash;
 const libraryBytes=await fs.readFile(report.offsetPreview.exported),library=JSON.parse(libraryBytes);
 assert.equal(library.version,4);assert.equal(library.bases.length,1);assert.equal(library.bases[0].reservations.version,3);
 assert.equal(library.bases[0].reservations.entranceRouting.bindings.length,2);
 const targetBytes=await fs.readFile(path.join(path.dirname(reportPath),'larger-map.json')),target=JSON.parse(targetBytes);
 assert.equal(target.terrain.worldWidth,14000);assert.equal(target.terrain.worldHeight,10000);
 cases.push({...r,report:path.resolve(reportPath),reportSha256:hash(bytes),library:report.offsetPreview.exported,librarySha256:hash(libraryBytes),targetSha256:hash(targetBytes),mapArchiveRoundTrip:true,restartPreserved:true});
}
assert.deepEqual(cases.map(c=>c.size).sort(),['large','massive','small','standard']);
const result={passed:true,scope:'Four flat-source Offset sizes, native version-4 favorite reuse at 90 degrees on a larger flat map. Not multi-seed visual, uneven-terrain portability, all-edit constraint, family admission or gameplay proof.',executableSha256:executableHash,cases};
await fs.writeFile(destination,JSON.stringify(result,null,2),{flag:'wx'});
console.log(JSON.stringify({passed:true,report:destination,sizes:cases.map(c=>c.size),executableSha256:executableHash}));
