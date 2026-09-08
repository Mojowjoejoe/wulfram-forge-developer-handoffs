import {DISTRICTS_KEY,readDistricts,type BaseDistrict} from './base-districts.ts';
import type {StateEntity,WulframProject} from './wulfram.ts';

export const DISTRICT_RELATIONSHIPS_KEY='forge.district-relationships.v1';
export interface DistrictRelationship {id:string;name:string;from:string;to:string;min:number;max:number}
export function readDistrictRelationships(raw?:string):DistrictRelationship[]{
  if(!raw)return [];
  if(raw.length>100000)throw new Error('District relationships exceed the size limit.');
  const value:unknown=JSON.parse(raw);
  if(!Array.isArray(value)||value.length>100)throw new Error('Use at most 100 district relationships.');
  const ids=new Set<string>(),pairs=new Set<string>();
  for(const r of value){
    if(!r||typeof r.id!=='string'||!r.id||r.id.length>120||ids.has(r.id)||typeof r.name!=='string'||!r.name.trim()||r.name.length>120||typeof r.from!=='string'||!r.from||typeof r.to!=='string'||!r.to||r.from===r.to||!Number.isFinite(r.min)||!Number.isFinite(r.max)||r.min<0||r.max<r.min||r.max>100000)throw new Error('Invalid district relationship. Choose two different districts and distances from 0 to 100,000 with minimum no greater than maximum.');
    const pair=JSON.stringify([r.from,r.to].sort((a,b)=>a<b?-1:a>b?1:0));
    if(pairs.has(pair))throw new Error('Only one distance relationship is allowed for each district pair. Edit the existing rule.');
    pairs.add(pair);ids.add(r.id);
  }
  return value;
}
export function districtCenter(group:BaseDistrict|undefined,entities:StateEntity[]):[number,number]|undefined{
  if(!group)return;
  const byId=new Map(entities.filter(e=>e.token!=='*').map(e=>[e.id,e]));
  const members=group.entityIds.map(id=>byId.get(id));
  if(members.some(e=>!e||!e.position.slice(0,2).every(Number.isFinite)))return;
  return [members.reduce((sum,e)=>sum+e!.position[0],0)/members.length,members.reduce((sum,e)=>sum+e!.position[1],0)/members.length];
}
export function relationshipDistance(rule:DistrictRelationship,groups:BaseDistrict[],entities:StateEntity[]){
  const a=districtCenter(groups.find(g=>g.id===rule.from),entities),b=districtCenter(groups.find(g=>g.id===rule.to),entities);
  return a&&b?Math.hypot(a[0]-b[0],a[1]-b[1]):undefined;
}
export function assertDistrictRelationships(before:WulframProject,after:WulframProject,allowChanges=false){
  if(!allowChanges)for(const layout of before.baseLayouts){
    const rules=readDistrictRelationships(layout.metadata[DISTRICT_RELATIONSHIPS_KEY]);if(!rules.length)continue;
    const next=after.baseLayouts.find(l=>l.id===layout.id);
    if(!next||JSON.stringify(readDistrictRelationships(next.metadata[DISTRICT_RELATIONSHIPS_KEY]))!==JSON.stringify(rules))throw new Error('Edit or remove district relationships explicitly before replacing their rules or layout.');
  }
  for(const layout of after.baseLayouts){
    const rules=readDistrictRelationships(layout.metadata[DISTRICT_RELATIONSHIPS_KEY]);if(!rules.length)continue;
    const groups=readDistricts(layout.metadata[DISTRICTS_KEY]),entities=layout.id===after.activeBaseLayoutId?after.entities:layout.entities;
    for(const rule of rules){
      const distance=relationshipDistance(rule,groups,entities);
      if(distance===undefined)throw new Error(`${rule.name}: a district or one of its buildings is missing. Restore it or remove this relationship first. Nothing was applied.`);
      if(distance<rule.min-1e-6||distance>rule.max+1e-6)throw new Error(`${rule.name}: district centers would be ${distance.toFixed(1)} u apart; required ${rule.min}–${rule.max} u. Adjust the move or edit the relationship. Nothing was applied.`);
    }
  }
}
