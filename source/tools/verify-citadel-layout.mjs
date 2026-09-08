import fs from 'node:fs';
import { sampleSlopeDegrees, sampleHeight, structureTerrainClearance, CATALOG } from '../lib/wulfram.ts';
const project=JSON.parse(fs.readFileSync(process.argv[2] ?? 'outputs/canyon-citadel-blockout-v6/project.json'));
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json'));
const identity=JSON.parse(project.metadata['showcase.identity']);
const terrain=project.terrain;
const point=(u,v)=>[3200+(u+v)*3200/Math.SQRT2,3200+(u-v)*3200/Math.SQRT2];
const corridors=[-1,0,1].map(side=>{
  const samples=[];
  for(let n=0;n<=200;n++) {
    const u=-.78+1.56*n/200;
    const v=side*.64*Math.cos(Math.PI/2*Math.min(1,Math.abs(u)/.82));
    for(const offset of [-60,-30,0,30,60]) {
      const [x,y]=point(u,v+offset/3200);
      samples.push({x,y,slope:sampleSlopeDegrees(terrain,x,y),height:sampleHeight(terrain,x,y)});
    }
  }
  return {name:side===0?'main':side<0?'west canyon/ridge':'east ridge/canyon',
    sampledWidth:120,samples:samples.length,maximumSlope:Math.max(...samples.map(s=>s.slope)),
    minimumHeight:Math.min(...samples.map(s=>s.height)),maximumHeight:Math.max(...samples.map(s=>s.height)),
    passed:samples.every(s=>s.slope<=22)};
});
const exits=identity.baseAnchors.map(([bx,by],index)=>{
  let minimum=Infinity;
  for(let forward=-200;forward<=1100;forward+=20) {
    const sign=index===0?1:-1;
    const x=bx+sign*forward/Math.SQRT2,y=by+sign*forward/Math.SQRT2;
    for(const e of project.entities) {
      const item=CATALOG.find(c=>c.token===e.token);
      const clearance=structureTerrainClearance(e,manifest,item?.footprint??10,0);
      minimum=Math.min(minimum,Math.hypot(x-e.position[0],y-e.position[1])-clearance.footprint/Math.SQRT2);
    }
  }
  return {team:index+1,minimumSampledCenterlineClearance:minimum,requiredRadius:60,passed:minimum>=60};
});
console.log(JSON.stringify({passed:corridors.every(c=>c.passed)&&exits.every(e=>e.passed),corridors,exits,
  note:'Offline 120-unit sampled corridor, not verified vehicle swept-volume clearance.'},null,2));
