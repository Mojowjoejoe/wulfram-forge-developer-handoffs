import { hasModelForEntity, type AssetManifest, type WulframProject, type StateEntity } from './wulfram.ts';
import { DISTRICTS_KEY, readDistricts } from './base-districts.ts';
import { validatePersonalBases } from './portable-base-library.ts';
import type { FormationFavorite } from './formation-favorites.ts';

export function moduleDistrictMetadata(project:WulframProject,name:string,entities:StateEntity[],id:string) {
  const groups=readDistricts(project.baseLayouts.find(l=>l.id===project.activeBaseLayoutId)?.metadata[DISTRICTS_KEY]);
  const raw=JSON.stringify([...groups,{id,name,entityIds:entities.map(e=>e.id)}]);readDistricts(raw);return raw;
}

export function districtModuleFromSelection(project: WulframProject, selection: string[], name: string, id: string, manifest: AssetManifest): FormationFavorite {
  const ids=new Set(selection), entities=project.entities.filter(e=>ids.has(e.id));
  if(!entities.length||entities.length!==ids.size)throw new Error('Select existing buildings to save a module.');
  if(new Set(entities.map(e=>e.team)).size!==1)throw new Error('A reusable district needs one source team. Filter the selection by team.');
  if(entities.some(e=>e.token==='*'||!hasModelForEntity(e,manifest)))throw new Error('Every selected building must have a supported model.');
  const x=entities.reduce((s,e)=>s+e.position[0],0)/entities.length,y=entities.reduce((s,e)=>s+e.position[1],0)/entities.length;
  const units=entities.map(e=>({token:e.token,...(e.subtype?{subtype:e.subtype}:{}),offset:[e.position[0]-x,e.position[1]-y] as [number,number],rotation:[0,0,e.rotation[2]] as [number,number,number],groundOffset:0,active:e.active}));
  const width=Math.max(1,...units.map(u=>u.offset[0]))-Math.min(0,...units.map(u=>u.offset[0]));
  const height=Math.max(1,...units.map(u=>u.offset[1]))-Math.min(0,...units.map(u=>u.offset[1]));
  return validatePersonalBases([{id,name:name.trim(),kind:'district',radius:Math.max(1,...units.map(u=>Math.hypot(...u.offset))),template:{id,name:name.trim(),description:'User-authored district. Fixed relative positions, terrain-conformed on placement.',sourceMap:project.name,sourceState:project.activeBaseLayoutId,sourceTeam:entities[0].team,sourceWorldSize:[project.terrain.worldWidth,project.terrain.worldHeight],sourceAnchor:[x,y],unitCount:units.length,footprint:{width,height},units}}])[0];
}
