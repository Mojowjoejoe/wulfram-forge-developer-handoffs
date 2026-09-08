import {verifyLaneHandlesReceipt,verifyManualBrushReceipt,MANUAL_EDITING_INPUTS} from './verify-manual-editing-receipt.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifyAnchorNativeReceipt} from './verify-anchor-native-receipt.mjs';
const input=path.resolve(process.argv[2]??'');
const baseline=JSON.parse(await fs.readFile(input,'utf8'));
const sha=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
const report={passed:false,aggregate:input,scope:'Full 15-step --relationships --authoring --editor-tools --authored-library private baseline, not R0-R9 completion.',receipts:[]};
try{
 let replacement;
 if(process.argv[3]){
  replacement=JSON.parse(await fs.readFile(path.resolve(process.argv[3]),'utf8'));
  assert.equal(replacement.passed,true);assert.equal(replacement.code,0);assert.equal(replacement.aggregate,input);assert.equal(replacement.aggregateSha256,await sha(input));assert.equal(replacement.executableSha256,baseline.executableSha256);
  assert.deepEqual(replacement.flags,{WULFRAM_BASE_LIBRARY_TEST:'1',WULFRAM_PORTABLE_LIBRARY_TEST:'1',WULFRAM_DISTRICT_TEST:'1',WULFRAM_RELATIONSHIP_TEST:'1'});
  assert.deepEqual(replacement.args,['--experimental-strip-types',path.resolve('tools/mcp/test-creative-layouts.mjs'),baseline.executable]);
  assert.equal(await sha(replacement.receipt),replacement.receiptSha256);assert.equal(await sha(replacement.log),replacement.logSha256);
  assert.deepEqual(replacement.fixtures.map(f=>f.path),['outputs/base-count-layouts-v1/Base-Placement-Five-Layouts.zip','outputs/base-count-layouts-v1/Base-Placement-Five-Layouts.json'].map(f=>path.resolve(f)));
  for(const f of replacement.fixtures)assert.equal(await sha(f.path),f.sha256);
  report.replacement={path:path.resolve(process.argv[3]),sha256:await sha(process.argv[3]),originalCreativeCode:baseline.steps.find(s=>s.name==='creative-bases')?.code};
 }else assert.equal(baseline.passed,true,'Aggregate not yet passed');
 assert.ok(baseline.finishedAt,'Aggregate must be terminal');
 const expected=['source-tests','typecheck','combined-landforms','creative-bases','random-maps','terrain-workspace','landform-library','lane-tool','editor-menus','tool-options','selection-protection','offset-library-entrances','mcp-native','authored-restart','authored-recovery'];
 if(baseline.invocation.includes('--courtyard')){expected.push('courtyard-restart');report.scope='Full 16-step private baseline including Courtyard, not R0-R9 completion.';assert.equal(await sha(baseline.courtyardFixture.path),baseline.courtyardFixture.sha256);}
 if(baseline.invocation.includes('--broken-ring')){assert.ok(baseline.invocation.includes('--courtyard'));expected.push('broken-ring-restart');report.scope='Full 17-step private baseline including mixed Courtyard/Broken Ring libraries, not R0-R9 completion.';assert.equal(await sha(baseline.brokenRingFixture.path),baseline.brokenRingFixture.sha256);}
 if(baseline.invocation.includes('--valley-pockets')){expected.push('valley-native','valley-artifact-audit','valley-restart','valley-terrain-matrix');report.scope='Full baseline including Valley native, audit, restart and terrain matrix; not R0-R9 completion.';assert.equal(await sha(baseline.valleyFixture.path),baseline.valleyFixture.sha256);}
 if(baseline.invocation.includes('--multiple-entrances'))expected.push('multiple-entrances');
 if(baseline.invocation.includes('--three-lane-anchor')){expected.push('three-lane-anchor');assert.equal(await sha(baseline.anchorFixture.path),baseline.anchorFixture.sha256);}
 if(baseline.invocation.includes('--multiple-entrances')||baseline.invocation.includes('--three-lane-anchor'))report.scope=`Full ${expected.length}-step private baseline with recorded entrance/Anchor workflows; not R0-R9 completion.`;
 assert.deepEqual(baseline.steps.map(s=>s.name).sort(),expected.sort());
 for(const flag of ['--relationships','--authoring','--editor-tools','--authored-library'])assert.ok(baseline.invocation.includes(flag));
 assert.equal(await sha(baseline.executable),baseline.executableSha256);
 assert.equal(await sha(baseline.laboratory),baseline.laboratorySha256);
 assert.equal(await sha(baseline.authoredFixture.path),baseline.authoredFixture.sha256);
 for(const f of Object.values(baseline.editorToolFixtures))assert.equal(await sha(f.path),f.sha256);
 const checked=new Set();
 const verify=async file=>{
  if(checked.has(file))return;checked.add(file);
  const child=JSON.parse(await fs.readFile(file,'utf8'));assert.equal(child.passed,true,file);assert.equal(child.executableSha256?.toLowerCase(),baseline.executableSha256,file);
  if(child.rendererErrors)assert.deepEqual(child.rendererErrors,[],file);
  report.receipts.push({path:file,sha256:await sha(file)});
  for(const c of child.cases??[]){assert.equal(c.passed,true);assert.ok(c.receipt);await verify(c.receipt);}
 };
 for(const step of baseline.steps){
  if(step.name!=='creative-bases'||!replacement)assert.equal(step.code,0,step.name);const log=await fs.readFile(step.log,'utf8');
  if(step.receipt&&!step.name.startsWith('valley-'))await verify(step.receipt);
  if(['combined-landforms','random-maps','terrain-workspace'].includes(step.name)){
   const matches=[...log.matchAll(/"report":\s*("(?:\\.|[^"\\])*")/g)];assert.ok(matches.length,step.name);
   for(const m of matches)await verify(JSON.parse(m[1]));
  }
  if(step.name==='source-tests'){assert.match(log,/fail 0/);assert.ok(baseline.sourceSuites.length>0);report.sourceSuiteCount=baseline.sourceSuites.length;}
  if(step.name==='three-lane-anchor'){
   const child=JSON.parse(await fs.readFile(step.receipt,'utf8'));assert.equal(child.fixture.sha256,baseline.anchorFixture.sha256);assert.deepEqual(await verifyAnchorNativeReceipt(child,baseline.executableSha256),step.artifacts);
  }
  if(step.name==='multiple-entrances'){
   const child=JSON.parse(await fs.readFile(step.receipt,'utf8'));for(const key of ['guiPreviewApply','orderedSocketRoutes','guiUndo','mcpPreviewApplyUndoStale','reopenedRows','crossMapPackagePreviewApplyUndo','malformedDiagnostic','freshProcessFileReopen'])assert.equal(child.checks[key],true);
   assert.notEqual(child.processes.firstPid,child.processes.restartedPid);
   const expectedArtifacts=[child.fixture,{path:child.package,sha256:await sha(child.package)}];assert.deepEqual(step.artifacts,expectedArtifacts);
   for(const artifact of expectedArtifacts)assert.equal(await sha(artifact.path),artifact.sha256);
  }
 }
 const mcp=JSON.parse(await fs.readFile(baseline.steps.find(s=>s.name==='mcp-native').receipt,'utf8'));
 if(baseline.invocation.includes('--manual-editing')){
   assert.deepEqual(baseline.manualEditingInputs.map(i=>i.path),MANUAL_EDITING_INPUTS.map(p=>path.resolve(p)));for(const input of baseline.manualEditingInputs)assert.equal(await sha(input.path),input.sha256);
   const lane=baseline.steps.find(s=>s.name==='lane-tool');for(const flag of ['WULFRAM_LANE_TOOL_TEST','WULFRAM_CURVED_LANE_TEST','WULFRAM_LANE_HANDLES_TEST'])assert.equal(lane.flags[flag],'1');
   verifyLaneHandlesReceipt(JSON.parse(await fs.readFile(lane.receipt,'utf8')));
   const step=baseline.steps.find(s=>s.name==='mcp-native');assert.equal(step.flags.WULFRAM_EDITOR_BRUSH_TEST,'1');
   assert.deepEqual(await verifyManualBrushReceipt(mcp),step.manualBrushArtifacts);
   report.manualEditing={laneHandles:true,brushCases:54,artifactRecords:step.manualBrushArtifacts.length};
 }

 for(const key of ['capture','exportImport','reposition40','previewUnchanged','applyUndo'])assert.equal(mcp.authoredGui?.[key],true,`authoredGui.${key}`);
 if(baseline.invocation.includes('--courtyard')){
  const step=baseline.steps.find(s=>s.name==='mcp-native');for(const flag of ['WULFRAM_COURTYARD_GUI_TEST','WULFRAM_COURTYARD_PORTABLE_TEST'])assert.equal(step.flags[flag],'1');
  assert.equal(mcp.courtyardSourceSha256,baseline.courtyardFixture.sha256);assert.equal(mcp.courtyardGui.creativeCard,true);assert.equal(mcp.courtyardPortable.reuseApplyUndo,true);assert.equal(mcp.courtyardPortable.version,5);
  assert.deepEqual(mcp.courtyardLayouts.map(l=>l.arrangement),['small','standard','large','massive']);for(const l of mcp.courtyardLayouts)assert.equal(l.zipReopened,true);
  const restart=JSON.parse(await fs.readFile(baseline.steps.find(s=>s.name==='courtyard-restart').receipt,'utf8'));assert.equal(restart.persistedExactLibrary,true);assert.equal(restart.applyUndo,true);assert.deepEqual(restart.crossMapDimensions,[16000,12000]);
 }
 if(baseline.invocation.includes('--broken-ring')){
  const step=baseline.steps.find(s=>s.name==='mcp-native');for(const flag of ['WULFRAM_BROKEN_RING_GUI_TEST','WULFRAM_BROKEN_RING_PORTABLE_TEST'])assert.equal(step.flags[flag],'1');
  assert.equal(mcp.brokenRingSourceSha256,baseline.brokenRingFixture.sha256);
  for(const key of [baseline.brokenRingRecipe?'creativeCard':'experimentalCard','fiveBands','previewUnchanged','applyUndo'])assert.equal(mcp.brokenRingGui?.[key],true);
  for(const key of ['saved','exactLibrary','previewCancel','import','mapHistoryUnchanged','reuseApplyUndo'])assert.equal(mcp.brokenRingPortable?.[key],true);
  assert.equal(mcp.brokenRingPortable.version,6);assert.equal(mcp.brokenRingPortable.preservedExistingFavorites,1);
  assert.deepEqual(mcp.brokenRingLayouts.map(l=>l.arrangement),['small','standard','large','massive']);
  for(const l of mcp.brokenRingLayouts)for(const key of ['previewUnchanged','previewApplyGeometry','preservedLayouts','duplicateRejected','staleRejected','undo','reopened','zipReopened'])assert.equal(l[key],true);
  const original=JSON.parse(await fs.readFile(mcp.courtyardPortable.exportPath,'utf8')),mixed=JSON.parse(await fs.readFile(mcp.brokenRingPortable.exportPath,'utf8'));
  assert.equal(mixed.bases.length,2);assert.deepEqual(mixed.bases.filter(f=>f.reservations?.family==='service-courtyard'),original.bases);
  assert.equal(mixed.bases.find(f=>f.id===mcp.brokenRingPortable.favoriteId)?.reservations.brokenRingPlan.version,baseline.brokenRingRecipe??'broken-ring-v2');
  const restart=JSON.parse(await fs.readFile(baseline.steps.find(s=>s.name==='broken-ring-restart').receipt,'utf8'));
  for(const key of ['persistedExactLibrary','previewMapHistoryUnchanged','transformedGeometry','destinationAccess','applyUndo','cameraMapUnchanged'])assert.equal(restart[key],true);
  assert.deepEqual(restart.crossMapDimensions,[18000,14000]);
 }
 if(baseline.invocation.includes('--valley-pockets')){
  const get=async name=>{const step=baseline.steps.find(s=>s.name===name);assert.ok(step?.receipt);const child=JSON.parse(await fs.readFile(step.receipt,'utf8'));assert.equal(child.passed,true);report.receipts.push({path:step.receipt,sha256:await sha(step.receipt)});return {step,child};};
  const {step:nativeStep,child:native}=await get('valley-native');assert.equal(native.executableSha256,baseline.executableSha256);assert.equal(native.valleyPockets.sourceSha256,baseline.valleyFixture.sha256);assert.equal(native.valleyPockets.gui.creativeCard,true);assert.equal(native.valleyPockets.library.exactLibrary,true);
  for(const key of ['captureReadOnly','destinationFixtureExact','independentTransformedCoordinates','guiMcpRecipeMatch','previewReadOnly','applyUndo','staleRejected','recapture'])assert.equal(native.valleyPockets.portable[key],true);
  const {child:audit}=await get('valley-artifact-audit');assert.equal(path.resolve(audit.report),path.resolve(nativeStep.receipt));assert.equal(audit.reportSha256,await sha(nativeStep.receipt));assert.equal(audit.artifacts.length,19);for(const a of audit.artifacts)assert.equal(await sha(a.path),a.sha256);
  const {step:restartStep,child:restart}=await get('valley-restart');assert.equal(restart.executableSha256,baseline.executableSha256);assert.equal(path.resolve(restart.priorReport),path.resolve(nativeStep.receipt));for(const key of ['persistedExactLibrary','previewMapHistoryUnchanged','transformedGeometry','destinationAccess','applyUndo','cameraMapUnchanged'])assert.equal(restart[key],true);assert.deepEqual(restart.crossMapDimensions,[20000,16000]);assert.equal(restartStep.appliedArtifact.path,restart.appliedCopy);assert.equal(await sha(restart.appliedCopy),restartStep.appliedArtifact.sha256);
  const {step:matrixStep,child:matrix}=await get('valley-terrain-matrix');assert.equal(matrix.executableSha256,baseline.executableSha256);assert.equal(path.resolve(matrix.priorReport),path.resolve(nativeStep.receipt));
  const expectedCases=['small','standard','large','massive'].flatMap(size=>['flat','valley','irregular'].flatMap(terrain=>[false,true].map(expanded=>[size,terrain,expanded,{small:10,standard:15,large:20,massive:30}[size]+(expanded?4:0)])));
  assert.deepEqual(matrix.cases.map(c=>[c.size,c.terrain,c.expanded,c.targetCount]),expectedCases);assert.equal(matrixStep.matrixArtifacts.length,48);
  for(const c of matrix.cases){assert.equal(c.passed,true);assert.equal(await sha(c.copy),c.sha256);assert.ok(matrixStep.matrixArtifacts.some(a=>a.path===c.fixture));}
  for(const a of matrixStep.matrixArtifacts)assert.equal(await sha(a.path),a.sha256);
 }
 // Creative legacy runner reports are linked by the explicit aggregate invocation; they lack EXE hashes.
 const creativeLog=await fs.readFile(replacement?.log??baseline.steps.find(s=>s.name==='creative-bases').log,'utf8');
 const start=creativeLog.indexOf('{');assert.ok(start>=0);const creative=JSON.parse(creativeLog.slice(start));assert.equal(creative.passed,true);
 assert.ok(creative.steps?.some(c=>c.portableLibraryReload===true));
 assert.ok(creative.steps?.some(c=>c.relationshipExportReopen===true&&c.reopenedConstraintEnforced===true));
 report.creativeBuildAssociation=replacement?'Verified wrapper-recorded invocation, EXE and rerun fixture hashes; legacy child does not embed executable SHA. Original creative fixture hashes were not recorded.':'Recorded aggregate invocation only; legacy child does not embed executable SHA.';
 if(creative.executableSha256){
  assert.equal(creative.executableSha256,baseline.executableSha256);
  assert.deepEqual(creative.inputs.map(i=>i.path),[baseline.executable,path.resolve('outputs/base-count-layouts-v1/Base-Placement-Five-Layouts.zip'),path.resolve('outputs/base-count-layouts-v1/Base-Placement-Five-Layouts.json'),...['valley','hills','mounds'].map(terrain=>path.resolve('outputs/creative-terrain-v7-trials',terrain+'.zip'))]);
  for(const artifact of creative.inputs)assert.equal(await sha(artifact.path),artifact.sha256);
  report.creativeBuildAssociation='Child-recorded executable and fixture hashes, rechecked at child completion and independent audit.';
 }
 report.aggregateSha256=await sha(input);report.passed=true;
}catch(error){report.error=error.stack;process.exitCode=1;}
await fs.writeFile(path.join(path.dirname(input),'verified-baseline-audit.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
