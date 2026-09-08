import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { generateBalancedProject } from '../lib/balanced-map-generator.ts';
import { analyzeBalancedProject } from '../lib/balanced-map-analysis.ts';
import { createMapSourceFiles, parseMapSourceFiles } from '../lib/map-source.ts';
import { createMapArchive, readMapArchive } from '../lib/map-package.ts';
import { COMBAT_BASE_TEMPLATE as template } from '../lib/combat-base-template.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/manifest.json'), 'utf8'));
const options = { name: 'Forge Combat Trial v1', seed: 'forge-combat-trial-v1',
  topology: 'three-route', size: 129, worldWidth: 5600, worldHeight: 5600,
  relief: 420, baseSeparation: 0.55, routeWidth: 1.35, centralAreaSize: 1.5,
  textureName: 'canyon003' };
const generated = generateBalancedProject(options, template, manifest);
const project = generated.project;
assert.equal(project.entities.length, template.unitCount * 2, 'Missing deployed models');
const analysis = analyzeBalancedProject(project, generated.baseAnchors, generated.objectiveAnchors, {}, manifest);
console.log(JSON.stringify({ passed: analysis.passed, pairing: analysis.entityPairing,
  issues: analysis.projectIssues, gates: analysis.terrain.gates }, null, 2));
assert.equal(analysis.passed, true, 'Combat map must pass existing gates');
project.metadata['combatTest.version'] = '1';
project.metadata['combatTest.status'] = 'private-offline-candidate-not-playtested';
project.baseLayouts[0].name = 'Deployed combat bases';
project.baseLayouts[0].metadata['combatTest.analysis'] = JSON.stringify(analysis);
const source = createMapSourceFiles(project);
const restored = parseMapSourceFiles(source);
assert.deepEqual(createMapSourceFiles(restored), source);
const archive = Buffer.from(await createMapArchive(restored));
assert.deepEqual(Buffer.from(await createMapArchive(restored)), archive);
const entries = await readMapArchive(archive);
const recovered = JSON.parse(entries.find(entry => entry.name.endsWith('/wulfram-project.json')).text);
assert.deepEqual(createMapSourceFiles(recovered), source);
const destination = path.join(root, '../balanced-map-evidence/forge-combat-trial-v1');
if (fs.existsSync(destination)) throw new Error(`Preserving existing output: ${destination}`);
fs.mkdirSync(path.join(destination, 'source'), { recursive: true });
for (const [name, content] of Object.entries(source)) fs.writeFileSync(path.join(destination, 'source', name), content);
fs.writeFileSync(path.join(destination, 'forge-combat-trial-v1.zip'), archive);
fs.writeFileSync(path.join(destination, 'combat-base-template.json'), JSON.stringify(template, null, 2));
fs.writeFileSync(path.join(destination, 'analysis.json'), JSON.stringify(analysis, null, 2));
fs.writeFileSync(path.join(destination, 'SHA256SUMS.txt'), `${createHash('sha256').update(archive).digest('hex')}  forge-combat-trial-v1.zip\n`);
console.log(`Verified private map package: ${destination}`);
