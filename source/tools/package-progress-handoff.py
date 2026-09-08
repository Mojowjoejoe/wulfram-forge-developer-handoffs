from pathlib import Path
import shutil, json, hashlib, zipfile, datetime
ROOT=Path(__file__).resolve().parents[1]
OUT=Path('D:/WulframForgeBuilds/DeveloperHandoffs')
OUT.mkdir(exist_ok=True)
STAGE=OUT/'Wulfram-Forge-Progress-v112.1'
if STAGE.exists(): raise RuntimeError('Preserve existing handoff directory')
STAGE.mkdir()
SKIP={'.git','node_modules','bin','obj','wwwroot','dist','outputs','.next','.vinext','.dotnet-sdk','__pycache__','.wrangler','build'}
def copy_tree(source,target):
 for item in sorted(source.iterdir()):
  if item.name in SKIP or item.name.startswith(('outputs-','.env')) or item.name in {'WebAssets.zip','.npmrc'} or item.suffix.lower() in {'.pfx','.p12','.pem','.key','.log','.pyc','.tsbuildinfo'}:continue
  if item.is_symlink(): raise RuntimeError('Unexpected link: '+str(item))
  dest=target/item.name
  if item.is_dir():copy_tree(item,dest)
  elif item.is_file():dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(item,dest)
for name in ['app','components','hooks','lib','desktop-web','public','desktop','tools','tests','docs','examples','.github']:
 if (ROOT/name).exists():copy_tree(ROOT/name,STAGE/'source'/name)
for p in ROOT.iterdir():
 if p.is_file() and (p.suffix in {'.json','.ts','.md','.cmd'} or p.name in {'.gitignore','.gitattributes'}) and not p.name.startswith('.env') and p.suffix!='.tsbuildinfo':
  shutil.copy2(p,STAGE/'source'/p.name)
def put(name,data):
 p=STAGE/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(data,encoding='utf-8')
def copy(source,name):
 p=STAGE/name;p.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,p)
copy('D:/WulframForgeBuilds/inspection-path-v112.1/WulframForge.exe','builds/latest-v112.1/WulframForge.exe')
copy('D:/WulframForgeBuilds/Installers/WulframForge-Setup-v109.exe','builds/accepted-installer-v109/WulframForge-Setup-v109.exe')
copy('D:/WulframForgeBuilds/Installers/WulframForge-Setup-v109.manifest.json','builds/accepted-installer-v109/payload-manifest.json')
physics=Path('D:/WulframForgeBuilds/physics-research')
copy_tree(physics/'Wulfram2-Physics-Core',STAGE/'physics-experiment'/'Wulfram2-Physics-Core')
for name in ['rectangular-compatibility.patch','terrain-parity.mjs','terrain-parity.json','terrain-parity-rectangular-final.json','tests.log','tests-rectangular.log','candidate-evidence.json']:
 copy(physics/name,'physics-experiment/evidence/'+name)
copy_tree(physics/'terrain-probe',STAGE/'physics-experiment'/'terrain-probe')
# Curated receipts, not complete application profiles or all generated map output.
receipts={
 'combined-v109.json':ROOT/'outputs/product-baseline-0367dr/report.json',
 'combined-v109-audit.json':ROOT/'outputs/product-baseline-0367dr/verified-baseline-audit.json',
 'installer-v109.json':ROOT/'outputs/installer-v109-acceptance.json',
 'temporary-path-v112.1.json':ROOT/'tools/mcp/MapEditerMCP/outputs/hill-elevation-native-bjRAcO/report.json',
 'hill-v111.json':ROOT/'tools/mcp/MapEditerMCP/outputs/hill-elevation-native-u6Bmnu/report.json',
}
for name,path in receipts.items():copy(path,'evidence/'+name)
for name in ['project.json','Three-Lane-Citadel-v1.zip']:
 copy(ROOT/'outputs/three-lane-citadel-v1-final'/name,'source/outputs/three-lane-citadel-v1-final/'+name)
for name in ['temporary-path-960.png','hill-0-960.png','hill-1-960.png']:
 copy(ROOT/'tools/mcp/MapEditerMCP/outputs/hill-elevation-native-bjRAcO'/name,'evidence/screenshots/'+name)
put('Launch latest editor.cmd','@echo off\nset "WULFRAM_FORGE_MCP=1"\nset "WULFRAM_MCP_SESSION_DIR=%~dp0runtime\\sessions"\nset "WULFRAM_FORGE_USER_DATA_DIR=%~dp0runtime\\profile"\nstart "" "%~dp0builds\\latest-v112.1\\WulframForge.exe"\n')
put('Setup dependencies.ps1',"""$ErrorActionPreference='Stop'
foreach($folder in @('source','source/tools/mcp','source/tools/mcp/MapEditerMCP')){
 & npm.cmd ci --prefix (Join-Path $PSScriptRoot $folder)
 if($LASTEXITCODE -ne 0){throw "npm ci failed: $folder"}
}
""")
put('Print MCP config.ps1',"""$ErrorActionPreference='Stop'
@{mcpServers=@{'wulfram-forge'=@{command=(Get-Command node).Source;args=@('--experimental-strip-types',(Join-Path $PSScriptRoot 'source/tools/mcp/MapEditerMCP/server.mjs'));env=@{WULFRAM_MCP_SESSION_DIR=(Join-Path $PSScriptRoot 'runtime/sessions');WULFRAM_FORGE_ROOT=(Join-Path $PSScriptRoot 'source')}}}}|ConvertTo-Json -Depth 6
""")
put('Verify handoff.ps1',"""$ErrorActionPreference='Stop'
$m=Get-Content (Join-Path $PSScriptRoot 'MANIFEST.json') -Raw|ConvertFrom-Json
foreach($f in $m.files){
 $p=Join-Path $PSScriptRoot $f.path
 if(!(Test-Path -LiteralPath $p) -or (Get-FileHash -LiteralPath $p -Algorithm SHA256).Hash -ne $f.sha256){throw "Hash mismatch: $($f.path)"}
}
Write-Host "Verified $($m.files.Count) packaged files."
""")
put('Run native review.ps1',"""$ErrorActionPreference='Stop'
$env:WULFRAM_FORGE_ROOT=Join-Path $PSScriptRoot 'source'
$exe=Join-Path $PSScriptRoot 'builds/latest-v112.1/WulframForge.exe'
$env:WULFRAM_TEMPORARY_PATH_TEST='1'
Push-Location (Join-Path $PSScriptRoot 'source/tools/mcp/MapEditerMCP')
try{ & node --experimental-strip-types test-route-elevation.mjs $exe; if($LASTEXITCODE -ne 0){throw 'Native review failed'} }finally{Pop-Location}
""")
put('OVERVIEW.md',(ROOT/'docs/DEVELOPER_PROGRESS_OVERVIEW.md').read_text(encoding='utf-8'))
print(STAGE)
