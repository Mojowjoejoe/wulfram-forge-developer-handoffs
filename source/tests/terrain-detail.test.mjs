import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { generateBalancedProject, rotationalTerrainMismatches, routeBlend } from '../lib/balanced-map-generator.ts';
import { COMBAT_BASE_TEMPLATE } from '../lib/combat-base-template.ts';
import { BOOSTED_TERRAIN_DETAIL_HEIGHT, MAX_TERRAIN_DETAIL_HEIGHT, DEFAULT_TERRAIN_DETAIL, generateTerrainDetail, readTerrainDetailOptions, previewTerrainDetail } from '../lib/terrain-detail-generator.ts';
import { createMapArchive, readMapArchive } from '../lib/map-package.ts';
import { parseLand } from '../lib/wulfram.ts';
import { withBuildAreas, assertEditorConstraints } from '../lib/editor-constraints.ts';
import { terrainProtectionMask } from '../lib/terrain-detail-generator.ts';

const manifest = JSON.parse(readFileSync(new URL('../public/assets/manifest.json', import.meta.url), 'utf8'));
function source(seed = 'forge-combat-trial-v1', topology = 'three-route') {
  return generateBalancedProject({ seed, topology, size: 129, relief: 420, baseSeparation: 0.55,
    routeWidth: 1.35, centralAreaSize: 1.5, textureName: 'canyon003' }, COMBAT_BASE_TEMPLATE, manifest).project;
}

void test('detail rerolls preserve authored terrain and its mirrored partner across layouts', () => {
  const original = source();
  const options = {...DEFAULT_TERRAIN_DETAIL,pairs:8,radius:100};
  const initial = generateTerrainDetail(original,options,manifest);
  assert.ok(initial.centers.length);
  const [x,y] = initial.centers[0];
  const protectedProject = withBuildAreas(original,[{id:'hand-ridge',name:'Hand ridge',kind:'terrain',team:'all',x:x-100,y:y-100,width:200,height:200}],manifest);
  const before = structuredClone(protectedProject);
  const mask = terrainProtectionMask(protectedProject,manifest);
  const detail = generateTerrainDetail(protectedProject,options,manifest);
  const receipt=JSON.parse(detail.project.metadata['terrainDetail.settings']);
  assert.equal(receipt.version,'rocks-v2');assert.equal(typeof receipt.heightProtection,'string');
  const renamed=structuredClone(detail.project);
  const rules=JSON.parse(renamed.baseLayouts[0].metadata['forge.build-areas.v1']);rules[0].name='Renamed ridge';
  renamed.baseLayouts[0].metadata['forge.build-areas.v1']=JSON.stringify(rules);
  assert.doesNotThrow(()=>previewTerrainDetail(renamed,options,manifest));
  rules[0].width+=1;renamed.baseLayouts[0].metadata['forge.build-areas.v1']=JSON.stringify(rules);
  assert.throws(()=>previewTerrainDetail(renamed,options,manifest),/areas changed/);
  const missingReceipt=structuredClone(detail.project);delete receipt.heightProtection;missingReceipt.metadata['terrainDetail.settings']=JSON.stringify(receipt);
  assert.throws(()=>previewTerrainDetail(missingReceipt,options,manifest),/areas changed/);
  assert.ok(detail.changedVertices>0,'Eligible terrain remains usable');
  assertEditorConstraints(protectedProject,detail.project,manifest);
  mask.forEach((locked,i)=>{if(locked)assert.equal(detail.project.terrain.heights[i],protectedProject.terrain.heights[i]);assert.equal(locked,mask[mask.length-1-i]);});
  assert.equal(rotationalTerrainMismatches(detail.project.terrain),0);
  const rerolled = previewTerrainDetail(detail.project,{...options,seed:'authored-reroll-2'},manifest);
  assert.ok(rerolled.changedVertices>0);
  assertEditorConstraints(detail.project,rerolled.project,manifest);
  mask.forEach((locked,i)=>{if(locked)assert.equal(rerolled.project.terrain.heights[i],protectedProject.terrain.heights[i]);});
  assert.deepEqual(protectedProject,before);
  assert.deepEqual(detail.project.entities,before.entities);
  const inactive=structuredClone(protectedProject);inactive.baseLayouts.push({...structuredClone(inactive.baseLayouts[0]),id:'other',metadata:{}});inactive.activeBaseLayoutId='other';
  assert.deepEqual(terrainProtectionMask(inactive,manifest),mask);
});

