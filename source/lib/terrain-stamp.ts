import type { TerrainData } from './wulfram.ts';

export const TERRAIN_STAMPS = ['ridge', 'valley', 'crater', 'saddle', 'mesa', 'basin'] as const;
export interface TerrainStampOptions {
  preset: typeof TERRAIN_STAMPS[number];
  x: number; y: number;
  radius: number;
  aspect: number;
  rotation: number;
  amplitude: number;
  edgePower: number;
  mirror: boolean;
  length?: number;
  width?: number;
  seed?: string;
  naturalness?: number;
  roughness?: number;
  bend?: number;
  blend?: number;
  textureName?: string;
  textureCoverage?: number;
  shapeVersion?: 'natural-v2';
}

const phaseCache = new Map<string, number>();
function stampPhase(seed: string, naturalV2: boolean): number {
  const key = JSON.stringify([seed, naturalV2]);
  const cached = phaseCache.get(key); if (cached !== undefined) return cached;
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  if (naturalV2) {
    // Avalanche nearby text seeds without changing legacy saved shapes.
    hash ^= hash >>> 16; hash = Math.imul(hash, 0x85ebca6b);
    hash ^= hash >>> 13; hash = Math.imul(hash, 0xc2b2ae35); hash ^= hash >>> 16;
  }
  const phase = (hash >>> 0) / 4294967296 * Math.PI * 2;
  if (phaseCache.size >= 32) phaseCache.clear();
  phaseCache.set(key, phase); return phase;
}

/** Legacy radius/ratio presets retain exactly the same physical dimensions. */
export function terrainStampDimensions(options: TerrainStampOptions) {
  return { length: options.length ?? options.radius * 2, width: options.width ?? options.radius * options.aspect * 2 };
}

/** Signed, smoothly bounded heightfield. Rotation is in world XY degrees. */
export function terrainStampWeight(dx: number, dy: number, options: TerrainStampOptions): number {
  const angle = options.rotation * Math.PI / 180;
  const dimensions = terrainStampDimensions(options);
  const x = (dx * Math.cos(angle) + dy * Math.sin(angle)) / (dimensions.length / 2);
  const y = (-dx * Math.sin(angle) + dy * Math.cos(angle)) / (dimensions.width / 2);
  const r2 = x * x + y * y;
  if (r2 >= 1) return 0;
  const phase = stampPhase(options.seed ?? 'landform-001', options.shapeVersion === 'natural-v2');
  if(options.preset==='mesa'||options.preset==='basin'){
    // Constant central displacement preserves a level top/floor on flat ground.
    // Only the shoulder varies: existing terrain underneath is not flattened.
    const theta=Math.atan2(y,x),variation=options.naturalness??0;
    const outer=.95-.1*variation*(.5+.5*Math.sin(theta*3+phase))-.04*(options.roughness??0)*(.5+.5*Math.sin(theta*7-phase));
    const inner=(options.preset==='mesa'?.4:.52)*(1-.3*(options.blend??0));
    const t=Math.max(0,Math.min(1,(Math.sqrt(r2)-inner)/(outer-inner)));
    const shoulder=1-t*t*(3-2*t);
    if(shoulder===0)return 0;
    return (options.preset==='mesa'?1:-1)*shoulder**(1+(options.edgePower-1)*.3);
  }
  if (options.shapeVersion === 'natural-v2') {
    const variation = options.naturalness ?? .6;
    const bend = (options.bend ?? 0) * .4 * Math.sin(x * Math.PI + phase) * (1 - x * x);
    const cross = y - bend;
    const feather = Math.min(1, Math.max(0, (1 - r2) / (.2 + (options.blend ?? 0) * .6)));
    const edge = feather * feather * (3 - 2 * feather);
    const width = .2 + .1 * variation * Math.sin(x * 4 + phase);
    const crest = .78 + .22 * Math.cos(x * 6 + phase) * variation;
    const rough = 1 - (options.roughness ?? 0) * .15 * (.5 + .5 * Math.sin(x * 17 + phase) * Math.cos(y * 13));
    let profile: number;
    if (options.preset === 'ridge') profile = Math.exp(-Math.pow(cross / width, 2)) * crest;
    else if (options.preset === 'valley') profile = -Math.exp(-Math.pow(cross / (width * 1.7), 4));
    else if (options.preset === 'crater') {
      const r = Math.sqrt(r2), theta = Math.atan2(y, x);
      const rim = .65 + .06 * variation * Math.sin(theta * 3 + phase);
      profile = .72 * Math.exp(-Math.pow((r - rim) / .1, 2)) - .85 * Math.exp(-Math.pow(r / .48, 4));
    } else {
      const shoulder = .42 + .04 * variation * Math.sin(x * 4 + phase);
      profile = .85 * Math.exp(-Math.pow((cross - shoulder) / .24, 2)) + .85 * Math.exp(-Math.pow((cross + shoulder) / .24, 2)) - .28 * Math.exp(-Math.pow(cross / .18, 2));
    }
    profile = Math.max(-1, Math.min(1, profile));
    return Math.sign(profile) * Math.abs(profile) ** (1 + (options.edgePower - 1) * .3) * edge * rough * (1 - .2 * x * x);
  }
  const bend = (options.bend ?? 0) * .55 * Math.sin(x * Math.PI + phase);
  const organicAmount = Math.max(options.naturalness ?? 0, Math.abs(options.bend ?? 0));
  const organic = 1 - organicAmount * (1 - Math.exp(-3 * (y - bend) ** 2 - .5 * (.5 + .5 * Math.sin(x * 7 + phase)))) * .8;
  const rough = 1 - (options.roughness ?? 0) * .7 * (.5 + .5 * Math.sin(x * 13 + phase) * Math.cos(y * 11 - phase));
  const envelope = (1 - r2) ** (options.edgePower + (options.blend ?? 0) * 3) * organic * rough;
  if (options.preset === 'valley') return -envelope;
  if (options.preset === 'crater') return (4 * r2 - 1) * envelope;
  if (options.preset === 'saddle') return (x * x - y * y) * 4 * envelope;
  return envelope;
}

