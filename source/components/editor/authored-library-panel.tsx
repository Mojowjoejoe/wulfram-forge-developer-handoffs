import {useEffect,useRef,useState} from 'react';
import {AUTHORED_LIBRARY_KEY,readAuthoredLibrary,commitAuthoredLibrary,findAuthoredBases,recoverAuthoredLibrary,previewAuthoredLibraryImport,type AuthoredLibrary,type AuthoredLibraryEdit} from '@/lib/authored-base-library';
import type {AuthoredBasePackage} from '@/lib/authored-base-package';

export function AuthoredLibraryPanel({pack,onLoad}:{pack?:AuthoredBasePackage;onLoad:(pack:AuthoredBasePackage)=>void}){
 const fileRef=useRef<HTMLInputElement>(null),importSequence=useRef(0);
 const [pending,setPending]=useState<{raw:string|null;library:AuthoredLibrary;added:number;skipped:number}>();
 const [snapshot,setSnapshot]=useState<{raw:string|null;library?:AuthoredLibrary}>();
 const [undo,setUndo]=useState<{raw:string;entries:AuthoredLibrary['entries']}>();
 const [query,setQuery]=useState(''),[name,setName]=useState(''),[selected,setSelected]=useState(''),[message,setMessage]=useState('');
 const invalidateImport=()=>{importSequence.current++;};
 const reload=()=>{importSequence.current++;setPending(undefined);try{const raw=localStorage.getItem(AUTHORED_LIBRARY_KEY);try{setSnapshot({raw,library:readAuthoredLibrary(raw)});setMessage('');}catch(error){setSnapshot({raw});setMessage(String(error));}}catch(error){setSnapshot(undefined);setMessage(String(error));}};
 useEffect(()=>{const initial=window.setTimeout(reload,0);const refresh=(event:Event)=>{if(event instanceof StorageEvent&&event.key!==null&&event.key!==AUTHORED_LIBRARY_KEY)return;reload();};window.addEventListener('storage',refresh);window.addEventListener('authored-library-changed',refresh);return()=>{invalidateImport();window.clearTimeout(initial);window.removeEventListener('storage',refresh);window.removeEventListener('authored-library-changed',refresh);};},[]);
 const edit=(change:AuthoredLibraryEdit)=>{if(!snapshot?.library)return;importSequence.current++;setPending(undefined);try{const result=commitAuthoredLibrary(localStorage,snapshot.raw,change,crypto.randomUUID());setUndo({raw:result.raw,entries:result.before.entries});setSnapshot({raw:result.raw,library:result.after});setMessage('Library saved.');}catch(error){reload();setMessage(String(error));}};
 const visible=snapshot?.library?findAuthoredBases(snapshot.library,query):[];
 const entry=visible.find(e=>e.id===selected);
 return <details className="inspector-block authored-library-panel"><summary>Saved authored bases</summary>
  <label>Library name<input aria-label="Authored library name" value={name} maxLength={120} onChange={e=>setName(e.target.value)}/></label>
  <div className="personal-base-actions"><button type="button" disabled={!pack||!snapshot?.library||!name.trim()} onClick={()=>{if(pack)edit({operation:'save',entry:{id:crypto.randomUUID(),name:name.trim(),base:pack}});}}>Save loaded base</button><button type="button" onClick={reload}>Reload authored library</button></div>
  <div className="personal-base-actions">
   <button type="button" disabled={!snapshot?.library} onClick={()=>fileRef.current?.click()}>Import authored library</button>
   <button type="button" disabled={!snapshot?.library} onClick={()=>{try{if(!snapshot?.library)return;if(localStorage.getItem(AUTHORED_LIBRARY_KEY)!==snapshot.raw)throw new Error('Library changed. Reload before exporting.');const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot.library)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='wulfram-authored-library.json';a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Authored library exported.');}catch(error){setMessage(String(error));}}}>Export authored library</button>
  </div>
  <input ref={fileRef} type="file" hidden accept=".json,application/json" aria-label="Import authored library file" onChange={event=>{
   const file=event.target.files?.[0];event.target.value='';if(!file||!snapshot?.library)return;const ticket=++importSequence.current;setPending(undefined);
   if(file.size>2_000_000){setMessage('Library file exceeds 2 MB.');return;}
   void file.text().then(raw=>{if(ticket!==importSequence.current)return;try{const library=readAuthoredLibrary(raw),plan=previewAuthoredLibraryImport(snapshot.library!,library);setPending({raw:snapshot.raw,library,added:plan.added,skipped:plan.skipped});setMessage('Import preview ready. Library unchanged.');}catch(error){setMessage(String(error));}}).catch(error=>{if(ticket===importSequence.current)setMessage(String(error));});
  }}/>
  {pending&&<><output>Import preview: {pending.added} new, {pending.skipped} identical skipped.</output><div className="personal-base-actions"><button type="button" disabled={pending.raw!==snapshot?.raw||pending.added===0} onClick={()=>edit({operation:'import',library:pending.library})}>Apply library import</button><button type="button" onClick={()=>{importSequence.current++;setPending(undefined);setMessage('Library import canceled.');}}>Cancel library import</button></div></>}
  {snapshot?.library&&<>
   <label>Search saved bases<input aria-label="Search authored library" type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label>
   <label>Saved base<select aria-label="Saved authored base" value={entry?.id??''} onChange={e=>{setSelected(e.target.value);const found=snapshot.library?.entries.find(item=>item.id===e.target.value);if(found)setName(found.name);}}><option value="">Choose a saved base</option>{visible.map(e=><option key={e.id} value={e.id}>{e.name} | {e.base.geometry.units.length} buildings</option>)}</select></label>
   <div className="personal-base-actions">
    <button type="button" disabled={!entry} onClick={()=>{if(entry){onLoad(structuredClone(entry.base));setMessage('Loaded for placement preview. Map unchanged.');}}}>Load saved base</button>
    <button type="button" disabled={!entry||!name.trim()||entry.name===name.trim()} onClick={()=>{if(entry)edit({operation:'rename',id:entry.id,name:name.trim()});}}>Rename saved base</button>
    <button type="button" disabled={!entry} onClick={()=>{if(entry)edit({operation:'remove',id:entry.id});}}>Delete saved base</button>
    <button type="button" disabled={!undo||undo.raw!==snapshot.raw} onClick={()=>{if(undo)edit({operation:'restore',entries:undo.entries});}}>Undo library change</button>
   </div>
   <p className="field-help">{snapshot.library.entries.length}/50 saved on this device. Library Undo is separate from map Undo. Load a base to export its file.</p>
  </>}
  {snapshot&&!snapshot.library&&snapshot.raw!==null&&<button type="button" onClick={()=>{try{const result=recoverAuthoredLibrary(localStorage,snapshot.raw!,crypto.randomUUID(),crypto.randomUUID());setUndo(undefined);setSnapshot({raw:result.raw,library:result.after});setMessage(`Damaged library backed up as ${result.backupKey}. Empty library ready.`);}catch(error){reload();setMessage(String(error));}}}>Back up damaged library and reset</button>}
  {message&&<output aria-live="polite">{message}</output>}
 </details>;
}
