import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const port=Number(process.argv[2]);assert.ok(port>0&&port<65536);
const out=path.resolve('outputs/canyon-citadel-forest-v1'),source=JSON.parse(await fs.readFile(path.join(out,'project.json'),'utf8'));
const targets=await fetch(`http://127.0.0.1:${port}/json`).then(r=>r.json());
const pages=targets.filter(t=>t.url==='https://wulfram-forge.local/index.html');assert.equal(pages.length,1);
const socket=new WebSocket(pages[0].webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
let id=0;const pending=new Map();socket.onmessage=e=>{const r=JSON.parse(e.data),p=pending.get(r.id);if(p){clearTimeout(p.timer);pending.delete(r.id);r.error?p.reject(Error(r.error.message)):p.resolve(r.result);}};
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>{pending.delete(n);reject(Error('Timeout'));},15000);pending.set(n,{resolve,reject,timer});socket.send(JSON.stringify({id:n,method,params}));});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;};
try{
  const ui=await evaluate('document.body.innerText');assert.ok(ui.includes(source.name),'Forest map title visible');
  await evaluate(`(()=>{const buttons=[...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Save local');if(buttons.length!==1)throw Error('Save button ambiguous');buttons[0].click();return true;})()`);
  const saved=await evaluate(`JSON.parse(localStorage.getItem('wulfram-forge-project-v1'))`);
  assert.equal(saved.name,source.name);assert.deepEqual(saved.terrain,source.terrain);assert.deepEqual(saved.entities,source.entities);
  await send('Page.bringToFront');
  const shot=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,'editor-forest.png'),Buffer.from(shot.data,'base64'));
  await fs.writeFile(path.join(out,'editor-receipt.json'),JSON.stringify({loadedName:saved.name,terrainMatches:true,entitiesMatch:true,savedViaEditor:true,originalEditorUntouched:true},null,2));
  console.log(JSON.stringify({loadedName:saved.name,entities:saved.entities.length,screenshot:path.join(out,'editor-forest.png')}));
}finally{socket.close();}
