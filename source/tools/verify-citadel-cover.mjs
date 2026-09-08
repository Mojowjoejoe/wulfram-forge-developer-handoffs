import fs from 'node:fs';
import { sampleHeight, sampleSlopeDegrees } from '../lib/wulfram.ts';
import { CITADEL_ENTRANCE } from '../lib/citadel-layout.ts';
const p=JSON.parse(fs.readFileSync(process.argv[2]??'outputs/canyon-citadel-blockout-v8/project.json'));
const identity=JSON.parse(p.metadata['showcase.identity']);
const results=[];
for(let team=1;team<=2;team++) {
  const [bx,by]=identity.baseAnchors[team-1],sign=team===1?1:-1;
  const world=(f,s)=>[bx+sign*(f+s)/Math.SQRT2,by+sign*(f-s)/Math.SQRT2];
  const targets=p.entities.filter(e=>e.team===team&&['e','r','f'].includes(e.token));
  const exposed=[];let rays=0;
  for(const [f,s] of [[1600,0],[1600,-700],[1600,700],[1200,-1300],[1200,1300],[400,-1400],[400,1400]]) {
    const [x,y]=world(f,s);
    for(const eye of [10,35,70]) for(const target of targets) {
      rays++;
      const z=sampleHeight(p.terrain,x,y)+eye;
      const end=target.position[2]+30;
      let blocked=false;
      for(let n=1;n<400;n++) {
        const t=n/400;
        if(sampleHeight(p.terrain,x+(target.position[0]-x)*t,y+(target.position[1]-y)*t)>z+(end-z)*t+2) {blocked=true;break;}
      }
      if(!blocked) exposed.push({attacker:[f,s],eye,target:target.id,token:target.token});
    }
  }
  let maxSlope=0;
  for(const side of [-1,1]) for(let i=1;i<CITADEL_ENTRANCE.length;i++) {
    const a=CITADEL_ENTRANCE[i-1],b=CITADEL_ENTRANCE[i];
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    for(let d=0;d<=length;d+=10) for(const off of [-60,0,60]) {
      const f=a[0]+(b[0]-a[0])*d/length-off*(b[1]-a[1])/length;
      const s=a[1]+(b[1]-a[1])*d/length+off*(b[0]-a[0])/length;
      const [x,y]=world(f,side*s);
      maxSlope=Math.max(maxSlope,sampleSlopeDegrees(p.terrain,x,y));
    }
  }
  results.push({team,rays,blocked:rays-exposed.length,exposed,entranceMaximumSlope:maxSlope});
}
const report={passed:results.every(r=>!r.exposed.length&&r.entranceMaximumSlope<=22),results,
  note:'Sampled terrain rays at 10/35/70-unit observer heights to structure origin +30. Not live projectile proof.'};
if(process.argv[3]){if(fs.existsSync(process.argv[3]))throw new Error('Preserve prior reports');fs.writeFileSync(process.argv[3],JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));
if(!report.passed)process.exitCode=1;
