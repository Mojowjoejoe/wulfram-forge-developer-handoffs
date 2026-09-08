import test from 'node:test';
import assert from 'node:assert/strict';
import {preferredFormationOption} from '../lib/formation-options.ts';
const option=(id,blocked,tight)=>({layout:{id},routeSummary:{routes:8,blocked,tight,vehicleWidth:80}});
void test('Initial preference minimizes blocked routes before tight routes without sorting or mutating options',()=>{
 const items=[option('blocked',1,0),option('tight',0,4),option('clear',0,0),option('also-clear',0,0)];
 const before=structuredClone(items);
 assert.equal(preferredFormationOption(items),items[2]);assert.deepEqual(items,before);
 assert.equal(preferredFormationOption(items.slice(0,2)),items[1]);
 assert.equal(preferredFormationOption([option('a',0,4),option('b',0,2)]).layout.id,'b');
});
void test('Failed placements cannot win and unavailable checks are not treated as clear',()=>{
 const unchecked={layout:{id:'unchecked'}},unavailable={...option('unknown',0,0),routeSummary:{routes:0,blocked:0,tight:0,vehicleWidth:80,unavailable:'Not checked'}};
 const measured=option('measured',1,0);
 assert.equal(preferredFormationOption([{error:'Does not fit'},unchecked,unavailable,measured]),measured);
 assert.equal(preferredFormationOption([unchecked,unavailable]),unchecked);
 assert.equal(preferredFormationOption([]),undefined);
 assert.equal(preferredFormationOption([{error:'Does not fit'}]),undefined);
});
