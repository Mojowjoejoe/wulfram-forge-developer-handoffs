import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export async function verifyAnchorNativeReceipt(receipt,executableSha256){
 const sha=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
 assert.equal(receipt.passed,true);assert.equal(receipt.executableSha256,executableSha256);assert.deepEqual(receipt.rendererErrors,[]);
 const artifacts=[];const check=async(path,hash)=>{assert.equal(await sha(path),hash);artifacts.push({path,sha256:hash});};
 await check(receipt.fixture.path,receipt.fixture.sha256);await check(receipt.saved.path,receipt.saved.sha256);
 for(const key of ['freshProcessFileReopen','fullMapEquality','allRoutesEquality','sixGuiRows'])assert.equal(receipt.checks[key],true);
 assert.deepEqual(receipt.library.map(c=>[c.size,c.count]),[['small',15],['standard',21],['large',30],['massive',42]]);
 assert.deepEqual(receipt.expandedGui,{targetCount:39,total:78,previewApplyUndo:true});
 assert.equal(receipt.authored.captureReadOnly,true);assert.equal(receipt.authored.previewApplyUndo,true);assert.equal(receipt.authored.units,78);assert.deepEqual(receipt.authored.translation,[500,500,0]);
 for(const prefix of ['package','destination','reused'])await check(receipt.authored[`${prefix}Path`],receipt.authored[`${prefix}Sha256`]);
 const library=receipt.authored.library;for(const key of ['exportRemovePreviewImport','mapHistoryUnchanged','libraryAndReusedMapReopened'])assert.equal(library[key],true);assert.notEqual(library.priorPid,library.restartedPid);await check(library.exportPath,library.exportSha256);
 const expected=['flat','hills','steep'].flatMap(terrainKind=>['small','standard','large','massive'].flatMap((size,i)=>['matrix-a','matrix-b'].map(seed=>[terrainKind,size,seed,[24,30,39,51][i]])));
 assert.deepEqual(receipt.matrix.map(c=>[c.terrainKind,c.size,c.seed,c.targetCount]),expected);
 for(const c of receipt.matrix){if(c.terrainKind==='steep'){assert.equal(c.rejected,true);assert.match(c.reason,/slope.*exceeds/i);}else{assert.equal(c.previewApplyUndo,true);assert.equal(c.units,c.targetCount*2);await check(c.candidatePath,c.candidateSha256);}}
 for(const kind of ['flat','hills','steep']){const hash=receipt.matrix.find(c=>c.terrainKind===kind).sourceSha256;assert.ok(receipt.matrix.filter(c=>c.terrainKind===kind).every(c=>c.sourceSha256===hash));await check(`${receipt.out}/matrix-${kind}.json`,hash);}
 return artifacts;
}
