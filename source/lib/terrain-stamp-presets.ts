import type { TerrainStampOptions } from './terrain-stamp.ts';
const base = { radius: 600, aspect: .5, length: 1400, width: 700, rotation: 0, amplitude: 220, edgePower: 2,
  mirror: false, seed: 'landform-001', naturalness: .6, roughness: .15, bend: .5, blend: .3, shapeVersion: 'natural-v2' as const,
  textureName: undefined, textureCoverage: .6 };
export const TERRAIN_STARTER_PRESETS: Array<{ name: string; options: Omit<TerrainStampOptions, 'x' | 'y'> }> = [
  { name: 'Mountain Ridge', options: { ...base, preset: 'ridge' } },
  { name: 'Winding Valley', options: { ...base, preset: 'valley', amplitude: 160, bend: .9, width: 1000 } },
  { name: 'Impact Crater', options: { ...base, preset: 'crater', length: 1200, width: 1200, amplitude: 250, bend: 0 } },
  { name: 'Gentle Foothills', options: { ...base, preset: 'ridge', length: 1600, width: 1000, amplitude: 35, blend: .7, roughness: .05 } },
  { name: 'Mountain Pass', options: { ...base, preset: 'saddle', width: 1200, amplitude: 180, bend: .2 } },
  { name: 'Flat-top Mesa', options: { ...base, preset: 'mesa', length: 1500, width: 1300, amplitude: 260, bend: 0, roughness: .2 } },
  { name: 'Broad Basin', options: { ...base, preset: 'basin', length: 1800, width: 1500, amplitude: 140, bend: 0, blend: .5 } },
];
