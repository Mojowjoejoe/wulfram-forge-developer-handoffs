import { useState } from 'react';
import { CATALOG, type StateEntity } from '@/lib/wulfram';
import { readDistricts, DISTRICT_ROLES, districtVariationStatus, type BaseDistrict, type DistrictTransform } from '@/lib/base-districts';
export function BaseDistrictPanel({ entities, selected, onSelect, focusedId, raw, onTransform, onSave, onSaveModule }: {
  entities: StateEntity[]; selected: string[]; onSelect: (ids: string[]) => void; focusedId?: string; raw?: string;
  onTransform: (operation: DistrictTransform) => void; onSave: (groups: BaseDistrict[], allowUnlock?:boolean) => void;
  onSaveModule: (name:string) => void;
}) {
  const [query,setQuery]=useState(''),[team,setTeam]=useState('all'),[name,setName]=useState('My district');
  const [dx,setDx]=useState(0),[dy,setDy]=useState(0),[angle,setAngle]=useState(0),[message,setMessage]=useState('');
  const [editingId,setEditingId]=useState('');
  const [role,setRole]=useState<NonNullable<BaseDistrict['role']>>('mixed'),[variation,setVariation]=useState<NonNullable<BaseDistrict['variation']>>('fixed');
  let groups: BaseDistrict[]=[],error='';try{groups=readDistricts(raw);}catch(e){error=e instanceof Error?e.message:'Invalid districts.';}
  const label=(e:StateEntity)=>`${CATALOG.find(c=>c.token===e.token)?.label??e.token} · team ${e.team} · ${e.id.slice(-8)}`;
  const visible=entities.filter(e=>e.token!=='*'&&(team==='all'||e.team===Number(team))&&label(e).toLowerCase().includes(query.toLowerCase()));
  const attempt=(action:()=>void)=>{try{action();setMessage('Operation applied. Map Undo restores it. Recheck power and access.');}catch(e){setMessage(e instanceof Error?e.message:'District operation failed.');}};
  return <details className="district-panel"><summary>Base Workshop · districts</summary>
    <p>Select buildings below or add the focused building. Move and rotate around the selection center; duplicate creates new IDs. Changes affect exactly this selection in the active layout, with one Undo step. Other teams are not automatically mirrored.</p>
    <label>Filter buildings<input aria-label="District building search" value={query} onChange={e=>setQuery(e.target.value)} /></label>
    <label>Team<select aria-label="District team filter" value={team} onChange={e=>setTeam(e.target.value)}><option value="all">All teams</option><option value="1">Team 1</option><option value="2">Team 2</option><option value="0">Neutral</option></select></label>
    <div className="district-actions"><button type="button" onClick={()=>onSelect(visible.map(e=>e.id))}>Select listed buildings</button><button type="button" onClick={()=>onSelect([])}>Clear selection</button><button type="button" disabled={!focusedId||!entities.some(e=>e.id===focusedId&&e.token!=='*')} onClick={()=>{if(focusedId)onSelect([...new Set([...selected,focusedId])]);}}>Add focused building</button></div>
    <div className="district-buildings">{visible.map(e=><label key={e.id}><input type="checkbox" aria-label={`Select district building ${e.id}`} checked={selected.includes(e.id)} onChange={event=>onSelect(event.target.checked?[...selected,e.id]:selected.filter(id=>id!==e.id))} />{label(e)}</label>)}</div>
    <output>{selected.length} selected</output>
    <details><summary>Align and distribute</summary>
      <div className="district-actions">{([['align-x','Align X centers'],['align-y','Align Y centers'],['space-x','Distribute along X'],['space-y','Distribute along Y']] as const).map(([arrange,label])=><button key={arrange} type="button" disabled={selected.length<(arrange.startsWith('space')?3:2)} onClick={()=>attempt(()=>onTransform({dx:0,dy:0,degrees:0,duplicate:false,arrange}))}>{label}</button>)}</div>
      <p>Align sets the chosen coordinate to the selection average. Distribute uses equal center spacing between the two outer buildings, preserving their order. The other coordinate and headings stay fixed; heights refit to terrain. These actions ignore movement fields and change internal spacing. Check for overlaps and recheck power and access. Each action has one Undo step; locked buildings remain protected.</p>
    </details>
    <div className="district-values">{([['Move X',dx,setDx],['Move Y',dy,setDy],['Rotate degrees',angle,setAngle]] as const).map(([label,value,set])=><label key={label}>{label}<input aria-label={`District ${label}`} type="number" step={label==='Rotate degrees'?15:10} value={value} onChange={e=>set(Number(e.target.value))} /></label>)}</div>
    <div className="district-actions"><button type="button" disabled={!selected.length} onClick={()=>attempt(()=>onTransform({dx,dy,degrees:angle,duplicate:false}))}>Transform selection</button><button type="button" disabled={!selected.length} onClick={()=>attempt(()=>onTransform({dx,dy,degrees:angle,duplicate:true}))}>Duplicate selection</button></div>
    <div className="district-actions">{(['x','y'] as const).map(axis=><button key={axis} type="button" disabled={!selected.length} onClick={()=>attempt(()=>onTransform({dx:0,dy:0,degrees:0,duplicate:false,mirror:axis}))}>Mirror {axis.toUpperCase()} positions</button>)}</div>
    <p>Mirror reverses the selected X or Y positions around their center and reflects building headings. It ignores the movement fields, keeps teams, and leaves original model geometry unchanged.</p>
    <label>District name<input aria-label="District name" value={name} maxLength={120} onChange={e=>setName(e.target.value)} /></label>
    <button type="button" disabled={!selected.length||!name.trim()} onClick={()=>{try{onSaveModule(name);setMessage('Module saved in My districts in the Base library. Maps are unchanged. Manage or export it with the personal library controls.');}catch(e){setMessage(e instanceof Error?e.message:'Could not save module.');}}}>Save selection as module</button>
    <p>Modules keep relative positions and headings for one team, up to 120 buildings. Placement refits heights and tilt to terrain. Find modules under Browse base library → My districts; choose a destination team before placing.</p>
    <button type="button" disabled={!selected.length||!name.trim()||!!error||groups.length>=100} onClick={()=>attempt(()=>{onSave([...groups,{id:crypto.randomUUID(),name:name.trim(),entityIds:selected}]);})}>Save named district</button>
    <label>District to update<select aria-label="District to update" value={groups.some(g=>g.id===editingId)?editingId:''} onChange={e=>{setEditingId(e.target.value);const group=groups.find(g=>g.id===e.target.value);if(group){setName(group.name);setRole(group.role??'mixed');setVariation(group.variation??'fixed');}}}><option value="">Choose a saved district</option>{groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
    <div className="district-actions"><button type="button" disabled={!groups.some(g=>g.id===editingId)||!name.trim()||!!error} onClick={()=>attempt(()=>onSave(groups.map(g=>g.id===editingId?{...g,name:name.trim()}:g)))}>Rename district</button><button type="button" disabled={!groups.some(g=>g.id===editingId)||!selected.length||!!error} onClick={()=>attempt(()=>onSave(groups.map(g=>g.id===editingId?{...g,entityIds:selected}:g)))}>Replace district members</button></div>
    <details><summary>Composition role and variation</summary>
      <label>Purpose<select aria-label="District composition role" value={role} onChange={e=>setRole(e.target.value as typeof role)}>{DISTRICT_ROLES.map(r=><option key={r}>{r}</option>)}</select></label>
      <label>Generation permission<select aria-label="District variation permission" value={variation} onChange={e=>setVariation(e.target.value as typeof variation)}><option value="fixed">Keep fixed</option><option value="reposition">Allow reposition preview</option></select></label>
      <button type="button" disabled={!groups.some(g=>g.id===editingId)||!!error} onClick={()=>attempt(()=>onSave(groups.map(g=>g.id===editingId?{...g,role,variation}:g)))}>Save district composition</button>
      <p>Choose a saved district above first. Purpose describes your design intent; it does not add or validate unit roles. Permission is saved for composition previews; no reroll is performed here. Existing districts stay fixed by default. Locks and shared fixed membership take precedence. These settings do not restrict manual editing; use Lock for that.</p>
      {!error&&districtVariationStatus(groups,entities).map(status=><p key={status.id}>{groups.find(g=>g.id===status.id)?.name}: {status.reason}</p>)}
    </details>
    <p>Choose a saved district above to rename it or replace its membership with the current selection. Replacing members repairs a district with missing buildings; neither action moves buildings.</p>
    <p>Lock a named district to protect its buildings, membership and supporting terrain heights. Unlock before changing them. Texture painting and edits elsewhere remain available. Undo can restore an earlier unlocked state.</p>
    {groups.map(g=><button key={g.id} type="button" aria-label={`${g.locked?'Unlock':'Lock'} district ${g.name}`} onClick={()=>attempt(()=>onSave(groups.map(d=>d.id===g.id?{...d,locked:!d.locked}:d),!!g.locked))}>{g.locked?'🔒 Unlock':'Lock'} {g.name}</button>)}
    {error&&<p role="alert">{error} Existing metadata was retained.</p>}
    {groups.map(g=><div className="district-actions" key={g.id}><button type="button" onClick={()=>{if(g.entityIds.some(id=>!entities.some(e=>e.id===id))){setMessage('This district references missing buildings. Restore them or remove the district record.');return;}onSelect(g.entityIds);setName(g.name);}}>{g.name} · {g.entityIds.length} buildings</button><button type="button" aria-label={`Remove district ${g.name}`} onClick={()=>attempt(()=>onSave(groups.filter(d=>d.id!==g.id)))}>Remove district</button></div>)}
    <p>Structures conform individually to the terrain. Bounds checks use structure centers; collision, power and route validity still require inspection. Named districts travel with this layout in map exports.</p>
    <output aria-live="polite">{message}</output>
  </details>;
}
