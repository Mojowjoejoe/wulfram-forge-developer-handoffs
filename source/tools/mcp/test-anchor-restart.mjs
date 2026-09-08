import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {createBlankProject,catalogFor,structureTerrainClearance,snapStructureToTerrain} from '../../lib/wulfram.ts';
import {BUILD_AREAS_KEY} from '../../lib/build-areas.ts';
import {ENTRANCE_ROUTING_KEY} from '../../lib/entrance-routing.ts';
const exe=path.resolve(process.argv[2]);
if(process.argv.includes('--authored-library')&&!process.argv.includes('--authored'))throw new Error('--authored-library requires --authored');
if(process.argv.some(arg=>arg.startsWith('--variation-dir='))&&!process.argv.includes('--visual'))throw new Error('--variation-dir requires --visual');
const out=await fs.mkdtemp(path.resolve('outputs/anchor-restart-native-'));
const sha=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
const report={passed:false,out,executable:exe,executableSha256:await sha(exe),checks:{},rendererErrors:[]};
const sessions=path.join(out,'sessions'),profile=path.join(out,'profile');
const listener=net.createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));
let app,socket,client;let sequence=0;const pending=new Map();
const probe=async(fn,label)=>{const end=Date.now()+45000;while(Date.now()<end){try{const v=await fn();if(v)return v;}catch{}await new Promise(r=>setTimeout(r,150));}throw new Error('Timeout: '+label);};
try{
 app=spawn(exe,[],{windowsHide:true,stdio:'ignore',env:{...process.env,WULFRAM_FORGE_MCP:'1',WULFRAM_MCP_SESSION_DIR:sessions,WULFRAM_FORGE_USER_DATA_DIR:profile,WULFRAM_FORGE_REMOTE_DEBUGGING_PORT:String(port)}});
 const target=await probe(async()=>{const pages=await fetch(`http://127.0.0.1:${port}/json`).then(r=>r.json());return pages.find(p=>p.url==='https://wulfram-forge.local/index.html');},'editor');
 socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
 socket.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(m.method==='Runtime.exceptionThrown')report.rendererErrors.push(m.params.exceptionDetails.text);if(p){clearTimeout(p.timer);pending.delete(m.id);if(m.error)p.reject(new Error(m.error.message));else p.resolve(m.result);}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout '+method));},15000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
 await send('Runtime.enable');
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 await probe(()=>evaluate(`!!window.wulframMcp&&document.readyState==='complete'&&!!document.querySelector('input[type="file"][multiple]')`),'ready');
 const transport=new StdioClientTransport({command:process.execPath,args:['--experimental-strip-types',path.resolve('tools/mcp/MapEditerMCP/server.mjs')],env:{...process.env,WULFRAM_MCP_SESSION_DIR:sessions},stderr:'pipe'});client=new Client({name:'multi-entrance-native',version:'1'});await client.connect(transport);
 const raw=(name,args={})=>client.callTool({name,arguments:args});
 const call=async(name,args={})=>{const r=await raw(name,args);if(r.isError)throw new Error(r.content.map(c=>c.text??'').join(''));return JSON.parse(r.content.find(c=>c.type==='text').text);};
 let sessionId;
 const importFile=async(file,name)=>{
  await probe(()=>evaluate(`!!document.querySelector('input[type="file"][multiple]')`),'import input');
  const {root}=await send('DOM.getDocument'),{nodeId}=await send('DOM.querySelector',{nodeId:root.nodeId,selector:'input[type="file"][multiple]'});assert.ok(nodeId);await send('DOM.setFileInputFiles',{nodeId,files:[file]});
  const session=await probe(async()=>{const r=await call('list_editor_sessions');return r.sessions.find(s=>s.ready&&s.name===name);},name);sessionId=session.sessionId;
 };
 const state=()=>call('get_editor_state',{sessionId});
 const snapshot=async label=>{const s=await state(),copy=await call('save_copy',{sessionId,expectedRevision:s.revision,name:`multi-${label}-${Date.now()}`});return JSON.parse(await fs.readFile(copy.path,'utf8'));};
 const history=async before=>{const after=await state();for(const k of ['revision','undoCount','redoCount','dirty'])assert.equal(after[k],before[k]);};
 const click=async(label,scope='document')=>{await probe(()=>evaluate(`!![...${scope}.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}&&!b.disabled)`),label);await evaluate(`[...${scope}.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}&&!b.disabled).click()`);};
 const rules=async()=>{await click('Base builder');await click('Rules');};
 const fixturePath=path.resolve('outputs/three-lane-anchor-native-source.json'),fixture=JSON.parse(await fs.readFile(fixturePath,'utf8'));report.fixture={path:fixturePath,sha256:await sha(fixturePath)};
 await importFile(fixturePath,fixture.name);const before=await state();
 if(process.argv.includes('--library')){
  await click('Base builder');await click('Browse base library');
  const select=async(label,value)=>evaluate(`(()=>{const e=document.querySelector('select[aria-label='+JSON.stringify(${JSON.stringify(label)})+']');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await select('Base library collection',process.argv.includes('--admitted')?'Creative':'Experimental');
  await evaluate(`(()=>{const e=document.querySelector('[aria-label="Search base library"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'Three-Lane Anchor');e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await probe(()=>evaluate(`!!document.querySelector('button[aria-label="Details: Three-Lane Anchor"]')`),'Anchor library card');
  await evaluate(`document.querySelector('button[aria-label="Details: Three-Lane Anchor"]').click()`);
  report.library=[];
  for(const [i,size] of ['small','standard','large','massive'].entries()){
   await select('Library creative size',size);await probe(()=>evaluate(`document.querySelector('.base-library-detail')?.textContent.includes('${[15,21,30,42][i]} total')`),`Anchor ${size} count`);
   assert.ok(await evaluate(`document.querySelector('.base-library-detail svg')?.getBoundingClientRect().width>0`));
   assert.equal(await evaluate(`document.querySelectorAll('.base-library-detail svg polyline').length`),8);
   await evaluate(`Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getTiming().iterations)).map(a=>a.finished.catch(()=>{})))`);
   const shot=await send('Page.captureScreenshot',{format:'png'}),file=path.join(out,`library-${size}.png`);await fs.writeFile(file,Buffer.from(shot.data,'base64'));report.library.push({size,count:[15,21,30,42][i],screenshot:file});
  }
  await select('Library terrain handling','adaptive');assert.equal(await evaluate(`!!document.querySelector('button[aria-label="Details: Three-Lane Anchor"]')`),false);
  await select('Library terrain handling','fixed');await probe(()=>evaluate(`!!document.querySelector('button[aria-label="Details: Three-Lane Anchor"]')`),'fixed Anchor card');
  await evaluate(`document.querySelector('button[aria-label="Details: Three-Lane Anchor"]').click()`);await select('Library creative size','large');
  await click('Preview on current map');await probe(()=>evaluate(`document.body.textContent.includes('Pad access and exit checks required')`),'Anchor placement handoff');await history(before);assert.deepEqual(await snapshot('library-handoff'),fixture);
  if(process.argv.includes('--expanded')){
   await evaluate(`(()=>{const e=document.querySelector('input[aria-label="Target structures per team"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'39');e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
   await click('Preview formation');await probe(()=>evaluate(`!![...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Apply formation'&&!b.disabled)`),'expanded GUI preview');await history(before);assert.deepEqual(await snapshot('expanded-gui-preview'),fixture);
   await click('Apply formation');const applied=await state(),candidate=await snapshot('expanded-gui-applied');assert.equal(candidate.entities.length,78);assert.equal(candidate.baseLayouts.at(-1).metadata['formation.version'],'three-lane-anchor-v2');assert.equal(applied.undoCount,before.undoCount+1);await call('undo',{sessionId,expectedRevision:applied.revision});assert.deepEqual(await snapshot('expanded-gui-undo'),fixture);report.expandedGui={targetCount:39,total:78,previewApplyUndo:true};
  }else{await click('Cancel preview');await history(before);assert.deepEqual(await snapshot('library-cancel'),fixture);}
 }
 const request={activeLayoutId:fixture.activeBaseLayoutId,layoutId:'anchor-restart',style:'three-lane-anchor',seed:'anchor-restart',placement:{size:'large',x:4000,y:6000,rotation:35,radius:3300,targetCount:process.argv.includes('--expanded')?39:0}};
 await call('generate_base_layout',{sessionId,expectedRevision:(await state()).revision,previewOnly:false,request});
 const saved=await snapshot('before-restart'),savedPath=path.join(out,'applied.json');await fs.writeFile(savedPath,JSON.stringify(saved));report.saved={path:savedPath,sha256:await sha(savedPath)};
 const routes=await call('inspect_routes',{sessionId,vehicleWidth:80});assert.equal(routes.routes.filter(r=>r.kind==='service').length,12);
 const firstPid=app.pid,oldSession=sessionId,onMessage=socket.onmessage;socket.close();await new Promise(resolve=>{app.once('exit',resolve);app.kill();});
 app=spawn(exe,[],{windowsHide:true,stdio:'ignore',env:{...process.env,WULFRAM_FORGE_MCP:'1',WULFRAM_MCP_SESSION_DIR:sessions,WULFRAM_FORGE_USER_DATA_DIR:profile,WULFRAM_FORGE_REMOTE_DEBUGGING_PORT:String(port)}});assert.notEqual(app.pid,firstPid);
 const restarted=await probe(async()=>{const pages=await fetch(`http://127.0.0.1:${port}/json`).then(r=>r.json());return pages.find(p=>p.url==='https://wulfram-forge.local/index.html');},'restarted editor');
 socket=new WebSocket(restarted.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});socket.onmessage=onMessage;await send('Runtime.enable');
 await probe(()=>evaluate(`!!window.wulframMcp&&document.readyState==='complete'&&!!document.querySelector('input[type="file"][multiple]')`),'restarted ready');
 await importFile(savedPath,saved.name);assert.notEqual(sessionId,oldSession);assert.deepEqual(await snapshot('after-restart'),saved);
 const restoredRoutes=await call('inspect_routes',{sessionId,vehicleWidth:80});assert.deepEqual(restoredRoutes.routes,routes.routes);assert.equal(restoredRoutes.error,routes.error);
 await rules();assert.equal(await evaluate(`document.querySelectorAll('.multiple-entrances-panel fieldset').length`),6);
 const shot=await send('Page.captureScreenshot',{format:'png'});report.screenshot=path.join(out,'reopened.png');await fs.writeFile(report.screenshot,Buffer.from(shot.data,'base64'));
 const viewport=await evaluate(`(()=>{const r=document.querySelector('canvas[aria-label^="Interactive 3D"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
 for(let i=0;i<3;i++){await send('Input.dispatchMouseEvent',{type:'mouseWheel',x:viewport.x,y:viewport.y,deltaX:0,deltaY:-300});await new Promise(r=>setTimeout(r,200));}
 const detail=await send('Page.captureScreenshot',{format:'png'});report.detailScreenshot=path.join(out,'reopened-detail.png');await fs.writeFile(report.detailScreenshot,Buffer.from(detail.data,'base64'));assert.deepEqual(await snapshot('after-camera'),saved);
 report.processes={firstPid,restartedPid:app.pid};report.checks={freshProcessFileReopen:true,fullMapEquality:true,allRoutesEquality:true,sixGuiRows:true};
 if(process.argv.includes('--visual')){
  const prior=await state();await evaluate(`document.querySelector('.shared-display-options').open=true`);
  for(const label of ['Power status icons','Power tint','Terrain grid'])await evaluate(`(()=>{const l=[...document.querySelectorAll('.shared-display-options label')].find(l=>l.textContent.trim()===${JSON.stringify(label)}),e=l?.querySelector('input');if(e?.checked)e.click();})()`);
  await click('Inspect');report.visual=[];
  const capture=async name=>{await new Promise(r=>setTimeout(r,700));const shot=await send('Page.captureScreenshot',{format:'png'}),file=path.join(out,`${name}.png`);await fs.writeFile(file,Buffer.from(shot.data,'base64'));report.visual.push({name,path:file,sha256:await sha(file)});};
  for(const team of [1,2]){
   for(const view of ['Overhead','Ground level']){await click(`Team ${team} · ${view}`);await capture(`team-${team}-${view.toLowerCase().replaceAll(' ','-')}`);}
   for(const token of ['e','r','f','g','s','L','u','d']){
    const entity=saved.entities.find(e=>e.team===team&&e.token===token);if(!entity)continue;
    await evaluate(`(()=>{const e=document.querySelector('select[aria-label="Inspect building"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(entity.id)});e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await click('Close building view');await capture(`team-${team}-building-${token}`);
   }
  }
  await history(prior);assert.deepEqual(await snapshot('after-visual'),saved);
  const variationDir=process.argv.find(arg=>arg.startsWith('--variation-dir='))?.slice('--variation-dir='.length);
  if(variationDir){
   report.visualVariations=[];
   for(const size of ['small','standard','large','massive'])for(const index of [0,2]){
    const sourceFile=path.resolve(variationDir,`flat-${size}-${index}-expanded.json`),candidate=JSON.parse(await fs.readFile(sourceFile,'utf8'));
    // Retain source evidence; use a separate named copy with quiet original textures for visual comparison.
    candidate.name=`Anchor visual ${size} seed ${index}`;candidate.terrain.tagmap=structuredClone(fixture.terrain.tagmap);candidate.terrain.tagmap2=structuredClone(fixture.terrain.tagmap2);
    const file=path.join(out,`visual-${size}-${index}.json`);await fs.writeFile(file,JSON.stringify(candidate));await importFile(file,candidate.name);
    // Different candidates share their fixture name; require the exact active layout too.
    await probe(async()=> (await call('inspect_map',{sessionId})).activeBaseLayoutId===candidate.activeBaseLayoutId,'variation active layout');
    assert.deepEqual(await snapshot('variation-import'),candidate);const prior=await state();await click('Base builder');await click('Inspect');
    for(const team of [1,2]){await click(`Team ${team} · Overhead`);await capture(`variation-${size}-${index}-team-${team}`);}
    await history(prior);assert.deepEqual(await snapshot('variation-camera'),candidate);report.visualVariations.push({size,seed:`variation-${index}`,sourcePath:sourceFile,sourceSha256:await sha(sourceFile),path:file,sha256:await sha(file),visualChanges:'Name and texture tag tables only; geometry unchanged',mapHistoryUnchanged:true});
   }
  }
 }
 if(process.argv.includes('--authored')){
  const captureBefore=await state(),sourceLayout=saved.baseLayouts.find(l=>l.id===saved.activeBaseLayoutId);
  const captured=await call('capture_authored_base',{sessionId,expectedRevision:captureBefore.revision,activeLayoutId:saved.activeBaseLayoutId,sourceFrame:{origin:[4000,6000,0],yaw:0}});
  await history(captureBefore);assert.deepEqual(await snapshot('authored-capture'),saved);
  const pack=JSON.parse(captured.packageJson);assert.equal(pack.version,2);assert.deepEqual(pack.entranceRouting,JSON.parse(sourceLayout.metadata[ENTRANCE_ROUTING_KEY]));
  const packagePath=path.join(out,'authored-base.json');await fs.writeFile(packagePath,captured.packageJson);
  let libraryEvidence;
  if(process.argv.includes('--authored-library')){
   const args={sessionId,expectedRevision:captureBefore.revision},initial=await call('inspect_authored_library',args);assert.equal(initial.raw,null);
   const entry={id:'expanded-anchor',name:'Expanded Three-Lane Anchor',base:pack};
   const stored=await call('edit_authored_library',{...args,expectedLibraryRaw:initial.raw,libraryEditJson:JSON.stringify({operation:'save',entry})});
   const exported=(await call('inspect_authored_library',args)).library;assert.deepEqual(exported.entries,[entry]);
   const exportPath=path.join(out,'authored-library.json');await fs.writeFile(exportPath,JSON.stringify(exported));
   const removed=await call('edit_authored_library',{...args,expectedLibraryRaw:stored.raw,libraryEditJson:JSON.stringify({operation:'remove',id:entry.id})});assert.equal(removed.after.entries.length,0);
   const edit={operation:'import',library:JSON.parse(await fs.readFile(exportPath,'utf8'))};
   const preview=await call('edit_authored_library',{...args,expectedLibraryRaw:removed.raw,previewOnly:true,libraryEditJson:JSON.stringify(edit)});assert.deepEqual(preview.library.entries,[entry]);assert.equal((await call('inspect_authored_library',args)).raw,removed.raw);
   const restored=await call('edit_authored_library',{...args,expectedLibraryRaw:removed.raw,libraryEditJson:JSON.stringify(edit)});assert.deepEqual(restored.after.entries,[entry]);
   captured.packageJson=JSON.stringify((await call('inspect_authored_library',args)).library.entries[0].base);
   assert.deepEqual(JSON.parse(captured.packageJson),pack);await history(captureBefore);assert.deepEqual(await snapshot('after-library'),saved);
   libraryEvidence={exportPath,exportSha256:await sha(exportPath),exportRemovePreviewImport:true,mapHistoryUnchanged:true,expectedLibrary:restored.after};
  }
  const destination=structuredClone(fixture);destination.name='Anchor expanded authored destination';destination.terrain.worldWidth=18000;destination.terrain.worldHeight=14000;
  const destinationPath=path.join(out,'authored-destination.json');await fs.writeFile(destinationPath,JSON.stringify(destination));await importFile(destinationPath,destination.name);assert.deepEqual(await snapshot('authored-destination'),destination);
  const prior=await state(),authoredRequest={activeLayoutId:destination.activeBaseLayoutId,layoutId:'anchor-authored-reuse',frame:{origin:[4500,6500,0],yaw:0},terrainMode:'preserve'};
  const preview=await call('place_authored_base',{sessionId,expectedRevision:prior.revision,previewOnly:true,packageJson:captured.packageJson,authoredRequest});await history(prior);assert.deepEqual(await snapshot('authored-preview'),destination);
  const applied=await call('place_authored_base',{sessionId,expectedRevision:prior.revision,previewOnly:false,packageJson:captured.packageJson,authoredRequest}),reused=await snapshot('authored-applied'),layout=reused.baseLayouts.at(-1);
  assert.equal(applied.undoCount,prior.undoCount+1);assert.deepEqual(layout.entities,preview.layout.entities);assert.deepEqual(layout.metadata,preview.layout.metadata);assert.deepEqual(reused.terrain,destination.terrain);assert.deepEqual(reused.baseLayouts.slice(0,-1),destination.baseLayouts);
  assert.deepEqual(JSON.parse(layout.metadata[ENTRANCE_ROUTING_KEY]),pack.entranceRouting);
  assert.deepEqual(JSON.parse(layout.metadata[BUILD_AREAS_KEY]),JSON.parse(sourceLayout.metadata[BUILD_AREAS_KEY]).map(a=>({...a,points:a.points.map(([x,y])=>[x+500,y+500])})));
  assert.equal(layout.entities.length,sourceLayout.entities.length);for(const [i,e] of layout.entities.entries()){const old=sourceLayout.entities[i];for(let axis=0;axis<3;axis++)assert.ok(Math.abs(e.position[axis]-old.position[axis]-(axis<2?500:0))<1e-8);assert.deepEqual(e.rotation,old.rotation);assert.equal(e.token,old.token);assert.equal(e.team,old.team);}
  const reusedPath=path.join(out,'authored-reused.json');await fs.writeFile(reusedPath,JSON.stringify(reused));await call('undo',{sessionId,expectedRevision:applied.revision});assert.deepEqual(await snapshot('authored-undo'),destination);
  report.authored={captureReadOnly:true,previewApplyUndo:true,units:layout.entities.length,translation:[500,500,0],packagePath,packageSha256:await sha(packagePath),destinationPath,destinationSha256:await sha(destinationPath),reusedPath,reusedSha256:await sha(reusedPath)};
  if(libraryEvidence){
   const priorPid=app.pid,priorSession=sessionId,handler=socket.onmessage;socket.close();await new Promise(resolve=>{app.once('exit',resolve);app.kill();});
   app=spawn(exe,[],{windowsHide:true,stdio:'ignore',env:{...process.env,WULFRAM_FORGE_MCP:'1',WULFRAM_MCP_SESSION_DIR:sessions,WULFRAM_FORGE_USER_DATA_DIR:profile,WULFRAM_FORGE_REMOTE_DEBUGGING_PORT:String(port)}});assert.notEqual(app.pid,priorPid);
   const page=await probe(async()=>{const pages=await fetch(`http://127.0.0.1:${port}/json`).then(r=>r.json());return pages.find(p=>p.url==='https://wulfram-forge.local/index.html');},'authored library restarted editor');
   socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});socket.onmessage=handler;await send('Runtime.enable');
   await importFile(reusedPath,reused.name);assert.notEqual(sessionId,priorSession);assert.deepEqual(await snapshot('authored-reused-restart'),reused);
   const library=await call('inspect_authored_library',{sessionId,expectedRevision:(await state()).revision});assert.deepEqual(library.library,libraryEvidence.expectedLibrary);
   delete libraryEvidence.expectedLibrary;report.authored.library={...libraryEvidence,priorPid,restartedPid:app.pid,libraryAndReusedMapReopened:true};
  }
 }
 if(process.argv.includes('--matrix')){
  report.matrix=[];
  for(const terrainKind of ['flat','hills','steep']){
   const source=structuredClone(fixture);source.name=`Anchor matrix ${terrainKind}`;
   if(terrainKind!=='flat'){const t=source.terrain;for(let y=0;y<t.height;y++)for(let x=0;x<t.width;x++){const nx=x/(t.width-1),ny=y/(t.height-1);t.heights[y*t.width+x]=terrainKind==='steep'?3000*Math.cos(nx*Math.PI*12)*Math.cos(ny*Math.PI*12):20+12*Math.cos(nx*Math.PI*2)*Math.cos(ny*Math.PI*2);}}
   const file=path.join(out,`matrix-${terrainKind}.json`);await fs.writeFile(file,JSON.stringify(source));await importFile(file,source.name);const initial=await snapshot(`matrix-${terrainKind}`);assert.deepEqual(initial,source);
   for(const [sizeIndex,size] of ['small','standard','large','massive'].entries())for(const seed of ['matrix-a','matrix-b']){
    const targetCount=process.argv.includes('--expanded')?[24,30,39,51][sizeIndex]:0;const prior=await state(),request={activeLayoutId:initial.activeBaseLayoutId,layoutId:`${terrainKind}-${size}-${seed}`,style:'three-lane-anchor',seed,placement:{size,x:4000,y:6000,rotation:seed==='matrix-a'?0:35,radius:3300,targetCount}};
    if(terrainKind==='steep'){
     const rejected=await raw('generate_base_layout',{sessionId,expectedRevision:prior.revision,previewOnly:false,request});assert.equal(rejected.isError,true);const reason=rejected.content.filter(c=>c.type==='text').map(c=>c.text).join(' ');assert.match(reason,/terrain|slope|support/i);await history(prior);assert.deepEqual(await snapshot('rejected'),initial);report.matrix.push({terrainKind,size,seed,targetCount,rejected:true,reason,sourceSha256:await sha(file)});continue;
    }
    const preview=await call('generate_base_layout',{sessionId,expectedRevision:prior.revision,previewOnly:true,request});await history(prior);assert.deepEqual(await snapshot('matrix-preview'),initial);
    const applied=await call('generate_base_layout',{sessionId,expectedRevision:prior.revision,previewOnly:false,request}),candidate=await snapshot('matrix-applied'),layout=candidate.baseLayouts.at(-1);
    assert.equal(applied.undoCount,prior.undoCount+1);assert.equal(layout.entities.length,targetCount?targetCount*2:[30,42,60,84][sizeIndex]);assert.equal(layout.metadata['formation.version'],targetCount?'three-lane-anchor-v2':'three-lane-anchor-v1');assert.deepEqual(layout.entities,preview.layout.entities);assert.deepEqual(layout.metadata,preview.layout.metadata);assert.deepEqual(candidate.terrain,initial.terrain);assert.deepEqual(candidate.baseLayouts.slice(0,-1),initial.baseLayouts);
    const policy=JSON.parse(layout.metadata[ENTRANCE_ROUTING_KEY]);assert.equal(policy.sockets.length,6);assert.ok(policy.sockets.every(s=>!s.approach));
    const inspected=await call('inspect_routes',{sessionId,vehicleWidth:80});assert.equal(inspected.routes.filter(r=>r.kind==='service').length,12);
    const service=inspected.routes.filter(r=>r.kind==='service');assert.equal(new Set(service.map(r=>r.id)).size,12);
    for(const socket of policy.sockets){const socketRoutes=service.filter(r=>r.id.startsWith(`entrance-socket-${encodeURIComponent(socket.id)}-`));assert.equal(socketRoutes.length,2);const tokens=socketRoutes.map(r=>{const endpoint=r.points.at(-1),pad=layout.entities.find(e=>e.team===socket.team&&['r','f'].includes(e.token)&&Math.hypot(e.position[0]-endpoint[0],e.position[1]-endpoint[1])<1e-6);assert.ok(pad);return pad.token;});assert.deepEqual(tokens.sort(),['f','r']);}
    if(terrainKind==='hills')assert.ok(layout.entities.some(e=>Math.abs(e.rotation[0])+Math.abs(e.rotation[1])>1e-5));
    const candidatePath=path.join(out,`${terrainKind}-${size}-${seed}-applied.json`);await fs.writeFile(candidatePath,JSON.stringify(candidate));
    await call('undo',{sessionId,expectedRevision:applied.revision});assert.deepEqual(await snapshot('matrix-undo'),initial);report.matrix.push({terrainKind,size,seed,targetCount,units:layout.entities.length,previewApplyUndo:true,candidatePath,candidateSha256:await sha(candidatePath),sourceSha256:await sha(file)});
   }
  }
  assert.equal(report.matrix.length,24);
 }
 assert.deepEqual(report.rendererErrors,[]);assert.equal(await sha(exe),report.executableSha256);report.passed=true;
}catch(error){report.error=error.stack;process.exitCode=1;}finally{if(client)await client.close();if(socket)socket.close();if(app)app.kill();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
