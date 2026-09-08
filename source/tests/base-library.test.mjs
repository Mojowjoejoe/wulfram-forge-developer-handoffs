import {captureAuthoredBase} from '../lib/authored-base-package.ts';
import {DEFAULT_VALIDATION} from '../lib/wulfram.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { buildBaseLibrary, filterBaseLibrary } from '../lib/base-library.ts';
const manifest=JSON.parse(await fs.readFile('public/assets/manifest.json'));
const templates=JSON.parse(await fs.readFile('public/assets/base-templates.json')).templates;
const filter={query:'',category:'All',count:'all',role:'all',terrain:'all'};
await test('Library builds reproducible samples at all four sizes without changing sources',()=>{
  const before=JSON.stringify(templates);
  for(const size of ['small','standard','large','massive']){
    const entries=buildBaseLibrary(templates,[],manifest,size);
    assert.equal(entries.length,templates.length+24);
    assert.equal(new Set(entries.map(e=>e.key)).size,entries.length);
    assert.equal(entries.filter(e=>e.error).length,0);
    assert.deepEqual(entries,buildBaseLibrary(templates,[],manifest,size));
    assert.ok(entries.every(e=>e.modeledCount<=e.template.units.length));
  }
  assert.equal(JSON.stringify(templates),before);
});
await test('Library combines filters, preserves personal identity and supports empty results',()=>{
  const entries=buildBaseLibrary(templates,[{id:'saved-1',name:'My harbor',radius:900,template:templates[0]}],manifest,'large');
  assert.equal(filterBaseLibrary(entries,{...filter,category:'My bases'})[0].id,'saved-1');
  assert.equal(filterBaseLibrary(entries,{...filter,query:'IRON ANVIL',category:'Creative'}).length,1);
  assert.equal(filterBaseLibrary(entries,{...filter,query:'nonexistent-sample'}).length,0);
  assert.equal(filterBaseLibrary(entries,{...filter,category:'Original',terrain:'adaptive'}).length,0);
  const small=filterBaseLibrary(entries,{...filter,count:'small',role:'service',terrain:'adaptive'});
  assert.ok(small.length>0);assert.ok(small.every(e=>e.modeledCount<=15&&e.services>0&&['Creative','Experimental'].includes(e.category)));
  const fixed=filterBaseLibrary(entries,{...filter,terrain:'fixed'});
  assert.ok(fixed.length>0);assert.ok(fixed.every(e=>e.terrainAdaptive===false||!['Creative','Experimental'].includes(e.category)));
});

await test('Composition traits have explicit count thresholds and classify modeled catalog defenses',()=>{
 const t=structuredClone(templates[0]);t.units=[{token:'g',offset:[0,0],groundOffset:0,rotation:[0,0,0],active:1},{token:'s',offset:[100,0],groundOffset:0,rotation:[0,0,0],active:1}];t.footprint={width:500,height:100};
 const e=buildBaseLibrary([t],[],manifest,'small').find(e=>e.template?.id===t.id);
 assert.equal(e.defenses,e.modeledCount);assert.ok(e.defenses>0);assert.ok(e.traits.includes('Defense heavy'));assert.ok(e.traits.includes('No service pads'));assert.ok(e.traits.includes('Elongated footprint'));
 assert.equal(filterBaseLibrary([e],{...filter,trait:'Defense heavy'}).length,1);assert.equal(filterBaseLibrary([e],{...filter,trait:'Service yard'}).length,0);
 assert.equal(filterBaseLibrary([e],{...filter,query:'defense heavy'}).length,1);
 const all=buildBaseLibrary(templates,[],manifest,'large');for(const entry of all.filter(e=>e.traits.includes('Service yard')))assert.ok(entry.services>=2);
});

await test('Reviewed Offset cards count as one family and retain their arrangement and entrance geometry',()=>{
 const all=buildBaseLibrary([],[],manifest,'massive');assert.equal(all.filter(e=>e.category==='Creative').length,24);
 assert.equal(new Set(all.filter(e=>e.category==='Creative').map(e=>e.id)).size,21);
 const entries=filterBaseLibrary(all,{...filter,category:'Creative',query:'Offset Bastion'});assert.equal(entries.length,4);
 assert.deepEqual(entries.map(e=>e.offsetArrangement),['classic','wide-front','deep-court','split-wings']);
 assert.equal(new Set(entries.map(e=>JSON.stringify(e.approach))).size,4);
 for(const e of entries){assert.equal(e.id,'offset-bastion');assert.ok(e.guidance.includes('reviewed creative family'));assert.equal(e.approach.length,4);assert.ok(e.template&&e.size==='massive'&&e.seed);}
 assert.equal(filterBaseLibrary(all,{...filter,query:'deep court'}).length,1);
});

