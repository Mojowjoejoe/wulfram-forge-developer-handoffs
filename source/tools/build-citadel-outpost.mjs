import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {instantiateBaseTemplate,synchronizeActiveBaseLayout} from '../lib/wulfram.ts';
import {analyzeBalancedProject} from '../lib/balanced-map-analysis.ts';
import {createMapArchive,readMapArchive} from '../lib/map-package.ts';

const out=path.resolve('outputs/canyon-citadel-central-outpost-v2');
assert.ok(!fs.existsSync(out),'Preserve prior builds');
const source=JSON.parse(fs.readFileSync('outputs/canyon-citadel-crossroads-v2/project.json'));
const project=structuredClone(source);
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json'));
// Remove close dominant terrain: a low basin to 1,100 u with a smooth outer transition.
for(let i=0;i<=Math.floor(project.terrain.heights.length/2);i++) {
  const distance=Math.hypot(i%257*25-3200,Math.floor(i/257)*25-3200);
  const blend=Math.max(0,Math.min(1,(distance-1100)/600));
  const weight=blend*blend*(3-2*blend);
  const old=project.terrain.heights[i];
  const height=Number((Math.min(old,-45)+(old-Math.min(old,-45))*weight).toFixed(6));
  project.terrain.heights[i]=height;
  project.terrain.heights[project.terrain.heights.length-1-i]=height;
}
const template={id:'central-neutral-repair',name:'Central neutral repair outpost',sourceMap:'Canyon Citadel',sourceState:'authored',sourceTeam:0,sourceWorldSize:[6400,6400],sourceAnchor:[0,0],unitCount:1,footprint:{width:100,height:100},units:[{token:'r',offset:[0,0],groundOffset:0,rotation:[0,0,Math.PI/4],active:1}]};
const placement=instantiateBaseTemplate(template,project.terrain,[3200,3200],0,1,0,manifest,undefined,()=> 'central-neutral-repair-1');
assert.equal(placement.skippedWithoutModel,0);assert.equal(placement.entities.length,1);
project.entities.push(...placement.entities);
synchronizeActiveBaseLayout(project,project.updatedAt);
project.name='Canyon Citadel — Central Outpost';
project.metadata['showcase.outpost']=JSON.stringify({version:'central-neutral-repair-v2',entityId:placement.entities[0].id,startsUnpowered:true,takeover:'Player-described power-based takeover; requires in-game verification',lowBasinRadius:1100,transitionEndRadius:1700,routeBypassRadius:240});
assert.deepEqual(project.terrain.textureIds,source.terrain.textureIds);
assert.deepEqual(project.entities.slice(0,54),source.entities);
const identity=JSON.parse(project.metadata['showcase.identity']);
const analysis=analyzeBalancedProject(project,identity.baseAnchors,identity.objectiveAnchors,{},manifest);
assert.equal(analysis.terrain.passed,true);assert.equal(analysis.entityPairing.passed,true);
const errors=analysis.projectIssues.filter(i=>i.severity==='error');
assert.equal(errors.length,1);
assert.equal(errors[0].code,'power');assert.equal(errors[0].entityId,placement.entities[0].id);
const bytes=Buffer.from(await createMapArchive(project));
const entries=await readMapArchive(bytes);
const imported=JSON.parse(entries.find(e=>e.name.endsWith('/wulfram-project.json')).text);
assert.deepEqual(imported.entities,JSON.parse(JSON.stringify(project.entities)));assert.deepEqual(imported.terrain,project.terrain);
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'Canyon-Citadel-Central-Outpost-v2.zip'),bytes);
fs.writeFileSync(path.join(out,'project.json'),JSON.stringify(project));
fs.writeFileSync(path.join(out,'analysis.json'),JSON.stringify({stage:'PRIVATE PLAYTEST CANDIDATE',expectedUnpoweredNeutralError:true,analysis},null,2));
fs.writeFileSync(path.join(out,'SHA256SUMS.txt'),`${createHash('sha256').update(bytes).digest('hex')}  Canyon-Citadel-Central-Outpost-v2.zip\n`);
console.log(JSON.stringify({out,entities:project.entities.length,errors}));
