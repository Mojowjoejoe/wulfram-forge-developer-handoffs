import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  BALANCED_DEFAULT_SIZE,
  BALANCED_DEFAULT_WORLD_SIZE,
  BALANCED_GENERATOR_VERSION,
  BALANCED_GENERATED_AT,
  BALANCED_STANDARD_RELIEF,
  balancedSeedHash,
  generateBalancedProject,
  generateBalancedTerrain,
  randomizeBalancedSettings,
  rotationalTerrainMismatches,
} from '../lib/balanced-map-generator.ts';
import {
  analyzeBalancedProject,
  analyzeBalancedTerrain,
  analyzeRotationalEntityPairs,
} from '../lib/balanced-map-analysis.ts';
import { createMapSourceFiles, parseMapSourceFiles } from '../lib/map-source.ts';
import { createBlankProject, parseLand, validateProject } from '../lib/wulfram.ts';
import { createMapArchive, readMapArchive } from '../lib/map-package.ts';
import { generateBalancedBase } from '../lib/balanced-base-generator.ts';
import { readTerrainGeneratorSettings, readBaseGeneratorSettings, preserveRegenerationContext } from '../lib/generator-settings.ts';
import { COMBAT_BASE_TEMPLATE } from '../lib/combat-base-template.ts';
import { buildBalancedCandidate, terrainOnlyCandidate } from '../lib/balanced-candidate.ts';
import { structureTerrainClearance, CATALOG } from '../lib/wulfram.ts';

const TEST_BASE_TEMPLATE = {
  id: 'balanced-test-base',
  name: 'Balanced test base',
  sourceMap: 'test',
  sourceState: 'state',
  sourceTeam: 1,
  sourceWorldSize: [5600, 5600],
  sourceAnchor: [0, 0],
  unitCount: 4,
  footprint: { width: 200, height: 200 },
  units: [
    { token: 'e', offset: [0, 0], groundOffset: 3, rotation: [0, 0, 0], active: 1 },
    { token: 'r', offset: [100, 0], groundOffset: 4, rotation: [0, 0, 0], active: 1 },
    { token: 'u', offset: [0, 100], groundOffset: 3, rotation: [0, 0, 0], active: 1 },
    { token: 'g', offset: [-100, 0], groundOffset: 16, rotation: [0, 0, 0], active: 1 },
  ],
};

void test('Balanced starter workflow uses placement rules and supports explicitly incomplete terrain-only projects', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/assets/manifest.json', import.meta.url), 'utf8'));
  const options = { seed: 'terrain-first', topology: 'open-field', relief: 180, size: 65, worldWidth: 4800, worldHeight: 4500 };
  const source = generateBalancedProject(options, TEST_BASE_TEMPLATE, manifest).project;
  source.baseLayouts.push({ ...structuredClone(source.baseLayouts[0]), id: 'retained' });
  const before = structuredClone(source);
  const huge = structuredClone(TEST_BASE_TEMPLATE); huge.units[0].offset = [10000, 10000];
  const failed = buildBalancedCandidate(options, huge, manifest, source);
  assert.equal(failed.analysis.passed, false);
  assert.equal(failed.analysis.terrain.passed, true);
  const terrain = terrainOnlyCandidate(failed.result);
  assert.ok(terrain.entities.every(entity => entity.team !== 1 && entity.team !== 2));
  assert.deepEqual(terrain.baseLayouts.find(layout => layout.id === 'retained'), source.baseLayouts[1]);
  assert.equal(terrain.metadata['generator.stage'], 'terrain-only-bases-required');
  assert.ok(validateProject(terrain).some(issue => issue.code === 'state-powered-repair'));
  assert.deepEqual(source, before);
  const complete = generateBalancedBase(terrain, TEST_BASE_TEMPLATE, { seed: 'finish-bases', footprint: 1000, spacing: 1, rotation: 0 }, manifest);
  assert.equal(complete.passed, true, complete.message);
  assert.equal(complete.project.metadata['generator.stage'], undefined);
  const good = buildBalancedCandidate(options, TEST_BASE_TEMPLATE, manifest);
  assert.equal(good.analysis.passed, true, good.baseMessage);
  assert.ok(good.result.project.baseLayouts[0].metadata['baseGenerator.analysis'].includes('paired-placement-v1'));
  const damaged = structuredClone(failed.result); damaged.project.terrain.heights[12] += 100;
  assert.throws(() => terrainOnlyCandidate(damaged), /Terrain checks/);
});

void test('placement rules repair overlapping templates and add actual powered repair pads', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/assets/manifest.json', import.meta.url), 'utf8'));
  const template = structuredClone(TEST_BASE_TEMPLATE);
  template.units = [template.units[0], { ...template.units[0] }, { ...template.units[0] },
    { ...template.units[1], token: 'f' }, { ...template.units[1], token: 'f' }]
    .map(unit => ({ ...structuredClone(unit), offset: [0, 0] }));
  template.unitCount = template.units.length;
  const original = generateBalancedProject({ seed: 'forge-001', topology: 'open-field' }, TEST_BASE_TEMPLATE, manifest).project;
  const before = structuredClone(original);
  const options = { seed: 'repair-overlaps', footprint: 1000, spacing: 1, rotation: 45 };
  const candidate = generateBalancedBase(original, template, options, manifest);
  assert.equal(candidate.passed, true, candidate.message);
  assert.equal(candidate.analysis.projectErrorCount, 0);
  assert.equal(candidate.analysis.entityPairing.mismatchCount, 0);
  assert.match(candidate.message, /deployed repair pad/);
  assert.deepEqual(original, before);
  assert.deepEqual(generateBalancedBase(original, template, options, manifest), candidate);
  for (const team of [1, 2]) {
    const units = candidate.project.entities.filter(entity => entity.team === team);
    const repair = units.find(entity => entity.token === 'r');
    assert.ok(repair);
    assert.ok(units.some(cell => cell.token === 'e' && Math.hypot(cell.position[0] - repair.position[0], cell.position[1] - repair.position[1]) <= original.validation.serviceRadius - 10));
    for (const entity of units) {
      const footprint = CATALOG.find(item => item.token === entity.token)?.footprint ?? 10;
      const radius = structureTerrainClearance(entity, manifest, footprint, 0).footprint / Math.SQRT2;
      for (const other of units.filter(other => other.id !== entity.id)) {
        const otherFootprint = CATALOG.find(item => item.token === other.token)?.footprint ?? 10;
        const otherRadius = structureTerrainClearance(other, manifest, otherFootprint, 0).footprint / Math.SQRT2;
        assert.ok(Math.hypot(entity.position[0] - other.position[0], entity.position[1] - other.position[1]) >= radius + otherRadius + original.validation.minSpacing);
      }
    }
  }
});

