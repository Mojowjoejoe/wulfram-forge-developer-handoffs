import {TERRAIN_STAMPS,terrainStampDimensions,type TerrainStampOptions} from './terrain-stamp.ts';
export const STAMP_LIBRARY_KEY='forge-terrain-stamp-presets-v1';
export function recoverStampLibrary(storage:Pick<Storage,'getItem'|'setItem'>,backupId:string){
  const raw=storage.getItem(STAMP_LIBRARY_KEY);
  if(raw===null)throw new Error('No stored stamp library to recover. Reload the editor.');
  const key=`${STAMP_LIBRARY_KEY}-recovery-${backupId}`;
  if(storage.getItem(key)!==null)throw new Error('Recovery backup already exists. Try again.');
  storage.setItem(key,raw);
  if(storage.getItem(key)!==raw)throw new Error('Could not verify recovery backup. Original library retained.');
  storage.setItem(STAMP_LIBRARY_KEY,'[]');
  return key;
}
export type SavedStamp={name:string;options:Omit<TerrainStampOptions,'x'|'y'>};
export function readStampLibrary(raw:string):SavedStamp[]{
  if(raw.length>200000)throw new Error('Stamp library exceeds 200 KB.');
  const input=JSON.parse(raw),entries=Array.isArray(input)?input:input?.format==='wulfram-stamp-library'&&input.version===1?input.entries:null;
  if(!Array.isArray(entries)||entries.length>30)throw new Error('Use a supported stamp library with at most 30 entries.');
  const names=new Set<string>();
  return entries.map(p=>{
    if(typeof p?.name!=='string'||!p.name.trim()||p.name.length>60||names.has(p.name.trim()))throw new Error('Stamp names must be unique and contain 1–60 characters.');
    names.add(p.name.trim());const o=p.options;
    if(!o||!TERRAIN_STAMPS.includes(o.preset)||typeof o.mirror!=='boolean'||(o.shapeVersion!==undefined&&o.shapeVersion!=='natural-v2'))throw new Error('Invalid stamp shape or mirror setting.');
    for(const [k,min,max,required] of [['radius',80,2000,true],['aspect',.2,1,true],['rotation',-180,180,true],['amplitude',5,2000,true],['edgePower',1,6,true],['length',160,4000,false],['width',32,4000,false],['naturalness',0,1,false],['roughness',0,1,false],['bend',-1,1,false],['blend',0,1,false],['textureCoverage',0,1,false]] as const){
      if(!required&&o[k]===undefined)continue;
      if(!Number.isFinite(o[k])||o[k]<min||o[k]>max)throw new Error(`Invalid stamp ${k}.`);
    }
    if(o.seed!==undefined&&(typeof o.seed!=='string'||o.seed.length>200))throw new Error('Invalid stamp seed.');
    if(o.textureName!==undefined&&(typeof o.textureName!=='string'||o.textureName.length>120))throw new Error('Invalid stamp texture.');
    const d=terrainStampDimensions({...o,x:0,y:0});if(d.width<32||d.width>4000||d.length<160||d.length>4000)throw new Error('Invalid stamp dimensions.');
    const options:Record<string,unknown>={};
    for(const k of ['preset','radius','aspect','rotation','amplitude','edgePower','mirror','length','width','seed','naturalness','roughness','bend','blend','textureName','textureCoverage','shapeVersion'])if(o[k]!==undefined)options[k]=o[k];
    return {name:p.name.trim(),options:options as SavedStamp['options']};
  });
}
export function mergeStampLibraries(current:SavedStamp[],incoming:SavedStamp[]){
  const next=readStampLibrary(JSON.stringify(current)),add=readStampLibrary(JSON.stringify(incoming));let skipped=0;
  for(const entry of add){
    const existing=next.find(p=>p.name===entry.name);
    if(existing){if(JSON.stringify(existing.options)===JSON.stringify(entry.options)){skipped++;continue;}throw new Error(`A different stamp named “${entry.name}” already exists. Rename it before importing.`);}
    if(next.length===30)throw new Error('Library is full (30 stamps). Remove a saved stamp before importing.');next.push(entry);
  }
  return {entries:next,added:next.length-current.length,skipped};
}
