import JSZip from 'jszip';
import { analyzeBalancedProject } from './balanced-map-analysis.ts';
import { generateBalancedTerrain } from './balanced-map-generator.ts';
import { readTerrainGeneratorSettings } from './generator-settings.ts';
import { createMapArchive } from './map-package.ts';
import { validateProject, type AssetManifest, type WulframProject } from './wulfram.ts';

export interface DiagnosticContext {
  surface: 'editor' | 'balanced' | 'random-base' | 'terrain-detail';
  draft?: unknown;
  message?: string;
  candidate?: WulframProject;
  candidatePassed?: boolean;
  candidateIsCurrent?: boolean;
}

/** Read-only snapshot: preserve raw active-layout inconsistencies for diagnosis. */
export function inspectDiagnosticProject(project: WulframProject, manifest: AssetManifest) {
  const active = project.baseLayouts.find(layout => layout.id === project.activeBaseLayoutId);
  let balance: unknown;
  try {
    const settings = readTerrainGeneratorSettings(project);
    if (settings) {
      const terrain = generateBalancedTerrain(settings);
      balance = analyzeBalancedProject(project, terrain.baseAnchors, terrain.objectiveAnchors, {}, manifest);
    } else balance = { unavailable: 'No saved terrain-generator settings; no route anchors inferred.' };
  } catch (error) { balance = { unavailable: error instanceof Error ? error.message : String(error) }; }
  return {
    activeLayoutId: project.activeBaseLayoutId,
    activeLayoutFound: Boolean(active),
    activeEntitiesMatchWorkingEntities: Boolean(active && JSON.stringify(active.entities) === JSON.stringify(project.entities)),
    workingEntityCount: project.entities.length,
    workingValidation: validateProject(project),
    layouts: project.baseLayouts.map(layout => ({ id: layout.id, name: layout.name, entityCount: layout.entities.length,
      issues: validateProject({ ...project, entities: layout.entities, validation: layout.validation }) })),
    balance,
  };
}

export async function createEditorDiagnostics(project: WulframProject, manifest: AssetManifest, context: DiagnosticContext) {
  const snapshot = structuredClone(project);
  const captured = structuredClone(context);
  const zip = new JSZip();
  const options = { date: new Date('2000-01-01T00:00:00Z') };
  const json = (name: string, value: unknown) => zip.file(name, JSON.stringify(value, null, 2), options);
  json('working-project.json', snapshot);
  json('context.json', { ...captured, candidate: undefined });
  json('validation.json', inspectDiagnosticProject(snapshot, manifest));
  json('asset-bounds.json', { models: manifest.models, terrainTextures: manifest.terrainTextures });
  json('format.json', { format: 'wulfram-editor-diagnostics', version: 1, featureRevision: 'rc19-diagnostics-v1' });
  try { zip.file('importable-map.zip', await createMapArchive(snapshot), options); }
  catch (error) { json('map-export-error.json', { message: String(error) }); }
  if (captured.candidate) {
    json('candidate-project.json', captured.candidate);
    json('candidate-validation.json', inspectDiagnosticProject(captured.candidate, manifest));
  }
  zip.file('README.txt', 'Local diagnostic snapshot. No upload was performed. Includes full map content, names, user metadata, current draft settings and optional preview. Review before sharing. Does not collect accounts, browser storage, filesystem paths, Git credentials or screenshots. Raw working-project.json preserves selected-layout inconsistencies; importable-map.zip is a canonicalized convenience export. Validation is offline, not native UI or live-game proof.', options);
  return zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}
