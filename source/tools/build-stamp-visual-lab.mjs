import fs from 'node:fs/promises';
import path from 'node:path';
import { createMapArchive, readMapArchive } from '../lib/map-package.ts';
import { generateBalancedProject } from '../lib/balanced-map-generator.ts';
import { COMBAT_BASE_TEMPLATE } from '../lib/combat-base-template.ts';
const manifest = JSON.parse(await fs.readFile('public/assets/manifest.json', 'utf8'));
const project = generateBalancedProject({ seed: 'stamp-visual-lab', topology: 'three-route', size: 257,
  worldWidth: 4000, worldHeight: 4000, relief: 180, textureName: 'canyon003' }, COMBAT_BASE_TEMPLATE, manifest).project;
project.name = 'Landform visual lab';
project.entities = []; project.baseLayouts = project.baseLayouts.map(l => ({ ...l, entities: [], metadata: {} }));
project.metadata = {};
project.terrain.heights.fill(0);
// A uniform native texture removes existing topography/paint as visual confounders.
const id = project.terrain.tagmap2.findIndex(t => t.trim() === 'canyon003');
if (id < 0) throw new Error('Missing laboratory texture');
project.terrain.textureIds.fill(id);
const out = await fs.mkdtemp(path.resolve('outputs-stamp-lab-'));
const bytes = Buffer.from(await createMapArchive(project));
const entries = await readMapArchive(bytes);
if (!entries.some(e => e.name.endsWith('/wulfram-project.json'))) throw new Error('Missing project');
await fs.writeFile(path.join(out, 'Landform-visual-lab.zip'), bytes);
console.log(path.join(out, 'Landform-visual-lab.zip'));
