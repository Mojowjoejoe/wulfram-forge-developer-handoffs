import {verifyLaneHandlesReceipt,verifyManualBrushReceipt,MANUAL_EDITING_INPUTS} from './verify-manual-editing-receipt.mjs';
// Repeat source and native acceptance on one already-built executable.
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import {verifyAnchorNativeReceipt} from './verify-anchor-native-receipt.mjs';

const [exeArg, labArg] = process.argv.slice(2);
if (!exeArg || !labArg) throw new Error('Usage: node tools/test-product-baseline.mjs <EXE> <Landform-visual-lab.zip> [--relationships|--districts|--portable|--library] [--terrain-workspace] [--authoring] [--editor-tools] [--authored-library] [--courtyard] [--broken-ring] [--valley-pockets] [--multiple-entrances] [--three-lane-anchor] [--manual-editing]');
if(process.argv.includes('--manual-editing')&&!process.argv.includes('--editor-tools'))throw new Error('--manual-editing requires --editor-tools.');
if(process.argv.includes('--authored-library')&&!process.argv.includes('--editor-tools'))throw new Error('--authored-library requires --editor-tools.');
if(process.argv.includes('--courtyard')&&!process.argv.includes('--editor-tools'))throw new Error('--courtyard requires --editor-tools.');
if(process.argv.includes('--broken-ring')&&!process.argv.includes('--courtyard'))throw new Error('--broken-ring requires --courtyard for mixed-library acceptance.');
const exe = path.resolve(exeArg), lab = path.resolve(labArg);
const sha = async file => createHash('sha256').update(await fs.readFile(file)).digest('hex');
const out = await fs.mkdtemp(path.resolve('outputs/product-baseline-'));
const report = { executable: exe, executableSha256: await sha(exe), laboratory: lab, laboratorySha256: await sha(lab), steps: [], passed: false };
const suites = (await fs.readdir('tests')).filter(n => n.endsWith('.test.mjs')).sort().map(n => 'tests/' + n);
/** @type {Array<[string, string[], Record<string, string>]>} */
const steps = [
  ['source-tests', ['--experimental-strip-types', '--test', ...suites], {}],
  ['typecheck', ['node_modules/typescript/bin/tsc', '--noEmit'], {}],
  ['combined-landforms', ['--experimental-strip-types', 'tools/test-desktop-workflow.mjs', exe, lab], { WULFRAM_STAMP_VISUAL_TEST: '1', WULFRAM_PRODUCT_TEST: '1' }],
  ['creative-bases', ['--experimental-strip-types', 'tools/mcp/test-creative-layouts.mjs', exe], process.argv.includes('--relationships') ? { WULFRAM_BASE_LIBRARY_TEST: '1', WULFRAM_PORTABLE_LIBRARY_TEST: '1', WULFRAM_DISTRICT_TEST: '1', WULFRAM_RELATIONSHIP_TEST: '1' } : process.argv.includes('--districts') ? { WULFRAM_BASE_LIBRARY_TEST: '1', WULFRAM_PORTABLE_LIBRARY_TEST: '1', WULFRAM_DISTRICT_TEST: '1' } : process.argv.includes('--portable') ? { WULFRAM_BASE_LIBRARY_TEST: '1', WULFRAM_PORTABLE_LIBRARY_TEST: '1' } : process.argv.includes('--library') ? { WULFRAM_BASE_LIBRARY_TEST: '1' } : {}],
  ['random-maps', ['--experimental-strip-types', 'tools/test-desktop-workflow.mjs', exe], { WULFRAM_SEARCH_TEST: '1' }],
];
if (process.argv.includes('--terrain-workspace') || process.argv.includes('--authoring')) steps.push(['terrain-workspace', ['tools/test-terrain-workspace.mjs', exe, ...(process.argv.includes('--authoring') ? ['--authoring'] : [])], {}]);
const toolEvidence={'editor-menus':'editorMenus','tool-options':'toolContext','selection-protection':'selectionProtection','landform-library':'landformLibrary','lane-tool':'laneTool','offset-library-entrances':'offsetLibrary'};
if(process.argv.includes('--editor-tools')){
  const fixture=path.resolve('outputs/composition-native-fixture.json');
  const laneFixture=path.join(out,'lane-high-terrain.json');
  const laneProject=JSON.parse(await fs.readFile(fixture,'utf8'));
  assert.equal(laneProject.entities.length,0,'Lane fixture must not raise existing buildings');
  assert.ok(laneProject.baseLayouts.every(layout=>layout.entities.length===0),'Lane fixture layouts must be empty');
  laneProject.name='Combined acceptance lane terrain';laneProject.terrain.heights.fill(300);
  await fs.writeFile(laneFixture,JSON.stringify(laneProject));
  const offsetFixture=path.resolve('outputs/offset-bastion-review-v1/flat-small.json');
  report.editorToolFixtures={offset:{path:offsetFixture,sha256:await sha(offsetFixture)},manual:{path:fixture,sha256:await sha(fixture)},lane:{path:laneFixture,sha256:await sha(laneFixture)}};
  steps.push(
    ['landform-library',['--experimental-strip-types','tools/test-desktop-workflow.mjs',exe,fixture],{WULFRAM_LANDFORM_LIBRARY_TEST:'1'}],
    ['lane-tool',['--experimental-strip-types','tools/test-desktop-workflow.mjs',exe,laneFixture],{WULFRAM_LANE_TOOL_TEST:'1'}],
    ['editor-menus',['--experimental-strip-types','tools/test-desktop-workflow.mjs',exe,fixture],{WULFRAM_EDITOR_MENU_TEST:'1'}],
    ['tool-options',['--experimental-strip-types','tools/test-desktop-workflow.mjs',exe,fixture],{WULFRAM_TOOL_OPTIONS_TEST:'1',WULFRAM_TOOL_CONTEXT_TEST:'1'}],
    ['selection-protection',['--experimental-strip-types','tools/test-desktop-workflow.mjs',exe,fixture],{WULFRAM_TERRAIN_SELECTION_TEST:'1',WULFRAM_SELECTION_PROTECTION_TEST:'1'}],
    ['offset-library-entrances',['--experimental-strip-types','tools/test-desktop-workflow.mjs',exe,path.resolve('outputs/offset-bastion-review-v1/flat-small.json')],{WULFRAM_OFFSET_PREVIEW_TEST:'1',WULFRAM_OFFSET_ARRANGEMENT:'deep-court',WULFRAM_OFFSET_LIBRARY_TEST:'1',WULFRAM_PLAN_BOUNDS_TEST:'1',WULFRAM_ENTRANCE_POLICY_TEST:'1',WULFRAM_ENTRANCE_LIBRARY_TEST:'1'}],
    ['mcp-native',['--experimental-strip-types','tools/mcp/MapEditerMCP/test-desktop.mjs'],{WULFRAM_MCP_TEST_EXE:exe}],
  );
}
if(process.argv.includes('--authored-library')){
  const fixture=path.resolve('outputs/authored-mcp-v82-fixture.json');
  report.authoredFixture={path:fixture,sha256:await sha(fixture)};
  const mcp=steps.find(step=>step[0]==='mcp-native');
  Object.assign(mcp[2],{WULFRAM_AUTHORED_TEST_MAP:fixture,WULFRAM_AUTHORED_GUI_TEST:'1',WULFRAM_AUTHORED_LIBRARY_TEST:'1',WULFRAM_AUTHORED_PORTABLE_TEST:'1',WULFRAM_AUTHORED_BROWSER_TEST:'1',WULFRAM_AUTHORED_CAMERA_TEST:'1',WULFRAM_AUTHORED_DETAIL_TEST:'1'});
}
if(process.argv.includes('--courtyard')){
 const fixture=path.resolve('outputs/courtyard-native-source.json');report.courtyardFixture={path:fixture,sha256:await sha(fixture)};
 Object.assign(steps.find(step=>step[0]==='mcp-native')[2],{WULFRAM_COURTYARD_TEST_MAP:fixture,WULFRAM_COURTYARD_GUI_TEST:'1',WULFRAM_COURTYARD_PORTABLE_TEST:'1'});
}
if(process.argv.includes('--broken-ring')){
 const fixture=path.resolve('outputs/broken-ring-native-source.json');report.brokenRingFixture={path:fixture,sha256:await sha(fixture)};report.brokenRingRecipe='broken-ring-v3';
 Object.assign(steps.find(step=>step[0]==='mcp-native')[2],{WULFRAM_BROKEN_RING_TEST_MAP:fixture,WULFRAM_BROKEN_RING_GUI_TEST:'1',WULFRAM_BROKEN_RING_PORTABLE_TEST:'1'});
}
if(process.argv.includes('--valley-pockets')){
 const fixture=path.resolve('outputs/valley-pockets-native-source.json');report.valleyFixture={path:fixture,sha256:await sha(fixture)};
 steps.push(['valley-native',['--experimental-strip-types','tools/mcp/MapEditerMCP/test-desktop.mjs'],{WULFRAM_MCP_TEST_EXE:exe,WULFRAM_VALLEY_POCKETS_TEST_MAP:fixture}]);
}
if(process.argv.includes('--manual-editing')){
 Object.assign(steps.find(s=>s[0]==='lane-tool')[2],{WULFRAM_CURVED_LANE_TEST:'1',WULFRAM_LANE_HANDLES_TEST:'1'});
 Object.assign(steps.find(s=>s[0]==='mcp-native')[2],{WULFRAM_EDITOR_BRUSH_TEST:'1'});
 report.manualEditingInputs=await Promise.all(MANUAL_EDITING_INPUTS.map(async file=>({path:path.resolve(file),sha256:await sha(file)})));
}
report.startedAt=new Date().toISOString();report.invocation=process.argv.slice(2);report.sourceSuites=suites;
if(process.argv.includes('--multiple-entrances'))steps.push(['multiple-entrances',['--experimental-strip-types','tools/mcp/test-multiple-entrances.mjs',exe],{}]);
if(process.argv.includes('--three-lane-anchor')){
 const fixture=path.resolve('outputs/three-lane-anchor-native-source.json');report.anchorFixture={path:fixture,sha256:await sha(fixture)};
 steps.push(['three-lane-anchor',['--experimental-strip-types','tools/mcp/test-anchor-restart.mjs',exe,'--library','--admitted','--expanded','--authored','--authored-library','--matrix'],{}]);
}
try {
  for (const [name, args, flags] of steps) {
    console.log(`Running ${name}`);
    const env = { ...process.env };
    for (const key of Object.keys(env)) if (key.startsWith('WULFRAM_') && key!=='WULFRAM_NATIVE_OUTPUT_ROOT') delete env[key];
    Object.assign(env, flags);
    let output = '';
    const code = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, args, { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      child.stdout.on('data', data => { output += data; });
      child.stderr.on('data', data => { output += data; });
      child.on('error', reject); child.on('close', resolve);
    });
    const log = path.join(out, name + '.log'); await fs.writeFile(log, output);
    const result={name,code,log,flags};report.steps.push(result);
    if(code===0&&['multiple-entrances','three-lane-anchor'].includes(name)){
      try{
        const child=JSON.parse(output.slice(output.indexOf('{')));result.receipt=path.join(child.out,'report.json');const receipt=JSON.parse(await fs.readFile(result.receipt,'utf8'));
        assert.equal(receipt.passed,true);assert.equal(receipt.executableSha256,report.executableSha256);assert.deepEqual(receipt.rendererErrors,[]);
        if(name==='three-lane-anchor'){assert.equal(receipt.fixture.sha256,report.anchorFixture.sha256);result.artifacts=await verifyAnchorNativeReceipt(receipt,report.executableSha256);}
        else{for(const key of ['guiPreviewApply','orderedSocketRoutes','guiUndo','mcpPreviewApplyUndoStale','reopenedRows','crossMapPackagePreviewApplyUndo','malformedDiagnostic','freshProcessFileReopen'])assert.equal(receipt.checks[key],true);assert.notEqual(receipt.processes.firstPid,receipt.processes.restartedPid);assert.equal(await sha(receipt.fixture.path),receipt.fixture.sha256);result.artifacts=[receipt.fixture,{path:receipt.package,sha256:await sha(receipt.package)}];}
      }catch(error){result.code=1;result.error=String(error);}
    }
    if(code===0&&(name in toolEvidence||(name==='mcp-native'||name==='valley-native'))){
      try{
        const match=output.match((name==='mcp-native'||name==='valley-native')?/"out":\s*("(?:\\.|[^"\\])*")/:/"report":\s*("(?:\\.|[^"\\])*")/);
        assert.ok(match,'Missing native receipt');
        result.receipt=(name==='mcp-native'||name==='valley-native')?path.join(JSON.parse(match[1]),'report.json'):JSON.parse(match[1]);
        const receipt=JSON.parse(await fs.readFile(result.receipt,'utf8'));
        assert.equal(receipt.passed,true);assert.equal(receipt.executableSha256.toLowerCase(),report.executableSha256);
        if(report.manualEditingInputs&&name==='lane-tool')verifyLaneHandlesReceipt(receipt);
        if(report.manualEditingInputs&&name==='mcp-native')result.manualBrushArtifacts=await verifyManualBrushReceipt(receipt);
        if(name==='offset-library-entrances'){
          assert.equal(receipt.offsetLibrary?.cards,4);assert.equal(receipt.offsetLibrary?.reviewedFamily,true);
          assert.equal(receipt.offsetArrangement?.arrangement,'deep-court');assert.equal(receipt.offsetArrangement?.stalePreviewRejected,true);assert.match(receipt.planBounds,/both team model boxes \+ entrance/);
          for(const key of ['previewPreserved','orderedRoute','applyUndoRedo'])assert.equal(receipt.entrancePolicy?.[key],true);
          const portable=receipt.entranceLibrary;assert.equal(portable?.version,4);assert.equal(portable?.reservationVersion,3);assert.equal(portable?.rotation,90);
          for(const key of ['bindingsPreserved','transformedGeometry','allPadEndpoints','orderedTurns'])assert.equal(portable?.[key],true);
          assert.match(portable?.targetSha256,/^[a-f0-9]{64}$/i);assert.equal(receipt.fixtureSha256,report.editorToolFixtures.offset.sha256);
        }
        if(name==='mcp-native'&&report.authoredFixture){
          assert.equal(receipt.authoredBase?.sourceSha256,report.authoredFixture.sha256);
          for(const [section,keys] of Object.entries({authoredGui:['capture','exportImport','reposition40','previewUnchanged','applyUndo'],authoredBase:['completeSnapshots','sourceRulesCompared','previewUnchanged','invalidAtomic','appliedOnce','staleRejected','undo'],authoredLibraryMcp:['save','rename','deleteRestore','staleRejected','healthyRecoveryRejected','mapUnchanged'],authoredLibraryGui:['save','search','rename','deleteUndo','load','panelRemount','mapUnchanged'],authoredLibraryPortable:['exportExact','mcpPreviewUnchanged','guiPreviewCancelUnchanged','merge','undo'],authoredBrowser:['cardScope','browseHandoffUnchanged','applyUndo','manualHandoffClearsCandidate'],authoredDetails:['mapUnchanged'],authoredCameras:['finderUnchanged','camerasUnchanged']}))for(const key of keys)assert.equal(receipt[section]?.[key],true,`${section}.${key}`);
          const flags={WULFRAM_AUTHORED_TEST_MAP:report.authoredFixture.path};
          steps.push(['authored-restart',['tools/mcp/MapEditerMCP/test-authored-library-restart.mjs',result.receipt],flags],['authored-recovery',['tools/mcp/MapEditerMCP/test-authored-library-recovery.mjs',result.receipt],flags]);
        }
        if(name==='mcp-native'&&report.courtyardFixture){
          assert.equal(receipt.courtyardSourceSha256,report.courtyardFixture.sha256);
          for(const key of ['creativeCard','threeBands','previewUnchanged','applyUndo'])assert.equal(receipt.courtyardGui?.[key],true);
          for(const key of ['saved','exactLibrary','previewCancel','import','mapHistoryUnchanged','reuseApplyUndo'])assert.equal(receipt.courtyardPortable?.[key],true);
          assert.equal(receipt.courtyardPortable.version,5);assert.deepEqual(receipt.courtyardLayouts.map(l=>l.arrangement),['small','standard','large','massive']);
          for(const layout of receipt.courtyardLayouts)for(const key of ['previewUnchanged','previewApplyGeometry','preservedLayouts','duplicateRejected','staleRejected','undo','reopened','zipReopened'])assert.equal(layout[key],true);
          steps.push(['courtyard-restart',['tools/mcp/MapEditerMCP/test-courtyard-restart.mjs',result.receipt],{WULFRAM_COURTYARD_TEST_MAP:report.courtyardFixture.path}]);
        }
        if(name==='mcp-native'&&report.brokenRingFixture){
          assert.equal(receipt.brokenRingSourceSha256,report.brokenRingFixture.sha256);
          for(const key of ['creativeCard','fiveBands','previewUnchanged','applyUndo'])assert.equal(receipt.brokenRingGui?.[key],true);
          for(const key of ['saved','exactLibrary','previewCancel','import','mapHistoryUnchanged','reuseApplyUndo'])assert.equal(receipt.brokenRingPortable?.[key],true);
          assert.equal(receipt.brokenRingPortable.version,6);assert.equal(receipt.brokenRingPortable.preservedExistingFavorites,1);
          assert.deepEqual(receipt.brokenRingLayouts.map(l=>l.arrangement),['small','standard','large','massive']);
          for(const layout of receipt.brokenRingLayouts)for(const key of ['previewUnchanged','previewApplyGeometry','preservedLayouts','duplicateRejected','staleRejected','undo','reopened','zipReopened'])assert.equal(layout[key],true);
          const priorLibrary=JSON.parse(await fs.readFile(receipt.courtyardPortable.exportPath,'utf8')),mixedLibrary=JSON.parse(await fs.readFile(receipt.brokenRingPortable.exportPath,'utf8'));
          assert.equal(mixedLibrary.bases.length,2);assert.deepEqual(mixedLibrary.bases.filter(f=>f.reservations?.family==='service-courtyard'),priorLibrary.bases);
          assert.equal(mixedLibrary.bases.find(f=>f.id===receipt.brokenRingPortable.favoriteId)?.reservations.brokenRingPlan.version,report.brokenRingRecipe);
          steps.push(['broken-ring-restart',['tools/mcp/MapEditerMCP/test-broken-ring-restart.mjs',result.receipt],{WULFRAM_BROKEN_RING_TEST_MAP:report.brokenRingFixture.path}]);
        }
        if(name==='valley-native'){
          assert.equal(receipt.valleyPockets.sourceSha256,report.valleyFixture.sha256);
          assert.equal(receipt.valleyPockets.gui.creativeCard,true);assert.equal(receipt.valleyPockets.library.exactLibrary,true);
          for(const key of ['captureReadOnly','destinationFixtureExact','independentTransformedCoordinates','guiMcpRecipeMatch','previewReadOnly','applyUndo','staleRejected','recapture'])assert.equal(receipt.valleyPockets.portable[key],true);
          assert.equal(receipt.valleyPockets.layouts.length,8);
          steps.push(['valley-artifact-audit',['tools/audit-valley-pockets-native.mjs',result.receipt],{}],['valley-restart',['tools/mcp/MapEditerMCP/test-valley-restart.mjs',result.receipt],{}],['valley-terrain-matrix',['tools/mcp/MapEditerMCP/test-valley-matrix.mjs',result.receipt],{}]);
        }
        if(name in toolEvidence){assert.ok(receipt[toolEvidence[name]],'Missing workflow evidence');assert.deepEqual(receipt.rendererErrors,[]);}
      }catch(error){result.code=1;result.error=String(error);}
    }
    if(code===0&&name==='creative-bases'){
      try{
        const child=JSON.parse(output.slice(output.indexOf('{')));result.receipt=path.join(child.out,'report.json');
        const receipt=JSON.parse(await fs.readFile(result.receipt,'utf8'));assert.equal(receipt.passed,true);assert.equal(receipt.executableSha256,report.executableSha256);
        assert.deepEqual(receipt.inputs.map(i=>i.path),[exe,path.resolve('outputs/base-count-layouts-v1/Base-Placement-Five-Layouts.zip'),path.resolve('outputs/base-count-layouts-v1/Base-Placement-Five-Layouts.json'),...['valley','hills','mounds'].map(terrain=>path.resolve('outputs/creative-terrain-v7-trials',terrain+'.zip'))]);
        for(const input of receipt.inputs)assert.equal(await sha(input.path),input.sha256);
      }catch(error){result.code=1;result.error=String(error);}
    }
    if(code===0&&(name==='authored-restart'||name==='authored-recovery')){
      try{
        result.receipt=path.join(path.dirname(args[1]),name==='authored-restart'?'library-restart-report.json':'library-recovery-report.json');
        const receipt=JSON.parse(await fs.readFile(result.receipt,'utf8'));
        assert.equal(receipt.passed,true);assert.equal(receipt.executableSha256.toLowerCase(),report.executableSha256);
        assert.equal(receipt.persistedCompletePackages,true);assert.equal(receipt.guiEntriesAfterRestart,true);
        if(name==='authored-recovery'){assert.equal(receipt.originalTestLibraryRestored,true);for(const key of ['gui','nativePipe','exactBackupBytes','staleRejected','guiRefreshAfterMcp','fullMapUnchanged'])assert.equal(receipt.recovery?.[key],true);}
      }catch(error){result.code=1;result.error=String(error);}
    }
    if(code===0&&(name==='courtyard-restart'||name==='broken-ring-restart')){
      try{
        const child=JSON.parse(output);result.receipt=path.join(child.out,name==='courtyard-restart'?'courtyard-restart-report.json':'brokenRing-restart-report.json');
        const receipt=JSON.parse(await fs.readFile(result.receipt,'utf8'));assert.equal(receipt.passed,true);assert.equal(receipt.executableSha256,report.executableSha256);
        for(const key of ['persistedExactLibrary','previewMapHistoryUnchanged','transformedGeometry','destinationAccess','applyUndo','cameraMapUnchanged'])assert.equal(receipt[key],true);
        assert.deepEqual(receipt.crossMapDimensions,name==='courtyard-restart'?[16000,12000]:[18000,14000]);
      }catch(error){result.code=1;result.error=String(error);}
    }
    if(code===0&&['valley-artifact-audit','valley-restart','valley-terrain-matrix'].includes(name)){
      try{
        const child=JSON.parse(output);result.receipt=name==='valley-artifact-audit'?path.join(path.dirname(args[1]),'valley-pockets-artifact-audit.json'):path.join(child.out,name==='valley-restart'?'valley-restart-report.json':'valley-matrix-report.json');
        const receipt=JSON.parse(await fs.readFile(result.receipt,'utf8'));assert.equal(receipt.passed,true);
        if(name==='valley-artifact-audit'){
          assert.equal(path.resolve(receipt.report),path.resolve(args[1]));assert.equal(receipt.reportSha256,await sha(args[1]));assert.equal(receipt.artifacts.length,19);for(const a of receipt.artifacts)assert.equal(await sha(a.path),a.sha256);
        }else{
          assert.equal(receipt.executableSha256,report.executableSha256);assert.equal(path.resolve(receipt.priorReport),path.resolve(args[1]));
          if(name==='valley-restart'){for(const key of ['persistedExactLibrary','previewMapHistoryUnchanged','transformedGeometry','destinationAccess','applyUndo','cameraMapUnchanged'])assert.equal(receipt[key],true);assert.deepEqual(receipt.crossMapDimensions,[20000,16000]);assert.ok(receipt.appliedCopy);result.appliedArtifact={path:receipt.appliedCopy,sha256:await sha(receipt.appliedCopy)};}
          else{
            const expected=['small','standard','large','massive'].flatMap(size=>['flat','valley','irregular'].flatMap(terrain=>[false,true].map(expanded=>({size,terrain,expanded,targetCount:{small:10,standard:15,large:20,massive:30}[size]+(expanded?4:0)}))));
            assert.deepEqual(receipt.cases.map(({size,terrain,expanded,targetCount})=>({size,terrain,expanded,targetCount})),expected);
            result.matrixArtifacts=[];for(const c of receipt.cases){assert.equal(c.passed,true);assert.equal(await sha(c.copy),c.sha256);result.matrixArtifacts.push({path:c.fixture,sha256:await sha(c.fixture)},{path:c.copy,sha256:c.sha256});}
          }
        }
      }catch(error){result.code=1;result.error=String(error);}
    }
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
    if (result.code !== 0) console.log(`${name} failed; retained ${log}. Continuing independent suites.`);
  }
  if (await sha(exe) !== report.executableSha256 || await sha(lab) !== report.laboratorySha256) throw new Error('Acceptance input changed during execution');
  for(const fixture of Object.values(report.editorToolFixtures??{}))assert.equal(await sha(fixture.path),fixture.sha256,'Editor tool fixture changed during execution');
  if(report.authoredFixture)assert.equal(await sha(report.authoredFixture.path),report.authoredFixture.sha256,'Authored fixture changed during execution');
  if(report.courtyardFixture)assert.equal(await sha(report.courtyardFixture.path),report.courtyardFixture.sha256,'Courtyard fixture changed during execution');
  if(report.brokenRingFixture)assert.equal(await sha(report.brokenRingFixture.path),report.brokenRingFixture.sha256,'Broken Ring fixture changed during execution');
  if(report.valleyFixture)assert.equal(await sha(report.valleyFixture.path),report.valleyFixture.sha256,'Valley fixture changed during execution');
  if(report.anchorFixture)assert.equal(await sha(report.anchorFixture.path),report.anchorFixture.sha256,'Anchor fixture changed during execution');
  for(const input of report.manualEditingInputs??[])assert.equal(await sha(input.path),input.sha256,'Manual editing input changed during execution');
  report.finishedAt=new Date().toISOString();
  report.passed = report.steps.every(step => step.code === 0);
  if (!report.passed) { report.error = 'One or more suites failed; inspect the recorded logs.'; process.exitCode = 1; }
} catch (error) { report.error = String(error); process.exitCode = 1; }
finally { await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2)); }
