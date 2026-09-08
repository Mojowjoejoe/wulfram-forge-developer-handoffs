import {testLaneHandles} from './test-lane-handles-scenario.mjs';
import {offsetPortabilityTarget} from './offset-portability-fixtures.mjs';
import {terrainSelectionContainsVertex} from '../lib/terrain-selection.ts';
import {formationRouteSummary} from '../lib/formation-route-summary.ts';
// Real packaged-WebView2 UI regression. No production state injection or generator calls.
import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { inspectDiagnosticProject } from '../lib/editor-diagnostics.ts';
import { readMapArchive } from '../lib/map-package.ts';
import { testSearchUI } from './desktop-search-scenarios.mjs';
import {activateTestWindow,closeTestWindow} from './native-test-window.mjs';
import { previewTerrainDetail, readTerrainDetailOptions } from '../lib/terrain-detail-generator.ts';
import { analyzeBalancedProject } from '../lib/balanced-map-analysis.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exe = path.resolve(process.argv[2] ?? path.join(root, 'dist/desktop/win-x64/WulframForge.exe'));
const fixture = path.resolve(process.argv[3] ?? path.join(root, '../balanced-map-evidence/terrain-first-rc20/native-test-start.zip'));
const outputRoot=path.resolve(process.env.WULFRAM_NATIVE_OUTPUT_ROOT??root);
await fs.mkdir(outputRoot,{recursive:true});
const out = await fs.mkdtemp(path.join(outputRoot, 'outputs-desktop-test-'));
const profile = path.join(out, 'isolated-profile');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const report = { executable: exe, executableSha256: sha(await fs.readFile(exe)), fixture, fixtureSha256: sha(await fs.readFile(fixture)), buttonActivation:process.env.WULFRAM_KEYBOARD_ACTIVATION_TEST==='1'?'keyboard':'pointer', steps: [], passed: false };
const testExe = path.join(out, 'application', path.basename(exe));
await fs.cp(path.dirname(exe), path.dirname(testExe), { recursive: true });
assert.equal(sha(await fs.readFile(testExe)), report.executableSha256);
const manifest = JSON.parse(await fs.readFile(path.join(root, 'public/assets/manifest.json'), 'utf8'));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let child, socket, send, evaluate;
const pending = new Map();
const errors = [];
async function waitFor(probe, label, timeout = 45000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (child && child.exitCode !== null) throw new Error(`Test EXE exited: ${child.exitCode}`);
    const value = await probe();
    if (value) return value;
    await delay(150);
  }
  throw new Error(`Timed out: ${label}`);
}
async function launch() {
  if(child&&child.exitCode===null&&child.signalCode===null)throw new Error('Previous test process is still running; refusing overlapping restart.');
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  child = spawn(testExe, [], { windowsHide: true, stdio: ['ignore','pipe','pipe'], env: { ...process.env,
    ...(process.env.WULFRAM_STARTUP_TRACE==='1'?{COREHOST_TRACE:'1',COREHOST_TRACEFILE:path.join(out,`host-startup-${port}.log`)}:{}),
    WULFRAM_FORGE_STARTUP_LOG: path.join(out,`managed-startup-${port}.log`),
    WULFRAM_FORGE_USER_DATA_DIR: profile, WULFRAM_FORGE_REMOTE_DEBUGGING_PORT: String(port) } });
  child.on('error', error => errors.push(error.message));
  const launched=child;
  const output={pid:launched.pid,stdout:'',stderr:''};(report.processOutput??=[]).push(output);
  for(const channel of ['stdout','stderr'])launched[channel].on('data',chunk=>{output[channel]=(output[channel]+chunk.toString()).slice(-65536);});
  (report.lifecycle??=[]).push({event:'launch',pid:launched.pid,port});
  launched.once('exit',(code,signal)=>report.lifecycle.push({event:'exit',pid:launched.pid,code,signal}));
  const target = await waitFor(async () => {
    try {
      const targets = await fetch(`http://127.0.0.1:${port}/json`, { signal: AbortSignal.timeout(1500) }).then(r => r.json());
      return targets.find(t => t.type === 'page' && t.url==='https://wulfram-forge.local/index.html' && t.webSocketDebuggerUrl);
    }
    catch { return false; }
  }, 'WebView2 debug connection');
  assert.ok(target, 'Packaged WebView page exists');
  const address = new URL(target.webSocketDebuggerUrl);
  assert.ok(['127.0.0.1', 'localhost'].includes(address.hostname), 'Loopback only');
  socket = new WebSocket(address);
  const channel=socket;
  channel.onclose=()=>{if(socket!==channel)return;for(const request of pending.values()){clearTimeout(request.timer);request.reject(new Error('Native editor connection closed'));}pending.clear();};
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0;
  socket.onmessage = event => {
    if(socket!==channel)return;
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id); pending.delete(msg.id); clearTimeout(p.timer);
      if (msg.error) p.reject(new Error(msg.error.message)); else p.resolve(msg.result);
    } else if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails);
    else if (msg.method?.startsWith('Browser.download')) (report.downloadEvents??=[]).push({method:msg.method,...msg.params});
    else if (msg.method === 'Page.javascriptDialogOpening' && process.env.WULFRAM_SEARCH_TEST === '1'
      && msg.params.type === 'confirm' && msg.params.message.startsWith('Apply regenerated terrain and replace the active team bases?')) {
      void send('Page.handleJavaScriptDialog', { accept: true }).catch(error => errors.push(error.message));
    }
  };
  send = (method, params = {}) => new Promise((resolve, reject) => {
    if(channel.readyState!==WebSocket.OPEN){reject(new Error(`Native editor connection is closed: ${method}`));return;}
    const current = ++id;
    const timer = setTimeout(() => { pending.delete(current); reject(new Error(`CDP timeout: ${method}`)); }, 45000);
    pending.set(current, { resolve, reject, timer });
    channel.send(JSON.stringify({ id: current, method, params }));
  });
  evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  };
  await send('Runtime.enable'); await send('Page.enable');
  await waitFor(() => evaluate(`location.origin === 'https://wulfram-forge.local' && !!document.querySelector('.top-actions')`), 'editor ready');
  await ensureTestWindow();

}
async function stop() {
  const closingSocket=socket;socket=undefined;closingSocket?.close();
  for (const p of pending.values()) { clearTimeout(p.timer); p.reject(new Error('Test session closing')); }
  pending.clear();
  const closing=child;
  if (closing && closing.exitCode === null && closing.signalCode===null) {
    const exited = new Promise(resolve => closing.once('exit', resolve));
    try{const result=await closeTestWindow(closing.pid,testExe);(report.lifecycle??=[]).push({event:'close-request',...result});}
    catch(error){(report.lifecycle??=[]).push({event:'close-request-error',pid:closing.pid,error:String(error)});}
    await Promise.race([exited, delay(5000)]);
    if(closing.exitCode===null&&closing.signalCode===null){
      report.lifecycle.push({event:'forced-cleanup',pid:closing.pid});
      closing.kill(); // Only this runner's owned process; retain forced cleanup as evidence.
      await Promise.race([exited,delay(5000)]);
    }
  }
}
async function ensureTestWindow() {
  if(await evaluate('document.visibilityState')!=='visible'){
    const activation=await activateTestWindow(child.pid,testExe);
    (report.windowActivations??=[]).push(activation);
    await waitFor(()=>evaluate(`document.visibilityState==='visible'`),'native test window visible before input',5000);
  }
  await send('Page.bringToFront');
}
async function button(text, scope = 'body') {
  if(text==='Save active formation as favorite'&&await evaluate(`!!document.querySelector('.formation-favorites:not([open])')`))await button('Saved formations');
  report.lastAction = {kind:'button',text,pid:child?.pid,time:new Date().toISOString()};
  await ensureTestWindow();
  if(text==='Balanced')await evaluate(`(()=>{
    if(window.forgeInputAudit)return;
    const audit=window.forgeInputAudit=[];
    const record=v=>{audit.push({...v,time:performance.now()});if(audit.length>40)audit.shift();};
    for(const type of ['pointerdown','pointerup','click','keydown','keyup'])document.addEventListener(type,e=>record({type,target:e.target.closest?.('button')?.textContent?.trim()??e.target.tagName,key:e.key,trusted:e.isTrusted}),true);
    let count=document.querySelectorAll('[role="dialog"]').length;
    new MutationObserver(()=>{const next=document.querySelectorAll('[role="dialog"]').length;if(next!==count){record({type:'dialog-count',count:next});count=next;}}).observe(document.body,{childList:true,subtree:true});
  })()`);
  const headerMenu=['Balanced','Random base','Terrain detail'].includes(text)?'generate':['Source','JSON'].includes(text)?'exports':undefined;
  if(headerMenu&&await evaluate(`!!document.querySelector('details[data-header-menu="${headerMenu}"]:not([open])')`))await button(headerMenu==='generate'?'Generate':'Other exports');
  if(/^(Team [12] ·|Focus building$|Close building view$|Follow route$)/.test(text)&&await evaluate(`!!document.querySelector('.inspector-pages button')&&!document.querySelector('.inspector-pages button[aria-pressed="true"]')?.textContent.includes('Inspect')`))await button('Inspect');
  if(text==='3D stamp brush'&&await evaluate(`!![...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Landform brush')`))text='Landform brush';
  if(text==='Terrain stamps'&&await evaluate(`!!document.querySelector('.precise-terrain-tools')`)){
    if(!await evaluate(`document.querySelector('.precise-terrain-tools').open`))await button('Precise placement');
    text='Stamp at coordinates';
  }
  if(text==='Import grayscale')text=await evaluate(`document.querySelector('.heightmap-action').textContent.trim()`);
  if (text === 'Preview rocks') text = 'Preview terrain';
  const point = await waitFor(() => evaluate(`(() => {
    const buttons = [...document.querySelectorAll(${JSON.stringify(scope)})].flatMap(root => [...root.querySelectorAll('button, summary')]).filter(b => (${JSON.stringify(scope)} !== 'body' || !b.closest('.editor-menu-bar')) && (b.textContent.trim() === ${JSON.stringify(text)} || b.getAttribute('aria-label') === ${JSON.stringify(text)}) && b.getClientRects().length && b.checkVisibility());
    if (buttons.length !== 1 || buttons[0].disabled) return false;
    buttons[0].scrollIntoView({ block: 'center' });
    const rect = buttons[0].getBoundingClientRect();
    const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    if (!buttons[0].contains(document.elementFromPoint(x, y))) return false;
    if (${process.env.WULFRAM_KEYBOARD_ACTIVATION_TEST==='1'}) buttons[0].focus();
    return { x, y };
  })()`), 'visible enabled unobstructed button: ' + text, 10000);
  if(process.env.WULFRAM_KEYBOARD_ACTIVATION_TEST==='1'){
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  }else{
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
  }
  await delay(100);
}
async function field(label, value, scope = '[role="dialog"]') {
  if(['Sample structures','Includes','Composition trait','Terrain handling'].includes(label)&&await evaluate(`!!document.querySelector('.base-library-advanced:not([open])')`))await button(await evaluate(`document.querySelector('.base-library-advanced summary').textContent`));
  report.lastAction = {kind:'field',label,pid:child?.pid,time:new Date().toISOString()};
  await waitFor(() => evaluate(`(() => {
    const labels = [...document.querySelectorAll(${JSON.stringify(scope + ' label')})].filter(l => l.textContent.startsWith(${JSON.stringify(label)}));
    if (labels.length > 1) throw new Error('Ambiguous field: ' + ${JSON.stringify(label)} + ' (' + labels.length + ' matches)');
    const el = labels[0]?.querySelector('input,select');
    return !!el && !el.disabled && el.getClientRects().length > 0;
  })()`), 'visible enabled field: ' + label, 10000);
  await evaluate(`(() => {
    const labels = [...document.querySelectorAll(${JSON.stringify(scope + ' label')})].filter(l => l.textContent.startsWith(${JSON.stringify(label)}));
    if (labels.length !== 1) throw new Error('Ambiguous field: ' + ${JSON.stringify(label)});
    const el = labels[0].querySelector('input,select');
    el.focus();
    const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(String(value))});
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await delay(60);
}
async function screenshot(name, preserveCursor = false) {
  await ensureTestWindow();
  await delay(2000); // Allow asynchronous textures and geometry to settle before visual review.
  const point = await evaluate(`(() => { const r = document.querySelector('.terrain-viewport').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  if (!preserveCursor) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...(process.env.WULFRAM_SHOWCASE_CLEAN === '1' ? {x:20,y:20} : point) });
  let clip;
  if (process.env.WULFRAM_SHOWCASE_CLEAN === '1') {
    clip = await evaluate(`(() => { const v=document.querySelector('.terrain-viewport'); const r=v.getBoundingClientRect(); for(const e of v.querySelectorAll(':scope > :not(canvas)')) {e.dataset.photoVisibility=e.style.visibility;e.style.visibility='hidden';} return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()`);
  }
  const shot = await send('Page.captureScreenshot', { format: 'png', ...(clip ? {clip} : {}) });
  if (clip) await evaluate(`document.querySelectorAll('[data-photo-visibility]').forEach(e=>{e.style.visibility=e.dataset.photoVisibility;delete e.dataset.photoVisibility;})`);
  await fs.writeFile(path.join(out, `${name}.png`), Buffer.from(shot.data, 'base64'));
}
async function saved() {
  await button('Save local');
  return evaluate(`JSON.parse(localStorage.getItem('wulfram-forge-project-v1'))`);
}
async function step(name, work) {
  console.log(name); await work(); report.steps.push({ name, passed: true });
}
try {
  await launch();
  await step('Import through actual file input', async () => {
    const { root: doc } = await send('DOM.getDocument');
    const { nodeId } = await send('DOM.querySelector', { nodeId: doc.nodeId, selector: 'input[type="file"][multiple]' });
    assert.ok(nodeId);
    await send('DOM.setFileInputFiles', { nodeId, files: [fixture] });
    await waitFor(() => evaluate(`document.querySelector('.statusbar')?.textContent.includes('imported')`), 'map imported');
  });
  const original = await saved();
  if(process.env.WULFRAM_LIBRARY_TRAITS_TEST==='1')await step('Composition traits filter base cards without changing the map',async()=>{
    await button('Browse base library');
    await field('Composition trait','Defense heavy','.base-library-filters');
    await waitFor(()=>evaluate(`document.querySelectorAll('.base-library-card').length>0`),'defense-heavy cards');
    assert.ok(await evaluate(`[...document.querySelectorAll('.base-library-card')].every(c=>c.textContent.includes('Defense heavy'))`));
    const name=await evaluate(`document.querySelector('.base-library-card').getAttribute('aria-label')`);await button(name);
    assert.ok(await evaluate(`document.querySelector('.base-library-detail').textContent.includes('Composition traits:')`));
    await evaluate(`document.querySelector('.base-library-trait-help').open=true`);await screenshot('library-composition-traits');
    await field('Composition trait','Service yard','.base-library-filters');
    await waitFor(()=>evaluate(`document.querySelectorAll('.base-library-card').length>0`),'service-yard cards');
    assert.ok(await evaluate(`[...document.querySelectorAll('.base-library-card')].every(c=>c.textContent.includes('Service yard'))`));
    await button('Reset filters');assert.equal(await evaluate(`document.querySelector('[aria-label="Library composition trait"]').value`),'all');
    await button('Close library');assert.deepEqual(await saved(),original);
    report.libraryTraits={defenseFilter:true,serviceFilter:true,details:true,reset:true,mapPreserved:true};
  });
  if(process.env.WULFRAM_PROBLEMS_TEST==='1')await step('Imported saved-rule problems remain visible and link to settings without edits',async()=>{
    const invalid=structuredClone(original),layout=invalid.baseLayouts.find(l=>l.id===invalid.activeBaseLayoutId);
    layout.metadata['forge.composition-budgets.v1']=JSON.stringify([{team:1,role:'repair',min:1,max:1}]);
    layout.metadata['forge.build-areas.v1']='invalid json';
    const importProject=async(project,name)=>{
      const filename=path.join(out,name);await fs.writeFile(filename,JSON.stringify(project));
      const revision=await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).revision`);
      const {root}=await send('DOM.getDocument'),{nodeId}=await send('DOM.querySelector',{nodeId:root.nodeId,selector:'input[type="file"][multiple]'});await send('DOM.setFileInputFiles',{nodeId,files:[filename]});
      await waitFor(()=>evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).revision!==${JSON.stringify(revision)}`),'problem fixture import');
    };
    await importProject(invalid,'problem-project.json');const imported=await saved();
    await evaluate(`document.querySelector('.authoring-problems-panel').open=true`);
    assert.ok(await evaluate(`document.querySelector('.authoring-problems-panel').textContent.includes('0 placed; requires 1')`));
    assert.ok(await evaluate(`document.querySelector('.authoring-problems-panel').textContent.includes('Cannot read saved areas rules')`));
    await screenshot('saved-rule-problems');
    await button('Open Composition limits');
    await waitFor(()=>evaluate(`document.querySelector('.composition-budget-panel')?.contains(document.activeElement)`),'problem settings focus');
    assert.deepEqual(await saved(),imported,'Reading problems and opening settings preserves imported data');
    if(process.env.WULFRAM_REPAIR_TEST==='1'){
      const snapshot=()=>evaluate(`(()=>{const s=window.wulframMcp.dispatch({action:'get_editor_state'});return window.wulframMcp.dispatch({action:'get_snapshot',expectedRevision:s.revision});})()`);
      const current=await snapshot();
      await evaluate(`document.querySelector('.authoring-repair-panel').open=true`);
      const downloads=path.join(out,'repair-backups');await fs.mkdir(downloads);await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
      await button('Download original repair backup');
      const file=await waitFor(async()=>(await fs.readdir(downloads)).find(n=>n.endsWith('.json')),'original repair backup');assert.deepEqual(JSON.parse(await fs.readFile(path.join(downloads,file),'utf8')),current.project);
      await button('Load current repair rules');
      const repairField=async(label,value)=>{await evaluate(`(()=>{const el=document.querySelector('textarea[aria-label=${JSON.stringify(label)}]');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));})()`);await delay(60);};
      await repairField('Repair Build areas','[]');await button('Preview rule repair');
      assert.ok(await evaluate(`document.querySelector('.authoring-repair-panel output').textContent.includes('still has')`));assert.deepEqual((await snapshot()).project,current.project);
      await repairField('Repair Composition limits','');await button('Preview rule repair');
      assert.ok(await evaluate(`document.querySelector('.authoring-repair-panel output').textContent.includes('Preview passed')`));assert.deepEqual((await snapshot()).project,current.project);
      await screenshot('reviewed-rule-repair');await button('Apply reviewed rule repair');
      const applied=await snapshot();assert.equal(applied.undoCount,current.undoCount+1);assert.deepEqual(applied.project.terrain,current.project.terrain);assert.deepEqual(applied.project.entities,current.project.entities);
      const metadata=applied.project.baseLayouts.find(l=>l.id===applied.project.activeBaseLayoutId).metadata;assert.equal(metadata['forge.build-areas.v1'],'[]');assert.equal(metadata['forge.composition-budgets.v1'],undefined);
      await button('Undo');assert.deepEqual((await snapshot()).project,current.project);
      await evaluate(`document.querySelector('.authoring-repair-panel').open=false`);
      report.ruleRepair={backup:path.join(downloads,file),partialRejected:true,previewPreserved:true,oneUndo:true,originalRestored:true};
    }
    await importProject(original,'problem-original-project.json');
    assert.deepEqual(await saved(),original);
    assert.ok(await evaluate(`document.querySelector('.authoring-problems-panel').textContent.includes('No saved-rule problems detected')`));
    await evaluate(`document.querySelector('.authoring-problems-panel').open=false;document.querySelector('.composition-budget-panel').open=false`);
    report.authoringProblems={independentErrors:true,settingsFocus:true,importedDataPreserved:true,originalRestored:true};
  });
  if(process.env.WULFRAM_COMPOSITION_TEST==='1')await step('Author composition limits, reject infeasible counts and restore with Undo',async()=>{
    const key='forge.composition-budgets.v1';
    const rules=p=>JSON.parse(p.baseLayouts.find(l=>l.id===p.activeBaseLayoutId).metadata[key]||'[]');
    await evaluate(`document.querySelector('.composition-budget-panel').open=true`);
    await field('Maximum count',0,'.composition-budget-panel');await button('Save composition limit');
    const limited=await saved();assert.deepEqual(rules(limited),[{team:1,role:'all',min:0,max:0}]);
    assert.deepEqual(limited.entities,original.entities);assert.deepEqual(limited.terrain,original.terrain);
    await field('Minimum count',1,'.composition-budget-panel');await field('Maximum count',1,'.composition-budget-panel');await button('Save composition limit');
    assert.deepEqual(await saved(),limited,'Infeasible limit preserves saved project');
    assert.ok(await evaluate(`document.querySelector('.composition-budget-panel output').textContent.includes('required 1')`));
    await screenshot('composition-limit-rejected');
    await button('Remove team 1 all limit');assert.deepEqual(rules(await saved()),[]);
    await button('Undo');assert.deepEqual(rules(await saved()),rules(limited));
    await button('Undo');assert.deepEqual(await saved(),original);
    await evaluate(`document.querySelector('.composition-budget-panel').open=false`);
    report.composition={authored:true,infeasiblePreserved:true,removeUndo:true,wholeProjectRestored:true};
  });
  if(process.env.WULFRAM_TOOL_FINDER_TEST==='1')await step('Tool search opens contextual controls with focus and preserves previews',async()=>{
    await evaluate(`document.querySelector('.tool-finder').open=true`);
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1.25,mobile:false});
    await evaluate(`document.querySelector('[aria-label="Find editor tools"]').focus()`);
    await send('Input.insertText',{text:'valley'});
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});
    await waitFor(()=>evaluate(`document.activeElement?.textContent==='Large landforms and saved stamps'`),'keyboard result focus');
    await screenshot('tool-finder-compact-keyboard');
    assert.ok(await evaluate(`(()=>{const r=document.activeElement.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})()`),'Focused result visible in compact window');
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    await waitFor(()=>evaluate(`document.querySelector('[aria-label="3D stamp controls"]')?.contains(document.activeElement)`),'keyboard destination focus');
    await evaluate(`document.querySelector('[aria-label="Find editor tools"]').focus()`);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    assert.equal(await evaluate(`document.querySelector('[aria-label="Find editor tools"]').value`),'');
    await send('Emulation.clearDeviceMetricsOverride');
    report.toolFinderKeyboard={compactWidth:1280,compactHeight:800,deviceScaleFactor:1.25,arrowResultFocus:true,enterNavigation:true,escapeClear:true};
    await field('Find a tool','RAISE','body');await button('Raise terrain');
    await waitFor(()=>evaluate(`document.querySelector('[aria-label="Terrain brush settings"]')?.contains(document.activeElement)`),'brush settings focus');
    assert.ok(await evaluate(`document.querySelector('.operation-scope').textContent.includes('height')`));
    await field('Find a tool','valley','body');await button('Large landforms and saved stamps');
    await waitFor(()=>evaluate(`document.querySelector('[aria-label="3D stamp controls"]')?.contains(document.activeElement)`),'stamp settings focus');
    await field('Find a tool','no-such-tool-xyz','body');
    assert.equal(await evaluate(`document.querySelectorAll('.tool-finder-results button').length`),0);
    await field('Find a tool','lock','body');await button('Edit and lock districts');
    await waitFor(()=>evaluate(`document.querySelector('.district-panel')?.contains(document.activeElement)`),'district settings focus');
    await evaluate(`(()=>{const s=document.querySelector('select[aria-label="Active base layout"]');s.value='creative:workshop';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await button('Edit and lock districts');
    await waitFor(()=>evaluate(`document.querySelector('.tool-finder output').textContent.includes('Your preview is retained')`),'preview navigation guard');
    assert.ok(await evaluate(`!![...document.querySelectorAll('button')].find(b=>b.textContent==='Cancel preview')`));
    await button('Cancel preview');
    await field('Find a tool','version','body');await button('Build identity and recovery help');
    await waitFor(()=>evaluate(`document.querySelector('.about-editor')?.contains(document.activeElement)`),'About settings focus');
    assert.deepEqual(await saved(),original,'Navigation preserves the whole saved map');
    await screenshot('tool-finder-about');
    await evaluate(`document.querySelector('.tool-finder').open=false;document.querySelector('.about-editor').open=false`);
    report.toolFinder={search:true,brushFocus:true,stampFocus:true,districtFocus:true,aboutFocus:true,previewRetained:true,mapPreserved:true};
  });
  if(process.env.WULFRAM_SCOPE_TEST==='1')await step('Operation scope follows mode, mirror, inspection and creative preview without map changes',async()=>{
    const scope=()=>evaluate(`document.querySelector('.operation-scope').textContent`);
    assert.match(await scope(),/Active layout/);
    await button('Terrain');await button('3D stamp brush');assert.match(await scope(),/mirrored footprints/);assert.match(await scope(),/preview blocked/);
    await evaluate(`[...document.querySelectorAll('[aria-label="3D stamp controls"] label')].find(l=>l.textContent.trim()==='Mirror partner').querySelector('input').click()`);assert.match(await scope(),/single footprint/);
    await evaluate(`[...document.querySelectorAll('[aria-label="3D stamp controls"] label')].find(l=>l.textContent.trim()==='Mirror partner').querySelector('input').click()`);
    await evaluate(`document.querySelector('.operation-scope').open=true`);await screenshot('operation-scope-terrain');
    await button('Base builder');assert.match(await scope(),/do not automatically mirror/);
    await evaluate(`[...document.querySelectorAll('label')].find(l=>l.textContent.includes('Inspect buildings (clicks do not place or move)')).querySelector('input').click()`);assert.match(await scope(),/inspect only/);
    await evaluate(`[...document.querySelectorAll('label')].find(l=>l.textContent.includes('Inspect buildings (clicks do not place or move)')).querySelector('input').click()`);
    await evaluate(`(()=>{const s=document.querySelector('select[aria-label="Active base layout"]');s.value='creative:workshop';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);assert.match(await scope(),/New base layout/);await button('Cancel preview');
    assert.deepEqual(await saved(),original);await evaluate(`document.querySelector('.operation-scope').open=false`);
    report.operationScope={modeTransitions:true,mirrorTransitions:true,inspection:true,creativePreview:true,mapPreserved:true};
  });
  if(process.env.WULFRAM_ABOUT_TEST==='1')await step('About identifies native build and explains current tools without changing the map',async()=>{
    const expected=process.env.WULFRAM_EXPECTED_BUILD;assert.ok(expected,'Provide WULFRAM_EXPECTED_BUILD for the About identity check');
    await evaluate(`document.querySelector('.workflow-guide > details').open=true;document.querySelector('.about-editor').open=true`);
    await waitFor(()=>evaluate(`!!document.querySelector('.about-editor strong')`),'native build identity');
    const version=await evaluate(`document.querySelector('.about-editor strong').textContent`);assert.ok(version===expected||version.startsWith(expected+'+'),`Unexpected native build: ${version}`);
    const text=await evaluate(`document.querySelector('.about-editor').textContent`);assert.match(text,/WebView2 runtime:/);assert.match(text,/17 creative base families/);
    const count=await evaluate(`[...document.querySelectorAll('.section-heading')].find(e=>e.textContent.includes('BASE TEMPLATES'))?.querySelector('span')?.textContent`);assert.ok(count);assert.ok(text.includes(count+' available base templates'));
    for(const label of ['Supported files','Save, Undo and recovery','What editor checks establish'])await evaluate(`[...document.querySelectorAll('.about-editor details')].find(d=>d.querySelector('summary').textContent===${JSON.stringify(label)}).open=true`);
    await evaluate(`document.querySelector('.about-editor').scrollIntoView({block:'start'})`);await screenshot('about-editor');assert.deepEqual(await saved(),original);
    report.about={nativeVersion:version,templateCount:Number(count),mapPreserved:true};
    await evaluate(`document.querySelector('.about-editor').open=false`);
  });
  if(process.env.WULFRAM_LIBRARY_RECOVERY_TEST==='1'){
    await step('Damaged profile libraries retain exact backups and recover without map changes',async()=>{
      const brushRaw='  broken brush JSON\n{',compositionRaw=' broken compositions\n[';
      // Deliberate corruption is restricted to this runner's isolated profile, never production map state.
      await evaluate(`localStorage.setItem('forge-manual-brushes-v1',${JSON.stringify(brushRaw)});localStorage.setItem('forge-terrain-compositions-v1',${JSON.stringify(compositionRaw)});`);
      await button('Base builder');await button('Terrain');await evaluate(`document.querySelector('.brush-library-panel').open=true`);
      assert.equal(await evaluate(`[...document.querySelectorAll('.brush-library-panel button')].find(b=>b.textContent==='Save new brush').disabled`),true);
      const downloads=path.join(out,'library-recovery-downloads');await fs.mkdir(downloads);await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
      await button('Export brush library');await waitFor(async()=>(await fs.readdir(downloads)).includes('brush-library-recovery.json'),'damaged brush download');assert.equal(await fs.readFile(path.join(downloads,'brush-library-recovery.json'),'utf8'),brushRaw);
      await button('Back up and reset brushes');assert.deepEqual(await evaluate(`JSON.parse(localStorage.getItem('forge-manual-brushes-v1'))`),[]);
      const backupFor=key=>evaluate(`Object.keys(localStorage).filter(k=>k.startsWith(${JSON.stringify(key+'-recovery-')})).map(k=>({key:k,raw:localStorage.getItem(k)}))`);
      const brushBackup=await backupFor('forge-manual-brushes-v1');assert.equal(brushBackup.length,1);assert.equal(brushBackup[0].raw,brushRaw);
      await button('Save new brush');assert.equal(await evaluate(`JSON.parse(localStorage.getItem('forge-manual-brushes-v1')).length`),1);assert.deepEqual(await saved(),original);
      await button('3D stamp brush');await evaluate(`document.querySelector('.terrain-composition-panel').open=true;document.querySelector('.composition-library').open=true`);
      assert.ok(await evaluate(`!!document.querySelector('.composition-library [role="alert"]')`));
      await button('Download composition recovery data');await waitFor(async()=>(await fs.readdir(downloads)).includes('composition-library-recovery.json'),'damaged composition download');assert.equal(await fs.readFile(path.join(downloads,'composition-library-recovery.json'),'utf8'),compositionRaw);
      await button('Back up and reset compositions');const compositionBackup=await backupFor('forge-terrain-compositions-v1');assert.equal(compositionBackup.length,1);assert.equal(compositionBackup[0].raw,compositionRaw);
      await button('Add current landform');await button('Save new composition');assert.equal(await evaluate(`JSON.parse(localStorage.getItem('forge-terrain-compositions-v1')).length`),1);assert.deepEqual(await saved(),original);
      await screenshot('composition-library-recovered');await stop();await launch();assert.deepEqual(await saved(),original);
      assert.deepEqual(await backupFor('forge-manual-brushes-v1'),brushBackup);assert.deepEqual(await backupFor('forge-terrain-compositions-v1'),compositionBackup);
      assert.equal(await evaluate(`JSON.parse(localStorage.getItem('forge-manual-brushes-v1')).length`),1);assert.equal(await evaluate(`JSON.parse(localStorage.getItem('forge-terrain-compositions-v1')).length`),1);
      await button('Terrain');await evaluate(`document.querySelector('.brush-library-panel').open=true`);
      const reopenedDownloads=path.join(out,'reopened-recovery-downloads');await fs.mkdir(reopenedDownloads);await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:reopenedDownloads});
      await button('Download brush recovery backup');await waitFor(async()=>(await fs.readdir(reopenedDownloads)).includes('brush-library-recovery.json'),'reopened brush backup');assert.equal(await fs.readFile(path.join(reopenedDownloads,'brush-library-recovery.json'),'utf8'),brushRaw);
      await button('3D stamp brush');await evaluate(`document.querySelector('.terrain-composition-panel').open=true;document.querySelector('.composition-library').open=true`);await button('Download composition recovery data');await waitFor(async()=>(await fs.readdir(reopenedDownloads)).includes('composition-library-recovery.json'),'reopened composition backup');assert.equal(await fs.readFile(path.join(reopenedDownloads,'composition-library-recovery.json'),'utf8'),compositionRaw);
      report.libraryRecovery={blockedWrites:true,exactDownloads:true,verifiedBackups:true,recoveredWrites:true,restartRetainsBackups:true,reopenedDownloads:true,mapPreserved:true};
    });
  } else if(process.env.WULFRAM_BRUSH_LIBRARY_TEST==='1'){
    await step('Saved brush settings survive load, portable import, library Undo and restart',async()=>{
      await button('Terrain');await evaluate(`[...document.querySelectorAll('.tool-item')].find(b=>b.querySelector('span')?.textContent==='Set height').click()`);
      await field('Radius / half-size','450','[aria-label="Terrain brush settings"]');await field('Strength','100','[aria-label="Terrain brush settings"]');await field('Target terrain height','42','body');await button('square');await button('hard');
      await evaluate(`document.querySelector('.brush-library-panel').open=true`);const scope='.brush-library-panel';
      await field('Brush name','Native flat site',scope);await button('Save new brush');
      const entries=await evaluate(`JSON.parse(localStorage.getItem('forge-manual-brushes-v1'))`);assert.equal(entries.length,1);assert.equal(entries[0].settings.targetHeight,42);assert.equal(entries[0].settings.radius,450);assert.equal(entries[0].settings.shape,'square');
      await button('Save new brush');assert.match(await evaluate(`document.querySelector('.brush-library-panel output').textContent`),/already saved/);assert.deepEqual(await evaluate(`JSON.parse(localStorage.getItem('forge-manual-brushes-v1'))`),entries);
      await field('Radius / half-size','100','[aria-label="Terrain brush settings"]');await field('Target terrain height','10','body');await button('round');await button('soft');
      await button('Load selected brush');
      const controls=()=>evaluate(`(()=>{const number=label=>Number([...document.querySelectorAll('label')].find(e=>e.textContent.startsWith(label)).querySelector('input').value);return {radius:number('Radius / half-size'),height:number('Target terrain height'),shape:document.querySelector('.brush-option-group button.active').textContent};})()`);
      assert.deepEqual(await controls(),{radius:450,height:42,shape:'square'});assert.deepEqual(await saved(),original);
      assert.match(await evaluate(`document.querySelector('.brush-library-panel select').selectedOptions[0].textContent`),/Set height/);
      await screenshot('brush-library-loaded');
      const downloads=path.join(out,'brush-downloads');await fs.mkdir(downloads);await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});await button('Export brush library');
      const file=await waitFor(async()=>(await fs.readdir(downloads)).find(n=>n.endsWith('.json')),'brush export');assert.deepEqual(JSON.parse(await fs.readFile(path.join(downloads,file),'utf8')).entries,entries);
      await button('Remove selected brush');assert.deepEqual(await evaluate(`JSON.parse(localStorage.getItem('forge-manual-brushes-v1'))`),[]);await button('Undo brush library change');assert.deepEqual(await evaluate(`JSON.parse(localStorage.getItem('forge-manual-brushes-v1'))`),entries);
      await field('Saved brush','Native flat site',scope);await button('Remove selected brush');
      const {root:doc}=await send('DOM.getDocument'),{nodeId}=await send('DOM.querySelector',{nodeId:doc.nodeId,selector:scope+' input[type="file"]'});await send('DOM.setFileInputFiles',{nodeId,files:[path.join(downloads,file)]});
      await waitFor(()=>evaluate(`JSON.parse(localStorage.getItem('forge-manual-brushes-v1')).length===1`),'brush imported');assert.deepEqual(await saved(),original);
      await stop();await launch();await button('Terrain');await evaluate(`document.querySelector('.brush-library-panel').open=true`);await field('Find saved brush','flat',scope);await field('Saved brush','Native flat site',scope);await button('Load selected brush');
      assert.deepEqual(await controls(),{radius:450,height:42,shape:'square'});assert.deepEqual(await saved(),original);
      report.brushLibrary={settingsRestored:true,duplicateRejected:true,exportImport:true,removeUndo:true,restart:true,mapPreserved:true};
    });
  } else if(process.env.WULFRAM_TERRAIN_SELECTION_TEST==='1'){
    await step('Brush selection clips edits, preserves outside clicks and supports Undo',async()=>{
      await button('Terrain');
      await evaluate(`document.querySelector('.terrain-selection-panel').open=true`);
      if(process.env.WULFRAM_SELECTION_DRAW_TEST==='1'){
        const area=await evaluate(`(()=>{const r=document.querySelector('.terrain-viewport').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
        const start={x:area.x-100,y:area.y-35},end={x:area.x+90,y:area.y-35};
        const move=p=>send('Input.dispatchMouseEvent',{type:'mouseMoved',...p});
        const down=p=>send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});
        const up=p=>send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});
        const selection=()=>evaluate(`Object.fromEntries([...document.querySelectorAll('.terrain-selection-panel label')].map(l=>[l.querySelector('span').textContent,Number(l.querySelector('input').value)]))`);
        const undoBefore=await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).undoCount`);
        await button('Draw brush selection');await move(start);await down(start);await move(end);await delay(200);await screenshot('draw-selection-preview',true);await up(end);await delay(150);
        const drawn=await selection();assert.ok(drawn['Selection width']>1&&drawn['Selection height']>1);assert.deepEqual(await saved(),original);assert.equal(await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).undoCount`),undoBefore);
        await button('Draw brush selection');await move(start);await down(start);await move(end);await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await delay(150);await move({x:end.x+30,y:end.y});await up(end);await delay(150);
        assert.deepEqual(await selection(),drawn);assert.deepEqual(await saved(),original);assert.equal(await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).undoCount`),undoBefore);
        await button('Draw brush selection');await button('Cancel selection drawing');assert.deepEqual(await selection(),drawn);assert.deepEqual(await saved(),original);
        if(process.env.WULFRAM_SELECTION_INTERRUPTION_TEST==='1'){
          await button('Draw brush selection');await move(start);await down(start);await move(end);await delay(100);
          // Browser cancellation signal after genuine native pointer movement; not a hardware touch test.
          await evaluate(`document.querySelector('.terrain-viewport canvas').dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:1}))`);await up(end);await delay(100);
          assert.deepEqual(await selection(),drawn);assert.deepEqual(await saved(),original);assert.equal(await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).undoCount`),undoBefore);
          await button('Draw brush selection');await move(start);await down(start);await move(end);
          await send('Input.dispatchKeyEvent',{type:'keyDown',key:'2',code:'Digit2',windowsVirtualKeyCode:50,text:'2'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'2',code:'Digit2',windowsVirtualKeyCode:50});
          await waitFor(()=>evaluate(`document.querySelector('.inspector-heading h2')?.textContent==='Lower brush'`),'tool changed during drag');await move({x:end.x+30,y:end.y});await up(end);await delay(100);
          assert.deepEqual(await selection(),drawn);assert.deepEqual(await saved(),original);assert.equal(await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).undoCount`),undoBefore);
          await evaluate(`[...document.querySelectorAll('.tool-item')].find(b=>b.querySelector('span')?.textContent==='Raise').click()`);
          await button('Draw brush selection');await move(start);await down(start);await move(end);
          const prior=await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).revision`);
          const {root:doc}=await send('DOM.getDocument'),{nodeId}=await send('DOM.querySelector',{nodeId:doc.nodeId,selector:'input[type="file"][multiple]'});await send('DOM.setFileInputFiles',{nodeId,files:[fixture]});
          await waitFor(()=>evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).revision!==${JSON.stringify(prior)}`),'map imported during drawing');
          const importedUndo=await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).undoCount`);
          await move({x:end.x+30,y:end.y});await up(end);await delay(100);assert.deepEqual(await selection(),drawn);assert.deepEqual(await saved(),original);assert.equal(await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).undoCount`),importedUndo);
          report.selectionInterruptions={pointerCancelSignal:true,toolShortcut:true,mapReimport:true,previousSelectionRetained:true,noBrushLeakage:true};
        }
        await button('Clear brush selection');report.selectionDrawing={drawn,drag:true,escapePreservesPrevious:true,cancelPreservesPrevious:true,continuedDragDoesNotPaint:true,mapAndHistoryPreserved:true};
      }
      await button('Select center region');
      const scope='.terrain-selection-panel';
      const region={x:original.terrain.worldWidth/4,y:original.terrain.worldHeight/4,width:original.terrain.worldWidth/2,height:original.terrain.worldHeight/2};
      const point=await evaluate(`(()=>{const r=document.querySelector('.terrain-viewport').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
      const click=async()=>{await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await delay(200);await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});await delay(200);};
      if(process.env.WULFRAM_TERRAIN_MEASUREMENT_TEST==='1'){
        await evaluate(`document.querySelector('.terrain-measurement-panel').open=true`);await button('Measure terrain region');
        assert.match(await evaluate(`document.querySelector('.terrain-measurement-panel output').textContent`),/Steepest terrain face0°/);assert.deepEqual(await saved(),original);
      }
      if(process.env.WULFRAM_SELECTION_PROTECTION_TEST==='1'){
        const undoBefore=await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).undoCount`);
        await button('Protect selected heights');const protectedProject=await saved();
        const areas=JSON.parse(protectedProject.baseLayouts.find(l=>l.id===protectedProject.activeBaseLayoutId).metadata['forge.build-areas.v1']);
        assert.deepEqual(Object.fromEntries(['x','y','width','height'].map(k=>[k,areas.at(-1)[k]])),region);
        assert.equal(areas.at(-1).kind,'terrain');assert.deepEqual(protectedProject.terrain,original.terrain);
        assert.equal(await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).undoCount`),undoBefore+1);
        await click();assert.match(await evaluate(`document.body.textContent`),/terrain heights are protected/);
        assert.deepEqual(await saved(),protectedProject,'Protected height stroke is atomic and leaves the map unchanged');
        await screenshot('selection-height-protection');await button('Undo');assert.deepEqual(await saved(),original);
        await button('Redo');assert.deepEqual(await saved(),protectedProject);
        await button('Edit protected areas');await waitFor(()=>evaluate(`document.querySelector('.build-area-panel')?.checkVisibility()`),'protected areas panel visible');
        await button('Undo');assert.deepEqual(await saved(),original);await button('Terrain');
        await evaluate(`document.querySelector('.terrain-selection-panel').open=true`);
        report.selectionProtection={savedRectangle:true,heightStrokeRejected:true,atomicRejection:true,undoRedo:true,editRulesNavigation:true};
      }
      await click();const applied=await saved();let changes=0;
      for(let i=0;i<applied.terrain.heights.length;i++)if(applied.terrain.heights[i]!==original.terrain.heights[i]){changes++;assert.ok(terrainSelectionContainsVertex(region,original.terrain,i%original.terrain.width,Math.floor(i/original.terrain.width)));}
      assert.ok(changes>0,'Center brush edits selected terrain');assert.deepEqual(applied.entities,original.entities);assert.deepEqual(applied.terrain.textureIds,original.terrain.textureIds);
      if(process.env.WULFRAM_TERRAIN_MEASUREMENT_TEST==='1'){
        assert.match(await evaluate(`document.querySelector('.terrain-measurement-panel output').textContent`),/Measure again/);
        await button('Measure terrain region');
        const measured=await evaluate(`document.querySelector('.terrain-measurement-panel output').textContent`);assert.ok(!measured.includes('Steepest terrain face0°'));assert.deepEqual(await saved(),applied);
        await screenshot('terrain-measurement-after-brush');report.terrainMeasurement={flat:true,editInvalidates:true,remeasuredSlope:true,mapPreserved:true};
      }
      await screenshot('terrain-selection-applied');await button('Undo');assert.deepEqual(await saved(),original);await button('Redo');assert.deepEqual(await saved(),applied);
      const clippedRegion={...region,x:original.terrain.worldWidth/2,width:original.terrain.worldWidth/4};
      await field('Selection x',clippedRegion.x,scope);await field('Selection width',clippedRegion.width,scope);
      await click();const clipped=await saved();let clippedChanges=0;
      for(let i=0;i<clipped.terrain.heights.length;i++)if(clipped.terrain.heights[i]!==applied.terrain.heights[i]){clippedChanges++;assert.ok(terrainSelectionContainsVertex(clippedRegion,original.terrain,i%original.terrain.width,Math.floor(i/original.terrain.width)));}
      assert.ok(clippedChanges>0&&clippedChanges<changes,'Boundary stroke changes only the portion fully inside');
      await button('Undo');assert.deepEqual(await saved(),applied);
      await field('Selection x','0',scope);await field('Selection y','0',scope);await field('Selection width','100',scope);await field('Selection height','100',scope);
      if(process.env.WULFRAM_TERRAIN_MEASUREMENT_TEST==='1'){assert.match(await evaluate(`document.querySelector('.terrain-measurement-panel output').textContent`),/Measure again/);report.terrainMeasurement.selectionInvalidates=true;}
      const before=await saved();const undoBefore=await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).undoCount`);
      await click();assert.deepEqual(await saved(),before);assert.equal(await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).undoCount`),undoBefore);
      await evaluate(`[...document.querySelectorAll('.tool-item')].find(b=>b.querySelector('span')?.textContent==='Paint texture').click()`);
      await click();assert.deepEqual(await saved(),before,'Outside painting does not append texture tags or create history');assert.equal(await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).undoCount`),undoBefore);
      await evaluate(`[...document.querySelectorAll('.tool-item')].find(b=>b.querySelector('span')?.textContent==='Raise').click()`);
      await field('Selection width',original.terrain.worldWidth+100,scope);await click();assert.deepEqual(await saved(),before);
      await button('Clear brush selection');await click();assert.notDeepEqual((await saved()).terrain.heights,before.terrain.heights);
      report.terrainSelection={changedVertices:changes,clippedVertices:clippedChanges,extentPreserved:true,outsidePaintNoOp:true,outsideNoOp:true,invalidNoOp:true,undoRedo:true,clearRestoresBrush:true};
    });
  } else if(process.env.WULFRAM_COMPOSITION_UI_TEST==='1'){
    await step('Compose landforms with combined preview, cancel and one-step Undo',async()=>{
      await button('Terrain');await button('3D stamp brush');
      await field('Placement mode','manual','[aria-label="3D stamp controls"]');
      await evaluate(`(()=>{const c=[...document.querySelectorAll('[aria-label="3D stamp controls"] label')].find(l=>l.textContent.trim()==='Mirror partner').querySelector('input');if(c.checked)c.click();document.querySelector('.terrain-composition-panel').open=true;})()`);
      await field('Length','1800','[aria-label="3D stamp controls"]');await field('Width','1000','[aria-label="3D stamp controls"]');await field('Height / depth','400','[aria-label="3D stamp controls"]');
      const scope='.terrain-composition-panel';
      if(process.env.WULFRAM_COMPOSER_MODE_TEST==='1'){
        await waitFor(()=>evaluate(`document.querySelector('.composition-preview-banner')?.textContent.includes('Composition editing')`),'composition editing mode');
        assert.equal(await evaluate(`!!document.querySelector('[data-stamp-error]')`),false);
        const point=await evaluate(`(()=>{const r=document.querySelector('.terrain-viewport').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
        await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
        assert.deepEqual(await saved(),original,'Composer browsing pauses terrain clicks');
        await evaluate(`document.querySelector('.terrain-composition-panel').open=false`);
        await waitFor(()=>evaluate(`!document.querySelector('.composition-preview-banner')`),'single-stamp mode restored');
        await evaluate(`document.querySelector('.tool-finder').open=true`);await field('Find a tool','composition','body');await button('Compose and reuse landforms');
        await waitFor(()=>evaluate(`document.querySelector('.terrain-composition-panel').contains(document.activeElement)&&document.querySelector('.terrain-composition-panel').open`),'tool finder enters composer');
        report.composerMode={clicksPaused:true,brushWarningHidden:true,closeRestoresStampMode:true,toolFinder:true};
      }

      await evaluate(`document.querySelector('.terrain-composition-panel input[type="checkbox"]').click()`);
      await button('Add current landform');await field('Landform 1 offset X','-1400',scope);
      await field('Landform','valley','[aria-label="3D stamp controls"]');await button('Add current landform');await field('Landform 2 offset X','1400',scope);
      if(process.env.WULFRAM_COMPOSITION_GUARD_TEST==='1'){
        const importMap=async(file)=>{const revision=await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).revision`);const {root:mapDoc}=await send('DOM.getDocument'),{nodeId:mapFile}=await send('DOM.querySelector',{nodeId:mapDoc.nodeId,selector:'input[type="file"][multiple]'});await send('DOM.setFileInputFiles',{nodeId:mapFile,files:[file]});await waitFor(()=>evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).revision!==${JSON.stringify(revision)}`),'guard map imported');};
        const protectedMap=structuredClone(original);protectedMap.baseLayouts.find(l=>l.id===protectedMap.activeBaseLayoutId).metadata['forge.build-areas.v1']=JSON.stringify([{id:'service-site',name:'Service site',kind:'terrain',team:'all',x:4500,y:3900,width:200,height:200}]);
        const protectedFile=path.join(out,'protected-composition-map.json');await fs.writeFile(protectedFile,JSON.stringify(protectedMap));await importMap(protectedFile);const guarded=await saved();
        await button('Preview composition');await waitFor(()=>evaluate(`document.querySelector('.terrain-composition-panel').textContent.includes('terrain heights are protected')`),'protected composition rejected');
        assert.ok(await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Apply composition').disabled`));assert.deepEqual(await saved(),guarded);
        await importMap(fixture);assert.deepEqual(await saved(),original);await button('Preview composition');
        await waitFor(()=>evaluate(`!![...document.querySelectorAll('button')].find(b=>b.textContent==='Apply composition'&&!b.disabled)`),'source-guard proposal ready');
        await importMap(fixture);assert.ok(await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Apply composition').disabled`));assert.deepEqual(await saved(),original);
        report.compositionGuards={protectedTerrain:true,noMutationOnFailure:true,sourceChangeDisablesApply:true};
      }
      await button('Preview composition');
      await waitFor(()=>evaluate(`!![...document.querySelectorAll('button')].find(b=>b.textContent==='Apply composition'&&!b.disabled)`),'composition preview');
      const snapshot=()=>evaluate(`window.wulframMcp.dispatch({action:'get_snapshot',expectedRevision:window.wulframMcp.dispatch({action:'get_editor_state'}).revision}).project`);
      assert.deepEqual(await snapshot(),original);await screenshot('composition-preview');
      if(process.env.WULFRAM_COMPOSITION_COMPARE_TEST==='1'){
        await button('Show original terrain');assert.ok(await evaluate(`document.querySelector('.composition-preview-banner').textContent.includes('Original terrain')`));
        assert.ok(await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Apply composition').disabled`));assert.deepEqual(await snapshot(),original);await screenshot('composition-original');
        await button('Show proposed terrain');assert.ok(await evaluate(`![...document.querySelectorAll('button')].find(b=>b.textContent==='Apply composition').disabled`));assert.deepEqual(await snapshot(),original);
        report.compositionComparison={originalView:true,proposedView:true,mapPreserved:true,applyRequiresProposedView:true};
      }
      await button('Cancel composition preview');assert.ok(!(await evaluate(`document.querySelector('.statusbar').textContent`)).includes('COMPOSITION PREVIEW'));assert.deepEqual(await saved(),original);
      await button('Preview composition');await field('Composition rotation','15',scope);
      assert.ok(await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Apply composition').disabled`),'Editing invalidates preview');
      await button('Preview composition');const state=await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'})`);await button('Apply composition');
      const applied=await saved();assert.notDeepEqual(applied.terrain.heights,original.terrain.heights);assert.deepEqual(applied.entities,original.entities);
      assert.equal(JSON.parse(applied.metadata['terrainComposition.last']).composition.stamps.length,2);
      assert.equal(await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).undoCount`),state.undoCount+1);
      await button('Undo');assert.deepEqual(await saved(),original);await button('Redo');assert.deepEqual(await saved(),applied);
      const downloads=path.join(out,'composition-downloads');await fs.mkdir(downloads);await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});await button('Export composition');
      const file=await waitFor(async()=>(await fs.readdir(downloads)).find(n=>n.endsWith('.json')),'composition export');const recipe=JSON.parse(await fs.readFile(path.join(downloads,file),'utf8'));assert.equal(recipe.stamps.length,2);
      await button('Remove landform 2');const {root:doc}=await send('DOM.getDocument'),{nodeId}=await send('DOM.querySelector',{nodeId:doc.nodeId,selector:scope+' input[type="file"]'});await send('DOM.setFileInputFiles',{nodeId,files:[path.join(downloads,file)]});
      await waitFor(()=>evaluate(`document.querySelectorAll('.terrain-composition-panel fieldset').length===2`),'composition imported');assert.deepEqual(await saved(),applied);
      if(process.env.WULFRAM_COMPOSITION_LIBRARY_UI_TEST==='1'){
        await evaluate(`document.querySelector('.composition-library').open=true`);await button('Save new composition');
        const entries=await evaluate(`JSON.parse(localStorage.getItem('forge-terrain-compositions-v1'))`);assert.deepEqual(entries,[recipe]);
        await button('Remove selected composition');assert.equal(await evaluate(`JSON.parse(localStorage.getItem('forge-terrain-compositions-v1')).length`),0);
        await button('Undo composition library change');assert.deepEqual(await evaluate(`JSON.parse(localStorage.getItem('forge-terrain-compositions-v1'))`),entries);
        await field('Find saved composition','valley',scope);await field('Saved composition',recipe.name,scope);await button('Load selected composition');assert.deepEqual(await saved(),applied);
      }
      await screenshot('composition-applied');await stop();await launch();assert.deepEqual(await saved(),applied);
      if(process.env.WULFRAM_COMPOSITION_LIBRARY_UI_TEST==='1'){
        await button('Terrain');await button('3D stamp brush');await evaluate(`document.querySelector('.terrain-composition-panel').open=true;document.querySelector('.composition-library').open=true`);
        await field('Saved composition',recipe.name,scope);await button('Load selected composition');assert.equal(await evaluate(`document.querySelectorAll('.terrain-composition-panel fieldset').length`),2);assert.deepEqual(await saved(),applied);
        await screenshot('composition-library-reopened');report.compositionLibrary={save:true,removeUndo:true,search:true,load:true,restart:true,mapPreserved:true};
      }
      report.terrainComposition={previewPreserved:true,cancelPreserved:true,draftInvalidation:true,oneUndo:true,undoRedo:true,portableRecipe:true,restart:true};
    });
  } else if(process.env.WULFRAM_FAVORITE_RULE_TEST==='1'){
    await step('Favorite refusal preserves authoring rules and whole-map export',async()=>{
      await button('Base builder');const before=await saved();
      const favorites=await evaluate(`localStorage.getItem('forge-formation-favorites-v1')`);
      await button('Save active formation as favorite');
      await waitFor(()=>evaluate(`document.body.textContent.includes('additional authoring rules. Export the whole map')`),'Favorite authoring-rule warning');
      assert.equal(await evaluate(`localStorage.getItem('forge-formation-favorites-v1')`),favorites);assert.deepEqual(await saved(),before);
      const downloads=path.join(out,'rule-map-export');await fs.mkdir(downloads);await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});await button('Export map');
      const file=await waitFor(async()=>(await fs.readdir(downloads)).find(n=>n.endsWith('.zip')),'Rule-preserving map export');
      const entries=await readMapArchive(await fs.readFile(path.join(downloads,file))),exported=JSON.parse(entries.find(e=>e.name.endsWith('/wulfram-project.json')).text);
      assert.deepEqual(exported.baseLayouts,before.baseLayouts);assert.deepEqual(exported.entities,before.entities);assert.deepEqual(exported.terrain,before.terrain);
      report.favoriteRules={favoriteUnchanged:true,mapUnchanged:true,wholeMapRulesPreserved:true,archive:path.join(downloads,file)};
    });
  } else if(process.env.WULFRAM_FRONTIER_MATRIX_TEST==='1'||process.env.WULFRAM_OFFSET_MATRIX_TEST==='1'){
    const offset=process.env.WULFRAM_OFFSET_MATRIX_TEST==='1',family=offset?'offset-bastion':'frontier-camp',reportKey=offset?'offsetMatrix':'frontierMatrix';
    const matrixArrangement=process.env.WULFRAM_OFFSET_ARRANGEMENT;
    if(matrixArrangement&&(!offset||!['wide-front','deep-court','split-wings'].includes(matrixArrangement)))throw new Error('Invalid matrix arrangement.');
    await step(`Native ${family} generation across four sizes and three terrain fixtures`,async()=>{
      report[reportKey]=[];
      const snapshot=()=>evaluate(`window.wulframMcp.dispatch({action:'get_snapshot',expectedRevision:window.wulframMcp.dispatch({action:'get_editor_state'}).revision}).project`);
      for(const terrain of ['flat','valley','irregular'])for(const size of ['small','standard','large','massive']){
        const name=`${terrain}-${size}`,file=path.join(path.dirname(fixture),`${name}.json`),count=(offset?{small:12,standard:18,large:26,massive:34}:{small:9,standard:16,large:24,massive:32})[size];
        console.log(`${family} native matrix: ${name}`);
        const prior=await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).revision`);
        const {root}=await send('DOM.getDocument'),{nodeId}=await send('DOM.querySelector',{nodeId:root.nodeId,selector:'input[type="file"][multiple]'});await send('DOM.setFileInputFiles',{nodeId,files:[file]});
        await waitFor(()=>evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).revision!==${JSON.stringify(prior)}`),'matrix fixture imported');
        const fixtureBytes=await fs.readFile(file),expectedSource=JSON.parse(fixtureBytes.toString('utf8'));
        const source=await saved();assert.deepEqual(source.terrain,expectedSource.terrain);assert.deepEqual(source.entities,expectedSource.entities);assert.deepEqual(source.baseLayouts,expectedSource.baseLayouts);
        const fixtureSha256=createHash('sha256').update(fixtureBytes).digest('hex');
        await button('Base builder');
        await evaluate(`(()=>{const s=document.querySelector('select[aria-label="Active base layout"]');s.value=${JSON.stringify('creative:'+family)};s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
        await field('Base size',size,'body');await field('Target structures per team',count,'body');await field('Building area radius','2400','body');await field('Base rotation','35','body');
        if(matrixArrangement)await field('District arrangement',matrixArrangement,'body');
        await button('Preview formation');
        await waitFor(()=>evaluate(`!![...document.querySelectorAll('button')].find(b=>b.textContent==='Apply formation'&&!b.disabled)`),`matrix ${name} preview`);
        assert.deepEqual(await snapshot(),source);
        await button('Team 1 · Overhead');await screenshot(`matrix-${name}-preview`);
        await button('Apply formation');const applied=await saved(),layout=applied.baseLayouts.find(l=>l.id===applied.activeBaseLayoutId);
        assert.equal(layout.entities.length,count*2);assert.equal(layout.metadata['formation.version'],offset?(matrixArrangement?`offset-bastion-arrangements-v1:${matrixArrangement}`:'offset-bastion-v1'):'frontier-camp-v1');assert.equal(JSON.parse(layout.metadata['forge.build-areas.v1']).length,2);assert.deepEqual(applied.terrain,source.terrain);
        await button('Team 1 · Ground level');await screenshot(`matrix-${name}-ground`);
        await fs.writeFile(path.join(out,`matrix-${name}.json`),JSON.stringify(applied));
        await button('Undo');assert.deepEqual(await saved(),source);await button('Redo');assert.deepEqual(await saved(),applied);
        report[reportKey].push({terrain,size,fixtureSha256,fixturePreserved:true,arrangement:matrixArrangement??(offset?'classic':undefined),countPerTeam:count,seed:layout.metadata['formation.seed'],candidateSeed:layout.metadata['formation.candidateSeed'],previewPreserved:true,terrainPreserved:true,undoRedo:true,access:JSON.parse(layout.metadata['formation.access'])});
        await fs.writeFile(path.join(out,'matrix-progress.json'),JSON.stringify(report[reportKey],null,2));
      }
    });
  } else if(process.env.WULFRAM_FRONTIER_PREVIEW_TEST==='1'||process.env.WULFRAM_OFFSET_PREVIEW_TEST==='1'){
    const previewSize=process.env.WULFRAM_PORTABLE_SIZE??'small';
    if(!['small','standard','large','massive'].includes(previewSize))throw new Error('Invalid portable size.');
    const offset=process.env.WULFRAM_OFFSET_PREVIEW_TEST==='1',family=offset?'offset-bastion':'frontier-camp',prefix=offset?'offset-bastion':'frontier',count=offset?({small:12,standard:18,large:26,massive:34})[previewSize]:({small:9,standard:16,large:24,massive:32})[previewSize];
    const portableEntrances=process.env.WULFRAM_ENTRANCE_LIBRARY_TEST==='1';
    if(portableEntrances&&(!offset||process.env.WULFRAM_ENTRANCE_POLICY_TEST!=='1'))throw new Error('Entrance library acceptance requires Offset and entrance-policy flags.');
    const entrancePolicy={version:1,bindings:[1,2].map(team=>({team,corridorId:`offset-bastion-approach-${team}`,direction:'forward'}))};
    await step(`${family} native generation, preview, Undo, portable export and reuse`,async()=>{
      await button('Base builder');
      await evaluate(`(()=>{const s=document.querySelector('select[aria-label="Active base layout"]');s.value=${JSON.stringify('creative:'+family)};s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
      if(process.env.WULFRAM_FRONTIER_LIBRARY_TEST==='1'){
        if(offset)throw new Error('Frontier library test requires Frontier preview.');
        const beforeLibrary=await saved();
        await button('Browse base library');await field('Collection','Creative');await field('Search designs','Frontier Camp');await field('Creative size',previewSize);
        assert.equal(await evaluate(`document.querySelectorAll('.base-library-card').length`),1);
        await button('Details: Frontier Camp');
        assert.ok(await evaluate(`document.querySelector('.base-library-detail').textContent.includes('expansion strip')`));
        await screenshot('frontier-creative-library');await button('Preview on current map');
        assert.equal(await evaluate(`document.querySelector('select[aria-label="Creative base size"]').value`),previewSize);
        assert.equal(await evaluate(`document.querySelector('input[aria-label="Building area radius"]').value`),'2400');
        assert.deepEqual(await saved(),beforeLibrary);
        report.frontierLibrary={reviewedFamily:true,reservationLabel:true,size:previewSize,radius:2400,browsingUnchanged:true};
      }
      if(process.env.WULFRAM_OFFSET_LIBRARY_TEST==='1'){
        if(!offset)throw new Error('Offset library test requires Offset preview.');
        const libraryArrangement=process.env.WULFRAM_OFFSET_ARRANGEMENT??'deep-court',labels={classic:'Classic','wide-front':'Wide Front','deep-court':'Deep Court','split-wings':'Split Wings'};
        await button('Browse base library');await field('Collection','Creative');await field('Search designs','Offset Bastion');await field('Creative size',previewSize);
        assert.equal(await evaluate(`document.querySelectorAll('.base-library-card').length`),4);
        assert.equal(await evaluate(`document.querySelector('.base-library-advanced').open`),false);await button('More filters');await field('Includes','service');assert.equal(await evaluate(`document.querySelectorAll('.base-library-card').length`),4);await field('Includes','all');await button('More filters');
        const plans=await evaluate(`[...document.querySelectorAll('.base-library-card svg polyline')].map(p=>p.getAttribute('points'))`);assert.equal(plans.length,4);assert.equal(new Set(plans).size,4);
        for(const name of Object.values(labels)){await button(`Details: Offset Bastion · ${name}`);assert.equal(await evaluate(`document.querySelector('.base-library-detail h3').textContent`),`Offset Bastion · ${name}`);}
        await button(`Details: Offset Bastion · ${labels[libraryArrangement]}`);await screenshot('offset-creative-library');
        assert.deepEqual(await evaluate(`window.wulframMcp.dispatch({action:'get_snapshot',expectedRevision:window.wulframMcp.dispatch({action:'get_editor_state'}).revision}).project`),original);
        if(process.env.WULFRAM_PLAN_BOUNDS_TEST==='1'){
          const displayed=await evaluate(`(()=>{const dt=[...document.querySelectorAll('.base-library-detail dt')].find(e=>e.textContent==='Sample occupied + reserved bounds');return dt?.nextElementSibling?.textContent;})()`);
          assert.ok(displayed&&/^\d+ × \d+ world units/.test(displayed));assert.ok(displayed.includes('both team model boxes + entrance, for one base; flat sample'));report.planBounds=displayed;
        }
        await button('Preview on current map');
        assert.equal(await evaluate(`document.querySelector('[aria-label="Offset Bastion arrangement"]').value`),libraryArrangement);
        assert.equal(await evaluate(`document.querySelector('[aria-label="Creative base size"]').value`),previewSize);
        report.offsetLibrary={cards:4,distinctDiagrams:true,reviewedFamily:true,selectionPreserved:true,browsingUnchanged:true};
      }
      await field('Base size',previewSize,'body');await field('Target structures per team',count,'body');
      const arrangement=process.env.WULFRAM_OFFSET_ARRANGEMENT;
      if(arrangement){if(!offset||!['wide-front','deep-court','split-wings'].includes(arrangement))throw new Error('Invalid Offset arrangement acceptance selection.');await field('District arrangement',arrangement,'body');}
      await field('Building area radius','2400','body');await field('Base rotation','35','body');
      await button('Preview formation');
      await waitFor(()=>evaluate(`!![...document.querySelectorAll('button')].find(b=>b.textContent==='Apply formation'&&!b.disabled)`),'Frontier candidate ready');
      assert.deepEqual(await evaluate(`window.wulframMcp.dispatch({action:'get_snapshot',expectedRevision:window.wulframMcp.dispatch({action:'get_editor_state'}).revision}).project`),original,'Preview does not change map');
      if(arrangement){
        await field('District arrangement','classic','body');
        assert.ok(await evaluate(`![...document.querySelectorAll('button')].some(b=>b.textContent==='Apply formation'&&!b.disabled)`),'Changed arrangement invalidates Apply');
        await field('District arrangement',arrangement,'body');await button('Preview formation');
        await waitFor(()=>evaluate(`!![...document.querySelectorAll('button')].find(b=>b.textContent==='Apply formation'&&!b.disabled)`),'Arrangement candidate ready');
        report.offsetArrangement={arrangement,stalePreviewRejected:true};
      }
      if(process.env.WULFRAM_PREVIEW_SAVE_TEST==='1'){
        const state=await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'})`);
        assert.deepEqual(await saved(),original);
        assert.equal(await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).revision`),state.revision);
        assert.ok(await evaluate(`!![...document.querySelectorAll('button')].find(b=>b.textContent==='Apply formation'&&!b.disabled)`),'Unchanged Save local retains a valid candidate');
      }
      if(process.env.WULFRAM_OPTION_CLEARANCE_TEST==='1'){
        report.optionClearance=await evaluate(`[...document.querySelectorAll('.formation-option-clearance')].map(e=>e.textContent)`);
        report.selectedOptionClearance=await evaluate(`document.querySelector('fieldset[aria-label="Formation options"] button[aria-pressed="true"] .formation-option-clearance')?.textContent`);
        assert.equal(report.optionClearance.length,3);assert.ok(report.optionClearance.every(text=>text.includes('80 u vehicle')));
        if(process.env.WULFRAM_OPTION_PREFERENCE_TEST==='1'){
          const scores=report.optionClearance.map(text=>{const match=text.match(/(\d+) blocked · (\d+) tight/);assert.ok(match);return [+match[1],+match[2]];});
          const best=scores.reduce((best,score,index)=>score[0]<scores[best][0]||(score[0]===scores[best][0]&&score[1]<scores[best][1])?index:best,0);
          assert.equal(report.selectedOptionClearance,report.optionClearance[best],'Initial choice minimizes blocked then tight routes');
          const manual=(best+1)%scores.length;
          await evaluate(`document.querySelectorAll('fieldset[aria-label="Formation options"] button')[${manual}].click()`);
          await saved();
          report.selectedOptionClearance=await evaluate(`document.querySelector('fieldset[aria-label="Formation options"] button[aria-pressed="true"] .formation-option-clearance')?.textContent`);
          assert.equal(report.selectedOptionClearance,report.optionClearance[manual],'Unchanged Save retains manual option');
          report.optionPreference={initialIndex:best,manualIndex:manual,manualPreserved:true};
        }
      }
      if(offset&&process.env.WULFRAM_AUTHORED_PREVIEW_TEST==='1'){
        await button('Team 1 · Overhead');
        await evaluate(`document.querySelector('.route-inspection-section').open=true`);
        const choices=await evaluate(`[...document.querySelector('[aria-label="Inspect route"]').options].map(o=>({value:o.value,text:o.textContent}))`);
        const authored=choices.filter(o=>o.text.startsWith('Corridor · Team')&&o.text.includes('bent approach'));assert.equal(authored.length,2);
        await field('Approach or corridor',authored[0].value,'[aria-label="Route inspection"]');
        assert.ok(await evaluate(`!!document.querySelector('[data-authored-route]')`));
        const state=await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'})`);
        await field('Route progress',50,'[aria-label="Route inspection"]');await screenshot('candidate-authored-entrance');
        assert.deepEqual(await saved(),original);assert.equal(await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).revision`),state.revision);
        await field('Approach or corridor',choices.find(o=>o.text.startsWith('Route ')).value,'[aria-label="Route inspection"]');
        assert.ok(await evaluate(`!!document.querySelector('[data-service-route]')`));
        report.authoredPreview={candidateCorridors:2,sourceUnchanged:true,revisionUnchanged:true,serviceDistinction:true,cameraFollow:true};
      }
      await screenshot(`${prefix}-native-preview`);
      if(process.env.WULFRAM_CLOSE_INSPECTION_TEST==='1'||process.env.WULFRAM_CATALOG_CAPTURE_TEST==='1'){
        if(process.env.WULFRAM_CATALOG_CAPTURE_TEST==='1'){
          for(const label of ['Terrain grid','Power tint','Power status icons','Power circles','Estimated Darklight circles','Estimated turret ranges / blind spots','Show access routes','Inspection power links','Route inspection controls','Route clearance markers'])await evaluate(`(()=>{const l=[...document.querySelectorAll('.shared-display-options label')].find(e=>e.textContent.trim()===${JSON.stringify(label)});if(!l)throw new Error('Missing display control');const input=l.querySelector('input');if(input.checked)input.click();})()`);
          await waitFor(()=>evaluate(`(()=>{const v=JSON.parse(localStorage.getItem('wulfram-forge-display-v1'));return !v.powerTint&&!v.powerIcons;})()`),'catalog display settings');
          assert.deepEqual(await saved(),original,'Catalog display settings do not change map');
        }
        await button('Team 1 · Overhead');
        await evaluate(`(()=>{const select=document.querySelector('select[aria-label="Inspect building"]');const option=[...select.options].find(o=>o.textContent.includes('Team 1')&&o.textContent.includes('Repair'));if(!option)throw new Error('No repair pad to inspect');select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
        await button('Close building view');await screenshot(`${prefix}-close-building`);
        assert.deepEqual(await saved(),original,'Close camera does not change map or discard preview');
        assert.ok(await evaluate(`!![...document.querySelectorAll('button')].find(b=>b.textContent==='Apply formation'&&!b.disabled)`));
        await button('Team 1 · Overhead');
        report.closeInspection={previewPreserved:true,mapPreserved:true,returnedToOverview:true};
      }
      await button('Apply formation');const applied=await saved();
      const key='forge.build-areas.v1',layout=applied.baseLayouts.find(l=>l.id===applied.activeBaseLayoutId);
      assert.equal(layout.entities.length,count*2);assert.equal(JSON.parse(layout.metadata[key]).length,2);assert.deepEqual(applied.terrain,original.terrain);
      if(arrangement){assert.equal(layout.metadata['formation.version'],`offset-bastion-arrangements-v1:${arrangement}`);assert.equal(JSON.parse(layout.metadata['formation.placement']).offsetArrangement,arrangement);}
      if(process.env.WULFRAM_OPTION_CLEARANCE_TEST==='1'){
        const assets=JSON.parse(await fs.readFile(new URL('../public/assets/manifest.json',import.meta.url),'utf8')),quality=formationRouteSummary(original,assets,layout);
        assert.equal(report.selectedOptionClearance,`${quality.routes} sampled approaches · ${quality.blocked} blocked · ${quality.tight} tight · 80 u vehicle`);
      }
      if(process.env.WULFRAM_RESERVED_DISPLAY_TEST==='1'){
        await button('Team 1 · Overhead');
        const toggle=async(label,checked)=>evaluate(`(()=>{const label=[...document.querySelectorAll('.shared-display-options label')].find(e=>e.textContent.trim()===${JSON.stringify(label)});if(!label)throw new Error('Missing toggle');const input=label.querySelector('input');if(input.checked!==${checked})input.click();})()`);
        await toggle('Building area circles',false);await toggle('Reserved areas and corridors',true);await screenshot('reserved-areas-visible');
        await toggle('Reserved areas and corridors',false);await screenshot('reserved-areas-hidden');
        await toggle('Reserved areas and corridors',true);
        assert.deepEqual(await saved(),applied,'Display toggles cannot change authored reservations');
        const preferences=await evaluate(`JSON.parse(localStorage.getItem('wulfram-forge-display-v1'))`);
        assert.equal(preferences.displayOptions.boundaries,false);assert.equal(preferences.displayOptions.areas,true);
        report.reservedDisplay={independentPreferences:true,mapPreserved:true};
      }
      if(process.env.WULFRAM_CATALOG_CAPTURE_TEST==='1'){
        await button('Team 1 · Overhead');
        const point=await evaluate(`(()=>{const r=document.querySelector('.terrain-viewport').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
        for(let i=0;i<5;i++){await send('Input.dispatchMouseEvent',{type:'mouseWheel',...point,deltaX:0,deltaY:-100});await delay(100);}
        await screenshot(`${prefix}-catalog-overhead`);
        await evaluate(`(()=>{const label=[...document.querySelectorAll('.shared-display-options label')].find(e=>e.textContent.trim()==='Show display overlays');const input=label.querySelector('input');if(input.checked)input.click();})()`);
        await evaluate(`(()=>{const select=document.querySelector('select[aria-label="Inspect building"]');const option=[...select.options].find(o=>o.textContent.includes('Team 1')&&o.textContent.includes('Repair'));if(!option)throw new Error('No applied repair pad');select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
        await button('Close building view');await screenshot(`${prefix}-catalog-service`);
        for(let i=0;i<18;i++){await send('Input.dispatchMouseEvent',{type:'mouseWheel',...point,deltaX:0,deltaY:100});await delay(100);}
        await screenshot(`${prefix}-catalog-side`);
        assert.deepEqual(await saved(),applied,'Catalog captures preserve the applied map');
        report.catalogCapture={state:'applied',arrangement,size:process.env.WULFRAM_PORTABLE_SIZE??'small',images:['catalog-overhead','catalog-side','catalog-service'],mapPreserved:true};
      }
      await button('Undo');assert.deepEqual(await saved(),original);await button('Redo');assert.deepEqual(await saved(),applied);
      if(process.env.WULFRAM_ENTRANCE_POLICY_TEST==='1'){
        await fs.writeFile(path.join(out,'entrance-source.json'),JSON.stringify(applied));
        await button('Rules');
        await field('Team 1 entrance','offset-bastion-approach-1','.entrance-routing-panel');
        await field('Team 2 entrance','offset-bastion-approach-2','.entrance-routing-panel');
        const state=await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'})`);
        await button('Preview entrances');
        await waitFor(()=>evaluate(`!!document.querySelector('.entrance-routing-panel button:not([disabled])')&&[...document.querySelectorAll('button')].some(b=>b.textContent==='Apply entrances'&&!b.disabled)`),'Entrance preview ready');
        assert.equal(await evaluate(`document.querySelectorAll('[aria-label="Route inspection"]').length`),1);
        assert.ok(await evaluate(`document.querySelector('[data-service-route]').textContent.includes('selected entrance')`));
        await field('Route progress',50,'.entrance-routing-panel');await screenshot('entrance-policy-preview');
        assert.deepEqual(await saved(),applied);assert.equal(await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).revision`),state.revision);
        await button('Apply entrances');const selected=await saved();
        assert.equal(JSON.parse(selected.baseLayouts.find(l=>l.id===selected.activeBaseLayoutId).metadata['forge.entrance-routing.v1']).bindings.length,2);
        await button('Undo');assert.deepEqual(await saved(),applied);
        await button('Redo');assert.deepEqual(await saved(),selected);
        await button('Undo');assert.deepEqual(await saved(),applied);
        if(portableEntrances){await button('Redo');assert.deepEqual(await saved(),selected);}
        report.entrancePolicy={previewPreserved:true,singleInspector:true,orderedRoute:true,applyUndoRedo:true};
        await button('Build');
      }
      await button('Save active formation as favorite');
      const favorites=await evaluate(`JSON.parse(localStorage.getItem('forge-formation-favorites-v1'))`);assert.equal(favorites.length,1);assert.equal(favorites[0].reservations.areas.length,2);assert.equal(favorites[0].reservations.version,portableEntrances?3:offset?2:1);if(offset){assert.equal(favorites[0].reservations.family,'offset-bastion');assert.ok(favorites[0].reservations.areas.every(a=>a.id.startsWith('offset-bastion-approach-')&&a.points.length===4));}
      await button('Browse base library');await evaluate(`document.querySelector('.personal-base-library').open=true`);
      const downloads=path.join(out,`${prefix}-library-downloads`);await fs.mkdir(downloads);await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});await button('Export My bases');
      const file=await waitFor(async()=>(await fs.readdir(downloads)).find(n=>n.endsWith('.json')),'Frontier library export');
      const portable=JSON.parse(await fs.readFile(path.join(downloads,file),'utf8'));assert.equal(portable.version,portableEntrances?4:3);assert.deepEqual(portable.bases,favorites);
      if(portableEntrances)assert.deepEqual(portable.bases[0].reservations.entranceRouting,entrancePolicy);
      await field('Saved base',favorites[0].id,'.personal-base-actions');await button('Remove saved base');
      assert.equal(await evaluate(`JSON.parse(localStorage.getItem('forge-formation-favorites-v1')).length`),0);
      const {root:libraryRoot}=await send('DOM.getDocument'),{nodeId:libraryInput}=await send('DOM.querySelector',{nodeId:libraryRoot.nodeId,selector:'input[aria-label="Import personal base library file"]'});
      await send('DOM.setFileInputFiles',{nodeId:libraryInput,files:[path.join(downloads,file)]});
      await waitFor(()=>evaluate(`!!document.querySelector('.personal-base-import')`),'Frontier library import preview');
      assert.equal(await evaluate(`JSON.parse(localStorage.getItem('forge-formation-favorites-v1')).length`),0);
      await button('Apply library import');assert.deepEqual(await evaluate(`JSON.parse(localStorage.getItem('forge-formation-favorites-v1'))`),favorites);
      await button('Close library');
      const targetTerrain=process.env.WULFRAM_PORTABLE_TERRAIN;
      const target=targetTerrain?offsetPortabilityTarget(targetTerrain):structuredClone(original);target.terrain.worldWidth=14000;target.terrain.worldHeight=10000;
      const targetFile=path.join(out,'larger-map.json');await fs.writeFile(targetFile,JSON.stringify(target));
      const prior=await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).revision`);
      const {root}=await send('DOM.getDocument'),{nodeId}=await send('DOM.querySelector',{nodeId:root.nodeId,selector:'input[type="file"][multiple]'});await send('DOM.setFileInputFiles',{nodeId,files:[targetFile]});
      await waitFor(()=>evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).revision!==${JSON.stringify(prior)}`),'larger map loaded');
      const loaded=await saved();assert.deepEqual(loaded.terrain,target.terrain);assert.deepEqual(loaded.entities,target.entities);assert.deepEqual(loaded.baseLayouts,target.baseLayouts);
      await evaluate(`(()=>{const s=document.querySelector('select[aria-label="Formation favorites"]');s.value=s.options[1].value;s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
      await field('Base rotation','90','body');await button('Preview formation');
      await waitFor(()=>evaluate(`!![...document.querySelectorAll('button')].find(b=>b.textContent==='Apply formation'&&!b.disabled)`),'Frontier favorite preview');assert.deepEqual(await evaluate(`window.wulframMcp.dispatch({action:'get_snapshot',expectedRevision:window.wulframMcp.dispatch({action:'get_editor_state'}).revision}).project`),loaded);
      await button('Apply formation');const reused=await saved(),copy=reused.baseLayouts.find(l=>l.id===reused.activeBaseLayoutId);
      assert.equal(copy.entities.length,count*2);assert.equal(copy.metadata['formation.snapPolicy'],'shared-footprint-v2');
      if(portableEntrances){
        assert.deepEqual(JSON.parse(copy.metadata['forge.entrance-routing.v1']),entrancePolicy);
        const routes=await evaluate(`window.wulframMcp.dispatch({action:'inspect_routes',vehicleWidth:80})`);
        assert.equal(routes.error,'');const services=routes.routes.filter(r=>r.kind==='service');assert.equal(services.length,copy.entities.filter(e=>e.token==='r'||e.token==='f').length);assert.ok(services.length>=4);
        const corridors=JSON.parse(copy.metadata[key]);
        const placement=JSON.parse(copy.metadata['formation.placement']);assert.equal(placement.rotation,90);
        assert.equal(reused.terrain.worldWidth,14000);assert.equal(reused.terrain.worldHeight,10000);
        for(const local of favorites[0].reservations.areas){
          const actual=corridors.find(c=>c.id===local.id);assert.ok(actual);
          const yaw=(90+(local.side===2?180:0))*Math.PI/180,c=Math.cos(yaw),s=Math.sin(yaw);
          const x=local.side===1?placement.x:14000-placement.x,y=local.side===1?placement.y:10000-placement.y;
          assert.equal(actual.width,local.width);assert.equal(actual.points.length,local.points.length);
          local.points.forEach(([px,py],i)=>assert.ok(Math.hypot(actual.points[i][0]-(x+px*c-py*s),actual.points[i][1]-(y+px*s+py*c))<1e-6,'Corridor geometry follows target anchor and requested rotation'));
        }
        const endpoints=services.map(r=>JSON.stringify(r.points.at(-1))).sort();
        const pads=copy.entities.filter(e=>e.token==='r'||e.token==='f');
        assert.deepEqual(endpoints,pads.map(e=>JSON.stringify(e.position.slice(0,2))).sort());
        for(const route of services){const endpoint=route.points.at(-1),pad=pads.find(e=>Math.hypot(e.position[0]-endpoint[0],e.position[1]-endpoint[1])<.001);assert.equal(route.entranceCorridorId,`offset-bastion-approach-${pad.team}`);}

        for(const route of services){const corridor=corridors.find(c=>c.id===route.entranceCorridorId);assert.ok(corridor);let cursor=-1;for(const point of corridor.points){cursor=route.points.findIndex((p,i)=>i>cursor&&Math.hypot(p[0]-point[0],p[1]-point[1])<.001);assert.ok(cursor>=0);}}
        report.entranceLibrary={size:previewSize,targetTerrain:targetTerrain??'flat',targetSha256:createHash('sha256').update(await fs.readFile(targetFile)).digest('hex'),version:4,reservationVersion:3,bindingsPreserved:true,relocated:true,rotation:90,transformedGeometry:true,allPadEndpoints:true,serviceRoutes:services.length,orderedTurns:true};
      }

      const areas=JSON.parse(copy.metadata[key]);assert.equal(areas.length,2);assert.notDeepEqual(areas,JSON.parse(layout.metadata[key]));assert.deepEqual(reused.terrain,loaded.terrain);
      await button('Team 1 · Overhead');await screenshot(`${prefix}-native-reused`);
      await button('Export map');
      const mapFile=await waitFor(async()=>(await fs.readdir(downloads)).find(n=>n.endsWith('.zip')),'Frontier map ZIP export');
      const archive=path.join(downloads,mapFile),entries=await readMapArchive(await fs.readFile(archive));
      const exportedMap=JSON.parse(entries.find(e=>e.name.endsWith('/wulfram-project.json')).text);
      assert.deepEqual(exportedMap.baseLayouts,reused.baseLayouts);assert.deepEqual(exportedMap.entities,reused.entities);assert.deepEqual(exportedMap.terrain,reused.terrain);
      const beforeImport=await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).revision`);
      const {root:mapRoot}=await send('DOM.getDocument'),{nodeId:mapInput}=await send('DOM.querySelector',{nodeId:mapRoot.nodeId,selector:'input[type="file"][multiple]'});await send('DOM.setFileInputFiles',{nodeId:mapInput,files:[archive]});
      await waitFor(()=>evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).revision!==${JSON.stringify(beforeImport)}`),'Frontier map ZIP re-import');
      const reimported=await saved();assert.deepEqual(reimported.baseLayouts,reused.baseLayouts);assert.deepEqual(reimported.entities,reused.entities);assert.deepEqual(reimported.terrain,reused.terrain);
      await stop();await launch();assert.deepEqual(await saved(),reimported);
      report[offset?'offsetPreview':'frontierPreview']={generated:true,previewPreserved:true,undoRedo:true,portableVersion:portableEntrances?4:3,reservationVersion:portableEntrances?3:offset?2:1,libraryReimport:true,mapArchiveRoundTrip:true,exported:path.join(downloads,file),largerMapReuse:true,restartPreserved:true};
    });
  } else if(process.env.WULFRAM_FRONTIER_REVIEW==='1'||process.env.WULFRAM_FAMILY_REVIEW==='offset-bastion'){
    const family=process.env.WULFRAM_FAMILY_REVIEW==='offset-bastion'?'offset-bastion':'frontier';
    await step(`Review ${family} sizes as imported editable maps`,async()=>{
      const reviews=[];if(family==='frontier')report.frontier=reviews;else report.offsetBastion=reviews;
      for(const terrain of (process.env.WULFRAM_FRONTIER_ALL_TERRAIN==='1'||process.env.WULFRAM_FAMILY_ALL_TERRAIN==='1'?['flat','valley','irregular']:['flat']))for(const size of ['small','standard','large','massive']){
        const file=path.join(path.dirname(fixture),`${terrain}-${size}.json`),expected=JSON.parse(await fs.readFile(file,'utf8'));
        const prior=await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).revision`);
        const {root}=await send('DOM.getDocument'),{nodeId}=await send('DOM.querySelector',{nodeId:root.nodeId,selector:'input[type="file"][multiple]'});await send('DOM.setFileInputFiles',{nodeId,files:[file]});
        await waitFor(()=>evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).revision!==${JSON.stringify(prior)}`),'Family review map imported');
        const loaded=await saved();assert.deepEqual(loaded.entities,expected.entities);assert.deepEqual(loaded.baseLayouts,expected.baseLayouts);assert.deepEqual(loaded.terrain,expected.terrain);
        await button('Team 1 · Overhead');await screenshot(`${family}-${terrain}-${size}-overhead`);
        await button('Team 1 · Ground level');await screenshot(`${family}-${terrain}-${size}-ground`);
        assert.deepEqual(await saved(),loaded);reviews.push({terrain,size,file,entities:loaded.entities.length,importPreserved:true,inspectionPreserved:true});
      }
    });
  } else if(process.env.WULFRAM_INSPECTOR_ORDER_TEST==='1'){
    await step('Selecting a building brings editable controls above inspection and rules',async()=>{
      if(process.env.WULFRAM_LAYOUT_SIDEBAR_TEST==='1'){
        assert.equal(await evaluate(`document.querySelector('.layout-advanced').open`),false);
        await button('Find tools and settings');await field('Find a tool','metadata','.tool-finder');await button('Advanced layout metadata');
        assert.ok(await evaluate(`document.querySelector('textarea[aria-label="Base layout metadata"]').getClientRects().length`));
        await button('Advanced layout data');
        assert.ok(await evaluate(`(()=>{const p=[...document.querySelectorAll('.tool-rail p')].find(e=>e.textContent.startsWith('Yellow bolt:'));return p.closest('details').querySelector('summary').textContent.includes('Display options');})()`));
        assert.deepEqual(await saved(),original);
        await screenshot('layout-sidebar');
        report.layoutSidebar={metadataCollapsed:true,metadataAccessible:true,legendsWithDisplay:true,mapPreserved:true};
      }
      if(process.env.WULFRAM_INSPECTOR_SECTIONS_TEST==='1'){
        assert.ok(await evaluate(`!document.querySelector('[data-inspector-page="build"]').hidden`));
        await button('Rules');assert.ok(await evaluate(`!document.querySelector('[data-inspector-page="rules"]').hidden`));
        await button('Inspect');assert.ok(await evaluate(`!document.querySelector('[data-inspector-page="inspect"]').hidden`));
        await field('Assumed vehicle width',120,'[aria-label="Route inspection"]');
        await button('Rules');await button('Inspect');
        assert.equal(await evaluate(`document.querySelector('input[aria-label="Vehicle clearance width"]').value`),'120');
        await button('Build');assert.deepEqual(await saved(),original);
        if(!await evaluate(`document.querySelector('.tool-finder').open`))await button('Find tools and settings');
        await field('Find a tool','district distance','.tool-finder');await button('District distance relationships');
        assert.ok(await evaluate(`!document.querySelector('[data-inspector-page="rules"]').hidden`));
        await button('Build');
        report.inspectorSections={buildInspectRules:true,routeWidthRetained:true,mapPreserved:true};
      }
      assert.equal(await evaluate(`document.querySelector('.route-inspection-section').open`),false);
      await button('Team 1 · Overhead');
      assert.equal(await evaluate(`document.querySelector('.route-inspection-section').open`),true);
      await evaluate(`(()=>{const select=document.querySelector('select[aria-label="Inspect building"]');const option=[...select.options].find(o=>o.textContent.includes('Team 1')&&o.textContent.includes('Repair'));select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
      await button('Close building view');
      await evaluate(`(()=>{const label=[...document.querySelectorAll('label')].find(l=>l.textContent.includes('Inspect buildings (clicks'));label.querySelector('input').click();document.querySelector('.inspector').scrollTop=10000;})()`);
      const point=await evaluate(`(()=>{const r=document.querySelector('.terrain-viewport canvas').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await delay(300);
      await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
      await waitFor(()=>evaluate(`!!document.querySelector('.selected-building-controls')`),'selected building inspector');
      assert.ok(await evaluate(`(document.querySelector('[data-inspector-page="build"]')??document.querySelector('.inspector')).firstElementChild.matches('.selected-building-controls')`));
      assert.ok(await evaluate(`document.querySelector('.inspector').scrollTop<10`));
      assert.deepEqual(await saved(),original);
      await screenshot('selected-building-first');
      const oldX=await evaluate(`[...document.querySelectorAll('.selected-building-controls label')].find(l=>l.textContent.trim()==='X').querySelector('input').value`);
      await field('X',Number(oldX)+5,'.selected-building-controls');
      const edited=await saved();assert.notDeepEqual(edited.entities,original.entities);assert.deepEqual(edited.terrain,original.terrain);
      await button('Undo');assert.deepEqual(await saved(),original);
      report.inspectorOrder={selectionFirst:true,selectionScrollsTop:true,inspectionOpensRoutes:true,selectionPreservedMap:true,editUndo:true};
    });
  } else if(process.env.WULFRAM_EXPORT_DURABILITY_TEST==='1'){
    if(process.env.WULFRAM_OBJECTIVE_MAP_TEST==='1')await screenshot('objective-map-imported');
    await step('Completed map download survives close and reopens through File menu',async()=>{
      const downloads=path.join(out,'durable-downloads');await fs.mkdir(downloads);
      await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads,eventsEnabled:true});
      await button('File','.editor-menu-bar');await button('Export map ZIP','.editor-menu-bar');
      await waitFor(async()=>report.downloadEvents?.some(e=>e.method==='Browser.downloadProgress'&&e.state==='completed'),'browser download completed');
      const file=(await fs.readdir(downloads)).find(name=>name.endsWith('.zip'));assert.ok(file);
      const exported=path.join(downloads,file),bytes=await fs.readFile(exported),hash=sha(bytes);
      const entries=await readMapArchive(bytes);const project=JSON.parse(entries.find(e=>e.name.endsWith('/wulfram-project.json')).text);
      assert.deepEqual(project.terrain,original.terrain);assert.deepEqual(project.baseLayouts,original.baseLayouts);
      report.durableExport={path:exported,sha256:hash};await saved();await stop();
      assert.equal(sha(await fs.readFile(exported)),hash,'Completed download survives process exit');
      await launch();assert.equal(sha(await fs.readFile(exported)),hash,'Completed download survives restart');
      await waitFor(()=>evaluate(`!!document.querySelector('input[type="file"][multiple]')`),'import control restored');
      const {root:doc}=await send('DOM.getDocument'),{nodeId}=await send('DOM.querySelector',{nodeId:doc.nodeId,selector:'input[type="file"][multiple]'});
      await send('DOM.setFileInputFiles',{nodeId,files:[exported]});
      await waitFor(()=>evaluate(`document.querySelector('.statusbar')?.textContent.includes('imported')`),'durable ZIP reimport');
      assert.deepEqual((await saved()).terrain,original.terrain);assert.deepEqual((await saved()).baseLayouts,original.baseLayouts);
      report.durableExport.reimported=true;
    });
  } else if(process.env.WULFRAM_LANE_TOOL_TEST==='1'){
    await step('Lane draw, adjustable preview, cancellation and one-step Undo',async()=>{
      await button('Terrain','.editor-menu-bar');await button('Lane tool','.editor-menu-bar');
      await field('Lane width',400,'.terrain-lane-panel');await field('Shoulder blend',500,'.terrain-lane-panel');await field('Floor height',0,'.terrain-lane-panel');
      const snapshot=()=>evaluate(`window.wulframMcp.dispatch({action:'get_snapshot',expectedRevision:window.wulframMcp.dispatch({action:'get_editor_state'}).revision}).project`);
      const point=await evaluate(`(()=>{const r=document.querySelector('.terrain-viewport').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
      const drag=async()=>{await button('Draw lane');await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x-100,y:point.y});await send('Input.dispatchMouseEvent',{type:'mousePressed',x:point.x-100,y:point.y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x+100,y:point.y,button:'left',buttons:1});await delay(200);};
      const release=()=>send('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x+100,y:point.y,button:'left',clickCount:1});
      for(const cancel of ['escape','blur','pointercancel']){
        await drag();
        if(cancel==='escape'){for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key:'Escape',code:'Escape',windowsVirtualKeyCode:27});}
        if(cancel==='blur')await evaluate(`window.dispatchEvent(new Event('blur'))`);
        if(cancel==='pointercancel')await evaluate(`document.querySelector('.terrain-viewport canvas').dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:1}))`);
        await release();await delay(100);assert.deepEqual(await snapshot(),original);
        assert.equal(await evaluate(`[...document.querySelectorAll('.terrain-lane-panel button')].find(b=>b.textContent==='Apply lane').disabled`),true);
      }
      await drag();
      for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key:'1',code:'Digit1',windowsVirtualKeyCode:49});
      await delay(100);await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x+120,y:point.y,button:'left',buttons:1});await release();
      assert.deepEqual(await snapshot(),original);await button('Lane tool');
      await drag();await release();
      await waitFor(()=>evaluate(`[...document.querySelectorAll('.terrain-lane-panel button')].some(b=>b.textContent==='Apply lane'&&!b.disabled)`),'valid released lane preview');
      assert.deepEqual(await snapshot(),original);
      await evaluate(`window.wulframMcp.dispatch({action:'edit_terrain',expectedRevision:window.wulframMcp.dispatch({action:'get_editor_state'}).revision,brush:{operation:'raise',x:1000,y:1000,radius:200,value:5,mirror:false}})`);
      await waitFor(()=>evaluate(`[...document.querySelectorAll('.terrain-lane-panel button')].find(b=>b.textContent==='Apply lane').disabled`),'map edit clears stale lane preview');
      await button('Undo');assert.deepEqual(await saved(),original);
      await drag();await release();await delay(200);await screenshot('lane-preview',true);await screenshot('lane-preview-second',true);
      await field('Floor height',25,'.terrain-lane-panel');
      if(process.env.WULFRAM_CURVED_LANE_TEST==='1'){
        await field('Operation','cut-fill','.terrain-lane-panel');
        await field('Curve / bend',.5,'.terrain-lane-panel');
        await waitFor(()=>evaluate(`[...document.querySelectorAll('.terrain-lane-panel button')].some(b=>b.textContent==='Apply lane'&&!b.disabled)`),'curved lane preview');
        assert.deepEqual(await snapshot(),original);await screenshot('curved-lane-preview',true);
        if(process.env.WULFRAM_LANE_HANDLES_TEST==='1')report.laneHandles=await testLaneHandles({evaluate,send,button,field,screenshot,snapshot,original});
      }
      await button('Apply lane');
      const placed=await saved(),last=JSON.parse(placed.metadata['terrainLane.last']);
      if(report.laneHandles){const actual=last.points.flat();assert.equal(actual.length,report.laneHandles.displayedPoints.length);actual.forEach((v,i)=>assert.ok(Math.abs(v-report.laneHandles.displayedPoints[i])<=.0051,'Applied points match edited preview coordinates to display precision'));report.laneHandles.appliedPoints=last.points;}
      if(process.env.WULFRAM_CURVED_LANE_TEST==='1'){assert.equal(last.bend,process.env.WULFRAM_LANE_HANDLES_TEST==='1'?0:.5);assert.equal(last.version,process.env.WULFRAM_LANE_HANDLES_TEST==='1'?1:2);assert.equal(await evaluate(`document.body.textContent.includes('Shared terrain · lane preview · Apply to commit')`),false);}
      assert.equal(last.floorHeight,25);assert.equal(last.width,400);assert.equal(last.points.length,process.env.WULFRAM_LANE_HANDLES_TEST==='1'?3:2);assert.ok(last.points.flat().every(v=>v>0));
      assert.notDeepEqual(placed.terrain.heights,original.terrain.heights);assert.deepEqual(placed.terrain.textureIds,original.terrain.textureIds);assert.deepEqual(placed.entities,original.entities);
      await screenshot('lane-applied');await button('Undo');assert.deepEqual(await saved(),original);
      await button('Redo');assert.deepEqual((await saved()).terrain,placed.terrain);await button('Undo');assert.deepEqual(await saved(),original);
      if(process.env.WULFRAM_CURVED_LANE_TEST==='1'){
        const {version,...lane}=last;
        await evaluate(`window.wulframMcp.dispatch({action:'apply_lane',expectedRevision:window.wulframMcp.dispatch({action:'get_editor_state'}).revision,lane:${JSON.stringify(lane)}})`);
        assert.deepEqual((await saved()).terrain,placed.terrain,'MCP and GUI curved terrain match');
        await button('Undo');assert.deepEqual(await saved(),original);
      }
      report.laneTool={curved:process.env.WULFRAM_CURVED_LANE_TEST==='1',previewWithoutMutation:true,adjustments:true,releaseCoordinates:true,escape:true,blur:true,pointerCancel:true,toolSwitch:true,mapRevisionInvalidation:true,undoRedo:true};
    });
  } else if(process.env.WULFRAM_LANDFORM_LIBRARY_TEST==='1'){
    await step('Visual landform library loads distinct mesa and basin brushes without editing until placement',async()=>{
      await button('Terrain');await button('Landform brush');
      await field('Placement mode','manual','[aria-label="3D stamp controls"]');
      await evaluate(`(()=>{const label=[...document.querySelectorAll('[aria-label="3D stamp controls"] label')].find(l=>l.textContent.trim()==='Mirror partner');const input=label.querySelector('input');if(input.checked)input.click();})()`);
      for(const [name,preset] of [['Flat-top Mesa','mesa'],['Broad Basin','basin']]){
        await button('Browse landform brushes · 7');
        await screenshot(`landform-library-${preset}`);
        await field('Find a landform',preset==='mesa'?'mesa':'basin');
        assert.equal(await evaluate(`document.querySelectorAll('.landform-starter-grid button').length`),1);
        await button(`Use ${name}`);
        await waitFor(()=>evaluate(`!document.querySelector('[role="dialog"]')`),'landform picker closed');
        assert.equal(await evaluate(`document.querySelector('[aria-label="3D stamp controls"] label select')!==null`),true);
        assert.deepEqual(await saved(),original);
        const point=await evaluate(`(()=>{const r=document.querySelector('.terrain-viewport').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
        await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await delay(300);await screenshot(`${preset}-placement-preview`,true);
        await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});await delay(150);
        const placed=await saved();assert.equal(JSON.parse(placed.metadata['terrainStamp.last']).preset,preset);
        assert.notDeepEqual(placed.terrain.heights,original.terrain.heights);assert.deepEqual(placed.entities,original.entities);
        await screenshot(`${preset}-placed`);await button('Undo');assert.deepEqual(await saved(),original);
      }
      report.landformLibrary={search:true,loadsWithoutMapEdit:true,mesaPlacement:true,basinPlacement:true,undo:true};
    });
  } else if(process.env.WULFRAM_TOOL_OPTIONS_TEST==='1'){
    await step('Contextual toolbar synchronizes with existing settings',async()=>{
      await button('Terrain','.editor-menu-bar');await button('Raise','.editor-menu-bar');
      await evaluate(`document.querySelector('[aria-label="Toolbar brush radius"]').focus()`);
      for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
      const radius=await evaluate(`Number(document.querySelector('[aria-label="Toolbar brush radius"]').value)`);assert.equal(radius,170);
      assert.equal(await evaluate(`Number([...document.querySelectorAll('.inspector label')].find(e=>e.textContent.startsWith('Radius / half-size')).querySelector('input').value)`),radius);
      await field('Strength',48,'.inspector');assert.equal(await evaluate(`Number(document.querySelector('[aria-label="Toolbar brush strength"]').value)`),48);
      if(process.env.WULFRAM_TOOL_CONTEXT_TEST==='1'){
        await field('Shape','diamond','.tool-options-bar');await field('Edge','hard','.tool-options-bar');
        assert.ok(await evaluate(`!!document.querySelector('.brush-profile.diamond.hard')`));
        await button('square','.brush-option-group');assert.equal(await evaluate(`document.querySelector('[aria-label="Toolbar brush shape"]').value`),'square');
        await button('Terrain','.editor-menu-bar');await button('Set height','.editor-menu-bar');
        await field('Target height',125.25,'.tool-options-bar');assert.equal(await evaluate(`Number(document.querySelector('.height-stamp-controls input').value)`),125.25);
        await field('Target terrain height',-20.5,'.height-stamp-controls');assert.equal(await evaluate(`Number(document.querySelector('[aria-label="Toolbar target height"]').value)`),-20.5);
        await send('Emulation.setDeviceMetricsOverride',{width:960,height:800,deviceScaleFactor:1,mobile:false});await screenshot('exact-height-toolbar-960');
        assert.ok(await evaluate(`[...document.querySelectorAll('.height-stamp-actions button')].every(b=>{const range=document.createRange();range.selectNodeContents(b);const text=range.getBoundingClientRect(),box=b.getBoundingClientRect();return text.top>=box.top&&text.bottom<=box.bottom;})`),'Height action labels fit their buttons');
        assert.ok(await evaluate(`(()=>{const r=document.querySelector('.tool-options-bar');return r.scrollWidth<=r.clientWidth;})()`));
        await button('Terrain','.editor-menu-bar');await button('Paint texture','.editor-menu-bar');
        await field('Strength',73,'.tool-options-bar');
        assert.equal(await evaluate(`Number([...document.querySelectorAll('.inspector label')].find(e=>e.textContent.startsWith('Strength')).querySelector('input').value)`),73);
        await field('Edge','linear','.tool-options-bar');assert.ok(await evaluate(`!!document.querySelector('.brush-profile.square.linear')`));
        await field('Strength',61,'.inspector');assert.equal(await evaluate(`Number(document.querySelector('[aria-label="Toolbar brush strength"]').value)`),61);
        await button('soft','.brush-option-group');assert.equal(await evaluate(`document.querySelector('[aria-label="Toolbar brush edge"]').value`),'soft');
        await screenshot('paint-toolbar-960');
        assert.ok(await evaluate(`(()=>{const r=document.querySelector('.tool-options-bar');return r.scrollWidth<=r.clientWidth;})()`),'Paint toolbar fits compact viewport');
        await button('Material: canyon003','.tool-options-bar');await waitFor(()=>evaluate(`document.activeElement?.getAttribute('aria-label')==='Search textures'`),'material search focused');
        await send('Input.insertText',{text:'snow'});await delay(150);
        const texture=await evaluate(`document.querySelector('.texture-chip')?.getAttribute('aria-label')`);assert.ok(texture);
        await button(texture,'.texture-grid');
        assert.ok(await evaluate(`document.querySelector('.toolbar-material').textContent.includes(${JSON.stringify(texture)})`));
        await send('Emulation.clearDeviceMetricsOverride');
        report.toolContext={paintStrengthAndEdgeSync:true,compactPaint:true,shapeAndEdgeSync:true,exactHeightSync:true,materialSearch:true,materialSync:true,compactExactHeight:true,mapPreserved:true};
      }
      await button('Terrain','.editor-menu-bar');await button('Large landforms','.editor-menu-bar');
      assert.ok(await evaluate(`!!document.querySelector('[aria-label="Toolbar landform height"]')&&!document.querySelector('[aria-label="Toolbar brush radius"]')`));
      await button('Bases','.editor-menu-bar');await button('Build','.editor-menu-bar');await field('Build team',2,'.tool-options-bar');
      assert.equal(await evaluate(`document.querySelector('.team-switch .active').textContent`),'TEAM 2');
      await send('Emulation.setDeviceMetricsOverride',{width:960,height:800,deviceScaleFactor:1,mobile:false});await screenshot('tool-options-960');
      assert.ok(await evaluate(`(()=>{const r=document.querySelector('.tool-options-bar');return r.scrollWidth<=r.clientWidth;})()`));
      assert.deepEqual(await saved(),original);await send('Emulation.clearDeviceMetricsOverride');
      report.toolOptions={keyboardRadius:true,bidirectionalBrushSettings:true,contextSwitch:true,teamSync:true,compact:true,mapPreserved:true};
    });
  } else if(process.env.WULFRAM_EDITOR_MENU_TEST==='1'){
    await step('Editor command menus and keyboard dismissal',async()=>{
      assert.deepEqual(await evaluate(`[...document.querySelectorAll('.editor-menu-bar summary')].map(e=>e.textContent)`),['File','Edit','View','Terrain','Bases','Tools','Help']);
      const menuKey=async key=>{for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key,code:key});};
      await evaluate(`document.querySelector('.editor-menu-bar summary').focus()`);
      await menuKey('ArrowDown');assert.equal(await evaluate('document.activeElement.textContent'),'New map');
      await menuKey('ArrowDown');assert.equal(await evaluate('document.activeElement.textContent'),'Import…');
      await menuKey('End');assert.equal(await evaluate('document.activeElement.textContent'),'Export base-layout JSON');
      await menuKey('Home');assert.equal(await evaluate('document.activeElement.textContent'),'New map');
      await menuKey('ArrowRight');assert.equal(await evaluate('document.activeElement.textContent'),'Edit');
      await menuKey('Escape');assert.equal(await evaluate(`document.querySelectorAll('.editor-menu-bar details[open]').length`),0);
      report.menuArrowNavigation=true;
      for(const width of [1280,960]){
        await send('Emulation.setDeviceMetricsOverride',{width,height:800,deviceScaleFactor:1,mobile:false});
        await button('File','.editor-menu-bar');await screenshot(`menus-${width}`);
        assert.ok(await evaluate(`(()=>{const r=document.querySelector('.editor-menu-bar details[open] .editor-menu-items').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})()`));
        for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
        assert.equal(await evaluate(`document.querySelectorAll('.editor-menu-bar details[open]').length`),0);
        assert.equal(await evaluate(`document.activeElement.textContent`),'File');
      }
      await button('Terrain','.editor-menu-bar');await button('Raise','.editor-menu-bar');
      assert.ok(await evaluate(`document.querySelector('.workflow-guide').textContent.includes('Active tool: Raise')`));
      await button('Bases','.editor-menu-bar');await button('Rules','.editor-menu-bar');
      assert.equal(await evaluate(`document.querySelector('[data-inspector-page="rules"]').hidden`),false);
      await button('View','.editor-menu-bar');await button('Display options','.editor-menu-bar');
      assert.equal(await evaluate(`document.querySelector('.shared-display-options').open`),true);
      assert.equal(await evaluate(`document.querySelectorAll('.editor-menu-bar details[open]').length`),0);
      assert.deepEqual(await saved(),original);
      await send('Emulation.clearDeviceMetricsOverride');
      report.editorMenus={groups:7,keyboardEscape:true,terrainNavigation:true,rulesNavigation:true,displayNavigation:true,mapPreserved:true};
    });
  } else if(process.env.WULFRAM_COMPACT_GUI_TEST==='1'){
    await step('Compact desktop layout and keyboard section/menu access',async()=>{
      report.compactGui=[];
      for(const width of [1280,960]){
        await send('Emulation.setDeviceMetricsOverride',{width,height:800,deviceScaleFactor:1,mobile:false});
        await delay(500);await screenshot(`compact-${width}`);
        const metrics=await evaluate(`(()=>{const stage=document.querySelector('.stage-toolbar').getBoundingClientRect();const viewport=document.querySelector('.terrain-viewport').getBoundingClientRect();const inspector=document.querySelector('.inspector').getBoundingClientRect();const controls=[...document.querySelectorAll('.stage-toolbar button,.stage-toolbar select')].filter(e=>e.checkVisibility());return {width:innerWidth,documentWidth:document.documentElement.scrollWidth,stage:{left:stage.left,right:stage.right},viewport:{left:viewport.left,right:viewport.right},inspectorLeft:inspector.left,overflow:controls.filter(e=>{const r=e.getBoundingClientRect();return r.left<stage.left-1||r.right>stage.right+1;}).map(e=>e.getAttribute('aria-label')??e.textContent.trim())};})()`);
        report.compactGui.push(metrics);assert.ok(metrics.documentWidth<=width+1,'No document overflow');assert.deepEqual(metrics.overflow,[],'Stage controls stay within viewport column');assert.ok(metrics.viewport.right<=metrics.inspectorLeft+1,'Canvas does not overlap inspector');assert.ok(Math.abs(metrics.viewport.right-metrics.stage.right)<=1,'Viewport matches stage column');
        await button('Generate');await button('Generate');await button('Other exports');await button('Other exports');
        await button('Rules');await button('Inspect');await button('Build');assert.deepEqual(await saved(),original);
        assert.equal(await evaluate(`document.querySelector('.repository-controls').open`),false);
        await button('Repository');
        assert.ok(await evaluate(`(()=>{const panel=document.querySelector('.repository-actions').getBoundingClientRect();const stage=document.querySelector('.stage-column').getBoundingClientRect();return panel.left>=stage.left&&panel.right<=stage.right&&[...document.querySelectorAll('.repository-actions button span')].every(e=>e.checkVisibility());})()`),'Repository panel fits and retains action labels');
        await screenshot(`compact-${width}-repository`);await button('Repository');assert.deepEqual(await saved(),original);
        for(const [selector,label] of [['.formation-favorites','Saved formations'],['.layout-help','About layouts']]){
          assert.equal(await evaluate(`document.querySelector('${selector}').open`),false);
          await button(label);assert.equal(await evaluate(`document.querySelector('${selector}').open`),true);
          await button(label);assert.deepEqual(await saved(),original);
        }
        assert.equal(await evaluate(`document.querySelector('details.viewport-help').open`),false);
        await button('View controls');
        assert.equal(await evaluate(`document.querySelector('details.viewport-help').open`),true);
        assert.ok(await evaluate(`(()=>{const help=document.querySelector('.viewport-help').getBoundingClientRect();const view=document.querySelector('.terrain-viewport').getBoundingClientRect();return help.left>=view.left&&help.right<=view.right&&help.top>=view.top&&help.bottom<=view.bottom;})()`),'Expanded help stays inside viewport');
        await screenshot(`compact-${width}-help`);await button('View controls');
        assert.deepEqual(await saved(),original);
      }
      await send('Emulation.clearDeviceMetricsOverride');
    });
  } else if(process.env.WULFRAM_SHARED_DISPLAY_TEST==='1'){
    await step('Display settings work across modes, survive restart and reset without map edits',async()=>{
      await button('Terrain');await button('Display options');
      const values=()=>evaluate(`JSON.parse(localStorage.getItem('wulfram-forge-display-v1'))`);
      const toggle=label=>evaluate(`(()=>{const l=[...document.querySelectorAll('.shared-display-options label')].find(e=>e.textContent.trim()===${JSON.stringify(label)});l.querySelector('input').click();})()`);
      await toggle('Terrain grid');await toggle('Power tint');await toggle('Power status icons');
      await waitFor(async()=>{const v=await values();return !v.showGrid&&!v.powerTint&&!v.powerIcons;},'display preferences stored');
      const changed=await values();
      await button('Base builder');assert.deepEqual(await values(),changed);
      assert.equal(await evaluate(`document.querySelectorAll('.shared-display-options').length`),1);
      assert.deepEqual(await saved(),original);await stop();await launch();assert.deepEqual(await values(),changed);
      await button('Display options');await screenshot('shared-display-options');await button('Reset display options');
      await waitFor(async()=>{const v=await values();return v.showGrid&&v.powerTint&&v.powerIcons;},'display reset stored');
      assert.deepEqual(await saved(),original);
      report.sharedDisplay={terrainAccess:true,baseAccess:true,singleControlSet:true,restartPreserved:true,reset:true,mapPreserved:true};
    });
  } else if(process.env.WULFRAM_HEIGHTMAP_IMPORT_TEST==='1'){
    await step('Actual grayscale import uses relocated settings, previews, cancels and undoes',async()=>{
      await button('Terrain');await button('Import grayscale');
      await field('Min / black',-20,'.heightmap-import-controls');await field('Max / white',180,'.heightmap-import-controls');await field('Smoothing',0,'.heightmap-import-controls');await field('Midtone curve',1,'.heightmap-import-controls');
      const upload=async()=>{const {root:doc}=await send('DOM.getDocument'),{nodeId}=await send('DOM.querySelector',{nodeId:doc.nodeId,selector:'input[type="file"][accept="image/*"]'});await send('DOM.setFileInputFiles',{nodeId,files:[path.join(root,'outputs/grayscale-native-fixture.png')]});await waitFor(()=>evaluate(`!!document.querySelector('[role="dialog"] img[alt="Selected grayscale heightmap"]')`),'heightmap preview dialog');};
      await upload();assert.deepEqual(await evaluate(`window.wulframMcp.dispatch({action:'get_snapshot',expectedRevision:window.wulframMcp.dispatch({action:'get_editor_state'}).revision}).project`),original);await button('Cancel');assert.deepEqual(await saved(),original);
      await upload();await screenshot('heightmap-import-preview');await button('Apply heightmap');
      await waitFor(()=>evaluate(`!document.querySelector('[role="dialog"]')`),'heightmap applied');
      const applied=await saved(),{width,height,heights}=applied.terrain,row=Math.floor(height/2);
      assert.equal(heights[row*width+Math.floor(width*.1)],-20);
      assert.ok(Math.abs(heights[row*width+Math.floor(width*.5)]-(-20+200*128/255))<1e-5);
      assert.equal(heights[row*width+Math.floor(width*.9)],180);
      for(let x=0;x<width;x++){assert.equal(heights[x],0);assert.equal(heights[(height-1)*width+x],0);}
      for(let y=0;y<height;y++){assert.equal(heights[y*width],0);assert.equal(heights[y*width+width-1],0);}
      assert.deepEqual({...applied.terrain,heights:original.terrain.heights},original.terrain);assert.deepEqual(applied.entities,original.entities);assert.deepEqual(applied.baseLayouts,original.baseLayouts);
      await button('Undo');assert.deepEqual(await saved(),original);await button('Redo');assert.deepEqual(await saved(),applied);
      report.heightmapImport={actualFilePreview:true,cancelPreserved:true,settingsUsed:true,blackGrayWhiteHeights:true,edgeRingZero:true,onlyHeightsChanged:true,undoRedo:true};
    });
  } else if(process.env.WULFRAM_STAMP_HELP_TEST==='1'){
    await step('Unknown route metadata explains the explicit manual placement choice',async()=>{
      const scope='[aria-label="3D stamp controls"]';
      if(process.env.WULFRAM_GUI_ORGANIZATION_TEST==='1'){
        assert.equal(await evaluate(`document.querySelectorAll('.header-action-menu').length`),2);
        await button('Generate');assert.ok(await evaluate(`document.querySelector('[data-header-menu="generate"]').open`));
        await button('Generate');await button('Other exports');assert.ok(await evaluate(`document.querySelector('[data-header-menu="exports"]').open`));await button('Other exports');
        assert.equal(await evaluate(`document.querySelectorAll('.workflow-guide > details[open]').length`),0);
        await screenshot('gui-header-and-tools');assert.deepEqual(await saved(),original);
        report.guiOrganization={generationGroup:true,specialistExportGroup:true,helpCollapsed:true,mapPreserved:true};
      }
      if(process.env.WULFRAM_BRUSH_ORDER_TEST==='1'){
        await button('Terrain');
        assert.ok(await evaluate(`document.querySelector('[aria-label="Terrain brush settings"]').firstElementChild.textContent.includes('Radius')`));
        assert.ok(await evaluate(`document.querySelector('.tool-rail .heightmap-import-controls')&&!document.querySelector('.inspector .heightmap-import-controls')`));
        assert.equal(await evaluate(`document.querySelector('.heightmap-import-controls').open`),false);
        await button('Import grayscale');
        assert.ok(await evaluate(`document.querySelector('.heightmap-import-controls').open`));
        await field('Min / black',-20,'.heightmap-import-controls');
        await button('Heightmap import settings');await button('Import grayscale');
        assert.equal(await evaluate(`document.querySelector('.heightmap-import-controls input[type="number"]').value`),'-20');
        assert.deepEqual(await saved(),original);await screenshot('brush-controls-and-import');
        report.brushOrder={primaryControlsFirst:true,importSettingsLocatedWithAction:true,settingsRetained:true,mapPreserved:true};
      }
      if(process.env.WULFRAM_TERRAIN_ENTRY_TEST==='1'){
        await button('Terrain');assert.equal(await evaluate(`document.querySelector('.precise-terrain-tools').open`),false);
        await button('Precise placement');await button('Stamp at coordinates');
        assert.ok(await evaluate(`document.querySelector('[role="dialog"]').textContent.includes('Center X')`));
        await button('Cancel');await button('Precise placement');
        if(!await evaluate(`document.querySelector('.tool-finder').open`))await button('Find tools and settings');
        await field('Find a tool','precise numeric','.tool-finder');await button('Stamp at coordinates');await button('Cancel');
        assert.deepEqual(await saved(),original);
        await button('Find tools and settings');
        report.terrainEntries={brushAndCoordinatesDistinct:true,coordinateDialogAccessible:true,searchOpensDialog:true,cancelPreservedMap:true};
      }
      await button('Terrain');await button('3D stamp brush');await field('Placement mode','protected',scope);
      await waitFor(()=>evaluate(`document.body.textContent.includes('for terrain stamps choose 3D Terrain Stamps > Placement mode > Manual')`),'actionable protection message');
      assert.deepEqual(await saved(),original);
      await screenshot('stamp-protected-help');
      await field('Placement mode','manual',scope);
      await waitFor(()=>evaluate(`!document.body.textContent.includes('Protected placement cannot read supported')`),'manual mode removes missing-metadata block');
      assert.ok(await evaluate(`document.querySelector('${scope}').textContent.includes('Manual mode skips authored route protection')`));
      assert.deepEqual(await saved(),original);
      report.stampHelp={protectedMessage:true,manualChoiceClearsBlock:true,mapPreserved:true};
    });
  } else if (process.env.WULFRAM_STAMP_VISUAL_TEST === '1') {
    await step('Portable stamp library preview, cancel, merge and reuse', async () => {
      const scope='[aria-label="3D stamp controls"]';
      await button('Terrain');await button('3D stamp brush');await field('Starter preset','0',scope);await field('Preset name','Native saved ridge',scope);await button('Save stamp preset');
      const entries=await evaluate(`JSON.parse(localStorage.getItem('forge-terrain-stamp-presets-v1'))`);assert.equal(entries.length,1);
      const portable=path.join(out,'stamp-library.json');await fs.writeFile(portable,JSON.stringify({format:'wulfram-stamp-library',version:1,entries:[...entries,{...entries[0],name:'Imported ridge'}]}));
      await evaluate(`Array.from(document.querySelectorAll('${scope} details')).find(d=>d.querySelector('summary').textContent==='Portable stamp library').open=true`);
      const upload=async()=>{const {root:doc}=await send('DOM.getDocument');const {nodeId}=await send('DOM.querySelector',{nodeId:doc.nodeId,selector:scope+' input[type="file"]'});await send('DOM.setFileInputFiles',{nodeId,files:[portable]});await waitFor(()=>evaluate(`document.querySelector('${scope}').textContent.includes('1 stamps to add; 1 identical entries skipped')`),'stamp merge preview');};
      await upload();assert.equal(await evaluate(`JSON.parse(localStorage.getItem('forge-terrain-stamp-presets-v1')).length`),1);await button('Cancel stamp import');
      await upload();await button('Apply stamp import');await waitFor(()=>evaluate(`JSON.parse(localStorage.getItem('forge-terrain-stamp-presets-v1')).length===2`),'stamp import applied');
      await field('Saved stamps','1',scope);assert.equal(await evaluate(`document.querySelector('${scope} select').value`),'');
      await field('Remove saved stamp','Imported ridge',scope);assert.equal(await evaluate(`JSON.parse(localStorage.getItem('forge-terrain-stamp-presets-v1')).length`),1);
      await button('Undo stamp library change');assert.equal(await evaluate(`JSON.parse(localStorage.getItem('forge-terrain-stamp-presets-v1')).length`),2);
      await evaluate(`Array.from(document.querySelectorAll('${scope} details')).find(d=>d.querySelector('summary').textContent==='Portable stamp library').scrollIntoView({block:'center'})`);await screenshot('stamp-library');
      const after=await saved();assert.deepEqual(after.terrain,original.terrain);assert.deepEqual(after.entities,original.entities);
    });
    await step('Large landform solid previews, texture parity, all presets and three seeds', async () => {
      const scope = '[aria-label="3D stamp controls"]';
      await button('Terrain'); await button('3D stamp brush'); await field('Placement mode', 'manual', scope);
      for (const label of ['Mirror partner', 'Show protected areas']) await evaluate(`(() => { const l=[...document.querySelectorAll('${scope} label')].find(l=>l.textContent.trim()===${JSON.stringify(label)}); const c=l.querySelector('input');if(c.checked)c.click();})()`);
      const cameraKey = async(code,key,ms) => {
        await evaluate(`document.querySelector('.terrain-viewport canvas').focus()`);
        await send('Input.dispatchKeyEvent',{type:'keyDown',code,key});await delay(ms);await send('Input.dispatchKeyEvent',{type:'keyUp',code,key});
      };
      await cameraKey('KeyQ','q',550);
      const rect = await evaluate(`(() => { const r=document.querySelector('.terrain-viewport').getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height};})()`);
      const point = {x:rect.x+rect.width*.5,y:rect.y+rect.height*.56};
      const hover = async () => { await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await waitFor(()=>evaluate(`document.querySelector('[data-stamp-status]')?.textContent.includes('click to place')`),'Large stamp preview ready'); };
      for (let i=0;i<5;i++) {
        await field('Starter preset',String(i),scope);
        await evaluate(`(() => {const d=[...document.querySelectorAll('${scope} details')].find(d=>d.querySelector('summary').textContent==='Stamp textures');d.open=true;})()`);
        await field('Surface texture','11ice001',scope);await field('Texture coverage',.8,scope);
        await hover();
        assert.ok(await evaluate(`document.body.textContent.includes('STAMP SURFACE PREVIEW')`));
        await screenshot(`landform-${i}-preview`,true);
        assert.deepEqual((await saved()).terrain,original.terrain,'Hover does not edit or save candidate terrain');
        await hover();
        await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});await delay(300);
        const placed = await saved();
        assert.notDeepEqual(placed.terrain.heights,original.terrain.heights);
        const settings=JSON.parse(placed.metadata['terrainStamp.last']);
        const { previewStampTerrain, stampProtection } = await import('../lib/terrain-stamp-project.ts');
        // JSON save normalizes negative zero; compare the identical serialized boundary.
        assert.deepEqual(placed.terrain,JSON.parse(JSON.stringify(previewStampTerrain(original.terrain,settings,manifest,stampProtection(original,manifest,false)).terrain)),'UI Apply matches shared preview exactly');
        await fs.writeFile(path.join(out,`landform-${i}-applied.json`),JSON.stringify(placed));
        await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:20,y:20});await screenshot(`landform-${i}-applied`,true);
        await cameraKey('ArrowRight','ArrowRight',650);await screenshot(`landform-${i}-side`,true);
        await cameraKey('ArrowLeft','ArrowLeft',650);
        const beforeUndo=await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'})`);
        await button('Undo');
        const immediate=await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'})`);
        const undoTrace={preset:i,before:beforeUndo,immediate};(report.landformUndo??=[]).push(undoTrace);
        await waitFor(()=>evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).revision!==${JSON.stringify(beforeUndo.revision)}`),'Undo changes live project revision');
        const afterUndo=await evaluate(`window.wulframMcp.dispatch({action:'get_snapshot',expectedRevision:window.wulframMcp.dispatch({action:'get_editor_state'}).revision}).project`);
        undoTrace.after=await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'})`);
        await fs.writeFile(path.join(out,`landform-${i}-after-undo.json`),JSON.stringify(afterUndo));
        assert.equal(undoTrace.after.undoCount,beforeUndo.undoCount-1,'One Undo consumes one history entry');
        assert.deepEqual(afterUndo.terrain,original.terrain,'Live project restored by Undo');
        assert.deepEqual((await saved()).terrain,original.terrain,'Saved project matches restored live terrain');
      }
      await field('Starter preset','0',scope);
      for (const seed of ['ridge-a','ridge-b','ridge-c']) { await field('Variation seed',seed,scope);await hover();await screenshot(seed,true); }
      if (process.env.WULFRAM_PRODUCT_TEST === '1') {
        await step('Combined landform, creative base, inspection, export and restart', async () => {
          await hover();
          await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
          await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
          await delay(300);
          const terrain = (await saved()).terrain;
          assert.notDeepEqual(terrain.heights, original.terrain.heights);
          await evaluate(`document.querySelector('.workflow-guide > details').open=true`);
          await button('Choose base presets');
          await button('Close library');
          await evaluate(`(()=>{const s=document.querySelector('select[aria-label="Active base layout"]');s.value='creative:workshop';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
          await field('Target structures per team',12,'body');
          await button('Preview formation');
          await waitFor(() => evaluate(`!![...document.querySelectorAll('button')].find(b=>b.textContent==='Apply formation'&&!b.disabled)`),'combined formation preview');
          await button('Apply formation');
          const placed=await saved(),adjustedUnit=placed.entities.find(e=>e.team===1&&e.token==='g')??placed.entities.find(e=>e.token!=='*');
          assert.ok(adjustedUnit,'Combined fixture has a building to adjust manually');
          await evaluate(`document.querySelector('.district-panel').open=true`);
          await evaluate(`document.querySelector('input[aria-label=${JSON.stringify('Select district building '+adjustedUnit.id)}]').click()`);
          await field('Move X',10,'body');await button('Transform selection');
          const adjusted=await saved();
          assert.equal(adjusted.entities.find(e=>e.id===adjustedUnit.id).position[0],adjustedUnit.position[0]+10);
          assert.deepEqual(adjusted.entities.filter(e=>e.id!==adjustedUnit.id),placed.entities.filter(e=>e.id!==adjustedUnit.id));
          assert.deepEqual(adjusted.terrain,terrain);
          report.manualAdjustment={entityId:adjustedUnit.id,dx:10,otherBuildingsPreserved:true,terrainPreserved:true};
          await button('Inspect bases');
          await waitFor(() => evaluate(`document.querySelector('select[aria-label="Inspect route"]')?.options.length>0`),'combined route inspection');
          await button('Follow route'); await delay(400); await button('Pause route');
          if(process.env.WULFRAM_ROUTE_ELEVATION_TEST==='1'){
            await field('Route progress',50,'[aria-label="Route inspection"]');
            const graph=await evaluate(`(()=>{const f=document.querySelector('figure[aria-label="Sampled route elevation"]');return f?{text:f.textContent,points:f.querySelector('polyline').getAttribute('points'),marker:Number(f.querySelector('line').getAttribute('x1')),label:f.querySelector('svg').getAttribute('aria-label')}:null;})()`);
            assert.ok(graph);assert.equal(graph.marker,150);assert.match(graph.text,/craft motion is not simulated/);assert.match(graph.label,/Current elevation/);
            const inspected=await evaluate(`window.wulframMcp.dispatch({action:'inspect_routes',vehicleWidth:80})`),index=await evaluate(`Number(document.querySelector('[aria-label="Inspect route"]').value)`),profile=inspected.routes[index].elevation;
            assert.equal(profile.error,undefined);assert.ok(profile.samples.length>1);const heights=profile.samples.map(s=>s.height),low=Math.min(...heights),span=Math.max(1,Math.max(...heights)-low);
            assert.equal(graph.points,profile.samples.map(s=>`${10+s.distance/Math.max(1,profile.length)*280},${90-(s.height-low)/span*70}`).join(' '));
            await send('Emulation.setDeviceMetricsOverride',{width:960,height:800,deviceScaleFactor:1,mobile:false});await screenshot('route-elevation-960');
            assert.ok(await evaluate(`(()=>{const f=document.querySelector('figure[aria-label="Sampled route elevation"]');return f.scrollWidth<=f.clientWidth;})()`));await send('Emulation.clearDeviceMetricsOverride');
            report.routeElevation={graphMatchesMcp:true,scrubMarker:true,compact:true,nonSimulationLabel:true,samples:profile.samples.length};
          }

          const complete = await saved();
          assert.deepEqual(complete.terrain, terrain);
          assert.equal(complete.entities.length,24);
          await button('Undo'); assert.deepEqual((await saved()).entities, placed.entities);
          await button('Redo'); assert.deepEqual((await saved()).entities, complete.entities);
          await evaluate(`(()=>{const d=[...document.querySelectorAll('details')].find(d=>d.querySelector('summary')?.textContent==='Display options');d.open=true;[...d.querySelectorAll('label')].find(l=>l.textContent.trim()==='Power tint').querySelector('input').click();})()`);
          await delay(100);
          assert.equal(await evaluate(`JSON.parse(localStorage.getItem('wulfram-forge-display-v1')).powerTint`),false);
          await screenshot('combined-guide-inspection');
          const downloads=path.join(out,'downloads');await fs.mkdir(downloads,{recursive:true});
          await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads,eventsEnabled:true});
          await button('Export map');
          await waitFor(async()=>report.downloadEvents?.some(e=>e.method==='Browser.downloadProgress'&&e.state==='completed'),'combined download completed');
          const filename=await waitFor(async()=> (await fs.readdir(downloads)).find(n=>n.endsWith('.zip')),'combined ZIP');
          const entries=await readMapArchive(await fs.readFile(path.join(downloads,filename)));
          const exported=JSON.parse(entries.find(e=>e.name.endsWith('/wulfram-project.json')).text);
          assert.deepEqual(exported.terrain,complete.terrain);assert.deepEqual(exported.baseLayouts,complete.baseLayouts);
          report.exportedMap=path.join(downloads,filename);
          await stop(); await launch();
          await waitFor(()=>evaluate(`document.querySelector('.statusbar')?.textContent.includes('Restored')`),'combined restart');
          assert.deepEqual(await saved(),complete);
          await waitFor(()=>evaluate(`!![...document.querySelectorAll('label')].find(l=>l.textContent.trim()==='Power tint')`),'display controls');
          assert.equal(await evaluate(`[...document.querySelectorAll('label')].find(l=>l.textContent.trim()==='Power tint').querySelector('input').checked`),false);
          await evaluate(`document.querySelector('.workflow-guide > details').open=true`);
          await screenshot('combined-restarted');
          // Real UI import of the exported ZIP, not just archive decoding.
          const doc=await send('DOM.getDocument');const input=await send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'input[type="file"][multiple]'});
          await send('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[report.exportedMap]});
          await waitFor(()=>evaluate(`document.querySelector('.statusbar')?.textContent.includes('imported')`),'combined reimport');
          assert.deepEqual((await saved()).terrain,complete.terrain);
          assert.deepEqual((await saved()).baseLayouts,complete.baseLayouts);
          await step('Compact high-DPI guide and keyboard navigation', async () => {
            await send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1.25,mobile:false});
            await evaluate(`document.querySelector('.workflow-guide > details').open=true;document.querySelector('.workflow-guide > details > summary').focus()`);
            for(const type of ['keyDown','keyUp']) await send('Input.dispatchKeyEvent',{type,key:'Tab',code:'Tab',windowsVirtualKeyCode:9,nativeVirtualKeyCode:9});
            assert.equal(await evaluate(`document.activeElement.textContent`),'Sculpt terrain');
            for(const type of ['keyDown','keyUp']) await send('Input.dispatchKeyEvent',{type,key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,...(type==='keyDown'?{text:'\r'}:{})});
            await waitFor(()=>evaluate(`document.querySelector('.workflow-guide').textContent.includes('Active tool: Raise')`),'keyboard selected Raise terrain');
            assert.ok(await evaluate(`(()=>{const g=document.querySelector('.workflow-guide');return g.scrollWidth<=g.clientWidth+1 && document.documentElement.scrollWidth<=1280;})()`),'Compact guide has no horizontal overflow');
            await button('Large landforms');
            await screenshot('compact-high-dpi-guide');
            assert.deepEqual((await saved()).terrain,complete.terrain,'Navigation never edits the map');
            await send('Emulation.clearDeviceMetricsOverride');
          });
        });
      }
    });
  } else if (process.env.WULFRAM_STAMP_3D_TEST === '1') {
    await step('3D ghost, Alt-wheel, safe placement, repeated clicks, presets and restart', async () => {
      const scope = '[aria-label="3D stamp controls"]';
      await button('Terrain'); await button('3D stamp brush');
      await field('Placement mode','manual',scope);
      assert.ok(await evaluate(`document.body.textContent.includes('Manual mode can block routes')`));
      await field('Placement mode','protected',scope);
      assert.equal(await evaluate(`document.querySelectorAll('${scope} input[type="range"]').length`),10);
      await field('Variation seed','native-shape-a',scope);
      await field('Natural variation',.8,scope);await field('Peak roughness',.5,scope);await field('Curve / bend',.6,scope);await field('Edge blending',.3,scope);
      const dimensionsBefore = await evaluate(`[...document.querySelectorAll('${scope} input[type="range"]')].slice(0,4).map(i=>i.value)`);
      await button('New shape variation');
      assert.deepEqual(await evaluate(`[...document.querySelectorAll('${scope} input[type="range"]')].slice(0,4).map(i=>i.value)`),dimensionsBefore);
      assert.notEqual(await evaluate(`[...document.querySelectorAll('${scope} label')].find(l=>l.textContent.startsWith('Variation seed')).querySelector('input').value`),'native-shape-a');
      await field('Variation seed','native-shape-a',scope);
      await evaluate(`[...document.querySelectorAll('${scope} summary')].find(s=>s.textContent==='Stamp textures').click()`);
      await field('Surface texture','11ice001',scope);await field('Texture coverage',1,scope);
      await evaluate(`document.querySelector('${scope} input[type="range"]').focus()`);
      await send('Input.dispatchKeyEvent',{type:'keyDown',key:'End',code:'End',windowsVirtualKeyCode:35});
      await send('Input.dispatchKeyEvent',{type:'keyUp',key:'End',code:'End',windowsVirtualKeyCode:35});await delay(100);
      assert.equal(await evaluate(`document.querySelector('${scope} input[type="range"]').value`),'4000');
      await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Home',code:'Home',windowsVirtualKeyCode:36});
      await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Home',code:'Home',windowsVirtualKeyCode:36});await delay(100);
      assert.equal(await evaluate(`document.querySelector('${scope} input[type="range"]').value`),'160');
      await field('Length', 160, scope); await field('Width', 160, scope); await field('Height / depth', 40, scope);
      const rect = await evaluate(`(() => { const r=document.querySelector('.terrain-viewport').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})()`);
      let point;
      outer: for (let row=4;row<17;row++) for(let col=2;col<18;col++) {
        const p={x:rect.x+rect.width*col/20,y:rect.y+rect.height*row/20};
        await send('Input.dispatchMouseEvent',{type:'mouseMoved',...p});await delay(110);
        if(await evaluate(`document.querySelector('[data-stamp-status]')?.textContent.includes('click to place')`)){point=p;break outer;}
      }
      assert.ok(point,'A visible protected-mode stamp footprint fits');
      await fs.writeFile(path.join(out, 'stamp-test-before.json'), JSON.stringify(original));
      await field('Length',4000,scope);
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await delay(200);
      assert.ok(!(await evaluate(`document.querySelector('[data-stamp-status]')?.textContent.includes('click to place')`)));
      assert.ok(await evaluate(`document.querySelector('[data-stamp-error]')?.textContent.includes('Cannot place terrain stamp')`));
      await screenshot('stamp-blocked-explanation',true);
      await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
      await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});await delay(200);
      assert.deepEqual((await saved()).terrain,original.terrain,'Rejected click does not mutate terrain');
      await field('Length',160,scope);await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await delay(200);
      await send('Input.dispatchMouseEvent',{type:'mouseWheel',...point,deltaX:0,deltaY:100,modifiers:1}); await delay(250);
      assert.equal(await evaluate(`[...document.querySelectorAll('${scope} label')].find(l=>l.textContent.startsWith('Rotation')).querySelector('input').value`),'15');
      await screenshot('3d-stamp-ghost-safe',true);
      const click = async () => { await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await delay(150);await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});await delay(200); };
      await click(); const first = await saved();
      assert.notDeepEqual(first.terrain.textureIds,original.terrain.textureIds,'Stamp paints the selected texture');
      assert.notDeepEqual(first.terrain.heights,original.terrain.heights);assert.deepEqual(first.entities,original.entities);
      await click(); const second = await saved();assert.notDeepEqual(second.terrain.heights,first.terrain.heights);
      await fs.writeFile(path.join(out, 'stamp-test-after.json'), JSON.stringify(second));
      await button('Undo');assert.deepEqual((await saved()).terrain,first.terrain);
      await button('Undo');assert.deepEqual((await saved()).terrain,original.terrain);
      await button('Redo');await button('Redo');assert.deepEqual((await saved()).terrain,second.terrain);
      await field('Preset name','Native stamp test',scope);await button('Save stamp preset');
      const readSettings = () => evaluate(`[...document.querySelectorAll('${scope} input, ${scope} select')].map(e=>({label:e.getAttribute('aria-label')??e.closest('label')?.textContent.split('\\n')[0],value:e.type==='checkbox'?e.checked:e.value}))`);
      const settingsBefore = await readSettings();
      await screenshot('3d-stamp-applied');
      await stop();await launch();await waitFor(()=>evaluate(`document.querySelector('.statusbar')?.textContent.includes('Restored')`),'3D stamped map restored');
      assert.deepEqual((await saved()).terrain,second.terrain);
      await button('Terrain');await button('3D stamp brush');await field('Saved stamps','0',scope);
      assert.equal(await evaluate(`[...document.querySelectorAll('${scope} label')].find(l=>l.textContent.startsWith('Length')).querySelector('input').value`),'160');
      assert.deepEqual(await readSettings(),settingsBefore,'All visible preset settings restored, including dimensions, seed, texture and shape version');
    });
  } else if (process.env.WULFRAM_STAMP_TEST === '1') {
    await step('Terrain stamp preview, rotation, apply, undo/redo and restart', async () => {
      await button('Terrain'); await button('Terrain stamps');
      await field('Landform preset', 'saddle'); await field('Radius', 300);
      await field('Center X', 2000); await field('Center Y', 3200); await field('Rotation', 45);
      assert.ok(await evaluate(`document.body.textContent.includes('terrain vertices will change')`));
      assert.ok(await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Apply terrain stamp').disabled`));
      await screenshot('terrain-stamp-preview');
      await evaluate(`[...document.querySelectorAll('[role="dialog"] label')].find(l=>l.textContent.includes('Manual edit:')).querySelector('input').click()`);
      await button('Apply terrain stamp');
      const stamped = await saved();
      assert.notDeepEqual(stamped.terrain.heights, original.terrain.heights);
      assert.deepEqual(stamped.entities, original.entities);
      assert.deepEqual(stamped.terrain.textureIds, original.terrain.textureIds);
      await screenshot('terrain-stamp-applied');
      await button('Undo'); assert.deepEqual((await saved()).terrain, original.terrain);
      await button('Redo'); assert.deepEqual((await saved()).terrain, stamped.terrain);
      await stop(); await launch();
      await waitFor(()=>evaluate(`document.querySelector('.statusbar')?.textContent.includes('Restored')`), 'stamp restored');
      assert.deepEqual((await saved()).terrain, stamped.terrain);
    });
  } else if (process.env.WULFRAM_VALLEY_TEST === '1') {
    await step('Valleys and mixed terrain apply, undo, replace and reopen', async () => {
      await button('Terrain detail');
      await field('Landform mode','valleys');
      await field('Maximum valley depth',40);
      await field('Terrain texture','11ice001');
      await button('Preview terrain');
      await screenshot('valleys-protected-preview');
      await button('Apply terrain detail');
      const valley=await saved();
      assert.ok(valley.terrain.heights.some((h,i)=>h<original.terrain.heights[i]));
      assert.ok(valley.terrain.heights.every((h,i)=>h<=original.terrain.heights[i]));
      assert.deepEqual(valley.entities,original.entities);
      await button('Undo');assert.deepEqual((await saved()).terrain,original.terrain);
      await button('Redo');assert.deepEqual((await saved()).terrain,valley.terrain);
      await button('Terrain detail');await field('Landform mode','mixed');await field('Maximum peak',40);
      await button('Preview terrain');await screenshot('mixed-protected-preview');await button('Apply terrain detail');
      const mixed=await saved();
      assert.ok(mixed.terrain.heights.some((h,i)=>h<original.terrain.heights[i]));
      assert.ok(mixed.terrain.heights.some((h,i)=>h>original.terrain.heights[i]));
      await stop();await launch();
      await waitFor(()=>evaluate(`document.querySelector('.statusbar')?.textContent.includes('Restored')`),'mixed restored');
      assert.deepEqual(await saved(),mixed);
      await button('Terrain detail');await button('Preview terrain');await screenshot('mixed-reopened');await button('Cancel');
    });
  } else if (process.env.WULFRAM_CITADEL_DETAIL_TEST === '1') {
    await step('Citadel preview, apply, undo/redo and replacement', async () => {
      await button('Terrain detail');
      await button('Preview rocks');
      await button('Apply terrain detail');
      const first = await saved();
      assert.notDeepEqual(first.terrain, original.terrain);
      assert.deepEqual(first.entities, original.entities);
      await button('Undo'); assert.deepEqual((await saved()).terrain,original.terrain);
      await button('Redo'); assert.deepEqual((await saved()).terrain,first.terrain);
      await button('Terrain detail');
      await field('Maximum peak',100);
      await button('Preview rocks');
      await screenshot('citadel-detail-replacement');
      await button('Apply terrain detail');
      const replacement = await saved();
      assert.deepEqual(replacement.entities,original.entities);
      await stop(); await launch();
      await waitFor(()=>evaluate(`document.querySelector('.statusbar')?.textContent.includes('Restored')`),'Citadel detail restored');
      assert.deepEqual(await saved(),replacement);
      await button('Terrain detail'); await button('Preview rocks');
      await screenshot('citadel-detail-reopened');
      await button('Cancel');
    });
  } else if (process.env.WULFRAM_SHOWCASE_TEST === '1') {
    const identity=JSON.parse(original.metadata['showcase.identity']);
    report.validation=analyzeBalancedProject(original,identity.baseAnchors,identity.objectiveAnchors,{},manifest);
    if (process.env.WULFRAM_OUTPOST_TEST === '1') {
      assert.equal(report.validation.terrain.passed,true);
      assert.equal(report.validation.entityPairing.passed,true);
      const issues=report.validation.projectIssues.filter(i=>i.severity==='error');
      assert.equal(issues.length,1);assert.equal(issues[0].code,'power');
      assert.equal(issues[0].entityId,'central-neutral-repair-1');
      assert.equal(original.entities.filter(e=>e.team===0).length,1);
      report.expectedUnpoweredNeutralError=true;
    } else assert.equal(report.validation.passed,true);
    if (process.env.WULFRAM_SHOWCASE_CLEAN === '1') { await button('Terrain'); await button('Toggle terrain grid'); }
    else await screenshot('showcase-overview');
    if (process.env.WULFRAM_SHOWCASE_VIDEO === '1') {
      await evaluate(`(() => {
        const canvas = document.querySelector('.terrain-viewport canvas');
        const stream = canvas.captureStream(30);
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 12000000 });
        const chunks = [];
        recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
        window.showcaseRecording = { recorder, stream, chunks };
        recorder.start(1000);
      })()`);
      await delay(3000);
    }
    const cameraKey=async(code,key,ms)=>{
      await evaluate(`document.querySelector('.terrain-viewport canvas').focus()`);
      await send('Input.dispatchKeyEvent',{type:'keyDown',code,key});
      await delay(ms);
      await send('Input.dispatchKeyEvent',{type:'keyUp',code,key});
    };
    if (process.env.WULFRAM_SHOWCASE_CLEAN === '1') {
      await cameraKey('KeyE','e',35);await cameraKey('ArrowUp','ArrowUp',300);await screenshot('showcase-overview');await cameraKey('Home','Home',40);
    }
    if (process.env.WULFRAM_OUTPOST_TEST === '1') {
      await cameraKey('KeyQ','q',1600);
      await screenshot('central-outpost-close');
      await cameraKey('ArrowRight','ArrowRight',1256);
      await screenshot('central-outpost-side');
      await cameraKey('Home','Home',40);
    }
    if (process.env.WULFRAM_SHOWCASE_SIDES === '1') {
      for (const [name, opposite] of [['near', false], ['opposite', true]]) {
        await cameraKey('Home','Home',40);
        if (opposite) await cameraKey('ArrowRight','ArrowRight',2513);
        await cameraKey('KeyS','s',550);
        await cameraKey('KeyQ','q',1400);
        await cameraKey('ArrowRight','ArrowRight',1256);
        await screenshot(`showcase-${name}-side`);
        await delay(2500);
        await cameraKey('ArrowLeft','ArrowLeft',450);
        await screenshot(`showcase-${name}-side-quarter`);
        await delay(2500);
      }
    } else {
    await cameraKey('KeyQ','q',650);
    await cameraKey('ArrowDown','ArrowDown',320);
    await screenshot('showcase-center-approach');
    await cameraKey('Home','Home',40);
    await cameraKey('KeyS','s',550);
    await cameraKey('KeyQ','q',1400);
    await cameraKey('ArrowDown','ArrowDown',300);
    await screenshot('showcase-near-base');
    await cameraKey('ArrowUp','ArrowUp',380);
    await screenshot('showcase-near-service-court');
    await cameraKey('Home','Home',40);
    await cameraKey('ArrowRight','ArrowRight',2513);
    await cameraKey('KeyS','s',550);
    await cameraKey('KeyQ','q',1400);
    await cameraKey('ArrowDown','ArrowDown',300);
    await screenshot('showcase-opposite-base');
    await cameraKey('ArrowUp','ArrowUp',380);
    await screenshot('showcase-opposite-service-court');
    }
    await cameraKey('Home','Home',40);
    await step('Actual showcase map export preserves authored terrain and structures',async()=>{
      if (process.env.WULFRAM_SHOWCASE_VIDEO === '1') {
        await cameraKey('ArrowRight','ArrowRight',1800);
        await delay(3000);
        const video = await evaluate(`new Promise(resolve => {
          const { recorder, stream, chunks } = window.showcaseRecording;
          recorder.onstop = async () => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(new Blob(chunks, { type: 'video/webm' }));
            stream.getTracks().forEach(t => t.stop());
          };
          recorder.stop();
        })`);
        report.video = path.join(out, 'Canyon-Citadel-showcase.webm');
        await fs.writeFile(report.video, Buffer.from(video, 'base64'));
      }
      const downloads=path.join(out,'downloads');await fs.mkdir(downloads);
      await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
      await button('Export map');
      const filename=await waitFor(async()=> (await fs.readdir(downloads)).find(n=>n.endsWith('.zip')),'showcase ZIP exported');
      const entries=await readMapArchive(await fs.readFile(path.join(downloads,filename)));
      const exported=JSON.parse(entries.find(e=>e.name.endsWith('/wulfram-project.json')).text);
      assert.deepEqual(exported.terrain,original.terrain);assert.deepEqual(exported.entities,original.entities);
      report.exportedMap=path.join(downloads,filename);
    });
    await step('Showcase save and process reopen preserve authored terrain and bases',async()=>{
      await stop(); await launch();
      await waitFor(()=>evaluate(`document.querySelector('.statusbar')?.textContent.includes('Restored')`),'showcase restored');
      assert.deepEqual(await saved(),original);
      await screenshot('showcase-reopened');
    });
  } else if (process.env.WULFRAM_SEARCH_TEST === '1') {
    await testSearchUI({ button, field, evaluate, waitFor, screenshot, saved, step, original, report });
  } else {
  const terrainOnly = original.entities.length === 0;
  if (terrainOnly) assert.equal(original.metadata['generator.stage'], 'terrain-only-bases-required');
  await step('Preview mountains; incomplete bases remain explicit', async () => {
    await button('Terrain detail');
    for (const [label, value] of [['Detail seed', 'rocks-001'], ['Requested cluster',12], ['Cluster radius',180], ['Minimum peak',50], ['Maximum peak',1000]]) await field(label, value);
    await button('Preview rocks');
    await waitFor(() => evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Apply terrain detail'); return b && !b.disabled; })()`), 'terrain detail preview PASS');
    if (terrainOnly) assert.ok(await evaluate(`document.body.textContent.includes('TERRAIN DETAIL PASS — BASES STILL REQUIRED')`));
    await screenshot('01-mountains-preview');
  });
  await button('Apply terrain detail');
  let mountains = await saved();
  assert.notDeepEqual(mountains.terrain.heights, original.terrain.heights);
  if (terrainOnly) assert.equal(mountains.metadata['generator.stage'], 'terrain-only-bases-required');
  assert.equal(inspectDiagnosticProject(mountains, manifest).balance.passed, !terrainOnly);
  await step('Actual Undo and Redo restore terrain', async () => {
    await button('Undo'); assert.deepEqual((await saved()).terrain, original.terrain);
    await button('Redo'); assert.deepEqual((await saved()).terrain, mountains.terrain);
  });
  await step('Reopen settings and replace mountains without stacking; undo/redo preserves both versions', async () => {
    const prior = mountains;
    await button('Terrain detail');
    assert.equal(await evaluate(`document.querySelectorAll('[role="dialog"] input')[4].value`), '1000');
    await field('Maximum peak', 65);
    await field('Minimum peak', 5);
    await button('Preview rocks');
    await waitFor(() => evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Apply terrain detail'); return b && !b.disabled; })()`), 'replacement passes');
    await screenshot('01b-replacement-preview');
    await button('Apply terrain detail');
    mountains = await saved();
    const expected = previewTerrainDetail(prior, { ...readTerrainDetailOptions(prior), minHeight: 5, height: 65 }, manifest);
    assert.deepEqual(mountains.terrain, JSON.parse(JSON.stringify(expected.project.terrain)));
    assert.deepEqual(mountains.entities, prior.entities);
    await button('Undo'); assert.deepEqual((await saved()).terrain, prior.terrain);
    await button('Redo'); assert.deepEqual((await saved()).terrain, mountains.terrain);
  });
  await step('Preview and apply paired combat bases', async () => {
    await button('Random base');
    for (const [label,value] of [['Base seed','terrain-first-completion'], ['Base template','forge-combat-base-v1'], ['Maximum base diameter',2000], ['Structure spacing',1], ['Base rotation',0]]) await field(label,value);
    await button('Preview bases');
    await waitFor(() => evaluate(`document.body.textContent.includes('· PASS · 22 entities')`), 'base preview PASS');
    await screenshot('02-bases-preview');
    await button('Apply previewed bases');
  });
  const completed = await saved();
  assert.equal(completed.entities.length, 22);
  assert.equal(completed.metadata['generator.stage'], undefined);
  if (terrainOnly) assert.notEqual(completed.baseLayouts.find(l => l.id === completed.activeBaseLayoutId).name, 'Terrain only — bases required');
  assert.deepEqual(completed.terrain, mountains.terrain);
  report.validation = inspectDiagnosticProject(completed, manifest);
  assert.equal(report.validation.balance.passed, true);
  await step('Actual Undo and Redo restore bases', async () => {
    await button('Undo'); assert.deepEqual((await saved()).entities, mountains.entities);
    await button('Redo'); assert.deepEqual((await saved()).entities, completed.entities);
  });
  await screenshot('03-completed-map');
  await fs.writeFile(path.join(out, 'completed-project.json'), JSON.stringify(completed));
  await step('Actual Export map produces valid complete archive', async () => {
    const downloads = path.join(out, 'downloads');
    await fs.mkdir(downloads);
    await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
    await button('Export map');
    const filename = await waitFor(async () => (await fs.readdir(downloads)).find(name => name.endsWith('.zip')), 'map ZIP download');
    const entries = await readMapArchive(await fs.readFile(path.join(downloads, filename)));
    const exported = JSON.parse(entries.find(entry => entry.name.endsWith('/wulfram-project.json')).text);
    assert.deepEqual(exported.terrain, completed.terrain);
    assert.deepEqual(exported.entities, completed.entities);
    assert.equal(inspectDiagnosticProject(exported, manifest).balance.passed, true);
    report.exportedMap = path.join(downloads, filename);
  });
  await step('Close and relaunch EXE with isolated saved profile', async () => {
    await stop(); await launch();
    await waitFor(() => evaluate(`document.querySelector('.statusbar')?.textContent.includes('Restored')`), 'saved project restored');
    assert.deepEqual(await saved(), completed);
    await screenshot('04-reopened-map');
    await button('Terrain detail');
    assert.equal(await evaluate(`document.querySelectorAll('[role="dialog"] input')[4].value`), '65');
    await button('Preview rocks');
    await waitFor(() => evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Apply terrain detail'); return b && !b.disabled; })()`), 'saved replacement can preview after restart and base generation');
    await button('Cancel');
  });
  }
  if(process.env.WULFRAM_COMPOSITION_TEST==='1')await step('Retained composition limit survives export, restart and reimport and rejects bridge deletion',async()=>{
    const before=await saved(),member=before.entities.find(e=>e.team===1&&e.token==='r');assert.ok(member,'Completed map has a team 1 repair pad');
    const count=before.entities.filter(e=>e.team===1&&e.token==='r').length,key='forge.composition-budgets.v1';
    await evaluate(`document.querySelector('.composition-budget-panel').open=true`);
    await field('Counted role','repair','.composition-budget-panel');await field('Minimum count',count,'.composition-budget-panel');await field('Maximum count',count,'.composition-budget-panel');await button('Save composition limit');
    const limited=await saved(),layout=limited.baseLayouts.find(l=>l.id===limited.activeBaseLayoutId);
    assert.deepEqual(JSON.parse(layout.metadata[key]),[{team:1,role:'repair',min:count,max:count}]);
    const downloads=path.join(out,'composition-downloads');await fs.mkdir(downloads);
    await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});await button('Export map');
    const filename=await waitFor(async()=>(await fs.readdir(downloads)).find(n=>n.endsWith('.zip')),'limited map ZIP'),archive=path.join(downloads,filename);
    const entries=await readMapArchive(await fs.readFile(archive)),exported=JSON.parse(entries.find(e=>e.name.endsWith('/wulfram-project.json')).text);
    assert.deepEqual(exported.baseLayouts,limited.baseLayouts);assert.deepEqual(exported.entities,limited.entities);assert.deepEqual(exported.terrain,limited.terrain);
    await stop();await launch();await waitFor(()=>evaluate(`document.querySelector('.statusbar')?.textContent.includes('Restored')`),'limited saved map restored');assert.deepEqual(await saved(),limited);
    const prior=await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).revision`);
    const {root:doc}=await send('DOM.getDocument'),{nodeId}=await send('DOM.querySelector',{nodeId:doc.nodeId,selector:'input[type="file"][multiple]'});await send('DOM.setFileInputFiles',{nodeId,files:[archive]});
    await waitFor(()=>evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'}).revision!==${JSON.stringify(prior)}`),'limited ZIP reimport');
    const reopened=await saved();assert.deepEqual(reopened.baseLayouts,limited.baseLayouts);assert.deepEqual(reopened.entities,limited.entities);assert.deepEqual(reopened.terrain,limited.terrain);
    const state=await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'})`);
    const rejected=await evaluate(`(()=>{try{window.wulframMcp.dispatch(${JSON.stringify({action:'edit_entities',expectedRevision:state.revision,edits:[{operation:'remove',id:member.id}]})});return '';}catch(e){return e.message;}})()`);
    assert.match(rejected,/Team 1 Repair pads.*required/);
    const after=await evaluate(`window.wulframMcp.dispatch({action:'get_editor_state'})`);assert.equal(after.revision,state.revision);assert.equal(after.undoCount,state.undoCount);assert.deepEqual(await saved(),reopened);
    await evaluate(`document.querySelector('.composition-budget-panel').open=true`);await screenshot('composition-reopened');
    report.compositionRoundTrip={archive,rule:JSON.parse(layout.metadata[key]),restart:true,reimport:true,nativeBridgeDeletionRejected:true,revisionAndUndoPreserved:true,wholeProjectPreserved:true};
  });
  assert.deepEqual(errors, [], 'No unhandled renderer exceptions');
  assert.equal(sha(await fs.readFile(fixture)), report.fixtureSha256, 'Original fixture preserved');
  report.passed = true;
} catch (error) {
  report.error = error.stack;
  try { report.inputAudit=await evaluate('({events:window.forgeInputAudit??[],visibility:document.visibilityState,focused:document.hasFocus(),active:document.activeElement?.outerHTML?.slice(0,500)})'); } catch { /* A stopped renderer cannot provide an input trace. */ }
  try { await screenshot('failure'); report.visibleText = await evaluate('document.body.innerText'); } catch { /* Startup failure may have no renderer. */ }
  process.exitCode = 1;
} finally {
  report.rendererErrors = errors;
  if (process.env.WULFRAM_SHOWCASE_VIDEO === '1' && report.passed) {
    socket?.close();
    child?.unref();
    report.leftOpen = true;
  } else await stop();
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, report: path.join(out, 'report.json'), error: report.error }, null, 2));
}
