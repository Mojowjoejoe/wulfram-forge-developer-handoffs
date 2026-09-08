import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import JSZip from 'jszip';

const ARCHIVE_DATE = new Date('2000-01-01T00:00:00.000Z');
const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webRoot = path.join(workspace, 'desktop', 'WulframForge', 'wwwroot');
const output = path.join(workspace, 'desktop', 'WulframForge', 'WebAssets.zip');

export async function createDesktopAssets(sourceDirectory = webRoot) {
  const assetRoot = path.resolve(sourceDirectory);
  if (!fs.existsSync(path.join(assetRoot, 'index.html'))) throw new Error('Desktop web assets are not built. Run the desktop Vite build first.');
  const zip = new JSZip();
  const pending = [assetRoot];
  const files = [];
  while (pending.length) {
    const directory = pending.pop();
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) pending.push(absolute);
      else if (entry.isFile()) files.push(absolute);
    }
  }
  files.sort((left, right) => left.localeCompare(right));
  for (const file of files) {
    zip.file(path.relative(assetRoot, file).replaceAll(path.sep, '/'), fs.readFileSync(file), {
      date: ARCHIVE_DATE,
      unixPermissions: 0o644,
    });
  }
  const archive = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
    platform: 'UNIX',
  });
  fs.writeFileSync(output, archive);
  console.log(`Embedded ${files.length} web assets in ${path.relative(workspace, output)} (${(archive.length / 1024 / 1024).toFixed(1)} MiB).`);
  return output;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]).toLowerCase() === fs.realpathSync(fileURLToPath(import.meta.url)).toLowerCase()) {
  createDesktopAssets(process.argv[2]).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
