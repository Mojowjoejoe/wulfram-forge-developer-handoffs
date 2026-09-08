import {routeElevation} from './route-elevation.ts';
import {checkFormationAccess} from './formation-access.ts';
import {ENTRANCE_ROUTING_KEY,readEntranceRouting,inspectEntranceRouting,entranceRoutingTeams} from './entrance-routing.ts';
import {FormationDiagnosticError} from './formation-diagnostics.ts';
import {BUILD_AREAS_KEY,readBuildAreas} from './build-areas.ts';
import type {AssetManifest,WulframProject,BaseLayoutState} from './wulfram.ts';
import {routeClearance,routeLength,assertRouteInspectionBudget,type RoutePoint} from './route-inspection.ts';
export interface InspectionRoute {id:string;name:string;points:RoutePoint[];kind:'service'|'authored'|'temporary';reservedWidth?:number;entranceCorridorId?:string}
export function inspectionRoutes(project:WulframProject,manifest:AssetManifest,includeAuthored=true){
  const routes:InspectionRoute[]=[],errors:string[]=[];
  let service:RoutePoint[][]=[];
  const layout=project.baseLayouts.find(l=>l.id===project.activeBaseLayoutId);
  let boundTeams:number[]=[],policyInvalid=false;
  try{
    const policy=readEntranceRouting(layout?.metadata[ENTRANCE_ROUTING_KEY]);
    boundTeams=entranceRoutingTeams(policy);
    if(policy&&layout)for(const receipt of inspectEntranceRouting(project,manifest,{...layout,entities:project.entities,validation:project.validation})){
      receipt.routes.forEach((r,i)=>routes.push({id:receipt.socketId?`entrance-socket-${encodeURIComponent(receipt.socketId)}-${i}`:`entrance-${receipt.team}-${i}`,name:receipt.socketId?`Team ${receipt.team} · ${receipt.name} · ${receipt.bound?'Bound approach':'Unbound exit'} · Pad ${i+1} (automatic connectors)`:`Team ${receipt.team} · Via ${receipt.corridorId} · Pad ${i+1}`,kind:'service',points:[...r].reverse(),entranceCorridorId:receipt.corridorId}));
    }
  }catch(error){policyInvalid=true;errors.push(`Selected entrances: ${error instanceof Error?error.message:'Invalid routing policy.'}`);}
  if(!policyInvalid&&project.entities.some(e=>['r','f'].includes(e.token)&&!boundTeams.includes(e.team))){
    try{service=checkFormationAccess(project,manifest).routes;}catch(error){service=error instanceof FormationDiagnosticError?error.overlay.routes:[];errors.push(`Automatic approaches: ${error instanceof Error?error.message:'Access check failed.'}`);}
  }
  service.forEach((r,i)=>{const pad=project.entities.find(e=>r.length&&Math.hypot(e.position[0]-r[0][0],e.position[1]-r[0][1])<1);if(policyInvalid||boundTeams.includes(pad?.team??-1))return;routes.push({id:`service-${i}`,name:`Route ${i+1} · Team ${pad?.team??'?'} · ${pad?.token==='r'?'Repair':'Refuel'}`,kind:'service',points:[...r].reverse()});});
  if(includeAuthored)try{
    const areas=readBuildAreas(project.baseLayouts.find(l=>l.id===project.activeBaseLayoutId)?.metadata[BUILD_AREAS_KEY]);
    for(const a of areas)if(a.kind==='corridor')routes.push({id:a.id,name:`Corridor · ${a.name}`,kind:'authored',points:a.points.map(p=>[...p]),reservedWidth:a.width});
  }catch(error){errors.push(`Authored corridors: ${error instanceof Error?error.message:'Invalid metadata.'}`);}
  const checked=routes.filter(route=>{
    try{
      assertRouteInspectionBudget(route.points);
      if(route.kind==='authored'&&route.points.some(([x,y])=>x<0||y<0||x>project.terrain.worldWidth||y>project.terrain.worldHeight))throw new Error('Authored points lie outside the map.');
      return true;
    }catch(error){errors.push(`${route.name}: ${error instanceof Error?error.message:'Route cannot be inspected.'}`);return false;}
  });
  if(!checked.length&&!errors.length)errors.push('No automatic service routes or authored corridors to inspect.');
  return {routes:checked,error:errors.join(' ')};
}

// Preview inspection must use candidate rules and never borrow saved-layout corridors.
export function routeInspectionProject(project:WulframProject,previewing:boolean,layout?:BaseLayoutState):WulframProject{
 if(!previewing)return project;
 return {...project,entities:layout?.entities??[],validation:layout?.validation??project.validation,baseLayouts:layout?[layout]:[],activeBaseLayoutId:layout?.id??''};
}
export function inspectRoutes(project:WulframProject,manifest:AssetManifest,vehicleWidth:number,points?:RoutePoint[]){
 if(!Number.isFinite(vehicleWidth)||vehicleWidth<20||vehicleWidth>400)throw new Error('Vehicle width must be 20-400 world units.');
 if(points!==undefined){
  if(!Array.isArray(points)||points.length<2||points.length>32||points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)))throw new Error('Inspection path needs 2-32 finite X,Y points.');
  if(points.some(([x,y])=>x<0||y<0||x>project.terrain.worldWidth||y>project.terrain.worldHeight))throw new Error('Inspection path must stay within the map.');
  assertRouteInspectionBudget(points);
  if(routeLength(points)===0)throw new Error('Inspection path needs two distinct points.');
 }
 const result:{routes:InspectionRoute[];error:string}=points?{routes:[{id:'temporary',name:'Temporary inspection path',kind:'temporary' as const,points:points.map(p=>[...p] as RoutePoint)}],error:''}:inspectionRoutes(project,manifest);
 let elevationSamplesRemaining=20000;
 const elevationFor=(route:InspectionRoute)=>{const profile=routeElevation(project.terrain,route.points,Math.min(10001,elevationSamplesRemaining));elevationSamplesRemaining-=profile.samples.length;return profile;};
 return {...result,vehicleWidth,evidence:'Sampled editor terrain and conservative building circles; not vehicle collision or gameplay proof.',routes:result.routes.map(route=>({...route,length:routeLength(route.points),elevation:elevationFor(route),vehicleWiderThanReservation:route.reservedWidth!==undefined&&vehicleWidth>route.reservedWidth,markers:routeClearance(project,manifest,route.points,vehicleWidth,route.kind==='service')}))};
}
