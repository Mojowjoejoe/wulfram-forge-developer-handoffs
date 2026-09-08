'use client';
import {useState} from 'react';
import {getEditorBuildInfo,type EditorBuildInfo} from '@/lib/map-repository-client';
import {REVIEWED_CREATIVE_FAMILY_IDS} from '@/lib/base-library';

export function AboutEditor({templateCount}:{templateCount:number}){
  const [info,setInfo]=useState<EditorBuildInfo>(),[status,setStatus]=useState('Open this section to read build information.'),[busy,setBusy]=useState(false);
  const refresh=async()=>{
    setBusy(true);setStatus('Reading build information…');
    try{const value=await getEditorBuildInfo();setInfo(value);setStatus(value?'Native desktop host identified.':'Browser edition. Native executable version is unavailable.');}
    catch(error){setInfo(undefined);setStatus(error instanceof Error?error.message:'Build information is unavailable.');}
    finally{setBusy(false);}
  };
  return <details className="about-editor" onToggle={event=>{if(event.target===event.currentTarget&&event.currentTarget.open&&!busy&&!info)void refresh();}}>
    <summary>About this editor</summary>
    {info&&<p style={{overflowWrap:'anywhere'}}>Native build: <strong>{info.version}</strong><br/>WebView2 runtime: {info.runtimeVersion}</p>}
    <output aria-live="polite">{status}</output>
    <button type="button" disabled={busy} onClick={()=>void refresh()}>Refresh build information</button>
    <p>{REVIEWED_CREATIVE_FAMILY_IDS.length} creative base families · {templateCount} available base templates. Templates include source, curated and advanced entries. Size and seed variations are not counted as new families.</p>
    <details><summary>Supported files</summary>
      <p>Import map ZIPs, editor project JSON, base-layout JSON, or a map source file set. Legacy terrain and state files can be selected together: land, state/db_state/bigstate, tagmap, tagmap2 and start_script. Terrain is shared by all base layouts.</p>
      <p>Use the grayscale heightmap importer for images; review height scaling before Apply. A heightmap supplies terrain heights, not buildings or gameplay rules. Export map produces a portable ZIP with editable project data and legacy map files.</p>
    </details>
    <details><summary>Save, Undo and recovery</summary>
      <p>Save local and autosave use editor storage on this device. Export a map ZIP for a portable backup; clearing application/browser data can remove local recovery and personal libraries.</p>
      <p>Map Undo restores edits in the current session. Personal stamp-library Undo is separate. Export personal base and stamp libraries separately; a map export does not back up the whole personal catalog.</p>
      <p>If a preview fails, read its explanation, adjust the inputs and preview again. Import your last exported ZIP to recover a map. Export diagnostics before reporting a problem, and include the native build and WebView2 runtime shown here.</p>
    </details>
    <details><summary>What editor checks establish</summary>
      <p>Power, spacing, authored constraints and sampled access use the stated editor rules. Estimated Darklight and turret overlays need server verification. Editor checks do not prove vehicle clearance, sightlines, game loading or competitive balance.</p>
      <p>Minion waves, tower progression and scripted victory conditions require a separate supported gameplay layer. Placing buildings does not establish those mechanics.</p>
    </details>
  </details>;
}
