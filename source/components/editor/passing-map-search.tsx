'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { MapSearchRequest } from '@/lib/passing-map.worker';
import type { buildBalancedCandidate } from '@/lib/balanced-candidate';
import type { SearchAttempt } from '@/lib/passing-map-search';

export function PassingMapSearch({ request, disabled, onPreview, onInvalidate }: {
  request: Omit<MapSearchRequest, 'maxAttempts'>; disabled: boolean;
  onPreview: (candidate: ReturnType<typeof buildBalancedCandidate>) => void;
  onInvalidate: () => void;
}) {
  const [limit, setLimit] = useState(12);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [attempts, setAttempts] = useState<SearchAttempt[]>([]);
  const worker = useRef<Worker | undefined>(undefined);
  const generation = useRef(0);
  const callbacks = useRef({ onPreview, onInvalidate });
  useLayoutEffect(() => { callbacks.current = { onPreview, onInvalidate }; }, [onPreview, onInvalidate]);
  const signature = JSON.stringify([request.options, request.topologies, request.template?.id, limit]);
  const current = useRef({ signature, source: request.source, disabled });
  useLayoutEffect(() => { current.current.disabled = disabled; }, [disabled]);
  const stopWorker = () => { generation.current++; worker.current?.terminate(); worker.current = undefined; };
  useLayoutEffect(() => {
    current.current.signature = signature; current.current.source = request.source;
    stopWorker(); const token = generation.current;
    queueMicrotask(() => {
      if (generation.current !== token) return;
      setBusy(false); setAttempts([]); setStatus('Settings or map changed. Generate a fresh preview.');
      callbacks.current.onInvalidate();
    });
    return stopWorker;
  }, [signature, request.source]);
  const cancel = () => {
    generation.current++; worker.current?.terminate(); worker.current = undefined;
    setBusy(false); setStatus('Search cancelled. Current map unchanged.'); callbacks.current.onInvalidate();
  };
  useEffect(() => {
    if (disabled && worker.current) {
      generation.current++; worker.current.terminate(); worker.current = undefined;
      queueMicrotask(() => { setBusy(false); setStatus('Search stopped because another preview was requested.'); });
    }
  }, [disabled]);
  const start = () => {
    if (!request.template) { setStatus('Choose an available starter base before searching.'); return; }
    worker.current?.terminate(); const token = ++generation.current;
    const source = request.source; const identity = signature;
    callbacks.current.onInvalidate(); setAttempts([]); setBusy(true); setStatus(`Searching up to ${limit} seeds. Current map unchanged.`);
    try {
      const running = new Worker(new URL('../../lib/passing-map.worker.ts', import.meta.url), { type: 'module' });
      worker.current = running;
      const valid = () => !current.current.disabled && generation.current === token && current.current.signature === identity && current.current.source === source;
      const finish = () => { running.terminate(); if (worker.current === running) worker.current = undefined; setBusy(false); };
      running.onerror = () => { if (!valid()) return; finish(); setStatus('Search worker failed. No map applied; retry or export diagnostics.'); };
      running.onmessage = event => {
        if (!valid()) return;
        const data = event.data;
        if (data.type === 'progress') {
          setAttempts(old => [...old, data.attempt]);
          setStatus(`Checked ${data.attempt.attempt}/${limit} seeds. ${data.attempt.passed ? 'Passing preview found.' : 'Trying another seed…'}`);
        } else if (data.type === 'error') { finish(); setStatus(`Search failed: ${data.message}. Current map unchanged.`); }
        else if (data.type === 'result') {
          finish();
          if (data.result.status === 'found' && data.result.candidate?.analysis.passed) {
            callbacks.current.onPreview(data.result.candidate);
            setStatus(`Found passing seed: ${data.result.seed}. Preview only—use Apply passing candidate to replace the map. Your draft settings are unchanged.`);
          } else setStatus(`No passing map after ${data.result.attempts.length} seeds. Adjust relief, route width or base template. Current map unchanged.`);
        }
      };
      running.postMessage({ ...request, maxAttempts: limit });
    } catch (error) { worker.current?.terminate(); worker.current = undefined; setBusy(false); setStatus(`Search could not start: ${String(error)}`); }
  };
  return <section aria-label="Passing map search" style={{ flexBasis: '100%', minWidth: 0, overflowWrap: 'anywhere' }}>
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginRight: 12, marginBottom: 8 }}>Search seed limit (1–30)<input aria-label="Search seed limit" type="number" min={1} max={30} value={limit} onChange={e => setLimit(Number(e.target.value))} style={{ width: 70, padding: '5px 8px', border: '1px solid #444', borderRadius: 4, background: '#111517' }} /></label>
    <Button variant="outline" disabled={disabled || busy || !Number.isInteger(limit) || limit < 1 || limit > 30} onClick={start}>Find a passing map</Button>
    {busy && <Button variant="outline" onClick={cancel}>Cancel search</Button>}
    <output data-testid="map-search-status" style={{ display: 'block' }}>{status}</output>
    <small>Only the seed changes. Compare-all checks your three layouts per seed. Cancelling stops the worker immediately; no candidate is applied automatically.</small>
    {attempts.some(a => !a.passed) && <details style={{ maxHeight: 120, overflow: 'auto' }}><summary>Search failure details ({attempts.filter(a => !a.passed).length} seeds)</summary>
      {attempts.filter(a => !a.passed).map(a => <p key={a.attempt}>Seed {a.seed}: {a.reasons.join(' · ')}</p>)}
    </details>}
  </section>;
}
