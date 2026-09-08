import {MultipleEntrancesPanel} from './multiple-entrances-panel';
import {useState,type ReactNode} from 'react';
import {BUILD_AREAS_KEY,readBuildAreas} from '@/lib/build-areas';
import {ENTRANCE_ROUTING_KEY,readEntranceRouting,type LegacyEntranceRouting} from '@/lib/entrance-routing';
import {editEntranceRouting} from '@/lib/mcp-commands';
import type {AssetManifest,WulframProject} from '@/lib/wulfram';

function LegacyEntrancesPanel({project,manifest,onApply,renderPreview}:{project:WulframProject;manifest:AssetManifest;onApply:(source:WulframProject,next:WulframProject)=>void;renderPreview:(project:WulframProject)=>ReactNode}){
 const layout=project.baseLayouts.find(l=>l.id===project.activeBaseLayoutId);
 let saved:LegacyEntranceRouting|undefined,error='',corridors:ReturnType<typeof readBuildAreas>=[];
 try{const policy=readEntranceRouting(layout?.metadata[ENTRANCE_ROUTING_KEY]);if(policy?.version===2)throw new Error('Open the multiple entrances panel to edit this policy.');saved=policy;corridors=readBuildAreas(layout?.metadata[BUILD_AREAS_KEY]).filter(a=>a.kind==='corridor');}catch(e){error=e instanceof Error?e.message:'Invalid entrance rules.';}
 const [draft,setDraft]=useState<{source:WulframProject;bindings:LegacyEntranceRouting['bindings'];preview?:WulframProject;message?:string}>({source:project,bindings:saved?.bindings??[]});
 const current=draft.source===project?draft:{source:project,bindings:saved?.bindings??[]};
 const update=(team:1|2,corridorId:string,direction:'forward'|'reverse')=>setDraft({source:project,bindings:[...current.bindings.filter(b=>b.team!==team),...(corridorId?[{team,corridorId,direction}]:[])]});
 return <section className="inspector-block entrance-routing-panel" aria-label="Base entrances">
  <p className="section-label">BASE ENTRANCES</p>
  {([1,2] as const).map(team=>{const binding=current.bindings.find(b=>b.team===team);return <div key={team}>
   <label className="field-help" style={{display:'block',marginBottom:10}}>Team {team} entrance<select className="template-select" style={{display:'block',width:'100%'}} aria-label={`Team ${team} entrance`} value={binding?.corridorId??''} onChange={e=>update(team,e.target.value,binding?.direction??'forward')}><option value="">Automatic approach</option>{binding&&!corridors.some(a=>a.id===binding.corridorId)&&<option value={binding.corridorId}>Missing corridor: {binding.corridorId}</option>}{corridors.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
   {binding&&<label className="field-help" style={{display:'block',marginBottom:10}}>Team {team} travel direction<select className="template-select" style={{display:'block',width:'100%'}} aria-label={`Team ${team} travel direction`} value={binding.direction} onChange={e=>update(team,binding.corridorId,e.target.value as 'forward'|'reverse')}><option value="forward">First point → last point</option><option value="reverse">Last point → first point</option></select></label>}
  </div>;})}
  <p className="field-help">Choose a saved corridor and its direction from battlefield toward base. Preview checks the complete route to service pads. Later terrain or building edits may require another check.</p>
  <button type="button" className="secondary-action" onClick={()=>{try{const next=editEntranceRouting(project,project.activeBaseLayoutId,current.bindings.length?{version:1,bindings:current.bindings}:null,manifest).project;setDraft({...current,preview:next,message:'Entrance choices ready. Review routes below; Apply saves one Undo step.'});}catch(e){setDraft({...current,preview:undefined,message:e instanceof Error?e.message:'Entrance check failed.'});}}}>Preview entrances</button>
  <button type="button" className="secondary-action" disabled={!current.preview} onClick={()=>{if(current.preview)onApply(project,current.preview);}}>Apply entrances</button>
  <button type="button" className="secondary-action" onClick={()=>setDraft({source:project,bindings:saved?.bindings??[]})}>Reset entrance choices</button>
  {(error||current.message)&&<output className="field-help" style={{display:'block',marginTop:8}}>{current.message??error}</output>}
  {current.preview&&renderPreview(current.preview)}
 </section>;
}

export function EntranceRoutingPanel(props:Parameters<typeof LegacyEntrancesPanel>[0]){
 const [choice,setChoice]=useState<{source:WulframProject;multiple:boolean}>({source:props.project,multiple:false});
 const layout=props.project.baseLayouts.find(l=>l.id===props.project.activeBaseLayoutId);
 let savedMultiple=false;try{savedMultiple=readEntranceRouting(layout?.metadata[ENTRANCE_ROUTING_KEY])?.version===2;}catch{/* Legacy panel presents malformed-policy diagnostics. */}
 const multiple=savedMultiple||(choice.source===props.project&&choice.multiple);
 return <>{multiple?<MultipleEntrancesPanel {...props}/>:<LegacyEntrancesPanel {...props}/>}
 {!savedMultiple&&<button type="button" className="secondary-action" onClick={()=>setChoice({source:props.project,multiple:!multiple})}>{multiple?'Back to single entrances':'Design multiple entrances'}</button>}</>;
}
