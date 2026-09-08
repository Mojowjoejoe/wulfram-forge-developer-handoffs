import { buildBalancedCandidate } from './balanced-candidate';
import { findPassingMap } from './passing-map-search';
import type { BalancedProjectOptions, BalancedMapTopology } from './balanced-map-generator';
import type { AssetManifest, BaseTemplate, WulframProject } from './wulfram';

export interface MapSearchRequest {
  options: BalancedProjectOptions;
  topologies: BalancedMapTopology[];
  template: BaseTemplate;
  manifest: AssetManifest;
  source: WulframProject;
  maxAttempts: number;
}
self.onmessage = async (event: MessageEvent<MapSearchRequest>) => {
  const request = event.data;
  try {
    const result = await findPassingMap({ seed: request.options.seed, maxAttempts: request.maxAttempts,
      onAttempt: attempt => self.postMessage({ type: 'progress', attempt }),
      evaluate: async seed => {
        const reasons: string[] = [];
        for (const topology of request.topologies) {
          const candidate = buildBalancedCandidate({ ...request.options, seed, topology }, request.template, request.manifest, request.source);
          if (candidate.analysis.passed) return { candidate, passed: true, reasons: [] };
          reasons.push(...candidate.analysis.terrain.gates.filter(g => !g.passed).map(g => `${topology}: ${g.code}`));
          reasons.push(`${topology}: ${candidate.baseMessage}`);
        }
        return { candidate: undefined, passed: false, reasons };
      } });
    self.postMessage({ type: 'result', result });
  } catch (error) { self.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) }); }
};
