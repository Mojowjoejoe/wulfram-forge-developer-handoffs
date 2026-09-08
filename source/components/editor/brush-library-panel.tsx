'use client';
import {backupAndResetLibrary,latestLibraryBackup} from '@/lib/library-recovery';
import {useState, useRef, useEffect} from 'react';
import {BRUSH_LIBRARY_KEY,readBrushLibrary,saveBrush,mergeBrushLibraries,type BrushSettings,type SavedBrush} from '@/lib/brush-library';

const toolLabels: Record<BrushSettings['tool'], string> = {sculpt:'Raise',lower:'Lower',level:'Flatten',smooth:'Smooth',paint:'Paint texture',stamp:'Set height'};

export function BrushLibraryPanel({settings,onLoad}:{settings:BrushSettings;onLoad:(settings:BrushSettings)=>void}) {
  const [loaded] = useState(()=>{let raw:string|null|undefined;try{raw=localStorage.getItem(BRUSH_LIBRARY_KEY);return {entries:readBrushLibrary(raw??'[]'),error:'',raw};}catch(e){return {entries:[] as SavedBrush[],error:e instanceof Error?e.message:'Library unavailable.',raw};}});
  const [libraryError,setLibraryError]=useState(loaded.error),[recoveryBackup,setRecoveryBackup]=useState<string|undefined>(()=>{try{return latestLibraryBackup(localStorage,BRUSH_LIBRARY_KEY);}catch{return undefined;}});
  const [entries,setEntries]=useState(loaded.entries),[name,setName]=useState('My brush'),[selected,setSelected]=useState(''),[search,setSearch]=useState('');
  const [undo,setUndo]=useState<SavedBrush[]>(),[message,setMessage]=useState('');
  const revision=useRef(0),input=useRef<HTMLInputElement>(null);
  useEffect(()=>()=>{revision.current++;},[]);
  const attempt=(work:()=>void)=>{try{work();}catch(e){setMessage(e instanceof Error?e.message:'Brush library operation failed.');}};
  const persist=(next:SavedBrush[])=>{const checked=readBrushLibrary(JSON.stringify(next));localStorage.setItem(BRUSH_LIBRARY_KEY,JSON.stringify(checked));revision.current++;setUndo(entries);setEntries(checked);};
  const download=()=>attempt(()=>{const raw=localStorage.getItem(BRUSH_LIBRARY_KEY)??'[]';const data=libraryError?raw:JSON.stringify({format:'wulfram-brush-library',version:1,entries},null,2);const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=libraryError?'brush-library-recovery.json':'brush-library.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  return <details className="brush-library-panel"><summary>Saved manual brushes · {entries.length}/30</summary>
    <p>Save tool, size, strength, shape, edge profile, exact height and texture. Loading changes brush controls only; your current selection stays in place. Flatten still samples the first clicked height.</p>
    {libraryError&&<p role="alert">{libraryError} Stored data is retained. Writes are disabled; Export downloads the original data for recovery. You can also back it up locally and start an empty library.</p>}
    {libraryError&&<button type="button" disabled={typeof loaded.raw!=='string'} onClick={()=>attempt(()=>{if(typeof loaded.raw!=='string')return;const key=backupAndResetLibrary(localStorage,BRUSH_LIBRARY_KEY,loaded.raw,crypto.randomUUID());setRecoveryBackup(key);revision.current++;setEntries([]);setUndo(undefined);setSelected('');setLibraryError('');setMessage('Original brush library backed up locally. Empty library ready; map and brush controls unchanged.');})}>Back up and reset brushes</button>}
    {recoveryBackup&&<button type="button" onClick={()=>attempt(()=>{const raw=localStorage.getItem(recoveryBackup);if(raw===null)throw new Error('Recovery backup unavailable.');const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='brush-library-recovery.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);})}>Download brush recovery backup</button>}
    <label>Brush name<input maxLength={60} value={name} onChange={e=>setName(e.target.value)}/></label>
    <label>Find saved brush<input value={search} onChange={e=>setSearch(e.target.value)}/></label>
    <label>Saved brush<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Choose a brush…</option>{entries.filter(e=>e.name===selected||`${e.name} ${toolLabels[e.settings.tool]} ${e.settings.shape}`.toLowerCase().includes(search.toLowerCase().trim())).map(e=><option key={e.name} value={e.name}>{e.name} · {toolLabels[e.settings.tool]} · {e.settings.radius} u</option>)}</select></label>
    <button type="button" disabled={!selected} onClick={()=>attempt(()=>{const entry=entries.find(e=>e.name===selected);if(!entry)throw new Error('Choose a saved brush.');onLoad({...entry.settings});setName(entry.name);setMessage('Brush loaded. Terrain unchanged.');})}>Load selected brush</button>
    <button type="button" disabled={!!libraryError} onClick={()=>attempt(()=>{persist(saveBrush(entries,{name,settings}));setSelected(name.trim());setMessage('Brush saved in this editor profile. Export for a portable copy.');})}>Save new brush</button>
    <button type="button" disabled={!!libraryError||!selected} onClick={()=>attempt(()=>{persist(saveBrush(entries,{name,settings},selected));setSelected(name.trim());setMessage('Selected brush updated.');})}>Update selected brush</button>
    <button type="button" disabled={!!libraryError||!selected} onClick={()=>attempt(()=>{persist(entries.filter(e=>e.name!==selected));setSelected('');setMessage('Brush removed. Library Undo restores it.');})}>Remove selected brush</button>
    <button type="button" disabled={!!libraryError||!undo} onClick={()=>attempt(()=>{if(!undo)return;localStorage.setItem(BRUSH_LIBRARY_KEY,JSON.stringify(undo));revision.current++;setEntries(undo);setUndo(undefined);setSelected('');setMessage('Brush library change undone. Map Undo is separate.');})}>Undo brush library change</button>
    <button type="button" onClick={download}>Export brush library</button>
    <button type="button" disabled={!!libraryError} onClick={()=>input.current?.click()}>Import brush library</button>
    <input ref={input} type="file" accept=".json,application/json" hidden aria-label="Import brush library file" onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;const start=++revision.current;try{if(file.size>200000)throw new Error('Brush library exceeds 200 KB.');const incoming=readBrushLibrary(await file.text());if(start!==revision.current)throw new Error('Library changed while reading the file. Import again.');persist(mergeBrushLibraries(entries,incoming));setMessage('Brushes imported. Existing names are never silently overwritten.');}catch(error){setMessage(error instanceof Error?error.message:'Import failed.');}}}/>
    <output>{message}</output>
  </details>;
}
