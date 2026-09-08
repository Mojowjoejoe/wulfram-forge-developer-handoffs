import { analyzeBalancedProject } from './balanced-map-analysis.ts';
import { balancedSeedHash, generateBalancedTerrain, rotationalTerrainMismatches, routeBlend } from './balanced-map-generator.ts';
import { readTerrainGeneratorSettings } from './generator-settings.ts';
import { modelNameFor, type AssetManifest, type WulframProject } from './wulfram.ts';
import { BUILD_AREAS_KEY, readBuildAreas, areaFitsMap } from './build-areas.ts';

/** Geometry identity ignores labels, ordering and duplicate equivalent rules. */
function heightProtectionIdentity(source: WulframProject): string {
  const shapes = source.baseLayouts.flatMap(layout => readBuildAreas(layout.metadata[BUILD_AREAS_KEY])
    .flatMap(area => area.kind === 'terrain' ? [JSON.stringify([area.x, area.y, area.width, area.height])] : []));
  return JSON.stringify([...new Set(shapes)].sort());
}

/** Shared authored route, base, center and structure reserves; unknown maps fail closed. */
export function terrainProtectionMask(source: WulframProject, manifest: AssetManifest): boolean[] {
  const citadel = citadelSettings(source);
  const settings = citadel ?? readTerrainGeneratorSettings(source);
  if (!settings) throw new Error('Protected placement cannot read supported authored route metadata for this map. Open the original editor project, or for terrain stamps choose 3D Terrain Stamps > Placement mode > Manual. Manual placement skips authored route protection.');
  const terrain = source.terrain;
  if (terrain.width !== settings.size || terrain.height !== settings.size || terrain.worldWidth !== settings.worldWidth || terrain.worldHeight !== settings.worldHeight) throw new Error('Terrain dimensions do not match route-protection metadata.');
  const generated = generateBalancedTerrain(settings);
  const stepX = terrain.worldWidth / (terrain.width - 1), stepY = terrain.worldHeight / (terrain.height - 1);
  const halo = Math.hypot(stepX, stepY) * 2;
  const authored = new Set<number>();
  for (const layout of source.baseLayouts) for (const area of readBuildAreas(layout.metadata[BUILD_AREAS_KEY])) {
    if (area.kind !== 'terrain') continue;
    if (!areaFitsMap(area, terrain.worldWidth, terrain.worldHeight)) throw new Error(`${area.name}: protected terrain extends outside the map.`);
    const x0 = Math.floor(area.x / stepX), x1 = Math.ceil((area.x + area.width) / stepX);
    const y0 = Math.floor(area.y / stepY), y1 = Math.ceil((area.y + area.height) / stepY);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * terrain.width + x;
      authored.add(i);
      authored.add(terrain.heights.length - 1 - i);
    }
  }
  const structures = [...source.entities, ...source.baseLayouts.flatMap(layout => layout.entities)].map(entity => {
    if (entity.token === '*' || !entity.position.every(Number.isFinite)) throw new Error('Unresolved decoration or structure position prevents safe terrain detailing.');
    const name = modelNameFor(entity);
    const bounds = name ? manifest.models[name]?.bounds : undefined;
    if (!bounds) throw new Error(`No verified model bounds for ${entity.token}; cannot protect its footprint.`);
    const radius = Math.hypot(Math.max(Math.abs(bounds.min[0]), Math.abs(bounds.max[0])),
      Math.max(Math.abs(bounds.min[1]), Math.abs(bounds.max[1]))) + 300 + halo;
    return { x: entity.position[0], y: entity.position[1], radius };
  });
  // Protect both partners even if a neutral or inactive-layout entity is asymmetric.
  const protectedPoint = (wx: number, wy: number) => {
    const x = wx / terrain.worldWidth * 2 - 1;
    const y = wy / terrain.worldHeight * 2 - 1;
    if (citadel) {
      const u = (x + y) / Math.SQRT2, v = (x - y) / Math.SQRT2;
      const flank = .64 * Math.cos(Math.PI / 2 * Math.min(1, Math.abs(u) / .82));
      // Preserve the entire base reserve (including offset gates and LOS walls),
      // full route shoulders, arena, and every active/inactive structure footprint.
      return Math.min(wx, wy, terrain.worldWidth - wx, terrain.worldHeight - wy) < 450 + halo
        || Math.hypot(u, v) < .43
        || Math.min(Math.abs(v), Math.abs(Math.abs(v) - flank)) < .27 + halo / 3200
        || generated.baseAnchors.some(([bx, by]) => Math.hypot(wx - bx, wy - by) < 1950 + halo)
        || structures.some(s => Math.hypot(wx - s.x, wy - s.y) < s.radius);
    }
    return Math.min(wx, wy, terrain.worldWidth - wx, terrain.worldHeight - wy) < halo
      || Math.hypot(x, y) < 0.15 * settings.centralAreaSize
      || generated.baseAnchors.some(([bx, by]) => Math.hypot(wx - bx, wy - by) < 650 + halo)
      || routeBlend(settings.topology, x, y, settings.baseSeparation, settings.routeWidth) < 0.35
      || structures.some(s => Math.hypot(wx - s.x, wy - s.y) < s.radius);
  };
  const eligible = terrain.heights.map((_, index) => {
    const wx = index % terrain.width * stepX;
    const wy = Math.floor(index / terrain.width) * stepY;
    return !authored.has(index) && !protectedPoint(wx, wy) && !protectedPoint(terrain.worldWidth - wx, terrain.worldHeight - wy);
  });
  return eligible.map(value => !value);
}

