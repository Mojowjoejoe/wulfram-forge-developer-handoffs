import {hasModelForEntity, structureTerrainClearance, type AssetManifest, type BaseTemplate, type BaseTemplateUnit} from './wulfram.ts';
import {distanceToSegment} from './build-areas.ts';
import type {CreativeSize} from './creative-base-layouts.ts';

export const VALLEY_POCKETS_VERSION = 'valley-pockets-v1';
type Point = [number, number];
export type ValleyPocketPlan = {
 version: typeof VALLEY_POCKETS_VERSION | 'valley-pockets-v2';
 seed: string;
 size: CreativeSize;
 passage: {width: number; points: Point[]};
 sites: Array<{id: string; side: -1 | 1; center: Point; radius: number; roles: string[];
  frontage: {width: number; points: Point[]}}>;
 bounds: {min: Point; max: Point};
};
const roles: Record<CreativeSize, string[][]> = {
 small: [['u','r','g'], ['f','g','s']],
 standard: [['u','r','g'], ['f','g','s'], ['g','g','s']],
 large: [['u','r','g'], ['f','g','s'], ['g','s','L'], ['g','g','s']],
 massive: [['u','r','g'], ['f','g','s'], ['g','s','L'], ['g','g','s'], ['d','g','L'], ['d','g','s']],
};
function roleSpec(size: CreativeSize) {
 if (!Object.hasOwn(roles,size)) throw new Error('Unsupported Valley Pockets size.');
 return roles[size];
}
export function valleyPocketRequiredCounts(size: CreativeSize): Record<string,number> {
 const spec=roleSpec(size), counts: Record<string,number>={e:spec.length*2};
 for(const site of spec) for(const token of site) counts[token]=(counts[token]??0)+1;
 return counts;
}
/** Local design only: does not place buildings, alter terrain or certify destination access. */
export function valleyPocketPlan(seed: string, size: CreativeSize): ValleyPocketPlan {
 const spec=roleSpec(size);
 if(typeof seed!=='string'||seed.length>256) throw new Error('Valley Pockets seed must be text of at most 256 characters.');
 let state=2166136261;
 for(const c of `${VALLEY_POCKETS_VERSION}:${seed}`) state=Math.imul(state^c.charCodeAt(0),16777619)>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const firstSide: -1|1=random()<.5?-1:1;
 const stations=[0];
 for(let i=1;i<spec.length;i++) stations.push(stations[i-1]+640+random()*320);
 const offset=stations.at(-1)!/2;
 const sites: ValleyPocketPlan['sites']=spec.map((tokens,i)=>{
  const side=(i%2===0?firstSide:-firstSide) as -1|1;
  const x=stations[i]-offset, setback=650+random()*300, skew=(random()-.5)*180;
  return {id:`pocket-${i+1}`,side,center:[x,side*setback],radius:260,roles:[...tokens],
   frontage:{width:120,points:[[x-skew,0],[x,side*(setback-350)]]}};
 });
 const passage: ValleyPocketPlan['passage']={width:240,points:[[stations[0]-offset-600,0],[stations.at(-1)!-offset+600,0]]};
 const xs=sites.flatMap(s=>[s.center[0]-s.radius,s.center[0]+s.radius]);
 const ys=sites.flatMap(s=>[s.center[1]-s.radius,s.center[1]+s.radius]);
 for(const route of [passage,...sites.map(s=>s.frontage)]) for(const [x,y] of route.points){xs.push(x-route.width/2,x+route.width/2);ys.push(y-route.width/2,y+route.width/2);}
 return {version:VALLEY_POCKETS_VERSION,seed,size,passage,sites,bounds:{min:[Math.min(...xs),Math.min(...ys)],max:[Math.max(...xs),Math.max(...ys)]}};
}


