import {editEntranceRouting} from '../lib/mcp-commands.ts';
import {ENTRANCE_ROUTING_KEY,readEntranceRouting} from '../lib/entrance-routing.ts';
import {inspectionRoutes} from '../lib/inspection-routes.ts';
import {captureAuthoredBase,exportAuthoredBase,parseAuthoredBase,restoreAuthoredBase} from '../lib/authored-base-package.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createBlankProject,modelNameFor} from '../lib/wulfram.ts';
import {BUILD_AREAS_KEY} from '../lib/build-areas.ts';
import {readEntranceSockets,resolveEntranceSockets,inspectEntranceSockets} from '../lib/entrance-sockets.ts';
const socket=(team,index)=>({id:`team-${team}-${index}`,name:['Left','Middle','Right'][index],team,mouthCorridorId:`mouth-${team}-${index}`,mouthDirection:'forward'});
const policy=()=>({version:2,sockets:[1,2].flatMap(team=>[0,1,2].map(index=>socket(team,index)))});
void test('Six independent sockets retain explicit unbound status and ordered optional approaches',()=>{
 const source=policy(),before=structuredClone(source);source.sockets[1].approach={corridorId:'middle-lane',direction:'reverse'};
 const parsed=readEntranceSockets(JSON.stringify(source));assert.deepEqual(parsed,source);assert.equal(parsed.sockets[0].approach,undefined);assert.equal(parsed.sockets[1].approach.direction,'reverse');
 parsed.sockets[0].name='Changed';assert.equal(source.sockets[0].name,before.sockets[0].name);
});
void test('Ambiguous ownership, duplicate routes and unsupported envelopes reject',()=>{
 const cases=[null,{},[],{version:1,sockets:[]},{...policy(),extra:true}];
 for(const edit of [p=>p.sockets.push(socket(1,0)),p=>p.sockets[1].id=p.sockets[0].id,p=>p.sockets[1].mouthCorridorId=p.sockets[0].mouthCorridorId,p=>p.sockets[0].team=0,p=>p.sockets[0].name=' ',p=>p.sockets[0].mouthDirection='automatic',p=>p.sockets[0].extra=true,p=>p.sockets[0].approach=null,p=>p.sockets[0].approach={corridorId:p.sockets[0].mouthCorridorId,direction:'forward'},p=>{p.sockets[0].approach={corridorId:'same',direction:'forward'};p.sockets[1].approach={corridorId:'same',direction:'reverse'};},p=>{p.sockets=Array.from({length:4},(_,i)=>({...socket(1,0),id:`id-${i}`,name:`Entry ${i}`,mouthCorridorId:`mouth-${i}`}));}]){const p=policy();edit(p);cases.push(p);}
 for(const p of cases)assert.throws(()=>readEntranceSockets(JSON.stringify(p)));
 assert.throws(()=>readEntranceSockets(' '.repeat(4097)),/too large/);
});

void test('Ordered lane and mouth paths join explicitly without mutating reservations',()=>{
 const p={version:2,sockets:[socket(1,0)]};p.sockets[0].approach={corridorId:'lane',direction:'reverse'};
 const areas=[{id:'mouth-1-0',name:'Mouth',kind:'corridor',team:'all',width:120,points:[[1000,1000],[1200,1000]]},{id:'lane',name:'Lane',kind:'corridor',team:'all',width:200,points:[[1000,1000],[1000,1600],[600,1600]]}];
 const before=structuredClone({p,areas}),result=resolveEntranceSockets(p,areas)[0];
 assert.equal(result.bound,true);assert.equal(result.width,120);assert.deepEqual(result.points,[[600,1600],[1000,1600],[1000,1000],[1200,1000]]);assert.deepEqual({p,areas},before);
 result.points[0][0]=0;assert.deepEqual({p,areas},before);
 delete p.sockets[0].approach;const unbound=resolveEntranceSockets(p,areas)[0];assert.equal(unbound.bound,false);assert.deepEqual(unbound.points,areas[0].points);
 p.sockets[0].approach=before.p.sockets[0].approach;areas[1].points[0][0]+=1;assert.throws(()=>resolveEntranceSockets(p,areas),/must end/);
 areas[1].points[0][0]-=1;areas[0].width=40;assert.throws(()=>resolveEntranceSockets(p,areas),/at least 80/);
 assert.throws(()=>resolveEntranceSockets(p,[]),/missing/);
});