export interface TerrainDetailOptions {
  seed: string;
  pairs: number;
  radius: number;
  height: number;
  minHeight?: number;
  textureName: string;
  mode?: 'hills' | 'valleys' | 'mixed';
  depth?: number;
  minDepth?: number;
  aspect?: number;
  rotation?: number;
  edgePower?: number;
}
export const DEFAULT_TERRAIN_DETAIL: TerrainDetailOptions = {
  seed: 'rocks-001', pairs: 18, radius: 180, minHeight: 5, height: 65, textureName: 'sandrock001',
};
export const MAX_TERRAIN_DETAIL_HEIGHT = 2000;
export const BOOSTED_TERRAIN_DETAIL_HEIGHT = 1000;

// Versioned authored geometry, not a claim that arbitrary imported maps use these lanes.
function citadelSettings(source: WulframProject) {
  const raw = source.metadata?.['showcase.identity'];
  if (!raw) return undefined;
  const identity = JSON.parse(raw);
  if (identity.version !== 'canyon-citadel-showcase-v1') throw new Error('Unsupported authored terrain protection version.');
  const settings = { name: source.name, seed: 'canyon-citadel-v1', topology: 'three-route' as const,
    size: 257, worldWidth: 6400, worldHeight: 6400, relief: 420, baseSeparation: .55,
    routeWidth: 1.5, centralAreaSize: 1.5, textureName: 'canyon003' };
  for (const key of ['size', 'worldWidth', 'worldHeight', 'baseSeparation', 'topology'] as const) {
    if (identity.options?.[key] !== settings[key]) throw new Error('Canyon Citadel protection settings do not match the supported authored layout.');
  }
  const generated = generateBalancedTerrain(settings);
  if (JSON.stringify(identity.baseAnchors) !== JSON.stringify(generated.baseAnchors)
    || JSON.stringify(identity.objectiveAnchors) !== JSON.stringify(generated.objectiveAnchors)) {
    throw new Error('Canyon Citadel anchors do not match its authored protection layout.');
  }
  return settings;
}

export function readTerrainDetailOptions(project: WulframProject): TerrainDetailOptions | undefined {
  const raw = project.metadata?.['terrainDetail.settings'];
  if (!raw) return undefined;
  const saved = JSON.parse(raw);
  if (!['rocks-v1', 'rocks-v2'].includes(saved.version)) throw new Error('Unsupported terrain-detail settings version.');
  return { seed: saved.seed, pairs: saved.pairs, radius: saved.radius, minHeight: saved.minHeight ?? 5, height: saved.height, textureName: saved.textureName,
    ...(saved.mode === undefined ? {} : { mode: saved.mode }),
    ...(saved.depth === undefined ? {} : { depth: saved.depth }),
    ...(saved.minDepth === undefined ? {} : { minDepth: saved.minDepth }),
    ...(saved.aspect === undefined ? {} : { aspect: saved.aspect }),
    ...(saved.rotation === undefined ? {} : { rotation: saved.rotation }),
    ...(saved.edgePower === undefined ? {} : { edgePower: saved.edgePower }) };
}

