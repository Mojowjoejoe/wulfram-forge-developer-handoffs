import fs from 'node:fs';
import JSZip from 'jszip';
import { inspectDiagnosticProject } from '../lib/editor-diagnostics.ts';

const input = process.argv[2];
if (!input) throw new Error('Usage: npm run diagnostics:inspect -- path/to/map-diagnostics.zip');
const bytes = fs.readFileSync(input);
if (bytes.length > 100 * 1024 * 1024) throw new Error('Diagnostics ZIP exceeds 100 MiB limit.');
const zip = await JSZip.loadAsync(bytes);
const json = async name => {
  const entry = zip.file(name);
  if (!entry) throw new Error(`Missing ${name}`);
  return JSON.parse(await entry.async('string'));
};
const format = await json('format.json');
if (format.format !== 'wulfram-editor-diagnostics' || format.version !== 1) throw new Error('Unsupported diagnostics format.');
const manifest = await json('asset-bounds.json');
const project = await json('working-project.json');
const context = await json('context.json');
console.log(JSON.stringify({ format, context, working: inspectDiagnosticProject(project, manifest),
  candidate: zip.file('candidate-project.json') ? inspectDiagnosticProject(await json('candidate-project.json'), manifest) : null }, null, 2));
