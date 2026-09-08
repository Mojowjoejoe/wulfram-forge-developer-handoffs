import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { generateTerrainDetail, DEFAULT_TERRAIN_DETAIL } from '../lib/terrain-detail-generator.ts';
import { generateBalancedBase } from '../lib/balanced-base-generator.ts';
import { COMBAT_BASE_TEMPLATE } from '../lib/combat-base-template.ts';
import { createMapArchive, readMapArchive } from '../lib/map-package.ts';
import { createMapSourceFiles } from '../lib/map-source.ts';
import { inspectDiagnosticProject } from '../lib/editor-diagnostics.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.resolve(root, '../balanced-map-evidence/terrain-first-rc20');
assert.equal(fs.existsSync(destination), false, 'Preserve existing receipts and maps');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/manifest.json'), 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const outputs = [];
for (const name of ['test2-balanced', 'test2-fixed']) {
  const filename = `C:/Users/Developer/Downloads/${name}-diagnostics.zip`;
  const input = fs.readFileSync(filename);
  const zip = await JSZip.loadAsync(input, { checkCRC32: true });
  const project = JSON.parse(await zip.file('working-project.json').async('string'));
  const original = JSON.stringify(project);
  const options = { ...DEFAULT_TERRAIN_DETAIL, pairs: 12, radius: 180, minHeight: 50, height: 1000 };
  const detail = generateTerrainDetail(project, options, manifest);
  assert.equal(JSON.stringify(project), original);
  assert.equal(detail.passed, true);
  assert.equal(detail.basesRequired, name === 'test2-balanced');
  assert.equal(detail.analysis.passed, name !== 'test2-balanced');
  // Apply/history and local save/reopen data path; not native UI automation.
  let current = structuredClone(detail.project);
  const redo = structuredClone(current);
  current = JSON.parse(original);
  assert.equal(JSON.stringify(current), original);
  current = JSON.parse(JSON.stringify(redo));
  assert.deepEqual(createMapSourceFiles(current), createMapSourceFiles(detail.project));
  const base = generateBalancedBase(current, COMBAT_BASE_TEMPLATE,
    { seed: 'terrain-first-completion', footprint: 2000, spacing: 1, rotation: 0 }, manifest);
  assert.equal(base.passed, true, base.message);
  assert.equal(base.project.metadata['generator.stage'], undefined);
  assert.deepEqual(base.project.terrain, current.terrain);
  const archive = Buffer.from(await createMapArchive(base.project));
  const reopenedEntries = await readMapArchive(archive);
  const reopened = JSON.parse(reopenedEntries.find(entry => entry.name.endsWith('/wulfram-project.json')).text);
  assert.deepEqual(createMapSourceFiles(reopened), createMapSourceFiles(base.project));
  assert.equal(inspectDiagnosticProject(reopened, manifest).balance.passed, true);
  assert.equal(hash(fs.readFileSync(filename)), hash(input));
  outputs.push({ name, archive, receipt: { inputSha256: hash(input), outputSha256: hash(archive), options,
    detailPassed: detail.passed, basesRequiredAfterDetail: detail.basesRequired, fullApprovalAfterDetail: detail.analysis.passed,
    completed: inspectDiagnosticProject(reopened, manifest), baseMessage: base.message } });
}
fs.mkdirSync(destination);
for (const output of outputs) {
  fs.writeFileSync(path.join(destination, `${output.name}-mountains-bases.zip`), output.archive);
  fs.writeFileSync(path.join(destination, `${output.name}-verification.json`), JSON.stringify(output.receipt, null, 2));
}
fs.writeFileSync(path.join(destination, 'SHA256SUMS.txt'), outputs.map(o => `${hash(o.archive)}  ${o.name}-mountains-bases.zip`).join('\n') + '\n');
console.log('Verified both supplied diagnostics, terrain detail, base completion, history snapshots and export/reopen:', destination);
