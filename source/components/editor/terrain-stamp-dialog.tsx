'use client';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { stampTerrain, TERRAIN_STAMPS, type TerrainStampOptions } from '@/lib/terrain-stamp';
import { modelNameFor, type AssetManifest, type WulframProject } from '@/lib/wulfram';

export function TerrainStampDialog({ project, manifest, onClose, onApply }: {
  project: WulframProject; manifest: AssetManifest; onClose: () => void;
  onApply: (next: WulframProject, source: WulframProject) => void;
}) {
  const [options, setOptions] = useState<TerrainStampOptions>({ preset: 'ridge', x: project.terrain.worldWidth / 2,
    y: project.terrain.worldHeight / 2, radius: 600, aspect: .4, rotation: 0, amplitude: 150, edgePower: 2, mirror: true });
  const [acknowledged, setAcknowledged] = useState(false);
  const update = (change: Partial<TerrainStampOptions>) => { setOptions(o => ({ ...o, ...change })); setAcknowledged(false); };
  const preview = useMemo(() => {
    try {
      const circles = [...project.entities, ...project.baseLayouts.flatMap(l => l.entities)].map(e => {
        const name = modelNameFor(e), bounds = name ? manifest.models[name]?.bounds : undefined;
        if (!bounds) throw new Error('A structure has unknown bounds; safe stamp placement cannot be checked.');
        return { x: e.position[0], y: e.position[1], radius: 100 + Math.hypot(Math.max(Math.abs(bounds.min[0]), Math.abs(bounds.max[0])), Math.max(Math.abs(bounds.min[1]), Math.abs(bounds.max[1]))) };
      });
      return { result: stampTerrain(project.terrain, options, circles), error: '' };
    } catch (error) { return { error: error instanceof Error ? error.message : 'Cannot preview stamp.' }; }
  }, [project, manifest, options]);
  const terrain = project.terrain;
  const min = terrain.heights.reduce((a, b) => Math.min(a, b), Infinity);
  const max = terrain.heights.reduce((a, b) => Math.max(a, b), -Infinity);
  const fields = [['radius', 'Radius (80–2,000 u)', 80, 2000, 20], ['aspect', 'Width ratio (0.2–1)', .2, 1, .05],
    ['rotation', 'Rotation (−180–180°)', -180, 180, 15], ['amplitude', 'Height / depth scale (5–2,000 u)', 5, 2000, 5],
    ['edgePower', 'Edge profile (1 broad–6 concentrated)', 1, 6, .25], ['x', 'Center X', 0, terrain.worldWidth, 25], ['y', 'Center Y', 0, terrain.worldHeight, 25]] as const;
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="balanced-generator-dialog">
    <DialogHeader><DialogTitle>Stamp at coordinates</DialogTitle><DialogDescription>Choose a large landform, spin it, then click the top-down map to position it. Preview updates automatically. Apply places one stamp (or a mirrored pair); Undo removes it.</DialogDescription></DialogHeader>
    <section className="balanced-generator-form">
      <label>Landform preset<select value={options.preset} onChange={e => update({ preset: e.target.value as TerrainStampOptions['preset'] })}>{TERRAIN_STAMPS.map(p => <option key={p}>{p}</option>)}</select></label>
      {fields.map(([key, label, minimum, maximum, step]) => <label key={key}>{label}<input type="number" min={minimum} max={maximum} step={step} value={options[key]} onChange={e => update({ [key]: Number(e.target.value) })} /></label>)}
    </section>
    <label><input type="checkbox" checked={options.mirror} onChange={e => update({ mirror: e.target.checked })} /> Add 180° mirrored partner</label>
    <button type="button" aria-label="Stamp placement map; arrow keys move the center" onKeyDown={e => {
      const directions: Record<string, [number, number]> = { ArrowLeft: [-25, 0], ArrowRight: [25, 0], ArrowUp: [0, -25], ArrowDown: [0, 25] };
      const movement = directions[e.key];
      if (movement) { e.preventDefault(); e.stopPropagation(); update({ x: Math.max(0, Math.min(terrain.worldWidth, options.x + movement[0])), y: Math.max(0, Math.min(terrain.worldHeight, options.y + movement[1])) }); }
    }} style={{ width: 250 * terrain.worldWidth / terrain.worldHeight, height: 250, margin: '0 auto', padding: 0, border: 0, cursor: 'crosshair', background: '#15191c' }} onClick={e => {
      if (e.detail === 0) return;
      const box = e.currentTarget.getBoundingClientRect();
      update({ x: (e.clientX - box.left) / box.width * terrain.worldWidth, y: (e.clientY - box.top) / box.height * terrain.worldHeight });
    }}><svg aria-hidden="true" viewBox={`0 0 ${terrain.worldWidth} ${terrain.worldHeight}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
      {Array.from({ length: 64 * 64 }, (_, i) => {
        const x = i % 64, y = Math.floor(i / 64), index = Math.round(y / 63 * (terrain.height - 1)) * terrain.width + Math.round(x / 63 * (terrain.width - 1));
        const delta = preview.result?.deltas[index] ?? 0;
        return <rect key={i} x={x / 64 * terrain.worldWidth} y={y / 64 * terrain.worldHeight} width={terrain.worldWidth / 64 + 1} height={terrain.worldHeight / 64 + 1} fill={delta > .01 ? '#eaa04e' : delta < -.01 ? '#62b5e3' : `hsl(30 12% ${20 + 45 * (terrain.heights[index] - min) / Math.max(1, max - min)}%)`} />;
      })}
      {project.entities.map(e => <circle key={e.id} cx={e.position[0]} cy={e.position[1]} r={35} fill={e.team === 1 ? '#ff7777' : e.team === 2 ? '#77aaff' : '#eee'} />)}
      <circle cx={options.x} cy={options.y} r={40} fill="none" stroke="white" strokeWidth={10} />
    </svg></button>
    <small>Orange raises ground; blue lowers it. Existing textures stay unchanged. Ridge raises, valley lowers, crater has a raised rim and depressed center, saddle has two high and two low sides. Height/depth is a scale, not a guaranteed sampled peak.</small>
    {preview.error ? <p role="alert">{preview.error}</p> : <p>{preview.result?.changed} terrain vertices will change.</p>}
    <label><input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} /> Manual edit: I understand this can block routes or change sightlines. Mirroring is not proof of balance; revalidate and playtest.</label>
    <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!preview.result || !acknowledged} onClick={() => {
      if (!preview.result || !acknowledged) return;
      const next = structuredClone(project); next.terrain = structuredClone(preview.result.terrain);
      for (const metadata of [next.metadata, ...next.baseLayouts.map(l => l.metadata)]) {
        if (metadata) for (const key of Object.keys(metadata)) if (key.endsWith('.analysis')) delete metadata[key];
      }
      next.metadata = { ...next.metadata, 'terrainStamp.last': JSON.stringify({ version: 1, ...options }), 'terrainStamp.validation': 'manual-edit-needs-revalidation' };
      onApply(next, project);
    }}>Apply terrain stamp</Button></DialogFooter>
  </DialogContent></Dialog>;
}