void test('placement preflight rejects invalid templates and impossible rules without mutating source', () => {
  const original = generateBalancedProject({ seed: 'forge-001', topology: 'open-field' }, TEST_BASE_TEMPLATE).project;
  const options = { seed: 'fail-closed', footprint: 1000, spacing: 1, rotation: 0 };
  const template = structuredClone(TEST_BASE_TEMPLATE); template.units[0].offset[0] = NaN;
  const before = structuredClone(original);
  const candidate = generateBalancedBase(original, template, options);
  assert.equal(candidate.passed, false);
  assert.match(candidate.message, /invalid coordinates/);
  assert.deepEqual(original, before);
  assert.deepEqual(candidate.project, before);
  original.validation.serviceRadius = NaN;
  const rejected = generateBalancedBase(original, TEST_BASE_TEMPLATE, options);
  assert.equal(rejected.passed, false);
  assert.match(rejected.message, /Invalid power/);
});

function flatTerrain(size = 33, worldSize = 3200) {
  return {
    width: size,
    height: size,
    worldWidth: worldSize,
    worldHeight: worldSize,
    heights: Array(size * size).fill(0),
    textureIds: Array(size * size).fill(0),
    tagmap: ['0:canyon003'],
    tagmap2: ['canyon003'],
  };
}

void test('saved design settings reload exactly without trusting stored analysis', () => {
  const options = { name: 'Settings reload', seed: 'saved-settings', topology: 'three-route', size: 65,
    worldWidth: 6000, worldHeight: 5600, relief: 420, baseHeight: 25,
    baseSeparation: 0.55, routeWidth: 1.35, centralAreaSize: 1.5, textureName: 'canyon003' };
  const project = generateBalancedProject(options, TEST_BASE_TEMPLATE).project;
  assert.deepEqual(readTerrainGeneratorSettings(parseMapSourceFiles(createMapSourceFiles(project))), { ...options, templateId: TEST_BASE_TEMPLATE.id });
  const withBase = generateBalancedBase(project, TEST_BASE_TEMPLATE, { seed: 'saved-base', footprint: 1000, spacing: 1, rotation: 45 }).project;
  assert.deepEqual(readBaseGeneratorSettings(parseMapSourceFiles(createMapSourceFiles(withBase))), {
    seed: 'saved-base', footprint: 1000, spacing: 1, rotation: 45, templateId: TEST_BASE_TEMPLATE.id,
  });
  assert.equal(readBaseGeneratorSettings(project), undefined);
  assert.equal(readTerrainGeneratorSettings(createBlankProject('Blank', 17)), undefined);
  project.metadata['generator.analysis'] = '{"passed":true}';
  project.metadata['generator.parameters'] = '[]';
  assert.throws(() => readTerrainGeneratorSettings(project), /object/);
  project.metadata['generator.parameters'] = '{';
  assert.throws(() => readTerrainGeneratorSettings(project), /JSON/);
  const legacy = generateBalancedProject(options, TEST_BASE_TEMPLATE).project;
  const parameters = JSON.parse(legacy.metadata['generator.parameters']);
  delete parameters.routeWidth; delete parameters.centralAreaSize; delete parameters.baseSeparation;
  legacy.metadata['generator.parameters'] = JSON.stringify(parameters);
  assert.equal(readTerrainGeneratorSettings(legacy).routeWidth, 1);
  parameters.size = 100000;
  legacy.metadata['generator.parameters'] = JSON.stringify(parameters);
  assert.throws(() => readTerrainGeneratorSettings(legacy), /terrain size/i);
});

void test('model-aware pairing accounts for team origins but rejects real height displacement', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/assets/manifest.json', import.meta.url), 'utf8'));
  const template = { ...TEST_BASE_TEMPLATE, units: [{ token: 's', offset: [0, 0], groundOffset: 0, rotation: [0, 0, 0], active: 1 }], unitCount: 1 };
  const { project } = generateBalancedProject({ seed: 'model-origin', topology: 'open-field' }, template, manifest);
  assert.equal(analyzeRotationalEntityPairs(project).passed, false, 'Raw team origins differ beyond tolerance');
  assert.equal(analyzeRotationalEntityPairs(project, manifest).passed, true);
  project.entities.find(entity => entity.team === 2 && entity.token === 's').position[2] += 2;
  assert.equal(analyzeRotationalEntityPairs(project, manifest).passed, false, 'Actual displacement still fails the unchanged tolerance');
});

void test('deployed combat bases keep a conservative 80-unit-wide forward exit on both teams', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/assets/manifest.json', import.meta.url), 'utf8'));
  const generated = generateBalancedProject({ seed: 'forge-combat-trial-v1', topology: 'three-route',
    relief: 420, baseSeparation: 0.55, routeWidth: 1.35, centralAreaSize: 1.5 }, COMBAT_BASE_TEMPLATE, manifest);
  assert.equal(generated.project.entities.length, 22);
  assert.equal(analyzeBalancedProject(generated.project, generated.baseAnchors, generated.objectiveAnchors, {}, manifest).passed, true);
  for (const entity of generated.project.entities) {
    const anchor = generated.baseAnchors[entity.team - 1];
    const direction = entity.team === 1 ? 1 : -1;
    const x = (entity.position[0] - anchor[0]) * direction;
    const y = (entity.position[1] - anchor[1]) * direction;
    const forward = (x + y) / Math.SQRT2;
    const side = (x - y) / Math.SQRT2;
    const closestForward = Math.max(0, Math.min(500, forward));
    const distance = Math.hypot(side, forward - closestForward);
    const footprint = CATALOG.find(item => item.token === entity.token)?.footprint ?? 10;
    const radius = structureTerrainClearance(entity, manifest, footprint, 0).footprint / Math.SQRT2;
    assert.ok(distance >= radius + 40, `${entity.team}:${entity.token} obstructs the forward exit`);
  }
});

