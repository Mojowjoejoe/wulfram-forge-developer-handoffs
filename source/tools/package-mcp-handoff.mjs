import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import JSZip from 'jszip';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'outputs','mcp-developer-handoff-2026-09-06');
const zipPath=path.join(out,'Wulfram-Forge-MCP-Developer-Handoff.zip');
assert.ok(!fs.existsSync(zipPath),'Preserve existing handoffs.');
const files=new Map();
function add(relative){
  const absolute=path.join(root,relative),stat=fs.lstatSync(absolute);
  assert.ok(!stat.isSymbolicLink(),`Unexpected link: ${relative}`);
  if(stat.isDirectory())for(const name of fs.readdirSync(absolute).sort())add(`${relative}/${name}`);
  else files.set(`source/${relative}`,fs.readFileSync(absolute));
}
for(const dir of ['app','components','hooks','lib','desktop-web','public'])add(dir);
for(const file of ['package.json','package-lock.json','tsconfig.json','next-env.d.ts','next.config.ts','vite.config.ts','vite.desktop.config.ts','components.json','.gitignore','.gitattributes','.oxlintrc.json','.oxfmtrc.json','Launch Forge MCP.cmd','tools/create-desktop-assets.mjs','tools/package-mcp-handoff.mjs','tests/mcp.test.mjs','docs/MCP_SERVER.md'])add(file);
for(const name of fs.readdirSync(path.join(root,'desktop/WulframForge')))if(/\.(cs|csproj|manifest)$/.test(name))add(`desktop/WulframForge/${name}`);
for(const name of fs.readdirSync(path.join(root,'tools/mcp')))if(/\.(mjs|ps1|json)$/.test(name))add(`tools/mcp/${name}`);
for(const name of ['Three-Lane-Citadel-v1.zip','project.json'])add(`outputs/three-lane-citadel-v1-final/${name}`);
const evidence=JSON.parse(fs.readFileSync(path.join(root,'outputs/mcp-native-test-3azDwJ/report.json')));
files.set('verification/native-acceptance.json',Buffer.from(JSON.stringify({passed:evidence.passed,steps:evidence.steps,note:'Prior native acceptance on the author machine; rerun on the target machine.'},null,2)));
files.set('START-HERE.md',Buffer.from(`# Wulfram Forge MCP developer handoff

Requirements: Windows, Node.js 22.13+ (tested on 24.18), npm, .NET 9 SDK and Edge WebView2. Package restore needs network access. Source is the current working-tree snapshot, including changes not committed at base commit 1044338b13f8085aedf98e562857a935b377283b.

## Contents

- source/tools/mcp/server.mjs: stable STDIO entry point. It imports MCPserver.mjs; keep both files together.
- source/tools/mcp/MCPserver.mjs: official MCP TypeScript SDK server, ten tools, revision-aware mutations and exports.
- source/tools/mcp/editor-client.mjs: named-pipe client and explicit editor session discovery.
- source/desktop/WulframForge/McpEditorHost.cs: Windows native bridge.
- source/lib/use-mcp-bridge.ts: committed React state, revisions and normal undo integration.
- source/lib/mcp-commands.ts: atomic entity/terrain editing with validation.
- source/components/editor/editor-app.tsx and source/desktop/WulframForge/MainForm.cs: integrated call sites.
- source/tests/mcp.test.mjs and source/tools/mcp/test-desktop.mjs: protocol, editing and native acceptance tests.
- source/outputs/three-lane-citadel-v1-final: required native-test fixture.
- Remaining source and original editor assets: dependencies required to build this editor snapshot.

This is a source handoff, not a patch to apply wholesale over another checkout. For an existing newer editor, merge the MCP-specific files and the two integration call sites; preserve unrelated work. The native host starts only when WULFRAM_FORGE_MCP=1 and disposes on form close. The React hook uses the normal mutate/undo handlers; retain one undo step per batch.

## Build on the developer machine

Open PowerShell in the extracted source folder. Use an installed .NET 9 SDK on PATH; the following commands avoid the author's local .dotnet-sdk path used by the convenience build script.

~~~powershell
npm ci
npm ci --prefix tools/mcp
node node_modules/typescript/bin/tsc --noEmit
node --experimental-strip-types --test tests/mcp.test.mjs
node node_modules/vite/bin/vite.js build --config vite.desktop.config.ts
node tools/create-desktop-assets.mjs
dotnet publish desktop/WulframForge/WulframForge.csproj --configuration Release --runtime win-x64 --self-contained true --output dist/desktop/mcp-v0.1.0 /p:Version=0.7.0-mcp.1
node --experimental-strip-types tools/mcp/test-desktop.mjs
~~~

Run each command only after the preceding command succeeds. The root package contains other project scripts/tests whose unrelated fixtures are not part of this focused handoff; use the commands above for MCP verification.

## Register and use

From source, register the absolute paths on the developer's machine:

~~~powershell
$forgeNode = (Get-Command node).Source
$forgeServer = (Resolve-Path tools/mcp/server.mjs).Path
codex mcp add wulfram-forge -- $forgeNode --experimental-strip-types $forgeServer
~~~

Run Launch Forge MCP.cmd, then import a map in the editor. Reconnect/restart the MCP client to reload its tools. Registration alone does not launch the editor. The launcher uses a separate persistent editor profile. Discover sessions, select an exact session ID, inspect its revision, then edit. Reinspect after a timeout before retrying a write.

The ten tools are list_editor_sessions, get_editor_state, inspect_map, validate_map, edit_entities, edit_terrain, capture_view, undo, save_copy and export_map. Exports create new files under source/outputs/mcp-exports and reject overwrite. Capture returns the current editor view; camera control and web-editor transport are not implemented. No minions, tower HP, progression or victory scripting is added.

## Verification and boundaries

Six MCP tests and ten native acceptance steps passed on the author machine, including live paired edits, stale-revision rejection, invalid-placement rollback, screenshots, terrain edit/undo and JSON/ZIP parity. The included native report lists the checks. TypeScript passed. Known build warnings concern WindowsBase references and web bundle size. This is a private development snapshot, with no live gameplay claim.

No node_modules, installed SDK/runtime, executables, Git history, user profiles, MCP session credentials or Codex configuration are included. Existing original game assets are included to reproduce the editor; their inclusion does not grant additional redistribution rights. MANIFEST.sha256 covers all payload files. A sibling SHA256SUMS.txt covers the ZIP.
`));
const hash=b=>createHash('sha256').update(b).digest('hex');
files.set('MANIFEST.sha256',Buffer.from([...files].sort(([a],[b])=>a.localeCompare(b)).map(([name,data])=>`${hash(data)}  ${name}`).join('\n')+'\n'));
const zip=new JSZip();
for(const [name,data] of files){assert.ok(!/(^|\/)(node_modules|\.git|mcp-sessions|\.env)(\/|$)/.test(name));zip.file(name,data,{date:new Date('2000-01-01T00:00:00Z'),createFolders:false});}
const bytes=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});
const opened=await JSZip.loadAsync(bytes);
assert.equal(Object.keys(opened.files).length,files.size);
for(const [name,data] of files)assert.equal(hash(await opened.file(name).async('nodebuffer')),hash(data),name);
for(const needed of ['source/tools/mcp/server.mjs','source/tools/mcp/MCPserver.mjs','source/lib/map-package.ts','source/public/assets/manifest.json','source/desktop/WulframForge/McpEditorHost.cs'])assert.ok(opened.file(needed));
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(zipPath,bytes,{flag:'wx'});
fs.writeFileSync(path.join(out,'SHA256SUMS.txt'),`${hash(bytes)}  ${path.basename(zipPath)}\n`);
fs.writeFileSync(path.join(out,'START-HERE.md'),files.get('START-HERE.md'));
console.log(JSON.stringify({zipPath,files:files.size,bytes:bytes.length,sha256:hash(bytes),verified:'Every archive entry reopened and hash-checked'},null,2));
