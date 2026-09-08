// Authored private showcase candidate. Offline checks are not live-match proof.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { generateBalancedProject } from '../lib/balanced-map-generator.ts';
import { COMBAT_BASE_TEMPLATE } from '../lib/combat-base-template.ts';
import { analyzeBalancedProject } from '../lib/balanced-map-analysis.ts';
import { createMapArchive, readMapArchive } from '../lib/map-package.ts';
import { createMapSourceFiles, parseMapSourceFiles } from '../lib/map-source.ts';
import { CITADEL_BASE_TEMPLATE } from '../lib/citadel-base-template.ts';
import { instantiatePairedTemplate } from '../lib/paired-template.ts';
import { synchronizeActiveBaseLayout } from '../lib/wulfram.ts';
import { paintTerrainTextureVertex } from '../lib/terrain-textures.ts';
import { CITADEL_ENTRANCE, segmentDistance } from '../lib/citadel-layout.ts';

const destination = path.resolve(process.argv[2] ?? 'outputs/canyon-citadel-showcase-v1');
assert.equal(fs.existsSync(destination), false, 'Use a new output directory; preserve prior iterations.');
const manifest = JSON.parse(fs.readFileSync(new URL('../public/assets/manifest.json', import.meta.url)));
const options = { name: 'Canyon Citadel', seed: 'canyon-citadel-v1', topology: 'three-route',
  size: 257, worldWidth: 6400, worldHeight: 6400, relief: 420, baseSeparation: .55,
  routeWidth: 1.5, centralAreaSize: 1.5, textureName: 'canyon003' };
const generated = generateBalancedProject(options, COMBAT_BASE_TEMPLATE, manifest);
const terrain = generated.project.terrain;
const smooth = (a,b,x) => { const t = Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); };
const distance = (x,y,a,b) => {
  const dx=b[0]-a[0], dy=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));
  return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);
};
// Normalized diagonal coordinates: u advances between bases, v crosses the lanes.
const ridges = [ [[-.70,.39],[-.20,.49]], [[-.20,.49],[.27,.35]],
  [[-.43,.78],[.14,.88]], [[.14,.88],[.58,.63]] ];
const heightAt = (wx,wy) => {
  const x=(wx-3200)/3200,y=(wy-3200)/3200;
  const u=(x+y)/Math.SQRT2,v=(x-y)/Math.SQRT2;
  const ridgeDistance=Math.min(...ridges.flatMap(([a,b]) => [distance(u,v,a,b),distance(-u,-v,a,b)]));
  const mountains=260*(1+.10*Math.cos(20*u)*Math.cos(13*v))*Math.exp(-Math.pow(ridgeDistance/.24,2)) + 90*Math.exp(-Math.pow(ridgeDistance/.45,2));
  const flank=.64*Math.cos(Math.PI/2*Math.min(1,Math.abs(u)/.82));
  const routeDistance=Math.min(Math.abs(v),Math.abs(Math.abs(v)-flank));
  const routeReserve=smooth(.07,.27,routeDistance);
  const arena=Math.hypot(u,v);
  const arenaFloor=-55*(1-smooth(.16,.33,arena));
  const ridgeRoute=90*(.5+.5*Math.tanh(u*v*10))*Math.exp(-Math.pow((Math.abs(v)-flank)/.13,2))*smooth(.12,.3,Math.abs(v));
  const rim=75*Math.exp(-Math.pow((arena-.32)/.1,2));
  const baseDistance=Math.min(...generated.baseAnchors.map(([bx,by])=>Math.hypot(wx-bx,wy-by)));
  const baseReserve=smooth(1350,1950,baseDistance);
  const edge=smooth(0,450,Math.min(wx,wy,6400-wx,6400-wy));
  let entranceDistance=Infinity;
  let foundationDistance=Infinity;
  const earthworks=Math.max(...generated.baseAnchors.map(([bx,by],i)=>{
    const sign=i===0?1:-1;
    const f=sign*(wx-bx+wy-by)/Math.SQRT2,s=sign*(wx-bx-wy+by)/Math.SQRT2;
    for(const unit of CITADEL_BASE_TEMPLATE.units) foundationDistance=Math.min(foundationDistance,
      Math.hypot(f-(unit.offset[0]+unit.offset[1])/Math.SQRT2,s-(unit.offset[0]-unit.offset[1])/Math.SQRT2));
    for(let n=1;n<CITADEL_ENTRANCE.length;n++) entranceDistance=Math.min(entranceDistance,
      segmentDistance(f,Math.abs(s),CITADEL_ENTRANCE[n-1],CITADEL_ENTRANCE[n]));
    const sideBerm=190*(1-smooth(40,180,Math.abs(Math.abs(s)-750)))*(1-smooth(600,850,Math.abs(f+100)));
    const rearBerm=160*(1-smooth(40,180,Math.abs(f+890)))*(1-smooth(500,800,Math.abs(s)));
    const frontBerm=220*(1-smooth(60,210,Math.abs(f-640)))*(1-smooth(550,800,Math.abs(s)));
    const serviceBerm=150*(1-smooth(35,150,Math.abs(f+120)))*(1-smooth(300,540,Math.abs(s)));
    const returnWall=180*(1-smooth(30,180,Math.abs(Math.abs(s)-1260)))*(1-smooth(600,950,Math.abs(f-100)));
    return Math.max(sideBerm,rearBerm,frontBerm,serviceBerm,returnWall);
  }));
  return Number(((((mountains+rim)*routeReserve+arenaFloor+ridgeRoute)*baseReserve+earthworks)*smooth(110,360,entranceDistance)*smooth(80,140,foundationDistance)*edge).toFixed(6));
};
for(let i=0;i<=Math.floor(terrain.heights.length/2);i++) {
  const h=heightAt(i%257*25,Math.floor(i/257)*25);
  terrain.heights[i]=h; terrain.heights[terrain.heights.length-1-i]=h;
}
// A restrained material palette with native corner blends, never flat-color overlays.
const tags=new Map(terrain.tagmap2.map((tag,id)=>[tag.trim(),id]));
for(const name of ['canyon002','rockwall003','sandrock002','groundstruct001']) assert.ok(manifest.terrainTextures[name]);
for(let i=0;i<terrain.heights.length;i++) {
  const wx=i%257*25,wy=Math.floor(i/257)*25;
  const u=((wx-3200)+(wy-3200))/3200/Math.SQRT2,v=((wx-3200)-(wy-3200))/3200/Math.SQRT2;
  const flank=.64*Math.cos(Math.PI/2*Math.min(1,Math.abs(u)/.82));
  const road=Math.min(Math.abs(v),Math.abs(Math.abs(v)-flank));
  const base= Math.min(...generated.baseAnchors.map(([bx,by])=>Math.hypot(wx-bx,wy-by)));
  const court=generated.baseAnchors.some(([bx,by],i)=>{
    const sign=i===0?1:-1;
    const f=sign*(wx-bx+wy-by)/Math.SQRT2,s=sign*(wx-bx-wy+by)/Math.SQRT2;
    return (Math.abs(s)<310 && f> -740 && f< -250) || (Math.abs(Math.abs(s)-390)<210 && f>40 && f<490);
  });
  const name=court ? 'groundstruct001' : base<750 || road<.045 || Math.hypot(u,v)<.19 ? 'canyon002'
    : terrain.heights[i]>120 ? 'rockwall003' : 'sandrock002';
  paintTerrainTextureVertex(terrain,i%257,Math.floor(i/257),name,tags);
}
const project=generated.project;
project.entities = generated.baseAnchors.flatMap((anchor, i) => {
  let id = 0;
  const placement = instantiatePairedTemplate(CITADEL_BASE_TEMPLATE,terrain,anchor,i+1,1,i*Math.PI,manifest,
    undefined,()=>`citadel-${i+1}-${++id}`);
  assert.equal(placement.skippedWithoutModel,0,'Every authored structure must have a verified model');
  return placement.entities;
});
synchronizeActiveBaseLayout(project, project.updatedAt);
project.baseLayouts.find(l=>l.id===project.activeBaseLayoutId).name='Citadel service court and defense wings';
const analysis=analyzeBalancedProject(project,generated.baseAnchors,generated.objectiveAnchors,{},manifest);
for(const key of Object.keys(project.metadata ?? {})) if(key.startsWith('generator.')) delete project.metadata[key];
for(const layout of project.baseLayouts) for(const key of Object.keys(layout.metadata))
  if(key.startsWith('generator.') || key.startsWith('baseGenerator.')) delete layout.metadata[key];
