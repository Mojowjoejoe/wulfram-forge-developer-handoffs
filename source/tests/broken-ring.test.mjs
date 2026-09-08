import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {brokenRingTemplate, brokenRingPlan, brokenRingRequiredCounts} from '../lib/broken-ring.ts';
import {structureTerrainClearance} from '../lib/wulfram.ts';
import {distanceToSegment} from '../lib/build-areas.ts';
const manifest = JSON.parse(fs.readFileSync('public/assets/manifest.json', 'utf8'));
const sizes = ['small', 'standard', 'large', 'massive'];
await test('Broken Ring retains distinct shoulders, rear services, connected gaps, roles and original-model spacing over 48 samples', () => {
 const before = structuredClone(manifest);
 const totals = [18, 23, 28, 38];
 for (const [index, size] of sizes.entries()) {
  const openings = new Set(), positions = new Set();
  for (let seed = 0; seed < 12; seed++) {
   const result = brokenRingTemplate(String(seed), size, manifest), {template: t, plan} = result;
   assert.deepEqual(result, brokenRingTemplate(String(seed), size, manifest));
   assert.equal(t.units.length, totals[index]);
   for (const [token, count] of Object.entries(brokenRingRequiredCounts(size))) assert.equal(t.units.filter(u => u.token === token).length, count);
   assert.ok(plan.sites.some(s => s.center[0] > 0 && s.center[1] > 0));
   assert.ok(plan.sites.some(s => s.center[0] > 0 && s.center[1] < 0));
   assert.ok(plan.sites.slice(0, 2).every(s => s.center[0] < 0));
   assert.ok(plan.sites.filter(s => s.roles.some(r => ['u', 'r', 'f'].includes(r))).every(s => s.center[0] < 0));
   assert.equal(plan.serviceRoutes.length, 2);
   for (const [i, route] of plan.serviceRoutes.entries()) {
    assert.deepEqual(route.points[0], plan.route.points[1]);
    assert.ok(plan.circulation.points.some(p => p[0] === route.points[1][0] && p[1] === route.points[1][1]));
    const setback = Math.hypot(route.points[1][0] - plan.sites[i].center[0], route.points[1][1] - plan.sites[i].center[1]);
    assert.ok(setback >= 350 && setback <= 510);
   }
   assert.deepEqual(plan.circulation.points[0], plan.circulation.points.at(-1));
   assert.ok(plan.circulation.points.length <= 32);
   // A full positively wound loop surrounds the origin, with no repeated internal vertex.
   const loop = plan.circulation.points;
   assert.equal(new Set(loop.slice(0, -1).map(p => JSON.stringify(p))).size, loop.length - 1);
   let winding = 0;
   for (let i = 1; i < loop.length; i++) {
    const a = loop[i - 1], b = loop[i];
    winding += Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]);
    assert.ok(distanceToSegment(0, 0, a, b) - 60 >= 450);
   }
   assert.ok(Math.abs(winding - 2 * Math.PI) < 1e-8);
   assert.equal(plan.route.points.length, 4);
   assert.ok(plan.route.points[0][0] < 0 && plan.route.points.at(-1)[0] > 0);
   assert.ok(plan.route.points[0][1] >= 100 && plan.route.points[0][1] <= 260);
   assert.equal(plan.route.points.at(-1)[1], 0);
   openings.add(plan.route.points[0][1]); positions.add(JSON.stringify(plan.sites.map(s => s.center)));
   const radius = token => Math.max(...[1, 2].map(team => structureTerrainClearance({token, team}, manifest, 0, 0).footprint / Math.SQRT2));
   for (const [i, u] of t.units.entries()) {
    assert.ok(Math.hypot(...u.offset) >= 450 + radius(u.token) + 14);
    for (const route of [plan.route, ...plan.serviceRoutes, plan.circulation]) for (const [j, b] of route.points.slice(1).entries()) assert.ok(distanceToSegment(...u.offset, route.points[j], b) >= route.width / 2 + radius(u.token) + 14);
    for (const v of t.units.slice(i + 1)) assert.ok(Math.hypot(u.offset[0] - v.offset[0], u.offset[1] - v.offset[1]) >= radius(u.token) + radius(v.token) + 14);
    if (u.token !== 'e') assert.ok(t.units.some(e => e.token === 'e' && Math.hypot(e.offset[0] - u.offset[0], e.offset[1] - u.offset[1]) < 270));
   }
   assert.ok(t.footprint.width >= plan.route.points.at(-1)[0] - plan.route.points[0][0] + 240);
  }
  assert.equal(openings.size, 12); assert.equal(positions.size, 12);
 }
 assert.deepEqual(manifest, before);
});
await test('Broken Ring rejects unsupported sizes and missing original assets without mutating input', () => {
 for (const size of ['bad', '__proto__', 'constructor', 'toString']) assert.throws(() => brokenRingPlan('seed', size), /Unsupported/);
 const missing = {...manifest, models: {}};
 assert.throws(() => brokenRingTemplate('seed', 'small', missing), /needs the original/);
 assert.deepEqual(missing.models, {});
});

await test('Broken Ring version-one goldens retain the complete local plan and original building arrangement', () => {
 const golden = JSON.parse(fs.readFileSync('tests/fixtures/broken-ring-v1.json', 'utf8'));
 assert.deepEqual(golden.fixtures.map(f => f.size), sizes);
 for (const fixture of golden.fixtures) {
  const result = brokenRingTemplate(golden.seed, fixture.size, manifest);
  assert.equal(result.plan.version, golden.version);
  assert.equal(createHash('sha256').update(JSON.stringify(result)).digest('hex'), fixture.sha256);
 }
});
