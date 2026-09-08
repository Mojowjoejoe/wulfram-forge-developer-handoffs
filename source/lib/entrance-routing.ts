import {readEntranceSockets,resolveEntranceSockets,inspectEntranceSockets,type EntranceSocketPolicy} from './entrance-sockets.ts';
import {BUILD_AREAS_KEY,readBuildAreas,areaFitsMap} from './build-areas.ts';
import {checkFormationAccessViaCorridor} from './formation-access.ts';
import type {AssetManifest,BaseLayoutState,WulframProject} from './wulfram.ts';

export const ENTRANCE_ROUTING_KEY='forge.entrance-routing.v1';
export interface LegacyEntranceRouting {
 version:1;
 bindings:Array<{team:1|2;corridorId:string;direction:'forward'|'reverse'}>;
}

export type EntranceRouting=LegacyEntranceRouting|EntranceSocketPolicy;
export const entranceRoutingTeams=(policy:EntranceRouting|undefined)=>policy?.version===2?policy.sockets.map(s=>s.team):policy?.bindings.map(b=>b.team)??[];

/** Direction is battlefield-to-base; area.team controls obstacles, not ownership. */
export function readEntranceRouting(raw?:string):EntranceRouting|undefined {
 if(raw===undefined)return undefined;
 if(raw.length>4096)throw new Error('Entrance routing metadata is too large.');
 const v:unknown=JSON.parse(raw);
 if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('Invalid entrance routing policy.');
 if((v as {version?:unknown}).version===2)return readEntranceSockets(raw);
 const policy=v as LegacyEntranceRouting;
 if(Object.keys(v).some(k=>!['version','bindings'].includes(k))||policy.version!==1||!Array.isArray(policy.bindings)||policy.bindings.length<1||policy.bindings.length>2)throw new Error('Invalid entrance routing policy.');
 const teams=new Set<number>();
 for(const b of policy.bindings){
  if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).some(k=>!['team','corridorId','direction'].includes(k))||![1,2].includes(b.team)||teams.has(b.team)||typeof b.corridorId!=='string'||!b.corridorId.trim()||b.corridorId.length>120||!['forward','reverse'].includes(b.direction))throw new Error('Each entrance binding needs a unique team, corridor and direction.');
  teams.add(b.team);
 }
 return policy;
}

export function resolveEntranceRouting(layout:BaseLayoutState){
 const policy=readEntranceRouting(layout.metadata[ENTRANCE_ROUTING_KEY]);
 if(!policy)return [];
 const areas=readBuildAreas(layout.metadata[BUILD_AREAS_KEY]);
 if(policy.version===2)return resolveEntranceSockets(policy,areas).map(r=>({...r.socket,team:r.socket.team,corridorId:r.socket.mouthCorridorId,direction:r.socket.mouthDirection,area:areas.find(a=>a.id===r.socket.mouthCorridorId)!,points:r.points}));
 return policy.bindings.map(binding=>{
  const area=areas.find(a=>a.id===binding.corridorId);
  if(!area||area.kind!=='corridor')throw new Error(`Team ${binding.team}: selected entrance corridor is missing.`);
  const points=area.points.map(p=>[...p] as [number,number]);
  if(binding.direction==='reverse')points.reverse();
  return {...binding,area,points};
 });
}

/** Recompute from current terrain/entities, never from a saved access receipt. */
export function inspectEntranceRouting(project:WulframProject,manifest:AssetManifest,layout:BaseLayoutState){
 const policy=readEntranceRouting(layout.metadata[ENTRANCE_ROUTING_KEY]);
 if(policy?.version===2)return inspectEntranceSockets(project,manifest,layout,policy).map((receipt,i)=>({...receipt,corridorId:policy.sockets[i].mouthCorridorId,direction:policy.sockets[i].mouthDirection}));
 const bindings=resolveEntranceRouting(layout);
 const candidate={...project,entities:layout.entities,validation:layout.validation,baseLayouts:[layout],activeBaseLayoutId:layout.id};
 return bindings.map(({area,points,...binding})=>{
  if(!areaFitsMap(area,project.terrain.worldWidth,project.terrain.worldHeight))throw new Error(`Team ${binding.team}: entrance reservation extends outside the map.`);
  if(area.width<80)throw new Error(`Team ${binding.team}: entrance reservation must be at least 80 world units wide.`);
  return {...binding,...checkFormationAccessViaCorridor(candidate,manifest,binding.team,points),socketId:undefined as string|undefined,name:undefined as string|undefined,bound:true,automaticConnectors:true as const};
 });
}

/** Candidate-only operation; caller owns revision, constraints and history commit. */
export function withEntranceRouting(project:WulframProject,manifest:AssetManifest,layout:BaseLayoutState,policy:EntranceRouting|undefined):BaseLayoutState {
 const next=structuredClone(layout);
 if(policy===undefined)delete next.metadata[ENTRANCE_ROUTING_KEY];
 else {
  const raw=JSON.stringify(policy);
  readEntranceRouting(raw);
  next.metadata[ENTRANCE_ROUTING_KEY]=raw;
 }
 inspectEntranceRouting(project,manifest,next);
 // Old route receipts describe a different policy and must not masquerade as current.
 delete next.metadata['formation.access'];
 return next;
}
