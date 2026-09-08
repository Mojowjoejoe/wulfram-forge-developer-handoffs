import {catalogFor,sampleHeight,sampleSlopeDegrees,structureTerrainClearance,type WulframProject,type AssetManifest} from './wulfram.ts';
export type RoutePoint=[number,number];
export interface ClearanceMarker {x:number;y:number;severity:'tight'|'blocked';message:string;progress:number}
export interface RouteCameraRequest {eye:[number,number,number];target:[number,number,number]}
export function routeLength(route:RoutePoint[]){return route.slice(1).reduce((n,p,i)=>n+Math.hypot(p[0]-route[i][0],p[1]-route[i][1]),0);}
export function assertRouteInspectionBudget(route:RoutePoint[]){
 if(route.length>4096||route.some(p=>p.length!==2||!p.every(Number.isFinite)))throw new Error('Route geometry is invalid or exceeds the inspection point limit.');
 const total=routeLength(route),samples=Math.ceil(total/40);
 if(!Number.isFinite(total)||samples>10000||samples*Math.max(1,route.length)>2000000)throw new Error('Route exceeds the inspection sampling budget. Shorten or split the corridor.');
}
export function routePoint(route:RoutePoint[],progress:number):RoutePoint{
  if(!route.length)throw new Error('No route selected.');
  let remaining=routeLength(route)*Math.max(0,Math.min(1,progress));
  for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(length&&remaining<=length){const t=remaining/length;return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];}remaining-=length;}
  return route[route.length-1];
}
export function routeCameraPose(project:WulframProject,route:RoutePoint[],progress:number):RouteCameraRequest{
  const length=routeLength(route),p=routePoint(route,progress),ahead=routePoint(route,Math.min(1,progress+120/Math.max(1,length)));
  const direction=progress>=1?routePoint(route,Math.max(0,1-120/Math.max(1,length))):ahead;
  let dx=direction[0]-p[0],dy=direction[1]-p[1];if(progress>=1){dx=-dx;dy=-dy;}const d=Math.hypot(dx,dy)||1;
  const tx=p[0]+dx/d*120,ty=p[1]+dy/d*120,z=sampleHeight(project.terrain,...p)+70;
  return {eye:[p[0],p[1],z],target:[tx,ty,Math.max(z-15,sampleHeight(project.terrain,tx,ty)+50)]};
}
/** Exact segment-to-building-circle distances; terrain is sampled, not collision certification. */
export function routeClearance(project:WulframProject,manifest:AssetManifest,route:RoutePoint[],vehicleWidth:number,allowServiceEndpoints=true):ClearanceMarker[]{
  if(!Number.isFinite(vehicleWidth)||vehicleWidth<20||vehicleWidth>400)throw new Error('Vehicle width must be 20–400 u.');
  assertRouteInspectionBudget(route);
  if(route.length<2)return [];
  const total=routeLength(route),half=vehicleWidth/2,markers:ClearanceMarker[]=[];
  for(const entity of project.entities){
    if(allowServiceEndpoints&&['r','f'].includes(entity.token)&&[route[0],route[route.length-1]].some(p=>Math.hypot(p[0]-entity.position[0],p[1]-entity.position[1])<1))continue;
    const radius=structureTerrainClearance(entity,manifest,0,0).footprint/Math.SQRT2;
    let best=Infinity,bestPoint=route[0],bestDistance=0,travel=0;
    for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),t=Math.max(0,Math.min(1,((entity.position[0]-a[0])*dx+(entity.position[1]-a[1])*dy)/(length*length||1)));const p:RoutePoint=[a[0]+dx*t,a[1]+dy*t],distance=Math.hypot(p[0]-entity.position[0],p[1]-entity.position[1])-radius;if(distance<best){best=distance;bestPoint=p;bestDistance=travel+length*t;}travel+=length;}
    if(best<half+40)markers.push({x:bestPoint[0],y:bestPoint[1],severity:best<half?'blocked':'tight',progress:bestDistance/Math.max(1,total),message:`${best<half?'Insufficient':'Tight'} clearance near team ${entity.team} ${catalogFor(entity)?.label??entity.token}: estimated centered width ${Math.max(0,best*2).toFixed(0)} u`});
  }
  const samples=Math.ceil(total/40);
  for(let i=0;i<=samples;i++){
    const progress=i/Math.max(1,samples),p=routePoint(route,progress),next=routePoint(route,progress===1?Math.max(0,progress-1/Math.max(1,samples)):Math.min(1,progress+1/Math.max(1,samples))),dx=next[0]-p[0],dy=next[1]-p[1],d=Math.hypot(dx,dy)||1;
    for(const side of [-half,0,half]){const x=p[0]-dy/d*side,y=p[1]+dx/d*side;const message=x<0||y<0||x>project.terrain.worldWidth||y>project.terrain.worldHeight?'Vehicle footprint crosses map edge':sampleSlopeDegrees(project.terrain,x,y)>Math.min(18,project.validation.maxSlopeDegrees)?'Steep terrain across vehicle width':undefined;
      if(message&&!markers.some(m=>m.message===message&&Math.hypot(m.x-p[0],m.y-p[1])<160)){markers.push({x:p[0],y:p[1],severity:'blocked',message,progress});break;}
    }
  }
  return markers.sort((a,b)=>Number(b.severity==='blocked')-Number(a.severity==='blocked')||a.progress-b.progress);
}
