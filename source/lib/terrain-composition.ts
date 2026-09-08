import {readStampLibrary,type SavedStamp} from './stamp-library.ts';
import {applyProjectStamp} from './terrain-stamp-project.ts';
import type {AssetManifest,WulframProject} from './wulfram.ts';

export interface TerrainComposition {
 version:1;name:string;
 stamps:Array<{id:string;offset:[number,number];options:SavedStamp['options']}>;
}
export interface CompositionPlacement {x:number;y:number;rotation:number;safe:boolean}
export function readTerrainComposition(raw:string):TerrainComposition{
 if(raw.length>200000)throw new Error('Terrain composition exceeds 200 KB.');
 const value=JSON.parse(raw);
 if(value?.version!==1||typeof value.name!=='string'||!value.name.trim()||value.name.length>60||!Array.isArray(value.stamps)||value.stamps.length<1||value.stamps.length>20)throw new Error('Use a named version-1 composition with 1–20 landforms.');
 const ids=new Set<string>();
 const stamps=value.stamps.map((s:TerrainComposition['stamps'][number])=>{
  if(!s||typeof s.id!=='string'||!s.id.trim()||s.id.length>100||ids.has(s.id)||!Array.isArray(s.offset)||s.offset.length!==2||s.offset.some(n=>!Number.isFinite(n)||Math.abs(n)>20000))throw new Error('Landforms need unique IDs and finite local offsets within 20,000 units.');
  ids.add(s.id);
  const options=readStampLibrary(JSON.stringify([{name:'Landform',options:s.options}]))[0].options;
  return {id:s.id,offset:[...s.offset] as [number,number],options};
 });
 return {version:1,name:value.name.trim(),stamps};
}
export function compositionStampPlacements(composition:TerrainComposition,placement:CompositionPlacement){
 const checked=readTerrainComposition(JSON.stringify(composition));
 if(![placement.x,placement.y,placement.rotation].every(Number.isFinite)||typeof placement.safe!=='boolean')throw new Error('Composition placement needs finite coordinates, rotation and an explicit protection mode.');
 const yaw=placement.rotation*Math.PI/180,c=Math.cos(yaw),s=Math.sin(yaw);
 return checked.stamps.map(stamp=>({id:stamp.id,options:{...stamp.options,
  x:placement.x+stamp.offset[0]*c-stamp.offset[1]*s,
  y:placement.y+stamp.offset[0]*s+stamp.offset[1]*c,
  rotation:((stamp.options.rotation+placement.rotation)%360+540)%360-180}}));
}
/** A single immutable proposal; callers apply this exact project in one history entry. */
export function previewTerrainComposition(source:WulframProject,manifest:AssetManifest,composition:TerrainComposition,placement:CompositionPlacement){
 const checked=readTerrainComposition(JSON.stringify(composition)),stamps=compositionStampPlacements(checked,placement);
 let next=source;
 const steps:Array<{id:string;changedVertices:number}>=[];
 for(const stamp of stamps){
  const previous=next;
  try{next=applyProjectStamp(previous,stamp.options,manifest,placement.safe);}
  catch(error){throw new Error(`Landform ${stamp.id}: ${error instanceof Error?error.message:'Placement failed.'}`);}
  steps.push({id:stamp.id,changedVertices:next.terrain.heights.reduce((n,h,i)=>n+Number(h!==previous.terrain.heights[i]),0)});
 }
 const changedVertices=next.terrain.heights.reduce((n,h,i)=>n+Number(h!==source.terrain.heights[i]),0);
 const deltas=next.terrain.heights.map((h,i)=>h-source.terrain.heights[i]);
 // Keep every recipe step; the ordinary stamp receipt only describes the last one.
 next.metadata={...next.metadata,'terrainComposition.last':JSON.stringify({version:1,composition:checked,placement}),
  'terrainComposition.validation':'manual-edit-needs-revalidation'};
 return {project:next,changedVertices,deltas,steps};
}
