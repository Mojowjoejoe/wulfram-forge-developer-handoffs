 'use client';
import {useState} from 'react';
import {REPAIR_FIELDS,authoringRepairDraft,previewAuthoringRepair} from '@/lib/authoring-repair';
import type {AssetManifest,WulframProject} from '@/lib/wulfram';
export function AuthoringRepairPanel({project,manifest,onApply,onBackup}:{project:WulframProject;manifest:AssetManifest;onApply:(source:WulframProject,draft:Record<string,string>)=>void;onBackup:()=>void}){
 const [draft,setDraft]=useState(()=>authoringRepairDraft(project)),[source,setSource]=useState(project),[review,setReview]=useState<string[]>(),[message,setMessage]=useState('');
 const stale=source!==project;
 return <details className="authoring-repair-panel"><summary>Advanced saved-rule repair</summary>
 <p>Repair all four categories together in the active layout. JSON arrays use the existing rule schemas. An empty field explicitly removes that category, including any locks or protections it contains. Buildings, terrain, other layouts and unrelated metadata stay unchanged.</p>
 <p>Download the original map first for a portable backup. Preview checks the proposed rules against existing buildings. Apply records one map Undo; Undo restores the original rules, including invalid data.</p>
 <button type="button" onClick={onBackup}>Download original repair backup</button>
 <button type="button" onClick={()=>{setDraft(authoringRepairDraft(project));setSource(project);setReview(undefined);setMessage('Loaded the current saved rules.');}}>Load current repair rules</button>
 {stale&&<p role="alert">Map changed. Load current repair rules before previewing again.</p>}
 {REPAIR_FIELDS.map(f=><label key={f.key}>{f.label} JSON<textarea aria-label={`Repair ${f.label}`} rows={4} value={draft[f.key]} maxLength={100000} onChange={e=>{setDraft(d=>({...d,[f.key]:e.target.value}));setReview(undefined);setMessage('Draft changed. Preview again before Apply.');}}/></label>)}
 <button type="button" disabled={stale} onClick={()=>{try{const result=previewAuthoringRepair(project,draft,manifest);setReview(result.changed);setMessage('Preview passed for saved authoring rules. No map edits applied.');}catch(e){setReview(undefined);setMessage(e instanceof Error?e.message:'Repair preview failed.');}}}>Preview rule repair</button>
 {review&&<p>Categories to replace or remove: {review.join(', ')}.</p>}
 <button type="button" disabled={stale||!review} onClick={()=>{try{onApply(source,draft);setReview(undefined);setMessage('Rule repair applied. Map Undo restores the previous rules.');}catch(e){setMessage(e instanceof Error?e.message:'Repair failed.');}}}>Apply reviewed rule repair</button>
 <output aria-live="polite">{message}</output></details>;
}
