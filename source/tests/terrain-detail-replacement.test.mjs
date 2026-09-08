import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import JSZip from 'jszip';
import { generateBalancedProject } from '../lib/balanced-map-generator.ts';
import { COMBAT_BASE_TEMPLATE } from '../lib/combat-base-template.ts';
import { DEFAULT_TERRAIN_DETAIL, generateTerrainDetail, previewTerrainDetail, readTerrainDetailOptions } from '../lib/terrain-detail-generator.ts';
const manifest = JSON.parse(fs.readFileSync(new URL('../public/assets/manifest.json', import.meta.url)));
const original = () => generateBalancedProject({ seed: 'forge-combat-trial-v1', topology: 'three-route', size: 129, relief: 420, baseSeparation: .55, routeWidth: 1.35, centralAreaSize: 1.5, textureName: 'canyon003' }, COMBAT_BASE_TEMPLATE, manifest).project;
void test('replacement restores original ground and textures without stacking, preserves layouts and source', () => {
  const source = original();
  const first = generateTerrainDetail(source, DEFAULT_TERRAIN_DETAIL, manifest).project;
  const before = structuredClone(first);
  const options = { ...DEFAULT_TERRAIN_DETAIL, seed: 'replacement-001', pairs: 12, height: 1000 };
  const replaced = previewTerrainDetail(first, options, manifest);
  assert.equal(JSON.stringify(replaced.project.terrain), JSON.stringify(generateTerrainDetail(source, options, manifest).project.terrain)); // JSON normalizes negative zero.
  assert.deepEqual(first, before);
  assert.deepEqual(replaced.project.entities, first.entities);
  assert.deepEqual(replaced.project.baseLayouts.map(l => l.entities), first.baseLayouts.map(l => l.entities));
  assert.equal(replaced.passed, true);
  assert.equal(JSON.stringify(previewTerrainDetail(JSON.parse(JSON.stringify(replaced.project)), DEFAULT_TERRAIN_DETAIL, manifest).project.terrain), JSON.stringify(first.terrain));
  assert.deepEqual(readTerrainDetailOptions(first), DEFAULT_TERRAIN_DETAIL);
});
void test('legacy passes migrate only when exactly reproducible; changed terrain and corrupt baselines reject', () => {
  const source = original();
  const first = generateTerrainDetail(source, DEFAULT_TERRAIN_DETAIL, manifest).project;
  delete first.metadata['terrainDetail.baseline'];
  assert.deepEqual(previewTerrainDetail(first, DEFAULT_TERRAIN_DETAIL, manifest).project.terrain, first.terrain);
  first.terrain.heights[0] += 1;
  assert.throws(() => previewTerrainDetail(first, DEFAULT_TERRAIN_DETAIL, manifest), /reproduced exactly/);
  const fresh = generateTerrainDetail(source, DEFAULT_TERRAIN_DETAIL, manifest).project;
  fresh.terrain.heights[0] += 1;
  assert.throws(() => previewTerrainDetail(fresh, DEFAULT_TERRAIN_DETAIL, manifest), /changed/);
  const corrupt = generateTerrainDetail(source, DEFAULT_TERRAIN_DETAIL, manifest).project;
  const snapshot = JSON.parse(corrupt.metadata['terrainDetail.baseline']); snapshot.before.heights[0] += 1;
  corrupt.metadata['terrainDetail.baseline'] = JSON.stringify(snapshot);
  assert.throws(() => previewTerrainDetail(corrupt, DEFAULT_TERRAIN_DETAIL, manifest));
});
void test('user diagnostics legacy terrain can be safely replaced', { skip: !fs.existsSync('C:/Users/Developer/Downloads/test2-fixed-diagnostics (1).zip') }, async () => {
  const zip = await JSZip.loadAsync(fs.readFileSync('C:/Users/Developer/Downloads/test2-fixed-diagnostics (1).zip'));
  const source = JSON.parse(await zip.file('working-project.json').async('string'));
  const before = structuredClone(source);
  const options = readTerrainDetailOptions(source);
  const next = previewTerrainDetail(source, { ...options, height: 65, minHeight: 5 }, manifest);
  assert.equal(next.passed, true);
  assert.deepEqual(source, before);
  assert.deepEqual(next.project.entities, source.entities);
});