/** Original-model local candidate. Destination power, terrain and access checks remain mandatory. */
export function valleyPocketTemplate(seed: string, size: CreativeSize, manifest: AssetManifest): {
 template: BaseTemplate; plan: ValleyPocketPlan; siteUnitIndices: number[][];
 serviceRoutes: Array<{siteId: string; unitIndex: number; width: number; points: Point[]}>;
} {
 const plan=valleyPocketPlan(seed,size), counts=valleyPocketRequiredCounts(size);
 const radii=new Map<string,number>();
 for(const token of Object.keys(counts)){
  for(const team of [1,2]) if(!hasModelForEntity({token,team},manifest)) throw new Error(`Valley Pockets needs the original ${token} model for team ${team}.`);
  radii.set(token,Math.max(...[1,2].map(team=>structureTerrainClearance({token,team},manifest,0,0).footprint/Math.SQRT2)));
 }
 let state=2166136261;
 for(const c of `${VALLEY_POCKETS_VERSION}:units:${seed}`) state=Math.imul(state^c.charCodeAt(0),16777619)>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const units: BaseTemplateUnit[]=[], siteUnitIndices: number[][]=[];
 const serviceRoutes: Array<{siteId: string; unitIndex: number; width: number; points: Point[]}>=[];
 const radius=(token: string)=>radii.get(token)!;
 const paths=[plan.passage,...plan.sites.map(site=>site.frontage)];
 for(const site of plan.sites){
  const indices: number[]=[];
  const clear=(token: string,x: number,y: number)=>
   Math.hypot(x-site.center[0],y-site.center[1])+radius(token)<=site.radius &&
   units.every(other=>Math.hypot(x-other.offset[0],y-other.offset[1])>=Math.max(radius(token)+radius(other.token)+14,
    ['r','f'].includes(token)?radius(other.token)+96:0,['r','f'].includes(other.token)?radius(token)+96:0)) &&
   paths.every(route=>distanceToSegment(x,y,route.points[0],route.points[1])>=route.width/2+radius(token)+14);
  const add=(token: string,x: number,y: number,yaw=0)=>{
   if(!clear(token,x,y)) throw new Error('Valley Pockets cannot fit the original buildings inside their yards while keeping passages clear.');
   const index=units.length;units.push({token,offset:[x,y],rotation:[0,0,yaw],groundOffset:0,active:1});indices.push(index);return index;
  };
  add('e',site.center[0]-20,site.center[1]);add('e',site.center[0]+20,site.center[1]);
  // Place pads first at the reserved inward frontage. Other roles stay on the outward half.
  for(const token of site.roles.filter(token=>['r','f'].includes(token))){
   const point: Point=[site.center[0],site.center[1]-site.side*160];
   const unitIndex=add(token,...point,-site.side*Math.PI/2);
   serviceRoutes.push({siteId:site.id,unitIndex,width:80,points:[[...site.frontage.points[1]],point]});
  }
  for(const token of site.roles.filter(token=>!['r','f'].includes(token))){
   let placed=false;
   for(let attempt=0;attempt<500;attempt++){
    const angle=site.side*Math.PI/2+(random()-.5)*2.2, reach=130+random()*70;
    const x=site.center[0]+Math.cos(angle)*reach,y=site.center[1]+Math.sin(angle)*reach;
    if(!clear(token,x,y))continue;
    add(token,x,y,angle);placed=true;break;
   }
   if(!placed)throw new Error('Valley Pockets seed cannot fit its required roles.');
  }
  siteUnitIndices.push(indices);
 }
 const template: BaseTemplate={id:VALLEY_POCKETS_VERSION,name:'Valley Pockets (experimental)',description:'Staggered powered side yards keep a continuous central passage open.',sourceMap:VALLEY_POCKETS_VERSION,sourceState:seed,sourceTeam:1,sourceWorldSize:[16000,12000],sourceAnchor:[0,0],unitCount:units.length,footprint:{width:plan.bounds.max[0]-plan.bounds.min[0],height:plan.bounds.max[1]-plan.bounds.min[1]},units};
 return {template,plan,siteUnitIndices,serviceRoutes};
}
