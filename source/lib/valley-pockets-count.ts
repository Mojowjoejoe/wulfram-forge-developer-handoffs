import {valleyPocketTemplate} from './valley-pockets.ts';
import {distanceToSegment} from './build-areas.ts';
import {hasModelForEntity,structureTerrainClearance,type AssetManifest} from './wulfram.ts';
import type {CreativeSize} from './creative-base-layouts.ts';
export const VALLEY_POCKETS_COUNT_VERSION='valley-pockets-v2';
/** Extend existing yards only; V1 defaults and fixed service geometry remain unchanged. */
export function countedValleyPocketTemplate(seed:string,size:CreativeSize,manifest:AssetManifest,target?:number){
 const built=valleyPocketTemplate(seed,size,manifest),minimum=built.template.unitCount;
 if(target===undefined||target===0||target===minimum)return built;
 if(!Number.isInteger(target)||target<minimum||target>120)throw new Error(`Valley Pockets ${size} needs ${minimum}–120 new structures per team. Use 0 for the default; large targets may not fit.`);
 const {template,plan,siteUnitIndices}=built,units=template.units;
 let state=2166136261;for(const c of `${VALLEY_POCKETS_COUNT_VERSION}:${seed}:${target}`)state=Math.imul(state^c.charCodeAt(0),16777619)>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const radii=new Map<string,number>();
 const radius=(token:string)=>{
  if(!radii.has(token))radii.set(token,Math.max(...[1,2].map(team=>structureTerrainClearance({token,team},manifest,0,0).footprint/Math.SQRT2)));
  return radii.get(token)!;
 };
 const paths=[plan.passage,...plan.sites.map(s=>s.frontage)];
 for(let extra=0;units.length<target;extra++){
  const token=['g','s','g','L'][extra%4];
  for(const team of [1,2])if(!hasModelForEntity({token,team},manifest))throw new Error(`Valley Pockets count needs the original ${token} model for team ${team}.`);
  let placed=false;
  for(let offset=0;offset<plan.sites.length&&!placed;offset++){
   const index=(extra+offset)%plan.sites.length,site=plan.sites[index];
   for(let trial=0;trial<400;trial++){
    const angle=site.side*Math.PI/2+(random()-.5)*2.8,reach=90+random()*140;
    const x=site.center[0]+Math.cos(angle)*reach,y=site.center[1]+Math.sin(angle)*reach;
    if(reach+radius(token)>site.radius)continue;
    if(units.some(u=>Math.hypot(x-u.offset[0],y-u.offset[1])<Math.max(radius(token)+radius(u.token)+14,['r','f'].includes(u.token)?radius(token)+96:0)))continue;
    if(paths.some(r=>distanceToSegment(x,y,r.points[0],r.points[1])<r.width/2+radius(token)+14))continue;
    if(built.serviceRoutes.some(r=>distanceToSegment(x,y,r.points[0],r.points[1])<radius(token)+80))continue;
    if(!siteUnitIndices[index].some(i=>units[i].token==='e'&&Math.hypot(x-units[i].offset[0],y-units[i].offset[1])<=270))continue;
    siteUnitIndices[index].push(units.length);site.roles.push(token);
    units.push({token,offset:[x,y],rotation:[0,0,angle],groundOffset:0,active:1});placed=true;break;
   }
  }
  if(!placed)throw new Error(`Valley Pockets cannot fit exactly ${target} new structures per team inside its existing yards. Lower the count, choose a larger size or reroll.`);
 }
 plan.version=VALLEY_POCKETS_COUNT_VERSION;template.id=VALLEY_POCKETS_COUNT_VERSION;template.sourceMap=VALLEY_POCKETS_COUNT_VERSION;template.unitCount=units.length;
 return built;
}
