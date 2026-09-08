import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { randomizeBalancedSettings } from '../lib/balanced-map-generator.ts';
import { buildBalancedCandidate } from '../lib/balanced-candidate.ts';
import { COMBAT_BASE_TEMPLATE } from '../lib/combat-base-template.ts';
const manifest = JSON.parse(fs.readFileSync(new URL('../public/assets/manifest.json', import.meta.url)));
const options = { seed: 'critic-baseline', topology: 'open-field', relief: 180, size: 65 };
void test('regeneration preserves custom working rules, active name and original source', () => {
  const source = buildBalancedCandidate(options, COMBAT_BASE_TEMPLATE, manifest).result.project;
  source.validation = { ...source.validation, serviceRadius: 420, backupRadius: 90, minSpacing: 12, maxSlopeDegrees: 19 };
  const active = source.baseLayouts.find(l => l.id === source.activeBaseLayoutId);
  active.validation = { ...source.validation }; active.name = 'Custom defense layout';
  const before = structuredClone(source);
  const next = buildBalancedCandidate({ ...options, seed: 'critic-next' }, COMBAT_BASE_TEMPLATE, manifest, source).result.project;
  assert.deepEqual(next.validation, before.validation);
  assert.equal(next.baseLayouts.find(l => l.id === next.activeBaseLayoutId).name, active.name);
  assert.deepEqual(source, before);
});
void test('maximum accepted terrain seed remains usable by the starter-base generator', () => {
  const seed = 'x'.repeat(200);
  const first = buildBalancedCandidate({ ...options, seed }, COMBAT_BASE_TEMPLATE, manifest);
  const second = buildBalancedCandidate({ ...options, seed }, COMBAT_BASE_TEMPLATE, manifest);
  assert.deepEqual(first, second);
  assert.equal(first.result.project.metadata['generator.seed'], seed);
  assert.doesNotThrow(() => randomizeBalancedSettings(seed, ['base'], ['1martian001']));
  assert.throws(() => buildBalancedCandidate({ ...options, seed: seed + 'x' }, COMBAT_BASE_TEMPLATE, manifest), /200/);
});
void test('desktop packager refuses to overwrite an existing release before building', { skip: !fs.existsSync(new URL('../dist/desktop/WulframForge-0.7.0-rc.25-win-x64-self-contained.zip', import.meta.url)) }, () => {
  const artifact = new URL('../dist/desktop/WulframForge-0.7.0-rc.25-win-x64-self-contained.zip', import.meta.url);
  const digest = () => createHash('sha256').update(fs.readFileSync(artifact)).digest('hex');
  const before = digest();
  const result = spawnSync(process.execPath, ['tools/build-desktop.mjs', '--version', '0.7.0-rc.25'], {
    cwd: new URL('..', import.meta.url), encoding: 'utf8', env: { ...process.env, WEBVIEW2_FIXED_RUNTIME_DIR: '' }, timeout: 5000,
  });
  assert.equal(result.status, 1); assert.match(result.stderr, /Release already exists/);
  assert.equal(result.stdout.includes('vite'), false); assert.equal(digest(), before);
});
