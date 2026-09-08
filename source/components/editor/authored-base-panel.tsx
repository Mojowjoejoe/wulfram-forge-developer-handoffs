import {AuthoredLibraryPanel} from './authored-library-panel';
import {useEffect,useRef,useState} from 'react';
import {captureAuthoredBase,exportAuthoredBase,parseAuthoredBase,type AuthoredBasePackage} from '@/lib/authored-base-package';
import {placeAuthoredBase,type AuthoredBasePlacement} from '@/lib/authored-base-placement';
import {catalogFor,type AssetManifest,type WulframProject} from '@/lib/wulfram';

export interface AuthoredPreview {source:WulframProject;project:WulframProject}
export function AuthoredBasePanel({initialPack,project,manifest,onPreview,onApply,onFocus}:{initialPack?:AuthoredBasePackage;project:WulframProject;manifest:AssetManifest;onPreview:(preview:AuthoredPreview|undefined)=>void;onApply:(preview:AuthoredPreview)=>void;onFocus:(preview:AuthoredPreview,team:number,view:'overhead'|'ground'|'detail',entityId?:string)=>void}){
  const [pack,setPack]=useState<AuthoredBasePackage|undefined>(initialPack);
  const [frame,setFrame]=useState({origin:[project.terrain.worldWidth/2,project.terrain.worldHeight/2,initialPack?.sourceFrame.origin[2]??0] as [number,number,number],yaw:initialPack?.sourceFrame.yaw??0});
  const [terrainMode,setTerrainMode]=useState<'preserve'|'conform'>('preserve');
  const [preview,setPreview]=useState<AuthoredPreview>();
  const [message,setMessage]=useState('');
  const [focusId,setFocusId]=useState('');
  const fileRef=useRef<HTMLInputElement>(null),sequence=useRef(0);
  useEffect(()=>()=>{sequence.current++;onPreview(undefined);},[onPreview]);
  useEffect(()=>{sequence.current++;},[project]);
  const clear=()=>{setPreview(undefined);onPreview(undefined);};
  const attempt=(work:()=>void)=>{try{work();}catch(error){clear();setMessage(error instanceof Error?error.message:'Authored base operation failed.');}};
  const load=(value:AuthoredBasePackage)=>{clear();setPack(value);setFrame({origin:[project.terrain.worldWidth/2,project.terrain.worldHeight/2,value.sourceFrame.origin[2]],yaw:value.sourceFrame.yaw});setMessage(`${value.name} · ${value.geometry.units.length} buildings loaded. Preview before applying.`);};
  const validPreview=preview?.source===project?preview:undefined;
  const focusEntity=validPreview?.project.entities.find(e=>e.id===focusId)??validPreview?.project.entities[0];
  return <details open={initialPack?true:undefined} className="inspector-block authored-base-panel"><summary>Authored bases · both teams and rules</summary>
    <p className="field-help">Capture this layout or import a base file. Placement adds a new layout; Undo restores the previous one.</p>
    <div className="personal-base-actions">
      <button type="button" onClick={()=>attempt(()=>{sequence.current++;const layout=project.baseLayouts.find(l=>l.id===project.activeBaseLayoutId);if(!layout)throw new Error('No active layout.');load(captureAuthoredBase({...layout,entities:project.entities,validation:project.validation},{origin:[project.terrain.worldWidth/2,project.terrain.worldHeight/2,0],yaw:0}));})}>Capture active authored base</button>
      <button type="button" onClick={()=>fileRef.current?.click()}>Import authored base</button>
      <button type="button" disabled={!pack} onClick={()=>attempt(()=>{if(!pack)return;const url=URL.createObjectURL(new Blob([exportAuthoredBase(pack)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='wulfram-authored-base.json';a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Authored base exported.');})}>Export authored base</button>
    </div>
    <input ref={fileRef} type="file" hidden accept=".json,application/json" aria-label="Import authored base file" onChange={event=>{
      const file=event.target.files?.[0];event.target.value='';if(!file)return;const current=++sequence.current;clear();
      if(file.size>2_000_000){setMessage('Authored base exceeds the 2 MB limit.');return;}
      void file.text().then(raw=>{if(current===sequence.current)attempt(()=>load(parseAuthoredBase(raw)));}).catch(error=>{if(current===sequence.current)setMessage(String(error));});
    }}/>
    <AuthoredLibraryPanel pack={pack} onLoad={value=>{sequence.current++;load(value);}}/>
    {pack&&<>
      <p><strong>{pack.name}</strong> · {pack.geometry.units.length} buildings · {pack.geometry.authoring.districts.length} districts · {pack.areas.length} reserved areas</p>
      <div className="number-grid two">{['X','Y','Z'].map((label,i)=><label key={label}>Origin {label}<input aria-label={`Authored origin ${label}`} type="number" value={Number.isFinite(frame.origin[i])?frame.origin[i]:''} onChange={event=>{clear();const origin=[...frame.origin] as [number,number,number];origin[i]=event.target.valueAsNumber;setFrame({...frame,origin});}}/></label>)}
      <label>Rotation °<input aria-label="Authored rotation degrees" type="number" min={-360} max={360} value={Number.isFinite(frame.yaw)?frame.yaw*180/Math.PI:''} onChange={event=>{clear();setFrame({...frame,yaw:event.target.valueAsNumber*Math.PI/180});}}/></label></div>
      <label>Terrain placement<select aria-label="Authored terrain placement" value={terrainMode} onChange={event=>{clear();setTerrainMode(event.target.value as 'preserve'|'conform');}}><option value="preserve">Preserve saved pose</option><option value="conform">Conform ground buildings</option></select></label>
      <p className="field-help">Rectangular rules turn in 90° steps. Conform adjusts ground height and tilt; starships keep their saved altitude and orientation.</p>
      <div className="personal-base-actions">
        <button type="button" onClick={()=>attempt(()=>{const request:AuthoredBasePlacement={activeLayoutId:project.activeBaseLayoutId,layoutId:`authored-${crypto.randomUUID()}`,frame,terrainMode};const candidate=placeAuthoredBase(project,pack,request,manifest);const proposal={source:project,project:candidate.project};setPreview(proposal);onPreview(proposal);setMessage('Preview shown on the map. Apply adds this layout.');})}>Preview authored base</button>
        <button type="button" disabled={!validPreview} onClick={()=>attempt(()=>{if(!validPreview)throw new Error('Map changed. Preview again before applying.');onApply(validPreview);clear();setMessage('Authored base applied. Undo restores the previous layout.');})}>Apply authored base</button>
        <button type="button" disabled={!preview} onClick={()=>{clear();setMessage('Preview canceled. Map unchanged.');}}>Cancel authored preview</button>
      </div>
      {validPreview&&<div className="personal-base-actions" aria-label="Authored preview cameras">{([1,2] as const).flatMap(team=>(['overhead','ground'] as const).map(view=><button key={`${team}-${view}`} type="button" disabled={!validPreview.project.entities.some(e=>e.team===team)} onClick={()=>attempt(()=>onFocus(validPreview,team,view))}>Team {team} {view==='overhead'?'overview':'ground view'}</button>))}</div>}
      {validPreview&&focusEntity&&<>
        <label>Preview building<select aria-label="Authored preview building" value={focusEntity.id} onChange={event=>setFocusId(event.target.value)}>{validPreview.project.entities.map((e,i)=><option key={e.id} value={e.id}>Team {e.team} · {catalogFor(e)?.label??e.token} · {i+1}</option>)}</select></label>
        <div className="personal-base-actions"><button type="button" onClick={()=>attempt(()=>onFocus(validPreview,focusEntity.team,'detail',focusEntity.id))}>Close preview building</button></div>
      </>}
      {preview&&!validPreview&&<p role="alert">Map changed. Preview again before applying.</p>}
    </>}
    {message&&<output aria-live="polite">{message}</output>}
  </details>;
}