void test('terrain regeneration preserves inactive layouts, neutral entities, and user metadata', () => {
  const source = generateBalancedProject({ seed: 'before', topology: 'open-field' }, TEST_BASE_TEMPLATE).project;
  source.baseLayouts.push({ ...structuredClone(source.baseLayouts[0]), id: 'other', name: 'Keep me' });
  source.metadata.author = 'Map author';
  source.baseLayouts[0].metadata.notes = 'Keep notes';
  source.baseLayouts[0].metadata['baseGenerator.analysis'] = 'stale';
  source.entities.push({ ...structuredClone(source.entities[0]), id: 'neutral-marker', team: 0 });
  const before = structuredClone(source);
  const generated = generateBalancedProject({ seed: 'after', topology: 'three-route' }, TEST_BASE_TEMPLATE).project;
  const next = preserveRegenerationContext(source, generated);
  assert.deepEqual(source, before);
  assert.deepEqual(next.baseLayouts[1], before.baseLayouts[1]);
  assert.deepEqual(next.entities.find(entity => entity.team === 0), before.entities.find(entity => entity.team === 0));
  assert.deepEqual(next.terrain, generated.terrain);
  assert.equal(next.metadata.author, 'Map author');
  assert.equal(next.metadata['generator.seed'], 'after');
  assert.equal(next.baseLayouts[0].metadata.notes, 'Keep notes');
  assert.equal(next.baseLayouts[0].metadata['baseGenerator.analysis'], undefined);
  assert.deepEqual(next.baseLayouts[0].entities, next.entities);
});

void test('seed hashing is normalized, UTF-8 stable, and sensitive to content', () => {
  assert.equal(balancedSeedHash(' Canyon '), balancedSeedHash('Canyon'));
  assert.equal(balancedSeedHash('Cafe\u0301'), balancedSeedHash('Café'));
  assert.notEqual(balancedSeedHash('Canyon A'), balancedSeedHash('Canyon B'));
});

void test('terrain-aware base regeneration is deterministic and preserves terrain and inactive layouts', () => {
  const original = generateBalancedProject({ seed: 'forge-001', topology: 'open-field' }, TEST_BASE_TEMPLATE).project;
  original.baseLayouts.push({ ...structuredClone(original.baseLayouts[0]), id: 'untouched', name: 'Other layout' });
  const before = structuredClone(original);
  const options = { seed: 'base-test-001', footprint: 1000, spacing: 1, rotation: 45 };
  const candidate = generateBalancedBase(original, TEST_BASE_TEMPLATE, options);
  assert.deepEqual(original, before);
  assert.deepEqual(candidate.project.terrain, before.terrain);
  assert.deepEqual(candidate.project.metadata, before.metadata);
  assert.deepEqual(candidate.project.baseLayouts[1], before.baseLayouts[1]);
  assert.deepEqual(generateBalancedBase(original, TEST_BASE_TEMPLATE, options), candidate);
  assert.equal(candidate.passed, true, JSON.stringify(candidate.analysis.projectIssues));
  assert.notDeepEqual(generateBalancedBase(original, TEST_BASE_TEMPLATE, { ...options, seed: 'another-seed' }).project.entities, candidate.project.entities);
  const restored = parseMapSourceFiles(createMapSourceFiles(candidate.project));
  assert.ok(restored.baseLayouts[0].metadata['baseGenerator.identity']);
  assert.deepEqual(restored.terrain, candidate.project.terrain);
  const huge = structuredClone(TEST_BASE_TEMPLATE);
  huge.units[1].offset = [10000, 10000];
  assert.equal(generateBalancedBase(original, huge, options).passed, false);
  assert.equal(generateBalancedBase(original, TEST_BASE_TEMPLATE, { ...options, footprint: 100 }).passed, false);
  assert.throws(() => generateBalancedBase(original, TEST_BASE_TEMPLATE, { ...options, spacing: NaN }));
  const asymmetric = structuredClone(original);
  asymmetric.terrain.heights[100] += 1;
  assert.throws(() => generateBalancedBase(asymmetric, TEST_BASE_TEMPLATE, options), /symmetric/);
});

void test('terrain-aware bases validate real templates across seeds, routes, and rotations', () => {
  const { templates } = JSON.parse(readFileSync(new URL('../public/assets/base-templates.json', import.meta.url), 'utf8'));
  const manifest = JSON.parse(readFileSync(new URL('../public/assets/manifest.json', import.meta.url), 'utf8'));
  const selected = ['curated-base-in-a-box', 'aztech-team-1-base-1', 'crossroads-team-1-base-1'].map((id) => templates.find((template) => template.id === id));
  let passing = 0;
  for (const seed of ['forge-001', 'forge-002', 'forge-003']) {
    for (const topology of ['open-field', 'three-route']) {
      const original = generateBalancedProject({ seed, topology }, selected[0], manifest).project;
      const before = structuredClone(original);
      for (const template of selected) {
        for (const rotation of [0, 45, 90]) {
          const options = { seed: 'base-matrix', footprint: 1000, spacing: 1, rotation };
          const candidate = generateBalancedBase(original, template, options, manifest);
          assert.deepEqual(original, before);
          assert.deepEqual(candidate.project.terrain, original.terrain);
          assert.equal(candidate.passed, candidate.fit && candidate.analysis.passed);
          const restored = parseMapSourceFiles(createMapSourceFiles(candidate.project));
          assert.deepEqual(restored.terrain, original.terrain);
          assert.equal(restored.baseLayouts[0].metadata['baseGenerator.analysis'], candidate.project.baseLayouts[0].metadata['baseGenerator.analysis']);
          if (candidate.passed) passing++;
          if (template.id === 'curated-base-in-a-box' && topology === 'open-field') assert.equal(candidate.passed, true);
          // Crossroads formerly always failed because paired art used equal raw
          // origin offsets. Successful repairs must satisfy independent checks,
          // not preserve that historical failure as an expected outcome.
          if (candidate.passed) {
            assert.equal(validateProject(candidate.project).filter(issue => issue.severity === 'error').length, 0);
            assert.equal(analyzeRotationalEntityPairs(candidate.project, manifest).passed, true);
          }
        }
      }
    }
  }
  assert.equal(passing, 54, 'All existing-template cases now fit; impossible-template rejection is tested separately');
});