export function stampTerrain(terrain: TerrainData, options: TerrainStampOptions,
  protectedCircles: Array<{ x: number; y: number; radius: number }> = [], protectedMask?: boolean[]) {
  if (protectedMask && protectedMask.length !== terrain.heights.length) throw new Error('Protection mask does not match terrain.');
  if (!TERRAIN_STAMPS.includes(options.preset) || typeof options.mirror !== 'boolean') throw new Error('Choose a terrain preset.');
  if (options.shapeVersion !== undefined && options.shapeVersion !== 'natural-v2') throw new Error('Unknown landform shape version.');
  if (options.seed !== undefined && (typeof options.seed !== 'string' || options.seed.length > 200)) throw new Error('Use a variation seed of at most 200 characters.');
  for (const value of [options.naturalness ?? 0, options.roughness ?? 0, options.blend ?? 0, options.textureCoverage ?? .6]) {
    if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error('Natural variation, roughness, blending and texture coverage must be 0–100%.');
  }
  if (!Number.isFinite(options.bend ?? 0) || Math.abs(options.bend ?? 0) > 1) throw new Error('Bend must be −100–100%.');
  for (const [value, min, max] of [[options.x, 0, terrain.worldWidth], [options.y, 0, terrain.worldHeight],
    [options.radius, 80, 2000], [options.aspect, .2, 1], [options.rotation, -180, 180],
    [options.amplitude, 5, 2000], [options.edgePower, 1, 6]]) {
    if (!Number.isFinite(value) || value < min || value > max) throw new Error('Stamp settings are outside the displayed limits.');
  }
  const stepX = terrain.worldWidth / (terrain.width - 1), stepY = terrain.worldHeight / (terrain.height - 1);
  const dimensions = terrainStampDimensions(options);
  if (!Number.isFinite(dimensions.length) || !Number.isFinite(dimensions.width) || dimensions.length < 160 || dimensions.length > 4000 || dimensions.width < 32 || dimensions.width > 4000) throw new Error('Use length 160–4,000 u and width 32–4,000 u.');
  if (Math.min(dimensions.length, dimensions.width) / 2 < Math.max(stepX, stepY)) throw new Error('Stamp is too narrow for this terrain grid. Increase length or width.');
  // Conservative circular bound: do not truncate stamps at the map edge.
  if (Math.min(options.x, options.y, terrain.worldWidth - options.x, terrain.worldHeight - options.y) <= Math.max(dimensions.length, dimensions.width) / 2) {
    throw new Error('Move the stamp farther from the map edge or reduce its size.');
  }
  const deltas = terrain.heights.map((_, i) => {
    const x = i % terrain.width * stepX, y = Math.floor(i / terrain.width) * stepY;
    const first = terrainStampWeight(x - options.x, y - options.y, options);
    const partner = options.mirror ? terrainStampWeight(terrain.worldWidth - x - options.x, terrain.worldHeight - y - options.y, options) : 0;
    // Keep legacy kernels reproducible, but reject new placements with their discontinuous overlap.
    // Continuous bounded blend: mirrored pairs never double the requested amplitude.
    const weight = options.shapeVersion === 'natural-v2'
      ? (first + partner) / (1 + Math.abs(first * partner))
      : first && partner ? (first + partner) / 2 : first || partner;
    if (weight && protectedMask?.[i]) throw new Error('Stamp touches a protected route, base or center. Move it or reduce its size.');
    if (weight && protectedCircles.some(c => Math.hypot(x - c.x, y - c.y) <= c.radius + Math.hypot(stepX, stepY))) {
      throw new Error('Stamp touches a structure reserve. Move it or reduce its size; no terrain was changed.');
    }
    if (options.shapeVersion === undefined && first && partner) throw new Error('Legacy mirrored stamps overlap and can create cliffs. Switch to Natural landforms, reduce size, move farther from the center, or disable Mirror partner.');
    return weight * options.amplitude;
  });
  const heights = terrain.heights.map((h, i) => deltas[i] === 0 ? h : Number((h + deltas[i]).toFixed(6)));
  const changed = heights.filter((h, i) => h !== terrain.heights[i]).length;
  if (!changed) throw new Error('No terrain vertices covered. Increase the stamp size.');
  return { terrain: { ...terrain, heights }, deltas, changed };
}

export function rotateTerrainStamp(rotation: number, direction: number): number {
  return ((rotation + Math.sign(direction) * 15 + 540) % 360) - 180;
}
