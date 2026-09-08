import test from 'node:test';
import assert from 'node:assert/strict';
import {captureAuthoredBase,exportAuthoredBase,parseAuthoredBase,restoreAuthoredBase} from '../lib/authored-base-package.ts';
import {BUILD_AREAS_KEY} from '../lib/build-areas.ts';
import {ENTRANCE_ROUTING_KEY} from '../lib/entrance-routing.ts';
import {DEFAULT_VALIDATION} from '../lib/wulfram.ts';
const frame={origin:[1000,1000,0],yaw:0};
function fixture(){
 const areas=[{id:'clear',name:'Reserved yard',kind:'clear',team:'all',x:1400,y:1400,width:100,height:200},
 {id:'protect',name:'Protected terrain',kind:'terrain',team:'all',x:1000,y:1100,width:100,height:100},
 {id:'boundary',name:'Build boundary',kind:'boundary',team:'1',x:900,y:900,width:700,height:700},
 {id:'entry',name:'Entry',kind:'corridor',team:'all',width:80,points:[[1600,1000],[1800,1200]]}];
 return {id:'original',name:'Authored test',updatedAt:'fixture',validation:{...DEFAULT_VALIDATION},entities:[{id:'power',token:'e',team:1,position:[1200,1200,10],rotation:[0,0,0],active:1}],
 metadata:{[BUILD_AREAS_KEY]:JSON.stringify(areas),[ENTRANCE_ROUTING_KEY]:JSON.stringify({version:1,bindings:[{team:1,corridorId:'entry',direction:'reverse'}]}),'formation.access':'stale cached receipt','user.note':'Keep this provenance'}};
}
test('file round trip relocates every area kind and retains exact entrance binding',()=>{
 const source=fixture(),before=structuredClone(source),p=parseAuthoredBase(exportAuthoredBase(captureAuthoredBase(source,frame)));
 const result=restoreAuthoredBase(p,{origin:[2000,2000,0],yaw:Math.PI/2},'new',4000,4000);
 const areas=JSON.parse(result.metadata[BUILD_AREAS_KEY]),yard=areas.find(a=>a.id==='clear');
 assert.equal(yard.x,1400);assert.equal(yard.y,2400);assert.equal(yard.width,200);assert.equal(yard.height,100);
 assert.deepEqual(areas.find(a=>a.id==='entry').points,[[2000,2600],[1800,2800]]);
 assert.equal(result.metadata[ENTRANCE_ROUTING_KEY],source.metadata[ENTRANCE_ROUTING_KEY]);
 assert.equal(result.metadata['formation.access'],undefined);assert.equal(p.sourceMetadata['user.note'],'Keep this provenance');
 assert.equal(areas.find(a=>a.id==='protect').kind,'terrain');assert.deepEqual(source,before);
});
test('rectangles reject unsupported rotation, corridors retain arbitrary rotation',()=>{
 const source=fixture(),p=captureAuthoredBase(source,frame),target={origin:[2000,2000,0],yaw:Math.PI/4};
 assert.throws(()=>restoreAuthoredBase(p,target,'new',4000,4000),/90-degree/);
 source.metadata[BUILD_AREAS_KEY]=JSON.stringify(JSON.parse(source.metadata[BUILD_AREAS_KEY]).filter(a=>a.kind==='corridor'));
 const free=restoreAuthoredBase(captureAuthoredBase(source,frame),target,'new',4000,4000);
 const a=JSON.parse(free.metadata[BUILD_AREAS_KEY])[0];assert.equal(a.width,80);
 assert.ok(Math.abs(a.points[0][0]-(2000+600/Math.SQRT2))<1e-8);
});
test('unknown authoring, orphan entrances, overlaps and off-map reservations reject atomically',()=>{
 const source=fixture();source.metadata['forge.future-rule.v1']='{"rule":1}';assert.throws(()=>captureAuthoredBase(source,frame),/Unsupported authoring/);
 delete source.metadata['forge.future-rule.v1'];const p=captureAuthoredBase(source,frame);
 const bad=structuredClone(p);bad.entranceRouting.bindings[0].corridorId='missing';assert.throws(()=>exportAuthoredBase(bad),/missing corridor/);
 const overlap=structuredClone(p);overlap.areas[0].x=1190;overlap.areas[0].y=1190;const before=structuredClone(overlap);
 assert.throws(()=>restoreAuthoredBase(overlap,frame,'new',4000,4000),/overlaps/);assert.deepEqual(overlap,before);
 assert.throws(()=>restoreAuthoredBase(p,{origin:[3900,3900,0],yaw:0},'new',4000,4000),/outside/);
 assert.throws(()=>parseAuthoredBase(' '.repeat(2_000_001)),/2 MB/);
 assert.throws(()=>parseAuthoredBase(JSON.stringify({...p,version:3})),/Unsupported/);
});
test('nonzero source yaw uses delta rotation and retains repeated-type district indices',()=>{
 const source=fixture();source.entities.push({...source.entities[0],id:'second',position:[1300,1200,10]});
 source.metadata['forge.districts.v1']=JSON.stringify([{id:'d',name:'Both power cells',entityIds:['power','second'],locked:true}]);
 const p=captureAuthoredBase(source,{...frame,yaw:Math.PI/6}),before=structuredClone(p);
 const result=restoreAuthoredBase(p,{origin:[2000,2000,0],yaw:Math.PI*2/3},'new',4000,4000);
 const yard=JSON.parse(result.metadata[BUILD_AREAS_KEY])[0];
 for(const [key,expected] of [['x',1400],['y',2400],['width',200],['height',100]])assert.ok(Math.abs(yard[key]-expected)<1e-8);
 assert.deepEqual(JSON.parse(result.metadata['forge.districts.v1'])[0].entityIds,['new-0','new-1']);
 assert.deepEqual(p,before);
});
