import {BUILD_AREAS_KEY} from './build-areas.ts';
import {DISTRICTS_KEY} from './base-districts.ts';
import {DISTRICT_RELATIONSHIPS_KEY} from './district-relationships.ts';
import {COMPOSITION_KEY} from './composition-budgets.ts';
import {inspectAuthoringProblems} from './authoring-problems.ts';
import {cloneProject,type AssetManifest,type WulframProject} from './wulfram.ts';
export const REPAIR_FIELDS=[{key:BUILD_AREAS_KEY,label:'Build areas'},{key:DISTRICTS_KEY,label:'District membership'},{key:DISTRICT_RELATIONSHIPS_KEY,label:'District relationships'},{key:COMPOSITION_KEY,label:'Composition limits'}] as const;
export function authoringRepairDraft(project:WulframProject):Record<string,string>{
 const layout=project.baseLayouts.find(l=>l.id===project.activeBaseLayoutId);if(!layout)throw new Error('No active layout.');
 return Object.fromEntries(REPAIR_FIELDS.map(f=>[f.key,layout.metadata[f.key]??'']));
}
export function previewAuthoringRepair(project:WulframProject,draft:Record<string,string>,manifest?:AssetManifest){
 if(Object.keys(draft).some(key=>!REPAIR_FIELDS.some(f=>f.key===key)))throw new Error('Repair only accepts the four displayed authoring categories.');
 const next=cloneProject(project),layout=next.baseLayouts.find(l=>l.id===next.activeBaseLayoutId);if(!layout)throw new Error('No active layout.');
 const changed:string[]=[];
 for(const field of REPAIR_FIELDS){
  const value=draft[field.key];if(typeof value!=='string'||value.length>100000)throw new Error(`${field.label}: enter at most 100,000 characters.`);
  if(value!==(layout.metadata[field.key]??''))changed.push(field.label);
  if(value==='')delete layout.metadata[field.key];else layout.metadata[field.key]=value;
 }
 if(!changed.length)throw new Error('No saved rules changed.');
 const problems=inspectAuthoringProblems(next,manifest);
 if(problems.length)throw new Error(`Repair still has ${problems.length} problem(s): ${problems[0].message}`);
 return {project:next,changed};
}