project.metadata={...project.metadata,'showcase.identity':JSON.stringify({version:'canyon-citadel-showcase-v1',stage:'PRIVATE SHOWCASE CANDIDATE',options,
  baseAnchors:generated.baseAnchors,objectiveAnchors:generated.objectiveAnchors}),
  'showcase.warning':'Authored showcase candidate; offline evidence only, live vehicle clearance and multiplayer balance unverified.'};
assert.equal(analysis.passed,true,'Do not package a failing showcase candidate');
const source=createMapSourceFiles(project);
assert.deepEqual(createMapSourceFiles(parseMapSourceFiles(source)),source,'Canonical source roundtrip');
const bytes=Buffer.from(await createMapArchive(project));
assert.deepEqual(Buffer.from(await createMapArchive(project)),bytes,'Deterministic map archive');
const exported=await readMapArchive(bytes);
const reopened=JSON.parse(exported.find(e=>e.name.endsWith('/wulfram-project.json')).text);
assert.deepEqual(createMapSourceFiles(reopened),source,'ZIP project roundtrip');
fs.mkdirSync(destination,{recursive:true});
fs.writeFileSync(path.join(destination,'builder-source.mjs'),fs.readFileSync(new URL(import.meta.url)));
fs.writeFileSync(path.join(destination,'Canyon-Citadel-v1.zip'),bytes);
fs.writeFileSync(path.join(destination,'project.json'),JSON.stringify(project));
fs.writeFileSync(path.join(destination,'canonical-source.json'),JSON.stringify(source,null,2));
fs.writeFileSync(path.join(destination,'citadel-base-template.ts.txt'),fs.readFileSync(new URL('../lib/citadel-base-template.ts',import.meta.url)));
fs.writeFileSync(path.join(destination,'citadel-layout.ts.txt'),fs.readFileSync(new URL('../lib/citadel-layout.ts',import.meta.url)));
fs.writeFileSync(path.join(destination,'analysis.json'),JSON.stringify({stage:'PRIVATE SHOWCASE CANDIDATE',roundtrip:true,deterministicArchive:true,analysis},null,2));
fs.writeFileSync(path.join(destination,'SHA256SUMS.txt'),`${createHash('sha256').update(bytes).digest('hex')}  Canyon-Citadel-v1.zip\n`);
console.log(JSON.stringify({destination,stage:'PRIVATE SHOWCASE CANDIDATE',passed:analysis.passed,
  gates:analysis.terrain.gates,issues:analysis.projectIssues},null,2));