void test('A bound lane cannot alias another same-team exit mouth in either socket order',()=>{
 for(const reverse of [false,true]){
  const p=policy();p.sockets[0].approach={corridorId:p.sockets[1].mouthCorridorId,direction:'forward'};if(reverse)p.sockets.reverse();
  assert.throws(()=>readEntranceSockets(JSON.stringify(p)),/same-team mouth/);
 }
});

const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json','utf8'));
function destination(){
 const project=createBlankProject();project.terrain.worldWidth=4000;project.terrain.worldHeight=4000;project.terrain.heights.fill(0);
 const layout=project.baseLayouts[0];layout.entities=[{id:'pad',token:'r',team:1,position:[1000,1000,0],rotation:[0,0,0],active:1}];
 const policy={version:2,sockets:[0,1,2].map(i=>({...socket(1,i),approach:{corridorId:`lane-${i}`,direction:'forward'}}))};
 const areas=policy.sockets.flatMap((s,i)=>[{id:s.mouthCorridorId,name:s.name+' mouth',kind:'corridor',team:'all',width:120,points:[[2000+i*300,800],[1600,800]]},{id:s.approach.corridorId,name:s.name+' lane',kind:'corridor',team:'all',width:200,points:[[2000+i*300,1600],[2000+i*300,800]]}]);
 layout.metadata[BUILD_AREAS_KEY]=JSON.stringify(areas);return {project,layout,policy,areas};
}
void test('Three entrances independently reach the candidate pad with stable distinct inspection IDs',()=>{
 const {project,layout,policy}=destination(),before=structuredClone({project,layout,policy});
 // Candidate layout is authoritative even when project.entities is empty.
 assert.equal(project.entities.length,0);
 const receipts=inspectEntranceSockets(project,manifest,layout,policy);
 assert.equal(receipts.length,3);assert.equal(new Set(receipts.flatMap(r=>r.routeIds)).size,3);
 for(const r of receipts){assert.equal(r.bound,true);assert.equal(r.pads,1);assert.deepEqual(r.routes[0][0],[1000,1000]);assert.equal(r.reservations[1].width,200);}
 assert.deepEqual({project,layout,policy},before);
 delete policy.sockets[0].approach;assert.equal(inspectEntranceSockets(project,manifest,layout,policy)[0].bound,false);
});
void test('Full reservation width and every socket must pass destination checks',()=>{
 const {project,layout,policy,areas}=destination(),before=structuredClone(project);
 // A lane centerline fits but its 200-wide cap leaves the world.
 areas[1].points[0]=[50,1600];layout.metadata[BUILD_AREAS_KEY]=JSON.stringify(areas);
 assert.throws(()=>inspectEntranceSockets(project,manifest,layout,policy),/Entrance Left/);
 areas[1].points[0]=[2000,1600];layout.metadata[BUILD_AREAS_KEY]=JSON.stringify(areas);
 layout.entities.push({id:'enemy',token:'g',team:2,position:[2600,1200,0],rotation:[0,0,0],active:1});
 const rejectedBefore=structuredClone({project,layout,policy});
 assert.throws(()=>inspectEntranceSockets(project,manifest,layout,policy),/Entrance Right/);
 assert.deepEqual({project,layout,policy},rejectedBefore);
 // Validation never changes supplied entities or terrain on rejection.
 assert.deepEqual(project.terrain,before.terrain);assert.equal(layout.entities.length,2);
});

