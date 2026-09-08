import test from 'node:test';
import assert from 'node:assert/strict';
import {captureBaseGeometry,restoreBaseGeometry,validateBaseGeometry} from '../lib/portable-base-geometry.ts';
import {DISTRICTS_KEY} from '../lib/base-districts.ts';
import {DISTRICT_RELATIONSHIPS_KEY} from '../lib/district-relationships.ts';
const frame={origin:[100,200,30],yaw:Math.PI/2};
function fixture(){
 const entities=[
  {id:'a',token:'e',team:1,position:[100,210,35],rotation:[.1,.2,Math.PI/2],active:1},
  {id:'b',token:'e',team:1,position:[100,610,40],rotation:[.2,.1,Math.PI/2+.3],active:0},
  {id:'enemy',token:'c',subtype:'e',team:2,position:[810,920,60],rotation:[0,0,-.4],active:1},
  {id:'neutral',token:'h',team:0,position:[200,300,600],rotation:[0,0,.2],active:1},
 ];
 const metadata={[DISTRICTS_KEY]:JSON.stringify([{id:'one',name:'First',entityIds:['a'],locked:true},{id:'two',name:'Second',entityIds:['b'],variation:'reposition'}]),
  [DISTRICT_RELATIONSHIPS_KEY]:JSON.stringify([{id:'r',name:'Power spacing',from:'one',to:'two',min:399,max:401}])};
 return {entities,metadata};
}
function near(a,b){assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);}
test('geometry round trip preserves every team, subtype, altitude, orientation and active state',()=>{
 const f=fixture(),before=structuredClone(f),p=captureBaseGeometry(f.entities,f.metadata,frame);
 const result=restoreBaseGeometry(JSON.parse(JSON.stringify(p)),frame,'new');
 assert.equal(result.entities.length,4);
 result.entities.forEach((e,i)=>{const source=f.entities[i];assert.equal(e.id,`new-${i}`);assert.equal(e.team,source.team);assert.equal(e.token,source.token);assert.equal(e.subtype,source.subtype);assert.equal(e.active,source.active);e.position.forEach((n,j)=>near(n,source.position[j]));e.rotation.forEach((n,j)=>near(n,source.rotation[j]));});
 assert.equal(JSON.parse(result.metadata[DISTRICTS_KEY])[0].locked,true);
 assert.deepEqual(f,before);
});
test('rigid relocation keeps same-type record indices and hand-edited opponent geometry',()=>{
 const f=fixture(),p=captureBaseGeometry(f.entities,f.metadata,frame);
 p.units[0].position.forEach((n,i)=>near(n,[10,0,5][i]));
 const result=restoreBaseGeometry(p,{origin:[1000,2000,100],yaw:0},'moved');
 result.entities[0].position.forEach((n,i)=>near(n,[1010,2000,105][i]));
 result.entities[2].position.forEach((n,i)=>near(n,[1720,1290,130][i]));
 assert.deepEqual(JSON.parse(result.metadata[DISTRICTS_KEY]).map(g=>g.entityIds),[['moved-0'],['moved-1']]);
 assert.equal(result.metadata[DISTRICT_RELATIONSHIPS_KEY],f.metadata[DISTRICT_RELATIONSHIPS_KEY]);
});
test('bad geometry and identity/rule tampering fail atomically',()=>{
 const f=fixture(),p=captureBaseGeometry(f.entities,f.metadata,frame);
 for(const mode of ['nan','team','subtype','token','missing','spacing','version']){
  const q=structuredClone(p);
  if(mode==='nan')q.units[0].position[0]=NaN;
  if(mode==='team')q.units[0].team=2;
  if(mode==='subtype')q.units[2].subtype='unsupported';
  if(mode==='token')q.units[0].token='unknown';
  if(mode==='missing')q.units.pop();
  if(mode==='spacing')q.units[1].position[0]+=20;
  if(mode==='version')q.version=2;
  const before=structuredClone(q);assert.throws(()=>validateBaseGeometry(q));assert.deepEqual(q,before);
 }
});
test('invalid frames, IDs and source records reject before any change',()=>{
 const f=fixture(),p=captureBaseGeometry(f.entities,f.metadata,frame);
 for(const bad of [{origin:[0,0],yaw:0},{origin:[0,0,0],yaw:Infinity},{origin:[0,0,0],yaw:7}])assert.throws(()=>restoreBaseGeometry(p,bad,'id'));
 assert.throws(()=>restoreBaseGeometry(p,frame,''));
 const records=structuredClone(f.entities);records.push({...records[0],token:'*',id:'raw',raw:'opaque metadata'});
 assert.throws(()=>captureBaseGeometry(records,f.metadata,frame));
 assert.throws(()=>captureBaseGeometry([],{},frame));
});
test('activity is an exact integer, including retained legacy values',()=>{
 const f=fixture();f.entities[0].active=3;
 const p=captureBaseGeometry(f.entities,f.metadata,frame);
 assert.equal(restoreBaseGeometry(p,frame,'legacy').entities[0].active,3);
 for(const active of [.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]){const q=structuredClone(p);q.units[0].active=active;assert.throws(()=>validateBaseGeometry(q));}
});
