import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createBlankProject} from '../lib/wulfram.ts';
import {BUILD_AREAS_KEY} from '../lib/build-areas.ts';
import {ENTRANCE_ROUTING_KEY,readEntranceRouting,resolveEntranceRouting,inspectEntranceRouting,withEntranceRouting} from '../lib/entrance-routing.ts';
import {captureReservations} from '../lib/portable-reservations.ts';
import {editEntranceRouting} from '../lib/mcp-commands.ts';
import {inspectionRoutes} from '../lib/inspection-routes.ts';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json','utf8'));
const points=[[2400,1600],[2400,800],[1600,800]];
const policy={version:1,bindings:[{team:1,corridorId:'approach',direction:'forward'}]};
test('Shared editor/MCP edit replaces automatic routes, supports clearing, and rejects wrong layout atomically',()=>{
 const {p,layout}=fixture();p.entities=structuredClone(layout.entities);
 const before=structuredClone(p),next=editEntranceRouting(p,p.activeBaseLayoutId,policy,manifest).project;
 const routes=inspectionRoutes(next,manifest);assert.equal(routes.error,'');assert.equal(routes.routes.filter(r=>r.kind==='service').length,1);
 assert.equal(routes.routes.find(r=>r.kind==='service').entranceCorridorId,'approach');assert.deepEqual(p,before);
 assert.throws(()=>editEntranceRouting(p,'wrong',policy,manifest),/Active layout changed/);
 assert.throws(()=>editEntranceRouting(p,p.activeBaseLayoutId,undefined,manifest),/Supply an entrance policy/);
 const cleared=editEntranceRouting(next,next.activeBaseLayoutId,null,manifest).project;
 assert.equal(cleared.baseLayouts[0].metadata[ENTRANCE_ROUTING_KEY],undefined);
 assert.ok(inspectionRoutes(cleared,manifest).routes.some(r=>r.kind==='service'&&!r.entranceCorridorId));
 next.baseLayouts[0].metadata[BUILD_AREAS_KEY]='[]';
 const invalid=inspectionRoutes(next,manifest);assert.match(invalid.error,/Selected entrances/);assert.equal(invalid.routes.filter(r=>r.kind==='service').length,0);
 next.baseLayouts[0].metadata[ENTRANCE_ROUTING_KEY]='invalid';
 assert.equal(inspectionRoutes(next,manifest).routes.filter(r=>r.kind==='service').length,0);
});
function fixture(){
 const p=createBlankProject();p.terrain.worldWidth=4000;p.terrain.worldHeight=4000;p.terrain.heights.fill(0);
 const layout=p.baseLayouts[0];layout.entities=[{id:'pad',token:'r',team:1,position:[1000,1000,0],rotation:[0,0,0],active:1}];
 layout.metadata[BUILD_AREAS_KEY]=JSON.stringify([{id:'approach',name:'Approach',team:'all',kind:'corridor',width:200,points}]);
 return {p,layout};
}
test('Saved binding survives JSON, connects candidate pads and leaves all input data untouched',()=>{
 const {p,layout}=fixture(),before=structuredClone({p,layout,policy});
 // Deliberately empty active project entities: inspection must use the candidate.
 p.entities=[];
 const next=withEntranceRouting(p,manifest,layout,policy);
 assert.deepEqual(readEntranceRouting(next.metadata[ENTRANCE_ROUTING_KEY]),policy);
 const loaded=JSON.parse(JSON.stringify(next)),receipt=inspectEntranceRouting(p,manifest,loaded);
 assert.equal(receipt.length,1);assert.equal(receipt[0].pads,1);
 const route=[...receipt[0].routes[0]].reverse();let cursor=-1;
 for(const [x,y] of points){cursor=route.findIndex((p,i)=>i>cursor&&p[0]===x&&p[1]===y);assert.ok(cursor>=0);}
 assert.deepEqual({p,layout,policy},before);
 assert.throws(()=>captureReservations(loaded,{x:1000,y:1000,rotation:0},p),/requires paired Offset/);
 delete loaded.metadata[BUILD_AREAS_KEY];
 assert.throws(()=>captureReservations(loaded,{x:1000,y:1000,rotation:0},p),/missing/);
 loaded.metadata[BUILD_AREAS_KEY]='[]';
 assert.throws(()=>captureReservations(loaded,{x:1000,y:1000,rotation:0},p),/missing/);
});
test('Binding direction is explicit and area obstacle team never implies entrance ownership',()=>{
 const {layout}=fixture();layout.metadata[ENTRANCE_ROUTING_KEY]=JSON.stringify({...policy,bindings:[{...policy.bindings[0],direction:'reverse'}]});
 assert.deepEqual(resolveEntranceRouting(layout)[0].points,[...points].reverse());
 assert.equal(resolveEntranceRouting(layout)[0].team,1);
 assert.deepEqual(JSON.parse(layout.metadata[BUILD_AREAS_KEY])[0].points,points);
});
test('Malformed policy and dangling references reject; legacy has no implicit binding',()=>{
 const {p,layout}=fixture();assert.deepEqual(resolveEntranceRouting(layout),[]);
 for(const value of [null,{},[],{...policy,version:2},{...policy,extra:true},{version:1,bindings:[]},{version:1,bindings:[policy.bindings[0],policy.bindings[0]]},{version:1,bindings:[{...policy.bindings[0],team:0}]},{version:1,bindings:[{...policy.bindings[0],direction:'guess'}]}])assert.throws(()=>readEntranceRouting(JSON.stringify(value)));
 assert.throws(()=>readEntranceRouting(''));assert.throws(()=>readEntranceRouting(' '.repeat(4097)),/too large/);
 const before=structuredClone({p,layout});
 assert.throws(()=>withEntranceRouting(p,manifest,layout,{version:1,bindings:[{...policy.bindings[0],corridorId:'missing'}]}),/missing/);
 assert.deepEqual({p,layout},before);
});
test('Inspection recomputes after edits and rejects blocked, narrow or out-of-map entrances',()=>{
 const {p,layout}=fixture(),next=withEntranceRouting(p,manifest,layout,policy);
 next.metadata['formation.access']=JSON.stringify({passed:true});
 next.entities.push({id:'obstacle',token:'g',team:2,position:[2400,1200,0],rotation:[0,0,0],active:1});
 assert.throws(()=>inspectEntranceRouting(p,manifest,next),/insufficient sampled clearance/);
 next.entities.pop();
 const area=JSON.parse(next.metadata[BUILD_AREAS_KEY]);area[0].width=40;next.metadata[BUILD_AREAS_KEY]=JSON.stringify(area);
 assert.throws(()=>inspectEntranceRouting(p,manifest,next),/at least 80/);
 area[0].width=200;area[0].points[0]=[3950,1600];next.metadata[BUILD_AREAS_KEY]=JSON.stringify(area);
 assert.throws(()=>inspectEntranceRouting(p,manifest,next),/outside the map/);
 const cleared=withEntranceRouting(p,manifest,next,undefined);
 assert.equal(cleared.metadata[ENTRANCE_ROUTING_KEY],undefined);assert.equal(cleared.metadata['formation.access'],undefined);
 assert.ok(next.metadata[ENTRANCE_ROUTING_KEY]);assert.ok(next.metadata['formation.access']);
});
