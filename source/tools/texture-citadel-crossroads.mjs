// Texture-only authored variant; run from repository root with a new output directory.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {paintTerrainTextureVertex,parseTerrainTextureTag} from '../lib/terrain-textures.ts';
import {createMapArchive,readMapArchive} from '../lib/map-package.ts';
import {analyzeBalancedProject} from '../lib/balanced-map-analysis.ts';
import {CITADEL_ENTRANCE,segmentDistance} from '../lib/citadel-layout.ts';

const out=path.resolve(process.argv[2]??'outputs/canyon-citadel-crossroads-v1');
const restrained=process.argv[3]==='--restrained';
const version=restrained?'v2':'v1';
assert.ok(!fs.existsSync(out),'Use a new output directory');
const source=JSON.parse(fs.readFileSync('outputs/canyon-citadel-showcase-v1/project.json'));
const project=structuredClone(source),t=project.terrain;
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json'));
const reference=fs.readFileSync('public/assets/demo/crossroads/tagmap2','utf8');
const palette=restrained?['4sand001','megadirt001','Bdt001','olivesage001','gbdirt001','canyon002','sandrock002','groundstruct001']:['4sand001','4sand002','megadirt001','Bdt001','olivesage001','20bush002','reddirt001','sandrock002','darkrock001','groundstruct001','groundrunway001'];
for(const name of palette) {assert.ok(manifest.terrainTextures[name]);assert.ok(reference.includes(name));}
const identity=JSON.parse(source.metadata['showcase.identity']);
const names=Array.from({length:t.heights.length},()=>''),counts={};
for(let i=0;i<=Math.floor(names.length/2);i++){
  const wx=i%257*25,wy=Math.floor(i/257)*25;
  const u=(wx+wy-6400)/3200/Math.SQRT2,v=(wx-wy)/3200/Math.SQRT2;
  const flank=.64*Math.cos(Math.PI/2*Math.min(1,Math.abs(u)/.82));
  const road=Math.min(Math.abs(v),Math.abs(Math.abs(v)-flank));
  // Coherent patches at several scales, not per-vertex random speckling.
  const patch=Math.sin(wx/270+Math.sin(wy/410))*Math.cos(wy/310)+.35*Math.sin((wx+wy)/115);
  const fine=Math.sin(wx/83)*Math.cos(wy/101);
  let name=patch>.58?'20bush002':patch>.02?'olivesage001':patch<-.65?'reddirt001':'megadirt001';
  if(t.heights[i]>100) name=patch>.3?'Bdt001':patch<-.6?'darkrock001':'sandrock002';
  if(road<.055+fine*.008 || Math.hypot(u,v)<.2) name=patch>.2?'4sand002':'4sand001';
  if(Math.abs(v)<.019&&Math.abs(u)<.65) name='groundrunway001';
  if(restrained) {
    name=patch>.35?'gbdirt001':'megadirt001';
    if(t.heights[i]>70+patch*35) name=patch>.4?'Bdt001':'canyon002';
    if(t.heights[i]>205+patch*40) name='sandrock002';
    if(t.heights[i]<75&&patch>1.03&&road>.07)name='olivesage001';
    // Routes read as worn earth, with sparse sandy deposits rather than bright ribbons.
    if(road<.032+fine*.004||Math.hypot(u,v)<.17)name='megadirt001';
    if(road<.018&&patch>.65&&t.heights[i]<80)name='4sand001';
  }
  for(const [team,[bx,by]] of identity.baseAnchors.entries()) {
    const sign=team===0?1:-1;
    const f=sign*(wx-bx+wy-by)/Math.SQRT2,s=sign*(wx-bx-wy+by)/Math.SQRT2;
    let entrance=Infinity;
    for(let n=1;n<CITADEL_ENTRANCE.length;n++) entrance=Math.min(entrance,segmentDistance(f,Math.abs(s),CITADEL_ENTRANCE[n-1],CITADEL_ENTRANCE[n]));
    if(entrance<100)name=restrained?'megadirt001':'4sand001';
    const court=(Math.abs(s)<310&&f> -740&&f< -250)||(Math.abs(Math.abs(s)-390)<210&&f>40&&f<490);
    if(court)name='groundstruct001';
  }
  names[i]=name;names[names.length-1-i]=name;
}
const tags=new Map(t.tagmap2.map((tag,id)=>[tag.trim(),id]));
for(let i=0;i<names.length;i++) {paintTerrainTextureVertex(t,i%257,Math.floor(i/257),names[i],tags);counts[names[i]]=(counts[names[i]]??0)+1;}
project.name=restrained?'Canyon Citadel — Crossroads restrained':'Canyon Citadel — Crossroads palette';
project.metadata['showcase.textureStyle']=JSON.stringify({version:`crossroads-palette-${version}`,reference:'Original Crossroads tagmap2',palette,counts});
assert.deepEqual(t.heights,source.terrain.heights);
assert.deepEqual(project.entities,source.entities);
assert.deepEqual(project.baseLayouts,source.baseLayouts);
for(const id of t.textureIds.slice(0,256*256))for(const layer of parseTerrainTextureTag(t.tagmap2[id]))assert.ok(manifest.terrainTextures[layer.name]);
const analysis=analyzeBalancedProject(project,identity.baseAnchors,identity.objectiveAnchors,{},manifest);
assert.equal(analysis.passed,true);
const bytes=Buffer.from(await createMapArchive(project));
const entries=await readMapArchive(bytes);
const reopened=JSON.parse(entries.find(e=>e.name.endsWith('/wulfram-project.json')).text);
assert.deepEqual(reopened.terrain,project.terrain);assert.deepEqual(reopened.entities,source.entities);
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,`Canyon-Citadel-Crossroads-${version}.zip`),bytes);
fs.writeFileSync(path.join(out,'project.json'),JSON.stringify(project));
fs.writeFileSync(path.join(out,'analysis.json'),JSON.stringify({textureOnly:true,heightsUnchanged:true,entitiesUnchanged:true,counts,analysis},null,2));
fs.writeFileSync(path.join(out,'SHA256SUMS.txt'),`${createHash('sha256').update(bytes).digest('hex')}  Canyon-Citadel-Crossroads-${version}.zip\n`);
console.log(JSON.stringify({out,passed:analysis.passed,counts}));