void test('Destination terrain slope is checked independently of clear corridor reservations',()=>{
 const {project,layout,policy}=destination();
 for(let y=0;y<project.terrain.height;y++)for(let x=0;x<project.terrain.width;x++)project.terrain.heights[y*project.terrain.width+x]=x*200;
 const before=structuredClone(project);assert.throws(()=>inspectEntranceSockets(project,manifest,layout,policy));assert.deepEqual(project,before);
});

void test('Tilted tall building projections cannot intrude into reserved mouths',()=>{
 const {project,layout,policy}=destination(),m=structuredClone(manifest),token='p';
 const key=modelNameFor({token,team:2});m.models[key].bounds={min:[-1,-1,0],max:[1,1,1000]};
 layout.entities.push({id:'tilted',token,team:2,position:[2600,1950,0],rotation:[Math.PI/2,0,0],active:1});
 const before=structuredClone({project,layout});assert.throws(()=>inspectEntranceSockets(project,m,layout,policy),/Entrance/);assert.deepEqual({project,layout},before);
 layout.entities.at(-1).rotation=[0,0,0];assert.doesNotThrow(()=>inspectEntranceSockets(project,m,layout,policy));
});

void test('Shared policy command persists sockets, exposes distinct routes and rejects stale or invalid edits atomically',()=>{
 const {project,layout,policy}=destination();project.entities=structuredClone(layout.entities);const before=structuredClone(project);
 const result=editEntranceRouting(project,project.activeBaseLayoutId,policy,manifest).project;
 assert.deepEqual(project,before);assert.deepEqual(readEntranceRouting(result.baseLayouts[0].metadata[ENTRANCE_ROUTING_KEY]),policy);
 const inspection=inspectionRoutes(result,manifest),routes=inspection.routes.filter(r=>r.kind==='service');assert.equal(inspection.error,'');assert.equal(routes.length,3);assert.equal(new Set(routes.map(r=>r.id)).size,3);
 assert.ok(routes.every(r=>r.name.includes('Bound approach')&&r.name.includes('automatic connectors')));
 const unbound=structuredClone(policy);delete unbound.sockets[0].approach;
 const changed=editEntranceRouting(result,result.activeBaseLayoutId,unbound,manifest).project;
 assert.ok(inspectionRoutes(changed,manifest).routes.some(r=>r.name.includes('Unbound exit')));
 const invalid=structuredClone(policy);invalid.sockets[2].mouthCorridorId='missing';const snapshot=structuredClone(result);
 assert.throws(()=>editEntranceRouting(result,result.activeBaseLayoutId,invalid,manifest),/missing/);assert.deepEqual(result,snapshot);
 assert.throws(()=>editEntranceRouting(result,'stale-layout',policy,manifest),/Active layout changed/);
});
void test('Authored-base v2 retains all sockets and transforms mouth/approach reservations together',()=>{
 const {project,layout,policy}=destination();layout.metadata[ENTRANCE_ROUTING_KEY]=JSON.stringify(policy);
 const frame={origin:[1000,1000,0],yaw:0},pack=captureAuthoredBase(layout,frame);assert.equal(pack.version,2);
 const parsed=parseAuthoredBase(exportAuthoredBase(pack));assert.deepEqual(parsed.entranceRouting,policy);
 assert.throws(()=>parseAuthoredBase(JSON.stringify({...pack,version:1})),/version 2/);
 const restored=restoreAuthoredBase(parsed,{origin:[1100,1200,0],yaw:0},'moved',4000,4000,manifest);
 assert.deepEqual(readEntranceRouting(restored.metadata[ENTRANCE_ROUTING_KEY]),policy);
 const areas=JSON.parse(restored.metadata[BUILD_AREAS_KEY]);assert.deepEqual(areas[0].points,[[2100,1000],[1700,1000]]);
 const target={...layout,id:'moved',entities:restored.entities,metadata:restored.metadata};assert.equal(inspectEntranceSockets(project,manifest,target,policy).length,3);
});
