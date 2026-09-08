import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankProject} from '../lib/wulfram.ts';
import {routeElevation} from '../lib/route-elevation.ts';
const terrain=()=>{const t=createBlankProject('Slope',65).terrain;t.worldWidth=1000;t.worldHeight=1000;t.heights=t.heights.map((_,i)=>(i%65)/64*100);return t;};
test('Measured plane has correct signed grade, ascent, reverse descent and preserves source',()=>{
 const t=terrain(),before=structuredClone(t),r=routeElevation(t,[[100,500],[900,500]]);
 assert.equal(r.error,undefined);assert.ok(Math.abs(r.ascent-80)<1e-8);assert.equal(r.descent,0);assert.ok(Math.abs(r.maxUphillDegrees-Math.atan(.1)*180/Math.PI)<1e-8);
 const reverse=routeElevation(t,[[900,500],[100,500]]);assert.ok(Math.abs(reverse.descent-80)<1e-8);assert.equal(reverse.ascent,0);assert.ok(reverse.samples.slice(1).every(s=>s.gradeDegrees<0));assert.deepEqual(t,before);
});
test('Route corners and repeated points retain exact endpoints without nonfinite grades',()=>{
 const r=routeElevation(terrain(),[[100,100],[500,100],[500,100],[500,900]]);assert.equal(r.length,1200);assert.ok(r.samples.some(s=>s.x===500&&s.y===100));assert.equal(r.samples.at(-1).distance,1200);assert.ok(r.samples.every(s=>Object.values(s).every(Number.isFinite)));
});
test('Invalid and excessive routes report unavailable without partial success',()=>{
 for(const p of [[[0,0],[1001,0]],[[NaN,0],[100,0]],[[0,0],[Infinity,0]]]){const r=routeElevation(terrain(),p);assert.ok(r.error);assert.equal(r.samples.length,0);}
 const t=terrain();const r=routeElevation(t,[[0,500],[1000,500]],10);assert.match(r.error,/budget/);assert.equal(r.samples.length,0);
});

test('Missing or nonfinite height data cannot masquerade as a flat profile',()=>{
 for(const kind of ['empty','short','nan']){const t=terrain();if(kind==='empty')t.heights=[];if(kind==='short')t.heights.pop();if(kind==='nan')t.heights[0]=NaN;const r=routeElevation(t,[[100,500],[900,500]]);assert.match(r.error,/buffer/);assert.equal(r.samples.length,0);}
});
test('Hill records both climb and descent; explicit output budgets reject partial profiles',()=>{
 const t=terrain();t.heights=t.heights.map((_,i)=>100-Math.abs(i%65-32)*100/32);
 const r=routeElevation(t,[[0,500],[1000,500]]);assert.ok(Math.abs(r.ascent-100)<1e-8);assert.ok(Math.abs(r.descent-100)<1e-8);assert.equal(Math.max(...r.samples.map(s=>s.height)),100);
 assert.ok(routeElevation(t,[[0,500],[1000,500]],0).error);
 assert.ok(routeElevation(t,[[0,500],[1000,500]],10002).error);
});
