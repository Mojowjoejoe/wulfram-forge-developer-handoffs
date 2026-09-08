import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {paintTerrainTextureVertex,parseTerrainTextureTag} from '../lib/terrain-textures.ts';
import {sampleSlopeDegrees} from '../lib/wulfram.ts';
import {createMapArchive,readMapArchive} from '../lib/map-package.ts';
import {CITADEL_ENTRANCE,segmentDistance} from '../lib/citadel-layout.ts';
import {analyzeBalancedProject} from '../lib/balanced-map-analysis.ts';
const out=path.resolve('outputs/canyon-citadel-forest-v1');
assert.ok(!fs.existsSync(out),'Preserve previous output');
const sourcePath='outputs/canyon-citadel-central-outpost-v3/project.json';
const originalBytes=fs.readFileSync(sourcePath),source=JSON.parse(originalBytes);
const hash=b=>createHash('sha256').update(b).digest('hex');
const sourceHash=hash(originalBytes),archivePath='outputs/canyon-citadel-central-outpost-v3/Canyon-Citadel-Power-Run-v3.zip',archiveHash=hash(fs.readFileSync(archivePath));
const project=structuredClone(source),t=project.terrain;
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json'));
const palette=['gbdirt_grassy001','Grs001','19bush001','1bush001','9bush001','3grass001','gbdirt001','junglecanyon001','groundstruct001'];
for(const name of palette)assert.ok(manifest.terrainTextures[name]);
const identity=JSON.parse(project.metadata['showcase.identity']);
const names=new Array(t.heights.length),counts={};
for(let i=0;i<=Math.floor(names.length/2);i++){
  const wx=i%t.width*t.worldWidth/(t.width-1),wy=Math.floor(i/t.width)*t.worldHeight/(t.height-1);
  const u=(wx+wy-6400)/3200/Math.SQRT2,v=(wx-wy)/3200/Math.SQRT2;
  const flank=.64*Math.cos(Math.PI/2*Math.min(1,Math.abs(u)/.82));
  const road=Math.min(Math.abs(v),Math.abs(Math.abs(v)-flank));
  const patch=Math.sin(wx/510+Math.sin(wy/690))*.55+Math.cos(wy/620-wx/870)*.45;
  const slope=sampleSlopeDegrees(t,wx,wy),height=t.heights[i];
  let name=patch>.38?'1bush001':patch<-.45?'Grs001':'gbdirt_grassy001';
  if(road>.09&&height<140&&patch>.66)name='19bush001';
  if(road>.055&&height<70&&patch<-.7)name='9bush001';
  if(slope>28||height>230+patch*40)name='junglecanyon001';
  else if(slope>18)name='gbdirt_grassy001';
  // Narrow, dark worn paths retain the original route geometry and basin.
  if(road<.026&&Math.abs(u)<.76)name='gbdirt001';
  if(Math.hypot(wx-3200,wy-3200)<400)name=patch>.25?'gbdirt001':'gbdirt_grassy001';
  for(const [team,[bx,by]] of identity.baseAnchors.entries()){
    const sign=team===0?1:-1,f=sign*(wx-bx+wy-by)/Math.SQRT2,s=sign*(wx-bx-wy+by)/Math.SQRT2;
    let entrance=Infinity;for(let n=1;n<CITADEL_ENTRANCE.length;n++)entrance=Math.min(entrance,segmentDistance(f,Math.abs(s),CITADEL_ENTRANCE[n-1],CITADEL_ENTRANCE[n]));
    if(entrance<85)name='gbdirt001';
    if((Math.abs(s)<310&&f> -740&&f< -250)||(Math.abs(Math.abs(s)-390)<210&&f>40&&f<490))name='groundstruct001';
  }
  if(Math.hypot(wx-3200,wy-3200)<95)name='groundstruct001';
  names[i]=name;names[names.length-1-i]=name;
}
const tags=new Map(t.tagmap2.map((tag,id)=>[tag.trim(),id]));
for(let i=0;i<names.length;i++){paintTerrainTextureVertex(t,i%t.width,Math.floor(i/t.width),names[i],tags);counts[names[i]]=(counts[names[i]]??0)+1;}
project.name='Canyon Citadel — Forest Power Run';
project.metadata['showcase.textureStyle']=JSON.stringify({version:'forest-v1',source:'Power Run v3',palette,counts,sourceSha256:sourceHash});
assert.deepEqual(t.heights,source.terrain.heights);assert.deepEqual(project.entities,source.entities);assert.deepEqual(project.baseLayouts,source.baseLayouts);
assert.equal(t.worldWidth,source.terrain.worldWidth);assert.equal(t.worldHeight,source.terrain.worldHeight);
for(const id of t.textureIds.slice(0,(t.width-1)*(t.height-1)))for(const layer of parseTerrainTextureTag(t.tagmap2[id]))assert.ok(manifest.terrainTextures[layer.name]);
const analysis=analyzeBalancedProject(project,identity.baseAnchors,identity.objectiveAnchors,{},manifest);
assert.ok(analysis.terrain.passed&&analysis.entityPairing.passed);
const errors=analysis.projectIssues.filter(i=>i.severity==='error');assert.equal(errors.length,1);assert.equal(errors[0].entityId,'central-neutral-repair-1');assert.equal(errors[0].code,'power');
const bytes=Buffer.from(await createMapArchive(project)),entries=await readMapArchive(bytes);
const reopened=JSON.parse(entries.find(e=>e.name.endsWith('/wulfram-project.json')).text);
assert.deepEqual(reopened.terrain,t);assert.deepEqual(reopened.entities,source.entities);
assert.equal(hash(fs.readFileSync(sourcePath)),sourceHash);assert.equal(hash(fs.readFileSync(archivePath)),archiveHash);
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'Canyon-Citadel-Forest-Power-Run-v1.zip'),bytes);fs.writeFileSync(path.join(out,'project.json'),JSON.stringify(project));
fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify({textureOnly:true,heightsUnchanged:true,entitiesUnchanged:true,baseLayoutsUnchanged:true,sourceUnchanged:true,counts,analysis},null,2));
fs.writeFileSync(path.join(out,'SHA256SUMS.txt'),`${hash(bytes)}  Canyon-Citadel-Forest-Power-Run-v1.zip\n`);
fs.writeFileSync(path.join(out,'README.md'),'# Canyon Citadel — Forest Power Run\n\nTexture-only forest variant of Power Run v3: grassy ground, dark undergrowth, brown forest paths and gray exposed canyon rock. All terrain heights, 57 entities, base layouts and central neutral repair outpost are preserved. No tree objects were added. The original files are unchanged.\n\nRequirements: compatible Wulfram editor/client. Import the ZIP in the editor. The neutral repair outpost retains its original expected unpowered validation error. Terrain/entity pairing and archive roundtrip pass; native gameplay is not newly certified.\n');
const tiles=palette.filter(n=>counts[n]),layers=[];
for(let i=0;i<tiles.length;i++){layers.push({input:await sharp('public'+manifest.terrainTextures[tiles[i]].url).resize(180,180).png().toBuffer(),left:i%4*220+20,top:Math.floor(i/4)*230+10});layers.push({input:Buffer.from(`<svg width="220" height="30"><text x="10" y="22" fill="white" font-size="16">${tiles[i]}</text></svg>`),left:i%4*220,top:Math.floor(i/4)*230+195});}
await sharp({create:{width:880,height:Math.ceil(tiles.length/4)*230,channels:3,background:'#18201a'}}).composite(layers).png().toFile(path.join(out,'palette.png'));
console.log(JSON.stringify({out,counts,entities:project.entities.length,errors}));
