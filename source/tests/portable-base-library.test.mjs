import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { creativeBaseTemplate } from '../lib/creative-base-layouts.ts';
import { exportPortableBases, parsePortableBases, mergePersonalBases } from '../lib/portable-base-library.ts';
const manifest=JSON.parse(await fs.readFile('public/assets/manifest.json'));
const base={id:'saved-one',name:'My starter',radius:1800,template:creativeBaseTemplate('starter','portable-test',manifest,'small')};
await test('Portable and legacy libraries preserve complete arrangements',()=>{
  assert.deepEqual(parsePortableBases(exportPortableBases([base])),[base]);
  assert.deepEqual(parsePortableBases(JSON.stringify([base])),[base]);
  const renamed={...structuredClone(base),name:'Renamed'};
  const source=JSON.stringify([base]);
  const merged=mergePersonalBases([base],[renamed]);
  assert.equal(merged.added,1);assert.equal(merged.conflicts,1);assert.equal(merged.bases.length,2);
  assert.notEqual(merged.bases[0].id,merged.bases[1].id);
  assert.equal(JSON.stringify([base]),source);
  const again=mergePersonalBases(merged.bases,[renamed]);assert.equal(again.added,0);assert.equal(again.skipped,1);
  assert.deepEqual(parsePortableBases(exportPortableBases(merged.bases)),merged.bases);
  const otherSource=structuredClone(base);otherSource.template.sourceMap='Different source';
  assert.equal(mergePersonalBases([base],[otherSource]).added,1,'Distinct provenance is never discarded as a duplicate');
  const reordered=Object.fromEntries(Object.entries(base).reverse());
  assert.equal(mergePersonalBases([base],[reordered]).skipped,1,'JSON key order is not a different entry');
});
await test('Malformed and future libraries fail atomically',()=>{
  for(const raw of ['{}','null','{',JSON.stringify({format:'wulfram-base-library',version:8,bases:[base]}),' '.repeat(2_000_001)]) assert.throws(()=>parsePortableBases(raw));
  for(const edit of [b=>b.radius=-1,b=>b.template.footprint=null,b=>b.template.units[0].offset[0]='bad',b=>b.template.units[0].groundOffset=null,b=>b.name='',b=>b.template.unitCount++]) {
    const invalid=structuredClone(base);invalid.id='different-id';edit(invalid);assert.throws(()=>parsePortableBases(JSON.stringify([base,invalid])));
  }
  const full=Array.from({length:50},(_,i)=>({...structuredClone(base),id:'id-'+i,name:'Name '+i}));
  assert.throws(()=>parsePortableBases(JSON.stringify([base,base])),/unique/);
  const before=JSON.stringify(full);assert.throws(()=>mergePersonalBases(full,[base]),/exceed 50/);assert.equal(JSON.stringify(full),before);
});

