import {reconstructPortableValley,type PortableValleyRecipe} from './valley-pockets-portable.ts';
import {placeFormation,type CreativePlacement} from './builtin-base-layouts.ts';
import {BUILD_AREAS_KEY,readBuildAreas} from './build-areas.ts';
import type {AssetManifest,BaseLayoutState,WulframProject} from './wulfram.ts';
export function sameValleyGeometry(a:unknown,b:unknown):boolean{
 if(typeof a==='number'||typeof b==='number')return typeof a==='number'&&typeof b==='number'&&Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-7;
 if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>sameValleyGeometry(v,b[i]));
 if(a&&b&&typeof a==='object'&&typeof b==='object'){const x=a as Record<string,unknown>,y=b as Record<string,unknown>;return Object.keys(x).length===Object.keys(y).length&&Object.keys(x).every(k=>Object.hasOwn(y,k)&&sameValleyGeometry(x[k],y[k]));}
 return a===b;
}
/** Capture the generated group only; verify its recipe and authored passages before portability. */
export function captureValleyPocketRecipe(layout:BaseLayoutState,placement:CreativePlacement,project:WulframProject,manifest:AssetManifest){
 const raw=layout.metadata[`formation.valleyPockets.${layout.id}`];
 if(!raw)throw new Error('Valley Pockets placement record is missing. Save the whole map.');
 const record=JSON.parse(raw);
 const recordKeys=['version','placement','originalPlan','plan','shifts','siteUnitIndices','serviceRoutes','entityIds'];
 if(!record||typeof record!=='object'||Array.isArray(record)||Object.keys(record).length!==recordKeys.length||!recordKeys.every(k=>Object.hasOwn(record,k)))throw new Error('Valley Pockets record fields changed. Save the whole map.');
 if(!record||!Array.isArray(record.entityIds)||record.entityIds.length<2||record.entityIds.length>240||record.entityIds.length%2||!sameValleyGeometry(record.placement,placement))throw new Error('Valley Pockets placement record does not match this layout.');
 const recipe:PortableValleyRecipe={version:1,recipeVersion:record.version,seed:record.originalPlan?.seed,size:record.originalPlan?.size,targetCount:record.entityIds.length/2,shifts:record.shifts};
 const built=reconstructPortableValley(recipe,manifest);
 for(const key of ['originalPlan','plan','siteUnitIndices','serviceRoutes'] as const)if(!sameValleyGeometry(record[key],built[key]))throw new Error('Valley Pockets saved geometry was changed. Save the whole map.');
 const expected=placeFormation(project,manifest,built.template,layout.id,layout.name,{}, {...placement,checkAccess:false},'shared-footprint-v2');
 if(!sameValleyGeometry(record.entityIds,expected.entities.map(e=>e.id))||new Set(layout.entities.map(e=>e.id)).size!==layout.entities.length)throw new Error('Valley Pockets building membership was changed.');
 for(const entity of expected.entities)if(!sameValleyGeometry(layout.entities.find(e=>e.id===entity.id),entity))throw new Error('Valley Pockets buildings were edited. Save the whole map to preserve them.');
 if(Object.entries(layout.metadata).some(([k,v])=>k.startsWith('forge.')&&k!==BUILD_AREAS_KEY&&v&&v!=='[]'))throw new Error('Additional authoring rules require saving the whole map.');
 const areas=readBuildAreas(layout.metadata[BUILD_AREAS_KEY]),paths=[built.plan.passage,...built.plan.sites.map(s=>s.frontage)];
 const yaw=placement.rotation*Math.PI/180,c=Math.cos(yaw),s=Math.sin(yaw);
 for(const team of [1,2])for(const [i,route] of paths.entries()){
  const area=areas.find(a=>a.id===`${layout.id}-route-${team}-${i}`);
  const points=route.points.map(([x,y])=>{const wx=placement.x+x*c-y*s,wy=placement.y+x*s+y*c;return team===1?[wx,wy]:[project.terrain.worldWidth-wx,project.terrain.worldHeight-wy];});
  if(!area||area.name!==`Valley Pockets team ${team} ${i===0?'central passage':`pocket ${i} branch`}`||area.kind!=='corridor'||area.team!=='all'||area.width!==route.width||!sameValleyGeometry(area.points,points))throw new Error('Valley Pockets passage reservations were edited. Save the whole map.');
 }
 if(areas.length!==paths.length*2)throw new Error('Additional protected areas require saving the whole map.');
 return {recipe,template:built.template};
}
