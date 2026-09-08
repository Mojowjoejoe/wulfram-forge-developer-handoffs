import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {paintTerrainTextureVertex,parseTerrainTextureTag} from '../lib/terrain-textures.ts';
import {analyzeBalancedProject} from '../lib/balanced-map-analysis.ts';
import {createMapArchive,readMapArchive} from '../lib/map-package.ts';
const out=path.resolve(process.argv[2]??'outputs/canyon-citadel-ice-v1');
assert.ok(!fs.existsSync(out),'Preserve existing outputs');
const powerPath='outputs/canyon-citadel-central-outpost-v3/Canyon-Citadel-Power-Run-v3.zip';
const hash=b=>createHash('sha256').update(b).digest('hex');
const beforeHash=hash(fs.readFileSync(powerPath));
const source=JSON.parse(fs.readFileSync('outputs/canyon-citadel-ice-working-v1/project.json'));
const project=structuredClone(source), t=project.terrain;
const identity=JSON.parse(project.metadata['showcase.identity']);
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json'));
const smooth=(a,b,x)=>{const v=Math.max(0,Math.min(1,(x-a)/(b-a)));return v*v*(3-2*v);};
let lowered=0,maxCut=0;
for(let i=0;i<=Math.floor(t.heights.length/2);i++) {
  const wx=i%257*25,wy=Math.floor(i/257)*25;
  const u=(wx+wy-6400)/3200/Math.SQRT2,v=(wx-wy)/3200/Math.SQRT2;
  const flank=.64*Math.cos(Math.PI/2*Math.min(1,Math.abs(u)/.82));
  const distance=Math.abs(Math.abs(v)-flank)*3200;
  const baseDistance=Math.min(...identity.baseAnchors.map(([x,y])=>Math.hypot(wx-x,wy-y)));
  const edge=Math.min(wx,wy,6400-wx,6400-wy);
  const cut=180*Math.exp(-((distance/650)**2))*(1-smooth(.42,.75,Math.abs(u)))
    *smooth(1900,3400,baseDistance)*smooth(1100,1700,Math.hypot(wx-3200,wy-3200))*smooth(100,450,edge);
  const height=Number((t.heights[i]-cut).toFixed(6));
  if(cut>.001)lowered+=2;maxCut=Math.max(maxCut,cut);
  t.heights[i]=height;t.heights[t.heights.length-1-i]=height;
}
const palette=['1snow001','4snow001','11ice001','8ice001','bluegranite001','groundstruct001'];
for(const name of palette)assert.ok(manifest.terrainTextures[name]);
const names=Array.from({length:t.heights.length},()=>''),counts={};
for(let i=0;i<=Math.floor(names.length/2);i++) {
  const wx=i%257*25,wy=Math.floor(i/257)*25,h=t.heights[i];
  const patch=Math.sin(wx/390)*Math.cos(wy/430);
  let name=h< -85?'11ice001':h>160+patch*40?'bluegranite001':patch>.35?'4snow001':'1snow001';
  if(h< -125&&patch>.4)name='8ice001';
  for(const [team,[bx,by]] of identity.baseAnchors.entries()) {
    const sign=team===0?1:-1,f=sign*(wx-bx+wy-by)/Math.SQRT2,s=sign*(wx-bx-wy+by)/Math.SQRT2;
    if((Math.abs(s)<310&&f> -740&&f< -250)||(Math.abs(Math.abs(s)-390)<210&&f>40&&f<490))name='groundstruct001';
  }
  names[i]=name;names[names.length-1-i]=name;
}
const tags=new Map(t.tagmap2.map((tag,id)=>[tag.trim(),id]));
for(let i=0;i<names.length;i++){paintTerrainTextureVertex(t,i%257,Math.floor(i/257),names[i],tags);counts[names[i]]=(counts[names[i]]??0)+1;}
t.skyName='stormsky';
project.name='Canyon Citadel — Icebound Power Run';
project.metadata['showcase.iceDevelopment']=JSON.stringify({version:'icebound-v1',maxValleyCut:180,centerProtectedRadius:1100,sourcePowerRunSha256:beforeHash,palette});
delete project.metadata['showcase.textureStyle'];
assert.deepEqual(project.entities,source.entities);assert.deepEqual(project.baseLayouts,source.baseLayouts);
for(const id of t.textureIds.slice(0,256*256))for(const layer of parseTerrainTextureTag(t.tagmap2[id]))assert.ok(manifest.terrainTextures[layer.name]);
const analysis=analyzeBalancedProject(project,identity.baseAnchors,identity.objectiveAnchors,{},manifest);
assert.equal(analysis.terrain.passed,true);assert.equal(analysis.entityPairing.passed,true);
const errors=analysis.projectIssues.filter(i=>i.severity==='error');
assert.equal(errors.length,1);assert.equal(errors[0].entityId,'central-neutral-repair-1');assert.equal(errors[0].code,'power');
const bytes=Buffer.from(await createMapArchive(project));
const archive=await readMapArchive(bytes);
const reopened=JSON.parse(archive.find(e=>e.name.endsWith('/wulfram-project.json')).text);
assert.deepEqual(reopened.terrain,t);assert.deepEqual(reopened.entities,source.entities);
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'Canyon-Citadel-Icebound-v1.zip'),bytes);
fs.writeFileSync(path.join(out,'project.json'),JSON.stringify(project));
fs.writeFileSync(path.join(out,'analysis.json'),JSON.stringify({loweredVertices:lowered,maxCut,minimumHeight:Math.min(...t.heights),counts,analysis},null,2));
fs.writeFileSync(path.join(out,'SHA256SUMS.txt'),`${hash(bytes)}  Canyon-Citadel-Icebound-v1.zip\n`);
assert.equal(hash(fs.readFileSync(powerPath)),beforeHash);
console.log(JSON.stringify({out,lowered,maxCut,min:Math.min(...t.heights),counts}));
