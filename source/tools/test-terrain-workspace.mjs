// Sequential private-build acceptance. Each workflow owns its own copied EXE/profile.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(!process.argv[2])throw new Error('Usage: node tools/test-terrain-workspace.mjs <private EXE> [--authoring]');
const exe=path.resolve(process.argv[2]);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const executableSha256=hash(await fs.readFile(exe));
const out=await fs.mkdtemp(path.join(root,'outputs-terrain-workspace-'));
const manual=path.join(root,'outputs/composition-native-fixture.json');
const cases=[
 {name:'manual-selection',fixture:manual,flags:['TERRAIN_SELECTION_TEST'],evidence:['terrainSelection']},
 {name:'saved-brushes',fixture:manual,flags:['BRUSH_LIBRARY_TEST'],evidence:['brushLibrary']},
 {name:'compositions',fixture:manual,flags:['COMPOSITION_UI_TEST','COMPOSITION_LIBRARY_UI_TEST','COMPOSER_MODE_TEST','COMPOSITION_GUARD_TEST','COMPOSITION_COMPARE_TEST'],evidence:['terrainComposition','compositionLibrary','composerMode','compositionGuards','compositionComparison']},
 {name:'base-reuse',fixture:path.join(root,'outputs/frontier-camp-review-v3/flat-small.json'),flags:['FRONTIER_PREVIEW_TEST','PREVIEW_SAVE_TEST','OPTION_CLEARANCE_TEST'],evidence:['frontierPreview']},
];
if(process.argv.includes('--authoring')){
 cases[0].flags.push('SELECTION_DRAW_TEST','SELECTION_INTERRUPTION_TEST','TERRAIN_MEASUREMENT_TEST');
 cases[0].evidence.push('selectionDrawing','selectionInterruptions','terrainMeasurement');
 cases.push({name:'library-recovery',fixture:manual,flags:['LIBRARY_RECOVERY_TEST'],evidence:['libraryRecovery']});
}
const report={executable:exe,executableSha256,startedAt:new Date().toISOString(),passed:false,scope:'Recent manual terrain, recipes and portable creative base workflows. Not full R0-R9 acceptance.',cases:[]};
for(const c of cases){
 console.log(`Starting ${c.name}`);
 const result={name:c.name,fixture:c.fixture,passed:false};report.cases.push(result);
 try{
  const fixtureSha256=hash(await fs.readFile(c.fixture));
  const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('WULFRAM_')||key==='WULFRAM_NATIVE_OUTPUT_ROOT'));
  for(const flag of c.flags)env[`WULFRAM_${flag}`]='1';
  let output='';
  const code=await new Promise((resolve,reject)=>{
   const child=spawn(process.execPath,['--experimental-strip-types',path.join(root,'tools/test-desktop-workflow.mjs'),exe,c.fixture],{cwd:root,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
   const append=data=>{output+=data;process.stdout.write(data);};child.stdout.on('data',append);child.stderr.on('data',append);child.on('error',reject);child.on('close',resolve);
  });
  await fs.writeFile(path.join(out,`${c.name}.log`),output);
  const matches=[...output.matchAll(/"report":\s*("(?:\\.|[^"\\])*")/g)];
  assert.ok(matches.length,'Native runner did not return a receipt');
  result.receipt=JSON.parse(matches.at(-1)[1]);
  const receipt=JSON.parse(await fs.readFile(result.receipt,'utf8'));
  assert.equal(code,0);assert.equal(receipt.passed,true);assert.equal(receipt.executableSha256,executableSha256);assert.equal(receipt.fixtureSha256,fixtureSha256);
  for(const key of c.evidence)assert.ok(receipt[key],`Missing workflow evidence: ${key}`);
  assert.deepEqual(receipt.rendererErrors,[]);
  assert.equal(hash(await fs.readFile(exe)),executableSha256,'EXE changed during acceptance');
  assert.equal(hash(await fs.readFile(c.fixture)),fixtureSha256,'Fixture changed during acceptance');
  result.passed=true;
 }catch(error){result.error=String(error);process.exitCode=1;}
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
}
report.passed=report.cases.every(c=>c.passed);report.finishedAt=new Date().toISOString();
await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:report.passed,report:path.join(out,'report.json')},null,2));
