import assert from 'node:assert/strict';
import test from 'node:test';
import { findPassingMap, mapSearchSeed } from '../lib/passing-map-search.ts';

void test('seed search is reproducible and bounded for long Unicode seeds', () => {
  const sequence = Array.from({ length: 30 }, (_, i) => mapSearchSeed('é'.repeat(200), i));
  assert.equal(new Set(sequence).size, 30);
  assert.ok(sequence.every(seed => seed.length <= 200));
  assert.deepEqual(sequence, Array.from({ length: 30 }, (_, i) => mapSearchSeed('é'.repeat(200), i)));
  assert.throws(() => mapSearchSeed('x', 30));
});
void test('returns first passing preview without applying or modifying settings', async () => {
  const settings = Object.freeze({ seed: 'start', relief: 420, template: 'combat' });
  const calls = [];
  const result = await findPassingMap({ seed: settings.seed, evaluate: async seed => {
    calls.push({ ...settings, seed });
    return { candidate: { seed }, passed: calls.length === 3, reasons: ['route-count'] };
  } });
  assert.equal(result.status, 'found'); assert.equal(calls.length, 3);
  assert.equal(result.seed, mapSearchSeed('start', 2));
  assert.ok(calls.every(c => c.relief === 420 && c.template === 'combat'));
  assert.equal(settings.seed, 'start');
});
void test('no-result stops exactly at limit and retains failure reasons', async () => {
  const result = await findPassingMap({ seed: 'x', maxAttempts: 2, evaluate: async () => ({ candidate: null, passed: false, reasons: ['base-fit'] }) });
  assert.equal(result.status, 'exhausted'); assert.equal(result.attempts.length, 2);
  assert.deepEqual(result.attempts[1].reasons, ['base-fit']);
  await assert.rejects(findPassingMap({ seed: 'x', maxAttempts: 31, evaluate: async () => {} }));
});
void test('cancellation and stale source discard even a passing in-flight result', async () => {
  for (const mode of ['cancelled', 'stale']) {
    const controller = new AbortController(); let current = true;
    const result = await findPassingMap({ seed: 'x', signal: controller.signal, isCurrent: () => current,
      evaluate: async () => { if (mode === 'cancelled') controller.abort(); else current = false;
        return { candidate: 'must not escape', passed: true, reasons: [] }; } });
    assert.equal(result.status, mode); assert.equal('candidate' in result, false);
  }
});
void test('pre-cancel does not start work; evaluation errors do not produce fake candidates', async () => {
  const c = new AbortController(); c.abort();
  assert.equal((await findPassingMap({ seed: 'x', signal: c.signal, evaluate: async () => { throw new Error('must not run'); } })).status, 'cancelled');
  await assert.rejects(findPassingMap({ seed: 'x', evaluate: async () => { throw new Error('worker failed'); } }), /worker failed/);
});
