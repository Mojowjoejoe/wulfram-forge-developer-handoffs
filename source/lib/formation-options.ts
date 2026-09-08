import type {FormationRouteSummary} from './formation-route-summary.ts';
import {createCreativeBaseLayout,type CreativePlacement} from './builtin-base-layouts.ts';
import {FormationDiagnosticError,type FormationOverlay} from './formation-diagnostics.ts';
import type {AssetManifest,BaseLayoutState,WulframProject} from './wulfram.ts';
export interface FormationOption {layout?:BaseLayoutState;error?:string;overlay?:FormationOverlay;routeSummary?:FormationRouteSummary}
export function createFormationOptions(project:WulframProject,manifest:AssetManifest,style:string,id:string,seed:string,placement:CreativePlacement):FormationOption[]{
  return [0,1,2].map(i=>{
    try{return {layout:createCreativeBaseLayout(project,manifest,style,`${id}-${i}`,`${seed}:option-${i}`,placement)};}
    catch(error){return {error:error instanceof Error?error.message:'Arrangement failed.',overlay:error instanceof FormationDiagnosticError?error.overlay:undefined};}
  });
}

/** Keep option order and seeds stable; choose only the initial preview, never replace a user's selection. */
export function preferredFormationOption(options:FormationOption[]):FormationOption|undefined{
 const quality=(option:FormationOption)=>{
  const summary=option.routeSummary;
  if(!summary||summary.unavailable||summary.routes<=0)return [1,0,0];
  return [0,summary.blocked,summary.tight];
 };
 let best:FormationOption|undefined;
 for(const option of options){
  if(!option.layout)continue;
  if(!best){best=option;continue;}
  const a=quality(option),b=quality(best);
  for(let i=0;i<a.length;i++){if(a[i]===b[i])continue;if(a[i]<b[i])best=option;break;}
 }
 return best;
}
