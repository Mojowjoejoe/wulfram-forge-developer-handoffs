import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { buildBalancedCandidate } from '../lib/balanced-candidate.ts';
import { generateTerrainDetail, DEFAULT_TERRAIN_DETAIL } from '../lib/terrain-detail-generator.ts';
import { COMBAT_BASE_TEMPLATE } from '../lib/combat-base-template.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(process.argv[2] ?? path.join(root, 'outputs/reliability-baseline.json'));
assert.equal(fs.existsSync(output), false, 'Preserve previous measurements; choose a new output filename');
const manifestBytes = fs.readFileSync(path.join(root, 'public/assets/manifest.json'));
const manifest = JSON.parse(manifestBytes);
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/base-templates.json')));
const templates = [COMBAT_BASE_TEMPLATE, ...['curated-base-in-a-box', 'kairo-team-2-base-1', 'survival-team-1-base-1'].map(id => {
  const t = catalog.templates.find(t => t.id === id); assert.ok(t, id); return t;
})];
const profiles = [
  { id: 'coarse-small', size: 33, worldWidth: 3200, worldHeight: 3200, relief: 180, routeWidth: 1, centralAreaSize: 1 },
  { id: 'coarse-extreme', size: 65, worldWidth: 7800, worldHeight: 6800, relief: 960, routeWidth: .55, centralAreaSize: 1.9 },
  { id: 'standard', size: 129, worldWidth: 5600, worldHeight: 5600, relief: 420, routeWidth: 1.35, centralAreaSize: 1.5 },
  { id: 'fine-rectangle', size: 257, worldWidth: 4900, worldHeight: 6900, relief: 530, routeWidth: 1.55, centralAreaSize: 2.1 },
  { id: 'lower-grid-boundary', size: 17, worldWidth: 5600, worldHeight: 5600, relief: 100, routeWidth: 1.75, centralAreaSize: 2.5, edge: true },
  { id: 'upper-grid-relief-boundary', size: 513, worldWidth: 8000, worldHeight: 8000, relief: 5000, routeWidth: 1.75, centralAreaSize: 2.5, edge: true },
];
const records = [];
const sourceHash = createHash('sha256');
for (const f of fs.readdirSync(path.join(root, 'lib')).filter(f => /^(balanced-|paired-template|base-placement|terrain-detail|wulfram|generator-settings)/.test(f)).sort()) sourceHash.update(f).update(fs.readFileSync(path.join(root, 'lib', f)));
const metadata = { format: 'generator-reliability-v1', sourceSha256: sourceHash.digest('hex'), manifestSha256: createHash('sha256').update(manifestBytes).digest('hex'),
  note: 'Stratified deterministic sample, not exhaustive coverage or live-match balance. Mountain samples only run on fully passing standard combat candidates.' };
function persist() {
  const grouped = {};
  for (const r of records) {
    const g = grouped[r.kind] ??= { total: 0, passed: 0, failures: {} };
    g.total++; if (r.passed) g.passed++;
    for (const code of r.failures) g.failures[code] = (g.failures[code] ?? 0) + 1;
  }
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify({ ...metadata, grouped, records }, null, 2));
}
for (const p of profiles) for (const topology of p.edge ? ['three-route'] : ['open-field', 'three-route', 'ring-center']) {
  for (let n = 0; n < (p.edge ? 1 : 2); n++) for (const template of templates) {
    const { id, edge: _edge, ...parameters } = p;
    const options = { ...parameters, topology, name: 'Reliability batch', seed: `reliability-v1-${n}`, baseSeparation: .5, textureName: '1martian001' };
    const start = performance.now();
    const record = { kind: 'map', profile: id, template: template.id, options, passed: false, failures: [], message: '' };
    try {
      const candidate = buildBalancedCandidate(options, template, manifest);
      record.passed = candidate.analysis.passed;
      record.failures = candidate.analysis.terrain.gates.filter(g => !g.passed).map(g => g.code);
      if (!candidate.analysis.entityPairing.passed) record.failures.push('entity-pairing');
      if (!record.passed && !candidate.baseMessage.startsWith('Placement rules passed')) record.failures.push('base-fit');
      for (const issue of candidate.analysis.projectIssues.filter(i => i.severity === 'error')) record.failures.push(issue.code);
      record.failures = [...new Set(record.failures)];
      record.message = candidate.baseMessage;
      record.coverage = candidate.analysis.terrain.metrics.traversableFraction;
      if (record.passed && id === 'standard' && template.id === COMBAT_BASE_TEMPLATE.id) {
        for (const height of [65, 1000, 2000]) for (const radius of [80, 400]) {
          const detailOptions = { ...DEFAULT_TERRAIN_DETAIL, seed: `detail-v1-${n}`, pairs: 12, minHeight: 5, height, radius };
          const before = JSON.stringify(candidate.result.project);
          const detail = generateTerrainDetail(candidate.result.project, detailOptions, manifest);
          assert.equal(JSON.stringify(candidate.result.project), before, 'Detail preview mutated its source');
          records.push({ kind: 'mountains', profile: id, template: template.id, options, detailOptions, passed: detail.passed,
            failures: [...detail.analysis.terrain.gates.filter(g => !g.passed).map(g => g.code), ...detail.blockingIssues.map(i => i.code), ...(!detail.changedVertices ? ['no-room'] : [])],
            changedVertices: detail.changedVertices, placedPairs: detail.placedPairs });
        }
      }
    } catch (error) { record.failures = ['exception']; record.message = error.message; }
    record.elapsedMs = Math.round(performance.now() - start);
    records.push(record); persist();
    console.log(`${records.filter(r => r.kind === 'map').length}: ${id}/${topology}/${template.id}/${n}: ${record.passed ? 'PASS' : record.failures.join(',')}`);
  }
}
persist(); console.log(`Report: ${output}`);
