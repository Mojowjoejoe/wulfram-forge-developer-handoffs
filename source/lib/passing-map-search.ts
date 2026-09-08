import { balancedSeedHash } from './balanced-map-generator.ts';

export const MAX_MAP_SEARCH_ATTEMPTS = 30;
export const DEFAULT_MAP_SEARCH_ATTEMPTS = 12;
export interface SearchAttempt { attempt: number; seed: string; passed: boolean; reasons: string[] }
export type SearchResult<T> = {
  status: 'found'; candidate: T; seed: string; attempts: SearchAttempt[];
} | { status: 'exhausted' | 'cancelled' | 'stale'; attempts: SearchAttempt[] };

/** Seed-only deterministic sequence. Does not change any non-seed design input. */
export function mapSearchSeed(seed: string, index: number) {
  const hash = balancedSeedHash(seed).toString(16);
  if (!Number.isInteger(index) || index < 0 || index >= MAX_MAP_SEARCH_ATTEMPTS) throw new Error('Invalid search attempt.');
  return index === 0 ? seed.normalize('NFC').trim() : `${seed.normalize('NFC').trim().slice(0, 160)}~find-v1-${hash}-${index}`;
}

/** UI supplies a worker-backed evaluate function; results never apply themselves. */
export async function findPassingMap<T>(config: {
  seed: string;
  maxAttempts?: number;
  signal?: AbortSignal;
  isCurrent?: () => boolean;
  evaluate: (seed: string) => Promise<{ candidate: T; passed: boolean; reasons: string[] }>;
  onAttempt?: (attempt: SearchAttempt) => void;
}): Promise<SearchResult<T>> {
  const limit = config.maxAttempts ?? DEFAULT_MAP_SEARCH_ATTEMPTS;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_MAP_SEARCH_ATTEMPTS) throw new Error(`Search limit must be 1–${MAX_MAP_SEARCH_ATTEMPTS}.`);
  mapSearchSeed(config.seed, 0);
  const attempts: SearchAttempt[] = [];
  const stopped = () => config.signal?.aborted ? 'cancelled' : config.isCurrent && !config.isCurrent() ? 'stale' : undefined;
  for (let i = 0; i < limit; i++) {
    const before = stopped(); if (before) return { status: before, attempts };
    const seed = mapSearchSeed(config.seed, i);
    let result;
    try { result = await config.evaluate(seed); }
    catch (error) {
      const status = stopped(); if (status) return { status, attempts };
      throw error; // Infrastructure/invalid-input errors must not masquerade as normal rejections.
    }
    const after = stopped(); if (after) return { status: after, attempts };
    const attempt = { attempt: i + 1, seed, passed: result.passed, reasons: [...result.reasons] };
    attempts.push(attempt); config.onAttempt?.(attempt);
    const notified = stopped(); if (notified) return { status: notified, attempts };
    if (result.passed) return { status: 'found', candidate: result.candidate, seed, attempts };
  }
  return { status: 'exhausted', attempts };
}
