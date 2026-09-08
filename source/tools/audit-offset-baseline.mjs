// Supplemental audit for the v77 aggregate started before its receipt checks were strengthened.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const reportPath=path.resolve(process.argv[2]??'');
const report=JSON.parse(await fs.readFile(reportPath,'utf8'));
const step=report.steps.find(s=>s.name==='offset-library-entrances');
assert.equal(step?.code,0,'Offset step must have completed successfully');
const receipt=JSON.parse(await fs.readFile(step.receipt,'utf8'));
assert.equal(receipt.passed,true);assert.deepEqual(receipt.rendererErrors,[]);
assert.equal(receipt.executableSha256.toLowerCase(),report.executableSha256.toLowerCase());
assert.equal(receipt.offsetLibrary.cards,4);assert.equal(receipt.offsetLibrary.reviewedFamily,true);
assert.equal(receipt.offsetArrangement.arrangement,'deep-court');assert.equal(receipt.offsetArrangement.stalePreviewRejected,true);
assert.match(receipt.planBounds,/both team model boxes \+ entrance/);
for(const key of ['previewPreserved','orderedRoute','applyUndoRedo'])assert.equal(receipt.entrancePolicy[key],true);
const portable=receipt.entranceLibrary;
assert.equal(portable.version,4);assert.equal(portable.reservationVersion,3);assert.equal(portable.rotation,90);
for(const key of ['bindingsPreserved','transformedGeometry','allPadEndpoints','orderedTurns'])assert.equal(portable[key],true);
assert.match(portable.targetSha256,/^[a-f0-9]{64}$/i);
const fixtureSha256=createHash('sha256').update(await fs.readFile(receipt.fixture)).digest('hex');
// Observed before the Offset child began, independently of its result.
assert.equal(fixtureSha256,'1ca4c870a9920a274d76f1ec1a27dedc7341590986b9b917fb4e263c40607e8b');
assert.equal(receipt.fixtureSha256.toLowerCase(),fixtureSha256);
const result={passed:true,aggregate:reportPath,receipt:step.receipt,fixtureSha256,executableSha256:report.executableSha256,scope:'Offset category, bounds, policy and portable entrance receipt; not whole aggregate acceptance'};
await fs.writeFile(path.join(path.dirname(reportPath),'offset-receipt-audit.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