/** Replace only a verified prior pass; never discard subsequent terrain edits. */
export function previewTerrainDetail(source: WulframProject, options: TerrainDetailOptions, manifest: AssetManifest) {
  const prior = readTerrainDetailOptions(source);
  if (!prior) return generateTerrainDetail(source, options, manifest);
  const receipt = JSON.parse(source.metadata?.['terrainDetail.settings'] ?? '{}');
  if (receipt.version === 'rocks-v2' && receipt.heightProtection !== heightProtectionIdentity(source)) {
    throw new Error('Protected terrain areas changed since this detail pass. Restore those areas or Undo the detail pass before generating another. Existing terrain has not been changed.');
  }
  const baseline = structuredClone(source);
  baseline.metadata = { ...baseline.metadata };
  delete baseline.metadata['terrainDetail.settings'];
  delete baseline.metadata['terrainDetail.baseline'];
  const raw = source.metadata?.['terrainDetail.baseline'];
  if (raw) {
    const saved = JSON.parse(raw);
    if (saved.version !== 1 || JSON.stringify(saved.after) !== JSON.stringify(source.terrain)) {
      throw new Error('Terrain or structures changed after this detail pass. Replacement is blocked to preserve those edits. Undo those changes or regenerate terrain first.');
    }
    baseline.terrain = saved.before;
    // Replay also verifies the saved baseline, rather than trusting cached analysis.
  } else {
    const settings = readTerrainGeneratorSettings(source);
    if (!settings) throw new Error('No original terrain settings available for safe replacement.');
    baseline.terrain = generateBalancedTerrain(settings).terrain;
  }
  const replay = generateTerrainDetail(baseline, prior, manifest);
  if (JSON.stringify(replay.project.terrain) !== JSON.stringify(source.terrain)) {
    throw new Error('The previous detail pass cannot be reproduced exactly. Replacement is blocked to preserve existing terrain edits.');
  }
  return generateTerrainDetail(baseline, options, manifest);
}

