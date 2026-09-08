import {brokenRingPlan,buildBrokenRingTemplate,type BrokenRingPlan} from './broken-ring.ts';
import type {CreativeSize} from './creative-base-layouts.ts';
import type {AssetManifest} from './wulfram.ts';
export const BROKEN_RING_V2='broken-ring-v2';
/** Experimental macro-layout revision. V1 reconstruction remains unchanged. */
export function brokenRingPlanV2(seed:string,size:CreativeSize):BrokenRingPlan{
 const base=brokenRingPlan(seed,size);
 let state=2166136261;for(const c of `${BROKEN_RING_V2}:${seed}`)state=Math.imul(state^c.charCodeAt(0),16777619)>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 // Independently vary overall aspect and the angular spans occupied by each shoulder.
 const horizontal=random()>.5,stretch=1.15+random()*.35,ax=horizontal?stretch:1,ay=horizontal?1:stretch;
 const radius={small:1050,standard:1250,large:1450,massive:1800}[size];
 const rearTurn=(random()-.5)*24,upperSpread=(random()-.5)*24,lowerSpread=(random()-.5)*24;
 const angles=base.sites.map((site,i)=>{
  let angle=Math.atan2(site.center[1],site.center[0])*180/Math.PI;if(angle<0)angle+=360;
  return (angle+(i<2?rearTurn:angle<180?upperSpread:lowerSpread))*Math.PI/180;
 });
 const rearOffset=(random()-.5)*700,bend=-160+(random()-.5)*160,frontOffset=(random()-.5)*260;
 const plan:BrokenRingPlan={version:BROKEN_RING_V2,seed,size,interiorRadius:450,
  route:{width:240,points:[[-radius*ax-350,rearOffset],[bend,rearOffset],[200,frontOffset],[radius*ax+350,frontOffset]]},
  serviceRoutes:[],circulation:{width:120,points:[]},
  sites:base.sites.map((site,i)=>({roles:[...site.roles],center:[Math.cos(angles[i])*radius*ax,Math.sin(angles[i])*radius*ay]}))};
 const sorted=[...new Set([...Array.from({length:16},(_,i)=>i*Math.PI/8),...angles])].sort((a,b)=>a-b);
 const points:Array<[number,number]>=sorted.map(angle=>[Math.cos(angle)*(radius-450)*ax,Math.sin(angle)*(radius-450)*ay]);
 plan.circulation.points=[...points,[...points[0]]];
 plan.serviceRoutes=angles.slice(0,2).map(angle=>({width:120,points:[[bend,rearOffset],[...points[sorted.indexOf(angle)]]]}));
 return plan;
}
export function brokenRingTemplateV2(seed:string,size:CreativeSize,manifest:AssetManifest){return buildBrokenRingTemplate(brokenRingPlanV2(seed,size),manifest);}

/** Reconstruct saved recipes without upgrading their geometry. */
export function reconstructBrokenRingPlan(version:string,seed:string,size:CreativeSize):BrokenRingPlan{
 if(version==='broken-ring-v1')return brokenRingPlan(seed,size);
 if(version===BROKEN_RING_V2)return brokenRingPlanV2(seed,size);
 throw new Error('Unsupported Broken Ring plan version.');
}
