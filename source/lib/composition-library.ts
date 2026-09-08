import {readTerrainComposition,type TerrainComposition} from './terrain-composition.ts';
export const COMPOSITION_LIBRARY_KEY='forge-terrain-compositions-v1';
export function readCompositionLibrary(raw:string):TerrainComposition[]{
 if(raw.length>2000000)throw new Error('Composition library exceeds 2 MB.');
 const value=JSON.parse(raw);
 if(!Array.isArray(value)||value.length>20)throw new Error('Composition library must contain at most 20 recipes.');
 const names=new Set<string>();
 return value.map(v=>{const recipe=readTerrainComposition(JSON.stringify(v));if(names.has(recipe.name))throw new Error('Saved composition names must be unique.');names.add(recipe.name);return recipe;});
}
export function saveCompositionEntry(current:TerrainComposition[],recipe:TerrainComposition,replaceName?:string){
 const entries=readCompositionLibrary(JSON.stringify(current)),next=readTerrainComposition(JSON.stringify(recipe));
 if(replaceName!==undefined&&!entries.some(e=>e.name===replaceName))throw new Error('Selected composition no longer exists. Reload the library.');
 if(entries.some(e=>e.name===next.name&&e.name!==replaceName))throw new Error('That name is already saved. Choose a different name or select it and use Update selected.');
 return readCompositionLibrary(JSON.stringify(replaceName===undefined?[...entries,next]:entries.map(e=>e.name===replaceName?next:e)));
}
