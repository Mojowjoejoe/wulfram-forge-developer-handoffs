import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { generateBalancedProject, rotationalTerrainMismatches } from '../lib/balanced-map-generator.ts';
import { COMBAT_BASE_TEMPLATE } from '../lib/combat-base-template.ts';
import { terrainProtectionMask } from '../lib/terrain-detail-generator.ts';
import { applyProjectStamp, stampProtection, previewStampTerrain } from '../lib/terrain-stamp-project.ts';
import { createBlankProject } from '../lib/wulfram.ts';
import { withBuildAreas } from '../lib/editor-constraints.ts';
const manifest = JSON.parse(readFileSync(new URL('../public/assets/manifest.json', import.meta.url), 'utf8'));
void test('stamp preview and apply reject protected heights with safety off and preserve the source', () => {
  const source = withBuildAreas(createBlankProject(), [{id:'ridge',name:'Hand-built ridge',kind:'terrain',team:'all',x:900,y:900,width:400,height:400}], manifest);
  const original = structuredClone(source);
  const options = {preset:'ridge',radius:150,aspect:1,rotation:0,amplitude:80,edgePower:2,mirror:false,x:1100,y:1100};
  const protection = stampProtection(source,manifest,false);
  assert.throws(()=>previewStampTerrain(source.terrain,options,manifest,protection),/Hand-built ridge: terrain heights are protected/);
  assert.throws(()=>applyProjectStamp(source,options,manifest,false),/terrain heights are protected/);
  const distant={...options,x:2500,y:2500};
  assert.deepEqual(previewStampTerrain(source.terrain,distant,manifest,protection).terrain,applyProjectStamp(source,distant,manifest,false).terrain);
  assert.deepEqual(source,original);
});
void test('optional textures preserve symmetry, source data and exact no-paint behavior', () => {
  const source = generateBalancedProject({ seed: 'forge-combat-trial-v1', topology: 'three-route', size: 129, relief: 420,
    baseSeparation: .55, routeWidth: 1.35, centralAreaSize: 1.5, textureName: 'canyon003' }, COMBAT_BASE_TEMPLATE, manifest).project;
  const before = structuredClone(source);
  const options = { preset: 'ridge', radius: 300, aspect: .8, rotation: 25, amplitude: 150, edgePower: 2, mirror: true, x: 2300, y: 2800,
    naturalness: .8, roughness: .5, bend: .6, blend: .3, seed: 'paint-test' };
  const plain = applyProjectStamp(source, options, manifest, false);
  const painted = applyProjectStamp(source, { ...options, textureName: '11ice001', textureCoverage: 1 }, manifest, false);
  assert.notDeepEqual(painted.terrain.textureIds, source.terrain.textureIds);
  assert.deepEqual(painted.terrain.heights, plain.terrain.heights);
  assert.equal(rotationalTerrainMismatches(painted.terrain), 0);
  assert.deepEqual(source, before); assert.deepEqual(painted.entities, source.entities);
  assert.deepEqual(applyProjectStamp(source, { ...options, textureName: '11ice001', textureCoverage: 0 }, manifest, false).terrain, plain.terrain);
  assert.throws(() => applyProjectStamp(source, { ...options, textureName: 'missing001' }, manifest, false), /available/);
  for (const preset of ['ridge', 'valley', 'crater', 'saddle']) {
    const settings = { ...options, preset, shapeVersion: 'natural-v2', textureName: '11ice001', textureCoverage: .8 };
    const preview = previewStampTerrain(source.terrain, settings, manifest, stampProtection(source, manifest, false));
    assert.deepEqual(preview.terrain, applyProjectStamp(source, settings, manifest, false).terrain);
    assert.deepEqual(source, before, 'Preview never edits the project');
  }
});
void test('safe stamp placement protects authored reserves and marks analysis stale', () => {
  const source = generateBalancedProject({ seed: 'forge-combat-trial-v1', topology: 'three-route', size: 129, relief: 420,
    baseSeparation: .55, routeWidth: 1.35, centralAreaSize: 1.5, textureName: 'canyon003' }, COMBAT_BASE_TEMPLATE, manifest).project;
  const original = structuredClone(source);
  const mask = terrainProtectionMask(source, manifest);
  const options = { preset: 'valley', radius: 80, aspect: 1, rotation: 45, amplitude: 40, edgePower: 2, mirror: true };
  assert.throws(() => applyProjectStamp(source, { ...options, x: 2800, y: 2800 }, manifest, true), /protected/);
  let changed;
  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i]) continue;
    try { changed = applyProjectStamp(source, { ...options, x: i % 129 * 43.75, y: Math.floor(i / 129) * 43.75 }, manifest, true); break; }
    catch { /* A whole footprint, not just the anchor, must fit. */ }
  }
  assert.ok(changed, 'At least one whole footprint should fit');
  assert.deepEqual(source, original);
  mask.forEach((protectedVertex, i) => { if (protectedVertex) assert.equal(changed.terrain.heights[i], source.terrain.heights[i]); });
  assert.deepEqual(changed.entities, source.entities);
  assert.deepEqual(changed.terrain.textureIds, source.terrain.textureIds);
  assert.equal(changed.metadata['terrainStamp.validation'], 'manual-edit-needs-revalidation');
  const missing = structuredClone(source); missing.metadata = {};
  assert.throws(() => stampProtection(missing, manifest, true), /metadata/);
  assert.equal(stampProtection(missing, manifest, false).mask, undefined);
});
