import {readBuildAreas,checkBuildAreas,BUILD_AREAS_KEY} from './build-areas.ts';
import {readDistricts,DISTRICTS_KEY} from './base-districts.ts';
import {readDistrictRelationships,relationshipDistance,DISTRICT_RELATIONSHIPS_KEY} from './district-relationships.ts';
import {readCompositionBudgets,compositionCount,COMPOSITION_KEY,COMPOSITION_ROLES} from './composition-budgets.ts';
import type {AssetManifest,WulframProject} from './wulfram.ts';
export type AuthoringSection='areas'|'districts'|'relationships'|'composition';
export interface AuthoringProblem {section:AuthoringSection;message:string}
export function inspectAuthoringProblems(project:WulframProject,manifest?:AssetManifest):AuthoringProblem[]{
 const layout=project.baseLayouts.find(l=>l.id===project.activeBaseLayoutId);if(!layout)return [{section:'districts',message:'No active layout is available.'}];
 const problems:AuthoringProblem[]=[],metadata=layout.metadata,entities=project.entities;
 const inspect=(section:AuthoringSection,work:()=>void)=>{try{work();}catch(e){problems.push({section,message:`Cannot read saved ${section} rules: ${e instanceof Error?e.message:'Invalid metadata'}. Existing data is retained.`});}};
 inspect('areas',()=>{for(const message of checkBuildAreas(readBuildAreas(metadata[BUILD_AREAS_KEY]),entities,project.terrain.worldWidth,project.terrain.worldHeight,manifest))problems.push({section:'areas',message});});
 inspect('districts',()=>{const ids=new Set(entities.filter(e=>e.token!=='*').map(e=>e.id));for(const group of readDistricts(metadata[DISTRICTS_KEY])){const missing=group.entityIds.filter(id=>!ids.has(id));if(missing.length)problems.push({section:'districts',message:`${group.name}: ${missing.length} referenced building(s) are missing${group.locked?' in this locked district':''}. Restore the buildings or explicitly repair the district membership.`});}});
 inspect('relationships',()=>{const rules=readDistrictRelationships(metadata[DISTRICT_RELATIONSHIPS_KEY]);if(!rules.length)return;const groups=readDistricts(metadata[DISTRICTS_KEY]);for(const rule of rules){const distance=relationshipDistance(rule,groups,entities);if(distance===undefined||distance<rule.min-1e-6||distance>rule.max+1e-6)problems.push({section:'relationships',message:`${rule.name}: ${distance===undefined?'district or member missing':`${distance.toFixed(1)} u between centers`}; requires ${rule.min}–${rule.max} u. Restore the arrangement or edit this relationship.`});}});
 inspect('composition',()=>{for(const rule of readCompositionBudgets(metadata[COMPOSITION_KEY])){const count=compositionCount(entities,rule.team,rule.role);if(count<rule.min||count>rule.max)problems.push({section:'composition',message:`Team ${rule.team} ${COMPOSITION_ROLES.find(r=>r.id===rule.role)!.label}: ${count} placed; requires ${rule.min}–${rule.max}. Adjust this limit or restore the required buildings.`});}});
 return problems;
}
