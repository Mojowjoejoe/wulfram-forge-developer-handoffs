import {routeClearance,type RoutePoint} from './route-inspection.ts';
import type {BuildArea} from './build-areas.ts';
import type {WulframProject,AssetManifest} from './wulfram.ts';
export function checkCourtyardAccess(project:WulframProject,manifest:AssetManifest,areas:BuildArea[]){
 const routes=([1,2] as const).map(team=>{
  const [court,west,east]=[0,1,2].map(i=>areas.find(a=>a.id===`service-courtyard-${team}-${i}`));
  if(!court||!west||!east||court.kind!=='corridor'||west.kind!=='corridor'||east.kind!=='corridor'||[court,west,east].some(a=>a.points.length!==2))throw new Error('Courtyard route geometry is invalid.');
  const close=(a:RoutePoint,b:RoutePoint)=>Math.hypot(a[0]-b[0],a[1]-b[1])<1e-6;
  if(!close(west.points[1],court.points[0])||!close(court.points[1],east.points[0]))throw new Error('Courtyard entrances must connect to the court.');
  const points:RoutePoint[]=[west.points[0],west.points[1],court.points[1],east.points[1]];
  const markers=routeClearance(project,manifest,points,80,false),blocked=markers.find(m=>m.severity==='blocked');
  if(blocked)throw new Error(`Courtyard through route: ${blocked.message}. Move the base or reshape the terrain.`);
  return {team,points,markers};
 });
 return {version:1,vehicleWidth:80,evidence:'Sampled terrain and estimated building clearance; not in-game collision proof.',routes};
}
