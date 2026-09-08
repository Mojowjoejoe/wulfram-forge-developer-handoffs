import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {ADVANCED_BASE_PRESETS} from '../../lib/advanced-base-templates.ts';
import {readMapArchive} from '../../lib/map-package.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const out=await fs.mkdtemp(path.join(root,'outputs','advanced-presets-native-'));
const fixture=path.join(root,'outputs/advanced-base-tryout-v1/forge-advanced-bastion-v1.zip');
const baseline=JSON.parse(await fs.readFile(path.join(root,'outputs/advanced-base-tryout-v1/forge-advanced-bastion-v1.json')));
const sessionDir=path.join(out,'sessions'),profile=path.join(out,'profile');
const report={passed:false,out,steps:[]};
const until=async(fn,label)=>{const end=Date.now()+45000;while(Date.now()<end){const r=await fn().catch(()=>undefined);if(r)return r;await new Promise(r=>setTimeout(r,200));}throw new Error('Timeout: '+label);};
const listener=net.createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));
let app,socket,client;let sequence=0;const pending=new Map();
try{
  app=spawn(path.join(root,'dist/desktop/mcp-v0.1.0/WulframForge.exe'),[],{windowsHide:true,stdio:'ignore',env:{...process.env,WULFRAM_FORGE_MCP:'1',WULFRAM_MCP_SESSION_DIR:sessionDir,WULFRAM_FORGE_USER_DATA_DIR:profile,WULFRAM_FORGE_REMOTE_DEBUGGING_PORT:String(port)}});
  app.on('error',e=>console.error(e.message));
  const page=await until(async()=>{const a=await fetch(`http://127.0.0.1:${port}/json`).then(r=>r.json());return a.find(t=>t.url==='https://wulfram-forge.local/index.html');},'native editor');
  socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
  socket.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);if(m.error)p.reject(new Error(m.error.message));else p.resolve(m.result);}};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(new Error('UI request timeout'));},15000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result.value;};
  await until(()=>evaluate('!!window.wulframMcp && !!document.querySelector(\'input[type="file"][multiple]\')'),'editor loaded');
  const dom=await send('DOM.getDocument');const input=await send('DOM.querySelector',{nodeId:dom.root.nodeId,selector:'input[type="file"][multiple]'});
  await send('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[fixture]});
  const transport=new StdioClientTransport({command:process.execPath,args:['--experimental-strip-types',path.join(root,'tools/mcp/server.mjs')],env:{...process.env,WULFRAM_MCP_SESSION_DIR:sessionDir},stderr:'pipe'});
  client=new Client({name:'advanced-preset-tryout',version:'1'});await client.connect(transport);
  const raw=(name,args={})=>client.callTool({name,arguments:args});
  const call=async(name,args={})=>{const r=await raw(name,args);if(r.isError)throw new Error(r.content[0].text);return JSON.parse(r.content[0].text);};
  const session=await until(async()=>{const r=await call('list_editor_sessions');return r.sessions.find(s=>s.ready&&s.name===baseline.name);},'imported map');
  const sessionId=session.sessionId;
  const options=await until(()=>evaluate('Array.from(document.querySelectorAll(\'select[aria-label="Base template"] option\')).map(o=>o.value).filter(v=>v.startsWith("forge-advanced-"))'),'presets in selector');
  assert.deepEqual(options,ADVANCED_BASE_PRESETS.map(p=>p.template.id));report.steps.push({name:'All four presets available in native template selector',passed:true});
  for(const preset of ADVANCED_BASE_PRESETS){
    const t=preset.template;let state=await call('inspect_map',{sessionId});const before=state;
    const edits=[...state.entities.filter(e=>e.team===1).map(e=>({operation:'remove',id:e.id,mirror:true})),...t.units.map(u=>({operation:'add',token:u.token,team:1,x:1600+u.offset[0],y:3200+u.offset[1],yaw:u.rotation[2],mirror:true}))];
    const applied=await call('edit_entities',{sessionId,expectedRevision:state.revision,edits});assert.equal(applied.undoCount,state.undoCount+1);
    state=await call('inspect_map',{sessionId});assert.equal(state.entities.length,t.unitCount*2);
    const validation=await call('validate_map',{sessionId});assert.equal(validation.issues.filter(i=>i.severity==='error').length,0);
    for(const e of state.entities.filter(e=>e.team===1))assert.equal(state.entities.filter(o=>o.team===2&&o.token===e.token&&Math.hypot(o.position[0]-(6400-e.position[0]),o.position[1]-(6400-e.position[1]))<1e-6).length,1);
    // Choose the actual preset in the UI to verify its description and preview.
    await evaluate(`(()=>{const s=document.querySelector('select[aria-label="Base template"]');s.value=${JSON.stringify(t.id)};s.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
    await until(()=>evaluate(`!!document.querySelector('.template-controls') && document.querySelector('.template-controls').textContent.includes('Face +X')`),'preset preview');
    await evaluate(`document.querySelector('.terrain-viewport canvas').focus()`);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Home',code:'Home'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Home',code:'Home'});
    for(const code of ['KeyW','KeyA'])await send('Input.dispatchKeyEvent',{type:'keyDown',key:code.slice(-1).toLowerCase(),code});
    await new Promise(r=>setTimeout(r,420));
    for(const code of ['KeyW','KeyA'])await send('Input.dispatchKeyEvent',{type:'keyUp',key:code.slice(-1).toLowerCase(),code});
    for(const code of ['KeyQ','ArrowUp'])await send('Input.dispatchKeyEvent',{type:'keyDown',key:code==='KeyQ'?'q':'ArrowUp',code});
    await new Promise(r=>setTimeout(r,650));
    for(const code of ['KeyQ','ArrowUp'])await send('Input.dispatchKeyEvent',{type:'keyUp',key:code==='KeyQ'?'q':'ArrowUp',code});
    await new Promise(r=>setTimeout(r,400));
    const image=await raw('capture_view',{sessionId});assert.equal(image.content[0].type,'image');await fs.writeFile(path.join(out,t.id+'.png'),Buffer.from(image.content[0].data,'base64'));
    const name=t.id+'-'+Date.now();const saved=await call('save_copy',{sessionId,expectedRevision:state.revision,name});const snapshot=JSON.parse(await fs.readFile(saved.path));
    assert.deepEqual(snapshot.terrain,baseline.terrain);
    const exported=await call('export_map',{sessionId,expectedRevision:state.revision,name});const entries=await readMapArchive(await fs.readFile(exported.path));const reopened=JSON.parse(entries.find(e=>e.name.endsWith('/wulfram-project.json')).text);assert.deepEqual(reopened.entities,snapshot.entities);
    await call('undo',{sessionId,expectedRevision:state.revision});const restored=await call('inspect_map',{sessionId});assert.deepEqual(restored.entities,before.entities);
    report.steps.push({name:t.name,passed:true,entities:state.entities.length,terrainUnchanged:true,validationErrors:0,oneStepUndo:true,nativeCapture:t.id+'.png',exported:exported.path});
  }
  report.passed=true;
}catch(e){report.error=e.stack;process.exitCode=1;}
finally{if(client)await client.close();if(socket)socket.close();if(app)app.kill();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
