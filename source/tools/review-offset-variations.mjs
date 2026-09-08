import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {createBlankProject,activateBaseLayout,validateProject,structureTerrainClearance} from '../lib/wulfram.ts';
import {createCreativeBaseLayout} from '../lib/builtin-base-layouts.ts';
import {offsetBastionVersion} from '../lib/offset-bastion.ts';
import {withEntranceRouting,inspectEntranceRouting} from '../lib/entrance-routing.ts';
import {BUILD_AREAS_KEY,readBuildAreas} from '../lib/build-areas.ts';
import {analyzeRotationalEntityPairs} from '../lib/balanced-map-analysis.ts';

const destination=process.argv[2],arrangement=process.argv[3]??'classic';
offsetBastionVersion(arrangement);
if(!destination)throw new Error('Supply a new output directory.');
await fs.mkdir(destination); // Never replace a prior review.
const manifest=JSON.parse(await fs.readFile('public/assets/manifest.json','utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const policy={version:1,bindings:[1,2].map(team=>({team,corridorId:`offset-bastion-approach-${team}`,direction:'forward'}))};
const cases=[],images=[];
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const colors={e:'#f5cb5c',r:'#63d1a5',f:'#63d1a5',u:'#ece8dc',g:'#e58668',s:'#e58668',L:'#e58668',d:'#a6a0f5'};
for(const size of ['small','standard','large','massive']){
 const representatives=[];
 for(let index=0;index<12;index++){
  const seed=`offset-visual-${index}`,source=createBlankProject('Offset seed comparison',129);
  source.terrain.worldWidth=12000;source.terrain.worldHeight=8000;source.terrain.heights.fill(0);
  const before=JSON.stringify(source),placement={size,x:2800,y:4000,rotation:0,radius:2400,targetCount:{small:12,standard:18,large:26,massive:34}[size],checkAccess:true,...(arrangement!=='classic'?{offsetArrangement:arrangement}:{})};
  const row={size,seed,index,arrangement,passed:false};
  try{
   const generated=createCreativeBaseLayout(source,manifest,'offset-bastion',`offset-${size}`,seed,placement);
   const repeat=createCreativeBaseLayout(source,manifest,'offset-bastion',`offset-${size}`,seed,placement);
   assert.deepEqual(generated.entities,repeat.entities);
   const layout=withEntranceRouting(source,manifest,generated,policy);
   const project=structuredClone(source);project.baseLayouts.push(layout);activateBaseLayout(project,layout.id);
   assert.deepEqual(validateProject(project).filter(i=>i.severity==='error'),[]);
   assert.ok(analyzeRotationalEntityPairs(project,manifest).passed);
   const access=inspectEntranceRouting(project,manifest,layout);
   assert.equal(access.length,2);
   const file=path.join(destination,`${size}-${index}.json`),bytes=JSON.stringify(project);
   await fs.writeFile(file,bytes,{flag:'wx'});
   Object.assign(row,{passed:true,file,sha256:hash(bytes),candidateSeed:layout.metadata['formation.candidateSeed'],countPerTeam:layout.entities.filter(e=>e.team===1).length,geometryHash:hash(JSON.stringify(layout.entities.map(e=>[e.token,e.team,e.position,e.rotation]))),routeCount:access.reduce((n,a)=>n+a.routes.length,0)});
   if([0,5,11].includes(index))representatives.push({row,project,layout,access});
  }catch(error){row.error=String(error);if([0,5,11].includes(index))representatives.push({row});}
  assert.equal(JSON.stringify(source),before);cases.push(row);
 }
 const parts=[`<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="550" viewBox="0 0 1320 550"><rect width="1320" height="550" fill="#10181f"/><style>text{font-family:Segoe UI,Arial,sans-serif;fill:#e7edf0}.label{font-size:15px}.small{font-size:12px;fill:#a7b9c6}</style><text x="24" y="34" font-size="24">OFFSET BASTION / ${size.toUpperCase()} / ${arrangement.toUpperCase()}</text><text x="24" y="57" class="small">Same count, anchor and orientation • three predetermined seeds • team 1 • cropped local view on flat terrain</text>`];
 for(const [column,item] of representatives.entries()){
  const ox=24+column*432,oy=85,width=408,height=370,scale=.114;
  const point=([x,y])=>[ox+22+(x-2800+1800)*scale,oy+18+(1400-(y-4000))*scale];
  parts.push(`<rect x="${ox}" y="${oy}" width="${width}" height="${height}" rx="10" fill="#192630" stroke="#334655"/><text x="${ox+14}" y="${oy+height+25}" class="label">Seed ${item.row.index} · ${item.row.passed?item.row.countPerTeam+' structures':'REJECTED'}</text>`);
  if(!item.row.passed){parts.push(`<text x="${ox+15}" y="${oy+40}" class="label">Selected entrance check rejected</text>`);continue;}
  parts.push(`<defs><clipPath id="clip${column}"><rect x="${ox}" y="${oy}" width="${width}" height="${height}"/></clipPath></defs><g clip-path="url(#clip${column})">`);
  for(const area of readBuildAreas(item.layout.metadata[BUILD_AREAS_KEY]).filter(a=>a.id.endsWith('-1'))){const points=area.points.map(p=>point(p).join(',')).join(' ');parts.push(`<polyline points="${points}" fill="none" stroke="#a986d5" stroke-opacity=".22" stroke-width="${area.width*scale}" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${points}" fill="none" stroke="#ba9bdd" stroke-width="2"/>`);}
  for(const route of item.access.find(a=>a.team===1).routes)parts.push(`<polyline points="${route.map(p=>point(p).join(',')).join(' ')}" fill="none" stroke="#5ecee4" stroke-width="1" opacity=".65"/>`);
  for(const e of item.layout.entities.filter(e=>e.team===1)){
   const [x,y]=point(e.position),radius=structureTerrainClearance(e,manifest,0,0).footprint/Math.SQRT2*scale;
   parts.push(`<circle cx="${x}" cy="${y}" r="${Math.max(2,radius)}" fill="${colors[e.token]??'#aaa'}" stroke="#10181f" stroke-width="1"/>`);
   if(e.token!=='e')parts.push(`<text x="${x}" y="${y-8}" text-anchor="middle" font-size="10">${escape(e.token.toUpperCase())}</text>`);
  }
  parts.push('</g>');
 }
 parts.push('<text x="24" y="512" class="label">Yellow: power cells · Green: repair/refuel · Coral: weapons · White: uplink · Violet: Darklight</text><text x="24" y="535" class="small">Purple band: reserved entrance · Cyan: sampled service routes · Conservative footprint circles, not 3D buildings or gameplay proof</text></svg>');
 const svg=parts.join(''),svgFile=path.join(destination,`${size}-comparison.svg`),pngFile=path.join(destination,`${size}-comparison.png`);
 await fs.writeFile(svgFile,svg,{flag:'wx'});await sharp(Buffer.from(svg)).png().toFile(pngFile);
 images.push({size,svg:svgFile,png:pngFile,pngSha256:hash(await fs.readFile(pngFile)),seeds:[0,5,11]});
 console.log(JSON.stringify({size,passed:cases.filter(c=>c.size===size&&c.passed).length,rejected:cases.filter(c=>c.size===size&&!c.passed).length}));
}
const report={arrangement,scope:'Current source, 12 flat-map seeds per size with explicit entrance policies. Images are faithful planar diagrams; native visual review and gameplay are separate.',cases,images,passed:cases.filter(c=>c.passed).length,rejected:cases.filter(c=>!c.passed).length};
await fs.writeFile(path.join(destination,'report.json'),JSON.stringify(report,null,2),{flag:'wx'});
console.log(JSON.stringify({report:path.join(destination,'report.json'),passed:report.passed,rejected:report.rejected}));
