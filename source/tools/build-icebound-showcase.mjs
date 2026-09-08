import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { stampTerrain } from '../lib/terrain-stamp.ts';
import { sampleSlopeDegrees } from '../lib/wulfram.ts';
import { paintTerrainTextureVertex, parseTerrainTextureTag } from '../lib/terrain-textures.ts';
import { analyzeBalancedProject } from '../lib/balanced-map-analysis.ts';
import { createMapArchive, readMapArchive } from '../lib/map-package.ts';
const root = path.resolve(process.argv[2] ?? 'outputs/icebound-showcase-v1');
try { await fs.access(root); throw new Error('Preserve prior output: choose new directory'); } catch (e) { if(e.code !== 'ENOENT')throw e; }
const sourcePath = 'outputs/canyon-citadel-ice-v2/Canyon-Citadel-Icebound-v1.zip';
const powerPath = 'outputs/canyon-citadel-central-outpost-v3/Canyon-Citadel-Power-Run-v3.zip';
const hash = b => createHash('sha256').update(b).digest('hex');
const bytes = await fs.readFile(sourcePath), powerHash = hash(await fs.readFile(powerPath));
const archive = await readMapArchive(bytes);
const source = JSON.parse(archive.find(e => e.name.endsWith('/wulfram-project.json')).text);
const project = structuredClone(source), t = project.terrain;
const manifest = JSON.parse(await fs.readFile('public/assets/manifest.json', 'utf8'));
const identity = JSON.parse(project.metadata['showcase.identity']);
const smooth = (a,b,v) => { const x=Math.max(0,Math.min(1,(v-a)/(b-a)));return x*x*(3-2*x); };
const field = i => {
  const x=i%257*25,y=Math.floor(i/257)*25,u=(x+y-6400)/3200/Math.SQRT2,v=(x-y)/3200/Math.SQRT2;
  const flank=.64*Math.cos(Math.PI/2*Math.min(1,Math.abs(u)/.82));
  return {x,y,u,v,road:Math.min(Math.abs(v),Math.abs(Math.abs(v)-flank))*3200,
    base:Math.min(...identity.baseAnchors.map(([bx,by])=>Math.hypot(x-bx,y-by))),center:Math.hypot(x-3200,y-3200)};
};
const stamps = [
  {x:5100,y:1300,length:1800,width:1000,rotation:45,amplitude:150,seed:'icebound-spine-north'},
  {x:3900,y:1000,length:1300,width:850,rotation:25,amplitude:95,seed:'icebound-shoulder'},
];
for (const stamp of stamps) {
  const result = stampTerrain(t,{preset:'ridge',radius:900,aspect:.6,edgePower:1.75,mirror:true,
    naturalness:.8,roughness:.15,bend:.65,blend:.65,shapeVersion:'natural-v2',...stamp});
  for(let i=0;i<=Math.floor(t.heights.length/2);i++) {
    const f=field(i);
    // Authored composition guard: preserve complete home reserves, all three route ribbons,
    // and the whole low-ground center; taper additions outside their boundaries.
    const protection=smooth(1950,2300,f.base)*smooth(1700,2100,f.center)*smooth(240,550,f.road);
    const height=Number((t.heights[i]+result.deltas[i]*protection).toFixed(6));
    t.heights[i]=height;t.heights[t.heights.length-1-i]=height;
  }
}
let changed=0,maximumAddition=0;
for(let i=0;i<t.heights.length;i++) {
  const f=field(i); const delta=t.heights[i]-source.terrain.heights[i];
  if(delta!==0)changed++;maximumAddition=Math.max(maximumAddition,delta);
  if(f.base<=1950||f.center<=1700||f.road<=240)assert.equal(t.heights[i],source.terrain.heights[i]);
}
assert.ok(changed>0);
const palette=['1snow001','4snow001','11ice001','snowrocks002','rockwall001','groundstruct001'];
for(const n of palette)assert.ok(manifest.terrainTextures[n]);
const names=Array(t.heights.length),counts={};
for(let i=0;i<=Math.floor(names.length/2);i++) {
  const f=field(i),h=t.heights[i],slope=sampleSlopeDegrees(t,f.x,f.y);
  let name='1snow001';
  if(slope>16&&h>35)name='snowrocks002';
  if(slope>34&&h>100)name='rockwall001';
  if(h< -70)name='4snow001';
  if(h< -100)name='11ice001';
  // One coherent frozen apron makes the neutral objective readable, not random blue spots.
  if(f.center<330)name='11ice001';
  for(const [team,[bx,by]] of identity.baseAnchors.entries()) {
    const sign=team===0?1:-1,forward=sign*(f.x-bx+f.y-by)/Math.SQRT2,side=sign*(f.x-bx-f.y+by)/Math.SQRT2;
    if((Math.abs(side)<310&&forward> -740&&forward< -250)||(Math.abs(Math.abs(side)-390)<210&&forward>40&&forward<490))name='groundstruct001';
  }
  names[i]=name;names[names.length-1-i]=name;
}
t.tagmap2=['1snow001']; t.textureIds.fill(0);
const tags=new Map([['1snow001',0]]);
for(let i=0;i<names.length;i++) {paintTerrainTextureVertex(t,i%257,Math.floor(i/257),names[i],tags);counts[names[i]]=(counts[names[i]]??0)+1;}
t.skyName='bluesky';
project.name='Icebound Citadel — Power Run';
for(const metadata of [project.metadata,...project.baseLayouts.map(l=>l.metadata)])if(metadata)for(const key of Object.keys(metadata))if(key.endsWith('.analysis'))delete metadata[key];
project.metadata['showcase.icePolish']=JSON.stringify({version:'icebound-showcase-v1',sourceSha256:hash(bytes),stamps,palette,centerPreservedRadius:1700,basePreservedRadius:1950,routePreservedHalfWidth:240});
project.metadata['showcase.warning']='Private playtest candidate. Neutral repair pad intentionally unpowered. Terrain and base validation are offline proxies; live cargo and takeover unverified.';
assert.deepEqual(project.entities,source.entities);assert.deepEqual(project.baseLayouts,source.baseLayouts);
const analysis=analyzeBalancedProject(project,identity.baseAnchors,identity.objectiveAnchors,{},manifest);
assert.equal(analysis.terrain.passed,true);assert.equal(analysis.entityPairing.passed,true);
const errors=analysis.projectIssues.filter(i=>i.severity==='error');
assert.equal(errors.length,1);assert.equal(errors[0].code,'power');assert.equal(errors[0].entityId,'central-neutral-repair-1');
for(const id of t.textureIds.slice(0,256*256))for(const layer of parseTerrainTextureTag(t.tagmap2[id]))assert.ok(manifest.terrainTextures[layer.name]);
const output=Buffer.from(await createMapArchive(project));
const reopened=JSON.parse((await readMapArchive(output)).find(e=>e.name.endsWith('/wulfram-project.json')).text);
assert.deepEqual(reopened.terrain,t);assert.deepEqual(reopened.entities,source.entities);
assert.equal(hash(await fs.readFile(sourcePath)),hash(bytes));assert.equal(hash(await fs.readFile(powerPath)),powerHash);
await fs.mkdir(root);
await fs.writeFile(path.join(root,'Icebound-Citadel-Power-Run.zip'),output,{flag:'wx'});
await fs.writeFile(path.join(root,'project.json'),JSON.stringify(project),{flag:'wx'});
await fs.writeFile(path.join(root,'analysis.json'),JSON.stringify({changedVertices:changed,maximumAddition,counts,analysis,sourceSha256:hash(bytes),powerRunSha256:powerHash},null,2),{flag:'wx'});
console.log(JSON.stringify({root,changed,maximumAddition,counts,terrainPassed:analysis.terrain.passed,entityPairingPassed:analysis.entityPairing.passed,expectedErrors:errors}));
