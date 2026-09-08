import {captureValleyPocketRecipe,sameValleyGeometry} from './valley-pockets-capture.ts';
import {validatePortableValleyRecipe,reconstructPortableValley,type PortableValleyRecipe} from './valley-pockets-portable.ts';
import {previewValleyPocketPlacement} from './valley-pockets-placement.ts';
import {captureReservations,placeReservations,validateReservations,type PortableReservations} from './portable-reservations.ts';
import {placeFormation,type CreativePlacement} from './builtin-base-layouts.ts';
import {CATALOG,structureTerrainClearance,type AssetManifest,type BaseLayoutState,type BaseTemplate,type WulframProject} from './wulfram.ts';
export interface FormationFavorite {id:string;name:string;template:BaseTemplate;radius:number;kind?:'base'|'district';reservations?:PortableReservations;valleyRecipe?:PortableValleyRecipe}
export function favoriteFromLayout(layout:BaseLayoutState,placement:CreativePlacement,id:string,project?:WulframProject,manifest?:AssetManifest):FormationFavorite{
 if(layout.metadata['formation.style']==='valley-pockets'){
  if(!project||!manifest)throw new Error('Valley Pockets favorites are not supported without source map and model evidence.');
  const {recipe,template}=captureValleyPocketRecipe(layout,placement,project,manifest);
  return {id,name:layout.name,radius:placement.radius,valleyRecipe:recipe,template};
 }
  const yaw=placement.rotation*Math.PI/180,c=Math.cos(yaw),s=Math.sin(yaw);
  const units=layout.entities.filter(e=>e.team===1).map(e=>{
    const x=e.position[0]-placement.x,y=e.position[1]-placement.y;
    return {token:e.token,offset:[x*c+y*s,-x*s+y*c] as [number,number],rotation:[0,0,e.rotation[2]-yaw] as [number,number,number],groundOffset:0,active:e.active};
  });
  return {id,name:layout.name,...captureReservations(layout,placement,project),radius:placement.radius,template:{id,name:layout.name,sourceMap:'Saved formation',sourceState:id,sourceTeam:1,sourceWorldSize:[1,1],sourceAnchor:[0,0],unitCount:units.length,footprint:{width:placement.radius*2,height:placement.radius*2},units}};
}
export function readFormationFavorites(raw:string):FormationFavorite[]{
  const value:unknown=JSON.parse(raw);
  if(!Array.isArray(value)||value.length>50)throw new Error('Invalid favorites library.');
  for(const item of value){
    if(!item||typeof item.id!=='string'||typeof item.name!=='string'||!Number.isFinite(item.radius)||!Array.isArray(item.template?.units)||item.template.units.length<1||item.template.units.length>120)throw new Error('Invalid saved formation.');
    if(item.valleyRecipe!==undefined){validatePortableValleyRecipe(item.valleyRecipe);if(item.kind==='district'||item.reservations!==undefined)throw new Error('Valley Pockets cannot mix portable policies.');}
    if(item.kind!==undefined&&item.kind!=='base'&&item.kind!=='district')throw new Error('Unknown saved arrangement kind.');
    if(item.reservations!==undefined){if(item.kind==='district')throw new Error('District reservations are not supported.');validateReservations(item.reservations);}
    for(const u of item.template.units)if(!(item.kind==='district'?CATALOG.some(c=>c.token===u.token&&u.token!=='*'&&(u.token!=='c'||c.subtype===u.subtype)):['e','r','f','u','g','s','L','d','p'].includes(u.token))||!Array.isArray(u.offset)||u.offset.length!==2||!u.offset.every(Number.isFinite)||!Array.isArray(u.rotation)||u.rotation.length!==3||!u.rotation.every(Number.isFinite))throw new Error('Invalid saved structure.');
  }
  return value as FormationFavorite[];
}
export function placeFavorite(project:WulframProject,manifest:AssetManifest,favorite:FormationFavorite,placement:CreativePlacement,id:string){
  if(favorite.valleyRecipe){
    const recipe=favorite.valleyRecipe,built=reconstructPortableValley(recipe,manifest);
    if(!sameValleyGeometry(favorite.template.units,built.template.units)||!sameValleyGeometry(favorite.template.footprint,built.template.footprint)||favorite.template.unitCount!==built.template.unitCount)throw new Error('Saved Valley Pockets template differs from its recipe.');
    const options={...placement,size:recipe.size,targetCount:recipe.targetCount};
    const preview=previewValleyPocketPlacement(project,manifest,recipe.seed,options,id,recipe),active=preview.project.baseLayouts.find(l=>l.id===preview.project.activeBaseLayoutId)!;
    return {...active,id,name:favorite.name,entities:preview.project.entities,updatedAt:new Date().toISOString(),metadata:{...active.metadata,'formation.style':'valley-pockets','formation.version':recipe.recipeVersion,'formation.favorite':favorite.id,'formation.seed':recipe.seed,'formation.placement':JSON.stringify(options),'formation.access':JSON.stringify({routes:[...preview.access.routes,...preview.access.serviceRoutes].map(r=>r.points),blocked:[],clearance:96})}};
  }
  if(favorite.kind==='district')throw new Error('District modules use single-team template placement.');
  if(favorite.template.units.some(u=>Math.hypot(...u.offset)+Math.max(...[1,2].map(team=>structureTerrainClearance({token:u.token,team},manifest,0,0).footprint/Math.SQRT2))>placement.radius))throw new Error('Saved formation exceeds the yellow building area. Increase the radius.');
  const layout=placeFormation(project,manifest,favorite.template,id,favorite.name,{'formation.favorite':favorite.id,'formation.placement':JSON.stringify(placement)},placement,favorite.reservations?'shared-footprint-v2':'legacy');
  if(favorite.reservations)placeReservations(project,manifest,layout,placement,favorite.reservations);
  return layout;
}
