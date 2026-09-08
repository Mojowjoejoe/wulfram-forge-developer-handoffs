import {reconstructBrokenRingPlan} from './broken-ring-recipes.ts';
import {type BrokenRingPlan} from './broken-ring.ts';
import {checkBrokenRingPlacement} from './broken-ring-placement.ts';
import {checkCourtyardAccess} from './courtyard-access.ts';
import {BUILD_AREAS_KEY,readBuildAreas,checkBuildAreas,type BuildArea} from './build-areas.ts';
import {analyzeRotationalEntityPairs} from './balanced-map-analysis.ts';
import type {CreativePlacement} from './builtin-base-layouts.ts';
import type {AssetManifest,BaseLayoutState,WulframProject} from './wulfram.ts';
import {ENTRANCE_ROUTING_KEY,readEntranceRouting,resolveEntranceRouting,inspectEntranceRouting,type EntranceRouting} from './entrance-routing.ts';

type Reservation = Extract<BuildArea,{kind:'corridor'}> & {side:1|2};
export interface PortableReservations {version:1|2|3|4|5;family?:'offset-bastion'|'service-courtyard'|'broken-ring';brokenRingPlan?:BrokenRingPlan;snapPolicy:'shared-footprint-v2';areas:Reservation[];entranceRouting?:EntranceRouting}
// Browser and Node transcendental math can differ by a few ulps. Preserve saved
// coordinates while rejecting meaningful edits and requiring identical schema.
function samePlan(actual:unknown,expected:unknown):boolean {
 if(typeof actual==='number'||typeof expected==='number')return typeof actual==='number'&&typeof expected==='number'&&Number.isFinite(actual)&&Number.isFinite(expected)&&Math.abs(actual-expected)<=1e-9;
 if(Array.isArray(actual)||Array.isArray(expected))return Array.isArray(actual)&&Array.isArray(expected)&&actual.length===expected.length&&actual.every((v,i)=>samePlan(v,expected[i]));
 if(actual&&typeof actual==='object'&&expected&&typeof expected==='object'){
  const a=actual as Record<string,unknown>,b=expected as Record<string,unknown>,keys=Object.keys(a).sort(),other=Object.keys(b).sort();
  return keys.length===other.length&&keys.every((key,i)=>key===other[i]&&samePlan(a[key],b[key]));
 }
 return actual===expected;
}
export function validateReservations(value:unknown):asserts value is PortableReservations{
 const v=value as PortableReservations;
 if(v?.version===5){
  const p=v.brokenRingPlan;
  if(v.family!=='broken-ring'||v.snapPolicy!=='shared-footprint-v2'||v.entranceRouting!==undefined||!p||typeof p.seed!=='string'||p.seed.length>240||!samePlan(p,reconstructBrokenRingPlan(p.version,p.seed,p.size))||!Array.isArray(v.areas)||v.areas.length!==10)throw new Error('Invalid Broken Ring reservations or plan.');
  const paths=[p.route,...p.serviceRoutes,p.circulation,{width:p.interiorRadius*2,points:[[-.5,0],[.5,0]]}];
  for(const side of [1,2])for(const index of [0,1,2,3,4]){
   const a=v.areas.find(a=>a?.id===`broken-ring-${side}-${index}`),route=paths[index];
   if(!a||a.side!==side||a.kind!=='corridor'||a.team!=='all'||a.width!==route.width||!Array.isArray(a.points)||a.points.length!==route.points.length||a.points.some((point,i)=>!Array.isArray(point)||point.length!==2||point.some((n,j)=>!Number.isFinite(n)||Math.abs(n-route.points[i][j])>1e-6)))throw new Error('Broken Ring reservations must retain the versioned plan. Export the whole map to preserve edited routes.');
   readBuildAreas(JSON.stringify([{...a,points:a.points.map(([x,y])=>[x+8000,y+8000])}]));
  }
  return;
 }
 if(v?.brokenRingPlan!==undefined)throw new Error('Broken Ring plans require reservation version 5.');
 if(v?.version===4){
  if(v.family!=='service-courtyard'||v.snapPolicy!=='shared-footprint-v2'||v.entranceRouting!==undefined||!Array.isArray(v.areas)||v.areas.length!==6)throw new Error('Invalid Courtyard reservations.');
  for(const side of [1,2])for(const index of [0,1,2]){
   const a=v.areas.find(a=>a?.id===`service-courtyard-${side}-${index}`);
   if(!a||a.side!==side||a.kind!=='corridor'||a.team!=='all'||!Number.isFinite(a.width)||a.width<80||a.width>8000||!Array.isArray(a.points)||a.points.length!==2||a.points.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n)||Math.abs(n)>8000)))throw new Error('Invalid Courtyard corridor.');
   readBuildAreas(JSON.stringify([{...a,points:a.points.map(([x,y])=>[x+8000,y+8000])}]));
  }
  return;
 }
 if(!v||!(v.version===1&&v.family===undefined||(v.version===2||v.version===3)&&v.family==='offset-bastion')||v.snapPolicy!=='shared-footprint-v2'||!Array.isArray(v.areas)||v.areas.length!==2)throw new Error('Invalid portable base reservations.');
 if(v.version===3){if(!v.entranceRouting)throw new Error('Portable entrance policy is missing.');if(readEntranceRouting(JSON.stringify(v.entranceRouting))?.version!==1)throw new Error('Multiple entrances require an authored-base package.');}
 else if(v.entranceRouting!==undefined)throw new Error('Entrance routing requires reservation version 3.');
 for(const side of [1,2]){
  const a=v.areas.find(a=>a?.side===side);
  if(!a||a.id!==`${v.version>=2?'offset-bastion-approach':'frontier-expansion'}-${side}`||a.kind!=='corridor'||a.team!=='all'||!Number.isFinite(a.width)||a.width<=0||a.width>8000||!Array.isArray(a.points)||a.points.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n)||Math.abs(n)>8000)))throw new Error('Invalid portable base corridor.');
  // The common schema validates names, point counts and nonzero segments.
  readBuildAreas(JSON.stringify([{...a,points:a.points.map(([x,y])=>[x+8000,y+8000])}]));
 }
 if(v.entranceRouting?.version===1&&v.entranceRouting.bindings.some(b=>!v.areas.some(a=>a.id===b.corridorId)))throw new Error('Portable entrance corridor is missing.');
}
function frame(project:WulframProject,p:CreativePlacement,side:1|2){
 const yaw=(p.rotation+(side===2?180:0))*Math.PI/180;
 return {x:side===1?p.x:project.terrain.worldWidth-p.x,y:side===1?p.y:project.terrain.worldHeight-p.y,c:Math.cos(yaw),s:Math.sin(yaw)};
}
export function captureReservations(layout:BaseLayoutState,p:CreativePlacement,project?:WulframProject):{reservations?:PortableReservations}{
 if(Object.entries(layout.metadata).some(([key,value])=>key.startsWith('forge.')&&key!==BUILD_AREAS_KEY&&key!==ENTRANCE_ROUTING_KEY&&value&&value!=='[]'))throw new Error('This base has additional authoring rules. Export the whole map to preserve them.');
 const areas=readBuildAreas(layout.metadata[BUILD_AREAS_KEY]);
 const entranceRouting=readEntranceRouting(layout.metadata[ENTRANCE_ROUTING_KEY]);
 if(entranceRouting?.version===2)throw new Error('Save an authored base or export the whole map to preserve multiple entrances.');
 if(entranceRouting)resolveEntranceRouting(layout);
 if(!areas.length&&!['frontier-camp-v1','offset-bastion-v1','service-courtyard-v1','broken-ring-v1','broken-ring-v2','broken-ring-v3'].includes(layout.metadata['formation.version'])&&!layout.metadata['formation.reservationPolicy'])return {};
 if(!project)throw new Error('Saving base reservations needs the source map dimensions.');
 const ring=areas.length===10&&areas.every(a=>/^broken-ring-[12]-[0-4]$/.test(a.id));
 const courtyard=areas.length===6&&areas.every(a=>/^service-courtyard-[12]-[012]$/.test(a.id));
 const offset=areas.length===2&&areas.every(a=>/^offset-bastion-approach-[12]$/.test(a.id));
 if(entranceRouting&&!offset)throw new Error('Portable entrance routing currently requires paired Offset Bastion corridors. Export the whole map to preserve this policy.');
 const reservations:PortableReservations={version:ring?5:courtyard?4:entranceRouting?3:offset?2:1,...(ring?{family:'broken-ring' as const,brokenRingPlan:JSON.parse(layout.metadata['formation.brokenRingPlan']??'null')}:{}),...(courtyard?{family:'service-courtyard' as const}:{}),...(entranceRouting?{entranceRouting}:{}),...(offset?{family:'offset-bastion' as const}:{}),snapPolicy:'shared-footprint-v2',areas:areas.map(a=>{
  if(a.kind!=='corridor'||!(ring?/^broken-ring-[12]-[0-4]$/:courtyard?/^service-courtyard-[12]-[012]$/:offset?/^offset-bastion-approach-[12]$/:/^frontier-expansion-[12]$/).test(a.id))throw new Error('Only paired Frontier, Offset Bastion, Courtyard or Broken Ring corridors are portable. Export the whole map to preserve these areas.');
  const side=ring||courtyard?(a.id.split('-')[2]==='1'?1:2):a.id.endsWith('1')?1:2,f=frame(project,p,side);
  return {...a,side,points:a.points.map(([x,y])=>[(x-f.x)*f.c+(y-f.y)*f.s,-(x-f.x)*f.s+(y-f.y)*f.c])};
 })};
 validateReservations(reservations);return {reservations};
}
export function placeReservations(project:WulframProject,manifest:AssetManifest,layout:BaseLayoutState,p:CreativePlacement,value:PortableReservations){
 validateReservations(value);
 const areas=value.areas.map(a=>{
  if(a.points.some(point=>Math.hypot(...point)+a.width/2>p.radius))throw new Error('Base reservations exceed the yellow building area. Increase the radius.');
  const f=frame(project,p,a.side);
  return {id:a.id,name:a.name,team:a.team,kind:a.kind,width:a.width,points:a.points.map(([x,y])=>[f.x+x*f.c-y*f.s,f.y+x*f.s+y*f.c] as [number,number])};
 });
 const checked=readBuildAreas(JSON.stringify(areas)),problems=checkBuildAreas(checked,layout.entities,project.terrain.worldWidth,project.terrain.worldHeight,manifest);
 if(problems.length)throw new Error(problems.join(' '));
 if(!analyzeRotationalEntityPairs({...project,entities:layout.entities},manifest).passed)throw new Error('Saved reserved base needs matching paired terrain support.');
 const candidate:BaseLayoutState={...layout,metadata:{...layout.metadata,[BUILD_AREAS_KEY]:JSON.stringify(checked)}};
 if(value.entranceRouting)candidate.metadata[ENTRANCE_ROUTING_KEY]=JSON.stringify(value.entranceRouting);
 else delete candidate.metadata[ENTRANCE_ROUTING_KEY];
 inspectEntranceRouting(project,manifest,candidate);
 if(value.entranceRouting)delete candidate.metadata['formation.access'];
 if(value.version===5){
  const checkedRing=checkBrokenRingPlacement({...project,entities:layout.entities,validation:layout.validation},manifest,value.brokenRingPlan!,p.x,p.y,p.rotation,p.radius);
  candidate.metadata['formation.brokenRingAccess']=JSON.stringify(checkedRing.access);
  candidate.metadata['formation.brokenRingPlan']=JSON.stringify(value.brokenRingPlan);
 }
 if(value.version===4)candidate.metadata['formation.courtyardAccess']=JSON.stringify(checkCourtyardAccess({...project,entities:layout.entities,validation:layout.validation},manifest,checked));
 candidate.metadata['formation.reservationPolicy']=value.version===5?value.brokenRingPlan!.version:value.version===4?'service-courtyard-v1':value.version>=2?'offset-bastion-approach-v1':'frontier-expansion-v1';
 layout.metadata=candidate.metadata;
}