void test('randomized settings are reproducible, bounded, diverse, and use available assets', () => {
  const samples = Array.from({ length: 100 }, (_, index) => randomizeBalancedSettings(`random-settings-${index}`, ['base-a', 'base-b'], ['canyon003', 'grass']));
  for (const settings of samples) {
    assert.deepEqual(randomizeBalancedSettings(settings.seed, ['base-a', 'base-b'], ['canyon003', 'grass']), settings);
    assert.ok(['base-a', 'base-b'].includes(settings.templateId));
    assert.ok(['canyon003', 'grass'].includes(settings.textureName));
    assert.ok(settings.baseSeparation >= 0.3 && settings.baseSeparation <= 0.65);
    assert.ok(settings.routeWidth >= 0.5 && settings.routeWidth <= 1.75);
    assert.ok(settings.centralAreaSize >= 0.5 && settings.centralAreaSize <= 2.5);
    assert.ok([33, 65, 129, 257].includes(settings.size));
    assert.ok(settings.relief >= 100 && settings.relief <= 1200);
    for (const axis of [settings.worldWidth, settings.worldHeight]) assert.ok(axis >= 3200 && axis <= 8000 && axis % 100 === 0);
  }
  for (const key of Object.keys(samples[0])) assert.ok(new Set(samples.map((settings) => settings[key])).size > 1, `${key} varies`);
  for (const settings of samples.slice(0, 3)) assert.equal(rotationalTerrainMismatches(generateBalancedTerrain(settings).terrain), 0);
  assert.throws(() => randomizeBalancedSettings('seed', [], ['grass']));
  assert.throws(() => randomizeBalancedSettings('seed', ['base'], []));
});

void test('adjustable layouts preserve seed, exact pairing, and reproducible geometry', () => {
  for (const topology of ['open-field', 'three-route', 'ring-center']) {
    const options = { seed: 'adjust-layout', topology, size: 65, worldWidth: 6000, worldHeight: 5600 };
    const baseline = generateBalancedTerrain(options);
    assert.deepEqual(generateBalancedTerrain({ ...options, baseSeparation: 0.46, routeWidth: 1, centralAreaSize: 1 }), baseline);
    for (const adjustment of [{ baseSeparation: 0.3 }, { baseSeparation: 0.65 }, { routeWidth: 0.5 }, { routeWidth: 1.75 }, { centralAreaSize: 0.5 }, { centralAreaSize: 2.5 }]) {
      const changed = generateBalancedTerrain({ ...options, ...adjustment });
      assert.deepEqual(generateBalancedTerrain({ ...options, ...adjustment }), changed);
      assert.equal(changed.identity.seed, baseline.identity.seed);
      assert.equal(rotationalTerrainMismatches(changed.terrain), 0);
      assert.notDeepEqual(changed.terrain.heights, baseline.terrain.heights);
      assert.ok(Math.abs(Math.hypot(changed.baseAnchors[1][0] - changed.baseAnchors[0][0], changed.baseAnchors[1][1] - changed.baseAnchors[0][1]) / Math.hypot(6000, 5600) - changed.identity.baseSeparation) < 1e-12);
      assert.deepEqual(analyzeBalancedTerrain(changed.terrain, changed.baseAnchors, changed.objectiveAnchors).profile,
        analyzeBalancedTerrain(baseline.terrain, baseline.baseAnchors, baseline.objectiveAnchors).profile);
    }
  }
});

void test('layout settings reject invalid ranges and survive project source reload', () => {
  const options = { seed: 'layout-provenance', topology: 'three-route', baseSeparation: 0.55, routeWidth: 1.25, centralAreaSize: 1.5 };
  const generated = generateBalancedProject(options, TEST_BASE_TEMPLATE);
  const restored = parseMapSourceFiles(createMapSourceFiles(generated.project));
  const parameters = JSON.parse(restored.metadata['generator.parameters']);
  for (const key of ['baseSeparation', 'routeWidth', 'centralAreaSize']) {
    assert.equal(parameters[key], options[key]);
    assert.equal(generated.identity[key], options[key]);
    for (const value of [NaN, Infinity, -1, 99]) {
      assert.throws(() => generateBalancedTerrain({ ...options, [key]: value }));
    }
  }
});

void test('default generation uses the calibrated canonical dimensions and relief', () => {
  const result = generateBalancedTerrain({ seed: 'defaults', topology: 'open-field' });
  assert.equal(result.identity.generatorVersion, BALANCED_GENERATOR_VERSION);
  assert.equal(result.terrain.width, BALANCED_DEFAULT_SIZE);
  assert.equal(result.terrain.height, BALANCED_DEFAULT_SIZE);
  assert.equal(result.terrain.worldWidth, BALANCED_DEFAULT_WORLD_SIZE);
  assert.equal(result.terrain.worldHeight, BALANCED_DEFAULT_WORLD_SIZE);
  assert.equal(result.identity.relief, BALANCED_STANDARD_RELIEF);
  assert.equal(result.identity.textureName, 'canyon003');
  assert.deepEqual(result.terrain.tagmap, ['0:canyon003']);
  assert.deepEqual(result.terrain.tagmap2, ['canyon003']);
  assert.deepEqual(result.baseAnchors, [[1512, 1512], [4088, 4088]]);
  assert.deepEqual(result.objectiveAnchors, [[2800, 2800]]);
});

void test('strict terrain is exactly rotationally paired with a zero-height edge', () => {
  for (const topology of ['open-field', 'three-route', 'ring-center']) {
    const { terrain } = generateBalancedTerrain({ seed: `symmetry-${topology}`, topology, size: 33 });
    assert.equal(rotationalTerrainMismatches(terrain), 0);
    for (let index = 0; index < terrain.width; index += 1) {
      assert.equal(terrain.heights[index], 0);
      assert.equal(terrain.heights[(terrain.height - 1) * terrain.width + index], 0);
    }
    for (let y = 0; y < terrain.height; y += 1) {
      assert.equal(terrain.heights[y * terrain.width], 0);
      assert.equal(terrain.heights[y * terrain.width + terrain.width - 1], 0);
    }
  }
});

void test('same complete identity is deterministic while seeds and topologies differ', () => {
  const options = { seed: 'repeatable', topology: 'three-route', size: 33, relief: 400 };
  const first = generateBalancedTerrain(options);
  const second = generateBalancedTerrain(options);
  assert.deepEqual(first, second);
  assert.notDeepEqual(
    first.terrain.heights,
    generateBalancedTerrain({ ...options, seed: 'different' }).terrain.heights,
  );
  assert.notDeepEqual(
    first.terrain.heights,
    generateBalancedTerrain({ ...options, topology: 'ring-center' }).terrain.heights,
  );
  assert.notDeepEqual(
    first.terrain.tagmap2,
    generateBalancedTerrain({ ...options, textureName: '1snow001' }).terrain.tagmap2,
  );
});

