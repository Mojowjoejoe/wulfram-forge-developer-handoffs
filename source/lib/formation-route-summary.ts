import {routeClearance,type RoutePoint} from './route-inspection.ts';
import type {AssetManifest,BaseLayoutState,WulframProject} from './wulfram.ts';

export interface FormationRouteSummary {routes:number;tight:number;blocked:number;vehicleWidth:80;unavailable?:string}
/** Count affected generated approaches, not individual markers or reserved expansion strips. */
export function formationRouteSummary(project:WulframProject,manifest:AssetManifest,layout:BaseLayoutState):FormationRouteSummary{
 const summary:FormationRouteSummary={routes:0,tight:0,blocked:0,vehicleWidth:80};
 const raw=layout.metadata['formation.access'];
 if(!raw)return {...summary,unavailable:'Approaches not checked. Enable sampled access checks and preview again.'};
 try{
  const receipt=JSON.parse(raw);
  if(!Array.isArray(receipt.routes)||!receipt.routes.length||receipt.routes.some((r:unknown)=>!Array.isArray(r)||r.length<2||r.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite))))throw new Error('Missing or invalid generated routes.');
  const candidate={...project,entities:layout.entities,validation:layout.validation};
  for(const route of receipt.routes as RoutePoint[][]){
   const markers=routeClearance(candidate,manifest,route,80);
   summary.routes++;
   if(markers.some(m=>m.severity==='blocked'))summary.blocked++;
   else if(markers.some(m=>m.severity==='tight'))summary.tight++;
  }
  return summary;
 }catch{return {...summary,routes:0,tight:0,blocked:0,unavailable:'Approach clearance unavailable. Inspect this option before applying.'};}
}
