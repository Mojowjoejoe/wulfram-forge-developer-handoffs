'use client';
import {backupAndResetLibrary,latestLibraryBackup} from '@/lib/library-recovery';
import {useState,useEffect,useRef} from 'react';
import {previewTerrainComposition,readTerrainComposition,type TerrainComposition,type CompositionPlacement} from '@/lib/terrain-composition';
import {COMPOSITION_LIBRARY_KEY,readCompositionLibrary,saveCompositionEntry} from '@/lib/composition-library';
import type {SavedStamp} from '@/lib/stamp-library';
import type {AssetManifest,WulframProject} from '@/lib/wulfram';
type Proposal=ReturnType<typeof previewTerrainComposition>;
export function TerrainCompositionPanel({project,manifest,settings,onPreview,onApply,onEditingChange}:{project:WulframProject;manifest:AssetManifest;settings:SavedStamp['options'];onPreview:(proposal?:Proposal,original?:boolean)=>void;onApply:(source:WulframProject,proposal:Proposal)=>void;onEditingChange:(editing:boolean)=>void}){
 const previewCallback=useRef(onPreview);
 useEffect(()=>{previewCallback.current=onPreview;},[onPreview]);
 useEffect(()=>()=>{previewCallback.current();onEditingChange(false);},[onEditingChange]);
 const importSequence=useRef(0);
 const [loaded]=useState(()=>{let raw:string|null|undefined;try{raw=localStorage.getItem(COMPOSITION_LIBRARY_KEY);return {entries:readCompositionLibrary(raw??'[]'),error:'',raw};}catch(e){return {entries:[] as TerrainComposition[],error:e instanceof Error?e.message:'Saved compositions unavailable.',raw};}});
 const [libraryError,setLibraryError]=useState(loaded.error);
 const [recoveryBackup,setRecoveryBackup]=useState<string|undefined>(()=>{try{return latestLibraryBackup(localStorage,COMPOSITION_LIBRARY_KEY);}catch{return undefined;}});
 const downloadRecovery=()=>{const raw=localStorage.getItem(recoveryBackup??COMPOSITION_LIBRARY_KEY);if(raw===null)throw new Error('Stored recovery data is unavailable.');const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='composition-library-recovery.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const [library,setLibrary]=useState(loaded.entries);
 const [selected,setSelected]=useState('');
 const [search,setSearch]=useState('');
 const [libraryUndo,setLibraryUndo]=useState<TerrainComposition[]>();
 const persist=(entries:TerrainComposition[])=>{const checked=readCompositionLibrary(JSON.stringify(entries));localStorage.setItem(COMPOSITION_LIBRARY_KEY,JSON.stringify(checked));setLibraryUndo(library);setLibrary(checked);};

 const [recipe,setRecipe]=useState<TerrainComposition>({version:1,name:'My terrain composition',stamps:[]});
 const [placement,setPlacement]=useState<CompositionPlacement>({x:project.terrain.worldWidth/2,y:project.terrain.worldHeight/2,rotation:0,safe:true});
 const [showOriginal,setShowOriginal]=useState(false);
 const [review,setReview]=useState<{source:WulframProject;proposal:Proposal}>();
 const [message,setMessage]=useState('Add the current landform settings, then arrange offsets around the composition center.');
 const clear=()=>{setReview(undefined);setShowOriginal(false);onPreview();};
 const change=(next:TerrainComposition)=>{importSequence.current++;clear();setRecipe(next);};
 const attempt=(work:()=>void)=>{try{work();}catch(e){clear();setMessage(e instanceof Error?e.message:'Composition failed.');}};
 return <details className="terrain-composition-panel" onToggle={e=>{if(e.target!==e.currentTarget)return;onEditingChange(e.currentTarget.open);if(!e.currentTarget.open)clear();}}><summary>Compose several landforms</summary>
  <p>While this panel is open, terrain clicks and the single-stamp ghost are paused. Close Compose several landforms to resume single-stamp placement.</p>
  <p>Each added landform copies the current stamp settings below. Steps run from top to bottom. Preview shows their combined surface; Apply creates one map Undo.</p>
  <details className="composition-library"><summary>Saved compositions · {library.length}/20</summary>
   <p>Saved recipes belong to this editor profile and can be reused on other maps. Loading changes the controls, not terrain. Export a recipe for a portable backup. Library Undo is separate from map Undo.</p>
   {libraryError&&<p role="alert">{libraryError} Existing stored data has been retained. Download it for repair, or back it up locally and start an empty library. Your map and current recipe are unchanged.</p>}
   {(libraryError||recoveryBackup)&&<button type="button" onClick={()=>attempt(downloadRecovery)}>Download composition recovery data</button>}
   {libraryError&&<button type="button" disabled={typeof loaded.raw!=='string'} onClick={()=>attempt(()=>{if(typeof loaded.raw!=='string')return;const key=backupAndResetLibrary(localStorage,COMPOSITION_LIBRARY_KEY,loaded.raw,crypto.randomUUID());setRecoveryBackup(key);setLibrary([]);setLibraryUndo(undefined);setSelected('');setLibraryError('');importSequence.current++;setMessage('Original library backed up locally. Empty composition library ready; download the recovery data for repair. Map and current recipe unchanged.');})}>Back up and reset compositions</button>}
   <label>Find saved composition<input value={search} onChange={e=>setSearch(e.target.value)}/></label>
   <label>Saved composition<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Choose a composition…</option>{library.filter(r=>r.name===selected||`${r.name} ${r.stamps.map(s=>s.options.preset).join(' ')}`.toLowerCase().includes(search.toLowerCase().trim())).map(r=><option key={r.name} value={r.name}>{r.name} · {r.stamps.length} landforms</option>)}</select></label>
   <button type="button" disabled={!library.some(r=>r.name===selected)} onClick={()=>{const saved=library.find(r=>r.name===selected);if(saved){change(structuredClone(saved));setMessage('Saved composition loaded. Choose placement and preview before applying.');}}}>Load selected composition</button>
   <button type="button" disabled={!!libraryError||!recipe.stamps.length} onClick={()=>attempt(()=>{persist(saveCompositionEntry(library,recipe));setSelected(recipe.name.trim());setMessage('Composition saved locally. Map unchanged.');})}>Save new composition</button>
   <button type="button" disabled={!!libraryError||!selected||!recipe.stamps.length} onClick={()=>attempt(()=>{persist(saveCompositionEntry(library,recipe,selected));setSelected(recipe.name.trim());setMessage('Selected composition updated. Map unchanged.');})}>Update selected composition</button>
   <button type="button" disabled={!!libraryError||!selected} onClick={()=>attempt(()=>{persist(library.filter(r=>r.name!==selected));setSelected('');setMessage('Saved composition removed. Undo library change restores it.');})}>Remove selected composition</button>
   <button type="button" disabled={!!libraryError||!libraryUndo} onClick={()=>attempt(()=>{if(!libraryUndo)return;localStorage.setItem(COMPOSITION_LIBRARY_KEY,JSON.stringify(libraryUndo));setLibrary(libraryUndo);setLibraryUndo(undefined);setSelected('');setMessage('Composition library change undone. Map unchanged.');})}>Undo composition library change</button>
  </details>
  <label>Composition name<input value={recipe.name} maxLength={60} onChange={e=>change({...recipe,name:e.target.value})}/></label>
  <button type="button" disabled={recipe.stamps.length>=20} onClick={()=>change({...recipe,stamps:[...recipe.stamps,{id:crypto.randomUUID(),offset:[0,0],options:structuredClone(settings)}]})}>Add current landform</button>
  {recipe.stamps.map((stamp,index)=><fieldset key={stamp.id}><legend>{index+1}. {stamp.options.preset} · {stamp.options.amplitude} u · {stamp.options.mirror?'mirrored across map':'single'}</legend>
   {(['X','Y'] as const).map((axis,i)=><label key={axis}>Landform {index+1} offset {axis}<input type="number" min={-20000} max={20000} step={25} value={stamp.offset[i]} onChange={e=>change({...recipe,stamps:recipe.stamps.map(s=>s.id===stamp.id?{...s,offset:s.offset.map((v,k)=>k===i?Number(e.target.value):v) as [number,number]}:s)})}/></label>)}
   <button type="button" onClick={()=>change({...recipe,stamps:recipe.stamps.map(s=>s.id===stamp.id?{...s,options:structuredClone(settings)}:s)})}>Replace landform {index+1} settings</button>
   <button type="button" disabled={!index} onClick={()=>{const stamps=[...recipe.stamps];[stamps[index-1],stamps[index]]=[stamps[index],stamps[index-1]];change({...recipe,stamps});}}>Move landform {index+1} earlier</button>
   <button type="button" onClick={()=>change({...recipe,stamps:recipe.stamps.filter(s=>s.id!==stamp.id)})}>Remove landform {index+1}</button>
  </fieldset>)}
  {(['x','y','rotation'] as const).map(key=><label key={key}>Composition {key}<input type="number" step={key==='rotation'?5:25} value={placement[key]} onChange={e=>{clear();setPlacement({...placement,[key]:Number(e.target.value)});}}/></label>)}
  <label><input type="checkbox" checked={placement.safe} onChange={e=>{clear();setPlacement({...placement,safe:e.target.checked});}}/> Protect generated routes and bases</label>
  <p>Manual mode still enforces saved height protections, locked districts and structure reserves. Per-landform Mirror partner uses the map center. Offsets and dimensions use world units.</p>
  <button type="button" disabled={!recipe.stamps.length} onClick={()=>attempt(()=>{const proposal=previewTerrainComposition(project,manifest,recipe,placement);setReview({source:project,proposal});setShowOriginal(false);onPreview(proposal);setMessage(`${proposal.changedVertices} height vertices changed across ${proposal.steps.length} landforms. Preview only; terrain clicks are paused.`);})}>Preview composition</button>
  <button type="button" disabled={!review||review.source!==project} onClick={()=>{if(!review||review.source!==project)return;setShowOriginal(!showOriginal);onPreview(review.proposal,!showOriginal);}}>{showOriginal?'Show proposed terrain':'Show original terrain'}</button>
  {review&&review.source===project&&<p>{showOriginal?'Viewing original terrain. Show the proposal again before applying.':'Viewing proposed terrain. The saved map is unchanged until Apply.'}</p>}
  <button type="button" disabled={!review||review.source!==project||showOriginal} onClick={()=>attempt(()=>{if(!review||review.source!==project)throw new Error('Map changed. Preview again.');onApply(project,review.proposal);clear();setMessage('Composition applied. Map Undo restores all steps.');})}>Apply composition</button>
  <button type="button" onClick={()=>{clear();setMessage('Preview canceled. Map unchanged.');}}>Cancel composition preview</button>
  {review&&review.source!==project&&<p role="alert">Map changed. Preview again before applying.</p>}
  <output aria-live="polite">{message}</output>
  <button type="button" disabled={!recipe.stamps.length} onClick={()=>attempt(()=>{const valid=readTerrainComposition(JSON.stringify(recipe)),url=URL.createObjectURL(new Blob([JSON.stringify(valid,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='terrain-composition.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Composition settings exported. Map unchanged.');})}>Export composition</button>
  <label>Import composition<input type="file" accept=".json" onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;const sequence=++importSequence.current;try{if(file.size>200000)throw new Error('Composition exceeds 200 KB.');const loaded=readTerrainComposition(await file.text());if(sequence!==importSequence.current)return;change(loaded);setMessage('Composition loaded into controls. Preview before applying.');}catch(error){setMessage(error instanceof Error?error.message:'Import failed.');}}}/></label>
 </details>;
}
