import {orientedBuildingRadius} from './oriented-building-radius.ts';
import {BUILD_AREAS_KEY,readBuildAreas,checkBuildAreas,distanceToSegment,type BuildArea} from './build-areas.ts';
import {checkFormationAccessViaCorridor} from './formation-access.ts';
import type {AssetManifest,BaseLayoutState,WulframProject} from './wulfram.ts';
/** Version-2 entrance draft contract. Runtime integration is a separate step.
 * Local sockets always reference their saved mouth corridor. An optional approach
 * references a different battlefield-to-mouth corridor; neither is inferred.
 */
export interface EntranceSocket {
  id:string;
  name:string;
  team:1|2;
  mouthCorridorId:string;
  /** Ordered mouth runs from lane-facing endpoint to the internal court. */
  mouthDirection:'forward'|'reverse';
  approach?:{corridorId:string;direction:'forward'|'reverse'};
}
export interface EntranceSocketPolicy {version:2;sockets:EntranceSocket[]}
function object(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==='object'&&!Array.isArray(value);}
function text(value:unknown,max:number):value is string{return typeof value==='string'&&value.length>0&&value===value.trim()&&value.length<=max;}
function direction(value:unknown){return value==='forward'||value==='reverse';}
/** Strict input validation only; route existence, joining and access are destination checks. */
export function readEntranceSockets(raw:string):EntranceSocketPolicy {
  if(raw.length>4096)throw new Error('Entrance socket metadata is too large.');
  const value:unknown=JSON.parse(raw);
  if(!object(value)||Object.keys(value).some(k=>!['version','sockets'].includes(k))||value.version!==2||!Array.isArray(value.sockets)||value.sockets.length<1||value.sockets.length>6)throw new Error('Use a version 2 entrance policy with one to six sockets.');
  const ids=new Set<string>(),mouths=new Set<string>(),approaches=new Set<string>(),counts=new Map<number,number>();
  for(const socket of value.sockets){
    if(!object(socket)||Object.keys(socket).some(k=>!['id','name','team','mouthCorridorId','mouthDirection','approach'].includes(k))||!text(socket.id,120)||!text(socket.name,60)||![1,2].includes(socket.team as number)||!text(socket.mouthCorridorId,120)||!direction(socket.mouthDirection))throw new Error('Every entrance needs an ID, name, team, mouth corridor and direction.');
    if(ids.has(socket.id))throw new Error('Entrance socket IDs must be unique.');ids.add(socket.id);
    const team=socket.team as number,count=(counts.get(team)??0)+1;counts.set(team,count);
    if(count>3)throw new Error('Use at most three entrances per team.');
    const mouth=JSON.stringify([team,socket.mouthCorridorId]);
    if(mouths.has(mouth))throw new Error('Each team entrance needs a distinct mouth corridor.');mouths.add(mouth);
    if(socket.approach!==undefined){
      const a=socket.approach;
      if(!object(a)||Object.keys(a).some(k=>!['corridorId','direction'].includes(k))||!text(a.corridorId,120)||!direction(a.direction)||a.corridorId===socket.mouthCorridorId)throw new Error('A bound approach needs a separate corridor and direction.');
      const key=JSON.stringify([team,a.corridorId]);if(approaches.has(key))throw new Error('Each team entrance needs a distinct bound approach.');approaches.add(key);
    }
  }
  for(const key of approaches)if(mouths.has(key))throw new Error('A lane approach cannot reuse any same-team mouth corridor.');
  // JSON parsing gives callers independent records; omitted approaches stay unbound.
  return value as unknown as EntranceSocketPolicy;
}

/** Resolve stored directions without inferring connections. A route is bound only
 * when its approach reaches the first point of its mouth within numeric precision.
 * Terrain, building clearance and service-pad checks remain mandatory downstream.
 */
export function resolveEntranceSockets(policy:EntranceSocketPolicy,areas:BuildArea[]){
  const checked=readEntranceSockets(JSON.stringify(policy));
  const reservations=readBuildAreas(JSON.stringify(areas));
  const route=(id:string,reverse:boolean)=>{
    const area=reservations.find(a=>a.id===id);
    if(!area||area.kind!=='corridor')throw new Error(`Entrance corridor ${id} is missing.`);
    if(area.width<80)throw new Error(`Entrance corridor ${id} must be at least 80 world units wide.`);
    const points=area.points.map(p=>[...p] as [number,number]);
    if(reverse)points.reverse();return {points,width:area.width};
  };
  return checked.sockets.map(socket=>{
    const mouth=route(socket.mouthCorridorId,socket.mouthDirection==='reverse');
    if(!socket.approach)return {socket,bound:false,points:mouth.points,width:mouth.width};
    const approach=route(socket.approach.corridorId,socket.approach.direction==='reverse');
    const end=approach.points[approach.points.length-1],start=mouth.points[0];
    if(Math.hypot(end[0]-start[0],end[1]-start[1])>1e-6)throw new Error(`Entrance ${socket.name}: the approach must end at the mouth's first point.`);
    return {socket,bound:true,points:[...approach.points.slice(0,-1),...mouth.points],width:Math.min(approach.width,mouth.width)};
  });
}

/** Candidate-only destination validation. Each original corridor keeps its full
 * reservation width; the joined path's minimum width never substitutes for it.
 */
export function inspectEntranceSockets(project:WulframProject,manifest:AssetManifest,layout:BaseLayoutState,policy:EntranceSocketPolicy){
  const areas=readBuildAreas(layout.metadata[BUILD_AREAS_KEY]);
  const resolved=resolveEntranceSockets(policy,areas);
  const candidate={...project,entities:layout.entities,validation:layout.validation,baseLayouts:[layout],activeBaseLayoutId:layout.id};
  const radii=new Map(layout.entities.map(e=>[e.id,orientedBuildingRadius(e,manifest)]));
  return resolved.map(({socket,bound,points,width})=>{
    const ids=[socket.mouthCorridorId,...(socket.approach?[socket.approach.corridorId]:[])];
    const reservations=areas.filter(area=>ids.includes(area.id));
    // Entrance access is physical: even a team-scoped reservation must consider
    // every existing building when deciding whether the route is usable.
    const issues=checkBuildAreas(reservations.map(area=>({...area,team:'all' as const})),layout.entities,project.terrain.worldWidth,project.terrain.worldHeight,manifest,radii);
    if(issues.length)throw new Error(`Entrance ${socket.name}: ${issues[0]}`);
    const access=checkFormationAccessViaCorridor(candidate,manifest,socket.team,points);
    for(const route of access.routes){
      const pad=layout.entities.find(e=>e.team===socket.team&&['r','f'].includes(e.token)&&e.position[0]===route[0][0]&&e.position[1]===route[0][1]);
      for(const e of layout.entities)if(e.id!==pad?.id&&route.slice(1).some((p,i)=>distanceToSegment(e.position[0],e.position[1],route[i],p)<radii.get(e.id)!+40))throw new Error(`Entrance ${socket.name}: service route intersects an oriented building footprint.`);
    }
    return {socketId:socket.id,name:socket.name,bound,width,automaticConnectors:true as const,
      reservations:structuredClone(reservations),...access,
      routeIds:access.routes.map((_,i)=>`entrance-socket-${encodeURIComponent(socket.id)}-${i}`)};
  });
}
