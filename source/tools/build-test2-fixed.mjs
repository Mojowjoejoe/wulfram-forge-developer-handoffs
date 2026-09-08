import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readMapArchive, createMapArchive } from '../lib/map-package.ts';
import { buildBalancedCandidate } from '../lib/balanced-candidate.ts';
import { COMBAT_BASE_TEMPLATE } from '../lib/combat-base-template.ts';
import { createMapSourceFiles, parseMapSourceFiles } from '../lib/map-source.ts';
import { analyzeBalancedProject } from '../lib/balanced-map-analysis.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = 'C:/Users/Developer/Downloads/test2.zip';
const bytes = fs.readFileSync(input);
const hash = value => createHash('sha256').update(value).digest('hex');
const entries = await readMapArchive(bytes);
const project = JSON.parse(entries.find(entry => entry.name.endsWith('/wulfram-project.json')).text);
assert.equal(project.entities.length, 0, 'Expected the inspected empty base layout');
assert.equal(project.metadata?.['generator.seed'], undefined);
const options = { name: 'Test2 Fixed', seed: 'test2-fixed-v1', topology: 'open-field',
  size: project.terrain.width, worldWidth: project.terrain.worldWidth, worldHeight: project.terrain.worldHeight,
  relief: 420, baseHeight: 0, baseSeparation: 0.5, routeWidth: 1.35, centralAreaSize: 1.9,
  textureName: '1martian001' };
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/manifest.json'), 'utf8'));
const candidate = buildBalancedCandidate(options, COMBAT_BASE_TEMPLATE, manifest);
console.log(JSON.stringify({ passed: candidate.analysis.passed, base: candidate.baseMessage, gates: candidate.analysis.terrain.gates,
  issues: candidate.analysis.projectIssues, pairing: candidate.analysis.entityPairing }, null, 2));
assert.equal(candidate.analysis.passed, true, 'Do not deliver a rejected map');
const source = createMapSourceFiles(candidate.result.project);
const restored = parseMapSourceFiles(source);
assert.deepEqual(createMapSourceFiles(restored), source);
const output = Buffer.from(await createMapArchive(restored));
assert.deepEqual(Buffer.from(await createMapArchive(restored)), output);
const exported = await readMapArchive(output);
const reopened = JSON.parse(exported.find(entry => entry.name.endsWith('/wulfram-project.json')).text);
assert.deepEqual(createMapSourceFiles(reopened), source);
const analysis = analyzeBalancedProject(reopened, candidate.result.baseAnchors, candidate.result.objectiveAnchors, {}, manifest);
assert.equal(analysis.passed, true);
assert.equal(hash(fs.readFileSync(input)), hash(bytes), 'Original file changed');
const destination = path.resolve(root, '../balanced-map-evidence/test2-fixed-v1');
assert.equal(fs.existsSync(destination), false, 'Preserve prior outputs');
fs.mkdirSync(destination);
fs.writeFileSync(path.join(destination, 'test2-fixed.zip'), output);
fs.writeFileSync(path.join(destination, 'verification.json'), JSON.stringify({ inputSha256: hash(bytes), outputSha256: hash(output), options, base: candidate.baseMessage, analysis }, null, 2));
fs.writeFileSync(path.join(destination, 'SHA256SUMS.txt'), `${hash(output)}  test2-fixed.zip\n`);
console.log(destination);
