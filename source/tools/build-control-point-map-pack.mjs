import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import JSZip from 'jszip';
import {COMBAT_BASE_TEMPLATE} from '../lib/combat-base-template.ts';
import {instantiatePairedTemplate} from '../lib/paired-template.ts';
import {synchronizeActiveBaseLayout,validateProject} from '../lib/wulfram.ts';
import {createMapArchive,readMapArchive} from '../lib/map-package.ts';
import {paintTerrainTextureVertex} from '../lib/terrain-textures.ts';
import {distanceToSegment} from '../lib/build-areas.ts';

const out=path.resolve(process.argv[2]??'outputs/control-point-map-pack-v1');
await fs.mkdir(out,{recursive:false}); // Never overwrite a previous pack.
const manifest=JSON.parse(await fs.readFile('public/assets/manifest.json','utf8'));
const W=8000,H=4800,cols=161,rows=97,baseAnchors=[[1300,2400],[6700,2400]];
const reverse=p=>[W-p[0],H-p[1]];
const definitions=[
 {id:'01-crossroads-hold',name:'Crossroads Hold',purpose:'One broad central court. Side approaches let teams reinforce or flank without shooting straight through a base entrance.',points:[[4000,2400]],routes:[[[1300,2400],[2000,2100],[2900,2400],[4000,2400]],[[1300,2400],[2100,1350],[3300,1250],[4000,2400]]],relief:160},
 {id:'02-twin-relays',name:'Twin Relays',purpose:'Two separated holding courts. Commit to one point or divide defenders; the middle connection creates an interception fight.',points:[[4000,1400],[4000,3400]],routes:[[[1300,2400],[2100,1700],[3000,1400],[4000,1400]],[[1300,2400],[2100,3100],[3000,3400],[4000,3400]],[[4000,1400],[4450,2400],[4000,3400]]],relief:190},
 {id:'03-three-courts',name:'Three Courts',purpose:'Three holding courts across the midfield. The central court offers a quick rotation; the outer courts demand longer reinforcements.',points:[[4000,1100],[4000,2400],[4000,3700]],routes:[[[1300,2400],[2050,1800],[3000,1100],[4000,1100]],[[1300,2400],[2200,2650],[3100,2400],[4000,2400]],[[1300,2400],[2050,3100],[3000,3700],[4000,3700]],[[4000,1100],[4550,1750],[4000,2400],[3450,3050],[4000,3700]]],relief:150},
];
const packed=new JSZip(),receipts=[];
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const d of definitions){
 const routes=[...d.routes,...d.routes.map(route=>route.map(reverse))];
 const distance=(x,y)=>Math.min(...routes.flatMap(route=>route.slice(1).map((p,i)=>distanceToSegment(x,y,route[i],p))));
 const terrain={width:cols,height:rows,worldWidth:W,worldHeight:H,skyName:'bluesky',heights:[],textureIds:Array(cols*rows).fill(0),tagmap:['canyon003'],tagmap2:['canyon003']};
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
   const wx=x*50,wy=y*50,baseDistance=Math.min(...baseAnchors.map(p=>Math.hypot(wx-p[0],wy-p[1]))),pointDistance=Math.min(...d.points.map(p=>Math.hypot(wx-p[0],wy-p[1])));
   const field=(.78+.22*Math.cos((wx-W/2)/700)*Math.cos((wy-H/2)/650));
   terrain.heights.push(Number((d.relief*field*smooth((distance(wx,wy)-190)/650)*smooth((baseDistance-650)/500)*smooth((pointDistance-390)/650)*smooth(Math.min(wx,wy,W-wx,H-wy)/450)).toFixed(6)));
 }
 const material=Object.keys(manifest.terrainTextures).find(n=>/^sandrock\d{3}$/.test(n));assert.ok(material,'Objective marker texture exists');
 const tags=new Map(terrain.tagmap2.map((t,i)=>[t,i]));
 for(const [px,py] of d.points)for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(Math.hypot(x*50-px,y*50-py)<=180)paintTerrainTextureVertex(terrain,x,y,material,tags);
 const project={format:'wulfram-map-project',version:1,name:d.name+' - Hold-point layout',terrain,entities:[],validation:{serviceRadius:300,backupRadius:80,maxSlopeDegrees:22,minSpacing:8},baseLayouts:[],activeBaseLayoutId:'default',updatedAt:'2026-09-07T00:00:00.000Z',metadata:{'controlPointDesign.status':'Layout prototype only. No ownership, capture timer, scoring or victory script.','controlPointDesign.version':'1','controlPointDesign.points':JSON.stringify(d.points.map((p,i)=>({id:String.fromCharCode(65+i),x:p[0],y:p[1],radius:180}))), 'controlPointDesign.routes':JSON.stringify(routes),'controlPointDesign.purpose':d.purpose}};
 for(const team of [1,2]){let n=0;const placed=instantiatePairedTemplate(COMBAT_BASE_TEMPLATE,terrain,baseAnchors[team-1],team,1,team===1?-Math.PI/4:3*Math.PI/4,manifest,undefined,()=>`${d.id}-team-${team}-${n++}`);assert.equal(placed.skippedWithoutModel,0);project.entities.push(...placed.entities);}
 synchronizeActiveBaseLayout(project);project.baseLayouts[0].name='Opposing deployed bases';
 project.baseLayouts[0].metadata['forge.build-areas.v1']=JSON.stringify(d.points.map((p,i)=>({id:`point-${i}`,name:`Holding court ${String.fromCharCode(65+i)}`,kind:'terrain',team:'all',x:p[0]-200,y:p[1]-200,width:400,height:400})));
 const issues=validateProject(project);assert.deepEqual(issues.filter(i=>i.severity==='error'),[]);
 for(let i=0;i<terrain.heights.length;i++)assert.equal(terrain.heights[i],terrain.heights[terrain.heights.length-1-i],'Rotational terrain symmetry');
 for(const point of d.points){assert.equal(terrain.heights[(point[1]/50)*cols+point[0]/50],0);assert.ok(project.entities.every(e=>Math.hypot(e.position[0]-point[0],e.position[1]-point[1])>390),'Court has no buildings');}
 const bytes=Buffer.from(await createMapArchive(project));const archive=await readMapArchive(bytes),restored=JSON.parse(archive.find(e=>e.name.endsWith('/wulfram-project.json')).text);
 assert.deepEqual(restored,JSON.parse(JSON.stringify(project)));
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="680" viewBox="0 0 1000 680"><rect width="1000" height="680" fill="#141b22"/><text x="24" y="32" font-family="Arial" font-size="24" fill="white">${d.name}</text><g transform="translate(0 55) scale(.125)">${terrain.heights.map((h,i)=>`<rect x="${i%cols*50}" y="${Math.floor(i/cols)*50}" width="51" height="51" fill="rgb(${65+Math.round(h*.5)},${64+Math.round(h*.26)},${56+Math.round(h*.12)})"/>`).join('')}${routes.map(r=>`<polyline points="${r.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#b8c7c9" stroke-width="28" opacity=".6"/>`).join('')}${baseAnchors.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="300" fill="${i?'#df655a':'#51aef0'}"/><text x="${p[0]}" y="${p[1]+50}" text-anchor="middle" font-family="Arial" font-size="135" fill="white">BASE ${i+1}</text>`).join('')}${d.points.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="180" fill="#f3c35b" stroke="#fff" stroke-width="15"/><text x="${p[0]}" y="${p[1]+50}" text-anchor="middle" font-family="Arial" font-size="140" fill="#17202a">${String.fromCharCode(65+i)}</text>`).join('')}</g><text x="20" y="672" font-family="Arial" font-size="14" fill="#d1dae4">8,000 × 4,800 world units · Gold: holding courts · Lines: planned approaches · Layout only, no capture/scoring script</text></svg>`;
 const files={[d.id+'.zip']:bytes,[d.id+'.json']:JSON.stringify(project),[d.id+'.svg']:svg};
 for(const [name,data] of Object.entries(files)){await fs.writeFile(path.join(out,name),data);packed.file(name,data);}
 receipts.push({id:d.id,name:d.name,purpose:d.purpose,points:d.points,structuresPerTeam:COMBAT_BASE_TEMPLATE.unitCount,mapSha256:sha(bytes),projectValidationErrors:0,warnings:issues.filter(i=>i.severity!=='error'),terrainSymmetry:true,clearFlatCourts:true,archiveRoundTrip:true,gameplayTested:false});
}
const readme=`# Contested point map layouts\n\nThree separate maps with opposing bases at the short ends of an 8,000 by 4,800 rectangle. Each has ${COMBAT_BASE_TEMPLATE.unitCount} structures per team. Extract this pack, then Import one individual map ZIP in Wulfram Forge. JSON copies remain editable; SVG overviews show the intended approaches.\n\n${receipts.map(r=>`- **${r.name}** (${r.points.length} points): ${r.purpose}`).join('\n')}\n\nHolding courts are flat, clear of buildings, and marked with contrasting original ground texture. Their center heights are protected through the existing layout rules. Gold circles and letters are overview annotations, not placed flag/zone entities. Capture ownership, progress, respawn behavior, scoring and victory conditions are NOT implemented. The local map start_script contains map/sky setup; a compatible game/server objective mechanism has not been established. These layouts can be used for organized player-run holding-point trials, but official scoring needs separate implementation and game evidence.\n\nValidation includes editor structure checks, exact rotational terrain heights, clear courts and full archive roundtrip. No game loading, driving, sightline, firing-range, capture or balance trial has been completed. The 300-unit service radius is an editor assumption. Existing maps were preserved.\n`;
for(const [name,data] of Object.entries({'README.md':readme,'validation.json':JSON.stringify(receipts,null,2)})){await fs.writeFile(path.join(out,name),data);packed.file(name,data);}
const bundle=await packed.generateAsync({type:'nodebuffer',compression:'DEFLATE'});await fs.writeFile(path.join(out,'Contested-Points-Map-Pack-v1.zip'),bundle);
console.log(JSON.stringify({out,maps:receipts.map(r=>r.name),packSha256:sha(bundle)},null,2));