void test('advanced landform controls survive replay and reject invalid settings', () => {
  const project = source();
  const options = { ...DEFAULT_TERRAIN_DETAIL, aspect: .4, rotation: 45, edgePower: 3 };
  const generated = generateTerrainDetail(project, options, manifest);
  const legacy=structuredClone(generated.project);const legacySettings=JSON.parse(legacy.metadata['terrainDetail.settings']);legacySettings.version='rocks-v1';delete legacySettings.heightProtection;legacy.metadata['terrainDetail.settings']=JSON.stringify(legacySettings);
  assert.equal(JSON.stringify(previewTerrainDetail(legacy,options,manifest).project.terrain),JSON.stringify(generated.project.terrain),'Legacy no-area recipes retain exact terrain replay');
  assert.ok(generated.changedVertices > 0);
  assert.equal(rotationalTerrainMismatches(generated.project.terrain), 0);
  assert.deepEqual(readTerrainDetailOptions(generated.project), options);
  // Saved JSON normalizes negative zero; compare the actual persisted representation.
  assert.equal(JSON.stringify(previewTerrainDetail(generated.project, options, manifest).project.terrain), JSON.stringify(generated.project.terrain));
  assert.notDeepEqual(generateTerrainDetail(project, { ...options, rotation: -45 }, manifest).project.terrain.heights, generated.project.terrain.heights);
  for (const change of [{ aspect: .1 }, { rotation: NaN }, { edgePower: 7 }]) assert.throws(() => generateTerrainDetail(project, { ...options, ...change }, manifest), /width ratio/);
});

void test('height boost preserves cluster positions, protected vertices and textures while increasing relief', () => {
  const project = source();
  const normal = generateTerrainDetail(project, DEFAULT_TERRAIN_DETAIL, manifest);
  const boosted = generateTerrainDetail(project, { ...DEFAULT_TERRAIN_DETAIL, height: BOOSTED_TERRAIN_DETAIL_HEIGHT }, manifest);
  assert.deepEqual(boosted.centers, normal.centers);
  assert.deepEqual(boosted.project.terrain.textureIds, normal.project.terrain.textureIds);
  assert.deepEqual(boosted.project.entities, project.entities);
  assert.equal(boosted.passed, true);
  assert.equal(rotationalTerrainMismatches(boosted.project.terrain), 0);
  let maximumAdded = 0;
  for (let i = 0; i < project.terrain.heights.length; i++) {
    const original = project.terrain.heights[i];
    const raised = boosted.project.terrain.heights[i];
    if (normal.project.terrain.heights[i] === original) assert.equal(raised, original);
    else assert.ok(raised > normal.project.terrain.heights[i]);
    maximumAdded = Math.max(maximumAdded, raised - original);
  }
  assert.ok(maximumAdded > 650 && maximumAdded <= BOOSTED_TERRAIN_DETAIL_HEIGHT);
  assert.throws(() => generateTerrainDetail(project, { ...DEFAULT_TERRAIN_DETAIL, height: MAX_TERRAIN_DETAIL_HEIGHT + 1 }, manifest));
  const extreme = generateTerrainDetail(project, { ...DEFAULT_TERRAIN_DETAIL, height: MAX_TERRAIN_DETAIL_HEIGHT }, manifest);
  assert.ok(extreme.project.terrain.heights.every(Number.isFinite));
  assert.equal(extreme.passed, extreme.changedVertices > 0 && extreme.analysis.passed);
});

void test('independent peak heights span the chosen range deterministically and reject inverted limits', () => {
  const project = source();
  const options = { ...DEFAULT_TERRAIN_DETAIL, minHeight: 50, height: 1000 };
  const result = generateTerrainDetail(project, options, manifest);
  assert.ok(result.peakHeights.every(height => height >= 50 && height <= 1000));
  assert.ok(Math.min(...result.peakHeights) < 200);
  assert.ok(Math.max(...result.peakHeights) > 650);
  assert.equal(new Set(result.peakHeights).size, result.placedPairs);
  assert.deepEqual(generateTerrainDetail(project, options, manifest).peakHeights, result.peakHeights);
  assert.notDeepEqual(generateTerrainDetail(project, { ...options, seed: 'new-height-seed' }, manifest).peakHeights, result.peakHeights);
  assert.throws(() => generateTerrainDetail(project, { ...options, minHeight: 1001 }, manifest), /minimum/);
  assert.throws(() => generateTerrainDetail(project, { ...options, minHeight: NaN }, manifest));
});

