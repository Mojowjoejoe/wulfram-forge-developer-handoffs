import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { createHash } from 'node:crypto';
import { readMapArchive } from '../lib/map-package.ts';
const root=path.resolve('outputs/icebound-showcase-v1');
const photos=path.resolve(process.argv[2]);
const receipt=JSON.parse(await fs.readFile(path.join(photos,'report.json'),'utf8'));
assert.equal(receipt.passed,true);assert.deepEqual(receipt.rendererErrors,[]);
const hash=b=>createHash('sha256').update(b).digest('hex');
const original=await fs.readFile(path.join(root,'Icebound-Citadel-Power-Run.zip'));
assert.equal(hash(original),receipt.fixtureSha256);
const zip=await JSZip.loadAsync(original,{checkCRC32:true});
const mapFiles=Object.values(zip.files).filter(f=>!f.dir);
const pictureNames=[['showcase-overview.png','01-overview.png'],['showcase-near-side-quarter.png','02-home-base.png'],['central-outpost-close.png','03-central-outpost.png'],['showcase-opposite-side.png','04-opposite-base.png']];
const added=new Map();
added.set('MAP_SUMMARY_AND_STRATEGY.md',await fs.readFile(path.join(root,'MAP_SUMMARY_AND_STRATEGY.md')));
for(const [source,name] of pictureNames) {
  const b=await fs.readFile(path.join(photos,source));assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.ok(b.readUInt32BE(16)>=1200);assert.ok(b.readUInt32BE(20)>=700);
  added.set(`screenshots/${name}`,b);
}
// RC45's legacy ZIP importer treats arbitrary .json files as project candidates.
// Keep human-readable diagnostic JSON in .txt files so direct ZIP import is safe.
for(const name of ['analysis.json','routes.json','base-cover.json'])added.set(`verification/${name}.txt`,await fs.readFile(path.join(root,name)));
added.set('verification/native-editor.json.txt',Buffer.from(JSON.stringify({passed:receipt.passed,executableSha256:receipt.executableSha256,mapSha256:receipt.fixtureSha256,steps:receipt.steps,rendererErrors:receipt.rendererErrors,expectedUnpoweredNeutralError:receipt.expectedUnpoweredNeutralError},null,2)));
for(const [name,b] of added)zip.file(name,b);
const checks=[];
for(const f of Object.values(zip.files).filter(f=>!f.dir))checks.push(`${hash(await f.async('nodebuffer'))}  ${f.name}`);
zip.file('SHA256SUMS.txt',checks.join('\n')+'\n');
const output=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
const check=await JSZip.loadAsync(output,{checkCRC32:true});
for(const f of mapFiles)assert.deepEqual(await check.file(f.name).async('nodebuffer'),await f.async('nodebuffer'));
for(const [name,b] of added)assert.deepEqual(await check.file(name).async('nodebuffer'),b);
const read=async b=>JSON.parse((await readMapArchive(b)).find(e=>e.name.endsWith('/wulfram-project.json')).text);
assert.deepEqual(await read(output),await read(original));
const destination=path.join(root,'Icebound-Citadel-Private-Showcase-v2.zip');
await fs.writeFile(destination,output,{flag:'wx'});
await fs.writeFile(path.join(root,'SHOWCASE_V2_SHA256.txt'),`${hash(output)}  Icebound-Citadel-Private-Showcase-v2.zip\n`,{flag:'wx'});
console.log(JSON.stringify({destination,bytes:output.length,sha256:hash(output),screenshots:4,mapEntriesUnchanged:true,crcPassed:true}));
