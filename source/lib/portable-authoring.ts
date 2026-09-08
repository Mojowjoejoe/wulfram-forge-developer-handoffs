import {readDistricts,DISTRICTS_KEY,type BaseDistrict} from './base-districts.ts';
import {readDistrictRelationships,relationshipDistance,DISTRICT_RELATIONSHIPS_KEY,type DistrictRelationship} from './district-relationships.ts';
import {readCompositionBudgets,compositionCount,COMPOSITION_KEY,type CompositionBudget} from './composition-budgets.ts';
import type {StateEntity} from './wulfram.ts';

/** References for a complete layout, in supplied building order. Geometry is stored separately. */
export interface PortableAuthoring {
  version:1;
  buildings:{token:string;team:number;subtype?:string}[];
  districts:(Omit<BaseDistrict,'entityIds'> & {members:number[]})[];
  relationships:DistrictRelationship[];
  budgets:CompositionBudget[];
}
function buildingOrder(entities:StateEntity[]){
  if(entities.length>10000||entities.some(e=>!e.id||e.token==='*')||new Set(entities.map(e=>e.id)).size!==entities.length)
    throw new Error('Portable authoring needs unique building IDs and no metadata records.');
  return entities.map(e=>({token:e.token,team:e.team,...(e.subtype===undefined?{}:{subtype:e.subtype})}));
}
/** Validate untrusted portable references using the same rule parsers as the editor. */
export function validatePortableAuthoring(value:unknown):PortableAuthoring{
  const p=value as PortableAuthoring;
  if(!p||p.version!==1||!Array.isArray(p.buildings)||p.buildings.length>10000||!Array.isArray(p.districts)||p.districts.length>100)throw new Error('Invalid portable authoring version or collection.');
  for(const b of p.buildings)if(!b||typeof b.token!=='string'||!b.token||b.token==='*'||!Number.isInteger(b.team)||b.team<0||b.team>2||(b.subtype!==undefined&&typeof b.subtype!=='string'))throw new Error('Invalid portable building identity.');
  const groups=readDistricts(JSON.stringify(p.districts.map(d=>{
    if(!d||!Array.isArray(d.members)||d.members.length>500||d.members.some(i=>!Number.isInteger(i)||i<0||i>=p.buildings.length))throw new Error('Portable district references a missing building or exceeds 500 members.');
    return {...d,entityIds:d.members.map(String)};
  })));
  if(!Array.isArray(p.relationships)||p.relationships.length>100||!Array.isArray(p.budgets)||p.budgets.length>10)throw new Error('Missing or oversized portable authoring rules.');
  const relationships=readDistrictRelationships(JSON.stringify(p.relationships));
  const ids=new Set(groups.map(g=>g.id));
  if(relationships.some(r=>!ids.has(r.from)||!ids.has(r.to)))throw new Error('Portable relationship references a missing district.');
  readCompositionBudgets(JSON.stringify(p.budgets));
  return structuredClone(p);
}
/** Capture only district/composition references. Other metadata and geometry remain the caller's responsibility. */
export function capturePortableAuthoring(metadata:Record<string,string>,entities:StateEntity[]):PortableAuthoring{
  const buildings=buildingOrder(entities),index=new Map(entities.map((e,i)=>[e.id,i]));
  const districts=readDistricts(metadata[DISTRICTS_KEY]).map(({entityIds,...group})=>({
    ...group,members:entityIds.map(id=>{
      const i=index.get(id);if(i===undefined)throw new Error('Cannot save a district with missing buildings.');return i;
    }),
  }));
  const result=validatePortableAuthoring({version:1,buildings,districts,
    relationships:readDistrictRelationships(metadata[DISTRICT_RELATIONSHIPS_KEY]),budgets:readCompositionBudgets(metadata[COMPOSITION_KEY])});
  restorePortableAuthoring(result,entities);
  return result;
}
/** Return metadata for a NEW complete layout. Geometry loaders MUST preserve serialized indices,
 * including between identical building types. Does not merge with or unlock an existing layout. */
export function restorePortableAuthoring(value:unknown,entities:StateEntity[]):Record<string,string>{
  const p=validatePortableAuthoring(value),order=buildingOrder(entities);
  if(order.length!==p.buildings.length||order.some((b,i)=>b.token!==p.buildings[i].token||b.team!==p.buildings[i].team||b.subtype!==p.buildings[i].subtype))throw new Error('Portable building order, types, or teams changed.');
  const groups=p.districts.map(({members,...group})=>({...group,entityIds:members.map(i=>entities[i].id)}));
  for(const r of p.relationships){
    const distance=relationshipDistance(r,groups,entities);
    if(distance===undefined||!Number.isFinite(distance)||distance<r.min-1e-6||distance>r.max+1e-6)throw new Error(`${r.name}: placed districts do not satisfy their saved spacing rule.`);
  }
  for(const r of p.budgets){
    const count=compositionCount(entities,r.team,r.role);
    if(count<r.min||count>r.max)throw new Error('Placed buildings do not satisfy their saved composition limits.');
  }
  return {[DISTRICTS_KEY]:JSON.stringify(groups),[DISTRICT_RELATIONSHIPS_KEY]:JSON.stringify(p.relationships),[COMPOSITION_KEY]:JSON.stringify(p.budgets)};
}

