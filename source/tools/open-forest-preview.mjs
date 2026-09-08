import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const out=path.resolve('outputs/canyon-citadel-forest-v1');
const fixture=path.join(out,'Canyon-Citadel-Forest-Power-Run-v1.zip');
const source=JSON.parse(await fs.readFile(path.join(out,'project.json'),'utf8'));
const profile=path.join(out,'editor-profile'),sessionDir=path.join(out,'editor-sessions');
const listener=net.createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));
const app=spawn(path.resolve('dist/desktop/WulframForge/WulframForge.exe'),[],{detached:true,windowsHide:true,stdio:'ignore',env:{...process.env,WULFRAM_FORGE_MCP:'1',WULFRAM_FORGE_USER_DATA_DIR:profile,WULFRAM_MCP_SESSION_DIR:sessionDir,WULFRAM_FORGE_REMOTE_DEBUGGING_PORT:String(port)}});app.unref();
const until=async(fn,label)=>{const end=Date.now()+45000;while(Date.now()<end){try{const v=await fn();if(v)return v;}catch{}await new Promise(r=>setTimeout(r,150));}throw Error(label);};
const target=await until(async()=>{const targets=await fetch(`http://127.0.0.1:${port}/json`).then(r=>r.json());return targets.find(t=>t.url==='https://wulfram-forge.local/index.html');},'Editor did not start');
const socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
let id=0;const pending=new Map();socket.onmessage=e=>{const r=JSON.parse(e.data);const p=pending.get(r.id);if(p){pending.delete(r.id);clearTimeout(p.timer);r.error?p.reject(Error(r.error.message)):p.resolve(r.result);}};
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>{pending.delete(n);reject(Error('Editor response timeout'));},15000);pending.set(n,{resolve,reject,timer});socket.send(JSON.stringify({id:n,method,params}));});
try{
  await until(async()=>{const r=await send('Runtime.evaluate',{expression:'!!document.querySelector(\'input[type="file"][multiple]\')',returnByValue:true});return r.result.value;},'Import control missing');
  const {root}=await send('DOM.getDocument');const {nodeId}=await send('DOM.querySelector',{nodeId:root.nodeId,selector:'input[type="file"][multiple]'});
  await send('DOM.setFileInputFiles',{nodeId,files:[fixture]});
  await until(async()=>{const r=await send('Runtime.evaluate',{expression:`document.body.innerText.includes(${JSON.stringify(source.name)})`,returnByValue:true});return r.result.value;},'Forest map not imported');
  // Save through the editor's own button so this new profile reopens the forest map.
  const result=await send('Runtime.evaluate',{expression:`(()=>{const b=[...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Save local');if(b.length!==1)throw Error('Save button missing');b[0].click();return true;})()`,returnByValue:true});assert.ok(!result.exceptionDetails);
  const stored=await send('Runtime.evaluate',{expression:`JSON.parse(localStorage.getItem('wulfram-forge-project-v1'))`,returnByValue:true});
  assert.deepEqual(stored.result.value.terrain,source.terrain);assert.deepEqual(stored.result.value.entities,source.entities);
  await new Promise(r=>setTimeout(r,2500));
  await send('Page.bringToFront');
  const shot=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,'editor-forest.png'),Buffer.from(shot.data,'base64'));
  await fs.writeFile(path.join(out,'editor-receipt.json'),JSON.stringify({pid:app.pid,loadedName:source.name,terrainMatches:true,entitiesMatch:true,originalEditorUntouched:true},null,2));
  console.log(JSON.stringify({pid:app.pid,map:source.name,screenshot:path.join(out,'editor-forest.png')}));
}finally{socket.close();}
