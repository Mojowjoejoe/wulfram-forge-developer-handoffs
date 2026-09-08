import {backupAndResetLibrary} from './library-recovery.ts';
import {validateAuthoredBase,type AuthoredBasePackage} from './authored-base-package.ts';

export const AUTHORED_LIBRARY_KEY='forge-authored-bases-v1';
export interface AuthoredLibraryEntry {id:string;name:string;base:AuthoredBasePackage}
export interface AuthoredLibrary {format:'wulfram-authored-library';version:1;revision:string;entries:AuthoredLibraryEntry[]}
const empty=():AuthoredLibrary=>({format:'wulfram-authored-library',version:1,revision:'empty',entries:[]});
function nameValid(name:unknown):asserts name is string{
  if(typeof name!=='string'||name!==name.trim()||!name||name.length>120)throw new Error('Use a trimmed name with 1–120 characters.');
}
export function readAuthoredLibrary(raw:string|null):AuthoredLibrary{
  if(raw===null)return empty();
  if(raw.length>2_000_000)throw new Error('Authored library exceeds 2 MB.');
  const value=JSON.parse(raw) as AuthoredLibrary;
  if(!value||value.format!=='wulfram-authored-library'||value.version!==1||typeof value.revision!=='string'||!value.revision||value.revision.length>120||!Array.isArray(value.entries)||value.entries.length>50)throw new Error('Invalid authored library; original data retained.');
  const ids=new Set<string>(),names=new Set<string>();
  for(const e of value.entries){
    if(!e||typeof e.id!=='string'||!e.id||e.id.length>120||ids.has(e.id))throw new Error('Authored entries need unique IDs.');
    nameValid(e.name);if(names.has(e.name.toLowerCase()))throw new Error('Authored base names must be unique.');
    ids.add(e.id);names.add(e.name.toLowerCase());validateAuthoredBase(e.base);
  }
  return structuredClone(value);
}
export type AuthoredLibraryEdit=
  |{operation:'import';library:AuthoredLibrary}
  |{operation:'save';entry:AuthoredLibraryEntry}
  |{operation:'rename';id:string;name:string}
  |{operation:'remove';id:string}
  |{operation:'restore';entries:AuthoredLibraryEntry[]};
/** Pure library edit, separate from map history. Save never overwrites an existing entry. */
export function editAuthoredLibrary(source:AuthoredLibrary,edit:AuthoredLibraryEdit,revision:string):AuthoredLibrary{
  const next=readAuthoredLibrary(JSON.stringify(source));
  if(typeof revision!=='string'||!revision||revision.length>120||revision===source.revision||revision==='empty')throw new Error('A library edit needs a fresh revision.');
  if(!edit||!['import','save','rename','remove','restore'].includes(edit.operation))throw new Error('Unknown authored library edit.');
  if(edit.operation==='import')next.entries=previewAuthoredLibraryImport(next,edit.library).entries;
  else if(edit.operation==='save')next.entries.push(structuredClone(edit.entry));
  else if(edit.operation==='restore')next.entries=structuredClone(edit.entries);
  else {
    const entry=next.entries.find(e=>e.id===edit.id);if(!entry)throw new Error('Saved authored base no longer exists.');
    if(edit.operation==='rename'){nameValid(edit.name);if(entry.name===edit.name)throw new Error('The name is unchanged.');entry.name=edit.name;}
    else next.entries=next.entries.filter(e=>e.id!==edit.id);
  }
  next.revision=revision;
  return readAuthoredLibrary(JSON.stringify(next));
}
/** Verify the read revision before writing. This is a local synchronous storage guard,
 * not a cross-process atomic compare-and-swap primitive. Failed reads never reset data. */
export function commitAuthoredLibrary(storage:Pick<Storage,'getItem'|'setItem'>,expectedRaw:string|null,edit:AuthoredLibraryEdit,revision:string){
  if(storage.getItem(AUTHORED_LIBRARY_KEY)!==expectedRaw)throw new Error('Authored library changed. Reload it before editing.');
  const before=readAuthoredLibrary(expectedRaw),after=editAuthoredLibrary(before,edit,revision),raw=JSON.stringify(after);
  // Recheck after validation, immediately before the synchronous local write.
  if(storage.getItem(AUTHORED_LIBRARY_KEY)!==expectedRaw)throw new Error('Authored library changed during validation. Reload it.');
  storage.setItem(AUTHORED_LIBRARY_KEY,raw);
  if(storage.getItem(AUTHORED_LIBRARY_KEY)!==raw)throw new Error('Authored library write could not be verified. Reload before another edit.');
  return {before,after,raw};
}
export function findAuthoredBases(library:AuthoredLibrary,query:string){
  const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return library.entries.filter(e=>terms.every(term=>`${e.name} ${e.base.name} ${e.base.geometry.authoring.districts.map(d=>d.name).join(' ')}`.toLowerCase().includes(term)));
}

/** Explicit recovery only: preserve corrupt bytes before resetting to a valid fresh envelope. */
export function recoverAuthoredLibrary(storage:Pick<Storage,'getItem'|'setItem'>,expectedRaw:string,backupId:string,revision:string){
  // Recovery must not provide a shortcut for deleting a healthy library.
  let corrupt=false;
  try{readAuthoredLibrary(expectedRaw);}catch{corrupt=true;}
  if(!corrupt)throw new Error('Authored library is valid. Use library edits instead of recovery.');
  const after=editAuthoredLibrary(empty(),{operation:'restore',entries:[]},revision);
  const raw=JSON.stringify(after);
  const backupKey=backupAndResetLibrary(storage,AUTHORED_LIBRARY_KEY,expectedRaw,backupId,raw);
  return {after,raw,backupKey};
}

function canonical(value:unknown):string{
 if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
 if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical((value as Record<string,unknown>)[key])}`).join(',')}}`;
 return JSON.stringify(value);
}
/** Plan a merge without mutation. Identical IDs/content skip; conflicts reject the whole import. */
export function previewAuthoredLibraryImport(source:AuthoredLibrary,incoming:AuthoredLibrary){
 const current=readAuthoredLibrary(JSON.stringify(source)),imported=readAuthoredLibrary(JSON.stringify(incoming));
 let added=0,skipped=0;
 for(const entry of imported.entries){
  const sameId=current.entries.find(e=>e.id===entry.id);
  if(sameId){if(canonical(sameId)!==canonical(entry))throw new Error(`Import ID conflict: ${entry.name}. Save the source base as a new copy with a new ID, or resolve the conflicting entry first.`);skipped++;continue;}
  if(current.entries.some(e=>e.name.toLowerCase()===entry.name.toLowerCase()))throw new Error(`Import name conflict: ${entry.name}. Rename the source entry first.`);
  current.entries.push(entry);added++;
 }
 const checked=readAuthoredLibrary(JSON.stringify(current));
 return {entries:checked.entries,added,skipped};
}
