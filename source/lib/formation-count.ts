import {structureTerrainClearance,type AssetManifest,type BaseTemplate} from './wulfram.ts';

export function fitFormationCount(template:BaseTemplate,target:number,manifest:AssetManifest,seed:string){
  if(!Number.isInteger(target)||target<6||target>120)throw new Error('Target count must be a whole number from 6 to 120 per team.');
  const t=structuredClone(template),units=t.units;
  let state=2166136261;for(const c of seed)state=Math.imul(state^c.charCodeAt(0),16777619)>>>0;
  const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const radius=(token:string)=>Math.max(...[1,2].map(team=>structureTerrainClearance({token,team},manifest,0,0).footprint/Math.SQRT2));
  for(let i=units.length-1;i>=0&&units.length>target;i--){
    const u=units[i];
    if(!['g','s','L','d','p'].includes(u.token))continue;
    if(u.token==='g'&&!units.some((v,j)=>j!==i&&v.token==='g'&&Math.hypot(v.offset[0]-u.offset[0],v.offset[1]-u.offset[1])<500))continue;
    units.splice(i,1);
  }
  if(units.length>target)throw new Error(`This size needs at least ${units.length} structures per team to retain power, services and local gun protection. Choose a smaller size or a higher target.`);
  const cells=units.filter(u=>u.token==='e');
  for(let attempt=0;units.length<target&&attempt<6000;attempt++){
    const cell=cells[Math.floor(random()*cells.length)],token=['g','s','L'][Math.floor(random()*3)];
    const angle=random()*Math.PI*2,d=100+random()*135,x=cell.offset[0]+Math.cos(angle)*d,y=cell.offset[1]+Math.sin(angle)*d;
    if(units.some(u=>Math.hypot(x-u.offset[0],y-u.offset[1])<radius(token)+radius(u.token)+14))continue;
    units.push({token,offset:[x,y],rotation:[0,0,angle],groundOffset:0,active:1});
  }
  if(units.length!==target)throw new Error('This unit target is too crowded for the chosen size. Increase size or lower the target.');
  t.unitCount=units.length;return t;
}