void test('reserved base cores are flat and rotationally paired', () => {
  const result = generateBalancedTerrain({
    seed: 'flat-bases',
    topology: 'ring-center',
    size: 129,
    baseHeight: 37,
  });
  const { terrain } = result;
  const stepX = terrain.worldWidth / (terrain.width - 1);
  const stepY = terrain.worldHeight / (terrain.height - 1);
  for (const [anchorX, anchorY] of result.baseAnchors) {
    const gridX = Math.round(anchorX / stepX);
    const gridY = Math.round(anchorY / stepY);
    const values = [];
    for (let y = gridY - 2; y <= gridY + 2; y += 1) {
      for (let x = gridX - 2; x <= gridX + 2; x += 1) values.push(terrain.heights[y * terrain.width + x]);
    }
    assert.ok(values.every((height) => height === 37));
  }
});

void test('generated terrain round-trips through canonical source without change', () => {
  const generated = generateBalancedTerrain({ seed: 'source-roundtrip', topology: 'open-field', size: 33 });
  const project = createBlankProject('Balanced fixture', 33);
  project.terrain = generated.terrain;
  const reopened = parseMapSourceFiles(createMapSourceFiles(project));
  assert.deepEqual(reopened.terrain, project.terrain);
  assert.equal(rotationalTerrainMismatches(reopened.terrain), 0);
});

void test('invalid generation inputs fail closed', () => {
  assert.throws(
    () => generateBalancedTerrain({ seed: ' ', topology: 'open-field' }),
    /Seed cannot be empty/,
  );
  assert.throws(
    () => generateBalancedTerrain({ seed: 'even', topology: 'open-field', size: 32 }),
    /odd integer/,
  );
  assert.throws(
    () => generateBalancedTerrain({ seed: 'too-small', topology: 'open-field', size: 15 }),
    /odd integer/,
  );
  assert.throws(
    () => generateBalancedTerrain({ seed: 'too-large', topology: 'open-field', size: 515 }),
    /odd integer/,
  );
  assert.throws(
    () => generateBalancedTerrain({ seed: 'bad-world', topology: 'open-field', worldWidth: 0 }),
    /World dimensions must be positive/,
  );
  assert.throws(
    () => generateBalancedTerrain({ seed: 'bad-world', topology: 'open-field', worldHeight: Number.POSITIVE_INFINITY }),
    /World height must be a finite number/,
  );
  assert.throws(
    () => generateBalancedTerrain({ seed: 'bad-relief', topology: 'open-field', relief: Number.NaN }),
    /Relief must be a finite number/,
  );
  assert.throws(
    () => generateBalancedTerrain({ seed: 'bad-relief', topology: 'open-field', relief: 5001 }),
    /at most 5000/,
  );
  assert.throws(
    () => generateBalancedTerrain({ seed: 'bad-topology', topology: 'maze' }),
    /Unknown balanced-map topology/,
  );
  assert.throws(
    () => generateBalancedTerrain({ seed: 'bad-texture', topology: 'open-field', textureName: 'bad texture' }),
    /Texture name must be one non-empty archive token/,
  );
  assert.throws(
    () => generateBalancedTerrain({ seed: 'x'.repeat(201), topology: 'open-field' }),
    /at most 200 characters/,
  );
});

void test('repeated generation returns independent state with no cross-candidate leakage', () => {
  const options = { seed: 'no-state-leak', topology: 'open-field', size: 33 };
  const first = generateBalancedProject(options, TEST_BASE_TEMPLATE);
  const expectedFirstHeight = first.project.terrain.heights[100];
  const expectedFirstEntityX = first.project.entities[0].position[0];
  first.project.terrain.heights[100] += 999;
  first.project.entities[0].position[0] += 999;
  first.project.baseLayouts[0].entities[0].position[0] += 999;

  const second = generateBalancedProject(options, TEST_BASE_TEMPLATE);
  assert.equal(second.project.terrain.heights[100], expectedFirstHeight);
  assert.equal(second.project.entities[0].position[0], expectedFirstEntityX);
  assert.equal(second.project.baseLayouts[0].entities[0].position[0], expectedFirstEntityX);
});

void test('generated topology presets pass the first-release terrain balance gates', () => {
  for (const topology of ['open-field', 'three-route', 'ring-center']) {
    const generated = generateBalancedTerrain({ seed: `analyze-${topology}`, topology });
    const report = analyzeBalancedTerrain(
      generated.terrain,
      generated.baseAnchors,
      generated.objectiveAnchors,
    );
    assert.equal(
      report.passed,
      true,
      `${topology}: ${report.gates.filter((gate) => !gate.passed).map((gate) => gate.message).join(' | ')}`,
    );
    assert.equal(report.metrics.rotationalMismatches, 0);
    assert.ok(report.metrics.traversableFraction >= 0.58);
    assert.ok(report.metrics.pairedObjectiveCostDeltaRatio <= 1e-9);
    assert.ok(report.metrics.teams.every((team) => team.routeCount >= 2));
    assert.ok(
      Math.abs(
        report.metrics.teams[0].reachableFractionOfTraversable
        - report.metrics.teams[1].reachableFractionOfTraversable,
      ) <= 1e-12,
    );
    assert.ok(
      Math.abs(
        report.metrics.teams[0].reachableHighGroundFraction
        - report.metrics.teams[1].reachableHighGroundFraction,
      ) <= 1e-12,
    );
  }
});

void test('each calibrated seed family retains at least one passing topology', () => {
  for (let index = 0; index < 16; index += 1) {
    const reports = ['open-field', 'three-route', 'ring-center'].map((topology) => {
      const generated = generateBalancedTerrain({ seed: `sweep-${index}`, topology });
      return {
        topology,
        report: analyzeBalancedTerrain(
          generated.terrain,
          generated.baseAnchors,
          generated.objectiveAnchors,
        ),
      };
    });
    assert.ok(
      reports.some(({ report }) => report.passed),
      `sweep-${index}: ${reports.map(({ topology, report }) => (
        `${topology}=${report.gates.filter((gate) => !gate.passed).map((gate) => gate.code).join(',')}`
      )).join(' | ')}`,
    );
  }
});

