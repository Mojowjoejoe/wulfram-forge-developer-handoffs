import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankProject,cloneProject,synchronizeActiveBaseLayout} from '../lib/wulfram.ts';
import {DISTRICTS_KEY} from '../lib/base-districts.ts';
import {DISTRICT_RELATIONSHIPS_KEY,readDistrictRelationships,relationshipDistance} from '../lib/district-relationships.ts';
import {assertEditorConstraints,withDistrictRelationships} from '../lib/editor-constraints.ts';
const rule={id:'link',name:'Service spacing',from:'a',to:'b',min:300,max:500};
function fixture(){
  const p=createBlankProject();
  p.entities=[{id:'one',token:'e',team:1,position:[1000,1000,10],rotation:[0,0,0],active:1},{id:'two',token:'e',team:1,position:[1400,1000,10],rotation:[0,0,0],active:1}];
  synchronizeActiveBaseLayout(p);
  p.baseLayouts[0].metadata[DISTRICTS_KEY]=JSON.stringify([{id:'a',name:'A',entityIds:['one']},{id:'b',name:'B',entityIds:['two']}]);
  return withDistrictRelationships(p,[rule]);
}
await test('Relationship distances survive JSON and guard all layouts and lost membership',()=>{
  const p=fixture(),original=cloneProject(p),roundtrip=JSON.parse(JSON.stringify(p));
  assertEditorConstraints(p,roundtrip);
  for(const x of [1299,1501]){const n=cloneProject(p);n.entities[1].position[0]=x;assert.throws(()=>assertEditorConstraints(p,n),/Service spacing.*required 300–500/);}
  for(const x of [1300,1500]){const n=cloneProject(p);n.entities[1].position[0]=x;assertEditorConstraints(p,n);}
  const missing=cloneProject(p);missing.entities.pop();assert.throws(()=>assertEditorConstraints(p,missing),/missing/);
  const group=cloneProject(p);group.baseLayouts[0].metadata[DISTRICTS_KEY]='[]';assert.throws(()=>assertEditorConstraints(p,group),/missing/);
  const inactive=cloneProject(p);inactive.baseLayouts.push({...structuredClone(inactive.baseLayouts[0]),id:'other',entities:[],metadata:{}});inactive.activeBaseLayoutId='other';inactive.entities=[];
  assertEditorConstraints(p,inactive);inactive.baseLayouts[0].entities[1].position[0]=1600;assert.throws(()=>assertEditorConstraints(p,inactive),/Service spacing/);
  assert.deepEqual(p,original);
});
await test('Relationship removal is explicit and infeasible authoring is atomic',()=>{
  const p=fixture(),before=cloneProject(p),n=cloneProject(p);delete n.baseLayouts[0].metadata[DISTRICT_RELATIONSHIPS_KEY];
  assert.throws(()=>assertEditorConstraints(p,n),/explicitly/);
  assert.throws(()=>withDistrictRelationships(p,[{...rule,max:350}]),/required/);
  const removed=withDistrictRelationships(p,[]);assert.deepEqual(removed.entities,p.entities);
  const moved=cloneProject(removed);moved.entities[1].position[0]=1800;assertEditorConstraints(removed,moved);
  assert.deepEqual(p,before);
});
await test('Relationship parser rejects malformed bounds, duplicate pairs and incomplete centers',()=>{
  assert.deepEqual(readDistrictRelationships(JSON.stringify([rule])),[rule]);
  for(const change of [{min:-1},{max:299},{max:null},{from:'b'},{name:''},{id:''}])assert.throws(()=>readDistrictRelationships(JSON.stringify([{...rule,...change}])));
  assert.throws(()=>readDistrictRelationships(JSON.stringify([rule,{...rule,id:'reverse',from:'b',to:'a'}])),/each district pair/);
  assert.equal(relationshipDistance(rule,[{id:'a',entityIds:['one']},{id:'b',entityIds:['missing']}],fixture().entities),undefined);
});
