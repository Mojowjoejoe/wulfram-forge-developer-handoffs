import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {applyManualTerrainBrush} from '../lib/manual-terrain-brush.ts';

export async function testManualBrushNative({call,callRaw,sessionId,root}){
 const runId=randomUUID().slice(0,8);
 const stable=project=>{const result=structuredClone(project);delete result.updatedAt;const active=result.baseLayouts.find(l=>l.id===result.activeBaseLayoutId);if(active)delete active.updatedAt;return result;};
 const history=s=>Object.fromEntries(['revision','undoCount','redoCount','dirty'].map(k=>[k,s[k]]));
 const artifact=s=>({path:s.path,sha256:s.sha256});
 const manifest=JSON.parse(await fs.readFile(path.join(root,'public/assets/manifest.json'),'utf8'));
 const snapshot=async name=>{
   const state=await call('get_editor_state',{sessionId});
   const copy=await call('save_copy',{sessionId,expectedRevision:state.revision,name:`${runId}-${name}`});
   const bytes=await fs.readFile(copy.path);return {state,project:JSON.parse(bytes),path:copy.path,sha256:createHash('sha256').update(bytes).digest('hex')};
 };
 const initial=await snapshot('brush-matrix-initial');
 await call('edit_terrain',{sessionId,expectedRevision:initial.state.revision,brush:{operation:'raise',x:6400,y:1200,radius:220,value:90}});
 const base=await snapshot('brush-matrix-source'),cases=[];let lastRestored=base;
 for(const shape of ['round','square','diamond'])for(const falloff of ['soft','linear','hard'])for(const tool of ['sculpt','lower','level','stamp','smooth','paint']){
   const brush={profile:'editor-v1',tool,x:6400,y:1200,radius:200,strength:75,shape,falloff,targetHeight:40,texture:Object.keys(manifest.terrainTextures).find(n=>n!=='canyon003'),selection:{x:6100,y:900,width:600,height:600}};
   const expected=applyManualTerrainBrush(base.project,brush,manifest);
   assert.ok(expected.vertices>0,`${shape}/${falloff}/${tool} changes terrain`);
   const before=await call('get_editor_state',{sessionId});
   const result=await call('edit_terrain',{sessionId,expectedRevision:before.revision,brush});
   assert.equal(result.undoCount,before.undoCount+1);
   const saved=await snapshot(`brush-${shape}-${falloff}-${tool}`);
   assert.deepEqual(stable(saved.project),stable(expected.project));
   assert.equal((await callRaw('edit_terrain',{sessionId,expectedRevision:before.revision,brush})).isError,true);
   assert.deepEqual(history(await call('get_editor_state',{sessionId})),history(saved.state));
   const staleSnapshot=await snapshot(`brush-stale-${shape}-${falloff}-${tool}`);assert.deepEqual(staleSnapshot.project,saved.project);
   await call('undo',{sessionId,expectedRevision:saved.state.revision});
   const restored=await snapshot(`brush-undo-${shape}-${falloff}-${tool}`);
   assert.deepEqual(stable(restored.project),stable(base.project));lastRestored=restored;
   cases.push({tool,shape,falloff,brush,vertices:expected.vertices,path:saved.path,sha256:saved.sha256,staleSnapshot:artifact(staleSnapshot),undoSnapshot:artifact(restored),sourceParity:true,staleRejected:true,undo:true});
 }
 const beforeInvalid=await call('get_editor_state',{sessionId});
 const invalid=await callRaw('edit_terrain',{sessionId,expectedRevision:beforeInvalid.revision,brush:{profile:'editor-v1',tool:'level',x:6400,y:1200,radius:200,strength:100,shape:'square',falloff:'hard',targetHeight:1e308}});
 assert.equal(invalid.isError,true);assert.deepEqual(history(await call('get_editor_state',{sessionId})),history(beforeInvalid));
 const afterInvalid=await snapshot('brush-invalid-unchanged');assert.deepEqual(afterInvalid.project,lastRestored.project);
 await call('undo',{sessionId,expectedRevision:beforeInvalid.revision});
 const restored=await snapshot('brush-matrix-restored');assert.deepEqual(stable(restored.project),stable(initial.project));
 return {cases,invalidHeightRejected:true,sourceRestored:true,snapshots:{initial:artifact(initial),source:artifact(base),beforeInvalid:artifact(lastRestored),afterInvalid:artifact(afterInvalid),restored:artifact(restored)}};
}