void test('analysis fails malformed and excessive terrain shapes without allocating their claimed size', () => {
  const excessive = {
    ...flatTerrain(),
    width: 1_000_000,
    height: 1_000_000,
    heights: [],
    textureIds: [],
  };
  const report = analyzeBalancedTerrain(excessive, [[800, 800], [2400, 2400]], [[1600, 1600]]);
  assert.equal(report.passed, false);
  assert.equal(report.metrics.terrainVertices, 0);
  assert.equal(report.gates.find((gate) => gate.code === 'terrain-shape')?.passed, false);

  const nonFinite = flatTerrain();
  nonFinite.heights[100] = Number.NaN;
  const nonFiniteReport = analyzeBalancedTerrain(
    nonFinite,
    [[800, 800], [2400, 2400]],
    [[1600, 1600]],
  );
  assert.equal(nonFiniteReport.passed, false);
  assert.equal(nonFiniteReport.gates.find((gate) => gate.code === 'terrain-shape')?.passed, false);
});

void test('analysis safely accepts the supported maximum terrain size', () => {
  const generated = generateBalancedTerrain({
    seed: 'maximum-supported-size',
    topology: 'open-field',
    size: 513,
  });
  assert.equal(generated.terrain.heights.length, 513 * 513);
  assert.equal(rotationalTerrainMismatches(generated.terrain), 0);

  const terrain = flatTerrain(513, 5600);
  const report = analyzeBalancedTerrain(
    terrain,
    [[1400, 1400], [4200, 4200]],
    [[2800, 2800]],
  );
  assert.equal(report.gates.find((gate) => gate.code === 'terrain-shape')?.passed, true);
  assert.equal(report.metrics.terrainVertices, 513 * 513);
  assert.equal(report.passed, true);
});

void test('analysis rejects remote, unpaired base and objective anchors', () => {
  const terrain = flatTerrain();
  const unpairedBases = analyzeBalancedTerrain(
    terrain,
    [[800, 800], [800, 800]],
    [[1600, 1600]],
  );
  assert.equal(unpairedBases.gates.find((gate) => gate.code === 'base-anchors')?.passed, false);
  const duplicateCenterBases = analyzeBalancedTerrain(
    terrain,
    [[1600, 1600], [1600, 1600]],
    [[1600, 1600]],
  );
  assert.equal(duplicateCenterBases.gates.find((gate) => gate.code === 'base-anchors')?.passed, false);

  const unpairedObjective = analyzeBalancedTerrain(
    terrain,
    [[800, 800], [2400, 2400]],
    [[1200, 1600]],
  );
  assert.equal(unpairedObjective.gates.find((gate) => gate.code === 'objectives')?.passed, false);

  const outOfBounds = analyzeBalancedTerrain(
    terrain,
    [[-100, 800], [3300, 2400]],
    [[1600, 1600]],
  );
  assert.equal(outOfBounds.gates.find((gate) => gate.code === 'base-anchors')?.passed, false);
});

void test('clearance reports its sampled physical radius by grid resolution and world axis', () => {
  for (const size of [17, 129, 513]) {
    const terrain = { ...flatTerrain(size, 5600), worldHeight: 3200 };
    const report = analyzeBalancedTerrain(terrain, [[1400, 800], [4200, 2400]], [[2800, 1600]]);
    assert.deepEqual(report.metrics.sampledClearanceRadiusWorld, [5600 / (size - 1), 3200 / (size - 1)]);
    assert.match(report.gates.find((gate) => gate.code === 'route-count').message, /not verified vehicle clearance/);
  }
  const invalid = { ...flatTerrain(), worldWidth: 0 };
  const report = analyzeBalancedTerrain(invalid, [[800, 800], [2400, 2400]], [[1600, 1600]]);
  assert.equal(report.metrics.sampledClearanceRadiusWorld, null);
});

void test('analysis rejects a rotationally symmetric one-lane choke after clearance', () => {
  const terrain = flatTerrain();
  const center = Math.floor(terrain.width / 2);
  for (let y = 0; y < terrain.height; y += 1) {
    for (let x = center - 1; x <= center + 1; x += 1) {
      if (y < center - 2 || y > center + 2) terrain.heights[y * terrain.width + x] = 2000;
    }
  }
  const report = analyzeBalancedTerrain(
    terrain,
    [[800, 1600], [2400, 1600]],
    [[1600, 1600]],
  );
  assert.equal(report.gates.find((gate) => gate.code === 'rotational-symmetry')?.passed, true);
  assert.equal(report.gates.find((gate) => gate.code === 'route-count')?.passed, false);
  assert.deepEqual(report.metrics.teams.map((team) => team.routeCount), [1, 1]);
});

void test('analysis rejects rotationally paired but isolated high-ground islands', () => {
  const terrain = flatTerrain();
  for (const [centerX, centerY] of [[8, 24], [24, 8]]) {
    for (let y = centerY - 4; y <= centerY + 4; y += 1) {
      for (let x = centerX - 4; x <= centerX + 4; x += 1) {
        terrain.heights[y * terrain.width + x] = 1000;
      }
    }
  }
  const report = analyzeBalancedTerrain(
    terrain,
    [[800, 800], [2400, 2400]],
    [[1600, 1600]],
  );
  assert.equal(report.gates.find((gate) => gate.code === 'rotational-symmetry')?.passed, true);
  assert.equal(report.gates.find((gate) => gate.code === 'high-ground-access')?.passed, false);
  assert.deepEqual(report.metrics.teams.map((team) => team.reachableHighGroundFraction), [0, 0]);
});

void test('analysis rejects a substantial disconnected playable region', () => {
  const terrain = flatTerrain();
  for (const [centerX, centerY] of [[8, 24], [24, 8]]) {
    for (let y = centerY - 7; y <= centerY + 7; y += 1) {
      for (let x = centerX - 7; x <= centerX + 7; x += 1) {
        terrain.heights[y * terrain.width + x] = 1000;
      }
    }
  }
  const report = analyzeBalancedTerrain(
    terrain,
    [[800, 800], [2400, 2400]],
    [[1600, 1600]],
  );
  assert.equal(report.gates.find((gate) => gate.code === 'connected-playable-area')?.passed, false);
  assert.ok(report.metrics.teams.every((team) => team.reachableFractionOfTraversable < 0.7));
});

