import {CATALOG,type StateEntity,type WulframProject} from './wulfram.ts';
export const COMPOSITION_KEY='forge.composition-budgets.v1';
export const COMPOSITION_ROLES=[{id:'all',label:'All placed records'},{id:'power',label:'Power cells'},{id:'repair',label:'Repair pads'},{id:'refuel',label:'Refuel pads'},{id:'defense',label:'Defensive structures'}] as const;
export type CompositionRole=typeof COMPOSITION_ROLES[number]['id'];
export interface CompositionBudget {team:1|2;role:CompositionRole;min:number;max:number}
export function readCompositionBudgets(raw?:string):CompositionBudget[]{
 if(!raw)return [];
 if(raw.length>10000)throw new Error('Composition limits exceed the size limit.');
 const value:unknown=JSON.parse(raw);
 if(!Array.isArray(value)||value.length>10)throw new Error('Use at most one limit per role and team.');
 const keys=new Set<string>();
 for(const r of value){
  if(!r||![1,2].includes(r.team)||!COMPOSITION_ROLES.some(role=>role.id===r.role)||!Number.isInteger(r.min)||!Number.isInteger(r.max)||r.min<0||r.max<r.min||r.max>10000)throw new Error('Choose a team, supported role and whole-number limits from 0 to 10,000 with minimum no greater than maximum.');
  const key=`${r.team}:${r.role}`;if(keys.has(key))throw new Error('Duplicate composition role for this team.');keys.add(key);
 }
 return value;
}
export function compositionCount(entities:StateEntity[],team:number,role:CompositionRole){
 return entities.filter(e=>e.team===team&&e.token!=='*'&&(role==='all'||(role==='defense'?CATALOG.some(c=>c.token===e.token&&c.category==='defense'):e.token===({power:'e',repair:'r',refuel:'f'} as const)[role]))).length;
}
export function assertCompositionBudgets(before:WulframProject,after:WulframProject,allowChanges=false){
 if(!allowChanges)for(const layout of before.baseLayouts){
  const rules=readCompositionBudgets(layout.metadata[COMPOSITION_KEY]);if(!rules.length)continue;
  const next=after.baseLayouts.find(l=>l.id===layout.id);
  if(!next||JSON.stringify(readCompositionBudgets(next.metadata[COMPOSITION_KEY]))!==JSON.stringify(rules))throw new Error('Edit or remove composition limits explicitly before replacing their layout or rules.');
 }
 for(const layout of after.baseLayouts)for(const rule of readCompositionBudgets(layout.metadata[COMPOSITION_KEY])){
  const count=compositionCount(layout.id===after.activeBaseLayoutId?after.entities:layout.entities,rule.team,rule.role);
  if(count<rule.min||count>rule.max)throw new Error(`Team ${rule.team} ${COMPOSITION_ROLES.find(r=>r.id===rule.role)!.label}: would contain ${count}; required ${rule.min}–${rule.max}. Adjust the edit or change this composition limit. Nothing was applied.`);
 }
}
