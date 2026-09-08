import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import JSZip from 'jszip';
import sharp from 'sharp';
import {ADVANCED_BASE_PRESETS} from '../lib/advanced-base-templates.ts';
const out=path.resolve('outputs/advanced-base-tryout-v1');
const evidence=path.resolve(process.argv[2]);
const report=JSON.parse(fs.readFileSync(path.join(evidence,'report.json')));assert.ok(report.passed);
const filename=path.join(out,'Advanced-Base-Tryout-v1.zip');assert.ok(!fs.existsSync(filename));
const labels={e:'PC',g:'GT',s:'FL',L:'ML',r:'RP',f:'RF',u:'UP',p:'SK',d:'DL'};
const colors={e:'#ebc25b',g:'#f17e66',s:'#b2a4ed',L:'#e76d90',r:'#76cbae',f:'#5ab7df',u:'#d4dae0',p:'#b3cda1',d:'#adb8cc'};
const svg=[`<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1230" viewBox="0 0 1440 1230"><rect width="1440" height="1230" fill="#101820"/><g font-family="Segoe UI,Arial" fill="#eaf0f4"><text x="40" y="48" font-size="30" font-weight="700">ADVANCED BASE PRESETS · MCP TRYOUT</text><text x="40" y="80" font-size="18" fill="#adbcc5">Exact formation coordinates · one team shown · forward is right → · use 1× scale</text>`];
ADVANCED_BASE_PRESETS.forEach((p,index)=>{
  const x=30+(index%2)*710,y=105+Math.floor(index/2)*520;
  svg.push(`<g transform="translate(${x} ${y})"><rect width="690" height="505" rx="14" fill="#19252e" stroke="#35454e"/><text x="25" y="38" font-size="24" font-weight="700">${p.template.name.replace('Advanced · ','')}</text><text x="25" y="67" font-size="16" fill="#adbcc5">${p.template.unitCount} structures · ${p.recommendedDiameter} u recommended diameter</text><g transform="translate(345 280) scale(.28 -.28)">`);
  for(const route of p.routes)svg.push(`<polyline points="${route.map(r=>r.join(',')).join(' ')}" fill="none" stroke="#29454c" stroke-width="120" stroke-linejoin="round"/>`);
  for(const u of p.template.units.filter(u=>u.token==='e'&&u.offset[0]===u.offset[0])){
    // Show service range for all cells, with low opacity where backup disks overlap.
    svg.push(`<circle cx="${u.offset[0]}" cy="${u.offset[1]}" r="290" fill="none" stroke="#d3b768" stroke-width="3" stroke-dasharray="16 12" opacity=".4"/>`);
  }
  for(const u of p.template.units){const [a,b]=u.offset;svg.push(`<g transform="translate(${a} ${b})"><circle r="32" fill="${colors[u.token]}" stroke="#101820" stroke-width="6"/><g transform="scale(1 -1)"><text y="10" text-anchor="middle" fill="#0f1820" font-size="27" font-weight="700">${labels[u.token]}</text></g></g>`);}
  svg.push(`</g><text x="25" y="481" font-size="15" fill="#adbcc5">Dashed rings: power coverage · blue corridors: tested departure routes</text></g>`);
});
svg.push('<text x="40" y="1180" font-size="17">PC Power · GT Gun · FL Flak · ML Missile · RP Repair · RF Refuel · UP Uplink · SK Skypump · DL Darklight</text><text x="40" y="1210" font-size="16" fill="#adbcc5">Structure symbols enlarged for readability. Native placement and MCP checks passed; in-game combat balance remains untested.</text></g></svg>');
fs.writeFileSync(path.join(out,'overview.svg'),svg.join('\n'));
await sharp(Buffer.from(svg.join('\n'))).png().toFile(path.join(out,'overview.png'));
const readme=`# Advanced Base Presets — MCP tryout v1

Requirements: Windows and Edge WebView2. The included desktop EXE includes .NET. MCP control additionally needs the configured local Node MCP server.

Run Launch Tryout.cmd, then import one ZIP from maps/. The updated Base builder template list includes four Advanced presets at the top. Use 1x scale, formation yaw 0 for +X forward, and the stated clear base-area diameter. Use normal Undo after placement. Each map contains both mirrored teams on a flat test range.

| Preset | Units per team | Clear diameter | Role |
| --- | ---: | ---: | --- |
${ADVANCED_BASE_PRESETS.map(p=>`| ${p.template.name.replace('Advanced · ','')} | ${p.template.unitCount} | ${p.recommendedDiameter} | ${p.template.description.split(' Face +X')[0]} |`).join('\n')}

All powered structures have primary and backup coverage at the default 300u service radius; districts have separate power pairs. Presets use supported gun/flak/missile models and deployed home repair/refuel. Scaling changes service distances: revalidate before use. The exact authored formations are available through Base templates; generated/random placement may adapt their positions and must pass its own checks.

The MCP trial placed each complete paired formation atomically in a real packaged editor, checked both teams, captured the view, saved JSON, exported ZIP, compared contents and undid the entire formation in one step. Terrain remained unchanged. Four-rotation placement tests also checked model footprint gaps, primary and backup coverage and 120u departure corridors. Fourteen focused tests, TypeScript and targeted lint passed.

overview.png is a coordinate-derived layout guide; native screenshots are in evidence/. These tests do not prove live combat balance, projectile sightlines or moving-vehicle collision. Try these on a test map before choosing a production base layout.

The launcher uses a separate persistent profile and enables the native MCP pipe without opening a debug port. It does not replace the regular editor or its saved map. The MCP source repository and the map editor's runtime copy are separate: keep the runtime in tools/mcp at the editor root, as expected by the registered server command.

This is a private local trial build, not a public release. Existing WindowsBase and bundle-size warnings remain. Source/ contains the preset definitions and tests for developer review; it is not a full standalone editor checkout.
`;
fs.writeFileSync(path.join(out,'README.md'),readme);
const zip=new JSZip(),hash=b=>createHash('sha256').update(b).digest('hex'),manifest=[];
function add(name,data){zip.file(name,data,{date:new Date('2000-01-01T00:00:00Z'),createFolders:false});manifest.push(`${hash(data)}  ${name}`);}
add('README.md',Buffer.from(readme));add('WulframForge.exe',fs.readFileSync('dist/desktop/mcp-v0.1.0/WulframForge.exe'));
add('Launch Tryout.cmd',Buffer.from('@echo off\r\nset "WULFRAM_FORGE_MCP=1"\r\nset "WULFRAM_FORGE_USER_DATA_DIR=%LOCALAPPDATA%\\BlackwaterGaming\\WulframForge\\AdvancedBaseTryout"\r\nset "WULFRAM_FORGE_REMOTE_DEBUGGING_PORT="\r\nset "WULFRAM_MCP_SESSION_DIR="\r\nstart "" "%~dp0WulframForge.exe"\r\n'));
for(const p of ADVANCED_BASE_PRESETS){add(`maps/${p.template.id}.zip`,fs.readFileSync(path.join(out,p.template.id+'.zip')));add(`evidence/${p.template.id}.png`,fs.readFileSync(path.join(evidence,p.template.id+'.png')));}
for(const name of ['overview.png','overview.svg','presets.json','validation.json'])add(name,fs.readFileSync(path.join(out,name)));
for(const name of ['lib/advanced-base-templates.ts','tests/advanced-base-templates.test.mjs','tools/mcp/test-advanced-presets.mjs'])add('source/'+name,fs.readFileSync(name));
add('evidence/native-report.json',Buffer.from(JSON.stringify({passed:report.passed,steps:report.steps.map(({exported,...step})=>step)},null,2)));
add('SHA256SUMS.txt',Buffer.from(manifest.join('\n')+'\n'));
const bytes=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});
const check=await JSZip.loadAsync(bytes);for(const row of manifest){assert.equal(hash(await check.file(row.slice(66)).async('nodebuffer')),row.slice(0,64));}
fs.writeFileSync(filename,bytes,{flag:'wx'});fs.writeFileSync(path.join(out,'package-SHA256SUMS.txt'),`${hash(bytes)}  Advanced-Base-Tryout-v1.zip\n`);
console.log(JSON.stringify({filename,sha256:hash(bytes),bytes:bytes.length,verifiedFiles:manifest.length},null,2));