/** A non-mutating, single-pass candidate. No engine objects or collision claims. */
export function generateTerrainDetail(source: WulframProject, options: TerrainDetailOptions, manifest: AssetManifest) {
  const minHeight = options.minHeight ?? 5;
  for (const [value, minimum, maximum] of [[options.aspect ?? 1, .2, 1], [options.rotation ?? 0, -180, 180], [options.edgePower ?? 2, 1, 6]]) {
    if (!Number.isFinite(value) || value < minimum || value > maximum) throw new Error('Use width ratio 0.2–1, rotation −180–180°, and edge profile 1–6.');
  }
  const mode = options.mode ?? 'hills';
  const depth = options.depth ?? 65, minDepth = options.minDepth ?? 5;
  if (!['hills', 'valleys', 'mixed'].includes(mode) || !Number.isFinite(depth) || !Number.isFinite(minDepth)
    || minDepth < 5 || depth < minDepth || depth > 2000) throw new Error('Choose Hills, Valleys or Mixed, with valley depths from 5–2,000 units.');
  const citadel = citadelSettings(source);
  const settings = citadel ?? readTerrainGeneratorSettings(source);
  if (!settings) throw new Error('This map has no supported route-protection metadata. Open its original editor project or use a map with saved generator settings; existing terrain has not been changed.');
  if (source.metadata?.['terrainDetail.settings']) throw new Error('Undo the previous terrain-detail pass before trying another. Passes do not stack.');
  const original = source.terrain;
  if (original.width !== settings.size || original.height !== settings.size
    || original.worldWidth !== settings.worldWidth || original.worldHeight !== settings.worldHeight) {
    throw new Error('Terrain dimensions no longer match the saved generator settings.');
  }
  if (rotationalTerrainMismatches(original) !== 0) throw new Error('Terrain must have rotationally paired heights and textures.');
  if (!Number.isInteger(options.pairs) || options.pairs < 1 || options.pairs > 60
    || !Number.isFinite(options.radius) || options.radius < 80 || options.radius > 400
    || !Number.isFinite(options.height) || options.height < 5 || options.height > MAX_TERRAIN_DETAIL_HEIGHT
    || !Number.isFinite(minHeight) || minHeight < 5 || minHeight > options.height) {
    throw new Error(`Use 1–60 pairs, radius 80–400, and heights 5–${MAX_TERRAIN_DETAIL_HEIGHT}; minimum height cannot exceed maximum.`);
  }
  if (!/^(sandrock|marsrock|rockwall|snowrocks|1snow|4snow|11ice|8ice|marslava)\d{3}$/.test(options.textureName)
    || !manifest.terrainTextures[options.textureName]) throw new Error('Choose an available rock texture.');
  let state = balancedSeedHash(options.seed);
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const generated = generateBalancedTerrain(settings);
  const project = structuredClone(source);
  const terrain = project.terrain;
  const stepX = terrain.worldWidth / (terrain.width - 1);
  const stepY = terrain.worldHeight / (terrain.height - 1);
  const eligible = terrainProtectionMask(source, manifest).map(protectedVertex => !protectedVertex);
  const candidates = eligible.flatMap((value, index) => value && index < terrain.heights.length / 2 ? [index] : []);
  // Merge protected samples into row runs instead of rendering thousands of SVG nodes.
  let protectedPath = '';
  for (let y = 0; y < terrain.height; y += 1) {
    for (let x = 0; x < terrain.width;) {
      if (eligible[y * terrain.width + x]) { x += 1; continue; }
      const start = x;
      while (x < terrain.width && !eligible[y * terrain.width + x]) x += 1;
      protectedPath += `M${start * stepX} ${y * stepY}h${(x - start) * stepX}v${stepY}h${-(x - start) * stepX}Z`;
    }
  }
  const delta = new Float64Array(terrain.heights.length);
  const paintWeight = new Float64Array(terrain.heights.length);
  const peakHeights: number[] = [];
  const centers: Array<[number, number]> = [];
  for (let attempt = 0; attempt < options.pairs * 30 && centers.length < options.pairs && candidates.length; attempt += 1) {
    const index = candidates[Math.floor(random() * candidates.length)];
    const cx = index % terrain.width * stepX;
    const cy = Math.floor(index / terrain.width) * stepY;
    const mx = terrain.worldWidth - cx; const my = terrain.worldHeight - cy;
    if (Math.hypot(cx - mx, cy - my) < options.radius * 2
      || centers.some(([x, y]) => Math.min(Math.hypot(cx - x, cy - y), Math.hypot(mx - x, my - y)) < options.radius * 2)) continue;
    // Reject the entire footprint when it touches a protected vertex. No cut-off cliffs.
    const points: Array<[number, number]> = [];
    let safe = true;
    const sampledAspect = 0.65 + random() * 0.35;
    const aspect = options.aspect ?? sampledAspect;
    const angle = (options.rotation ?? 0) * Math.PI / 180;
    for (let y = Math.max(0, Math.floor((cy - options.radius) / stepY)); y <= Math.min(terrain.height - 1, Math.ceil((cy + options.radius) / stepY)); y += 1) {
      for (let x = Math.max(0, Math.floor((cx - options.radius) / stepX)); x <= Math.min(terrain.width - 1, Math.ceil((cx + options.radius) / stepX)); x += 1) {
        const dx = x * stepX - cx, dy = y * stepY - cy;
        const distance = Math.hypot((dx * Math.cos(angle) + dy * Math.sin(angle)) / options.radius, (-dx * Math.sin(angle) + dy * Math.cos(angle)) / (options.radius * aspect));
        if (distance >= 1) continue;
        const i = y * terrain.width + x;
        if (!eligible[i]) safe = false;
        points.push([i, (1 - distance * distance) ** (options.edgePower ?? 2)]);
      }
    }
    if (!safe || !points.length) continue;
    const sample = random() ** 2;
    const valley = mode === 'valleys' || (mode === 'mixed' && centers.length % 2 === 1);
    const amplitude = valley ? -(minDepth + (depth - minDepth) * sample) : minHeight + (options.height - minHeight) * sample;
    peakHeights.push(amplitude);
    centers.push([cx, cy]);
    for (const [i, weight] of points) {
      const amount = amplitude * weight;
      if (Math.abs(amount) > Math.abs(delta[i])) delta[i] = amount;
      delta[delta.length - 1 - i] = delta[i];
      paintWeight[i] = Math.max(paintWeight[i], weight);
      paintWeight[delta.length - 1 - i] = paintWeight[i];
    }
  }
  let changedVertices = 0;
  terrain.heights = terrain.heights.map((height, i) => {
    if (!delta[i]) return height;
    changedVertices += 1;
    return Number((height + delta[i]).toFixed(6));
  });
  let tagId = terrain.tagmap2.indexOf(options.textureName);
  if (tagId < 0) { tagId = terrain.tagmap2.length; terrain.tagmap2.push(options.textureName); }
  let paintedCells = 0;
  const cellCount = (terrain.width - 1) * (terrain.height - 1);
  for (let cell = 0; cell < cellCount / 2; cell += 1) {
    const x = cell % (terrain.width - 1); const y = Math.floor(cell / (terrain.width - 1));
    const corners = [y * terrain.width + x, y * terrain.width + x + 1, (y + 1) * terrain.width + x, (y + 1) * terrain.width + x + 1];
    if (!corners.every(i => eligible[i]) || !corners.some(i => paintWeight[i] > 0.15)) continue;
    terrain.textureIds[cell] = tagId;
    terrain.textureIds[cellCount - 1 - cell] = tagId;
    paintedCells += 2;
  }
  // Cached validation reports describe the old terrain, not this new candidate.
  for (const metadata of [project.metadata, ...project.baseLayouts.map(layout => layout.metadata)]) {
    if (!metadata) continue;
    for (const key of ['generator.analysis', 'baseGenerator.analysis', 'combatTest.analysis', 'terrainDetail.analysis']) delete metadata[key];
  }
  project.metadata = { ...project.metadata, 'terrainDetail.settings': JSON.stringify({ ...options, version: 'rocks-v2', heightProtection: heightProtectionIdentity(source) }) };
  project.metadata['terrainDetail.baseline'] = JSON.stringify({ version: 1, before: original, after: terrain });
  const analysis = analyzeBalancedProject(project, generated.baseAnchors, generated.objectiveAnchors, {}, manifest);
  const active = project.baseLayouts.find(layout => layout.id === project.activeBaseLayoutId);
  const basesRequired = project.metadata?.['generator.stage'] === 'terrain-only-bases-required'
    && !project.entities.some(entity => entity.team === 1 || entity.team === 2)
    && Boolean(active && JSON.stringify(active.entities) === JSON.stringify(project.entities));
  // The authored Power Run outpost deliberately starts without power. This is
  // a terrain-only exception for that exact unchanged entity, never a general
  // waiver for neutral units or other base/power failures.
  let expectedOutpostId: string | undefined;
  try {
    const outpost = JSON.parse(source.metadata?.['showcase.outpost'] ?? 'null');
    const matching = source.entities.filter(entity => entity.id === 'central-neutral-repair-1');
    const entity = matching[0];
    if (citadel && outpost?.version === 'central-neutral-repair-v2'
      && outpost.entityId === 'central-neutral-repair-1' && outpost.startsUnpowered === true
      && matching.length === 1 && entity.token === 'r' && entity.team === 0 && entity.active === 1
      && entity.position[0] === 3200 && entity.position[1] === 3200
      && JSON.stringify(project.entities.find(next => next.id === entity.id)) === JSON.stringify(entity)) {
      expectedOutpostId = entity.id;
    }
  } catch { /* Invalid outpost metadata grants no exception. */ }
  const expectedOutpostIssues = analysis.projectIssues.filter(issue => issue.severity === 'error'
    && issue.code === 'power' && issue.entityId === expectedOutpostId);
  const blockingIssues = analysis.projectIssues.filter(issue => issue.severity === 'error'
    && !(basesRequired && (issue.code === 'state-uplink' || issue.code === 'state-powered-repair'))
    && !expectedOutpostIssues.includes(issue));
  // Full analysis keeps its original verdict and all reported issues.
  const detailPassed = analysis.terrain.passed && analysis.entityPairing.passed && blockingIssues.length === 0;
  return { project, analysis, basesRequired, expectedOutpostIssues, blockingIssues, passed: changedVertices > 0 && detailPassed, changedVertices, paintedCells,
    placedPairs: centers.length, centers, peakHeights, protectedPath, protectedVertices: eligible.filter(value => !value).length,
    options: { ...options, minHeight },
    result: { ...generated, terrain, project } };
}