void test('analysis rejects a symmetric but disconnected objective', () => {
  const generated = generateBalancedTerrain({ seed: 'blocked-center', topology: 'open-field', size: 33 });
  const terrain = structuredClone(generated.terrain);
  const center = Math.floor(terrain.width / 2);
  for (let y = center - 1; y <= center + 1; y += 1) {
    for (let x = 0; x < terrain.width; x += 1) {
      terrain.heights[y * terrain.width + x] = 2000;
    }
  }
  const report = analyzeBalancedTerrain(terrain, generated.baseAnchors, generated.objectiveAnchors);
  assert.equal(report.passed, false);
  assert.equal(report.gates.find((gate) => gate.code === 'objectives')?.passed, false);
});

void test('analysis rejects one changed rotational terrain vertex', () => {
  const generated = generateBalancedTerrain({ seed: 'broken-pair', topology: 'open-field', size: 33 });
  const terrain = structuredClone(generated.terrain);
  terrain.heights[100] += 1;
  const report = analyzeBalancedTerrain(terrain, generated.baseAnchors, generated.objectiveAnchors);
  assert.equal(report.passed, false);
  assert.equal(report.gates.find((gate) => gate.code === 'rotational-symmetry')?.passed, false);
});

void test('reachable objectives cannot hide another isolated required objective', () => {
  const terrain = flatTerrain();
  const anchors = [[800, 800], [2400, 2400]];
  const objectives = [[800, 1600], [1600, 1600], [2400, 1600]];
  const baseline = analyzeBalancedTerrain(terrain, anchors, objectives);
  assert.equal(baseline.gates.find((gate) => gate.code === 'objectives').passed, true);
  assert.deepEqual(baseline.metrics.teams.map((team) => team.reachableObjectiveCount), [3, 3]);
  for (let y = 12; y <= 20; y += 1) {
    for (let x = 12; x <= 20; x += 1) terrain.heights[y * terrain.width + x] = 1000;
  }
  const report = analyzeBalancedTerrain(terrain, anchors, objectives);
  assert.equal(report.gates.find((gate) => gate.code === 'rotational-symmetry').passed, true);
  assert.ok(report.metrics.teams.every((team) => team.objectiveCost !== null));
  assert.equal(report.gates.find((gate) => gate.code === 'objectives').passed, false);
  assert.deepEqual(report.metrics.teams.map((team) => team.reachableObjectiveCount), [2, 2]);
  assert.deepEqual(report.metrics.teams.map((team) => team.objectiveCosts[1]), [null, null]);
  assert.equal(report.metrics.maximumPairedRegionCostDeltaRatio, null);
  assert.equal(report.gates.find((gate) => gate.code === 'paired-region-cost').passed, false);
});

void test('region timing compares rotational counterparts, not just nearest objectives', () => {
  const terrain = flatTerrain();
  const anchors = [[800, 800], [2400, 2400]];
  const objectives = [[800, 1600], [1600, 1600], [2400, 1600]];
  const baseline = analyzeBalancedTerrain(terrain, anchors, objectives);
  const [left, right] = baseline.metrics.teams.map((team) => team.objectiveCosts);
  assert.equal(left.length, 3);
  assert.ok(left.every((cost) => cost !== null));
  assert.ok(left[0] < right[0], 'side objectives need not be equidistant from both teams');
  for (let index = 0; index < 3; index += 1) {
    assert.ok(Math.abs(left[index] - right[2 - index]) < 1e-6);
  }
  assert.equal(baseline.gates.find((gate) => gate.code === 'paired-region-cost').passed, true);
  for (let y = 12; y <= 20; y += 1) {
    for (let x = 11; x <= 13; x += 1) terrain.heights[y * terrain.width + x] = 1000;
  }
  const report = analyzeBalancedTerrain(terrain, anchors, objectives);
  assert.equal(report.gates.find((gate) => gate.code === 'objectives').passed, true);
  assert.equal(report.gates.find((gate) => gate.code === 'paired-objective-cost').passed, true);
  assert.equal(report.gates.find((gate) => gate.code === 'paired-region-cost').passed, false);
  assert.ok(report.metrics.maximumPairedRegionCostDeltaRatio > report.profile.pairedCostTolerance);
});

void test('analysis is read-only and rejects invalid profiles', () => {
  const generated = generateBalancedTerrain({ seed: 'read-only', topology: 'open-field', size: 33 });
  const before = structuredClone(generated.terrain);
  analyzeBalancedTerrain(generated.terrain, generated.baseAnchors, generated.objectiveAnchors);
  assert.deepEqual(generated.terrain, before);
  assert.throws(
    () => analyzeBalancedTerrain(
      generated.terrain,
      generated.baseAnchors,
      generated.objectiveAnchors,
      { minimumTraversableFraction: 0.8, targetTraversableFraction: 0.7 },
    ),
    /Target traversable fraction cannot be lower/,
  );
  assert.throws(
    () => analyzeBalancedTerrain(
      generated.terrain,
      generated.baseAnchors,
      generated.objectiveAnchors,
      { minimumRouteClearanceVertices: -1 },
    ),
    /clearance/,
  );
  assert.throws(
    () => analyzeBalancedTerrain(
      generated.terrain,
      generated.baseAnchors,
      generated.objectiveAnchors,
      { minimumReachableFraction: 1.1 },
    ),
    /Reachable fractions/,
  );
});

