import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDisplayPreferences, defaultDisplayPreferences } from '../lib/display-preferences.ts';

await test('Display preferences recover corrupt and old data and whitelist booleans', () => {
  for (const raw of [null, '{', 'null', '[]', '5']) assert.deepEqual(parseDisplayPreferences(raw), defaultDisplayPreferences);
  const p = parseDisplayPreferences(JSON.stringify({ powerTint: false, powerIcons: 'false', coverage: { turrets: true, power: 0 }, displayOptions: { routes: false }, entities: ['untrusted'] }));
  assert.equal(p.powerTint, false); assert.equal(p.powerIcons, true);
  assert.deepEqual(p.coverage, { power: true, darklight: false, turrets: true });
  assert.equal(p.displayOptions.routes, false); assert.equal(p.displayOptions.markers, true);
  assert.equal('entities' in p, false);
  assert.deepEqual(parseDisplayPreferences(JSON.stringify(p)), p);
  p.coverage.power = false;
  assert.equal(defaultDisplayPreferences.coverage.power, true);
});

void test('Legacy hidden boundaries keep authored areas hidden until separately enabled',()=>{
 const old=parseDisplayPreferences(JSON.stringify({displayOptions:{boundaries:false}}));assert.equal(old.displayOptions.areas,false);
 const independent=parseDisplayPreferences(JSON.stringify({displayOptions:{boundaries:false,areas:true}}));assert.equal(independent.displayOptions.boundaries,false);assert.equal(independent.displayOptions.areas,true);
 assert.equal(parseDisplayPreferences(null).displayOptions.areas,true);
});
