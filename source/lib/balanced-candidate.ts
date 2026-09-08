import { balancedSeedHash, generateBalancedProject, type BalancedProjectOptions, type BalancedProjectResult } from './balanced-map-generator.ts';
import { generateBalancedBase } from './balanced-base-generator.ts';
import { analyzeBalancedTerrain } from './balanced-map-analysis.ts';
import { preserveRegenerationContext } from './generator-settings.ts';
import { synchronizeActiveBaseLayout, type AssetManifest, type BaseTemplate, type WulframProject } from './wulfram.ts';

/** Shared rules for Balanced starter bases and the Random base workflow. */
export function buildBalancedCandidate(options: BalancedProjectOptions, template: BaseTemplate, manifest: AssetManifest, source?: WulframProject) {
  const result = generateBalancedProject(options, template, manifest);
  if (source?.metadata?.['generator.parameters']) result.project = preserveRegenerationContext(source, result.project);
  const base = generateBalancedBase(result.project, template, {
    seed: options.seed.length <= 192 ? `${options.seed}-starter`
      : `${result.identity.seed.slice(0, 172)}~${balancedSeedHash(result.identity.seed).toString(16)}-starter`,
    footprint: 2000, spacing: 1, rotation: 0,
  }, manifest);
  result.project = base.project;
  return { result, analysis: { ...base.analysis, passed: base.passed }, baseMessage: base.message };
}

/** Explicit incomplete terrain-first project; never imports a rejected team base. */
export function terrainOnlyCandidate(result: BalancedProjectResult): WulframProject {
  const analysis = analyzeBalancedTerrain(result.project.terrain, result.baseAnchors, result.objectiveAnchors);
  if (!analysis.passed) throw new Error('Terrain checks must pass before terrain-only application.');
  const project = structuredClone(result.project);
  project.entities = project.entities.filter(entity => entity.team !== 1 && entity.team !== 2);
  synchronizeActiveBaseLayout(project, project.updatedAt);
  const active = project.baseLayouts.find(layout => layout.id === project.activeBaseLayoutId)!;
  for (const key of Object.keys(active.metadata)) {
    if (key.startsWith('baseGenerator.') || key === 'generator.analysis' || key === 'combatTest.analysis') delete active.metadata[key];
  }
  active.name = 'Terrain only — bases required';
  project.metadata = { ...project.metadata, 'generator.stage': 'terrain-only-bases-required' };
  return project;
}