void test('rock detail is deterministic, paired, non-mutating and preserves all entity layouts', () => {
  const project = source();
  const before = structuredClone(project);
  const first = generateTerrainDetail(project, DEFAULT_TERRAIN_DETAIL, manifest);
  assert.deepEqual(project, before);
  assert.deepEqual(first, generateTerrainDetail(project, DEFAULT_TERRAIN_DETAIL, manifest));
  assert.ok(first.changedVertices > 0);
  assert.ok(first.paintedCells > 0);
  assert.equal(first.passed, true, JSON.stringify(first.analysis));
  assert.equal(rotationalTerrainMismatches(first.project.terrain), 0);
  assert.deepEqual(first.project.entities, project.entities);
  assert.deepEqual(first.project.baseLayouts.map(l => l.entities), project.baseLayouts.map(l => l.entities));
  assert.notDeepEqual(first.project.terrain.heights, generateTerrainDetail(project, { ...DEFAULT_TERRAIN_DETAIL, seed: 'different' }, manifest).project.terrain.heights);
  const terrain = project.terrain;
  for (let i = 0; i < terrain.heights.length; i++) {
    const x = i % terrain.width * terrain.worldWidth / (terrain.width - 1);
    const y = Math.floor(i / terrain.width) * terrain.worldHeight / (terrain.height - 1);
    const edge = i < terrain.width || i >= terrain.heights.length - terrain.width || i % terrain.width === 0 || i % terrain.width === terrain.width - 1;
    const base = first.result.baseAnchors.some(([bx, by]) => Math.hypot(x - bx, y - by) < 650);
    const center = Math.hypot(x - terrain.worldWidth / 2, y - terrain.worldHeight / 2) < 500;
    const route = routeBlend('three-route', x / 2800 - 1, y / 2800 - 1, 0.55, 1.35) < 0.35;
    if (edge || base || center || route) assert.equal(first.project.terrain.heights[i], terrain.heights[i]);
  }
});

void test('rock detail survives ZIP roundtrip with settings and texture symmetry', async () => {
  const result = generateTerrainDetail(source(), DEFAULT_TERRAIN_DETAIL, manifest);
  const archive = await createMapArchive(result.project);
  const entries = await readMapArchive(archive);
  const restored = JSON.parse(entries.find(entry => entry.name.endsWith('/wulfram-project.json')).text);
  assert.equal(JSON.stringify(restored.terrain), JSON.stringify(result.project.terrain)); // JSON normalizes negative zero.
  assert.equal(restored.metadata['terrainDetail.settings'], result.project.metadata['terrainDetail.settings']);
  assert.equal(rotationalTerrainMismatches(restored.terrain), 0);
  const files = Object.fromEntries(entries.filter(entry => !entry.name.endsWith('/wulfram-project.json')).map(entry => [entry.name.split('/').pop(), entry.text]));
  const nativeTerrain = parseLand(files.land);
  nativeTerrain.tagmap2 = files.tagmap2.trim().split(/\r?\n/);
  assert.equal(JSON.stringify(nativeTerrain.heights), JSON.stringify(result.project.terrain.heights));
  assert.deepEqual(nativeTerrain.textureIds, result.project.terrain.textureIds);
  assert.equal(rotationalTerrainMismatches(nativeTerrain), 0);
});

void test('rejects stacking, unknown assets, invalid numbers, dimensions and asymmetric terrain', () => {
  const project = source();
  assert.throws(() => generateTerrainDetail(project, { ...DEFAULT_TERRAIN_DETAIL, height: NaN }, manifest));
  assert.throws(() => generateTerrainDetail(project, { ...DEFAULT_TERRAIN_DETAIL, textureName: 'tree001' }, manifest));
  assert.throws(() => generateTerrainDetail(project, { ...DEFAULT_TERRAIN_DETAIL, seed: '' }, manifest));
  assert.throws(() => generateTerrainDetail(generateTerrainDetail(project, DEFAULT_TERRAIN_DETAIL, manifest).project, DEFAULT_TERRAIN_DETAIL, manifest), /do not stack/);
  const resized = structuredClone(project); resized.terrain.worldWidth += 1;
  assert.throws(() => generateTerrainDetail(resized, DEFAULT_TERRAIN_DETAIL, manifest), /dimensions/);
  project.terrain.heights[33] += 1;
  assert.throws(() => generateTerrainDetail(project, DEFAULT_TERRAIN_DETAIL, manifest), /rotationally/);
});

void test('texture symmetry uses packed cells, rotating blend corners and ignoring trailing slots', () => {
  const terrain = { width: 3, height: 3, worldWidth: 100, worldHeight: 100,
    heights: Array(9).fill(0), textureIds: [0, 2, 2, 1, 99, 98, 97, 96, 95],
    tagmap: [], tagmap2: ['+0template sandrock001 14 0template canyon003 1', '+0template sandrock001 7 0template canyon003 8', 'canyon003'] };
  assert.equal(rotationalTerrainMismatches(terrain), 0);
  terrain.textureIds[3] = 0;
  assert.ok(rotationalTerrainMismatches(terrain) > 0);
});

void test('several terrain seeds and all presets produce finite, paired candidates', () => {
  for (const topology of ['three-route', 'open-field', 'ring-center']) {
    for (const seed of ['trial-a', 'trial-b']) {
      const result = generateTerrainDetail(source(seed, topology), DEFAULT_TERRAIN_DETAIL, manifest);
      assert.equal(rotationalTerrainMismatches(result.project.terrain), 0);
      assert.ok(result.project.terrain.heights.every(Number.isFinite));
      assert.equal(result.passed, result.changedVertices > 0 && result.analysis.passed);
    }
  }
});
