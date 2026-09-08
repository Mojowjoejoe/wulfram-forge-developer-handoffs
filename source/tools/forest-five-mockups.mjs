import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createMapArchive} from '../lib/map-package.ts';
import {parseTerrainTextureTag,serializeTerrainTextureTag} from '../lib/terrain-textures.ts';
const out=path.resolve('outputs/canyon-citadel-five-forest-mockups-v1');
await fs.mkdir(out,{recursive:false});
const source=JSON.parse(await fs.readFile('outputs/canyon-citadel-forest-v1/project.json','utf8'));
const manifest=JSON.parse(await fs.readFile('public/assets/manifest.json','utf8'));
const looks=[
  {name:'Woodland Floor',note:'Balanced green slopes, shaded undergrowth, earthy paths.',map:{},swatches:['gbdirt_grassy001','1bush001','19bush001','gbdirt001']},
  {name:'Emerald Meadow',note:'Open grassland with brighter, sunlit meadow patches.',map:{gbdirt_grassy001:'3grass001',Grs001:'3litegrass001','19bush001':'3grass002', '1bush001':'3litegrass001','9bush001':'3grass002',junglecanyon001:'bluegranite001'},swatches:['3grass001','3litegrass001','3grass002','bluegranite001']},
  {name:'Deep Pine',note:'Dark evergreen ground and cool, shadowy rock.',map:{gbdirt_grassy001:'Grs001',Grs001:'19bush001','1bush001':'19bush001','9bush001':'1bush001',junglecanyon001:'5granite001'},swatches:['Grs001','19bush001','1bush001','5granite001']},
  {name:'Fern Valley',note:'Lush fern textures with vivid green sheltered pockets.',map:{gbdirt_grassy001:'9bush001',Grs001:'1bush001','19bush001':'19bush001','1bush001':'3bush001','9bush001':'9bush002',junglecanyon001:'junglecanyon002'},swatches:['9bush001','3bush001','1bush001','junglecanyon002']},
  {name:'Mossy Highlands',note:'Muted olive growth, stony slopes, and weathered earth.',map:{gbdirt_grassy001:'9bush_1silt001',Grs001:'gbdirt_grassy001','19bush001':'20bush001','1bush001':'20bush002','9bush001':'gbdirt_grassy001',junglecanyon001:'gbdirt_rocky001'},swatches:['9bush_1silt001','20bush001','gbdirt_grassy001','gbdirt_rocky001']},
];
for(const [i,look] of looks.entries()){
  const p=structuredClone(source);p.name=`Canyon Citadel - ${look.name}`;
  p.terrain.tagmap2=p.terrain.tagmap2.map(tag=>{const layers=parseTerrainTextureTag(tag);if(!layers.length)return tag;const merged=new Map();for(const layer of layers){const name=look.map[layer.name]??layer.name;assert.ok(manifest.terrainTextures[name]);merged.set(name,(merged.get(name)??0)|layer.corners);}return serializeTerrainTextureTag([...merged].map(([name,corners])=>({name,corners})));});
  assert.deepEqual(p.terrain.heights,source.terrain.heights);assert.deepEqual(p.entities,source.entities);assert.deepEqual(p.baseLayouts,source.baseLayouts);
  p.metadata['showcase.textureStyle']=JSON.stringify({mockup:look.name,source:'Forest Power Run v1',texturesOnly:true});
  look.project=p;look.file=path.join(out,`${i+1}-${look.name.replaceAll(' ','-')}.zip`);await fs.writeFile(look.file,Buffer.from(await createMapArchive(p)));
}
const listener=net.createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));
const app=spawn(path.resolve('dist/desktop/WulframForge/WulframForge.exe'),[],{windowsHide:true,stdio:'ignore',env:{...process.env,WULFRAM_FORGE_USER_DATA_DIR:path.join(out,'render-profile'),WULFRAM_FORGE_REMOTE_DEBUGGING_PORT:String(port)}});
const until=async(fn,label)=>{const end=Date.now()+45000;while(Date.now()<end){try{const r=await fn();if(r)return r;}catch{}await new Promise(r=>setTimeout(r,200));}throw Error(label);};
let socket;
try{
  const target=await until(async()=>{const ts=await fetch(`http://127.0.0.1:${port}/json`).then(r=>r.json());return ts.find(t=>t.url==='https://wulfram-forge.local/index.html');},'Editor startup');
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
  let id=0;const pending=new Map();socket.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>{pending.delete(n);reject(Error(method));},20000);pending.set(n,{resolve,reject,timer});socket.send(JSON.stringify({id:n,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;};
  await until(()=>evaluate(`!!document.querySelector('input[type="file"][multiple]')`),'Import control');
  await evaluate(`(()=>{const s=document.createElement('style');s.textContent='.viewport-help,.viewport-badges{display:none!important}';document.head.appendChild(s);return true;})()`);
  for(const [i,look] of looks.entries()){
    const {root}=await send('DOM.getDocument');const {nodeId}=await send('DOM.querySelector',{nodeId:root.nodeId,selector:'input[type="file"][multiple]'});await send('DOM.setFileInputFiles',{nodeId,files:[look.file]});
    await until(()=>evaluate(`document.body.innerText.includes(${JSON.stringify(look.project.name)})`),'Map import');
    await new Promise(r=>setTimeout(r,1800));
    const stored=await evaluate(`JSON.parse(localStorage.getItem('wulfram-forge-project-v1'))`);assert.deepEqual(stored.terrain,look.project.terrain);assert.deepEqual(stored.entities,source.entities);
    if(i===0){
      await evaluate(`document.querySelector('.terrain-viewport canvas').focus()`);
      await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Home',code:'Home',windowsVirtualKeyCode:36});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Home',code:'Home',windowsVirtualKeyCode:36});
      await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowUp',code:'ArrowUp',windowsVirtualKeyCode:38});await new Promise(r=>setTimeout(r,480));await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowUp',code:'ArrowUp',windowsVirtualKeyCode:38});
    }
    await new Promise(r=>setTimeout(r,1000));
    const rect=await evaluate(`(()=>{const r=document.querySelector('.terrain-viewport canvas').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()`);
    const shot=await send('Page.captureScreenshot',{format:'png',clip:rect});look.png=path.join(out,`${i+1}-${look.name.replaceAll(' ','-')}.png`);await fs.writeFile(look.png,Buffer.from(shot.data,'base64'));console.log(`Rendered ${i+1}: ${look.name}`);
  }
}finally{if(socket)socket.close();app.kill();}
// Presentation board: native map renders plus the exact four defining texture tiles.
const CW=900,CH=700,gap=26,margin=36,boardW=margin*2+CW*2+gap,boardH=160+CH*3+gap*2+margin;
const layers=[];
const label=(text,size=23,color='#e8eee6')=>Buffer.from(`<svg width="900" height="70"><text x="0" y="38" font-family="Segoe UI,Arial" font-weight="600" font-size="${size}" fill="${color}">${text}</text></svg>`);
layers.push({input:label('CANYON CITADEL / FIVE FOREST LOOKS',36),left:margin,top:22});
layers.push({input:label('Same terrain, bases and repair outpost. Native editor renders; texture changes only.',20,'#aebfad'),left:margin,top:76});
for(const [i,look] of looks.entries()){
  const x=margin+(i%2)*(CW+gap),y=160+Math.floor(i/2)*(CH+gap);
  layers.push({input:label(`${i+1}. ${look.name.toUpperCase()}${i===0?'  /  MY PICK':''}`,27),left:x,top:y});
  layers.push({input:await sharp(look.png).resize(CW,510,{fit:'contain',background:'#111810'}).png().toBuffer(),left:x,top:y+62});
  layers.push({input:label(look.note,19,'#bdc9b9'),left:x,top:y+570});
  for(const [j,n] of look.swatches.entries())layers.push({input:await sharp('public'+manifest.terrainTextures[n].url).resize(190,65).png().toBuffer(),left:x+j*225,top:y+630});
}
const tx=margin+CW+gap,ty=160+2*(CH+gap);
const note=Buffer.from(`<svg width="900" height="700"><g font-family="Segoe UI,Arial" fill="#e6eee2"><text x="44" y="90" font-size="33" font-weight="700">MY FAVORITE: WOODLAND FLOOR</text><text x="44" y="155" font-size="25">A forest feel that keeps the canyon readable.</text><text x="44" y="224" font-size="23">2 / Emerald Meadow — bright and open</text><text x="44" y="272" font-size="23">3 / Deep Pine — darkest and moodiest</text><text x="44" y="320" font-size="23">4 / Fern Valley — lushest greenery</text><text x="44" y="368" font-size="23">5 / Mossy Highlands — muted and rugged</text><text x="44" y="469" font-size="21" fill="#aebfad">Tiles under each view are actual Wulfram textures.</text><text x="44" y="509" font-size="21" fill="#aebfad">No added trees, structures, or terrain changes.</text><text x="44" y="549" font-size="21" fill="#aebfad">All five retain Power Run’s central repair outpost.</text></g></svg>`);
layers.push({input:note,left:tx,top:ty});
await sharp({create:{width:boardW,height:boardH,channels:3,background:'#111912'}}).composite(layers).png().toFile(path.join(out,'five-forest-looks.png'));
await fs.writeFile(path.join(out,'verification.json'),JSON.stringify({allFiveRendered:true,actualEditorImportParity:true,heightsAndEntitiesUnchanged:true,variants:looks.map(({name,note,swatches})=>({name,note,swatches}))},null,2));
console.log(path.join(out,'five-forest-looks.png'));
