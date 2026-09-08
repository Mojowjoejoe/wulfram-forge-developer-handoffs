import {resolveEntranceSockets} from './entrance-sockets.ts';
import {captureBaseGeometry,restoreBaseGeometry,validateBaseGeometry,type BaseCoordinateFrame,type PortableBaseGeometry} from './portable-base-geometry.ts';
import {BUILD_AREAS_KEY,readBuildAreas,checkBuildAreas,type BuildArea} from './build-areas.ts';
import {ENTRANCE_ROUTING_KEY,readEntranceRouting,type EntranceRouting} from './entrance-routing.ts';
import {DISTRICTS_KEY} from './base-districts.ts';
import {DISTRICT_RELATIONSHIPS_KEY} from './district-relationships.ts';
import {COMPOSITION_KEY} from './composition-budgets.ts';
import type {AssetManifest,BaseLayoutState,ValidationSettings} from './wulfram.ts';

export interface AuthoredBasePackage {
  format:'wulfram-authored-base';version:1|2;name:string;
  geometry:PortableBaseGeometry;
  sourceFrame:BaseCoordinateFrame;
  areas:BuildArea[];
  validation:ValidationSettings;
  entranceRouting?:EntranceRouting;
  /** Provenance only. Cached source analysis must never become destination rules. */
  sourceMetadata:Record<string,string>;
}
const supported=new Set([DISTRICTS_KEY,DISTRICT_RELATIONSHIPS_KEY,COMPOSITION_KEY,BUILD_AREAS_KEY,ENTRANCE_ROUTING_KEY]);
function bindingsValid(areas:BuildArea[],policy?:EntranceRouting){
  if(policy?.version===2){resolveEntranceSockets(policy,areas);return;}
  if(policy?.bindings.some(b=>!areas.some(a=>a.id===b.corridorId&&a.kind==='corridor')))throw new Error('A saved entrance references a missing corridor.');
}
export function validateAuthoredBase(value:unknown):AuthoredBasePackage{
  const p=value as AuthoredBasePackage;
  if(!p||p.format!=='wulfram-authored-base'||![1,2].includes(p.version)||typeof p.name!=='string'||!p.name.trim()||p.name.length>120)throw new Error('Unsupported authored base or invalid name.');
  if(!p.validation||!['serviceRadius','backupRadius','maxSlopeDegrees','minSpacing'].every(k=>{
    const n=p.validation[k as keyof ValidationSettings];return Number.isFinite(n)&&n>=0&&n<=1000000;
  })||p.validation.serviceRadius<=0||p.validation.maxSlopeDegrees>90)throw new Error('Invalid saved validation settings.');
  validateBaseGeometry(p.geometry);
  // Also validates the frame against the exact building-coordinate contract.
  restoreBaseGeometry(p.geometry,p.sourceFrame,'source');
  if(!Array.isArray(p.areas)||p.areas.length>50)throw new Error('Use at most 50 saved areas.');
  const areas=readBuildAreas(JSON.stringify(p.areas));
  const policy=p.entranceRouting===undefined?undefined:readEntranceRouting(JSON.stringify(p.entranceRouting));
  if(policy?.version===2&&p.version!==2)throw new Error('Multiple entrances require authored-base version 2.');
  bindingsValid(areas,policy);
  if(!p.sourceMetadata||typeof p.sourceMetadata!=='object'||Array.isArray(p.sourceMetadata)||Object.values(p.sourceMetadata).some(v=>typeof v!=='string'))throw new Error('Invalid authored-base provenance.');
  for(const [key,v] of Object.entries(p.sourceMetadata))if(key.startsWith('forge.')&&!supported.has(key)&&v&&v!=='[]')throw new Error(`Unsupported authoring rule: ${key}. Use whole-map export to preserve it.`);
  return structuredClone(p);
}
export function captureAuthoredBase(layout:BaseLayoutState,sourceFrame:BaseCoordinateFrame):AuthoredBasePackage{
  return validateAuthoredBase({format:'wulfram-authored-base',version:readEntranceRouting(layout.metadata[ENTRANCE_ROUTING_KEY])?.version===2?2:1,name:layout.name,validation:layout.validation,
    geometry:captureBaseGeometry(layout.entities,layout.metadata,sourceFrame),sourceFrame,
    areas:readBuildAreas(layout.metadata[BUILD_AREAS_KEY]),entranceRouting:readEntranceRouting(layout.metadata[ENTRANCE_ROUTING_KEY]),sourceMetadata:layout.metadata});
}
export function exportAuthoredBase(value:AuthoredBasePackage):string{
  const raw=JSON.stringify(validateAuthoredBase(value),null,2);
  if(raw.length>2_000_000)throw new Error('Authored base exceeds the 2 MB limit.');return raw;
}
export function parseAuthoredBase(raw:string):AuthoredBasePackage{
  if(raw.length>2_000_000)throw new Error('Authored base exceeds the 2 MB limit.');return validateAuthoredBase(JSON.parse(raw));
}
/** New-layout candidate only. Caller must validate terrain, entrances and all editor constraints
 * before atomic Apply. Terrain-protection areas establish a destination baseline; no terrain is copied. */
export function restoreAuthoredBase(value:unknown,frame:BaseCoordinateFrame,id:string,width:number,height:number,manifest?:AssetManifest){
  const p=validateAuthoredBase(value),result=restoreBaseGeometry(p.geometry,frame,id);
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new Error('Invalid destination map dimensions.');
  const angle=frame.yaw-p.sourceFrame.yaw,c=Math.cos(angle),s=Math.sin(angle);
  const quarter=Math.round(angle/(Math.PI/2));
  if(p.areas.some(a=>a.kind!=='corridor')&&Math.abs(angle-quarter*Math.PI/2)>1e-10)throw new Error('Rectangular rules require rotation in 90-degree steps. Their reserved space cannot be widened or discarded.');
  const point=([x,y]:[number,number]):[number,number]=>{
    const dx=x-p.sourceFrame.origin[0],dy=y-p.sourceFrame.origin[1];
    return [dx*c-dy*s+frame.origin[0],dx*s+dy*c+frame.origin[1]].map(n=>Math.abs(n)<1e-9?0:n) as [number,number];
  };
  const areas=p.areas.map(a=>{
    if(a.kind==='corridor')return {...a,points:a.points.map(point)};
    const corners=[[a.x,a.y],[a.x+a.width,a.y],[a.x,a.y+a.height],[a.x+a.width,a.y+a.height]].map(v=>point(v as [number,number]));
    const xs=corners.map(v=>v[0]),ys=corners.map(v=>v[1]);
    return {...a,x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
  });
  readBuildAreas(JSON.stringify(areas));
  const issues=checkBuildAreas(areas,result.entities,width,height,manifest);
  if(issues.length)throw new Error(issues[0]);
  result.metadata[BUILD_AREAS_KEY]=JSON.stringify(areas);
  if(p.entranceRouting)result.metadata[ENTRANCE_ROUTING_KEY]=JSON.stringify(p.entranceRouting);
  return result;
}