void test('complete project generation places a deterministic valid paired base', () => {
  const options = {
    seed: 'paired-project',
    topology: 'open-field',
    name: 'Paired Project',
  };
  const first = generateBalancedProject(options, TEST_BASE_TEMPLATE);
  const second = generateBalancedProject(options, TEST_BASE_TEMPLATE);
  assert.equal(first.project.updatedAt, BALANCED_GENERATED_AT);
  assert.equal(second.project.updatedAt, BALANCED_GENERATED_AT);
  assert.deepEqual(createMapSourceFiles(first.project), createMapSourceFiles(second.project));
  assert.deepEqual(validateProject(first.project), []);
  assert.equal(
    analyzeBalancedProject(first.project, first.baseAnchors, first.objectiveAnchors).passed,
    true,
  );
  assert.equal(first.project.entities.length, 8);
  for (let index = 0; index < 4; index += 1) {
    const team1 = first.project.entities[index];
    const team2 = first.project.entities[index + 4];
    assert.equal(team1.token, team2.token);
    assert.equal(team1.subtype, team2.subtype);
    assert.equal(team1.team, 1);
    assert.equal(team2.team, 2);
    assert.ok(Math.abs(team2.position[0] - (first.terrain.worldWidth - team1.position[0])) <= 1e-9);
    assert.ok(Math.abs(team2.position[1] - (first.terrain.worldHeight - team1.position[1])) <= 1e-9);
  }
  const metadata = first.project.baseLayouts[0].metadata;
  assert.deepEqual(first.project.metadata, metadata);
  assert.equal(metadata['generator.version'], BALANCED_GENERATOR_VERSION);
  assert.equal(metadata['generator.seed'], options.seed);
  assert.equal(metadata['generator.topology'], options.topology);
  const sourceFiles = createMapSourceFiles(first.project);
  assert.deepEqual(JSON.parse(sourceFiles['map.json']).metadata, metadata);
  assert.deepEqual(parseMapSourceFiles(sourceFiles).metadata, metadata);
});

void test('generation preserves explicit timestamps and rejects invalid timestamps', () => {
  const updatedAt = '2026-09-05T12:34:56.000Z';
  const generated = generateBalancedProject({ seed: 'explicit-time', topology: 'open-field', updatedAt }, TEST_BASE_TEMPLATE);
  assert.equal(generated.project.updatedAt, updatedAt);
  assert.equal(generated.project.baseLayouts[0].updatedAt, updatedAt);
  assert.throws(() => generateBalancedProject({ seed: 'bad-time', topology: 'open-field', updatedAt: 'invalid' }, TEST_BASE_TEMPLATE), /ISO-compatible/);
});

void test('map-level generator metadata is optional, string-only, and backward compatible', () => {
  const blank = createBlankProject('Legacy source', 17);
  const files = createMapSourceFiles(blank);
  assert.equal(JSON.parse(files['map.json']).metadata, undefined);
  assert.equal(parseMapSourceFiles(files).metadata, undefined);

  const invalidManifest = JSON.parse(files['map.json']);
  invalidManifest.metadata = { 'generator.seed': 42 };
  assert.throws(
    () => parseMapSourceFiles({
      ...files,
      'map.json': `${JSON.stringify(invalidManifest)}\n`,
    }),
    /map\.json metadata\.generator\.seed must be text/,
  );
});

void test('rectangular worlds retain dimensions, pairing, and identity through source and ZIP reload', async () => {
  for (const topology of ['open-field', 'three-route', 'ring-center']) {
    const options = {
      seed: 'forge-001', topology, size: 65, worldWidth: 6000, worldHeight: 5600,
      updatedAt: '2000-01-01T00:00:00.000Z',
    };
    const generated = generateBalancedProject(options, TEST_BASE_TEMPLATE);
    const files = createMapSourceFiles(generated.project);
    const restored = parseMapSourceFiles(files);
    assert.equal(restored.terrain.width, 65);
    assert.equal(restored.terrain.height, 65);
    assert.equal(restored.terrain.worldWidth, 6000);
    assert.equal(restored.terrain.worldHeight, 5600);
    assert.deepEqual(restored.metadata, generated.project.metadata);
    assert.deepEqual(createMapSourceFiles(restored), files);
    assert.deepEqual(createMapSourceFiles(generateBalancedProject(options, TEST_BASE_TEMPLATE).project), files);
    const analysis = analyzeBalancedProject(restored, generated.baseAnchors, generated.objectiveAnchors);
    assert.equal(analysis.passed, true, JSON.stringify(analysis));
    assert.equal(rotationalTerrainMismatches(restored.terrain), 0);
    const archive = await createMapArchive(restored);
    assert.deepEqual(Buffer.from(await createMapArchive(restored)), Buffer.from(archive));
    const entries = await readMapArchive(archive);
    const land = parseLand(entries.find((entry) => entry.name.endsWith('/land')).text);
    assert.equal(land.width, 65);
    assert.equal(land.height, 65);
    assert.equal(land.worldWidth, 6000);
    assert.equal(land.worldHeight, 5600);
    const projectEntry = entries.find((entry) => entry.name.endsWith('/wulfram-project.json'));
    const archivedProject = JSON.parse(projectEntry.text);
    assert.deepEqual(archivedProject.metadata, restored.metadata);
    assert.deepEqual(createMapSourceFiles(archivedProject), files);
  }
});

void test('project generation supplements a missing uplink as an exact pair', () => {
  const withoutUplink = {
    ...TEST_BASE_TEMPLATE,
    id: 'balanced-test-base-without-uplink',
    unitCount: 3,
    units: TEST_BASE_TEMPLATE.units.filter((unit) => unit.token !== 'u'),
  };
  const generated = generateBalancedProject({
    seed: 'supplement-uplink',
    topology: 'open-field',
    updatedAt: '2000-01-01T00:00:00.000Z',
  }, withoutUplink);
  const uplinks = generated.project.entities.filter((entity) => entity.token === 'u');
  assert.equal(uplinks.length, 2);
  assert.equal(uplinks[0].team, 1);
  assert.equal(uplinks[1].team, 2);
  assert.equal(uplinks[1].position[0], generated.terrain.worldWidth - uplinks[0].position[0]);
  assert.equal(uplinks[1].position[1], generated.terrain.worldHeight - uplinks[0].position[1]);
  assert.deepEqual(validateProject(generated.project), []);
  const parameters = JSON.parse(generated.project.baseLayouts[0].metadata['generator.parameters']);
  assert.equal(parameters.supplementedUplink, true);
});

void test('complete-project analysis rejects a broken team entity pair', () => {
  const generated = generateBalancedProject({
    seed: 'broken-entity-pair',
    topology: 'open-field',
    updatedAt: '2000-01-01T00:00:00.000Z',
  }, TEST_BASE_TEMPLATE);
  generated.project.entities.find((entity) => entity.team === 2).position[0] += 4;
  const report = analyzeBalancedProject(
    generated.project,
    generated.baseAnchors,
    generated.objectiveAnchors,
  );
  assert.equal(report.passed, false);
  assert.equal(report.entityPairing.passed, false);
  assert.equal(report.entityPairing.mismatchCount, 1);
});
