import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import JSZip from 'jszip';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const excluded = new Set(['.git','node_modules','bin','obj','wwwroot','dist','outputs','.next','.vinext','.dotnet-sdk','__pycache__']);
function collect(directory, prefix = '') {
  const result = [];
  for (const entry of fs.readdirSync(directory, {withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
    if (excluded.has(entry.name) || entry.name.startsWith('outputs-') || /^\.env(?:\.|$)|^\.npmrc$|\.(?:pem|key|pfx|p12|log|tsbuildinfo|pyc)$/.test(entry.name) || entry.name === 'WebAssets.zip') continue;
    assert.ok(!entry.isSymbolicLink(), `Unexpected link: ${path.join(directory,entry.name)}`);
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...collect(path.join(directory,entry.name),relative));
    else if (entry.isFile()) result.push(relative);
  }
  return result;
}
const write = (base,name,content) => {
  const target = path.join(base,name); fs.mkdirSync(path.dirname(target),{recursive:true}); fs.writeFileSync(target,content);
};
if (process.argv[2] === 'stage') {
  const out = fs.mkdtempSync(path.join(root,'outputs','mcp-developer-kit-'));
  const stage = path.join(out,'Wulfram-Forge-MCP-Developer-Kit');
  fs.mkdirSync(stage);
  const sourceFiles = [];
  for (const dir of ['app','components','hooks','lib','desktop-web','public','desktop','tools','tests','docs']) {
    for (const name of collect(path.join(root,dir))) sourceFiles.push(`${dir}/${name}`);
  }
  for (const entry of fs.readdirSync(root,{withFileTypes:true})) {
    if (entry.isFile() && !entry.name.startsWith('.env') && !/tsbuildinfo$/.test(entry.name) && /\.(?:json|ts|md|cmd)$|^\.(?:gitignore|gitattributes)$/.test(entry.name)) sourceFiles.push(entry.name);
  }
  for (const name of ['project.json','Three-Lane-Citadel-v1.zip']) sourceFiles.push(`outputs/three-lane-citadel-v1-final/${name}`);
  sourceFiles.push('dist/desktop/mcp-v0.1.0/WulframForge.exe');
  for (const name of sourceFiles) write(stage,`source/${name}`,fs.readFileSync(path.join(root,name)));
  write(stage,'Launch Forge MCP.cmd','@echo off\r\ncall "%~dp0source\\Launch Forge MCP.cmd"\r\n');
  for (const name of ['Setup MCP','Build Editor','Test MCP','Print MCP Config']) {
    write(stage,`${name}.cmd`,`@echo off\r\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0${name}.ps1"\r\nif errorlevel 1 pause\r\n`);
  }
  write(stage,'Setup MCP.ps1',`$ErrorActionPreference = 'Stop'
Get-Command node,npm -ErrorAction Stop | Out-Null
foreach ($folder in @('source/tools/mcp','source/tools/mcp/MapEditerMCP')) {
  & npm.cmd ci --prefix (Join-Path $PSScriptRoot $folder)
  if ($LASTEXITCODE -ne 0) { throw "Dependency install failed: $folder" }
}
Write-Host 'MCP dependencies installed. Run Launch Forge MCP.cmd, then configure your MCP client.'
`);
  write(stage,'Build Editor.ps1',`$ErrorActionPreference = 'Stop'
$env:WULFRAM_FORGE_ROOT = Join-Path $PSScriptRoot 'source'
& npm.cmd ci --prefix $env:WULFRAM_FORGE_ROOT
if ($LASTEXITCODE -ne 0) { throw 'Editor dependencies failed' }
& (Join-Path $PSScriptRoot 'Setup MCP.ps1')
Push-Location $env:WULFRAM_FORGE_ROOT
try {
  & node node_modules/typescript/bin/tsc --noEmit
  if ($LASTEXITCODE -ne 0) { throw 'Typecheck failed' }
  & ./tools/mcp/MapEditerMCP/build-editor.ps1
} finally { Pop-Location }
`);
  write(stage,'Test MCP.ps1',`$ErrorActionPreference = 'Stop'
$env:WULFRAM_FORGE_ROOT = Join-Path $PSScriptRoot 'source'
& node (Join-Path $env:WULFRAM_FORGE_ROOT 'tools/check-mcp-sync.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Synchronization check failed' }
$package = Join-Path $env:WULFRAM_FORGE_ROOT 'tools/mcp/MapEditerMCP'
& npm.cmd test --prefix $package
if ($LASTEXITCODE -ne 0) { throw 'Package tests failed' }
& npm.cmd run test:desktop --prefix $package
if ($LASTEXITCODE -ne 0) { throw 'Native tests failed' }
`);
  write(stage,'Print MCP Config.ps1',`$ErrorActionPreference = 'Stop'
$nodePath = (Get-Command node -ErrorAction Stop).Source
$serverPath = (Resolve-Path (Join-Path $PSScriptRoot 'source/tools/mcp/MapEditerMCP/server.mjs')).Path
@{mcpServers=@{'wulfram-forge'=@{command=$nodePath;args=@('--experimental-strip-types',$serverPath)}}} | ConvertTo-Json -Depth 6
Write-Host 'Copy these values into your MCP client configuration. This does not change your settings.'
if ([Environment]::UserInteractive) { Read-Host 'Press Enter to close' | Out-Null }
`);
  write(stage,'START-HERE.md',`# Wulfram Forge MCP developer kit

Requirements: Windows x64, Edge WebView2 Runtime, Node.js 22.13 or newer and npm. The included editor is self-contained; no .NET SDK is needed to run it. Rebuilding additionally requires the .NET 9 SDK. Dependency installation needs internet access.

## Start using it

1. Extract the entire ZIP to a writable folder. Keep the folder layout intact.
2. Run **Setup MCP.cmd** once to install both MCP packages' declared dependencies.
3. Run **Launch Forge MCP.cmd** to open the included editor with MCP enabled. Import a map; a sample is included at source/tools/mcp/MapEditerMCP/fixtures/three-lane-citadel/Three-Lane-Citadel-v1.zip.
4. Run **Print MCP Config.cmd**. It prints absolute Node/server paths for this extracted location. Copy them into your MCP client's local STDIO server configuration, then reconnect the client. Clients with a different settings format should use the same command and arguments.
5. Discover editor sessions, select the intended session explicitly, then inspect its map. Edits require its current revision. Re-register paths if this folder moves.

The launcher's editor profile is separate from the regular Forge profile. Registering the server does not launch the editor. Keep both server.mjs and MCPserver.mjs; capitalization matters.

## What is included

- Ready-to-run MCP-enabled editor: source/dist/desktop/mcp-v0.1.0/WulframForge.exe.
- The requested Launch Forge MCP.cmd, both at the top level and in source/.
- Current editor source, assets, integration points, build tools, lockfiles, and documentation, including locally developed changes.
- Integrated MCP at source/tools/mcp and the standalone MCP package at source/tools/mcp/MapEditerMCP.
- Serializer dependencies, native fixture files, regression tests, maintenance rules, and the synchronization checker.
- Per-file SHA-256 manifest and verification evidence. Source is a local working-tree snapshot, not a claim that GitHub has these changes.

Node/npm, the .NET SDK, WebView2 installer, downloaded dependencies, Git histories, local profiles, session descriptors, credentials, and unrelated generated outputs are not bundled. Setup installs declared dependencies. The original source/game assets retain their existing rights; this handoff grants no additional redistribution permission.

## Verify or rebuild

Run **Test MCP.cmd** after setup. It checks synchronization, eight package/transport tests and thirteen native acceptance steps. It launches a separate test instance with an isolated profile, edits only its fixture, and intentionally stalls its renderer for over 32 seconds to test deadline rejection. Let it finish; reports are written beneath source/tools/mcp/MapEditerMCP/outputs/.

Run **Build Editor.cmd** to install editor dependencies, typecheck and rebuild the included native executable from source. Then rerun Test MCP.cmd. A .NET 9 SDK must be available as dotnet on PATH. This does not modify the developer's other checkout.

After installing editor dependencies, source-level MCP tests are available from source/: node --experimental-strip-types --test tests/mcp.test.mjs. Other project tests may need external map repositories or generated fixtures; the supplied MCP acceptance fixtures are included.

## Updating an existing editor

Use this as a complete reference checkout, not a wholesale overwrite of a newer project. Merge lib/mcp-commands.ts, lib/use-mcp-bridge.ts, desktop/WulframForge/McpEditorHost.cs and their dependencies, plus the MainForm.cs/editor-app.tsx integration and MCP server/client files. The current editor constraints and terrain-support fix have dependencies beyond those two TypeScript files. Keep the complete dependency chain or merge against the included source.

The client and native host both enforce request deadlines. Updating only Node files does not retrofit older native binaries. Rebuild the host after integration. Never automatically retry a submitted write after a disconnect; inspect the map first because an already-running command may have completed.

Read source/tools/mcp/MapEditerMCP/MAINTENANCE.md and its README before adding operations. Keep both layouts synchronized and retain explicit session/revision checks, atomic edits, undo, and validation.

## Troubleshooting

- Startup module error: rerun Setup MCP.cmd and preserve the complete source tree.
- No sessions: start the included launcher, open a map, and check the MCP client uses the printed paths.
- Missing WebView2: install Microsoft's WebView2 Runtime before opening the editor.
- Build cannot find dotnet: install the .NET 9 SDK and reopen the shell.
- A timeout or disconnect after an edit: inspect the live map before retrying.

Passing editor tests establishes local integration behavior, not in-game map balance. The executable is an unsigned development build. See verification/ for the actual tested hash and checks.
`);
  const exeHash=hash(fs.readFileSync(path.join(stage,'source/dist/desktop/mcp-v0.1.0/WulframForge.exe')));
  write(stage,'verification/build.json',JSON.stringify({packagedAt:new Date().toISOString(),executableSha256:exeHash,source:'Current local working tree; includes uncommitted development',status:'Awaiting extracted-package verification'},null,2));
  const testRoot=fs.mkdtempSync(path.join(os.tmpdir(),'Forge MCP Dev Kit '));
  fs.cpSync(stage,testRoot,{recursive:true});
  fs.writeFileSync(path.join(root,'outputs','latest-mcp-kit-stage.json'),JSON.stringify({out,stage,testRoot},null,2));
  console.log(JSON.stringify({out,stage,testRoot,sourceFiles:sourceFiles.length,exeHash},null,2));
} else if (process.argv[2] === 'finalize') {
  const {out,stage,testRoot}=JSON.parse(fs.readFileSync(path.join(root,'outputs','latest-mcp-kit-stage.json')));
  const reports=fs.readdirSync(path.join(testRoot,'source/tools/mcp/MapEditerMCP/outputs')).filter(name=>name.startsWith('mcp-native-test-')).map(name=>path.join(testRoot,'source/tools/mcp/MapEditerMCP/outputs',name,'report.json'));
  assert.equal(reports.length,1,'Expected one isolated native acceptance report');
  const report=JSON.parse(fs.readFileSync(reports[0])); assert.equal(report.passed,true);
  assert.equal(report.executableSha256,hash(fs.readFileSync(path.join(stage,'source/dist/desktop/mcp-v0.1.0/WulframForge.exe'))));
  write(stage,'verification/extracted-native-acceptance.json',JSON.stringify({...report,out:'Isolated extracted package profile',executable:'source/dist/desktop/mcp-v0.1.0/WulframForge.exe'},null,2));
  write(stage,'verification/build.json',JSON.stringify({verifiedAt:new Date().toISOString(),executableSha256:report.executableSha256,source:'Current local working tree; includes uncommitted development',nativeSteps:report.steps.length,status:'Isolated package native acceptance passed'},null,2));
  // Final traversal intentionally includes the distributed executable and fixtures.
  function allFiles(dir,prefix='') {return fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>e.isDirectory()?allFiles(path.join(dir,e.name),`${prefix}${e.name}/`):[`${prefix}${e.name}`]);}
  const manifest=allFiles(stage).map(name=>`${hash(fs.readFileSync(path.join(stage,name)))}  ${name}`).join('\n')+'\n';
  write(stage,'SHA256SUMS.txt',manifest);
  const zip=new JSZip(), names=allFiles(stage);
  for(const name of names)zip.file(`Wulfram-Forge-MCP-Developer-Kit/${name}`,fs.readFileSync(path.join(stage,name)),{date:new Date('2026-09-07T00:00:00Z')});
  const bytes=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});
  const zipPath=path.join(out,'Wulfram-Forge-MCP-Developer-Kit.zip');assert.ok(!fs.existsSync(zipPath));fs.writeFileSync(zipPath,bytes);
  const reopened=await JSZip.loadAsync(bytes);for(const name of names)assert.equal(hash(await reopened.file(`Wulfram-Forge-MCP-Developer-Kit/${name}`).async('nodebuffer')),hash(fs.readFileSync(path.join(stage,name))),name);
  fs.writeFileSync(`${zipPath}.sha256`,`${hash(bytes)}  ${path.basename(zipPath)}\n`);
  console.log(JSON.stringify({zipPath,bytes:bytes.length,files:names.length,sha256:hash(bytes),verified:'Every archive payload reopened and hash-matched'},null,2));
} else throw new Error('Usage: node tools/package-mcp-developer-kit.mjs stage|finalize');
