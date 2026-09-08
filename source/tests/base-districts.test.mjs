import test from 'node:test';
import assert from 'node:assert/strict';
import { readDistricts, transformDistrict, validateDistrictUpdate, districtVariationStatus } from '../lib/base-districts.ts';
const entities=[{id:'a',token:'e',team:1,position:[100,100,5],rotation:[0,0,0],active:1},{id:'b',token:'r',team:1,position:[140,100,7],rotation:[0,0,.2],active:1},{id:'c',token:'e',team:2,position:[700,700,5],rotation:[0,0,0],active:1}];
const transform=(ids,operation,conform=()=>{})=>transformDistrict(entities,ids,operation,1000,1000,e=>e.id==='c',conform,()=> 'new-id');
await test('District composition permissions default fixed and cannot bypass overlapping locks',()=>{
  const legacy={id:'old',name:'Services',entityIds:['a']};
  assert.equal(districtVariationStatus([legacy],entities)[0].eligible,false);
  const allowed={...legacy,role:'services',variation:'reposition'};
  assert.deepEqual(readDistricts(JSON.stringify([allowed])),[allowed]);
  assert.equal(districtVariationStatus([allowed],entities)[0].eligible,true);
  for(const block of [{...legacy,id:'fixed'},{...legacy,id:'locked',locked:true,variation:'reposition'}])assert.equal(districtVariationStatus([allowed,block],entities)[0].eligible,false);
  assert.equal(districtVariationStatus([{...allowed,entityIds:['missing']}],entities)[0].eligible,false);
  assert.throws(()=>readDistricts(JSON.stringify([{...allowed,role:'unknown'}])),/role/);
  assert.throws(()=>readDistricts(JSON.stringify([{...allowed,variation:'anything'}])),/permission/);
});
await test('District transforms preserve spacing, other teams and source; fitting is per structure',()=>{
  const before=structuredClone(entities);
  const moved=transform(['a','b'],{dx:10,dy:30,degrees:90,duplicate:false},e=>{e.position[2]=e.position[0]/10;});
  assert.deepEqual(moved.entities[0].position,[130,110,13]);assert.deepEqual(moved.entities[1].position,[130,150,13]);
  assert.equal(moved.entities[1].rotation[2],.2+Math.PI/2);
  assert.deepEqual(moved.entities[2],entities[2]);assert.deepEqual(entities,before);
  const copy=transform(['a'],{dx:100,dy:0,degrees:0,duplicate:true});assert.equal(copy.entities.length,4);assert.equal(copy.entities[3].id,'new-id');assert.deepEqual(copy.entities.slice(0,3),entities);
});
await test('Missing selection, bounds, locked rotation and invalid fitting reject atomically',()=>{
  const before=structuredClone(entities);
  assert.throws(()=>transform(['missing'],{dx:0,dy:0,degrees:0,duplicate:false}),/missing/);
  assert.throws(()=>transform(['a','b'],{dx:-1000,dy:0,degrees:0,duplicate:false}),/leave/);
  assert.throws(()=>transform(['c'],{dx:0,dy:0,degrees:90,duplicate:false}),/locked/);
  assert.throws(()=>transform(['a','b'],{dx:0,dy:0,degrees:0,duplicate:true}),/Duplicate/);
  assert.throws(()=>transform(['a'],{dx:0,dy:0,degrees:0,duplicate:false},e=>{e.position[2]=NaN;}),/invalid/);
  assert.deepEqual(entities,before);
});
await test('Named district metadata roundtrips and rejects ambiguous references',()=>{
  const groups=[{id:'yard',name:'Supply yard',entityIds:['a','b']}];assert.deepEqual(readDistricts(JSON.stringify(groups)),groups);
  assert.throws(()=>readDistricts(JSON.stringify([...groups,...groups])),/Invalid/);
  assert.throws(()=>readDistricts(JSON.stringify([{...groups[0],entityIds:['a','a']}])));
});
await test('Mirror reverses coordinates and headings without changing teams, geometry or source',()=>{
  const before=structuredClone(entities);
  for(const axis of ['x','y']){
    const op={dx:0,dy:0,degrees:0,duplicate:false,mirror:axis};
    const once=transform(['a','b'],op);
    const twice=transformDistrict(once.entities,['a','b'],op,1000,1000,()=>false,()=>{},()=> 'unused');
    for(let i=0;i<2;i++){
      assert.deepEqual(twice.entities[i].position,entities[i].position);
      assert.ok(Math.abs(twice.entities[i].rotation[2]-entities[i].rotation[2])<1e-12);
      assert.equal(once.entities[i].team,entities[i].team);
    }
    assert.deepEqual(once.entities[2],entities[2]);
    assert.equal(once.entities[0].position[0],axis==='x'?140:100);
    assert.equal(once.entities[1].rotation[2],axis==='x'?Math.PI-.2:-.2);
    assert.throws(()=>transform(['c'],op),/locked/);
  }
  assert.throws(()=>transform(['a'],{dx:0,dy:0,degrees:0,duplicate:false,mirror:'z'}),/Invalid mirror/);
  assert.deepEqual(entities,before);
});
await test('District updates can repair or remove orphan records without discarding other groups',()=>{
  const old=[{id:'one',name:'One',entityIds:['missing']},{id:'two',name:'Two',entityIds:['also-missing']}];
  const before=structuredClone(old);
  validateDistrictUpdate(old,[old[1]],entities);
  validateDistrictUpdate(old,[{...old[0],name:'Renamed'},old[1]],entities);
  validateDistrictUpdate(old,[{...old[0],entityIds:['a','b']},old[1]],entities);
  assert.throws(()=>validateDistrictUpdate(old,[...old,{id:'three',name:'Three',entityIds:['missing']}],entities),/missing/);
  assert.throws(()=>validateDistrictUpdate(old,[{...old[0],entityIds:['new-missing']}],entities),/missing/);
  assert.throws(()=>validateDistrictUpdate(old,[{...old[0],entityIds:['a','a']}],entities),/Invalid/);
  assert.deepEqual(old,before);
});
await test('Alignment and distribution keep other coordinates, endpoints, headings and unrelated buildings',()=>{
  const list=structuredClone(entities);list[2].position=[400,350,0];
  const apply=arrange=>transformDistrict(list,['a','b','c'],{dx:0,dy:0,degrees:0,duplicate:false,arrange},1000,1000,()=>false,e=>{e.position[2]=123;},()=> 'unused');
  const aligned=apply('align-x');assert.deepEqual(aligned.entities.map(e=>e.position[0]),[640/3,640/3,640/3]);
  assert.deepEqual(aligned.entities.map(e=>e.position[1]),[100,100,350]);
  const spaced=apply('space-x');assert.deepEqual(spaced.entities.map(e=>e.position[0]),[100,250,400]);
  assert.deepEqual(spaced.entities.map(e=>e.rotation),list.map(e=>e.rotation));
  assert.deepEqual(spaced.entities.map(e=>e.position[2]),[123,123,123]);
  const y=apply('space-y');assert.deepEqual(y.entities.map(e=>e.position[1]),[100,225,350]);
  assert.deepEqual(y.entities.map(e=>e.position[0]),[100,140,400]);
  const oneAxis=transform(['a','b'],{dx:0,dy:0,degrees:0,duplicate:false,arrange:'align-x'});assert.deepEqual(oneAxis.entities[2],entities[2]);
  assert.throws(()=>transform(['a','b'],{dx:0,dy:0,degrees:0,duplicate:false,arrange:'space-x'}),/three/);
  assert.throws(()=>transform(['a','b'],{dx:0,dy:0,degrees:0,duplicate:false,arrange:'align-y'}),/already/);
  assert.throws(()=>transform(['a','b'],{dx:1,dy:0,degrees:0,duplicate:false,arrange:'align-x'}),/separate/);
  assert.throws(()=>transform(['a','b'],{dx:0,dy:0,degrees:0,duplicate:false,arrange:'bad'}),/Invalid alignment/);
});
