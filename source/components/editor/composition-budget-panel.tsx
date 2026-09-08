 'use client';
import {useState} from 'react';
import {COMPOSITION_ROLES,compositionCount,readCompositionBudgets,type CompositionBudget,type CompositionRole} from '@/lib/composition-budgets';
import type {StateEntity} from '@/lib/wulfram';
export function CompositionBudgetPanel({raw,entities,onSave}:{raw?:string;entities:StateEntity[];onSave:(rules:CompositionBudget[])=>void}){
 const [team,setTeam]=useState<1|2>(1),[role,setRole]=useState<CompositionRole>('all'),[min,setMin]=useState(0),[max,setMax]=useState(100),[message,setMessage]=useState('');
 let rules:CompositionBudget[]=[],error='';try{rules=readCompositionBudgets(raw);}catch(e){error=e instanceof Error?e.message:'Invalid composition limits.';}
 const save=(next:CompositionBudget[])=>{try{onSave(next);setMessage('Composition limits saved. One map Undo restores the previous limits.');}catch(e){setMessage(e instanceof Error?e.message:'Could not save composition limits.');}};
 return <details className="composition-budget-panel"><summary>Composition counts and limits</summary>
 <p>Count the current layout by team and place limits on its mix. Limits block edits that would violate them; they do not add buildings or reroll a base. Set a minimum only after placing the required buildings.</p>
 <p>Counts include inactive placed units. Cargo is not a deployed service or defense. All placed records includes unknown non-metadata records. Counts do not establish power, service capacity, access or combat strength.</p>
 {error&&<p role="alert">{error} Existing metadata is retained.</p>}
 <table><caption>Current placed counts</caption><thead><tr><th>Role</th><th>Team 1</th><th>Team 2</th></tr></thead><tbody>{COMPOSITION_ROLES.map(r=><tr key={r.id}><th>{r.label}</th><td>{compositionCount(entities,1,r.id)}</td><td>{compositionCount(entities,2,r.id)}</td></tr>)}</tbody></table>
 <label>Limit team<select value={team} onChange={e=>setTeam(Number(e.target.value) as 1|2)}><option value={1}>Team 1</option><option value={2}>Team 2</option></select></label>
 <label>Counted role<select value={role} onChange={e=>setRole(e.target.value as CompositionRole)}>{COMPOSITION_ROLES.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}</select></label>
 <label>Minimum count<input type="number" min={0} max={10000} value={min} onChange={e=>setMin(Number(e.target.value))}/></label>
 <label>Maximum count<input type="number" min={min} max={10000} value={max} onChange={e=>setMax(Number(e.target.value))}/></label>
 <button type="button" disabled={!!error} onClick={()=>save([...rules.filter(r=>r.team!==team||r.role!==role),{team,role,min,max}])}>Save composition limit</button>
 {rules.map(r=><section key={`${r.team}:${r.role}`}><p>Team {r.team} · {COMPOSITION_ROLES.find(v=>v.id===r.role)!.label} · {r.min}–{r.max}</p>
 <button type="button" aria-label={`Edit team ${r.team} ${r.role} limit`} onClick={()=>{setTeam(r.team);setRole(r.role);setMin(r.min);setMax(r.max);setMessage('Editing saved limit. Save to apply.');}}>Edit</button>
 <button type="button" aria-label={`Remove team ${r.team} ${r.role} limit`} onClick={()=>save(rules.filter(v=>v!==r))}>Remove</button></section>)}
 <output aria-live="polite">{message}</output></details>;
}
