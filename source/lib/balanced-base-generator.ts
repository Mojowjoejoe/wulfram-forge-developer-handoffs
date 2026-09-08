import { balancedSeedHash, rotationalTerrainMismatches } from './balanced-map-generator.ts';
import { analyzeBalancedProject } from './balanced-map-analysis.ts';
import { placeBaseWithRules } from './base-placement-rules.ts';
import { instantiatePairedTemplate } from './paired-template.ts';
import { CATALOG, structureTerrainClearance, synchronizeActiveBaseLayout, type AssetManifest, type BaseTemplate, type WulframProject } from './wulfram.ts';

export interface BalancedBaseOptions {
  seed: string;
  footprint: number;
  spacing: number;
  rotation: number;
}

/** Replaces team structures in the active state only; never sculpts terrain. */
export function generateBalancedBase(project: WulframProject, template: BaseTemplate, options: BalancedBaseOptions, manifest?: AssetManifest) {
  const seed = options.seed.trim();
  let state = balancedSeedHash(seed);
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  if (!Number.isFinite(options.footprint) || options.footprint < 100 || options.footprint > 2000
    || !Number.isFinite(options.spacing) || options.spacing < 0.5 || options.spacing > 1.5
    || !Number.isFinite(options.rotation) || options.rotation < 0 || options.rotation > 360) {
    throw new Error('Use footprint 100–2000, spacing 0.5–1.5, and rotation 0–360°.');
  }
  if (rotationalTerrainMismatches(project.terrain) !== 0) throw new Error('This sprint requires rotationally symmetric generated terrain.');
  const parameters = JSON.parse(project.metadata?.['generator.parameters'] ?? 'null');
  if (!parameters) throw new Error('Generate and apply a balanced terrain candidate first.');
  const separation = parameters.baseSeparation ?? 0.46;
  if (!Number.isFinite(separation) || separation < 0.3 || separation > 0.65) throw new Error('Generated base anchors are invalid.');
  const terrain = project.terrain;
  const anchors: [[number, number], [number, number]] = [
    [terrain.worldWidth * (0.5 - separation / 2), terrain.worldHeight * (0.5 - separation / 2)],
    [terrain.worldWidth * (0.5 + separation / 2), terrain.worldHeight * (0.5 + separation / 2)],
  ];
  let variant = structuredClone(template);
  for (const unit of variant.units) {
    // A small seeded radial variation keeps the template's functional grouping.
    const factor = options.spacing * (0.95 + random() * 0.1);
    unit.offset = [unit.offset[0] * factor, unit.offset[1] * factor];
  }
  if (!variant.units.some((unit) => unit.token === 'u')) {
    variant.units.push({ token: 'u', offset: [150, -150], groundOffset: 3, rotation: [0, 0, 0], active: 1 });
  }
  variant.unitCount = variant.units.length;
  const rules = placeBaseWithRules(project, variant, anchors, options.footprint, options.rotation * Math.PI / 180, manifest, random);
  if (!rules.passed) {
    const unchanged = structuredClone(project);
    return { project: unchanged, analysis: analyzeBalancedProject(unchanged, anchors, [[terrain.worldWidth / 2, terrain.worldHeight / 2]], {}, manifest),
      fit: false, passed: false, seed, options: { ...options, seed },
      message: `Rejected; preview shows the unchanged current layout. ${rules.message}` };
  }
  variant = rules.template;
  const fitsFootprint = variant.units.every((unit) => Math.hypot(...unit.offset) <= options.footprint / 2);
  const placements = anchors.map((anchor, index) => {
    let sequence = 0;
    return instantiatePairedTemplate(variant, terrain, anchor, index + 1, 1,
      options.rotation * Math.PI / 180 + index * Math.PI, manifest, undefined,
      () => `base-${balancedSeedHash(seed).toString(16)}-${index + 1}-${++sequence}`);
  });
  const fit = rules.passed && fitsFootprint && placements.every((placement, index) => placement.skippedWithoutModel === 0
    && placement.entities.length === variant.units.length && placement.scale === 1
    && Math.hypot(placement.anchor[0] - anchors[index][0], placement.anchor[1] - anchors[index][1]) < 1e-6
    && placement.entities.every((entity) => {
      const footprint = CATALOG.find((item) => item.token === entity.token && (entity.token !== 'c' || item.subtype === entity.subtype))?.footprint ?? 10;
      const radius = structureTerrainClearance(entity, manifest, footprint, 0).footprint / Math.SQRT2;
      return Math.hypot(entity.position[0] - anchors[index][0], entity.position[1] - anchors[index][1]) + radius <= options.footprint / 2
        && entity.position[0] >= radius && entity.position[0] <= terrain.worldWidth - radius
        && entity.position[1] >= radius && entity.position[1] <= terrain.worldHeight - radius;
    }));
  const candidate = structuredClone(project);
  candidate.entities = [...candidate.entities.filter((entity) => entity.team !== 1 && entity.team !== 2), ...placements.flatMap((placement) => placement.entities)];
  synchronizeActiveBaseLayout(candidate, project.updatedAt);
  candidate.baseLayouts = candidate.baseLayouts.map((layout) => layout.id === candidate.activeBaseLayoutId ? layout : structuredClone(project.baseLayouts.find((original) => original.id === layout.id)!));
  const active = candidate.baseLayouts.find((layout) => layout.id === candidate.activeBaseLayoutId)!;
  active.metadata = { ...active.metadata, 'baseGenerator.identity': JSON.stringify({ version: 'terrain-base-v1', template: template.id, ...options, seed }) };
  const analysis = analyzeBalancedProject(candidate, anchors, [[terrain.worldWidth / 2, terrain.worldHeight / 2]], {}, manifest);
  if (fit && analysis.passed && candidate.metadata) {
    if (candidate.metadata['generator.stage'] === 'terrain-only-bases-required'
      && active.name === 'Terrain only — bases required') active.name = 'Generated balanced bases';
    delete candidate.metadata['generator.stage'];
  }
  active.metadata['baseGenerator.analysis'] = JSON.stringify({ fit, analysis, placementRules: { version: 'paired-placement-v1', attempts: rules.attempts, added: rules.added, passed: rules.passed } });
  return { project: candidate, analysis, fit, passed: fit && analysis.passed, seed, options: { ...options, seed },
    message: !rules.passed ? rules.message : !fit ? 'Template exceeds the footprint, map bounds, or available models.' : analysis.passed ? rules.message : `${rules.message} Final fairness or state checks failed; candidate cannot be applied.` };
}
