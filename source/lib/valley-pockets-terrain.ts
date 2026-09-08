import {reconstructPortableValley,type PortableValleyRecipe} from './valley-pockets-portable.ts';
import {countedValleyPocketTemplate} from './valley-pockets-count.ts';
import {distanceToSegment} from './build-areas.ts';
import {sampleSlopeDegrees,structureTerrainClearance,type AssetManifest,type WulframProject} from './wulfram.ts';
import type {CreativePlacement} from './builtin-base-layouts.ts';

type Point=[number,number];
/** Bounded local fitting only. Final editor constraints and paired entity validation remain required. */
export function fitValleyPocketTerrain(project: WulframProject, manifest: AssetManifest, seed: string, placement: CreativePlacement, portable?:PortableValleyRecipe) {
 if(![placement.x,placement.y,placement.rotation,placement.radius,project.validation.serviceRadius,project.validation.maxSlopeDegrees,project.validation.minSpacing].every(Number.isFinite)||placement.radius<=0) throw new Error('Valley Pockets placement and validation settings must be finite.');
 const reconstructed=portable?reconstructPortableValley(portable,manifest):undefined;
 if(portable&&(seed!==portable.seed||placement.size!==portable.size||placement.targetCount!==undefined&&placement.targetCount!==0&&placement.targetCount!==portable.targetCount))throw new Error('Saved Valley Pockets size, seed and count are fixed.');
 const original=reconstructed??countedValleyPocketTemplate(seed,placement.size,manifest,placement.targetCount), fitted=structuredClone(original);
 const shifts: Array<{siteId:string;dx:number;dy:number}>=[];
 const yaw=placement.rotation*Math.PI/180,c=Math.cos(yaw),s=Math.sin(yaw);
 const world=(point:Point,team:number):Point=>{
  const x=placement.x+point[0]*c-point[1]*s,y=placement.y+point[0]*s+point[1]*c;
  return team===1?[x,y]:[project.terrain.worldWidth-x,project.terrain.worldHeight-y];
 };
 const slopeLimit=Math.min(18,project.validation.maxSlopeDegrees);
 const supported=(point:Point,radius:number)=>{
  if(Math.hypot(...point)+radius>placement.radius)return false;
  for(const team of [1,2]){
   const [x,y]=world(point,team);
   if(x-radius<0||y-radius<0||x+radius>project.terrain.worldWidth||y+radius>project.terrain.worldHeight)return false;
   for(const [dx,dy] of [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]]){
    const slope=sampleSlopeDegrees(project.terrain,x+dx,y+dy);
    if(!Number.isFinite(slope)||slope>slopeLimit)return false;
   }
  }
  return true;
 };
 const routeSupported=(points:Point[],width:number)=>{
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),steps=Math.max(1,Math.ceil(length/40));
   for(let j=0;j<=steps;j++){
    const x=a[0]+dx*j/steps,y=a[1]+dy*j/steps;
    // Conservative end caps, plus center and both edges across the full reserved width.
    if(!supported([x,y],width/2))return false;
    for(const side of [-width/2,0,width/2])if(!supported([x-dy/(length||1)*side,y+dx/(length||1)*side],0))return false;
   }
  }
  return true;
 };
 if(!routeSupported(original.plan.passage.points,original.plan.passage.width))throw new Error('Valley Pockets central passage cannot fit this terrain or placement area. Move or rotate the base.');
 const radii=original.template.units.map(u=>Math.max(...[1,2].map(team=>structureTerrainClearance({token:u.token,team},manifest,0,0).footprint/Math.SQRT2)));
 const reach=Math.max(0,Math.min(project.validation.serviceRadius,280)-10);
 for(const indices of original.siteUnitIndices)for(const i of indices)if(original.template.units[i].token!=='e'&&!indices.some(j=>original.template.units[j].token==='e'&&Math.hypot(original.template.units[i].offset[0]-original.template.units[j].offset[0],original.template.units[i].offset[1]-original.template.units[j].offset[1])<=reach))throw new Error('Valley Pockets needs a larger saved power radius for these fixed yard arrangements.');
 const offsets: Point[]=[];
 for(let dx=-160;dx<=160;dx+=20)for(let dy=-140;dy<=140;dy+=20)offsets.push([dx,dy]);
 offsets.sort((a,b)=>Math.hypot(...a)-Math.hypot(...b)||a[0]-b[0]||a[1]-b[1]);
 for(const [siteIndex,sourceSite] of original.plan.sites.entries()){
  const indices=original.siteUnitIndices[siteIndex];let found=false;
  for(const [dx,dy] of portable||placement.terrainAware===false?[[0,0] as Point]:offsets){
   const center: Point=[sourceSite.center[0]+dx,sourceSite.center[1]+dy];
   if(Math.sign(center[1])!==sourceSite.side||Math.abs(center[1])<600||Math.hypot(...center)+sourceSite.radius>placement.radius)continue;
   if(siteIndex&&center[0]-fitted.plan.sites[siteIndex-1].center[0]<320)continue;
   const branch: Point[]=[[...sourceSite.frontage.points[0]],[sourceSite.frontage.points[1][0]+dx,sourceSite.frontage.points[1][1]+dy]];
   const trialUnits=fitted.template.units.map((u,i)=>indices.includes(i)?{...u,offset:[original.template.units[i].offset[0]+dx,original.template.units[i].offset[1]+dy] as Point}:u);
   const trialRoutes=[fitted.plan.passage,...fitted.plan.sites.map((site,i)=>i===siteIndex?{width:site.frontage.width,points:branch}:site.frontage)];
   if(!indices.every(i=>supported(trialUnits[i].offset,radii[i])))continue;
   if(!routeSupported(branch,sourceSite.frontage.width))continue;
   const service=original.serviceRoutes.filter(r=>r.siteId===sourceSite.id).map(r=>({...r,points:r.points.map(([x,y])=>[x+dx,y+dy] as Point)}));
   if(service.some(r=>!routeSupported(r.points,r.width)))continue;
   if(trialUnits.some((u,i)=>trialRoutes.some(r=>distanceToSegment(...u.offset,r.points[0],r.points[1])<r.width/2+radii[i]+14)))continue;
   if(trialUnits.some((u,i)=>trialUnits.slice(i+1).some((v,k)=>Math.hypot(u.offset[0]-v.offset[0],u.offset[1]-v.offset[1])<Math.max(radii[i]+radii[i+k+1]+Math.max(14,project.validation.minSpacing),['r','f'].includes(u.token)?radii[i+k+1]+96:0,['r','f'].includes(v.token)?radii[i]+96:0))))continue;
   fitted.template.units=trialUnits;fitted.plan.sites[siteIndex].center=center;fitted.plan.sites[siteIndex].frontage.points=branch;
   for(const route of service)fitted.serviceRoutes[fitted.serviceRoutes.findIndex(r=>r.unitIndex===route.unitIndex)]=route;
   shifts.push({siteId:sourceSite.id,dx,dy});found=true;break;
  }
  if(!found)throw new Error(`Valley Pockets ${sourceSite.id} cannot fit within its side-pocket window. Move the base or reshape the terrain.`);
 }
 const xs:number[]=[],ys:number[]=[];
 for(const site of fitted.plan.sites){xs.push(site.center[0]-site.radius,site.center[0]+site.radius);ys.push(site.center[1]-site.radius,site.center[1]+site.radius);}
 for(const route of [fitted.plan.passage,...fitted.plan.sites.map(s=>s.frontage)])for(const [x,y] of route.points){xs.push(x-route.width/2,x+route.width/2);ys.push(y-route.width/2,y+route.width/2);}
 fitted.plan.bounds={min:[Math.min(...xs),Math.min(...ys)],max:[Math.max(...xs),Math.max(...ys)]};
 fitted.template.footprint={width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
 return {...fitted,originalPlan:reconstructed?.originalPlan??original.plan,shifts:reconstructed?.shifts??shifts};
}
