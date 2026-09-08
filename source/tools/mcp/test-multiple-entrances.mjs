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
const out=await fs.mkdtemp(path.resolve('outputs/multiple-entrances-native-'));
const sha=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
const report={passed:false,out,executable:exe,executableSha256:await sha(exe),checks:{},rendererErrors:[]};
const fixture=createBlankProject();fixture.name='Multiple entrance native source';fixture.terrain.worldWidth=4000;fixture.terrain.worldHeight=4000;fixture.terrain.heights.fill(0);fixture.terrain.tagmap=['0:1snow001'];fixture.terrain.tagmap2=['1snow001'];
const layout=fixture.baseLayouts[0],areas=[],sockets=[];
for(const team of [1,2]){
 const point=([x,y])=>team===1?[x,y]:[4000-x,4000-y];
 for(const [token,p] of [['r',[1000,1000]],['e',[1000,1200]],['u',[800,1200]]])layout.entities.push({id:`team-${team}-${token}`,token,team,position:[...point(p),0],rotation:[0,0,team===1?0:Math.PI],active:1});
 for(let i=0;i<3;i++){
  const id=`team-${team}-${i}`,name=['Left','Middle','Right'][i];sockets.push({id,name,team,mouthCorridorId:`mouth-${id}`,mouthDirection:'forward',approach:{corridorId:`lane-${id}`,direction:'forward'}});
  areas.push({id:`mouth-${id}`,name:`Team ${team} ${name} mouth`,kind:'corridor',team:'all',width:120,points:[[2000+i*300,800],[1600,800]].map(point)},{id:`lane-${id}`,name:`Team ${team} ${name} lane`,kind:'corridor',team:'all',width:200,points:[[2000+i*300,1600],[2000+i*300,800]].map(point)});
 }
}
const manifest=JSON.parse(await fs.readFile('public/assets/manifest.json','utf8'));
for(const e of layout.entities){const c=structureTerrainClearance(e,manifest,catalogFor(e)?.footprint??10,0),snap=snapStructureToTerrain(fixture.terrain,e.position[0],e.position[1],c.footprint,e.rotation[2],c.groundOffset,c.margin);e.position[2]=snap.height;e.rotation[0]=snap.pitch;e.rotation[1]=snap.roll;}
layout.metadata[BUILD_AREAS_KEY]=JSON.stringify(areas);fixture.entities=structuredClone(layout.entities);
const fixturePath=path.join(out,'source.json');await fs.writeFile(fixturePath,JSON.stringify(fixture));report.fixture={path:fixturePath,sha256:await sha(fixturePath)};
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
 await importFile(fixturePath,fixture.name);const initial=await snapshot('initial');assert.deepEqual(initial,JSON.parse(await fs.readFile(fixturePath,'utf8')));const before=await state();
 await rules();await click('Design multiple entrances');
 for(const [index,s] of sockets.entries()){
  await click(`Add team ${s.team} entrance`);
  for(const [suffix,value] of [[' name',s.name],[' mouth',s.mouthCorridorId],[' approach',s.approach.corridorId]])await evaluate(`(()=>{const f=document.querySelectorAll('.multiple-entrances-panel fieldset')[${index}],e=f.querySelector('[aria-label$='+JSON.stringify(${JSON.stringify(suffix)})+']');if(!e)throw new Error('Missing field');if(e.tagName==='INPUT'){Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));}else{e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));}})()`);
 }
 const scope=`document.querySelector('.multiple-entrances-panel')`;
 await click('Preview entrances',scope);await probe(()=>evaluate(`[...${scope}.querySelectorAll('button')].some(b=>b.textContent==='Apply entrances'&&!b.disabled)`),'valid GUI preview');
 await history(before);assert.deepEqual(await snapshot('gui-preview'),initial);await click('Apply entrances',scope);await probe(async()=> (await state()).revision!==before.revision,'GUI apply');
 const applied=await snapshot('gui-applied'),policy=JSON.parse(applied.baseLayouts[0].metadata[ENTRANCE_ROUTING_KEY]);assert.equal(policy.version,2);assert.equal(policy.sockets.length,6);
 assert.deepEqual(policy.sockets.map(({id,...s})=>s),sockets.map(({id,...s})=>s));assert.deepEqual(applied.entities,initial.entities);assert.deepEqual(applied.terrain,initial.terrain);
 const appliedState=await state();assert.equal(appliedState.undoCount,before.undoCount+1);
 report.policy=policy;report.checks.guiPreviewApply=true;
 const captured=await call('capture_authored_base',{sessionId,expectedRevision:appliedState.revision,activeLayoutId:applied.activeBaseLayoutId,sourceFrame:{origin:[2000,2000,0],yaw:0}});
 const packageJson=captured.packageJson;assert.ok(packageJson);const pack=JSON.parse(packageJson);assert.equal(pack.version,2);assert.deepEqual(pack.entranceRouting,policy);await history(appliedState);assert.deepEqual(await snapshot('capture-readonly'),applied);report.package=path.join(out,'authored-base-v2.json');await fs.writeFile(report.package,packageJson);
 const routes=await call('inspect_routes',{sessionId,vehicleWidth:80}),service=routes.routes.filter(r=>r.kind==='service');assert.equal(service.length,6);assert.equal(new Set(service.map(r=>r.id)).size,6);assert.ok(service.every(r=>r.name.includes('Bound approach')));
 for(const s of policy.sockets){const route=service.find(r=>r.id===`entrance-socket-${encodeURIComponent(s.id)}-0`);assert.ok(route);const mouth=areas.find(a=>a.id===s.mouthCorridorId),approach=areas.find(a=>a.id===s.approach.corridorId),ordered=[...approach.points.slice(0,-1),...mouth.points];let cursor=-1;for(const point of ordered){const next=route.points.findIndex((p,i)=>i>cursor&&p[0]===point[0]&&p[1]===point[1]);assert.ok(next>cursor,'Ordered authored route points must be retained');cursor=next;}const pad=initial.entities.find(e=>e.token==='r'&&e.team===s.team);assert.deepEqual(route.points.at(-1),pad.position.slice(0,2));}
 report.checks.orderedSocketRoutes=true;
 await call('undo',{sessionId,expectedRevision:appliedState.revision});assert.deepEqual(await snapshot('gui-undo'),initial);report.checks.guiUndo=true;
 const ready=await state(),args={sessionId,expectedRevision:ready.revision,activeLayoutId:initial.activeBaseLayoutId,policy};
 const preview=await call('set_entrance_routing',{...args,previewOnly:true});assert.equal(preview.previewOnly,true);await history(ready);assert.deepEqual(await snapshot('mcp-preview'),initial);
 const changed=await call('set_entrance_routing',{...args,previewOnly:false});assert.notEqual(changed.revision,ready.revision);assert.equal((await raw('set_entrance_routing',{...args,previewOnly:false})).isError,true);
 assert.equal(changed.undoCount,ready.undoCount+1);const mcpApplied=await snapshot('mcp-applied'),expectedApplied=structuredClone(applied);assert.ok(Number.isFinite(Date.parse(mcpApplied.updatedAt)));expectedApplied.updatedAt=mcpApplied.updatedAt;expectedApplied.baseLayouts[0].updatedAt=mcpApplied.baseLayouts[0].updatedAt;assert.deepEqual(mcpApplied,expectedApplied);
 assert.equal((await raw('set_entrance_routing',{...args,expectedRevision:changed.revision,policy:{...policy,sockets:policy.sockets.map((s,i)=>i===5?{...s,mouthCorridorId:'missing'}:s)}})).isError,true);await history(changed);
 await call('undo',{sessionId,expectedRevision:changed.revision});assert.deepEqual(await snapshot('mcp-undo'),initial);report.checks.mcpPreviewApplyUndoStale=true;
 const saved=structuredClone(applied);saved.name='Reopened multi entrances';const savedPath=path.join(out,'applied.json');await fs.writeFile(savedPath,JSON.stringify(saved));await importFile(savedPath,saved.name);assert.deepEqual(await snapshot('reopened'),saved);await rules();assert.equal(await evaluate(`document.querySelectorAll('.multiple-entrances-panel fieldset').length`),6);report.checks.reopenedRows=true;
 const destination=createBlankProject();destination.name='Multi entrance destination';destination.terrain.worldWidth=6000;destination.terrain.worldHeight=5000;destination.terrain.heights.fill(0);destination.terrain.tagmap=['0:1snow001'];destination.terrain.tagmap2=['1snow001'];const destinationPath=path.join(out,'destination.json');await fs.writeFile(destinationPath,JSON.stringify(destination));await importFile(destinationPath,destination.name);const destBefore=await snapshot('destination'),destState=await state();
 const request={activeLayoutId:destination.activeBaseLayoutId,layoutId:'reused',frame:{origin:[2600,2300,0],yaw:0},terrainMode:'preserve'};
 const placedPreview=await call('place_authored_base',{sessionId,expectedRevision:destState.revision,previewOnly:true,packageJson,authoredRequest:request});await history(destState);assert.deepEqual(await snapshot('reuse-preview'),destBefore);assert.equal(placedPreview.entrances.length,6);
 const placed=await call('place_authored_base',{sessionId,expectedRevision:destState.revision,previewOnly:false,packageJson,authoredRequest:request});const reused=await snapshot('reused'),reusedLayout=reused.baseLayouts.find(l=>l.id==='reused');assert.deepEqual(JSON.parse(reusedLayout.metadata[ENTRANCE_ROUTING_KEY]),policy);assert.deepEqual(JSON.parse(reusedLayout.metadata[BUILD_AREAS_KEY])[0].points,[[2600,1100],[2200,1100]]);
 assert.deepEqual(destBefore,JSON.parse(await fs.readFile(destinationPath,'utf8')));
 assert.deepEqual(JSON.parse(reusedLayout.metadata[BUILD_AREAS_KEY]),areas.map(a=>({...a,points:a.points.map(([x,y])=>[x+600,y+300])})));
 assert.equal(reusedLayout.entities.length,initial.entities.length);
 for(const source of initial.entities){const entity=reusedLayout.entities.find(e=>e.token===source.token&&e.team===source.team);assert.ok(entity);assert.deepEqual(entity.position,[source.position[0]+600,source.position[1]+300,source.position[2]]);assert.deepEqual(entity.rotation,source.rotation);assert.equal(entity.active,source.active);}
 await call('undo',{sessionId,expectedRevision:placed.revision});assert.deepEqual(await snapshot('reuse-undo'),destBefore);report.checks.crossMapPackagePreviewApplyUndo=true;
 const malformed=structuredClone(applied);malformed.name='Malformed entrance areas';malformed.baseLayouts[0].metadata[BUILD_AREAS_KEY]='{broken';const malformedPath=path.join(out,'malformed.json');await fs.writeFile(malformedPath,JSON.stringify(malformed));await importFile(malformedPath,malformed.name);await rules();await probe(()=>evaluate(`document.querySelector('.multiple-entrances-panel output')?.textContent.includes('Repair the saved')`),'malformed diagnostic');assert.equal(await evaluate(`[...document.querySelector('.multiple-entrances-panel').querySelectorAll('button')].find(b=>b.textContent==='Preview entrances').disabled`),true);report.checks.malformedDiagnostic=true;
 const shot=await send('Page.captureScreenshot',{format:'png'});report.screenshot=path.join(out,'malformed-diagnostic.png');await fs.writeFile(report.screenshot,Buffer.from(shot.data,'base64'));
 const firstPid=app.pid,firstSessionId=sessionId,onMessage=socket.onmessage;socket.close();await new Promise(resolve=>{app.once('exit',resolve);app.kill();});
 app=spawn(exe,[],{windowsHide:true,stdio:'ignore',env:{...process.env,WULFRAM_FORGE_MCP:'1',WULFRAM_MCP_SESSION_DIR:sessions,WULFRAM_FORGE_USER_DATA_DIR:profile,WULFRAM_FORGE_REMOTE_DEBUGGING_PORT:String(port)}});assert.notEqual(app.pid,firstPid);
 const restartedTarget=await probe(async()=>{const pages=await fetch(`http://127.0.0.1:${port}/json`).then(r=>r.json());return pages.find(p=>p.url==='https://wulfram-forge.local/index.html');},'restarted editor');
 socket=new WebSocket(restartedTarget.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});socket.onmessage=onMessage;await send('Runtime.enable');
 await probe(()=>evaluate(`!!window.wulframMcp&&document.readyState==='complete'&&!!document.querySelector('input[type="file"][multiple]')`),'restarted ready');
 await importFile(savedPath,saved.name);assert.notEqual(sessionId,firstSessionId);assert.deepEqual(await snapshot('fresh-process-reopened'),saved);await rules();assert.equal(await evaluate(`document.querySelectorAll('.multiple-entrances-panel fieldset').length`),6);
 const restartedRoutes=await call('inspect_routes',{sessionId,vehicleWidth:80});assert.deepEqual(restartedRoutes.routes.filter(r=>r.kind==='service'),service);
 const restartShot=await send('Page.captureScreenshot',{format:'png'});report.restartScreenshot=path.join(out,'fresh-process-entrances.png');await fs.writeFile(report.restartScreenshot,Buffer.from(restartShot.data,'base64'));report.checks.freshProcessFileReopen=true;report.processes={firstPid,restartedPid:app.pid};
 assert.deepEqual(report.rendererErrors,[]);assert.equal(await sha(exe),report.executableSha256);report.passed=true;
}catch(error){report.error=error.stack;process.exitCode=1;}finally{if(client)await client.close();if(socket)socket.close();if(app)app.kill();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
