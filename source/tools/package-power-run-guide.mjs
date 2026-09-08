import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
const dir=path.resolve('outputs/canyon-citadel-central-outpost-v3');
const original=await fs.readFile(path.join(dir,'Canyon-Citadel-Power-Run-v3.zip'));
const zip=await JSZip.loadAsync(original);
const guide=await fs.readFile(path.join(dir,'MAP_SUMMARY_AND_STRATEGY.md'));
assert.ok(!zip.file('MAP_SUMMARY_AND_STRATEGY.md'));
zip.file('MAP_SUMMARY_AND_STRATEGY.md',guide);
const screenshotDir=path.resolve(process.argv[2]??'outputs-desktop-test-nlGwFg');
const pictures=[['showcase-overview.png','01-map-overview.png'],['showcase-near-side-quarter.png','02-home-base-angle.png'],['central-outpost-close.png','03-central-outpost.png'],['showcase-opposite-side.png','04-opposite-base-angle.png']];
for(const [source,name] of pictures) {
  const png=await fs.readFile(path.join(screenshotDir,source));
  assert.equal(png.subarray(1,4).toString(),'PNG');
  zip.file(`screenshots/${name}`,png);
}
const bytes=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
const check=await JSZip.loadAsync(bytes);
const prior=await JSZip.loadAsync(original);
for(const entry of Object.values(prior.files))if(!entry.dir)assert.deepEqual(await check.file(entry.name).async('nodebuffer'),await entry.async('nodebuffer'));
assert.deepEqual(await check.file('MAP_SUMMARY_AND_STRATEGY.md').async('nodebuffer'),guide);
for(const [source,name] of pictures)assert.deepEqual(await check.file(`screenshots/${name}`).async('nodebuffer'),await fs.readFile(path.join(screenshotDir,source)));
const destination=path.join(dir,'Canyon-Citadel-Power-Run-v3-four-views.zip');
await fs.writeFile(destination,bytes,{flag:'wx'});
console.log(destination);
