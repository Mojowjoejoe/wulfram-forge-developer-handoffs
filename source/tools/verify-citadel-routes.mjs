import fs from 'node:fs';
import { sampleSlopeDegrees, structureTerrainClearance, CATALOG } from '../lib/wulfram.ts';
import { CITADEL_ENTRANCE } from '../lib/citadel-layout.ts';
const project=JSON.parse(fs.readFileSync(process.argv[2] ?? 'outputs/canyon-citadel-blockout-v11/project.json'));
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json'));
const identity=JSON.parse(project.metadata['showcase.identity']);
const terrain=project.terrain;
const point=(u,v)=>[3200+(u+v)*3200/Math.SQRT2,3200+(u-v)*3200/Math.SQRT2];
const radius=e=>structureTerrainClearance(e,manifest,CATALOG.find(c=>c.token===e.token)?.footprint??10,0).footprint/Math.SQRT2;
const corridors=[-1,0,1].map(side=>{
  const entrance=CITADEL_ENTRANCE.slice(0,side===0?6:4).map(([f,s])=>{
    const [bx,by]=identity.baseAnchors[0];s*=side||1;
    return [bx+(f+s)/Math.SQRT2,by+(f-s)/Math.SQRT2];
  });
  const middle=Array.from({length:101},(_,n)=>{
    const u=-.34+.68*n/100;
    const outpost=project.entities.find(e=>e.id==='central-neutral-repair-1'&&e.team===0&&e.token==='r'&&e.position[0]===3200&&e.position[1]===3200);
    const bypass=outpost&&side===0&&Math.abs(u)<.10?.075*Math.cos(u/.10*Math.PI/2):0;
    return point(u,bypass+side*.64*Math.cos(Math.PI/2*Math.min(1,Math.abs(u)/.82)));
  });
  const far=entrance.map(([x,y])=>[6400-x,6400-y]).reverse();
  if(side) for(let n=0;n<far.length;n++) {const [x,y]=far[n];far[n]=[y,x];}
  const route=[...entrance,...middle,...far];
  let maximumSlope=0,minimumClearance=Infinity,samples=0,worst;
  for(let i=1;i<route.length;i++) {
    const a=route[i-1],b=route[i],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
    if(len<.001)continue;
    for(let d=0;d<=len;d+=10) {
      const cx=a[0]+dx*d/len,cy=a[1]+dy*d/len;
      for(const offset of [-60,-30,0,30,60]) {
        const x=cx-dy*offset/len,y=cy+dx*offset/len;
        const slope=sampleSlopeDegrees(terrain,x,y);samples++;
        if(slope>maximumSlope){maximumSlope=slope;worst=[x,y];}
      }
      for(const e of project.entities)minimumClearance=Math.min(minimumClearance,Math.hypot(cx-e.position[0],cy-e.position[1])-radius(e));
    }
  }
  return {name:side===0?'main':side<0?'west canyon/ridge':'east ridge/canyon',sampledWidth:120,samples,
    maximumSlope,minimumClearance,worst,passed:maximumSlope<=22&&minimumClearance>=60};
});
let minimumStructureGap=Infinity;
for(let i=0;i<project.entities.length;i++)for(let j=i+1;j<project.entities.length;j++) {
  const a=project.entities[i],b=project.entities[j];
  minimumStructureGap=Math.min(minimumStructureGap,Math.hypot(a.position[0]-b.position[0],a.position[1]-b.position[1])-radius(a)-radius(b));
}
const report={passed:corridors.every(c=>c.passed)&&minimumStructureGap>=0,corridors,minimumStructureGap,
  note:'All three full base-to-base routes through offset entrances; 120-unit sampled width and conservative model radius clearance, not live swept-volume proof.'};
if(process.argv[3]){if(fs.existsSync(process.argv[3]))throw new Error('Preserve prior reports');fs.writeFileSync(process.argv[3],JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));
if(!report.passed)process.exitCode=1;
