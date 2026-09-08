import assert from 'node:assert/strict';
import test from 'node:test';
import { TERRAIN_STARTER_PRESETS } from '../lib/terrain-stamp-presets.ts';
import { stampTerrain, terrainStampWeight, rotateTerrainStamp, terrainStampDimensions } from '../lib/terrain-stamp.ts';
const options = { preset: 'ridge', x: 600, y: 700, radius: 300, aspect: .4, rotation: 0, amplitude: 150, edgePower: 2, mirror: true };
const terrain = { width: 65, height: 65, worldWidth: 2000, worldHeight: 2000, heights: Array(4225).fill(0), textureIds: [1], tagmap: [], tagmap2: [] };
void test('mesa and basin have level central displacement, signed smooth shoulders and bounded footprints',()=>{
 for(const preset of ['mesa','basin']){
  const o={...options,preset,shapeVersion:'natural-v2',mirror:false,length:1000,width:1000,naturalness:.8,roughness:.4,blend:.3};
  const sign=preset==='mesa'?1:-1;
  for(const [x,y] of [[0,0],[50,0],[0,50],[60,60]])assert.equal(terrainStampWeight(x,y,o),sign);
  assert.equal(terrainStampWeight(500,0,o),0);assert.equal(terrainStampWeight(499,0,o),0);
  let previous=1;
  for(let x=0;x<=500;x++){
    const h=Math.abs(terrainStampWeight(x,0,o));assert.ok(h<=previous+1e-12);assert.ok(previous-h<.02);previous=h;
  }
  const raised={...terrain,heights:terrain.heights.map(()=>30)};
  const result=stampTerrain(raised,{...o,x:1000,y:1000});
  assert.equal(result.terrain.heights[32*65+32],30+sign*o.amplitude);
  assert.ok(raised.heights.every(h=>h===30));
 }
});
void test('natural-v2 starter shapes are bounded, deterministic, distinct and mirrored', () => {
  const large = { ...terrain, width: 161, height: 161, worldWidth: 4000, worldHeight: 4000, heights: Array(25921).fill(0) };
  const shapes = [];
  for (const { name, options: preset } of TERRAIN_STARTER_PRESETS) {
    const settings = { ...preset, x: 1500, y: 2000, mirror: true };
    const a = stampTerrain(large, settings);
    assert.deepEqual(a, stampTerrain(large, settings), name);
    assert.deepEqual(a.terrain.heights, [...a.terrain.heights].reverse(), name);
    assert.ok(a.deltas.every(v => Math.abs(v) <= settings.amplitude), name);
    assert.notDeepEqual(a.deltas, stampTerrain(large, { ...settings, seed: 'different' }).deltas, name);
    shapes.push(a.deltas);
  }
  for (let i = 0; i < shapes.length; i++) for (let j = i + 1; j < shapes.length; j++) assert.notDeepEqual(shapes[i], shapes[j]);
  assert.ok(large.heights.every(v => v === 0));
  const ridge = { ...TERRAIN_STARTER_PRESETS[0].options, x: 2000, y: 2000 };
  const variants = ['ridge-a', 'ridge-b', 'ridge-c'].map(seed => stampTerrain(large, { ...ridge, seed }).deltas);
  for (let i = 0; i < variants.length; i++) for (let j = i + 1; j < variants.length; j++) {
    assert.ok(variants[i].some((v, k) => Math.abs(v - variants[j][k]) > ridge.amplitude * .2), 'Adjacent text seeds visibly vary v2 relief');
  }
});
void test('new mirrored overlap is continuous; unsafe legacy overlaps reject', () => {
  const large = { ...terrain, width: 161, height: 161, worldWidth: 4000, worldHeight: 4000, heights: Array(25921).fill(0) };
  const settings = { ...options, x: 1500, y: 2000, radius: 1000, aspect: 1, amplitude: 1000 };
  assert.throws(() => stampTerrain(large, settings), /Legacy mirrored stamps overlap/);
  for (const preset of ['ridge', 'valley', 'crater', 'saddle']) {
    const v2 = { ...settings, shapeVersion: 'natural-v2', preset, edgePower: 1 };
    const blend = x => {
      const a = terrainStampWeight(x - 1500, 0, v2), b = terrainStampWeight(2500 - x, 0, v2);
      return (a + b) / (1 + Math.abs(a * b));
    };
    for (let x = 500; x <= 3500; x += 2) assert.ok(Math.abs(blend(x + .001) - blend(x - .001)) < .001, preset);
    assert.ok(stampTerrain(large, v2).deltas.every(v => Math.abs(v) <= 1000));
  }
});
void test('natural shapes are seeded, bounded, mirrored and blend without widening the footprint', () => {
  const natural = { ...options, seed: 'sprint-a', naturalness: .8, roughness: .6, bend: .7, blend: .4 };
  const a = stampTerrain(terrain, natural);
  assert.deepEqual(a, stampTerrain(terrain, natural));
  assert.notDeepEqual(a.terrain.heights, stampTerrain(terrain, { ...natural, seed: 'sprint-b' }).terrain.heights);
  assert.deepEqual(a.terrain.heights, [...a.terrain.heights].reverse());
  assert.ok(a.deltas.every(d => Math.abs(d) <= options.amplitude));
  const unblended = stampTerrain(terrain, { ...natural, blend: 0 });
  assert.ok(a.deltas.every((d, i) => Math.abs(d) <= Math.abs(unblended.deltas[i]) + 1e-10));
  assert.equal(terrainStampWeight(301, 0, natural), 0);
  const legacy = stampTerrain(terrain, options);
  assert.deepEqual(legacy.terrain, stampTerrain(terrain, { ...options, naturalness: 0, roughness: 0, bend: 0, blend: 0 }).terrain);
  for (const change of [{ roughness: NaN }, { blend: 2 }, { bend: -2 }, { seed: 'x'.repeat(201) }]) assert.throws(() => stampTerrain(terrain, { ...natural, ...change }));
});
void test('independent dimensions preserve legacy presets and permit width greater than length', () => {
  assert.deepEqual(terrainStampDimensions(options), { length: 600, width: 240 });
  assert.deepEqual(stampTerrain(terrain, options).terrain, stampTerrain(terrain, { ...options, length: 600, width: 240 }).terrain);
  const wide = { ...options, length: 160, width: 600 };
  assert.equal(terrainStampWeight(100, 0, wide), 0);
  assert.ok(terrainStampWeight(0, 100, wide) > 0);
  assert.equal(terrainStampDimensions({ ...wide, length: 400 }).width, 600);
  assert.equal(terrainStampDimensions({ ...wide, width: 400 }).length, 160);
  assert.ok(stampTerrain(terrain, wide).changed > 0);
  assert.throws(() => stampTerrain(terrain, { ...wide, width: NaN }), /length/);
  assert.throws(() => stampTerrain(terrain, { ...wide, length: 4001 }), /length/);
});
void test('rotation turns an elongated landform and shapes have signed relief', () => {
  assert.equal(terrainStampWeight(0, 180, options), 0);
  assert.ok(terrainStampWeight(0, 180, { ...options, rotation: 90 }) > 0);
  assert.equal(terrainStampWeight(0, 0, { ...options, preset: 'valley' }), -1);
  assert.equal(terrainStampWeight(0, 0, { ...options, preset: 'crater' }), -1);
  assert.ok(terrainStampWeight(210, 0, { ...options, preset: 'crater' }) > 0);
  assert.ok(terrainStampWeight(100, 0, { ...options, preset: 'saddle' }) > 0);
  assert.ok(terrainStampWeight(0, 50, { ...options, preset: 'saddle' }) < 0);
});
void test('mirrored stamps are deterministic, symmetric and preserve source and textures', () => {
  const before = structuredClone(terrain);
  const a = stampTerrain(terrain, options);
  assert.deepEqual(a, stampTerrain(terrain, options));
  assert.deepEqual(a.terrain.heights, [...a.terrain.heights].reverse());
  assert.deepEqual(terrain, before);
  assert.deepEqual(a.terrain.textureIds, terrain.textureIds);
  assert.ok(a.changed > 0);
  assert.ok(Math.max(...a.deltas) <= options.amplitude);
});
void test('unsafe, out-of-range and sub-grid placements reject without mutation', () => {
  assert.throws(() => stampTerrain(terrain, { ...options, radius: NaN }), /limits/);
  assert.throws(() => stampTerrain(terrain, { ...options, x: 10 }), /edge/);
  assert.throws(() => stampTerrain(terrain, { ...options, radius: 80, aspect: .2 }), /narrow/);
  assert.throws(() => stampTerrain(terrain, options, [{ x: 600, y: 700, radius: 50 }]), /structure/);
  assert.throws(() => stampTerrain(terrain, options, [{ x: 1400, y: 1300, radius: 50 }]), /structure/);
  assert.ok(terrain.heights.every(h => h === 0));
});
void test('vertices outside a stamp retain full original precision', () => {
  const input = structuredClone(terrain); input.heights[0] = 1.123456789;
  assert.equal(stampTerrain(input, options).terrain.heights[0], input.heights[0]);
});
void test('protected vertex masks reject both partners and do not clip or mutate', () => {
  const mask = Array(4225).fill(false); mask[22 * 65 + 19] = true;
  assert.throws(() => stampTerrain(terrain, options, [], mask), /protected route/);
  const mirrored = [...mask].reverse();
  assert.throws(() => stampTerrain(terrain, options, [], mirrored), /protected route/);
  assert.throws(() => stampTerrain(terrain, options, [], [true]), /does not match/);
  assert.ok(terrain.heights.every(h => h === 0));
  assert.equal(rotateTerrainStamp(180, 1), -165);
  assert.equal(rotateTerrainStamp(-180, -1), 165);
  assert.equal(rotateTerrainStamp(0, 1), 15);
});
