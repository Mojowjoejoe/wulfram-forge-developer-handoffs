'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DiagnosticsButton } from '@/components/editor/diagnostics-button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BOOSTED_TERRAIN_DETAIL_HEIGHT, DEFAULT_TERRAIN_DETAIL, MAX_TERRAIN_DETAIL_HEIGHT, generateTerrainDetail, previewTerrainDetail, readTerrainDetailOptions } from '@/lib/terrain-detail-generator';
import type { AssetManifest, WulframProject } from '@/lib/wulfram';

export function TerrainDetailDialog({ project, manifest, onClose, onApply }: {
  project: WulframProject; manifest: AssetManifest; onClose: () => void;
  onApply: (next: WulframProject, source: WulframProject) => void;
}) {
  const textures = Object.keys(manifest.terrainTextures).filter(name => /^(sandrock|marsrock|rockwall|snowrocks|1snow|4snow|11ice|8ice|marslava)\d{3}$/.test(name)).sort();
  const [showProtected, setShowProtected] = useState(true);
  const replacing = Boolean(project.metadata?.['terrainDetail.settings']);
  const [options, setOptions] = useState(() => {
    try { const prior = readTerrainDetailOptions(project); if (prior) return prior; } catch { /* Preview reports invalid saved settings. */ }
    return { ...DEFAULT_TERRAIN_DETAIL, textureName: textures.includes(DEFAULT_TERRAIN_DETAIL.textureName) ? DEFAULT_TERRAIN_DETAIL.textureName : textures[0] ?? '' };
  });
  const [candidate, setCandidate] = useState<ReturnType<typeof generateTerrainDetail>>();
  const [source, setSource] = useState<WulframProject>();
  const [error, setError] = useState('');
  const update = (change: Partial<typeof options>) => { setOptions(current => ({ ...current, ...change })); setCandidate(undefined); setError(''); };
  const preview = () => {
    setCandidate(undefined); setError('');
    try { setCandidate(previewTerrainDetail(project, options, manifest)); setSource(project); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  };
  const current = source === project;
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="balanced-generator-dialog">
      <DialogHeader><DialogTitle>Terrain designer</DialogTitle>
        <DialogDescription>Generate paired hills, valley depressions, or mixed terrain with original textures. Protects authored routes, center, bases, structures and protected-height areas in all layouts. A height area also reserves its rotational partner. Existing detail is replaced from verified original ground, never stacked. Offline checks are not gameplay proof.</DialogDescription></DialogHeader>
      {replacing && <p>Editing existing terrain detail. Preview a replacement; your current map stays unchanged until Apply. Later terrain or structure edits may prevent safe replacement.</p>}
      <section className="balanced-generator-form">
        <label>Detail seed<input value={options.seed} maxLength={200} onChange={e => update({ seed: e.target.value })} /></label>
        <label>Terrain texture<select value={options.textureName} onChange={e => update({ textureName: e.target.value })}>{textures.map(name => <option key={name}>{name}</option>)}</select></label>
        <label>Requested cluster pairs (1–60)<input type="number" min={1} max={60} value={options.pairs} onChange={e => update({ pairs: Number(e.target.value) })} /></label>
        <label>Cluster radius (80–400 world units)<input type="number" min={80} max={400} value={options.radius} onChange={e => update({ radius: Number(e.target.value) })} /></label>
        <label>Minimum peak height (5–2,000 u)<input type="number" min={5} max={options.height} value={options.minHeight ?? 5} onChange={e => update({ minHeight: Number(e.target.value) })} /></label>
        <label>Maximum peak height (minimum–2,000 u)<input type="number" min={options.minHeight ?? 5} max={MAX_TERRAIN_DETAIL_HEIGHT} value={options.height} onChange={e => update({ height: Number(e.target.value) })} /></label>
        <label>Landform mode<select value={options.mode ?? 'hills'} onChange={e => update({ mode: e.target.value as 'hills' | 'valleys' | 'mixed' })}><option value="hills">Hills</option><option value="valleys">Valleys</option><option value="mixed">Mixed hills and valleys</option></select></label>
        <label>Minimum valley depth (5–2,000 u)<input type="number" min={5} max={options.depth ?? 65} value={options.minDepth ?? 5} onChange={e => update({ minDepth: Number(e.target.value) })} /></label>
        <label>Maximum valley depth (minimum–2,000 u)<input type="number" min={options.minDepth ?? 5} max={2000} value={options.depth ?? 65} onChange={e => update({ depth: Number(e.target.value) })} /></label>
        <label>Width ratio (0.2 narrow ridge–1 round)<input type="number" min={0.2} max={1} step={0.05} value={options.aspect ?? ''} placeholder="Seeded width" onChange={e => update({ aspect: e.target.value === '' ? undefined : Number(e.target.value) })} /></label>
        <label>Landform rotation (−180–180°)<input type="number" min={-180} max={180} step={15} value={options.rotation ?? 0} onChange={e => update({ rotation: Number(e.target.value) })} /></label>
        <label>Edge profile (1 broad–6 concentrated)<input type="number" min={1} max={6} step={0.25} value={options.edgePower ?? 2} onChange={e => update({ edgePower: Number(e.target.value) })} /></label>
      </section>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => update({ height: BOOSTED_TERRAIN_DETAIL_HEIGHT })}>Boost height · 1,000 u</Button>
        <Button variant="outline" onClick={() => update({ minHeight: 5, height: DEFAULT_TERRAIN_DETAIL.height })}>Reset heights · 5–65 u</Button>
      </div>
      <small>Boost raises these rocky formations into steep mountains or wall-like ridges, keeping the seed and footprint settings. It does not scale the entire map or create vertical walls. Preview again before applying.</small>
      {options.height > 150 && <output>Extreme height: may block access or fail the offline checks. Bases and authored routes remain protected; failed candidates cannot be applied.</output>}
      {error && <p role="alert" className="balanced-generator-error">{error}</p>}
      <small>Heights add to existing ground; depths subtract from it and can go below zero. Radius controls landform width; cluster pairs control frequency. Mixed alternates raised and lowered pairs when space allows. Each pair gets a seeded random magnitude. Ice/lava textures are visual only. Randomize seed preserves these limits.</small>
      {candidate && <>
        <p>{candidate.passed ? candidate.basesRequired ? 'TERRAIN DETAIL PASS — BASES STILL REQUIRED' : candidate.expectedOutpostIssues.length ? 'TERRAIN DETAIL PASS — UNPOWERED OUTPOST PRESERVED' : 'PASS' : 'REJECTED'} · {candidate.placedPairs}/{options.pairs} cluster pairs · {candidate.changedVertices} changed vertices · {candidate.paintedCells} painted cells</p>
        {candidate.peakHeights.length > 0 && <p>Generated elevation changes: {Math.min(...candidate.peakHeights).toFixed(0)} to {Math.max(...candidate.peakHeights).toFixed(0)} u relative to original ground.</p>}
        <label><input type="checkbox" checked={showProtected} onChange={e => setShowProtected(e.target.checked)} /> Show protected areas ({(100 * candidate.protectedVertices / project.terrain.heights.length).toFixed(0)}% of vertices)</label>
        <svg viewBox={`0 0 ${project.terrain.worldWidth} ${project.terrain.worldHeight}`} aria-label="Terrain preview: grey protected, orange raised, blue lowered" style={{ width: '100%', height: 260, background: '#171a1d' }}>
          {showProtected && <path d={candidate.protectedPath} fill="#647077" opacity={0.45} />}
          {candidate.project.terrain.heights.map((height, index) => height === project.terrain.heights[index] ? null : <rect key={index}
            x={index % project.terrain.width * project.terrain.worldWidth / (project.terrain.width - 1)}
            y={Math.floor(index / project.terrain.width) * project.terrain.worldHeight / (project.terrain.height - 1)}
            width={project.terrain.worldWidth / (project.terrain.width - 1)} height={project.terrain.worldHeight / (project.terrain.height - 1)}
            fill={height < project.terrain.heights[index] ? '#64a9d8' : '#c88035'} />)}
          {candidate.result.baseAnchors.map(([x, y], index) => <circle key={index} cx={x} cy={y} r={60} fill={index ? '#77aaff' : '#ff7777'} />)}
        </svg>
        <small>Grey areas are protected. Orange shows raised ground; blue shows lowered ground compared with the current map. Red/blue dots mark bases. Placement may produce fewer pairs when space is limited.</small>
        {!candidate.passed && <Button variant="outline" onClick={() => update({ height: Math.max(5, Math.round(options.height / 2)), minHeight: 5, depth: Math.max(5, Math.round((options.depth ?? 65) / 2)), minDepth: 5, radius: Math.max(80, Math.round(options.radius * .8)) })}>Try gentler, smaller landforms</Button>}
        <div className="balanced-gate-list">{candidate.analysis.terrain.gates.map(gate => <div key={gate.code} className={gate.passed ? 'pass' : 'fail'}><span>{gate.passed ? '✓' : '!'}</span><span><strong>{gate.code}</strong><small>{gate.message}</small></span></div>)}</div>
        {candidate.basesRequired && <p>Terrain-only project: missing uplinks and powered repair pads do not block terrain detailing. Apply this detail, then use Random base to add bases. Full-map approval remains blocked until both teams have valid bases.</p>}
        {candidate.expectedOutpostIssues.length > 0 && <p>The authored central repair outpost intentionally starts unpowered. Terrain detail preserves it unchanged. Its power error remains in full-map diagnostics; other power and placement errors still block Apply.</p>}
        <p>{candidate.blockingIssues.length} blocking placement errors · {candidate.analysis.projectWarningCount} warnings · {candidate.analysis.entityPairing.message}</p>
        {candidate.blockingIssues.map((issue, index) => <p key={index}>{issue.message}</p>)}
        {!candidate.changedVertices && <p role="alert">No room for these clusters. Try a smaller radius or a wider map.</p>}
        {!current && <p role="alert">Map changed. Preview again before applying.</p>}
      </>}
      <DialogFooter>
        <DiagnosticsButton project={project} manifest={manifest} context={{ surface: 'terrain-detail', draft: options, message: error, candidate: candidate?.project, candidatePassed: candidate?.passed, candidateIsCurrent: current }} />
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="outline" onClick={() => update({ seed: crypto.randomUUID() })}>Randomize seed</Button>
        <Button variant="outline" onClick={preview}>Preview terrain</Button>
        <Button disabled={!candidate?.passed || !current} onClick={() => { if (candidate?.passed && source === project) onApply(candidate.project, source); }}>Apply terrain detail</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
