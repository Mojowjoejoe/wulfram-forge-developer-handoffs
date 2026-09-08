import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createBlankProject} from '../lib/wulfram.ts';
import {generateBaseLayout} from '../lib/mcp-commands.ts';
const out=await fs.mkdtemp(path.resolve('outputs/anchor-variation-review-'));
const hash=value=>createHash('sha256').update(value).digest('hex');
const manifestText=await fs.readFile('public/assets/manifest.json','utf8'),manifest=JSON.parse(manifestText);
const report={passed:false,out,scope:'Offline deterministic variation, not native or gameplay acceptance',manifestSha256:hash(manifestText),fixtures:[],cases:[]};
try{
 for(const kind of ['flat','valley','irregular']){
  const source=createBlankProject(`Anchor variation ${kind}`,129),t=source.terrain;t.worldWidth=16000;t.worldHeight=12000;
  for(let y=0;y<t.height;y++)for(let x=0;x<t.width;x++){
   const nx=x/(t.width-1),ny=y/(t.height-1);
   t.heights[y*t.width+x]=kind==='flat'?0:kind==='valley'?90*Math.pow(2*ny-1,2):80+35*Math.cos(4*Math.PI*nx)*Math.cos(6*Math.PI*ny)+20*Math.cos(8*Math.PI*nx);
  }
  const before=structuredClone(source),fixturePath=path.join(out,`${kind}.json`),fixtureText=JSON.stringify(source);await fs.writeFile(fixturePath,fixtureText);report.fixtures.push({kind,path:fixturePath,sha256:hash(fixtureText)});
  for(const [sizeIndex,size] of ['small','standard','large','massive'].entries())for(let i=0;i<12;i++)for(const expanded of [false,true]){
   const seed=`variation-${i}`,targetCount=expanded?[24,30,39,51][sizeIndex]:0,request={activeLayoutId:source.activeBaseLayoutId,layoutId:`${kind}-${size}-${i}-${expanded?'expanded':'minimum'}`,style:'three-lane-anchor',seed,placement:{size,x:4000,y:6000,rotation:i%2?35:0,radius:3300,targetCount}};
   let candidate,rejection;try{candidate=generateBaseLayout(source,request,manifest);}catch(error){rejection=String(error.message);}
   assert.deepEqual(source,before);
   const entry={kind,size,seed,targetCount,request};
   if(rejection){assert.match(rejection,/terrain|slope|support|cannot fit|radius|clearance/i);report.cases.push({...entry,rejected:true,reason:rejection});continue;}
   const repeated=generateBaseLayout(source,request,manifest);
   // The operation records wall-clock authoring time; compare deterministic map content.
   repeated.project.baseLayouts.at(-1).updatedAt=candidate.project.baseLayouts.at(-1).updatedAt;
   assert.deepEqual(repeated,candidate);assert.deepEqual(source,before);
   const layout=candidate.project.baseLayouts.at(-1),expected=(targetCount||[15,21,30,42][sizeIndex])*2;
   assert.equal(layout.entities.length,expected);assert.deepEqual(candidate.project.terrain,source.terrain);assert.deepEqual(candidate.project.baseLayouts.slice(0,-1),source.baseLayouts);
   assert.equal(layout.metadata['formation.version'],expanded?'three-lane-anchor-v2':'three-lane-anchor-v1');
   const policy=JSON.parse(layout.metadata['forge.entrance-routing.v1']),areas=JSON.parse(layout.metadata['forge.build-areas.v1']),access=JSON.parse(layout.metadata['formation.access']);assert.equal(policy.sockets.length,6);assert.equal(areas.length,16);assert.equal(access.routes.length,12);assert.deepEqual(access.blocked,[]);
   for(const team of [1,2]){assert.equal(layout.entities.filter(e=>e.team===team).length,expected/2);assert.equal(layout.entities.filter(e=>e.team===team&&e.token==='e').length,8);}
   const file=path.join(out,`${request.layoutId}.json`),text=JSON.stringify(candidate.project);await fs.writeFile(file,text);report.cases.push({...entry,units:expected,path:file,sha256:hash(text),deterministic:true});
  }
 }
 assert.equal(report.cases.length,288);assert.ok(report.cases.filter(c=>c.kind==='flat').every(c=>!c.rejected));report.passed=true;
}catch(error){report.error=error.stack;process.exitCode=1;}finally{await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,out,cases:report.cases.length,accepted:report.cases.filter(c=>!c.rejected).length,rejected:report.cases.filter(c=>c.rejected).length,error:report.error}));}
