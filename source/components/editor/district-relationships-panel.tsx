'use client';
import {useState} from 'react';
import {readDistricts} from '@/lib/base-districts';
import {readDistrictRelationships,relationshipDistance,type DistrictRelationship} from '@/lib/district-relationships';
import type {StateEntity} from '@/lib/wulfram';

export function DistrictRelationshipsPanel({raw,groupsRaw,entities,onSave}:{raw?:string;groupsRaw?:string;entities:StateEntity[];onSave:(rules:DistrictRelationship[])=>void}){
  const [id,setId]=useState(''),[name,setName]=useState('District spacing'),[from,setFrom]=useState(''),[to,setTo]=useState('');
  const [min,setMin]=useState(0),[max,setMax]=useState(1000),[message,setMessage]=useState('');
  let groups:ReturnType<typeof readDistricts>=[],rules:DistrictRelationship[]=[],error='';
  try{groups=readDistricts(groupsRaw);rules=readDistrictRelationships(raw);}catch(e){error=e instanceof Error?e.message:'Invalid district metadata.';}
  const current=relationshipDistance({id,name,from,to,min,max},groups,entities);
  const attempt=(next:DistrictRelationship[])=>{try{onSave(next);setMessage('Relationships saved. One map Undo restores the previous rules.');return true;}catch(e){setMessage(e instanceof Error?e.message:'Relationship edit failed.');return false;}};
  return <details className="district-relationships-panel"><summary>District relationships</summary>
    <p>Keep two named districts within a chosen horizontal distance range. Centers are the average building positions. Rules apply to this layout during manual edits and arrangement previews; other teams need their own rules.</p>
    <p>This measures centers, not building edges, travel distance, power range or weapon cover. Existing power, spacing and access checks still apply to arrangement previews.</p>
    {error&&<p role="alert">{error} Existing metadata is retained.</p>}
    <label>Relationship name<input aria-label="District relationship name" value={name} maxLength={120} onChange={e=>setName(e.target.value)}/></label>
    <label>First district<select aria-label="First relationship district" value={from} onChange={e=>setFrom(e.target.value)}><option value="">Choose district</option>{groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
    <label>Second district<select aria-label="Second relationship district" value={to} onChange={e=>setTo(e.target.value)}><option value="">Choose district</option>{groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
    <label>Minimum center distance (u)<input aria-label="Minimum district distance" type="number" min={0} max={100000} value={min} onChange={e=>setMin(Number(e.target.value))}/></label>
    <label>Maximum center distance (u)<input aria-label="Maximum district distance" type="number" min={min} max={100000} value={max} onChange={e=>setMax(Number(e.target.value))}/></label>
    <p>{current===undefined?'Choose two complete districts to measure their centers.':`Current center distance: ${current.toFixed(1)} u.`}</p>
    <button type="button" disabled={!!error||!from||!to||from===to} onClick={()=>{const rule={id:id||crypto.randomUUID(),name:name.trim(),from,to,min,max};if(attempt([...rules.filter(r=>r.id!==rule.id),rule]))setId(rule.id);}}>{id?'Update relationship':'Add relationship'}</button>
    <button type="button" onClick={()=>{setId('');setName('District spacing');setFrom('');setTo('');setMin(0);setMax(1000);setMessage('New relationship. Choose two districts.');}}>New relationship</button>
    {rules.map(r=>{const distance=relationshipDistance(r,groups,entities);return <section key={r.id}>
      <p><strong>{r.name}</strong> · {r.min}–{r.max} u · {distance===undefined?'missing district or buildings':`${distance.toFixed(1)} u now`}</p>
      <button type="button" aria-label={`Edit relationship ${r.name}`} onClick={()=>{setId(r.id);setName(r.name);setFrom(r.from);setTo(r.to);setMin(r.min);setMax(r.max);setMessage('Editing saved relationship. Update to apply changes.');}}>Edit</button>
      <button type="button" aria-label={`Remove relationship ${r.name}`} onClick={()=>{if(attempt(rules.filter(rule=>rule.id!==r.id))&&id===r.id)setId('');}}>Remove</button>
    </section>;})}
    <output aria-live="polite">{message}</output>
  </details>;
}
