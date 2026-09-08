import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';

import { createMapSourceFiles, parseMapSourceFiles } from '../lib/map-source.ts';
import { createMapArchive, createMapArchiveFiles, readMapArchive, safeMapName } from '../lib/map-package.ts';
import { listRepositoryMaps, readMapSourceDirectory, resolveMapsRepository, runGit } from './map-repository-lib.mjs';

// Read-only: verify the supplied canonical corpus without regenerating maps or
// writing archives. This is not independent original-game fixture validation.
const repository = resolveMapsRepository(process.argv[2]);
const maps = listRepositoryMaps(repository);
assert.ok(maps.length > 0, 'The selected repository has no maps to verify.');
if (process.argv[3] !== undefined) {
  const expectedCount = Number(process.argv[3]);
  assert.ok(Number.isSafeInteger(expectedCount) && expectedCount > 0, 'Expected map count must be a positive integer.');
  assert.equal(maps.length, expectedCount, 'Corpus map count differs from the required baseline.');
}
const inputHash = createHash('sha256');
let layouts = 0;
let vertices = 0;
for (const { slug } of maps) {
  const original = readMapSourceDirectory(repository, slug);
  for (const name of Object.keys(original).sort()) {
    inputHash.update(JSON.stringify([slug, name, original[name]]));
  }
  const project = parseMapSourceFiles(original);
  const canonical = createMapSourceFiles(project);
  const restored = parseMapSourceFiles(canonical);
  assert.deepEqual(createMapSourceFiles(restored), canonical, `${slug}: canonical source stability`);
  assert.deepEqual(restored, project, `${slug}: all project fields survive source reload`);
  const files = createMapArchiveFiles(project);
  assert.deepEqual(createMapArchiveFiles(restored), files, `${slug}: source reload preserves compiled files`);
  const first = Buffer.from(await createMapArchive(project));
  const second = Buffer.from(await createMapArchive(restored));
  assert.deepEqual(second, first, `${slug}: ZIP bytes are deterministic across source reload`);
  const entries = await readMapArchive(first);
  const expected = Object.entries(files).map(([name, text]) => ({ name: `${safeMapName(project.name)}/${name}`, text }));
  assert.deepEqual(entries, expected, `${slug}: extracted ZIP names and contents`);
  layouts += project.baseLayouts.length;
  vertices += project.terrain.width * project.terrain.height;
}
console.log(JSON.stringify({
  scope: 'Canonical repository source and package roundtrips; not independent original-game fixtures',
  repository: path.resolve(repository),
  revision: runGit(repository, ['rev-parse', 'HEAD']),
  sourceCorpusSha256: inputHash.digest('hex'),
  maps: maps.length,
  layouts,
  vertices,
  passed: true,
}, null, 2));
