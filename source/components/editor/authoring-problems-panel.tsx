 'use client';
import {useMemo} from 'react';
import {inspectAuthoringProblems,type AuthoringSection} from '@/lib/authoring-problems';
import type {AssetManifest,WulframProject} from '@/lib/wulfram';
const labels:Record<AuthoringSection,string>={areas:'Build areas',districts:'District membership',relationships:'District relationships',composition:'Composition limits'};
export function AuthoringProblemsPanel({project,manifest,onOpen}:{project:WulframProject;manifest:AssetManifest;onOpen:(section:AuthoringSection)=>void}){
 const problems=useMemo(()=>inspectAuthoringProblems(project,manifest),[project,manifest]);
 return <details className="authoring-problems-panel"><summary>Saved-rule problems · {problems.length}</summary>
 <p>Checks boundaries in the active saved layout, reserved space, district membership, center distances and composition counts. This list does not edit the map.</p>
 <p>Power, terrain slope and route clearance have separate inspection displays. No detected saved-rule problems does not establish gameplay readiness.</p>
 {problems.length?<ul>{problems.map((p,i)=><li key={`${p.section}:${i}`}><p>{p.message}</p><button type="button" onClick={()=>onOpen(p.section)}>Open {labels[p.section]}</button></li>)}</ul>:<p>No saved-rule problems detected in this layout.</p>}
 </details>;
}
