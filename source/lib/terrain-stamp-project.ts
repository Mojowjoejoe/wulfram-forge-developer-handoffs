import { terrainProtectionMask } from './terrain-detail-generator.ts';
import { stampTerrain, type TerrainStampOptions } from './terrain-stamp.ts';
import { modelNameFor, type AssetManifest, type WulframProject, type TerrainData } from './wulfram.ts';
import { paintTerrainTextureVertex, terrainTemplateFamily } from './terrain-textures.ts';
import { assertEditorConstraints } from './editor-constraints.ts';

export function stampProtection(project: WulframProject, manifest: AssetManifest, safe: boolean) {
  const circles = [...project.entities, ...project.baseLayouts.flatMap(l => l.entities)].map(e => {
    const name = modelNameFor(e), bounds = name ? manifest.models[name]?.bounds : undefined;
    if (!bounds || !e.position.every(Number.isFinite)) throw new Error('Unknown structure bounds or position: cannot verify stamp clearance.');
    return { x: e.position[0], y: e.position[1], radius: 100 + Math.hypot(Math.max(Math.abs(bounds.min[0]), Math.abs(bounds.max[0])), Math.max(Math.abs(bounds.min[1]), Math.abs(bounds.max[1]))) };
  });
  return { circles, mask: safe ? terrainProtectionMask(project, manifest) : undefined, project };
}

export function applyProjectStamp(project: WulframProject, options: TerrainStampOptions, manifest: AssetManifest, safe: boolean) {
  const protection = stampProtection(project, manifest, safe);
  const result = previewStampTerrain(project.terrain, options, manifest, protection);
  const next = structuredClone(project);
  next.terrain = structuredClone(result.terrain);
  for (const metadata of [next.metadata, ...next.baseLayouts.map(l => l.metadata)]) {
    if (metadata) for (const key of Object.keys(metadata)) if (key.endsWith('.analysis')) delete metadata[key];
  }
  next.metadata = { ...next.metadata, 'terrainStamp.last': JSON.stringify({ version: 1, ...options, safe }), 'terrainStamp.validation': 'manual-edit-needs-revalidation' };
  next.updatedAt = new Date().toISOString();
  return next;
}

export function previewStampTerrain(terrain: TerrainData, options: TerrainStampOptions, manifest: AssetManifest, protection: ReturnType<typeof stampProtection>) {
  const stamped = stampTerrain(terrain, options, protection.circles, protection.mask);
  const result = { ...stamped, terrain: structuredClone(stamped.terrain) };
  if (options.textureName) {
    if (!manifest.terrainTextures[options.textureName] || terrainTemplateFamily(options.textureName) === undefined) throw new Error('Choose an available supported terrain texture.');
    const tags = new Map(result.terrain.tagmap2.map((tag, id) => [tag.trim(), id]));
    const threshold = 1 - (options.textureCoverage ?? .6);
    for (let i = 0; i < result.deltas.length; i += 1) {
      if (result.deltas[i] === 0 || Math.abs(result.deltas[i]) / options.amplitude <= threshold) continue;
      const x = i % result.terrain.width, y = Math.floor(i / result.terrain.width);
      // Paint touches four adjacent cells: keep every corner out of protected reserves.
      let safePaint = true;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const px = x + ox, py = y + oy;
        if (px < 0 || py < 0 || px >= result.terrain.width || py >= result.terrain.height || protection.mask?.[py * result.terrain.width + px]) safePaint = false;
      }
      if (safePaint) paintTerrainTextureVertex(result.terrain, x, y, options.textureName, tags);
    }
  }
  // Preview and Apply share the same proposal and authored-constraint checks.
  // The generated-route safety toggle cannot disable authored height/district locks.
  assertEditorConstraints(protection.project, { ...protection.project, terrain: result.terrain }, manifest);
  return result;
}
