import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import JSZip from 'jszip';
import { buildBalancedCandidate } from '../lib/balanced-candidate.ts';
import { COMBAT_BASE_TEMPLATE } from '../lib/combat-base-template.ts';
import { createEditorDiagnostics, inspectDiagnosticProject } from '../lib/editor-diagnostics.ts';
import { DEFAULT_TERRAIN_DETAIL, generateTerrainDetail } from '../lib/terrain-detail-generator.ts';
import { cloneProject, activateBaseLayout } from '../lib/wulfram.ts';
import { createMapArchive, readMapArchive } from '../lib/map-package.ts';

const manifest = JSON.parse(fs.readFileSync(new URL('../public/assets/manifest.json', import.meta.url), 'utf8'));
const generate = () => buildBalancedCandidate({ name: 'Workflow fixture', seed: 'test2-fixed-v1', topology: 'open-field',
  relief: 420, baseSeparation: 0.5, routeWidth: 1.35, centralAreaSize: 1.9 }, COMBAT_BASE_TEMPLATE, manifest);

void test('data workflow: generate, preview, apply snapshot, undo/redo snapshots, save/reopen and map ZIP', async () => {
  const generated = generate(); assert.equal(generated.analysis.passed, true);
  let current = cloneProject(generated.result.project);
  const baseline = JSON.stringify(current);
  const preview = generateTerrainDetail(current, DEFAULT_TERRAIN_DETAIL, manifest);
  assert.equal(preview.passed, true);
  assert.equal(JSON.stringify(current), baseline, 'Preview must not mutate working map');
  const undo = [cloneProject(current)];
  current = cloneProject(preview.project);
  const applied = JSON.stringify(current);
  const redo = [cloneProject(current)];
  current = cloneProject(undo.pop());
  assert.equal(JSON.stringify(current), baseline);
  current = cloneProject(redo.pop());
  assert.equal(JSON.stringify(current), applied);
  // Same JSON encoding and clone normalization used by local save and restore.
  current = cloneProject(JSON.parse(JSON.stringify(current)));
  assert.equal(JSON.stringify(current), applied);
  const entries = await readMapArchive(await createMapArchive(current));
  const restored = JSON.parse(entries.find(entry => entry.name.endsWith('/wulfram-project.json')).text);
  assert.equal(restored.activeBaseLayoutId, current.activeBaseLayoutId);
  assert.equal(restored.entities.length, 22);
  assert.deepEqual(restored.metadata, current.metadata);
});

void test('diagnostics distinguish empty selected layout from retained populated layout and rejected preview', async () => {
  const original = generate().result.project;
  original.baseLayouts.push({ ...structuredClone(original.baseLayouts[0]), id: 'empty', name: 'Empty test', entities: [] });
  const selected = activateBaseLayout(original, 'empty');
  const before = JSON.stringify(selected);
  const preview = generateTerrainDetail(selected, DEFAULT_TERRAIN_DETAIL, manifest);
  assert.equal(preview.passed, false);
  const bytes = await createEditorDiagnostics(selected, manifest, { surface: 'terrain-detail', draft: DEFAULT_TERRAIN_DETAIL,
    candidate: preview.project, candidatePassed: false, candidateIsCurrent: true });
  assert.equal(JSON.stringify(selected), before);
  const zip = await JSZip.loadAsync(bytes, { checkCRC32: true });
  const report = JSON.parse(await zip.file('validation.json').async('string'));
  assert.equal(report.activeLayoutId, 'empty');
  assert.equal(report.workingEntityCount, 0);
  assert.equal(report.workingValidation.filter(issue => issue.severity === 'error').length, 4);
  assert.ok(report.layouts.some(layout => layout.entityCount === 22));
  assert.equal(JSON.parse(await zip.file('context.json').async('string')).candidatePassed, false);
  assert.ok(zip.file('candidate-project.json'));
  assert.ok(zip.file('importable-map.zip'));
  const raw = JSON.parse(await zip.file('working-project.json').async('string'));
  assert.deepEqual(raw, JSON.parse(before));
  const inconsistent = structuredClone(selected); inconsistent.entities = original.baseLayouts.find(layout => layout.id !== 'empty').entities;
  assert.equal(inspectDiagnosticProject(inconsistent, manifest).activeEntitiesMatchWorkingEntities, false);
});

void test('diagnostic export handles missing generator settings without inventing anchors', async () => {
  const project = generate().result.project;
  delete project.metadata;
  const report = inspectDiagnosticProject(project, manifest);
  assert.match(report.balance.unavailable, /No saved/);
  const zip = await JSZip.loadAsync(await createEditorDiagnostics(project, manifest, { surface: 'editor' }));
  assert.equal(zip.file('candidate-project.json'), null);
  assert.equal(JSON.parse(await zip.file('format.json').async('string')).version, 1);
});

void test('only explicit terrain-only empty layouts defer missing-base requirements', () => {
  const project = generate().result.project;
  project.entities = [];
  project.baseLayouts[0].entities = [];
  const ordinary = generateTerrainDetail(project, DEFAULT_TERRAIN_DETAIL, manifest);
  assert.equal(ordinary.passed, false);
  project.metadata['generator.stage'] = 'terrain-only-bases-required';
  const terrainFirst = generateTerrainDetail(project, DEFAULT_TERRAIN_DETAIL, manifest);
  assert.equal(terrainFirst.passed, true);
  assert.equal(terrainFirst.basesRequired, true);
  assert.equal(terrainFirst.analysis.passed, false);
  assert.equal(terrainFirst.analysis.projectErrorCount, 4);
  assert.equal(terrainFirst.project.metadata['generator.stage'], 'terrain-only-bases-required');
  project.baseLayouts[0].entities = generate().result.project.entities;
  assert.equal(generateTerrainDetail(project, DEFAULT_TERRAIN_DETAIL, manifest).passed, false, 'Inconsistent active layout cannot defer errors');
});