await test('Frontier sample retains full expansion reservation at every size',()=>{
 for(const size of ['small','standard','large','massive']){
 const e=buildBaseLibrary([],[],manifest,size).find(e=>e.id==='frontier-camp');
 assert.equal(e.category,'Creative');assert.equal(e.reservationWidth,320);assert.equal(e.reservationLabel,'expansion strip');assert.deepEqual(e.approach,[[350,-250],[350,250]]);
 assert.ok(e.template&&!e.error);assert.ok(e.planBounds.maxX>=510&&e.planBounds.minY<=-410&&e.planBounds.maxY>=410);
 assert.equal(filterBaseLibrary([e],{...filter,terrain:'adaptive'}).length,1);
 }
});

await test('Authored catalog cards preserve all teams and complete package without mutating it',()=>{
 const layout={id:'source',name:'Complete source',validation:{...DEFAULT_VALIDATION},metadata:{'forge.districts.v1':JSON.stringify([{id:'supply',name:'Supply lane',entityIds:['one'],locked:true}])},updatedAt:'test',entities:[{id:'one',token:'e',team:1,position:[100,200,10],rotation:[0,0,0],active:1},{id:'two',token:'e',team:2,position:[1100,2200,15],rotation:[0,0,1],active:1}]};
 const base=captureAuthoredBase(layout,{origin:[0,0,0],yaw:0}),before=JSON.stringify(base),saved={id:'my-authored',name:'Saved pair',base};
 const entries=buildBaseLibrary([],[],manifest,'small',[saved]),card=entries.find(e=>e.category==='Authored bases');
 assert.equal(card.modeledCount,2);assert.equal(card.power,2);assert.equal(card.template.units.length,2);assert.deepEqual(card.authoredBase,base);assert.equal(JSON.stringify(base),before);
 assert.equal(filterBaseLibrary(entries,{...filter,category:'Authored bases',query:'supply lane',terrain:'fixed'})[0].id,saved.id);
 assert.equal(card.template.footprint.width,1000);assert.equal(card.template.footprint.height,2000);
 card.authoredBase.geometry.units[0].team=9;assert.equal(base.geometry.units[0].team,1);
 const missing=buildBaseLibrary([],[],{...manifest,models:{}},'small',[saved]).find(e=>e.category==='Authored bases');assert.ok(missing.error);
});

await test('Courtyard reviewed cards retain reserved bands at all four sizes',()=>{
 for(const [size,count] of Object.entries({small:10,standard:15,large:21,massive:33})){
  const card=buildBaseLibrary([],[],manifest,size).find(e=>e.id==='service-courtyard');
  assert.equal(card.category,'Creative');assert.deepEqual(card.reservationBands.map(b=>b.width),[560,320,320]);assert.ok(card.planBounds.width>=2520);assert.equal(card.modeledCount,count);assert.equal(card.name,'Service Courtyard');assert.ok(card.seed);assert.equal(card.size,size);assert.ok(card.guidance.includes('six reservations'));
 }
});

await test('Broken Ring joins reviewed families with all reservation bands and honest portability guidance',()=>{
 for(const [size,count] of Object.entries({small:18,standard:23,large:28,massive:38})){
  const all=buildBaseLibrary([],[],manifest,size),card=all.find(e=>e.id==='broken-ring');
  assert.equal(card.category,'Creative');assert.equal(card.modeledCount,count);
  assert.deepEqual(card.reservationBands.map(b=>b.width),[240,120,120,120,900]);
  assert.deepEqual(card.reservationBands[3].points[0],card.reservationBands[3].points.at(-1));
  assert.ok(card.planBounds.width>=3000);assert.ok(card.guidance.includes('Favorites retain the plan'));
  assert.equal(filterBaseLibrary(all,{...filter,category:'Creative',query:'Broken Ring'}).length,1);
  assert.equal(new Set(all.filter(e=>e.category==='Creative').map(e=>e.id)).size,21);
 }
});

await test('Valley Pockets is one reviewed family with complete size-specific passages',()=>{
 for(const [size,count,yards] of [['small',10,2],['standard',15,3],['large',20,4],['massive',30,6]]){
  const card=buildBaseLibrary([],[],manifest,size).find(e=>e.id==='valley-pockets');assert.equal(card.category,'Creative');assert.equal(card.modeledCount,count);assert.equal(card.reservationBands.length,yards+1);assert.equal(card.reservationBands[0].width,240);assert.ok(card.reservationBands.slice(1).every(r=>r.width===120));
 }
});
