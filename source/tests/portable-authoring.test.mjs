import test from 'node:test';
import assert from 'node:assert/strict';
import {capturePortableAuthoring,restorePortableAuthoring,validatePortableAuthoring} from '../lib/portable-authoring.ts';
import {DISTRICTS_KEY} from '../lib/base-districts.ts';
import {DISTRICT_RELATIONSHIPS_KEY} from '../lib/district-relationships.ts';
import {COMPOSITION_KEY} from '../lib/composition-budgets.ts';
function fixture(){
 const entities=[['one',1,0],['two',1,400],['other',2,1700]].map(([id,team,x])=>({id,team,token:'e',position:[x,20,10],rotation:[0,0,0],active:1}));
 const groups=[{id:'a',name:'Locked power',entityIds:['one'],locked:true,role:'power',variation:'fixed'},{id:'b',name:'Mobile power',entityIds:['two'],variation:'reposition'},{id:'c',name:'Asymmetric opponent',entityIds:['other']}];
 const metadata={[DISTRICTS_KEY]:JSON.stringify(groups),[DISTRICT_RELATIONSHIPS_KEY]:JSON.stringify([{id:'r',name:'Spacing',from:'a',to:'b',min:390,max:410}]),[COMPOSITION_KEY]:JSON.stringify([{team:1,role:'power',min:2,max:2},{team:2,role:'all',min:1,max:1}])};
 return {entities,metadata};
}
test('authoring survives JSON, relocation, rotation and new IDs for both asymmetric teams',()=>{
 const f=fixture(),before=structuredClone(f),portable=capturePortableAuthoring(f.metadata,f.entities);
 const moved=f.entities.map((e,i)=>({...e,id:`new-${i}`,position:[300-e.position[1],900+e.position[0],80]}));
 const result=restorePortableAuthoring(JSON.parse(JSON.stringify(portable)),moved);
 const groups=JSON.parse(result[DISTRICTS_KEY]);
 assert.deepEqual(groups.map(g=>g.entityIds),[['new-0'],['new-1'],['new-2']]);
 assert.equal(groups[0].locked,true);assert.equal(groups[1].variation,'reposition');
 assert.equal(result[DISTRICT_RELATIONSHIPS_KEY],f.metadata[DISTRICT_RELATIONSHIPS_KEY]);
 assert.equal(result[COMPOSITION_KEY],f.metadata[COMPOSITION_KEY]);assert.deepEqual(f,before);
});
test('capture rejects orphan membership and infeasible source rules without mutation',()=>{
 for(const mode of ['orphan','distance','budget']){
  const f=fixture();if(mode==='orphan')f.entities[0].id='lost';
  if(mode==='distance')f.entities[1].position[0]=800;
  if(mode==='budget')f.entities[2].team=1;
  const before=structuredClone(f);assert.throws(()=>capturePortableAuthoring(f.metadata,f.entities));assert.deepEqual(f,before);
 }
});
test('untrusted indices and district references reject rather than lose rules',()=>{
 const f=fixture(),p=capturePortableAuthoring(f.metadata,f.entities);
 for(const index of [-1,.5,3,null,'0']){const q=structuredClone(p);q.districts[0].members=[index];assert.throws(()=>validatePortableAuthoring(q));}
 const duplicate=structuredClone(p);duplicate.districts[0].members=[0,0];assert.throws(()=>validatePortableAuthoring(duplicate));
 const missing=structuredClone(p);missing.relationships[0].to='missing';assert.throws(()=>validatePortableAuthoring(missing));
 const future=structuredClone(p);future.version=2;assert.throws(()=>validatePortableAuthoring(future));
});
test('restoration rejects mismatched identities and invalid new distances without mutation',()=>{
 const f=fixture(),p=capturePortableAuthoring(f.metadata,f.entities);
 for(const mode of ['duplicate','team','token','subtype','distance','missing']){
  const entities=structuredClone(f.entities);
  if(mode==='duplicate')entities[1].id=entities[0].id;
  if(mode==='team')entities[0].team=2;if(mode==='token')entities[0].token='r';
  if(mode==='subtype')entities[0].subtype='cargo';if(mode==='distance')entities[1].position[0]=1000;
  if(mode==='missing')entities.pop();
  const before=structuredClone(entities);assert.throws(()=>restorePortableAuthoring(p,entities));assert.deepEqual(entities,before);
 }
});
test('field order is irrelevant and collection limits reject oversized input',()=>{
 const f=fixture(),p=capturePortableAuthoring(f.metadata,f.entities);
 p.buildings=p.buildings.map(b=>({team:b.team,token:b.token}));
 assert.doesNotThrow(()=>restorePortableAuthoring(p,f.entities));
 const many=structuredClone(p);many.districts=Array(101).fill(p.districts[0]);assert.throws(()=>validatePortableAuthoring(many));
 const members=structuredClone(p);members.districts[0].members=Array(501).fill(0);assert.throws(()=>validatePortableAuthoring(members));
 for(const [key,count] of [['relationships',101],['budgets',11]]){const q=structuredClone(p);q[key]=Array(count).fill(p[key][0]);assert.throws(()=>validatePortableAuthoring(q),/oversized/);}
});
test('membership follows serialized indices even for identical building types',()=>{
 const f=fixture(),p=capturePortableAuthoring(f.metadata,f.entities);
 const renamed=f.entities.map((e,i)=>({...e,id:`replacement-${i}`}));
 const groups=JSON.parse(restorePortableAuthoring(p,renamed)[DISTRICTS_KEY]);
 assert.deepEqual(groups[0].entityIds,['replacement-0']);
 assert.deepEqual(groups[1].entityIds,['replacement-1']);
 // A later geometry decoder must not sort or deduplicate these same-type records.
 assert.deepEqual(p.districts.map(g=>g.members),[[0],[1],[2]]);
});
