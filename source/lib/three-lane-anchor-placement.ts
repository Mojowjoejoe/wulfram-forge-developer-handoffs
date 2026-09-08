import {threeLaneAnchorTemplate,threeLaneAnchorRequiredCounts} from './three-lane-anchor.ts';
import {placeFormation,type CreativePlacement} from './builtin-base-layouts.ts';
import {BUILD_AREAS_KEY,readBuildAreas,checkBuildAreas,distanceToSegment,type BuildArea} from './build-areas.ts';
import {ENTRANCE_ROUTING_KEY,readEntranceRouting} from './entrance-routing.ts';
import {inspectEntranceSockets,type EntranceSocketPolicy} from './entrance-sockets.ts';
import {orientedBuildingRadius} from './oriented-building-radius.ts';
import {routeClearance} from './route-inspection.ts';
import {assertEditorConstraints} from './editor-constraints.ts';
import {analyzeRotationalEntityPairs} from './balanced-map-analysis.ts';
import {synchronizeActiveBaseLayout,type WulframProject,type AssetManifest} from './wulfram.ts';

/** Pure additive candidate. The caller owns preview, revision checking and commit. */
export function previewThreeLaneAnchorPlacement(project:WulframProject,manifest:AssetManifest,seed:string,placement:CreativePlacement,id:string){
 const active=project.baseLayouts.find(l=>l.id===project.activeBaseLayoutId);
 if(!active)throw new Error('Choose an active layout.');
 if(![placement.x,placement.y,placement.rotation,placement.radius].every(Number.isFinite)||placement.radius<=0)throw new Error('Anchor placement needs finite coordinates, rotation and a positive radius.');
 if(!id||id.length>70||project.entities.some(e=>e.id.startsWith(`${id}-`)))throw new Error('Choose a fresh Three-Lane Anchor placement ID of at most 70 characters.');
 if(readEntranceRouting(active.metadata[ENTRANCE_ROUTING_KEY]))throw new Error('This layout already has entrance rules. Three-Lane Anchor needs all three sockets per team; preserve this layout and choose an empty entrance layout.');
 if(placement.entranceDegrees!==undefined||placement.offsetArrangement!==undefined)throw new Error('Three-Lane Anchor uses its own three entrances.');
 threeLaneAnchorRequiredCounts(placement.size,placement.targetCount);
 const fitted=threeLaneAnchorTemplate(seed,placement.size,manifest,placement.targetCount);
 const layout=placeFormation(project,manifest,fitted.template,id,'Three-Lane Anchor',{}, {...placement,checkAccess:false},'shared-footprint-v2');
 const pair=analyzeRotationalEntityPairs({...project,entities:layout.entities},manifest);if(!pair.passed)throw new Error(`Anchor requires matching paired terrain support: ${pair.message}`);
 const yaw=placement.rotation*Math.PI/180,c=Math.cos(yaw),s=Math.sin(yaw);
 const transform=([x,y]:[number,number],team:number):[number,number]=>{const wx=placement.x+x*c-y*s,wy=placement.y+x*s+y*c;return team===1?[wx,wy]:[project.terrain.worldWidth-wx,project.terrain.worldHeight-wy];};
 const areas:BuildArea[]=[],policy:EntranceSocketPolicy={version:2,sockets:[]};
 for(const team of [1,2] as const){
  const reserve=(key:string,width:number,points:Array<[number,number]>)=>{const area:BuildArea={id:`${id}-${team}-${key}`,name:`Anchor team ${team} ${key}`,kind:'corridor',team:'all',width,points:points.map(p=>transform(p,team))};areas.push(area);return area.id;};
  reserve('rear-road',fitted.plan.rearRoad.width,fitted.plan.rearRoad.points);reserve('services',fitted.plan.serviceConnector.width,fitted.plan.serviceConnector.points);
  for(const [i,route] of fitted.entranceRoutes.entries()){
   const mouthCorridorId=reserve(`entrance-${i+1}`,route.width,route.points),court=fitted.plan.courts[i];
   reserve(`court-${i+1}`,court.width,[court.mouth.points.at(-1)!,court.rearConnector.points[0]]);
   policy.sockets.push({id:`${id}-${team}-${i+1}`,name:['Left','Middle','Right'][i],team,mouthCorridorId,mouthDirection:'forward'});
  }
 }
 const combined=[...project.entities,...layout.entities],radii=new Map(combined.map(e=>[e.id,orientedBuildingRadius(e,manifest)]));
 for(let i=project.entities.length;i<combined.length;i++){
  const a=combined[i],r=radii.get(a.id)!,[x,y]=a.position;
  const anchor=transform([0,0],a.team);if(Math.hypot(x-anchor[0],y-anchor[1])+r>placement.radius)throw new Error('Anchor building exceeds the placement radius.');
  if(x-r<0||y-r<0||x+r>project.terrain.worldWidth||y+r>project.terrain.worldHeight)throw new Error('Anchor oriented model crosses the map boundary.');
  for(let j=0;j<i;j++){const b=combined[j],other=radii.get(b.id)!;if(Math.hypot(x-b.position[0],y-b.position[1])<Math.max(r+other+Math.max(14,project.validation.minSpacing),['r','f'].includes(a.token)?other+96:0,['r','f'].includes(b.token)?r+96:0))throw new Error('Anchor overlaps a building or narrows a service pad.');}
 }
 const existing=readBuildAreas(active.metadata[BUILD_AREAS_KEY]),allAreas=readBuildAreas(JSON.stringify([...existing,...areas]));
 for(const team of [1,2]){const anchor=transform([0,0],team);for(const area of areas.filter(a=>a.id.startsWith(`${id}-${team}-`)))if(area.kind==='corridor'&&area.points.some(p=>Math.hypot(p[0]-anchor[0],p[1]-anchor[1])+area.width/2>placement.radius))throw new Error('Anchor reservation exceeds the placement radius.');}
 const issues=checkBuildAreas(allAreas,combined,project.terrain.worldWidth,project.terrain.worldHeight,manifest,radii);if(issues.length)throw new Error(`Anchor reservation: ${issues[0]}`);
 const inspection={...project,entities:combined,validation:layout.validation};
 // Reservations retain full authored widths; driving is sampled for an 80u vehicle.
 for(const area of areas)if(area.kind==='corridor'){const markers=routeClearance(inspection,manifest,area.points,80,false);if(markers.length)throw new Error(`Anchor route: ${markers[0].message}`);}
 const padRoutes=[1,2].flatMap(team=>fitted.entranceRoutes.flatMap(entrance=>entrance.padRoutes.map(route=>{
  const padId=`${id}-${team}-${route.unitIndex}`,points=route.points.map(p=>transform(p,team)),pad=layout.entities.find(e=>e.id===padId);
  if(!pad||Math.hypot(pad.position[0]-points.at(-1)![0],pad.position[1]-points.at(-1)![1])>1e-6)throw new Error('Anchor service endpoint differs from its pad.');
  for(const e of combined)if(e.id!==padId&&points.slice(1).some((b,i)=>distanceToSegment(e.position[0],e.position[1],points[i],b)<radii.get(e.id)!+40+14))throw new Error('Anchor service route intersects an oriented building.');
  const markers=routeClearance(inspection,manifest,points,80);if(markers.length)throw new Error(`Anchor service route: ${markers[0].message}`);return {team,padId,points};
 })));
 const next=structuredClone(project);synchronizeActiveBaseLayout(next);next.entities=structuredClone(combined);
 const target=next.baseLayouts.find(l=>l.id===next.activeBaseLayoutId)!;target.entities=structuredClone(combined);target.metadata[BUILD_AREAS_KEY]=JSON.stringify(allAreas);target.metadata[ENTRANCE_ROUTING_KEY]=JSON.stringify(policy);
 target.metadata[`formation.threeLaneAnchor.${id}`]=JSON.stringify({version:fitted.plan.version,seed,placement,entityIds:layout.entities.map(e=>e.id)});
 const entrances=inspectEntranceSockets(next,manifest,target,policy);assertEditorConstraints(project,next,manifest,false,true);
 return {project:next,layout,fitted,areas,policy,entrances,padRoutes};
}
