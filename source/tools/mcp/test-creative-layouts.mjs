import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {CREATIVE_BASE_LAYOUTS} from '../../lib/creative-base-layouts.ts';
import {readMapArchive} from '../../lib/map-package.ts';
import {activateTestWindow} from '../native-test-window.mjs';
const root=process.cwd(),out=await fs.mkdtemp(path.join(root,'outputs','creative-native-'));
const fixture=path.join(root,'outputs/base-count-layouts-v1/Base-Placement-Five-Layouts.zip');
const baselinePath=path.join(root,'outputs/base-count-layouts-v1/Base-Placement-Five-Layouts.json');
const baselineBytes=await fs.readFile(baselinePath);
const baseline=JSON.parse(baselineBytes);
const sessionDir=path.join(out,'sessions');
const sha=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
const executable=path.resolve(process.argv[2] ?? path.join(root,'dist/desktop/creative-sprint-v5/WulframForge.exe'));
const inputFiles=[executable,fixture,path.join(root,'outputs/base-count-layouts-v1/Base-Placement-Five-Layouts.json'),...['valley','hills','mounds'].map(terrain=>path.join(root,'outputs/creative-terrain-v7-trials',terrain+'.zip'))];
const inputHashes=await Promise.all(inputFiles.map(async file=>({path:file,sha256:file===baselinePath?createHash('sha256').update(baselineBytes).digest('hex'):await sha(file)})));
const report={passed:false,out,steps:[],executable,executableSha256:inputHashes[0].sha256,inputs:inputHashes};
const until=async(fn,label)=>{const end=Date.now()+45000;while(Date.now()<end){const r=await fn().catch(()=>undefined);if(r)return r;await new Promise(r=>setTimeout(r,150));}throw new Error('Timeout: '+label);};
const listener=net.createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));
let app,socket,client,diagnoseFailure,relationshipRoundTrip;let sequence=0;const pending=new Map();
try{
  app=spawn(executable,[],{windowsHide:true,stdio:'ignore',env:{...process.env,WULFRAM_FORGE_MCP:'1',WULFRAM_MCP_SESSION_DIR:sessionDir,WULFRAM_FORGE_USER_DATA_DIR:path.join(out,'profile'),WULFRAM_FORGE_REMOTE_DEBUGGING_PORT:String(port)}});
  app.on('error',e=>console.error(e.message));
  const page=await until(async()=>{const a=await fetch(`http://127.0.0.1:${port}/json`).then(r=>r.json());return a.find(t=>t.url==='https://wulfram-forge.local/index.html');},'native editor');
  socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
  socket.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);if(m.error)p.reject(new Error(m.error.message));else p.resolve(m.result);}};
  const protocol=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(new Error('UI request timeout: '+method+' '+String(params.expression??'').slice(0,180)));},15000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
  const prepareCapture=async()=>{
    const state=await protocol('Runtime.evaluate',{expression:'document.visibilityState',returnByValue:true});
    if(state.result.value!=='visible'){
      const activation=await activateTestWindow(app.pid,path.resolve(process.argv[2]??path.join(root,'dist/desktop/creative-sprint-v5/WulframForge.exe')));
      (report.windowActivations??=[]).push(activation);
    }
    await protocol('Page.bringToFront');
    await until(async()=>{
      const r=await protocol('Runtime.evaluate',{expression:'document.visibilityState',returnByValue:true});
      return r.result.value==='visible';
    },'test page must be visible for native screenshot capture');
  };
  const send=async(method,params={})=>{
    if(method==='Page.captureScreenshot')await prepareCapture();
    return protocol(method,params);
  };
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;};
  diagnoseFailure=async()=>{
    const checks=await Promise.allSettled([
      evaluate('({readyState:document.readyState,visibility:document.visibilityState,focused:document.hasFocus(),bridgeReady:!!window.wulframMcp,status:document.querySelector(".status-bar")?.textContent})'),
      send('Page.getLayoutMetrics'),
    ]);
    return checks.map((check,index)=>({label:['rendererState','layoutMetrics'][index],...(check.status==='fulfilled'?{value:check.value}:{error:String(check.reason)})}));
  };
  await until(()=>evaluate('!!window.wulframMcp && !!document.querySelector(\'input[type="file"][multiple]\')'),'loaded');
  await prepareCapture(); // Imports also need an active native view before CDP input.
  const dom=await send('DOM.getDocument'),input=await send('DOM.querySelector',{nodeId:dom.root.nodeId,selector:'input[type="file"][multiple]'});
  await send('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[fixture]});
  client=new Client({name:'creative-layout-critic',version:'1'});
  await client.connect(new StdioClientTransport({command:process.execPath,args:['--experimental-strip-types',path.join(root,'tools/mcp/server.mjs')],env:{...process.env,WULFRAM_MCP_SESSION_DIR:sessionDir},stderr:'pipe'}));
  const raw=async(name,args={})=>{
    if(name==='capture_view')await prepareCapture();
    const started=Date.now();
    const result=await client.callTool({name,arguments:args});
    if(name==='capture_view'&&(result.isError||result.content?.[0]?.type!=='image')){
      const captureElapsedMs=Date.now()-started;
      // Preserve the failing MCP result. Independent read-only probes distinguish
      // a capture failure from an unresponsive renderer or named-pipe host.
      const probes=await Promise.allSettled([
        evaluate('({title:document.title,readyState:document.readyState,bridgeReady:!!window.wulframMcp,visibility:document.visibilityState})'),
        send('Page.captureScreenshot',{format:'png'}),
        client.callTool({name:'inspect_map',arguments:{sessionId:args.sessionId}}),
      ]);
      const diagnostic={captureElapsedMs,result,probes:[]};
      for(const [index,probe] of probes.entries()){
        const label=['renderer','devtoolsCapture','editorHost'][index];
        if(probe.status==='rejected'){diagnostic.probes.push({label,error:String(probe.reason)});continue;}
        if(index===1){
          const file='failed-mcp-capture-devtools.png';
          await fs.writeFile(path.join(out,file),Buffer.from(probe.value.data,'base64'));
          diagnostic.probes.push({label,file});
        }else if(index===2){
          diagnostic.probes.push({label,isError:!!probe.value.isError,text:probe.value.content?.[0]?.text?.slice(0,1000)});
        }else diagnostic.probes.push({label,value:probe.value});
      }
      report.captureFailure=diagnostic;
      await fs.writeFile(path.join(out,'capture-failure.json'),JSON.stringify(diagnostic,null,2));
    }
    return result;
  };
  const call=async(name,args={})=>{const r=await raw(name,args);if(r.isError)throw new Error(r.content[0].text);return JSON.parse(r.content[0].text);};
  const session=await until(async()=>{const r=await call('list_editor_sessions');return r.sessions.find(s=>s.ready&&s.name===baseline.name);},'import');
  const sessionId=session.sessionId;
  if(process.env.WULFRAM_DISTRICT_TEST==='1'){
    let before=await call('inspect_map',{sessionId});
    const chosen=before.entities.filter(e=>e.team===1&&e.token==='e').slice(0,2);assert.equal(chosen.length,2);
    const click=async label=>{await until(()=>evaluate(`!![...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}&&!b.disabled)`),'district action '+label);await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}).click()`);};
    const field=async(label,value)=>evaluate(`(()=>{const e=document.querySelector('[aria-label=${JSON.stringify(label)}]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(String(value))});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await evaluate(`document.querySelector('.district-panel').open=true`);
    for(const e of chosen)await evaluate(`document.querySelector('input[aria-label=${JSON.stringify('Select district building '+e.id)}]').click()`);
    await until(()=>evaluate(`document.querySelector('.district-panel').textContent.includes('2 selected')`),'two buildings selected');
    await evaluate(`document.querySelector('.district-panel details').open=true`);
    await click('Align Y centers');
    await until(()=>evaluate(`document.querySelector('.district-panel').textContent.includes('already have this alignment')`),'no-op alignment');
    assert.equal((await call('inspect_map',{sessionId})).revision,before.revision);
    await click('Align X centers');
    const aligned=await until(async()=>{const p=await call('inspect_map',{sessionId});return p.revision!==before.revision?p:false;},'alignment applied');
    assert.equal(aligned.undoCount,before.undoCount+1);
    await evaluate(`document.querySelector('.district-panel details').scrollIntoView({block:'start'})`);
    const alignmentShot=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,'district-alignment.png'),Buffer.from(alignmentShot.data,'base64'));
    for(const e of chosen){const a=aligned.entities.find(v=>v.id===e.id);assert.equal(a.position[0],(chosen[0].position[0]+chosen[1].position[0])/2);assert.equal(a.position[1],e.position[1]);assert.equal(a.rotation[2],e.rotation[2]);}
    await call('undo',{sessionId,expectedRevision:aligned.revision});before=await call('inspect_map',{sessionId});
    const third=before.entities.find(e=>e.team===1&&e.token==='r');assert.ok(third);
    await evaluate(`document.querySelector('input[aria-label=${JSON.stringify('Select district building '+third.id)}]').click()`);
    await until(()=>evaluate(`document.querySelector('.district-panel').textContent.includes('3 selected')`),'distribution selection');
    await click('Distribute along X');
    const distributed=await until(async()=>{const p=await call('inspect_map',{sessionId});return p.revision!==before.revision?p:false;},'distribution applied');
    const ordered=[...chosen,third].sort((a,b)=>a.position[0]-b.position[0]);
    for(const [i,e] of ordered.entries())assert.ok(Math.abs(distributed.entities.find(v=>v.id===e.id).position[0]-(ordered[0].position[0]+(ordered[2].position[0]-ordered[0].position[0])*i/2))<.001);
    assert.deepEqual(distributed.entities.filter(e=>!ordered.some(o=>o.id===e.id)),before.entities.filter(e=>!ordered.some(o=>o.id===e.id)));
    assert.equal(distributed.undoCount,before.undoCount+1);
    await call('undo',{sessionId,expectedRevision:distributed.revision});const undoDistribution=await call('inspect_map',{sessionId});assert.deepEqual(undoDistribution.entities,before.entities);before=undoDistribution;
    await evaluate(`document.querySelector('input[aria-label=${JSON.stringify('Select district building '+third.id)}]').click()`);
    await until(()=>evaluate(`document.querySelector('.district-panel').textContent.includes('2 selected')`),'restore pair selection');
    report.steps.push({districtAlignment:true,districtDistribution:true,preservedUnselectedEntities:true,alignmentUndo:true});
    for(const axis of ['X','Y']){
      await click('Mirror '+axis+' positions');
      const mirrored=await until(async()=>{const p=await call('inspect_map',{sessionId});return p.revision!==before.revision?p:false;},'mirrored '+axis);
      assert.equal(mirrored.undoCount,before.undoCount+1);
      const index=axis==='X'?0:1, center=chosen.reduce((s,e)=>s+e.position[index],0)/2;
      for(const original of chosen){const actual=mirrored.entities.find(e=>e.id===original.id);assert.ok(Math.abs(actual.position[index]-(2*center-original.position[index]))<.001);assert.ok(Math.abs(actual.rotation[2]-(axis==='X'?Math.PI-original.rotation[2]:-original.rotation[2]))<.001);}
      assert.deepEqual(mirrored.entities.filter(e=>!chosen.some(c=>c.id===e.id)),before.entities.filter(e=>!chosen.some(c=>c.id===e.id)));
      await call('undo',{sessionId,expectedRevision:mirrored.revision});const restored=await call('inspect_map',{sessionId});assert.deepEqual(restored.entities,before.entities);before=restored;
    }
    await field('District name','Supply yard');await click('Save named district');
    const named=await until(async()=>{const p=await call('inspect_map',{sessionId});return p.revision!==before.revision?p:false;},'named district');
    assert.equal(named.undoCount,before.undoCount+1);
    await evaluate(`(()=>{const e=document.querySelector('select[aria-label="District to update"]');e.value=e.options[1].value;e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await evaluate(`Array.from(document.querySelectorAll('.district-panel details')).find(d=>d.querySelector('summary').textContent==='Composition role and variation').open=true`);
    for(const [label,value] of [['District composition role','power'],['District variation permission','reposition']])await evaluate(`(()=>{const e=document.querySelector('select[aria-label=${JSON.stringify(label)}]');e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await click('Save district composition');const compositionSaved=await until(async()=>{const p=await call('inspect_map',{sessionId});return p.revision!==named.revision?p:false;},'composition saved');assert.deepEqual(compositionSaved.entities,named.entities);assert.equal(compositionSaved.undoCount,named.undoCount+1);
    const compositionExport=await call('export_map',{sessionId,expectedRevision:compositionSaved.revision,name:'composition-test-'+Date.now()});
    const compositionArchive=await readMapArchive(await fs.readFile(compositionExport.path));const compositionProject=JSON.parse(compositionArchive.find(e=>e.name.endsWith('/wulfram-project.json')).text);const compositionGroup=JSON.parse(compositionProject.baseLayouts.find(l=>l.id===compositionProject.activeBaseLayoutId).metadata['forge.districts.v1'])[0];assert.equal(compositionGroup.role,'power');assert.equal(compositionGroup.variation,'reposition');
    await evaluate(`Array.from(document.querySelectorAll('.district-panel details')).find(d=>d.querySelector('summary').textContent==='Composition role and variation').scrollIntoView({block:'center'})`);
    const compositionShot=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,'district-composition.png'),Buffer.from(compositionShot.data,'base64'));
    await evaluate(`document.querySelector('.district-arrangement-panel').open=true`);await field('District arrangement distance',20);
    await evaluate(`(()=>{const e=document.querySelector('select[aria-label="District arrangement team policy"]');e.value='paired-positions';e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await click('Preview arrangements');
    await until(()=>evaluate(`document.querySelector('.district-arrangement-panel').textContent.includes('matching opposite-team')`),'missing paired district explanation');assert.equal((await call('inspect_map',{sessionId})).revision,compositionSaved.revision);
    await evaluate(`document.querySelector('.district-arrangement-panel').scrollIntoView({block:'start'})`);const pairedShot=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,'paired-district-rejection.png'),Buffer.from(pairedShot.data,'base64'));
    const partners=chosen.map(a=>compositionSaved.entities.find(b=>b.team===3-a.team&&b.token===a.token&&Math.abs(a.position[0]+b.position[0]-compositionSaved.dimensions.worldWidth)<.001&&Math.abs(a.position[1]+b.position[1]-compositionSaved.dimensions.worldHeight)<.001));assert.ok(partners.every(Boolean),'Native fixture has rotational partners');
    await click('Clear selection');for(const partner of partners)await evaluate(`document.querySelector('input[aria-label=${JSON.stringify('Select district building '+partner.id)}]').click()`);
    await field('District name','Partner supply');await click('Save named district');const partnerNamed=await until(async()=>{const p=await call('inspect_map',{sessionId});return p.revision!==compositionSaved.revision?p:false;},'partner district saved');
    await evaluate(`(()=>{const e=document.querySelector('select[aria-label="District to update"]');e.value=Array.from(e.options).find(o=>o.textContent==='Partner supply').value;e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await evaluate(`(()=>{const e=document.querySelector('select[aria-label="District variation permission"]');e.value='reposition';e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await click('Save district composition');
    const partnerReady=await until(async()=>{const p=await call('inspect_map',{sessionId});return p.revision!==partnerNamed.revision?p:false;},'partner eligible');
    if(process.env.WULFRAM_RELATIONSHIP_TEST==='1'){
      await evaluate(`document.querySelector('.district-relationships-panel').open=true`);
      for(const [label,title] of [['First relationship district','Supply yard'],['Second relationship district','Partner supply']])await evaluate(`(()=>{const s=document.querySelector('select[aria-label=${JSON.stringify(label)}]');s.value=[...s.options].find(o=>o.textContent===${JSON.stringify(title)}).value;s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
      await field('District relationship name','Supply separation');
      await field('Maximum district distance',0);await click('Add relationship');
      await until(()=>evaluate(`document.querySelector('.district-relationships-panel').textContent.includes('required 0–0')`),'infeasible relationship explained');assert.equal((await call('inspect_map',{sessionId})).revision,partnerReady.revision);
      const center=units=>[0,1].map(axis=>units.reduce((sum,e)=>sum+e.position[axis],0)/units.length);
      const a=center(chosen),b=center(partners),distance=Math.hypot(a[0]-b[0],a[1]-b[1]);
      await field('Minimum district distance',Math.floor(distance-100));await field('Maximum district distance',Math.ceil(distance+100));await click('Add relationship');
      const saved=await until(async()=>{const p=await call('inspect_map',{sessionId});return p.revision!==partnerReady.revision?p:false;},'relationship saved');assert.deepEqual(saved.entities,partnerReady.entities);assert.equal(saved.undoCount,partnerReady.undoCount+1);
      const rejected=await evaluate(`(()=>{try{window.wulframMcp.dispatch(${JSON.stringify({action:'edit_entities',expectedRevision:saved.revision,edits:[{operation:'remove',id:chosen[0].id}]})});return '';}catch(e){return e.message;}})()`);assert.match(rejected,/Supply separation.*missing/);assert.equal((await call('inspect_map',{sessionId})).revision,saved.revision);
      await click('Preview arrangements');await until(()=>evaluate(`!!document.querySelector('section[aria-label="District arrangement 1"]')`),'relationship constrained preview');assert.equal((await call('inspect_map',{sessionId})).revision,saved.revision);
      await evaluate(`document.querySelector('.district-relationships-panel').scrollIntoView({block:'start'})`);const shot=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,'district-relationships.png'),Buffer.from(shot.data,'base64'));
      await click('Apply arrangement 1');const applied=await until(async()=>{const p=await call('inspect_map',{sessionId});return p.revision!==saved.revision?p:false;},'constrained arrangement applied');assert.equal(applied.undoCount,saved.undoCount+1);assert.notDeepEqual(applied.entities,saved.entities);
      const ca=center(applied.entities.filter(e=>chosen.some(c=>c.id===e.id))),cb=center(applied.entities.filter(e=>partners.some(c=>c.id===e.id)));const actual=Math.hypot(ca[0]-cb[0],ca[1]-cb[1]);assert.ok(actual>=Math.floor(distance-100)&&actual<=Math.ceil(distance+100));
      const movingIds=new Set([...chosen,...partners].map(e=>e.id));assert.deepEqual(applied.entities.filter(e=>!movingIds.has(e.id)),saved.entities.filter(e=>!movingIds.has(e.id)));
      const exported=await call('export_map',{sessionId,expectedRevision:applied.revision,name:'relationships-test-'+Date.now()});const archive=await readMapArchive(await fs.readFile(exported.path));const project=JSON.parse(archive.find(e=>e.name.endsWith('/wulfram-project.json')).text);const rules=JSON.parse(project.baseLayouts.find(l=>l.id===project.activeBaseLayoutId).metadata['forge.district-relationships.v1']);assert.equal(rules[0].name,'Supply separation');relationshipRoundTrip={path:exported.path,entities:applied.entities,memberId:chosen[0].id};
      await call('undo',{sessionId,expectedRevision:applied.revision});const reverted=await call('inspect_map',{sessionId});assert.deepEqual(reverted.entities,saved.entities);
      await evaluate(`document.querySelector('button[aria-label="Edit relationship Supply separation"]').click()`);await field('District relationship name','Edited supply spacing');await field('Maximum district distance',Math.ceil(distance+200));await click('Update relationship');const edited=await until(async()=>{const p=await call('inspect_map',{sessionId});return p.revision!==reverted.revision?p:false;},'relationship edited');assert.deepEqual(edited.entities,saved.entities);assert.equal(edited.undoCount,reverted.undoCount+1);
      await evaluate(`document.querySelector('button[aria-label="Remove relationship Edited supply spacing"]').click()`);const removed=await until(async()=>{const p=await call('inspect_map',{sessionId});return p.revision!==edited.revision?p:false;},'relationship removed');assert.deepEqual(removed.entities,saved.entities);assert.equal(removed.undoCount,edited.undoCount+1);
      await call('undo',{sessionId,expectedRevision:removed.revision});await until(()=>evaluate(`!!document.querySelector('button[aria-label="Edit relationship Edited supply spacing"]')`),'Undo restores removed relationship');const undoRemoval=await call('inspect_map',{sessionId});
      await call('undo',{sessionId,expectedRevision:undoRemoval.revision});await until(()=>evaluate(`!!document.querySelector('button[aria-label="Edit relationship Supply separation"]')`),'Undo restores original relationship');const undoEdit=await call('inspect_map',{sessionId});
      await call('undo',{sessionId,expectedRevision:undoEdit.revision});const restored=await call('inspect_map',{sessionId});assert.deepEqual(restored.entities,partnerReady.entities);assert.equal(restored.undoCount,partnerReady.undoCount);partnerReady.revision=restored.revision;
      report.steps.push({districtRelationships:true,infeasibleSavePreservesMap:true,missingMemberRejected:true,constrainedApply:true,fixedBuildingsPreserved:true,exportedRules:true,relationshipEditRemoveUndo:true,relationshipUndo:true});
    }
    await click('Preview arrangements');await until(()=>evaluate(`!!document.querySelector('section[aria-label="District arrangement 1"]')`),'paired candidate');assert.equal((await call('inspect_map',{sessionId})).revision,partnerReady.revision);
    await evaluate(`document.querySelector('.district-arrangement-panel').scrollIntoView({block:'start'})`);const pairedReadyShot=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,'paired-district-preview.png'),Buffer.from(pairedReadyShot.data,'base64'));
    await click('Apply arrangement 1');const pairedApplied=await until(async()=>{const p=await call('inspect_map',{sessionId});return p.revision!==partnerReady.revision?p:false;},'paired applied');assert.equal(pairedApplied.undoCount,partnerReady.undoCount+1);
    const moving=new Set([...chosen,...partners].map(e=>e.id));assert.deepEqual(pairedApplied.entities.filter(e=>!moving.has(e.id)),partnerReady.entities.filter(e=>!moving.has(e.id)));
    for(let i=0;i<chosen.length;i++){const a=pairedApplied.entities.find(e=>e.id===chosen[i].id),b=pairedApplied.entities.find(e=>e.id===partners[i].id);assert.ok(Math.abs(a.position[0]+b.position[0]-partnerReady.dimensions.worldWidth)<1e-6);assert.ok(Math.abs(a.position[1]+b.position[1]-partnerReady.dimensions.worldHeight)<1e-6);assert.notDeepEqual(a.position,chosen[i].position);}
    await call('undo',{sessionId,expectedRevision:pairedApplied.revision});let pairedUndo=await call('inspect_map',{sessionId});assert.deepEqual(pairedUndo.entities,partnerReady.entities);
    await call('undo',{sessionId,expectedRevision:pairedUndo.revision});pairedUndo=await call('inspect_map',{sessionId});await call('undo',{sessionId,expectedRevision:pairedUndo.revision});compositionSaved.revision=(await call('inspect_map',{sessionId})).revision;
    await click('Supply yard · 2 buildings');
    report.steps.push({nativePairedApply:true,pairedPreviewPreservesMap:true,oppositeXYShifts:true,pairedFixedBuildingsPreserved:true,pairedUndo:true});
    await evaluate(`(()=>{const e=document.querySelector('select[aria-label="District arrangement team policy"]');e.value='preserve-unpaired';e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await click('Preview arrangements');
    await until(()=>evaluate(`!!document.querySelector('section[aria-label="District arrangement 1"]')`),'district arrangement candidate');
    assert.equal((await call('inspect_map',{sessionId})).revision,compositionSaved.revision,'Arrangement preview preserves map');
    await evaluate(`document.querySelector('.district-arrangement-panel').scrollIntoView({block:'start'})`);const arrangementShot=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,'district-arrangements.png'),Buffer.from(arrangementShot.data,'base64'));
    await click('Apply arrangement 1');const arrangementApplied=await until(async()=>{const p=await call('inspect_map',{sessionId});return p.revision!==compositionSaved.revision?p:false;},'arrangement applied');
    assert.equal(arrangementApplied.undoCount,compositionSaved.undoCount+1);assert.deepEqual(arrangementApplied.entities.filter(e=>!chosen.some(c=>c.id===e.id)),compositionSaved.entities.filter(e=>!chosen.some(c=>c.id===e.id)));assert.notDeepEqual(arrangementApplied.entities,compositionSaved.entities);
    await call('undo',{sessionId,expectedRevision:arrangementApplied.revision});const arrangementRestored=await call('inspect_map',{sessionId});assert.deepEqual(arrangementRestored.entities,compositionSaved.entities);compositionSaved.revision=arrangementRestored.revision;
    await evaluate(`document.querySelector('.district-arrangement-panel').open=false`);
    report.steps.push({districtArrangements:true,arrangementPreviewPreservesMap:true,fixedBuildingsPreserved:true,arrangementApplyUndo:true});
    await call('undo',{sessionId,expectedRevision:compositionSaved.revision});named.revision=(await call('inspect_map',{sessionId})).revision;
    report.steps.push({districtComposition:true,compositionPreservesBuildings:true,compositionUndo:true,exportedComposition:compositionExport.path});
    await evaluate(`document.querySelector('button[aria-label="Lock district Supply yard"]').click()`);
    await until(()=>evaluate(`!!document.querySelector('button[aria-label="Unlock district Supply yard"]')`),'district locked');
    const locked=await call('inspect_map',{sessionId});assert.equal(locked.undoCount,named.undoCount+1);
    await click('Align X centers');
    await until(()=>evaluate(`document.querySelector('.district-panel').textContent.includes('is locked')`),'locked alignment rejected');
    assert.equal((await call('inspect_map',{sessionId})).revision,locked.revision);
    await field('District Move X',40);await click('Transform selection');
    await until(()=>evaluate(`document.querySelector('.district-panel').textContent.includes('is locked')`),'locked transform rejected');
    const rejected=await call('inspect_map',{sessionId});assert.equal(rejected.revision,locked.revision);assert.equal(rejected.undoCount,locked.undoCount);assert.deepEqual(rejected.entities,locked.entities);
    const lockError=await evaluate(`(()=>{try{window.wulframMcp.dispatch({action:'edit_entities',expectedRevision:${JSON.stringify(locked.revision)},edits:[{operation:'remove',id:${JSON.stringify(chosen[0].id)}}]});return '';}catch(e){return e.message;}})()`);assert.match(lockError,/locked/);
    assert.equal((await call('inspect_map',{sessionId})).revision,locked.revision);
    for(const command of [
      {action:'edit_entities',edits:[{operation:'move',id:chosen[0].id,x:chosen[0].position[0]+20,y:chosen[0].position[1]}]},
      {action:'edit_terrain',brush:{operation:'raise',x:chosen[0].position[0],y:chosen[0].position[1],radius:150,value:1}},
    ]){
      const error=await evaluate(`(()=>{try{window.wulframMcp.dispatch(${JSON.stringify({...command,expectedRevision:locked.revision})});return '';}catch(e){return e.message;}})()`);assert.match(error,/locked/);
      const unchanged=await call('inspect_map',{sessionId});assert.equal(unchanged.revision,locked.revision);assert.equal(unchanged.undoCount,locked.undoCount);
    }
    await evaluate(`window.wulframMcp.dispatch(${JSON.stringify({action:'edit_terrain',expectedRevision:locked.revision,brush:{operation:'raise',x:before.dimensions.worldWidth/2,y:before.dimensions.worldHeight/2,radius:100,value:1}})})`);
    const distant=await call('inspect_map',{sessionId});assert.equal(distant.undoCount,locked.undoCount+1);
    for(const e of chosen)assert.deepEqual(distant.entities.find(a=>a.id===e.id),e);
    await call('undo',{sessionId,expectedRevision:distant.revision});const undoDistant=await call('inspect_map',{sessionId});assert.deepEqual(undoDistant.entities,locked.entities);locked.revision=undoDistant.revision;
    const lockExport=await call('export_map',{sessionId,expectedRevision:locked.revision,name:'lock-test-'+Date.now()});
    const lockArchive=await readMapArchive(await fs.readFile(lockExport.path));const lockProject=JSON.parse(lockArchive.find(e=>e.name.endsWith('/wulfram-project.json')).text);
    assert.equal(JSON.parse(lockProject.baseLayouts.find(l=>l.id===lockProject.activeBaseLayoutId).metadata['forge.districts.v1'])[0].locked,true);
    await evaluate(`document.querySelector('button[aria-label="Unlock district Supply yard"]').click()`);
    await until(()=>evaluate(`!!document.querySelector('button[aria-label="Lock district Supply yard"]')`),'district unlocked');
    const unlocked=await call('inspect_map',{sessionId});assert.equal(unlocked.undoCount,locked.undoCount+1);
    await call('undo',{sessionId,expectedRevision:unlocked.revision});const undoUnlock=await call('inspect_map',{sessionId});
    await call('undo',{sessionId,expectedRevision:undoUnlock.revision});named.revision=(await call('inspect_map',{sessionId})).revision;
    report.steps.push({districtLocks:true,rejectedGroupEditPreservesRevisionAndUndo:true,rejectedMcpDeletion:true,rejectedMcpMove:true,rejectedSupportingTerrainEdit:true,distantTerrainPreservesLockedBuildings:true,exportedLock:lockExport.path,lockUnlockUndo:true});
    await evaluate(`(()=>{const e=document.querySelector('select[aria-label="District to update"]');e.value=e.options[1].value;e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await field('District name','Forward supply');await click('Rename district');
    await until(()=>evaluate(`document.querySelector('.district-panel').textContent.includes('Forward supply · 2 buildings')`),'district renamed');
    const renamed=await call('inspect_map',{sessionId});assert.deepEqual(renamed.entities,before.entities);assert.equal(renamed.undoCount,named.undoCount+1);
    await evaluate(`document.querySelector('input[aria-label=${JSON.stringify('Select district building '+chosen[1].id)}]').click()`);
    await until(()=>evaluate(`document.querySelector('.district-panel').textContent.includes('1 selected')`),'one member');
    await click('Replace district members');
    await until(()=>evaluate(`document.querySelector('.district-panel').textContent.includes('Forward supply · 1 buildings')`),'membership replaced');
    const replaced=await call('inspect_map',{sessionId});assert.deepEqual(replaced.entities,before.entities);assert.equal(replaced.undoCount,renamed.undoCount+1);
    await call('undo',{sessionId,expectedRevision:replaced.revision});const undoMembers=await call('inspect_map',{sessionId});
    await call('undo',{sessionId,expectedRevision:undoMembers.revision});
    await click('Supply yard · 2 buildings');
    const restoredRecord=await call('inspect_map',{sessionId});named.revision=restoredRecord.revision;
    await field('District Move X',40);await field('District Move Y',20);await field('District Rotate degrees',90);await click('Transform selection');
    const moved=await until(async()=>{const p=await call('inspect_map',{sessionId});return p.revision!==named.revision?p:false;},'district moved');
    assert.equal(moved.undoCount,named.undoCount+1);
    const pair=moved.entities.filter(e=>chosen.some(c=>c.id===e.id));
    assert.ok(Math.abs(Math.hypot(pair[0].position[0]-pair[1].position[0],pair[0].position[1]-pair[1].position[1])-Math.hypot(chosen[0].position[0]-chosen[1].position[0],chosen[0].position[1]-chosen[1].position[1]))<.001);
    assert.deepEqual(moved.entities.filter(e=>!chosen.some(c=>c.id===e.id)),before.entities.filter(e=>!chosen.some(c=>c.id===e.id)));
    await field('District Move X',300);await field('District Move Y',0);await field('District Rotate degrees',0);await click('Duplicate selection');
    const duplicated=await until(async()=>{const p=await call('inspect_map',{sessionId});return p.entities.length===before.entities.length+2?p:false;},'district duplicated');
    assert.equal(new Set(duplicated.entities.map(e=>e.id)).size,duplicated.entities.length);
    await evaluate(`document.querySelector('.district-panel').scrollIntoView({block:'start'})`);
    const shot=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,'district-workshop.png'),Buffer.from(shot.data,'base64'));
    await call('undo',{sessionId,expectedRevision:duplicated.revision});const restoredMove=await call('inspect_map',{sessionId});assert.deepEqual(restoredMove.entities,moved.entities);
    await until(()=>evaluate(`document.querySelector('.district-panel').textContent.includes('0 selected')`),'Undo clears removed copy selection');
    await click('Supply yard · 2 buildings');
    await until(()=>evaluate(`document.querySelector('.district-panel').textContent.includes('2 selected')`),'named district reselected');
    await call('undo',{sessionId,expectedRevision:restoredMove.revision});const restoredNamed=await call('inspect_map',{sessionId});assert.deepEqual(restoredNamed.entities,before.entities);
    const exported=await call('export_map',{sessionId,expectedRevision:restoredNamed.revision,name:'district-test-'+Date.now()});
    const archive=await readMapArchive(await fs.readFile(exported.path));const project=JSON.parse(archive.find(e=>e.name.endsWith('/wulfram-project.json')).text);
    const group=JSON.parse(project.baseLayouts.find(l=>l.id===project.activeBaseLayoutId).metadata['forge.districts.v1'])[0];assert.equal(group.name,'Supply yard');assert.deepEqual(group.entityIds,chosen.map(e=>e.id));
    await call('undo',{sessionId,expectedRevision:restoredNamed.revision});assert.deepEqual((await call('inspect_map',{sessionId})).entities,before.entities);
    await click('Save selection as module');
    await until(()=>evaluate(`JSON.parse(localStorage.getItem('forge-formation-favorites-v1')).some(f=>f.kind==='district')`),'module saved');
    const moduleBaseline=await call('inspect_map',{sessionId});assert.deepEqual(moduleBaseline.entities,before.entities);
    await click('Browse base library');
    await evaluate(`(()=>{const e=document.querySelector('select[aria-label="Base library collection"]');e.value='My districts';e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await until(()=>evaluate(`document.querySelectorAll('.base-library-card').length===1`),'district library card');
    await evaluate(`document.querySelector('.base-library-card').click()`);
    const moduleCardShot=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,'district-module-library.png'),Buffer.from(moduleCardShot.data,'base64'));
    await click('Preview on current map');
    await until(()=>evaluate(`document.querySelector('select[aria-label="Base template"]').value.startsWith('district-module')`),'module armed');
    assert.equal((await call('inspect_map',{sessionId})).revision,moduleBaseline.revision,'Module handoff has no mutation');
    const modulePoint=await evaluate(`(()=>{const r=document.querySelector('.terrain-viewport canvas').getBoundingClientRect();return {x:r.x+r.width*.5,y:r.y+r.height*.68};})()`);
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',...modulePoint});
    await send('Input.dispatchMouseEvent',{type:'mousePressed',...modulePoint,button:'left',buttons:1,clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...modulePoint,button:'left',buttons:0,clickCount:1});
    const modulePlaced=await until(async()=>{const p=await call('inspect_map',{sessionId});return p.entities.length===before.entities.length+2?p:false;},'module placed');
    assert.equal(modulePlaced.undoCount,moduleBaseline.undoCount+1);
    assert.deepEqual(modulePlaced.entities.slice(0,before.entities.length),before.entities);
    const moduleExport=await call('export_map',{sessionId,expectedRevision:modulePlaced.revision,name:'module-test-'+Date.now()});
    const moduleArchive=await readMapArchive(await fs.readFile(moduleExport.path));const moduleProject=JSON.parse(moduleArchive.find(e=>e.name.endsWith('/wulfram-project.json')).text);
    assert.equal(JSON.parse(moduleProject.baseLayouts.find(l=>l.id===moduleProject.activeBaseLayoutId).metadata['forge.districts.v1'])[0].entityIds.length,2);
    await call('undo',{sessionId,expectedRevision:modulePlaced.revision});assert.deepEqual((await call('inspect_map',{sessionId})).entities,before.entities);
    await click('Browse base library');await evaluate(`document.querySelector('.personal-base-library').open=true`);
    await evaluate(`(()=>{const e=document.querySelector('select[aria-label="Manage saved base"]');e.value=e.options[1].value;e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await click('Remove saved base');await click('Close library');
    report.steps.push({districtModules:true,singleCopyPlacement:true,placementUndo:true,exportedMembership:moduleExport.path});
    const areaBefore=await call('inspect_map',{sessionId});
    assert.equal(await evaluate(`document.querySelectorAll('.build-area-panel').length`),1,'One area panel after imports and workshop edits');
    await evaluate(`document.querySelector('.build-area-panel').open=true`);
    await field('Build area name','Departure court');await field('Build area x',4000);await field('Build area y',100);await field('Build area width',200);await field('Build area height',200);
    await field('Build area x',1000000);await click('Preview build area');
    await until(()=>evaluate(`document.querySelector('.build-area-panel').textContent.includes('outside the map')`),'out-of-map preview rejected');assert.equal((await call('inspect_map',{sessionId})).revision,areaBefore.revision);await field('Build area x',4000);
    await click('Preview build area');assert.equal((await call('inspect_map',{sessionId})).revision,areaBefore.revision);
    await evaluate(`document.querySelector('.build-area-panel').scrollIntoView({block:'start'})`);
    const areaShot=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,'build-area-preview.png'),Buffer.from(areaShot.data,'base64'));
    await click('Apply build area');
    const areaSaved=await until(async()=>{const p=await call('inspect_map',{sessionId});return p.revision!==areaBefore.revision?p:false;},'area saved');assert.equal(areaSaved.undoCount,areaBefore.undoCount+1);assert.deepEqual(areaSaved.entities,areaBefore.entities);
    const areaError=await evaluate(`(()=>{try{window.wulframMcp.dispatch(${JSON.stringify({action:'edit_entities',expectedRevision:areaSaved.revision,edits:[{operation:'move',id:chosen[0].id,x:4100,y:200}]})});return '';}catch(e){return e.message;}})()`);assert.match(areaError,/reserved space/);
    assert.equal((await call('inspect_map',{sessionId})).revision,areaSaved.revision);
    for(const [label,value] of [['Build area purpose','boundary'],['Build area team','1']]){
      await evaluate(`(()=>{const e=document.querySelector('select[aria-label=${JSON.stringify(label)}]');e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
      await until(()=>evaluate(`document.querySelector('select[aria-label=${JSON.stringify(label)}]').value===${JSON.stringify(value)}`),'area setting '+label);
    }
    await field('Build area x',0);await field('Build area y',0);await field('Build area width',100);await field('Build area height',100);await click('Apply build area');
    await until(()=>evaluate(`document.querySelector('.build-area-panel').textContent.includes('extends outside the build area')`),'occupied boundary rejected');assert.equal((await call('inspect_map',{sessionId})).revision,areaSaved.revision);
    const areaExport=await call('export_map',{sessionId,expectedRevision:areaSaved.revision,name:'area-test-'+Date.now()});
    const areaArchive=await readMapArchive(await fs.readFile(areaExport.path));const areaProject=JSON.parse(areaArchive.find(e=>e.name.endsWith('/wulfram-project.json')).text);assert.equal(JSON.parse(areaProject.baseLayouts.find(l=>l.id===areaProject.activeBaseLayoutId).metadata['forge.build-areas.v1'])[0].name,'Departure court');
    await evaluate(`document.querySelector('button[aria-label="Remove build area Departure court"]').click()`);
    const areaRemoved=await until(async()=>{const p=await call('inspect_map',{sessionId});return p.revision!==areaSaved.revision?p:false;},'area removed');assert.deepEqual(areaRemoved.entities,areaBefore.entities);
    await call('undo',{sessionId,expectedRevision:areaRemoved.revision});const areaUndo=await call('inspect_map',{sessionId});await call('undo',{sessionId,expectedRevision:areaUndo.revision});assert.deepEqual((await call('inspect_map',{sessionId})).entities,areaBefore.entities);
    const corridorBefore=await call('inspect_map',{sessionId});
    await evaluate(`(()=>{const e=document.querySelector('select[aria-label="Build area purpose"]');e.value='corridor';e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await until(()=>evaluate(`!!document.querySelector('textarea[aria-label="Corridor points"]')`),'corridor editor');
    await evaluate(`(()=>{const e=document.querySelector('select[aria-label="Build area team"]');e.value='all';e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await field('Build area name','Supply link');await field('Build area width',120);
    const corridorPoints=[[4000,400],[4500,400],[4500,900]];
    await evaluate(`(()=>{const e=document.querySelector('textarea[aria-label="Corridor points"]');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,${JSON.stringify(corridorPoints.map(p=>p.join(', ')).join('\n'))});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await click('Preview build area');assert.equal((await call('inspect_map',{sessionId})).revision,corridorBefore.revision);
    await evaluate(`document.querySelector('.build-area-panel').scrollIntoView({block:'start'})`);
    const corridorShot=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,'corridor-preview.png'),Buffer.from(corridorShot.data,'base64'));
    await click('Apply build area');const corridorSaved=await until(async()=>{const p=await call('inspect_map',{sessionId});return p.revision!==corridorBefore.revision?p:false;},'corridor saved');assert.equal(corridorSaved.undoCount,corridorBefore.undoCount+1);
    await click('Inspect'); // Route controls mount on the Inspect page after library placement exits inspection.
    await until(()=>evaluate(`Array.from(document.querySelector('select[aria-label="Inspect route"]').options).some(o=>o.textContent==='Corridor · Supply link')`),'authored route listed');
    await evaluate(`(()=>{const e=document.querySelector('select[aria-label="Inspect route"]');e.value=Array.from(e.options).find(o=>o.textContent==='Corridor · Supply link').value;e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await until(()=>evaluate(`document.querySelector('[data-authored-route]')?.textContent.includes('120 u')`),'authored route selected');assert.equal(await evaluate(`document.querySelector('input[aria-label="Vehicle clearance width"]').value`),'120');
    await field('Vehicle clearance width',240);await until(()=>evaluate(`!!document.querySelector('[data-reservation-width-warning]')`),'wider than reservation notice');await field('Vehicle clearance width',120);
    await click('Follow route');await until(()=>evaluate(`Number(document.querySelector('input[aria-label="Route progress"]').value)>0`),'authored camera tour advances');await click('Pause route');
    assert.equal((await call('inspect_map',{sessionId})).revision,corridorSaved.revision,'Corridor inspection does not modify the map');
    await evaluate(`document.querySelector('section[aria-label="Route inspection"]').scrollIntoView({block:'start'})`);
    const inspectedCorridorShot=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,'corridor-inspection.png'),Buffer.from(inspectedCorridorShot.data,'base64'));
    report.steps.push({authoredRouteInspection:true,reservationWidthNotice:true,authoredCameraTour:true,inspectionPreservesRevision:true});
    const corridorError=await evaluate(`(()=>{try{window.wulframMcp.dispatch(${JSON.stringify({action:'edit_entities',expectedRevision:corridorSaved.revision,edits:[{operation:'move',id:chosen[0].id,x:4500,y:400}]})});return '';}catch(e){return e.message;}})()`);assert.match(corridorError,/reserved space/);assert.equal((await call('inspect_map',{sessionId})).revision,corridorSaved.revision);
    await click('Rules');
    await click('Supply link · corridor');await field('Build area width',150);await click('Apply build area');const corridorEdited=await until(async()=>{const p=await call('inspect_map',{sessionId});return p.revision!==corridorSaved.revision?p:false;},'corridor edited');assert.equal(corridorEdited.undoCount,corridorSaved.undoCount+1);
    await call('undo',{sessionId,expectedRevision:corridorEdited.revision});const corridorRestored=await call('inspect_map',{sessionId});
    const corridorExport=await call('export_map',{sessionId,expectedRevision:corridorRestored.revision,name:'corridor-test-'+Date.now()});
    const corridorArchive=await readMapArchive(await fs.readFile(corridorExport.path));const corridorProject=JSON.parse(corridorArchive.find(e=>e.name.endsWith('/wulfram-project.json')).text);const savedCorridor=JSON.parse(corridorProject.baseLayouts.find(l=>l.id===corridorProject.activeBaseLayoutId).metadata['forge.build-areas.v1'])[0];assert.equal(savedCorridor.kind,'corridor');assert.equal(savedCorridor.width,120);assert.deepEqual(savedCorridor.points,corridorPoints);
    await call('undo',{sessionId,expectedRevision:corridorRestored.revision});assert.deepEqual((await call('inspect_map',{sessionId})).entities,corridorBefore.entities);
    await evaluate(`(()=>{const e=document.querySelector('select[aria-label="Build area purpose"]');e.value='terrain';e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await until(()=>evaluate(`!!document.querySelector('input[aria-label="Build area x"]')`),'terrain rectangle editor');
    await field('Build area name','Protected ridge');await field('Build area x',4000);await field('Build area y',400);await field('Build area width',500);await field('Build area height',500);
    const terrainBefore=await call('inspect_map',{sessionId});await click('Preview build area');assert.equal((await call('inspect_map',{sessionId})).revision,terrainBefore.revision);
    assert.equal(await evaluate(`document.querySelector('select[aria-label="Build area team"]').disabled`),true);
    await evaluate(`document.querySelector('.build-area-panel').scrollIntoView({block:'start'})`);
    const protectedShot=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,'protected-terrain.png'),Buffer.from(protectedShot.data,'base64'));
    await click('Apply build area');const terrainSaved=await until(async()=>{const p=await call('inspect_map',{sessionId});return p.revision!==terrainBefore.revision?p:false;},'terrain protection saved');assert.equal(terrainSaved.undoCount,terrainBefore.undoCount+1);
    const protectedError=await evaluate(`(()=>{try{window.wulframMcp.dispatch(${JSON.stringify({action:'edit_terrain',expectedRevision:terrainSaved.revision,brush:{operation:'raise',x:4250,y:650,radius:150,value:1}})});return '';}catch(e){return e.message;}})()`);assert.match(protectedError,/heights are protected/);
    const rejectedTerrain=await call('inspect_map',{sessionId});assert.equal(rejectedTerrain.revision,terrainSaved.revision);assert.equal(rejectedTerrain.undoCount,terrainSaved.undoCount);
    await evaluate(`window.wulframMcp.dispatch(${JSON.stringify({action:'edit_terrain',expectedRevision:terrainSaved.revision,brush:{operation:'raise',x:terrainBefore.dimensions.worldWidth/2,y:terrainBefore.dimensions.worldHeight/2,radius:100,value:1}})})`);
    const farTerrain=await call('inspect_map',{sessionId});assert.notEqual(farTerrain.revision,terrainSaved.revision);await call('undo',{sessionId,expectedRevision:farTerrain.revision});
    const restoredTerrain=await call('inspect_map',{sessionId});const terrainExport=await call('export_map',{sessionId,expectedRevision:restoredTerrain.revision,name:'protected-terrain-test-'+Date.now()});
    const terrainArchive=await readMapArchive(await fs.readFile(terrainExport.path));const terrainProject=JSON.parse(terrainArchive.find(e=>e.name.endsWith('/wulfram-project.json')).text);assert.equal(JSON.parse(terrainProject.baseLayouts.find(l=>l.id===terrainProject.activeBaseLayoutId).metadata['forge.build-areas.v1'])[0].kind,'terrain');
    await call('undo',{sessionId,expectedRevision:restoredTerrain.revision});assert.deepEqual((await call('inspect_map',{sessionId})).entities,terrainBefore.entities);
    report.steps.push({terrainProtection:true,terrainPreviewPreservesMap:true,rejectedProtectedHeights:true,distantSculptAllowed:true,terrainProtectionUndo:true,exportedTerrainProtection:terrainExport.path});
    await evaluate(`document.querySelector('.build-area-panel').open=false`);
    report.steps.push({authoredCorridors:true,corridorPreviewPreservesMap:true,blockedBendPlacement:true,corridorEditUndo:true,exportedCorridor:corridorExport.path});
    report.steps.push({buildAreas:true,previewPreservesMap:true,blockedPlacement:true,exportedArea:areaExport.path,areaUndo:true});
    await evaluate(`document.querySelector('.district-panel').open=false`);
    report.steps.push({districts:true,selectedCount:2,oneStepUndo:true,translationRotation:true,mirrorXY:true,renameAndReplaceMembers:true,duplicateUniqueIds:true,otherEntitiesPreserved:true,exportedNamedGroup:exported.path});
  }
  if(process.env.WULFRAM_BASE_LIBRARY_TEST==='1'){
    const initial=await call('inspect_map',{sessionId});
    const click=async label=>evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)});if(!b||b.disabled)throw new Error('Unavailable '+${JSON.stringify(label)});b.click();})()`);
    const field=async(label,value)=>evaluate(`(()=>{const e=document.querySelector('[aria-label=${JSON.stringify(label)}]');const proto=e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await click('Browse base library');
    await until(()=>evaluate(`!!document.querySelector('.base-library-dialog')`),'base library');
    const allShot=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,'base-library-all.png'),Buffer.from(allShot.data,'base64'));
    await field('Search base library','no-match-abc');
    await until(()=>evaluate(`document.querySelector('.base-library-dialog').textContent.includes('No designs match')`),'empty library');
    await click('Reset filters');await field('Base library collection','Original');
    await until(()=>evaluate(`document.querySelectorAll('.base-library-card').length>0`),'original templates');
    await evaluate(`document.querySelector('.base-library-card').focus()`);
    for(const type of ['keyDown','keyUp']) await send('Input.dispatchKeyEvent',{type,key:'z',code:'KeyZ',modifiers:2,windowsVirtualKeyCode:90,nativeVirtualKeyCode:90});
    assert.equal((await call('inspect_map',{sessionId})).revision,initial.revision,'Library focus blocks editor Undo shortcuts');
    await evaluate(`document.querySelector('.base-library-card').click()`);
    await click('Preview on current map');
    await until(()=>evaluate(`!document.querySelector('.base-library-dialog')`),'template handoff');
    assert.ok(await evaluate(`document.querySelector('select[aria-label="Base template"]').value.length>0`));
    assert.equal((await call('inspect_map',{sessionId})).revision,initial.revision,'Choosing a template does not place it');
    await click('Browse base library');await until(()=>evaluate(`!!document.querySelector('select[aria-label="Base library collection"]')`),'creative library opened');await field('Base library collection','Creative');await field('Search base library','Iron Anvil');
    await field('Library creative size','small');
    await until(()=>evaluate(`document.querySelectorAll('.base-library-card').length===1`),'filtered creative');
    await evaluate(`document.querySelector('.base-library-card').click()`);
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1.25,mobile:false});
    await until(()=>evaluate(`(()=>{const b=document.querySelector('.base-library-footer .base-library-use'),r=b.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.width>0;})()`),'placement action visible without scrolling');
    assert.ok(await evaluate(`(()=>{const d=document.querySelector('.base-library-dialog');return d.scrollWidth<=d.clientWidth+1;})()`),'Library fits compact high-DPI viewport');
    const shot=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,'base-library-compact.png'),Buffer.from(shot.data,'base64'));
    await click('Preview on current map');
    await until(()=>evaluate(`document.querySelector('select[aria-label="Creative base size"]')?.value==='small'`),'creative size handed off');
    assert.equal(await evaluate(`document.querySelector('select[aria-label="Base template"]').value`),'','Creative choice disarms old template');
    assert.equal((await call('inspect_map',{sessionId})).revision,initial.revision,'Library browsing and handoff preserve map');
    await send('Emulation.clearDeviceMetricsOverride');
    await click('Browse base library');await until(()=>evaluate(`!!document.querySelector('select[aria-label="Base library collection"]')`),'personal library opened');await field('Base library collection','My bases');
    await until(()=>evaluate(`document.querySelector('.base-library-dialog').textContent.includes('No designs match')`),'empty personal collection');
    await click('Close library');
    report.steps.push({baseLibrary:true,emptyResults:true,originalHandoff:true,creativeSizeHandoff:true,compactLayout:true,browsingPreservesMap:true});
  }
  const options=await evaluate('Array.from(document.querySelectorAll(\'select[aria-label="Active base layout"] option\')).map(o=>o.value).filter(v=>v.startsWith("creative:"))');
  assert.deepEqual(options,[...CREATIVE_BASE_LAYOUTS.map(p=>'creative:'+p.id),'creative:offset-bastion','creative:frontier-camp','creative:service-courtyard','creative:broken-ring','creative:valley-pockets','creative:three-lane-anchor']);
  assert.equal(await evaluate(`document.querySelector('select[aria-label="Active base layout"] option[value="creative:broken-ring"]').textContent`),'Broken Ring');
  assert.equal(await evaluate(`document.querySelector('select[aria-label="Active base layout"] option[value="creative:three-lane-anchor"]').textContent`),'Three-Lane Anchor');
  for(const spec of CREATIVE_BASE_LAYOUTS.slice(-5)){
    const before=await call('inspect_map',{sessionId});
    await evaluate(`(()=>{const s=document.querySelector('select[aria-label="Active base layout"]');s.value=${JSON.stringify('creative:'+spec.id)};s.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
    const clickButton=async label=>{const target=`Array.from((document.querySelector('.base-library-dialog')??document).querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(label)}&&!b.disabled)`;await until(()=>evaluate(`!!(${target})`),'enabled '+label);return evaluate(`(()=>{const b=${target};if(!b)throw new Error('Enabled button disappeared');b.click();return true;})()`);};
    await until(()=>evaluate(`!!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Preview formation')`),'preview controls');
    if(spec.id==='workshop')await evaluate(`(()=>{const input=document.querySelector('input[aria-label="Target structures per team"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'12');input.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
    await clickButton('Preview formation');
    await until(()=>evaluate(`!!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Apply formation'&&!b.disabled)`),'valid preview');
    if(spec.id==='workshop'){
      await clickButton('Inspect');
      await until(()=>evaluate(`document.querySelector('select[aria-label="Inspect route"]')?.options.length>0`),'route inspector');
      await evaluate(`(()=>{const i=document.querySelector('input[aria-label="Vehicle clearance width"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'400');i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
      assert.ok(await evaluate(`document.querySelector('[data-route-clearance]').textContent.includes('blocked')`));
      const routeIssue=await evaluate(`(()=>{const b=Array.from(document.querySelector('section[aria-label="Route inspection"]').querySelectorAll('button')).find(b=>b.textContent.includes('clearance near'));if(!b)return false;b.click();return true;})()`);assert.ok(routeIssue,'Clearance warning can be focused');
      const markerShot=await raw('capture_view',{sessionId});await fs.writeFile(path.join(out,'route-clearance-warning.png'),Buffer.from(markerShot.content[0].data,'base64'));
      await evaluate(`(()=>{const i=document.querySelector('input[aria-label="Route progress"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'0');i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
      await clickButton('Follow route');await new Promise(r=>setTimeout(r,800));
      assert.ok(await evaluate(`Number(document.querySelector('input[aria-label="Route progress"]').value)>0`),'Route playback advances');
      await clickButton('Pause route');const paused=await evaluate(`document.querySelector('input[aria-label="Route progress"]').value`);await new Promise(r=>setTimeout(r,250));assert.equal(await evaluate(`document.querySelector('input[aria-label="Route progress"]').value`),paused);
      await clickButton('Follow route');await evaluate(`document.querySelector('.terrain-viewport canvas').focus()`);await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Home',code:'Home'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Home',code:'Home'});
      await until(()=>evaluate(`!!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Follow route')`),'manual camera pauses tour');
      await evaluate(`(()=>{const d=Array.from(document.querySelectorAll('details')).find(d=>d.querySelector('summary')?.textContent==='Display options');d.open=true;})()`);
      for(const label of ['Show display overlays','Route clearance markers','Building area circles','Entrance guides','Inspection power links']){
        await evaluate(`Array.from(document.querySelectorAll('label')).find(l=>l.textContent.trim()===${JSON.stringify(label)}).querySelector('input').click()`);
      }
      const hiddenShot=await raw('capture_view',{sessionId});await fs.writeFile(path.join(out,'display-options-hidden.png'),Buffer.from(hiddenShot.content[0].data,'base64'));
      await clickButton('Reset display options');
      await clickButton('Follow route');
      await evaluate(`Array.from(document.querySelectorAll('label')).find(l=>l.textContent.trim()==='Route inspection controls').querySelector('input').click()`);
      assert.equal(await evaluate(`!!document.querySelector('section[aria-label="Route inspection"]')`),false);
      await evaluate(`Array.from(document.querySelectorAll('label')).find(l=>l.textContent.trim()==='Route inspection controls').querySelector('input').click()`);
      await until(()=>evaluate(`!!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Follow route')`),'tour stays stopped after panel toggle');
      assert.equal(await evaluate(`Number(document.querySelector('input[aria-label="Route progress"]').value)`),0);
      assert.ok(await evaluate(`Array.from(document.querySelectorAll('label')).find(l=>l.textContent.trim()==='Show display overlays').querySelector('input').checked`));
      await evaluate(`(()=>{const i=document.querySelector('input[aria-label="Vehicle clearance width"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'80');i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
      report.steps.push({routePlayback:true,routePause:true,manualCameraPauses:true,clearanceWarningFocus:true,displayOptionsReset:true});
      for(const label of ['Team 1 · Overhead','Team 2 · Overhead','Team 1 · Ground level','Team 2 · Ground level']){
        await clickButton(label);await new Promise(r=>setTimeout(r,300));
        const shot=await raw('capture_view',{sessionId});await fs.writeFile(path.join(out,label.replaceAll(' · ','-').replaceAll(' ','-')+'.png'),Buffer.from(shot.content[0].data,'base64'));
      }
      const inspectedId=await evaluate(`(()=>{const s=document.querySelector('select[aria-label="Inspect building"]');s.value=Array.from(s.options).find(o=>/repair/i.test(o.textContent)).value;s.dispatchEvent(new Event('change',{bubbles:true}));return s.value;})()`);
      assert.ok(await evaluate(`document.querySelector('[data-building-inspection]').textContent.includes('Powered')`));
      await clickButton('Focus building');await new Promise(r=>setTimeout(r,400));
      const focusCapture=await raw('capture_view',{sessionId});await fs.writeFile(path.join(out,'building-power-inspection.png'),Buffer.from(focusCapture.content[0].data,'base64'));
      const pick=await evaluate(`(()=>{const r=document.querySelector('.terrain-viewport canvas').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
      // Clearance markers are separately clickable; isolate the building hit target.
      await evaluate(`[...document.querySelectorAll('label')].find(l=>l.textContent.trim()==='Route clearance markers').querySelector('input').click()`);
      await evaluate(`(()=>{const s=document.querySelector('select[aria-label="Inspect building"]');s.value='';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
      await send('Input.dispatchMouseEvent',{type:'mousePressed',...pick,button:'left',buttons:1,clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...pick,button:'left',buttons:0,clickCount:1});
      assert.equal(await evaluate(`document.querySelector('select[aria-label="Inspect building"]').value`),inspectedId,'Canvas click inspects the focused preview building');
      await evaluate(`[...document.querySelectorAll('label')].find(l=>l.textContent.trim()==='Route clearance markers').querySelector('input').click()`);
      const originalOption=await evaluate(`(()=>{const buttons=[...document.querySelectorAll('fieldset[aria-label="Formation options"] button')];const selected=buttons.findIndex(b=>b.getAttribute('aria-pressed')==='true');const other=buttons.find(b=>b.getAttribute('aria-pressed')!=='true'&&b.textContent.includes('per team · fits'));if(selected<0||!other)throw new Error('Need two valid options for inspection switch');other.click();return selected;})()`);
      assert.equal(await evaluate(`document.querySelector('select[aria-label="Inspect building"]').value`),'','Switching options clears stale inspection');
      await evaluate(`document.querySelectorAll('fieldset[aria-label="Formation options"] button')[${originalOption}].click()`);
      const inspectionState=await call('inspect_map',{sessionId});assert.equal(inspectionState.revision,before.revision);assert.deepEqual(inspectionState.entities,before.entities);
      await evaluate(`Array.from(document.querySelectorAll('label')).find(l=>l.textContent.includes('Inspect buildings (')).querySelector('input').click()`);
      await evaluate(`document.querySelector('.terrain-viewport canvas').focus()`);await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Home',code:'Home'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Home',code:'Home'});
      await new Promise(r=>setTimeout(r,500));
      report.steps.push({fourFocusViews:true,poweredInspection:true,canvasInspection:true,inspectionPreservesSource:true,staleInspectionCleared:true});
      const original=await evaluate(`['X','Y'].map(a=>document.querySelector('input[aria-label="Base center '+a+'"]').value)`);
      const rect=await evaluate(`(()=>{const r=document.querySelector('.terrain-viewport canvas').getBoundingClientRect();return {x:r.x+r.width*.5,y:r.y+r.height*.65};})()`);
      await send('Input.dispatchMouseEvent',{type:'mousePressed',...rect,button:'left',buttons:1,clickCount:1});
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:rect.x+45,y:rect.y+20,button:'left',buttons:1});
      await new Promise(r=>setTimeout(r,250));
      assert.notDeepEqual(await evaluate(`['X','Y'].map(a=>document.querySelector('input[aria-label="Base center '+a+'"]').value)`),original,'Dragging changes the base center');
      assert.ok(await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Apply formation').disabled`),'Dragging invalidates Apply');
      await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:rect.x+45,y:rect.y+20,button:'left',buttons:0,clickCount:1});
      await evaluate(`Array.from(document.querySelectorAll('label')).find(l=>l.textContent.includes('Adapt powered yards')).querySelector('input').click()`);
      await evaluate(`(()=>{const i=document.querySelector('input[aria-label="Base center X"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'0');i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
      await clickButton('Preview formation');
      await until(()=>evaluate(`Array.from(document.querySelectorAll('[role="alert"]')).some(e=>e.textContent.includes('cannot fit'))`),'rejected placement explanation');
      const rejected=await raw('capture_view',{sessionId});await fs.writeFile(path.join(out,'rejected-edge.png'),Buffer.from(rejected.content[0].data,'base64'));
      for(const [index,axis] of ['X','Y'].entries())await evaluate(`(()=>{const i=document.querySelector('input[aria-label="Base center ${axis}"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,${JSON.stringify(original[index])});i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
      await evaluate(`Array.from(document.querySelectorAll('label')).find(l=>l.textContent.includes('Adapt powered yards')).querySelector('input').click()`);
      await evaluate(`Array.from(document.querySelectorAll('label')).find(l=>l.textContent.includes('Reserve a main entrance')).querySelector('input').click()`);
      await clickButton('Preview formation');
      await until(()=>evaluate(`!!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Apply formation'&&!b.disabled)`),'restored valid placement');
      assert.equal(await evaluate(`document.querySelectorAll('fieldset[aria-label="Formation options"] button').length`),3);
      for(const index of [1,2,0]){
        await evaluate(`document.querySelectorAll('fieldset[aria-label="Formation options"] button')[${index}].click()`);
        assert.ok(await evaluate(`document.querySelectorAll('fieldset[aria-label="Formation options"] button')[${index}].getAttribute('aria-pressed')==='true'`));
      }
      report.steps.push({threeOptionsSelectable:true,entranceReserved:true});
      report.steps.push({dragMovedCenter:true,dragInvalidatedApply:true,rejectedPlacementExplained:true});
    }
    const previewState=await call('inspect_map',{sessionId});assert.deepEqual(previewState.entities,before.entities);assert.equal(previewState.revision,before.revision);
    await new Promise(r=>setTimeout(r,500));
    const previewCapture=await raw('capture_view',{sessionId});await fs.writeFile(path.join(out,spec.id+'-preview.png'),Buffer.from(previewCapture.content[0].data,'base64'));
    await clickButton('Apply formation');
    const state=await until(async()=>{const s=await call('inspect_map',{sessionId});return s.revision!==before.revision?s:false;},spec.name);
    if(spec.id==='workshop'){
      assert.equal(state.entities.length,24);
      await clickButton('Save active formation as favorite');
      assert.equal(await evaluate(`JSON.parse(localStorage.getItem('forge-formation-favorites-v1')).length`),1);
      if(process.env.WULFRAM_BASE_LIBRARY_TEST==='1'){
        await clickButton('Browse base library');
        await until(()=>evaluate(`!!document.querySelector('select[aria-label="Base library collection"]')`),'favorites library opened');
        await evaluate(`(()=>{const s=document.querySelector('select[aria-label="Base library collection"]');s.value='My bases';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
        await until(()=>evaluate(`document.querySelectorAll('.base-library-card').length===1`),'saved base in library');
        await evaluate(`document.querySelector('.base-library-card').click()`);
        assert.ok(await evaluate(`document.querySelector('.base-library-detail').textContent.includes('saved mirrored pair')`));
        if(process.env.WULFRAM_PORTABLE_LIBRARY_TEST==='1'){
          await evaluate(`document.querySelector('.personal-base-library').open=true`);
          const downloads=path.join(out,'library-downloads');await fs.mkdir(downloads);
          await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
          await clickButton('Export My bases');
          const exported=await until(async()=>{const names=await fs.readdir(downloads);return names.find(n=>n.endsWith('.json'));},'portable library download');
          const exportPath=path.join(downloads,exported), exportedData=JSON.parse(await fs.readFile(exportPath));
          assert.equal(exportedData.format,'wulfram-base-library');assert.equal(exportedData.version,1);assert.equal(exportedData.bases.length,1);
          const setField=async(label,value)=>evaluate(`(()=>{const e=document.querySelector('[aria-label=${JSON.stringify(label)}]');const p=e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
          await setField('Manage saved base',exportedData.bases[0].id);await setField('Saved base name','Portable Workshop');
          await clickButton('Rename saved base');
          await until(()=>evaluate(`JSON.parse(localStorage.getItem('forge-formation-favorites-v1'))[0].name==='Portable Workshop'`),'rename persisted');
          await clickButton('Remove saved base');
          assert.equal(await evaluate(`JSON.parse(localStorage.getItem('forge-formation-favorites-v1')).length`),0);
          await clickButton('Undo library change');
          assert.equal(await evaluate(`JSON.parse(localStorage.getItem('forge-formation-favorites-v1'))[0].name`),'Portable Workshop');
          const importFile=async file=>{const doc=await send('DOM.getDocument'),node=await send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'input[aria-label="Import personal base library file"]'});await send('DOM.setFileInputFiles',{nodeId:node.nodeId,files:[file]});};
          await importFile(exportPath);
          await until(()=>evaluate(`document.querySelector('.personal-base-import')?.textContent.includes('1 new')`),'import preview');
          assert.equal(await evaluate(`JSON.parse(localStorage.getItem('forge-formation-favorites-v1')).length`),1,'Preview leaves library unchanged');
          await clickButton('Cancel library import');await importFile(exportPath);
          await clickButton('Apply library import');
          assert.equal(await evaluate(`JSON.parse(localStorage.getItem('forge-formation-favorites-v1')).length`),2);
          await importFile(exportPath);
          await until(()=>evaluate(`document.querySelector('.personal-base-import')?.textContent.includes('0 new')`),'repeat import skips identical entry');
          assert.ok(await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Apply library import').disabled`));
          await clickButton('Cancel library import');
          const bad=path.join(out,'invalid-library.json');await fs.writeFile(bad,JSON.stringify({format:'wulfram-base-library',version:999,bases:[]}));await importFile(bad);
          await until(()=>evaluate(`document.querySelector('.personal-base-library').textContent.includes('Unsupported base library')`),'bad version explanation');
          assert.equal(await evaluate(`JSON.parse(localStorage.getItem('forge-formation-favorites-v1')).length`),2);
          const libraryShot=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,'portable-library-manager.png'),Buffer.from(libraryShot.data,'base64'));
          const unchanged=await call('inspect_map',{sessionId});assert.equal(unchanged.revision,state.revision);assert.deepEqual(unchanged.entities,state.entities);
          report.steps.push({portableLibrary:true,exported:exportPath,renameDeleteUndo:true,importPreviewCancel:true,conflictPreserved:true,duplicateSkipped:true,invalidVersionPreservedLibrary:true,mapUnchanged:true});
        }
        await clickButton('Close library');
        report.steps.push({savedBaseVisibleInLibrary:true});
      }
    }
    assert.equal(state.undoCount,before.undoCount+1);
    const validation=await call('validate_map',{sessionId});assert.equal(validation.issues.filter(i=>i.severity==='error').length,0);
    const saved=await call('save_copy',{sessionId,expectedRevision:state.revision,name:'critic-'+spec.id+'-'+Date.now()});
    const snapshot=JSON.parse(await fs.readFile(saved.path));
    const labelVisible=await evaluate(`(()=>{const p=Array.from(document.querySelectorAll('.field-help')).find(e=>e.textContent.includes(${JSON.stringify(spec.description)}));return !!p && p.scrollWidth<=p.clientWidth+1;})()`);
    assert.ok(labelVisible,'Full formation name and description must fit the sidebar');
    assert.deepEqual(snapshot.terrain,baseline.terrain);assert.equal(snapshot.baseLayouts.length,6);
    assert.equal(JSON.parse(snapshot.baseLayouts.find(l=>l.id===snapshot.activeBaseLayoutId).metadata['formation.access']).passed,true);
    assert.deepEqual(snapshot.baseLayouts.slice(0,5),baseline.baseLayouts);
    const exported=await call('export_map',{sessionId,expectedRevision:state.revision,name:'critic-export-'+spec.id+'-'+Date.now()});
    const entries=await readMapArchive(await fs.readFile(exported.path));const reopened=JSON.parse(entries.find(e=>e.name.endsWith('/wulfram-project.json')).text);assert.deepEqual(reopened.baseLayouts,snapshot.baseLayouts);
    await evaluate(`document.querySelector('.terrain-viewport canvas').focus()`);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Home',code:'Home'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Home',code:'Home'});
    for(const code of ['KeyW','KeyA'])await send('Input.dispatchKeyEvent',{type:'keyDown',key:code.slice(-1).toLowerCase(),code});
    await new Promise(r=>setTimeout(r,420));
    for(const code of ['KeyW','KeyA'])await send('Input.dispatchKeyEvent',{type:'keyUp',key:code.slice(-1).toLowerCase(),code});
    for(const code of ['KeyQ','ArrowUp'])await send('Input.dispatchKeyEvent',{type:'keyDown',key:code==='KeyQ'?'q':'ArrowUp',code});
    await new Promise(r=>setTimeout(r,650));
    for(const code of ['KeyQ','ArrowUp'])await send('Input.dispatchKeyEvent',{type:'keyUp',key:code==='KeyQ'?'q':'ArrowUp',code});
    await new Promise(r=>setTimeout(r,350));
    const capture=await raw('capture_view',{sessionId});assert.equal(capture.content[0].type,'image',JSON.stringify(capture));await fs.writeFile(path.join(out,spec.id+'.png'),Buffer.from(capture.content[0].data,'base64'));
    await call('undo',{sessionId,expectedRevision:state.revision});const restored=await call('inspect_map',{sessionId});assert.deepEqual(restored.entities,before.entities);
    report.steps.push({style:spec.id,passed:true,entities:state.entities.length,screenshot:spec.id+'.png',exported:exported.path,preservedExistingLayouts:true,oneStepUndo:true});
  }
  const unpowered=structuredClone(baseline);unpowered.name='Power icon failure fixture';unpowered.entities=unpowered.entities.filter(e=>e.token!=='e');
  unpowered.baseLayouts=[];
  const badFile=path.join(out,'unpowered.json');await fs.writeFile(badFile,JSON.stringify(unpowered));
  const nextDom=await send('DOM.getDocument'),nextInput=await send('DOM.querySelector',{nodeId:nextDom.root.nodeId,selector:'input[type="file"][multiple]'});
  await send('DOM.setFileInputFiles',{nodeId:nextInput.nodeId,files:[badFile]});
  const badSession=await until(async()=>{const r=await call('list_editor_sessions');return r.sessions.find(s=>s.ready&&s.name===unpowered.name);},'unpowered test fixture');
  await new Promise(r=>setTimeout(r,800));
  const badValidation=await call('validate_map',{sessionId:badSession.sessionId});assert.ok(badValidation.issues.some(i=>i.code==='power'));
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Team 1 · Overhead').click()`);
  await evaluate(`(()=>{const s=document.querySelector('select[aria-label="Inspect building"]');s.value=Array.from(s.options).find(o=>/repair/i.test(o.textContent)).value;s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  assert.ok(await evaluate(`document.querySelector('[data-building-inspection]').textContent.includes('No friendly power in range')`));
  report.steps.push({unpoweredBuildingInspection:true});
  const badCapture=await raw('capture_view',{sessionId:badSession.sessionId});await fs.writeFile(path.join(out,'unpowered-icons.png'),Buffer.from(badCapture.content[0].data,'base64'));
  await send('Page.reload');
  await until(()=>evaluate(`document.querySelector('select[aria-label="Formation favorites"]')?.options.length===${process.env.WULFRAM_PORTABLE_LIBRARY_TEST==='1'?3:2}`),'favorites survive reload');
  await evaluate(`(()=>{const s=document.querySelector('select[aria-label="Formation favorites"]');s.value=s.options[1].value;s.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
  await until(()=>evaluate(`!!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Preview formation')`),'favorite preview');
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Preview formation').click()`);
  await until(()=>evaluate(`!!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Apply formation'&&!b.disabled)`),'favorite fits new map');
  await evaluate(`(()=>{for(const label of document.querySelectorAll('label')){if(label.textContent.includes('Estimated Darklight')||label.textContent.includes('Estimated turret')){const c=label.querySelector('input');if(c&&!c.checked)c.click();}}return true;})()`);
  const favoriteSession=await until(async()=>{const r=await call('list_editor_sessions');return r.sessions.find(s=>s.ready);},'reloaded editor session');
  await new Promise(r=>setTimeout(r,600));
  const favoriteCapture=await raw('capture_view',{sessionId:favoriteSession.sessionId});await fs.writeFile(path.join(out,'favorite-coverage.png'),Buffer.from(favoriteCapture.content[0].data,'base64'));
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Apply formation').click()`);
  const favoriteApplied=await until(async()=>{const s=await call('inspect_map',{sessionId:favoriteSession.sessionId});return s.entities.length===24?s:false;},'favorite applied');
  assert.equal(favoriteApplied.entities.length,24);
  report.steps.push({name:'Exact count, persistent favorite, transplant and estimated overlays',passed:true});
  await evaluate(`(()=>{for(const label of document.querySelectorAll('label')){if(['Estimated Darklight','Estimated turret','Power status icons'].some(text=>label.textContent.includes(text))){const c=label.querySelector('input');if(c?.checked)c.click();}}})()`);
  for(const terrain of ['valley','hills','mounds']){
    const doc=await send('DOM.getDocument'),fileInput=await send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'input[type="file"][multiple]'});
    await send('DOM.setFileInputFiles',{nodeId:fileInput.nodeId,files:[path.join(root,'outputs/creative-terrain-v7-trials',terrain+'.zip')]});
    const trialSession=await until(async()=>{const r=await call('list_editor_sessions');return r.sessions.find(s=>s.ready&&s.name==='Terrain trial '+terrain);},terrain+' import');
    const trialBefore=await call('inspect_map',{sessionId:trialSession.sessionId});
    await evaluate(`(()=>{const s=document.querySelector('select[aria-label="Active base layout"]');s.value='creative:anvil';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    for(const size of ['small','massive']){
      await evaluate(`(()=>{const s=document.querySelector('select[aria-label="Creative base size"]');s.value=${JSON.stringify(size)};s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
      for(const [label,value] of [['Building area radius',2300],['Base center X',2800]])await evaluate(`(()=>{const i=document.querySelector('input[aria-label=${JSON.stringify(label)}]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,${JSON.stringify(String(value))});i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
      if(size==='small'&&terrain!=='mounds')await evaluate(`Array.from(document.querySelectorAll('label')).find(l=>l.textContent.includes('Reserve a main entrance')).querySelector('input').click()`);
      await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Preview formation').click()`);
      await until(()=>evaluate(`document.querySelectorAll('fieldset[aria-label="Formation options"] button').length===3`),'terrain choices');
      assert.equal(await evaluate(`Array.from(document.querySelectorAll('fieldset[aria-label="Formation options"] button')).filter(b=>b.textContent.includes('does not fit')).length`),0);
      assert.ok(await evaluate(`document.body.textContent.includes('This preview uses 280 u')`),'Preview radius is labeled separately from saved rules');
      await evaluate(`document.querySelector('fieldset[aria-label="Formation options"]').scrollIntoView({block:'center'})`);
      for(const index of [0,1,2]){
        await evaluate(`document.querySelectorAll('fieldset[aria-label="Formation options"] button')[${index}].click()`);
        await new Promise(r=>setTimeout(r,200));
        const shot=await raw('capture_view',{sessionId:trialSession.sessionId});await fs.writeFile(path.join(out,`${terrain}-${size}-option-${index+1}.png`),Buffer.from(shot.content[0].data,'base64'));
      }
      const afterPreview=await call('inspect_map',{sessionId:trialSession.sessionId});assert.equal(afterPreview.revision,trialBefore.revision);assert.deepEqual(afterPreview.entities,trialBefore.entities);
      report.steps.push({terrain,size,threeOptionsPassed:true,previewPreservedSource:true});
    }
    await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Apply formation').click()`);
    const applied=await until(async()=>{const s=await call('inspect_map',{sessionId:trialSession.sessionId});return s.revision!==trialBefore.revision?s:false;},'terrain apply');
    const saved=await call('save_copy',{sessionId:trialSession.sessionId,expectedRevision:applied.revision,name:'terrain-option-three-'+terrain+'-'+Date.now()});
    const p=JSON.parse(await fs.readFile(saved.path));assert.equal(p.baseLayouts.length,7);assert.ok(p.baseLayouts.find(l=>l.id===p.activeBaseLayoutId).metadata['formation.candidateSeed'].includes(':option-2:'));
    await call('undo',{sessionId:trialSession.sessionId,expectedRevision:applied.revision});assert.deepEqual((await call('inspect_map',{sessionId:trialSession.sessionId})).entities,trialBefore.entities);
  }
  if(process.env.WULFRAM_PORTABLE_LIBRARY_TEST==='1'){
    await send('Page.reload');
    await until(()=>evaluate(`!!document.querySelector('.top-actions')&&!!window.wulframMcp`),'editor reload');
    await until(()=>evaluate(`!![...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Browse base library')`),'reloaded base tools');
    await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Browse base library').click()`);
    await until(()=>evaluate(`document.querySelector('.personal-base-library')?.textContent.includes('2/50')`),'personal library survives reload');
    report.steps.push({portableLibraryReload:true});
  }
  if(relationshipRoundTrip){
    const doc=await send('DOM.getDocument'),input=await send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'input[type="file"][multiple]'});await send('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[relationshipRoundTrip.path]});
    const reopened=await until(async()=>{const p=await call('inspect_map',{sessionId});return JSON.stringify(p.entities)===JSON.stringify(relationshipRoundTrip.entities)?p:false;},'relationship export reopened with applied entities');
    await until(()=>evaluate(`!!document.querySelector('button[aria-label="Edit relationship Supply separation"]')`),'reopened relationship controls');
    const rejected=await evaluate(`(()=>{try{window.wulframMcp.dispatch(${JSON.stringify({action:'edit_entities',expectedRevision:reopened.revision,edits:[{operation:'remove',id:relationshipRoundTrip.memberId}]})});return '';}catch(e){return e.message;}})()`);assert.match(rejected,/Supply separation.*missing/);assert.equal((await call('inspect_map',{sessionId})).revision,reopened.revision);
    report.steps.push({relationshipExportReopen:true,reopenedConstraintEnforced:true});
  }
  for(const input of inputHashes)assert.equal(await sha(input.path),input.sha256,'Creative acceptance input changed during execution');
  report.passed=true;
}catch(e){report.error=e.stack;process.exitCode=1;if(diagnoseFailure)report.failureProbes=await diagnoseFailure();}
finally{if(client)await client.close();if(socket)socket.close();if(app)app.kill();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}

