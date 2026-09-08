import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const standalone = 'tools/mcp/MapEditerMCP';
const pairs = [
  ['tools/mcp/editor-client.mjs', `${standalone}/editor-client.mjs`],
  ...['map-package.ts', 'map-source.ts', 'wulfram.ts', 'sky-settings.ts'].map(name =>
    [`lib/${name}`, `${standalone}/lib/${name}`]),
  ...['project.json', 'Three-Lane-Citadel-v1.zip'].map(name =>
    [`outputs/three-lane-citadel-v1-final/${name}`, `${standalone}/fixtures/three-lane-citadel/${name}`]),
];
const failures = [];
const text = bytes => bytes.toString('utf8').replace(/\r\n/g, '\n');
for (const [left, right] of pairs) {
  try {
    const [a, b] = await Promise.all([fs.readFile(path.join(root, left)), fs.readFile(path.join(root, right))]);
    const matches = left.endsWith('.zip') ? a.equals(b) : text(a) === text(b);
    if (!matches) failures.push(`${left} differs from ${right}`);
  } catch (error) { failures.push(error.message); }
}
try {
  const [integrated, packaged] = await Promise.all([
    fs.readFile(path.join(root, 'tools/mcp/MCPserver.mjs')),
    fs.readFile(path.join(root, standalone, 'MCPserver.mjs')),
  ]);
  const normalized = text(integrated)
    .replace("from '../../lib/map-package.ts'", "from './lib/map-package.ts'")
    .replace("path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')", 'path.dirname(fileURLToPath(import.meta.url))');
  if (normalized !== text(packaged)) failures.push('Integrated and standalone MCP server definitions differ beyond intentional packaging paths.');
} catch (error) { failures.push(error.message); }
if (failures.length) {
  console.error(`MCP synchronization failed:\n${failures.map(message => `- ${message}`).join('\n')}`);
  process.exitCode = 1;
} else console.log('MCP synchronization passed: clients, server definitions, four serializers, and two fixtures.');
