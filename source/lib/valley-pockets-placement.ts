import type {PortableValleyRecipe} from './valley-pockets-portable.ts';
import {Euler,Vector3} from 'three';
import {entityRotationToScene} from './model-transform.ts';
import {fitValleyPocketTerrain} from './valley-pockets-terrain.ts';
import {placeFormation,type CreativePlacement} from './builtin-base-layouts.ts';
import {distanceToSegment,BUILD_AREAS_KEY,readBuildAreas,checkBuildAreas,type BuildArea} from './build-areas.ts';
import {assertEditorConstraints} from './editor-constraints.ts';
import {analyzeRotationalEntityPairs} from './balanced-map-analysis.ts';
import {routeClearance} from './route-inspection.ts';
import {MODEL_WORLD_SCALE,modelNameFor,hasModelForEntity,structureTerrainClearance,synchronizeActiveBaseLayout,type AssetManifest,type WulframProject} from './wulfram.ts';

/** Pure additive candidate; callers must explicitly commit with revision/history guards. */
export function previewValleyPocketPlacement(project: WulframProject,manifest: AssetManifest,seed:string,placement:CreativePlacement,id:string,portable?:PortableValleyRecipe){
 if(!id||id.length>120||project.entities.some(e=>e.id.startsWith(`${id}-`)))throw new Error('Choose a fresh Valley Pockets placement ID.');
 const active=project.baseLayouts.find(l=>l.id===project.activeBaseLayoutId);
 if(!active)throw new Error('Choose an active base layout before placing Valley Pockets.');
 if(placement.entranceDegrees!==undefined)throw new Error('Valley Pockets uses its two passage ends; custom entrances are not supported yet.');
 if(placement.offsetArrangement!==undefined)throw new Error('Offset Bastion arrangements do not apply to Valley Pockets.');
 const fitted=fitValleyPocketTerrain(project,manifest,seed,placement,portable);
 const layout=placeFormation(project,manifest,fitted.template,id,'Valley Pockets',{'formation.version':fitted.plan.version}, {...placement,checkAccess:false},'shared-footprint-v2');
 const pair=analyzeRotationalEntityPairs({...project,entities:layout.entities},manifest);
 if(!pair.passed)throw new Error(`Valley Pockets needs matching paired terrain support: ${pair.message}`);
 const yaw=placement.rotation*Math.PI/180,c=Math.cos(yaw),s=Math.sin(yaw);
 const transform=([x,y]:[number,number],team:number):[number,number]=>{
  const wx=placement.x+x*c-y*s,wy=placement.y+x*s+y*c;
  return team===1?[wx,wy]:[project.terrain.worldWidth-wx,project.terrain.worldHeight-wy];
 };
 const areas:BuildArea[]=[1,2].flatMap(team=>[fitted.plan.passage,...fitted.plan.sites.map(s=>s.frontage)].map((route,i)=>({id:`${id}-route-${team}-${i}`,name:`Valley Pockets team ${team} ${i===0?'central passage':`pocket ${i} branch`}`,kind:'corridor' as const,team:'all' as const,width:route.width,points:route.points.map(p=>transform(p,team))})));
 if(project.entities.some(e=>!hasModelForEntity(e,manifest)||![...e.position,...e.rotation].every(Number.isFinite)))throw new Error('An existing entity cannot be footprint-checked. Resolve its model or coordinates first.');
 const combined=[...project.entities,...layout.entities];
 const radii=combined.map(e=>{
  const bounds=manifest.models[modelNameFor(e)!].bounds,rotation=new Euler(...entityRotationToScene(e.rotation),'YXZ');
  const corners=[];
  for(const x of [bounds.min[0],bounds.max[0]])for(const y of [bounds.min[1],bounds.max[1]])for(const z of [bounds.min[2],bounds.max[2]])corners.push(new Vector3(x*MODEL_WORLD_SCALE,z*MODEL_WORLD_SCALE,-y*MODEL_WORLD_SCALE).applyEuler(rotation));
  return Math.max(structureTerrainClearance(e,manifest,0,0).footprint/Math.SQRT2,...corners.map(v=>Math.hypot(v.x,v.z)));
 });
 for(let i=project.entities.length;i<combined.length;i++){const [x,y]=combined[i].position,r=radii[i];if(x-r<0||y-r<0||x+r>project.terrain.worldWidth||y+r>project.terrain.worldHeight)throw new Error('Valley Pockets oriented building footprint exceeds the map bounds.');}
 const orientedRadii=new Map(combined.map((e,i)=>[e.id,radii[i]]));
 const checkOrientedRoute=(points:Array<[number,number]>,padId?:string)=>{
  if(combined.some((e,i)=>e.id!==padId&&points.slice(1).some((b,j)=>distanceToSegment(e.position[0],e.position[1],points[j],b)<radii[i]+80)))throw new Error('Valley Pockets approach is too close to an oriented building footprint.');
 };
 for(let i=project.entities.length;i<combined.length;i++)for(let j=0;j<i;j++){
  const a=combined[i],b=combined[j],gap=Math.hypot(a.position[0]-b.position[0],a.position[1]-b.position[1]);
  if(gap<Math.max(radii[i]+radii[j]+Math.max(8,project.validation.minSpacing),['r','f'].includes(a.token)?radii[j]+96:0,['r','f'].includes(b.token)?radii[i]+96:0))throw new Error('Valley Pockets overlaps an existing building or narrows a service pad. Move the base.');
 }
 const existing=readBuildAreas(active.metadata[BUILD_AREAS_KEY]);
 if(areas.some(a=>existing.some(b=>b.id===a.id)))throw new Error('Choose a fresh reservation ID.');
 const problems=checkBuildAreas([...existing,...areas],combined,project.terrain.worldWidth,project.terrain.worldHeight,manifest,orientedRadii);
 if(problems.length)throw new Error(`Valley Pockets reservation: ${problems[0]}`);
 const inspection={...project,entities:combined,validation:layout.validation};
 const routes=areas.map(area=>{
  if(area.kind!=='corridor')throw new Error('Expected a passage.');
  checkOrientedRoute(area.points);
  const markers=routeClearance(inspection,manifest,area.points,80,false);
  if(markers.length)throw new Error(`Valley Pockets passage needs more clearance: ${markers[0].message}`);
  return {id:area.id,points:area.points,markers};
 });
 const serviceRoutes=[1,2].flatMap(team=>fitted.serviceRoutes.map(route=>{
  const points=route.points.map(p=>transform(p,team));
  const pad=layout.entities.find(e=>e.id===`${id}-${team}-${route.unitIndex}`);
  if(!pad||!['r','f'].includes(pad.token)||Math.hypot(points[1][0]-pad.position[0],points[1][1]-pad.position[1])>1e-6)throw new Error('Valley Pockets service endpoint no longer matches its pad.');
  checkOrientedRoute(points,pad.id);
  const markers=routeClearance(inspection,manifest,points,80);
  if(markers.length)throw new Error(`Valley Pockets service approach needs more clearance: ${markers[0].message}`);
  return {team,padId:pad.id,points,markers};
 }));
 const next=structuredClone(project);synchronizeActiveBaseLayout(next);
 next.entities=structuredClone(combined);
 const target=next.baseLayouts.find(l=>l.id===next.activeBaseLayoutId)!;
 target.metadata[`formation.valleyPockets.${id}`]=JSON.stringify({version:fitted.plan.version,placement,originalPlan:fitted.originalPlan,plan:fitted.plan,shifts:fitted.shifts,siteUnitIndices:fitted.siteUnitIndices,serviceRoutes:fitted.serviceRoutes,entityIds:layout.entities.map(e=>e.id)});
 target.entities=structuredClone(next.entities);target.metadata[BUILD_AREAS_KEY]=JSON.stringify([...existing,...areas]);
 // Only append the proven reservations; all other saved rules are retained and enforced.
 assertEditorConstraints(project,next,manifest,false,true);
 return {project:next,layout,fitted,areas,access:{vehicleWidth:80,clearance:96,routes,serviceRoutes,evidence:'Sampled terrain and estimated model clearance; not game collision or pad-entry proof.'}};
}
