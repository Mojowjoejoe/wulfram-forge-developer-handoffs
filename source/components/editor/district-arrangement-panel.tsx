'use client';
import {useEffect,useRef,useState} from 'react';
import {previewDistrictArrangements,type DistrictTeamPolicy} from '@/lib/district-arrangements';
import type {WulframProject,AssetManifest,StateEntity} from '@/lib/wulfram';
type Result=Awaited<ReturnType<typeof previewDistrictArrangements>>;
export function DistrictArrangementPanel({project,manifest,conform,onApply}:{project:WulframProject;manifest:AssetManifest;conform:(e:StateEntity,terrain:WulframProject['terrain'])=>void;onApply:(source:WulframProject,candidate:WulframProject)=>void}){
  const [seed,setSeed]=useState('district-001'),[distance,setDistance]=useState(100),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [teamPolicy,setTeamPolicy]=useState<DistrictTeamPolicy>('preserve-unpaired');
  const [preview,setPreview]=useState<{source:WulframProject;result:Result}>();
  const controller=useRef<AbortController|undefined>(undefined);
  useEffect(()=>{controller.current?.abort();controller.current=undefined;const reset=setTimeout(()=>{setBusy(false);setPreview(undefined);},0);return()=>{clearTimeout(reset);controller.current?.abort();};},[project,conform,manifest]);
  const invalidate=()=>{controller.current?.abort();controller.current=undefined;setBusy(false);setPreview(undefined);};
  const current=preview?.source===project?preview.result:undefined;
  return <details className="district-arrangement-panel"><summary>Preview district arrangements</summary>
    <p>Shift eligible districts in the active layout while fixed buildings stay exactly in place. Each district retains its internal spacing and headings. Teams and counts are preserved. Choose independent movement or paired positions below. Terrain is unchanged.</p>
    <label>Team policy<select aria-label="District arrangement team policy" value={teamPolicy} onChange={e=>{invalidate();setTeamPolicy(e.target.value as DistrictTeamPolicy);}}><option value="preserve-unpaired">Independent districts</option><option value="paired-positions">Paired positions (180°)</option></select></label>
    {teamPolicy==='paired-positions'&&<p>Every eligible district needs one matching opposite-team district at rotationally paired XY positions. Both must allow reposition. Shifts are equal and opposite; existing headings stay unchanged and heights fit each side independently. This does not certify symmetric terrain or combat balance.</p>}
    <label>Variation seed<input aria-label="District arrangement seed" value={seed} maxLength={200} onChange={e=>{invalidate();setSeed(e.target.value);}}/></label>
    <label>Maximum center movement (world units)<input aria-label="District arrangement distance" type="number" min={10} max={800} value={distance} onChange={e=>{invalidate();setDistance(Number(e.target.value));}}/></label>
    <button type="button" disabled={busy} onClick={async()=>{invalidate();const c=new AbortController();controller.current=c;setBusy(true);setMessage('Searching up to 24 arrangements…');try{const result=await previewDistrictArrangements(project,manifest,seed,distance,e=>conform(e,project.terrain),c.signal,teamPolicy);if(controller.current!==c)return;setPreview({source:project,result});setMessage(`${result.candidates.length} options found in ${result.attempts} attempts. Preview has not changed the map.`);}catch(error){if(controller.current===c)setMessage(error instanceof Error?error.message:'Preview failed.');}finally{if(controller.current===c)setBusy(false);}}}>Preview arrangements</button>
    <button type="button" disabled={!busy&&!preview} onClick={()=>{invalidate();setMessage('Preview canceled. Map unchanged.');}}>Cancel arrangements</button>
    {current?.candidates.map((candidate,i)=><section key={i} aria-label={`District arrangement ${i+1}`}>
      <svg viewBox={`0 0 ${project.terrain.worldWidth} ${project.terrain.worldHeight}`} aria-label={`Overhead arrangement ${i+1}; cyan moved buildings, gray fixed buildings`} style={{width:'100%',height:150,background:'#101719'}}>{candidate.entities.filter(e=>e.token!=='*').map(e=><circle key={e.id} cx={e.position[0]} cy={project.terrain.worldHeight-e.position[1]} r={60} fill={current.movedIds.includes(e.id)?'#52dcf4':'#a2a8ad'}/>)}</svg>
      <p>Option {i+1}: {current.movedIds.length} buildings shifted. Cyan: moved; gray: fixed. Dots show centers, not building footprints.</p>
      <button type="button" onClick={()=>{try{onApply(project,candidate);invalidate();setMessage('Arrangement applied. One map Undo restores it.');}catch(error){setMessage(error instanceof Error?error.message:'Apply failed.');}}}>Apply arrangement {i+1}</button>
    </section>)}
    {!!current?.failures.length&&<details><summary>Why other attempts failed</summary>{current.failures.map(f=><p key={f.reason}>{f.count} attempts: {f.reason}</p>)}</details>}
    <p>Set permission under Base Workshop → Composition role and variation first. Power, spacing, building bounds, authored areas and sampled service access are checked. Existing validation errors can prevent all options. This is translation of existing districts, not a role-budget solver or game driving proof.</p>
    <output aria-live="polite">{message}</output>
  </details>;
}
