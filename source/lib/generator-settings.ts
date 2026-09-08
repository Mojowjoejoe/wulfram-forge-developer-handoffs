import { BALANCED_GENERATOR_VERSION, generateBalancedTerrain, type BalancedMapTopology } from './balanced-map-generator.ts';
import type { WulframProject } from './wulfram.ts';

function record(raw: string, label: string): Record<string, unknown> {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error(`${label} is not valid JSON.`); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is missing or invalid.`);
  return value;
}
function number(value: unknown, fallback: number, label: string): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} must be finite.`);
  return value;
}

/** Load design inputs only. Stored analysis never grants a passing result. */
export function readTerrainGeneratorSettings(project: WulframProject) {
  const metadata = project.metadata;
  if (!metadata?.['generator.parameters']) return undefined;
  if (metadata['generator.version'] !== BALANCED_GENERATOR_VERSION) throw new Error('Unsupported saved terrain generator version.');
  const p = record(metadata['generator.parameters'], 'Saved terrain settings');
  const options = {
    name: project.name,
    seed: text(metadata['generator.seed'], 'Saved terrain seed'),
    topology: text(metadata['generator.topology'], 'Saved layout') as BalancedMapTopology,
    size: number(p.size, 129, 'Grid size'),
    worldWidth: number(p.worldWidth, 5600, 'World width'),
    worldHeight: number(p.worldHeight, 5600, 'World height'),
    relief: number(p.relief, 524, 'Relief'), baseHeight: number(p.baseHeight, 0, 'Base height'),
    baseSeparation: number(p.baseSeparation, 0.46, 'Base separation'),
    routeWidth: number(p.routeWidth, 1, 'Route width'),
    centralAreaSize: number(p.centralAreaSize, 1, 'Central area'),
    textureName: text(p.textureName, 'Saved terrain texture'),
  };
  // Use the generator's existing input contract rather than a weaker second schema.
  generateBalancedTerrain(options);
  return { ...options, templateId: text(p.baseTemplate, 'Saved starter template') };
}

export function readBaseGeneratorSettings(project: WulframProject) {
  const raw = project.baseLayouts.find(layout => layout.id === project.activeBaseLayoutId)?.metadata?.['baseGenerator.identity'];
  if (!raw) return undefined;
  const p = record(raw, 'Saved base settings');
  if (p.version !== 'terrain-base-v1') throw new Error('Unsupported saved base generator version.');
  const options = { seed: text(p.seed, 'Saved base seed'), templateId: text(p.template, 'Saved base template'),
    footprint: number(p.footprint, 1000, 'Base diameter'), spacing: number(p.spacing, 1, 'Base spacing'), rotation: number(p.rotation, 0, 'Base rotation') };
  if (options.seed.length > 200 || options.footprint < 100 || options.footprint > 2000 || options.spacing < 0.5 || options.spacing > 1.5 || options.rotation < 0 || options.rotation > 360) throw new Error('Saved base settings are outside supported limits.');
  return options;
}

/** Regeneration replaces the active team formation, not unrelated saved layouts. */
export function preserveRegenerationContext(source: WulframProject, generated: WulframProject): WulframProject {
  const next = structuredClone(generated);
  const priorActive = source.baseLayouts.find(layout => layout.id === source.activeBaseLayoutId);
  const freshActive = next.baseLayouts.find(layout => layout.id === next.activeBaseLayoutId)!;
  const retainedMetadata = Object.fromEntries(Object.entries(priorActive?.metadata ?? {})
    .filter(([key]) => !key.startsWith('generator.') && !key.startsWith('baseGenerator.') && !key.startsWith('combatTest.')));
  freshActive.id = source.activeBaseLayoutId;
  if (priorActive && priorActive.name !== 'Terrain only — bases required') freshActive.name = priorActive.name;
  next.validation = { ...source.validation };
  freshActive.validation = { ...source.validation };
  freshActive.metadata = { ...retainedMetadata, ...freshActive.metadata };
  next.activeBaseLayoutId = source.activeBaseLayoutId;
  const neutrals = structuredClone(source.entities.filter(entity => entity.team !== 1 && entity.team !== 2));
  next.entities = [...next.entities, ...neutrals];
  freshActive.entities = structuredClone(next.entities);
  next.baseLayouts = source.baseLayouts.map(layout => layout.id === source.activeBaseLayoutId ? freshActive : structuredClone(layout));
  next.metadata = { ...Object.fromEntries(Object.entries(source.metadata ?? {}).filter(([key]) => !key.startsWith('generator.') && !key.startsWith('combatTest.') && !key.startsWith('terrainDetail.'))), ...next.metadata };
  return next;
}
