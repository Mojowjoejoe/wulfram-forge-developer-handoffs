'use client';
import { useState } from 'react';
import {STAMP_LIBRARY_KEY,readStampLibrary,mergeStampLibraries,recoverStampLibrary,type SavedStamp} from '@/lib/stamp-library';
import { TERRAIN_STAMPS, terrainStampDimensions, type TerrainStampOptions } from '@/lib/terrain-stamp';
import { TERRAIN_STARTER_PRESETS } from '@/lib/terrain-stamp-presets';
import {LandformStarterLibrary} from './landform-starter-library';

type Settings = Omit<TerrainStampOptions, 'x' | 'y'>;
export function TerrainStampPanel({ options, onChange, safe, setSafe, showProtected, setShowProtected, message, textures }: {
  options: Settings; onChange: (change: Partial<Settings>) => void;
  safe: boolean; setSafe: (value: boolean) => void; showProtected: boolean; setShowProtected: (value: boolean) => void; message: string;
  textures: string[];
}) {
  const [name, setName] = useState('My landform');
  const [loaded] = useState(() => {
    try { return {presets:readStampLibrary(localStorage.getItem(STAMP_LIBRARY_KEY) ?? '[]'),error:''}; }
    catch (error) { return {presets:[] as SavedStamp[],error:error instanceof Error?error.message:'Saved presets could not be loaded.'}; }
  });
  const [presets, setPresets] = useState(loaded.presets);
  const [storageMessage, setStorageMessage] = useState(loaded.error);
  const [loadError,setLoadError]=useState(loaded.error);
  const [history,setHistory]=useState<SavedStamp[][]>([]);
  const [pending,setPending]=useState<SavedStamp[]>();
  const persist=(next:SavedStamp[])=>{localStorage.setItem(STAMP_LIBRARY_KEY,JSON.stringify(next));setHistory(h=>[...h,presets].slice(-10));setPresets(next);};
  const dimensions = terrainStampDimensions({ ...options, x: 0, y: 0 });
  const values = { ...options, ...dimensions };
  const broadProfile=options.preset==='mesa'||options.preset==='basin';
  const fields = [['length', 'Length (160–4,000 u)', 160, 4000, 1], ['width', 'Width (32–4,000 u)', 32, 4000, 1], ['rotation', 'Rotation (−180–180°)', -180, 180, 15], ['amplitude', 'Height / depth (5–2,000 u)', 5, 2000, 5], ['edgePower', 'Edge profile (1–6)', 1, 6, .25]] as const;
  return <section className="inspector-block" aria-label="3D stamp controls">
    <p className="section-label">3D TERRAIN STAMPS</p>
    <LandformStarterLibrary onChoose={preset=>{onChange({...preset.options,mirror:options.mirror});setName(preset.name);setStorageMessage(`${preset.name} loaded. Mirror choice retained.`);}}/>
    <label>Starter preset<select className="template-select" value="" onChange={e => { if (!e.target.value) return; const preset = TERRAIN_STARTER_PRESETS[Number(e.target.value)]; if (preset) { onChange({ ...preset.options, mirror: options.mirror }); setName(preset.name); setStorageMessage(`${preset.name} loaded. Adjust settings below; Mirror choice retained.`); } }}><option value="">Choose a landform…</option>{TERRAIN_STARTER_PRESETS.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}</select></label>
    <label>Shape system<select className="template-select" value={options.shapeVersion ?? 'legacy'} onChange={e => onChange({ shapeVersion: e.target.value === 'natural-v2' ? 'natural-v2' : undefined })}><option value="natural-v2">Natural landforms</option><option value="legacy">Legacy oval</option></select></label>
    <label>Placement mode<select className="template-select" value={safe ? 'protected' : 'manual'} onChange={e => setSafe(e.target.value === 'protected')}><option value="protected">Protected</option><option value="manual">Manual</option></select></label>
    <p className="field-help">{safe?'Protected mode needs supported route data from the original editor project. If that data is unavailable, choose Manual above to place the stamp yourself.':'Manual mode skips authored route protection. Check lanes and base entrances before applying; each placement supports Undo.'}</p>
    <p className="field-help">Hover to preview shape and textures. Alt + wheel rotates; click once to place. Each click has its own Undo. Dimensions bound the footprint, not the visible crest.</p>
    <output data-stamp-status style={{ display: 'block', marginBottom: 14 }}>{message.startsWith('Protected placement cannot read supported')?'Route protection unavailable · choose Manual above.':message}</output>
    <label>Landform<select className="template-select" value={options.preset} onChange={e => onChange({ preset: e.target.value as Settings['preset'] })}>{TERRAIN_STAMPS.map(p => <option key={p}>{p}</option>)}</select></label>
    {fields.map(([key, label, min, max, step]) => <label aria-label={label} className="range-field" key={key} style={{ marginTop: 17 }}>
      <span><b>{label}</b><output>{Math.round(values[key] * 100) / 100}{key === 'rotation' ? '°' : key === 'length' || key === 'width' || key === 'amplitude' ? ' u' : ''}</output></span>
      <input aria-label={label} type="range" min={min} max={max} step={step} value={values[key]} onChange={e => onChange(key === 'length' || key === 'width' ? { ...dimensions, [key]: Number(e.target.value) } : { [key]: Number(e.target.value) })} />
    </label>)}
    <details open><summary>Natural shape and blending</summary>
      {([['naturalness', 'Natural variation', 0, 1], ['roughness', broadProfile?'Edge roughness':'Peak roughness', 0, 1], ['bend', 'Curve / bend', -1, 1], ['blend', 'Edge blending', 0, 1]] as const).map(([key, label, min, max]) => <label aria-label={label} className="range-field" key={key} style={{ marginTop: 12 }}><span><b>{label}</b><output>{Math.round((options[key] ?? 0) * 100)}%</output></span><input aria-label={label} disabled={broadProfile&&key==='bend'} type="range" min={min} max={max} step={.05} value={options[key] ?? 0} onChange={e => onChange({ [key]: Number(e.target.value) })} /></label>)}
      {broadProfile&&<p className="field-help">Variation and roughness shape the perimeter. Bend is unused. The center adds a constant height offset; it preserves any slope already underneath.</p>}
      <label>Variation seed<input className="template-select" maxLength={200} value={options.seed ?? 'landform-001'} onChange={e => onChange({ seed: e.target.value })} /></label>
      <button className="secondary-action" type="button" onClick={() => onChange({ seed: crypto.randomUUID() })}>New shape variation</button>
      <p className="field-help">Seed changes shape, not dimensions or height limits. In Natural landforms, Edge profile controls interior sharpness; Edge blending controls the outer transition. Legacy keeps its original behavior. Blending does not smooth the whole map.</p>
    </details>
    <details><summary>Stamp textures</summary>
      <label>Surface texture<select className="template-select" value={options.textureName ?? ''} onChange={e => onChange({ textureName: e.target.value || undefined })}><option value="">Keep existing textures</option>{textures.map(name => <option key={name}>{name}</option>)}</select></label>
      <label aria-label="Texture coverage" className="range-field"><span><b>Texture coverage</b><output>{Math.round((options.textureCoverage ?? .6) * 100)}%</output></span><input aria-label="Texture coverage" type="range" min={0} max={1} step={.05} value={options.textureCoverage ?? .6} onChange={e => onChange({ textureCoverage: Number(e.target.value) })} /></label>
      <p className="field-help">The solid preview shows the resulting surface before placement. Coverage may be reduced near protected reserves. Textures are cosmetic, not slippery ice or damaging lava.</p>
    </details>
    <label style={{ display: 'block', marginTop: 12 }}><input type="checkbox" checked={options.mirror} onChange={e => onChange({ mirror: e.target.checked })} /> Mirror partner</label>
    {safe && <p className="field-help">Protected: keeps stamps out of authored routes, bases and the center. Requires saved route metadata.</p>}
    <label style={{ display: 'block' }}><input type="checkbox" checked={showProtected} onChange={e => setShowProtected(e.target.checked)} /> Show protected areas</label>
    {!safe && <p role="alert">Manual mode can block routes and alter sightlines. Structure reserves still apply.</p>}
    <p className="field-help">Hover terrain to preview its actual surface and texture. Alt + wheel rotates 15°. Left-click places once; each click has its own Undo. Choose another terrain tool to stop. Cyan outline: placeable. Red mesh: blocked. Orange dots: protected samples. Bend curves ridges, valleys and passes; crater rims use Natural variation instead. Presets are shapes, not verified vehicle routes.</p>
    <p className="field-help">Safe placement preserves authored reserves, not guaranteed gameplay balance. Revalidate and playtest afterward.</p>
    <label>Preset name<input className="template-select" maxLength={60} value={name} onChange={e => setName(e.target.value)} style={{ width: '100%' }} /></label>
    <button type="button" className="secondary-action" disabled={!name.trim()||!!loadError} onClick={() => {
      try { const next=readStampLibrary(JSON.stringify([...presets.filter(p=>p.name!==name.trim()),{name:name.trim(),options}]));persist(next);setStorageMessage('Preset saved locally. No map changes.'); }
      catch(error) { setStorageMessage(error instanceof Error?error.message:'Could not save preset: storage is unavailable or full.'); }
    }}>Save stamp preset</button>
    <label>Saved stamps<select className="template-select" value="" onChange={e => { if (!e.target.value) return; const preset = presets[Number(e.target.value)]; if (preset) { onChange({ shapeVersion: undefined, length: undefined, width: undefined, seed: undefined, naturalness: undefined, roughness: undefined, bend: undefined, blend: undefined, textureName: undefined, textureCoverage: undefined, ...preset.options }); setName(preset.name); } }}><option value="">Choose saved stamp…</option>{presets.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}</select></label>
    <details className="stamp-library"><summary>Portable stamp library</summary>
      <p className="field-help">Export settings to reuse in another editor profile. Import previews a merge; matching names must have identical settings. Placement mode is not stored. Loading a stamp changes controls, not terrain. Map Undo does not undo library changes. Undo stamp library change restores up to 10 changes while this panel stays open.</p>
      <button className="secondary-action" type="button" disabled={!!loadError} onClick={()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({format:'wulfram-stamp-library',version:1,entries:presets},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='wulfram-stamps.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>Export stamp library</button>
      <label style={{display:"block",marginTop:12}}>Import stamp library<input type="file" accept=".json,application/json" disabled={!!loadError} onChange={async e=>{const file=e.target.files?.[0];e.target.value='';setPending(undefined);if(!file)return;try{if(file.size>200000)throw new Error('Stamp library exceeds 200 KB.');const incoming=readStampLibrary(await file.text());const merged=mergeStampLibraries(presets,incoming);setPending(incoming);setStorageMessage(`${merged.added} stamps to add; ${merged.skipped} identical entries skipped. Apply import to save.`);}catch(error){setStorageMessage(error instanceof Error?error.message:'Import failed.');}}}/></label>
      {pending&&<><button className="secondary-action" type="button" onClick={()=>{try{const merged=mergeStampLibraries(presets,pending);persist(merged.entries);setPending(undefined);setStorageMessage('Stamp library imported. Map unchanged.');}catch(error){setStorageMessage(error instanceof Error?error.message:'Import failed.');}}}>Apply stamp import</button><button className="secondary-action" type="button" onClick={()=>{setPending(undefined);setStorageMessage('Import canceled. Library unchanged.');}}>Cancel stamp import</button></>}
      <label style={{display:"block",marginTop:12}}>Remove saved stamp<select className="template-select" value="" onChange={e=>{if(!e.target.value)return;try{persist(presets.filter(p=>p.name!==e.target.value));setStorageMessage('Saved stamp removed. Export a backup before removing entries.');}catch{setStorageMessage('Removal failed; library unchanged.');}}}><option value="">Choose stamp to remove…</option>{presets.map(p=><option key={p.name}>{p.name}</option>)}</select></label>
      {loadError&&<p role="alert">Stored data was retained. Save/import/export are disabled to avoid replacing an unreadable library.</p>}
      <button type="button" className="secondary-action" disabled={!history.length||!!loadError} onClick={()=>{try{const previous=history[history.length-1];localStorage.setItem(STAMP_LIBRARY_KEY,JSON.stringify(previous));setPresets(previous);setHistory(h=>h.slice(0,-1));setPending(undefined);setStorageMessage('Stamp library change undone. Map unchanged.');}catch{setStorageMessage('Undo failed; library unchanged.');}}}>Undo stamp library change</button>
      {loadError&&<button type="button" className="secondary-action" onClick={()=>{try{const key=recoverStampLibrary(localStorage,crypto.randomUUID());setPresets([]);setHistory([]);setPending(undefined);setLoadError('');setStorageMessage(`Original data backed up locally as ${key}. Empty library ready; import a valid backup or save new stamps.`);}catch(error){setStorageMessage(error instanceof Error?error.message:'Recovery failed. Original library retained.');}}}>Back up unreadable data and start empty</button>}
    </details>
    <output aria-live="polite">{storageMessage}</output>
  </section>;
}
