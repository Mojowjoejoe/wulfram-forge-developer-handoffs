import {assertCompositionBudgets,COMPOSITION_KEY,type CompositionBudget} from './composition-budgets.ts';
import {assertDistrictLocks} from './district-locks.ts';
import {assertDistrictRelationships,DISTRICT_RELATIONSHIPS_KEY,type DistrictRelationship} from './district-relationships.ts';
import {assertBuildAreas,BUILD_AREAS_KEY,type BuildArea} from './build-areas.ts';
import {cloneProject,type AssetManifest,type WulframProject} from './wulfram.ts';
export function assertEditorConstraints(before:WulframProject,after:WulframProject,manifest?:AssetManifest,allowUnlock=false,allowAreaChanges=false,allowRelationshipChanges=false,allowCompositionChanges=false){
  assertCompositionBudgets(before,after,allowCompositionChanges);
  assertDistrictLocks(before,after,manifest,allowUnlock);
  assertBuildAreas(before,after,manifest,allowAreaChanges);
  assertDistrictRelationships(before,after,allowRelationshipChanges);
}
export function withDistrictRelationships(project:WulframProject,rules:DistrictRelationship[],manifest?:AssetManifest){
  const next=cloneProject(project),layout=next.baseLayouts.find(l=>l.id===next.activeBaseLayoutId);
  if(!layout)throw new Error('No active layout.');
  layout.metadata[DISTRICT_RELATIONSHIPS_KEY]=JSON.stringify(rules);
  assertEditorConstraints(project,next,manifest,false,false,true);return next;
}
export function withBuildAreas(project:WulframProject,areas:BuildArea[],manifest:AssetManifest){
  const next=cloneProject(project),layout=next.baseLayouts.find(l=>l.id===next.activeBaseLayoutId);
  if(!layout)throw new Error('No active layout.');
  layout.metadata[BUILD_AREAS_KEY]=JSON.stringify(areas);
  assertEditorConstraints(project,next,manifest,false,true);return next;
}

export function withCompositionBudgets(project:WulframProject,rules:CompositionBudget[],manifest?:AssetManifest){
 const next=cloneProject(project),layout=next.baseLayouts.find(l=>l.id===next.activeBaseLayoutId);
 if(!layout)throw new Error('No active layout.');
 layout.metadata[COMPOSITION_KEY]=JSON.stringify(rules);
 assertEditorConstraints(project,next,manifest,false,false,false,true);return next;
}
