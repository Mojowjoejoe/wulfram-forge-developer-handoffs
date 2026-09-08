import {modelNameFor} from '../lib/wulfram.ts';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readMapArchive} from '../lib/map-package.ts';
import {inspectBuildingSupport} from './inspect-building-support.mjs';
const [output,...files]=process.argv.slice(2);if(!output||files.length!==6)throw new Error('Supply new output and six native reports.');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),manifestBytes=await fs.readFile('public/assets/manifest.json'),manifest=JSON.parse(manifestBytes);
const cases=[],seen=new Set(),modelHashes={};let exeHash;
for(const file of files){
 const bytes=await fs.readFile(file),r=JSON.parse(bytes),e=r.entranceLibrary;
 assert.equal(r.passed,true);assert.deepEqual(r.rendererErrors,[]);assert.equal(e.size,'massive');assert.equal(e.version,4);assert.equal(e.reservationVersion,3);
 for(const key of ['bindingsPreserved','relocated','transformedGeometry','allPadEndpoints','orderedTurns'])assert.equal(e[key],true);
 const arrangement=r.offsetArrangement.arrangement,terrain=e.targetTerrain,key=`${arrangement}/${terrain}`;assert.ok(!seen.has(key));seen.add(key);
 assert.ok(['wide-front','deep-court','split-wings'].includes(arrangement));assert.ok(['valley','irregular'].includes(terrain));
 assert.equal(hash(await fs.readFile(r.executable)),r.executableSha256);if(exeHash)assert.equal(exeHash,r.executableSha256);exeHash=r.executableSha256;
 const root=path.dirname(file),targetBytes=await fs.readFile(path.join(root,'larger-map.json'));assert.equal(hash(targetBytes),e.targetSha256);
 const archive=path.join(root,'offset-bastion-library-downloads',`offset-${terrain}-favorite-target.zip`),archiveBytes=await fs.readFile(archive),entries=await readMapArchive(archiveBytes),project=JSON.parse(entries.find(e=>e.name.endsWith('/wulfram-project.json')).text);
 assert.deepEqual(project.terrain,JSON.parse(targetBytes).terrain);
 for(const entity of project.entities.filter(e=>e.token!=='*')){const url=manifest.models[modelNameFor(entity)].url;modelHashes[url]=hash(await fs.readFile(`public${url}`));}
 const support=inspectBuildingSupport(project,manifest);assert.equal(support.length,68);assert.ok(support.every(s=>s.minimumGap>=-0.01));
 cases.push({file,reportHash:hash(bytes),arrangement,terrain,targetHash:e.targetSha256,archive,archiveHash:hash(archiveBytes),structures:support.length,renderVertices:support.reduce((n,s)=>n+s.samples,0),minimumVertexGap:Math.min(...support.map(s=>s.minimumGap)),maximumClosestVertexGap:Math.max(...support.map(s=>s.minimumGap))});
}
await fs.writeFile(output,JSON.stringify({passed:true,exeHash,modelHashes,manifestHash:hash(manifestBytes),supportCheckerHash:hash(await fs.readFile('tools/inspect-building-support.mjs')),scope:'Six native massive policy-bearing favorite round trips; post-native current-render-model vertex support audit. Vertex samples prove non-penetration against editor height samples only; they do not prove ground contact, absence of floating, triangle-interior or game collision.',cases},null,2),{flag:'wx'});
console.log(JSON.stringify({output,cases:cases.length,minimumVertexGap:Math.min(...cases.map(c=>c.minimumVertexGap))}));
