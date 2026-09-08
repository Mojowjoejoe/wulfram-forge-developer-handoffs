import {useState,type ReactNode} from 'react';
import {BUILD_AREAS_KEY,readBuildAreas} from '@/lib/build-areas';
import {ENTRANCE_ROUTING_KEY,readEntranceRouting,type EntranceRouting} from '@/lib/entrance-routing';
import type {EntranceSocketPolicy,EntranceSocket} from '@/lib/entrance-sockets';
import {editEntranceRouting} from '@/lib/mcp-commands';
import type {AssetManifest,WulframProject} from '@/lib/wulfram';
type Props={project:WulframProject;manifest:AssetManifest;onApply:(source:WulframProject,next:WulframProject)=>void;renderPreview:(project:WulframProject)=>ReactNode};
export function MultipleEntrancesPanel({project,manifest,onApply,renderPreview}:Props){
 const layout=project.baseLayouts.find(l=>l.id===project.activeBaseLayoutId);
 let saved:EntranceRouting|undefined,error='',corridors:ReturnType<typeof readBuildAreas>=[];
 try{saved=readEntranceRouting(layout?.metadata[ENTRANCE_ROUTING_KEY]);corridors=readBuildAreas(layout?.metadata[BUILD_AREAS_KEY]).filter(a=>a.kind==='corridor');}catch(e){error=e instanceof Error?e.message:'Invalid saved entrance data.';}
 const initial:EntranceSocketPolicy=saved?.version===2?saved:{version:2,sockets:[]};
 const [draft,setDraft]=useState<{source:WulframProject;policy:EntranceSocketPolicy;preview?:WulframProject;message?:string}>({source:project,policy:initial});
 const current=draft.source===project?draft:{source:project,policy:initial};
 const change=(sockets:EntranceSocket[])=>setDraft({source:project,policy:{version:2,sockets}});
 const update=(id:string,edit:Partial<EntranceSocket>)=>change(current.policy.sockets.map(s=>s.id===id?{...s,...edit}:s));
 const options=(selected:string)=> <><option value="">Choose corridor</option>{selected&&!corridors.some(a=>a.id===selected)&&<option value={selected}>Missing: {selected}</option>}{corridors.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</>;
 return <section className="inspector-block multiple-entrances-panel" aria-label="Multiple base entrances">
 <p className="section-label">MULTIPLE ENTRANCES</p>
 {error&&<output role="alert" className="field-help">{error} Repair the saved entrance or corridor data before previewing.</output>}
 <p className="field-help">Up to three exits per team. Each exit has a local mouth corridor; connecting a lane is optional. Directions run from battlefield toward the base.</p>
 {([1,2] as const).map(team=><div key={team}><p>Team {team}</p>
 {current.policy.sockets.filter(s=>s.team===team).map(socket=><fieldset key={socket.id}><legend>{socket.name||'Unnamed entrance'} · {socket.approach?'Bound':'Unbound'}</legend>
 <label>Name<input aria-label={`Entrance ${socket.id} name`} maxLength={60} value={socket.name} onChange={e=>update(socket.id,{name:e.target.value})}/></label>
 <label>Exit mouth<select aria-label={`Entrance ${socket.id} mouth`} value={socket.mouthCorridorId} onChange={e=>update(socket.id,{mouthCorridorId:e.target.value})}>{options(socket.mouthCorridorId)}</select></label>
 <label>Mouth direction<select aria-label={`Entrance ${socket.id} mouth direction`} value={socket.mouthDirection} onChange={e=>update(socket.id,{mouthDirection:e.target.value as EntranceSocket['mouthDirection']})}><option value="forward">First → last point</option><option value="reverse">Last → first point</option></select></label>
 <label>Lane approach<select aria-label={`Entrance ${socket.id} approach`} value={socket.approach?.corridorId??''} onChange={e=>update(socket.id,{approach:e.target.value?{corridorId:e.target.value,direction:socket.approach?.direction??'forward'}:undefined})}><option value="">Unbound — no lane connection</option>{corridors.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}{socket.approach&&!corridors.some(a=>a.id===socket.approach!.corridorId)&&<option value={socket.approach.corridorId}>Missing: {socket.approach.corridorId}</option>}</select></label>
 {socket.approach&&<label>Approach direction<select aria-label={`Entrance ${socket.id} approach direction`} value={socket.approach.direction} onChange={e=>update(socket.id,{approach:{...socket.approach!,direction:e.target.value as 'forward'|'reverse'}})}><option value="forward">First → last point</option><option value="reverse">Last → first point</option></select></label>}
 <button type="button" onClick={()=>change(current.policy.sockets.filter(s=>s.id!==socket.id))}>Remove {socket.name||'entrance'}</button>
 </fieldset>)}
 <button type="button" disabled={!!error||current.policy.sockets.filter(s=>s.team===team).length>=3} onClick={()=>change([...current.policy.sockets,{id:crypto.randomUUID(),name:`Team ${team} exit ${current.policy.sockets.filter(s=>s.team===team).length+1}`,team,mouthCorridorId:'',mouthDirection:'forward'}])}>Add team {team} entrance</button></div>)}
 <p className="field-help">The approach must end where the mouth begins. Preview checks all exits and pad access. Automatic service connectors do not bind an unbound exit to a lane.</p>
 {saved?.version===1&&<p className="field-help">Applying replaces the current single-entrance policy.</p>}
 <button type="button" disabled={!!error} onClick={()=>{try{const next=editEntranceRouting(project,project.activeBaseLayoutId,current.policy.sockets.length?current.policy:null,manifest).project;setDraft({...current,preview:next,message:current.policy.sockets.length?'Entrances ready. Review the routes before applying.':'Clear all entrance rules and restore automatic approaches.'});}catch(error){setDraft({...current,preview:undefined,message:error instanceof Error?error.message:'Entrance preview failed.'});}}}>Preview entrances</button>
 <button type="button" disabled={!!error||!current.preview} onClick={()=>{if(current.preview)onApply(project,current.preview);}}>Apply entrances</button>
 <button type="button" onClick={()=>setDraft({source:project,policy:initial})}>Reset entrance choices</button>
 {!error&&current.message&&<output className="field-help">{current.message}</output>}{!error&&current.preview&&renderPreview(current.preview)}
 </section>;
}
