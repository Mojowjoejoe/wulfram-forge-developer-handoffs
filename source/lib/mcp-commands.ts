import {applyManualTerrainBrush,type ManualTerrainBrush} from './manual-terrain-brush.ts';
import {favoriteFromLayout,placeFavorite} from './formation-favorites.ts';
import {exportPortableBases,parsePortableBases} from './portable-base-library.ts';
import {createCreativeBaseLayout,type CreativePlacement} from './builtin-base-layouts.ts';
import {activateBaseLayout} from './wulfram.ts';
import { cloneProject, catalogFor, hasModelForEntity, snapStructureToTerrain, structureTerrainClearance, synchronizeActiveBaseLayout, validateProject, type WulframProject, type AssetManifest, type StateEntity } from './wulfram.ts';
import { paintTerrainTextureVertex } from './terrain-textures.ts';
import { hasLockedAltitudeAndRotation } from './model-transform.ts';
import { assertEditorConstraints, withBuildAreas } from './editor-constraints.ts';
import { BUILD_AREAS_KEY, readBuildAreas, type BuildArea } from './build-areas.ts';
import { DISTRICTS_KEY, readDistricts } from './base-districts.ts';
import {applyProjectStamp} from './terrain-stamp-project.ts';
import {readStampLibrary} from './stamp-library.ts';
import type {TerrainStampOptions} from './terrain-stamp.ts';
import {applyTerrainLane,type TerrainLaneOptions} from './terrain-lane.ts';
import {withEntranceRouting,type EntranceRouting} from './entrance-routing.ts';

export type CreativeLayoutRequest={activeLayoutId:string;layoutId:string;style:string;seed:string;placement:CreativePlacement};
/** Generate and activate a new state on a clone; callers may inspect it without committing. */
export function generateBaseLayout(project:WulframProject,request:CreativeLayoutRequest,manifest:AssetManifest){
 if(!request||typeof request!=='object'||Array.isArray(request)||Object.keys(request).some(k=>!['activeLayoutId','layoutId','style','seed','placement'].includes(k)))throw new Error('Invalid creative layout request.');
 for(const key of ['activeLayoutId','layoutId','style','seed'] as const)if(typeof request[key]!=='string'||!request[key].trim()||request[key].length>120)throw new Error(`Invalid ${key}.`);
 if(request.activeLayoutId!==project.activeBaseLayoutId||project.baseLayouts.filter(l=>l.id===request.activeLayoutId).length!==1)throw new Error('Active layout changed. Inspect the editor again.');
 if(project.baseLayouts.some(l=>l.id===request.layoutId))throw new Error('Choose a new layout ID; existing layouts are preserved.');
 const placement=request.placement;
 if(!placement||typeof placement!=='object'||Array.isArray(placement)||Object.keys(placement).some(k=>!['size','x','y','rotation','radius','targetCount','checkAccess','terrainAware','entranceDegrees','offsetArrangement'].includes(k)))throw new Error('Invalid placement settings.');
 for(const key of ['checkAccess','terrainAware'] as const)if(placement[key]!==undefined&&typeof placement[key]!=='boolean')throw new Error(`Invalid ${key}.`);
 const next=cloneProject(project);
 synchronizeActiveBaseLayout(next);
 const layout=createCreativeBaseLayout(next,manifest,request.style,request.layoutId,request.seed,placement);
 next.baseLayouts.push(layout);activateBaseLayout(next,layout.id);
 return {project:finish(project,next,manifest),affectedIds:layout.entities.map(e=>e.id)};
}

export function captureFormationPackage(project:WulframProject,activeLayoutId:string,favoriteId:string,manifest:AssetManifest){
 if(activeLayoutId!==project.activeBaseLayoutId||typeof favoriteId!=='string'||!favoriteId.trim()||favoriteId.length>120)throw new Error('Supply the active layout and a valid favorite ID.');
 const layout=project.baseLayouts.find(l=>l.id===activeLayoutId);
 if(!layout?.metadata['formation.placement'])throw new Error('The active layout has no saved formation placement.');
 return exportPortableBases([favoriteFromLayout({...layout,entities:project.entities,validation:project.validation},JSON.parse(layout.metadata['formation.placement']),favoriteId,project,manifest)]);
}
export function placeFormationPackage(project:WulframProject,packageJson:string,requestJson:string,manifest:AssetManifest){
 if(typeof requestJson!=='string'||requestJson.length>4000)throw new Error('Invalid favorite placement request.');
 const r=JSON.parse(requestJson);
 if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).some(k=>!['activeLayoutId','layoutId','favoriteId','placement'].includes(k)))throw new Error('Invalid favorite placement fields.');
 for(const key of ['activeLayoutId','layoutId','favoriteId'])if(typeof r[key]!=='string'||!r[key].trim()||r[key].length>120)throw new Error('Invalid favorite placement identity.');
 if(r.activeLayoutId!==project.activeBaseLayoutId||project.baseLayouts.filter(l=>l.id===r.activeLayoutId).length!==1||project.baseLayouts.some(l=>l.id===r.layoutId))throw new Error('Supply the active layout and a fresh layout ID.');
 const p=r.placement;
 if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!['size','x','y','rotation','radius','targetCount','checkAccess','terrainAware'].includes(k))||!['small','standard','large','massive'].includes(p.size)||![p.x,p.y,p.rotation,p.radius].every(Number.isFinite)||p.radius<100||p.radius>4000)throw new Error('Invalid favorite placement settings.');
 for(const key of ['checkAccess','terrainAware'])if(p[key]!==undefined&&typeof p[key]!=='boolean')throw new Error('Invalid favorite placement flag.');
 if(p.targetCount!==undefined&&(!Number.isInteger(p.targetCount)||p.targetCount<0||p.targetCount>120))throw new Error('Invalid favorite count.');
 const favorite=parsePortableBases(packageJson).find(f=>f.id===r.favoriteId);if(!favorite)throw new Error('Favorite ID is missing from this package.');
 const next=cloneProject(project);synchronizeActiveBaseLayout(next);
 const layout=placeFavorite(next,manifest,favorite,p,r.layoutId);next.baseLayouts.push(layout);activateBaseLayout(next,layout.id);
 return {project:finish(project,next,manifest),affectedIds:layout.entities.map(e=>e.id),layoutId:layout.id};
}

export function editEntranceRouting(project:WulframProject,activeLayoutId:string,policy:EntranceRouting|null,manifest:AssetManifest){
 if(activeLayoutId!==project.activeBaseLayoutId)throw new Error('Active layout changed. Inspect the editor again.');
 if(policy===undefined)throw new Error('Supply an entrance policy, or null to clear it.');
 const next=cloneProject(project),matches=next.baseLayouts.filter(l=>l.id===activeLayoutId);
 if(matches.length!==1)throw new Error('Active layout must resolve exactly once.');
 const layout={...matches[0],entities:next.entities,validation:next.validation};
 const updated=withEntranceRouting(next,manifest,layout,policy??undefined);
 next.baseLayouts=next.baseLayouts.map(l=>l.id===activeLayoutId?updated:l);
 return {project:finish(project,next,manifest),affectedIds:[] as string[]};
}

export type EntityEdit = { operation: 'move' | 'remove' | 'add'; id?: string; token?: string; subtype?: string; team?: number; x?: number; y?: number; yaw?: number; mirror?: boolean };
export type TerrainEdit = ManualTerrainBrush | { operation: 'raise' | 'lower' | 'flatten' | 'smooth' | 'texture'; x: number; y: number; radius: number; value?: number; texture?: string; mirror?: boolean };
export type TerrainProtectionEdit = {operation:'add';name:string;x:number;y:number;width:number;height:number}|{operation:'remove';id:string};
export function editLane(project:WulframProject,lane:TerrainLaneOptions,manifest:AssetManifest){
 const result=applyTerrainLane(project,lane,manifest);
 return {project:finish(project,result.project,manifest),vertices:result.changed};
}
export function editLandform(project:WulframProject,stamp:TerrainStampOptions,placementMode:'protected'|'manual',manifest:AssetManifest){
  if(!['protected','manual'].includes(placementMode))throw new Error('Choose explicit protected or manual placement.');
  if(!stamp||typeof stamp!=='object'||Array.isArray(stamp))throw new Error('Missing landform settings.');
  const allowed=['x','y','preset','radius','aspect','rotation','amplitude','edgePower','mirror','length','width','seed','naturalness','roughness','bend','blend','textureName','textureCoverage','shapeVersion'];
  if(Object.keys(stamp).some(k=>!allowed.includes(k)))throw new Error('Unexpected landform setting.');
  const x=finite(stamp.x,'x'),y=finite(stamp.y,'y');
  const settings=readStampLibrary(JSON.stringify([{name:'MCP landform',options:stamp}]))[0].options;
  const next=applyProjectStamp(project,{...settings,x,y},manifest,placementMode==='protected');
  if(next.terrain.heights.some(h=>!Number.isFinite(h)))throw new Error('Landform produced a non-finite terrain height.');
  return {project:finish(project,next,manifest),vertices:next.terrain.heights.filter((h,i)=>h!==project.terrain.heights[i]).length};
}
export function editTerrainProtection(project:WulframProject,activeLayoutId:string,edit:TerrainProtectionEdit,manifest:AssetManifest){
  if(typeof activeLayoutId!=='string'||activeLayoutId!==project.activeBaseLayoutId)throw new Error('Active layout changed. Inspect the editor again.');
  const layouts=project.baseLayouts.filter(l=>l.id===activeLayoutId);
  if(layouts.length!==1)throw new Error('Active layout must resolve exactly once.');
  const areas=readBuildAreas(layouts[0].metadata[BUILD_AREAS_KEY]);
  if(!edit||typeof edit!=='object'||Array.isArray(edit))throw new Error('Invalid terrain protection edit.');
  let next:BuildArea[],affectedAreaId:string;
  if(edit.operation==='add'){
    if(Object.keys(edit).some(k=>!['operation','name','x','y','width','height'].includes(k)))throw new Error('Unexpected terrain protection field.');
    if(typeof edit.name!=='string'||!edit.name.trim()||edit.name.length>120)throw new Error('Protection name needs 1–120 characters.');
    for(const key of ['x','y','width','height'] as const)finite(edit[key],key);
    affectedAreaId=crypto.randomUUID();
    next=[...areas,{id:affectedAreaId,name:edit.name.trim(),kind:'terrain',team:'all',x:edit.x,y:edit.y,width:edit.width,height:edit.height}];
  }else if(edit.operation==='remove'){
    if(Object.keys(edit).some(k=>!['operation','id'].includes(k)))throw new Error('Unexpected terrain protection field.');
    const matches=areas.filter(a=>a.id===edit.id&&a.kind==='terrain');
    if(typeof edit.id!=='string'||matches.length!==1)throw new Error('Terrain protection ID must resolve exactly once in the active layout.');
    affectedAreaId=edit.id;next=areas.filter(a=>a.id!==edit.id);
  }else throw new Error('Unknown terrain protection operation.');
  return {project:withBuildAreas(project,next,manifest),affectedAreaId};
}
const finite = (n: unknown, label: string): number => { if (typeof n !== 'number' || !Number.isFinite(n)) throw new Error(`${label} must be finite.`); return n; };
function snap(e: StateEntity, p: WulframProject, manifest: AssetManifest) {
  if (hasLockedAltitudeAndRotation(e) || !hasModelForEntity(e,manifest)) return;
  const c = structureTerrainClearance(e, manifest, catalogFor(e)?.footprint ?? 10, 0);
  const s = snapStructureToTerrain(p.terrain, e.position[0], e.position[1], c.footprint, e.rotation[2], c.groundOffset, c.margin);
  e.position[2] = s.height; e.rotation[0] = s.pitch; e.rotation[1] = s.roll;
}
function inside(p: WulframProject, x: number, y: number) {
  finite(x,'x'); finite(y,'y');
  if (x < 0 || y < 0 || x > p.terrain.worldWidth || y > p.terrain.worldHeight) throw new Error('Position is outside map bounds.');
}
function finish(original: WulframProject, draft: WulframProject, manifest:AssetManifest) {
  synchronizeActiveBaseLayout(draft, new Date().toISOString());
  assertEditorConstraints(original,draft,manifest);
  const previous = new Set(validateProject(original).filter(i=>i.severity==='error').map(i=>`${i.entityId}:${i.code}`));
  const added = validateProject(draft).filter(i=>i.severity==='error'&&!previous.has(`${i.entityId}:${i.code}`));
  if (added.length) throw new Error(`Edit rejected; new validation errors: ${JSON.stringify(added)}`);
  return draft;
}
export function editEntities(project: WulframProject, edits: EntityEdit[], manifest: AssetManifest) {
  if (!Array.isArray(edits) || !edits.length || edits.length > 128) throw new Error('Supply 1–128 edits.');
  const p = cloneProject(project); const touched = new Set<string>();
  for (const edit of edits) {
    if (!['move','remove','add'].includes(edit.operation)) throw new Error('Unknown entity operation.');
    let e: StateEntity;
    if (edit.operation === 'add') {
      if (typeof edit.token !== 'string' || ![1,2].includes(edit.team ?? 0)) throw new Error('Add needs a supported token and team 1 or 2.');
      e = {id:`mcp-${crypto.randomUUID()}`,token:edit.token,subtype:edit.subtype,team:edit.team!,position:[finite(edit.x,'x'),finite(edit.y,'y'),0],rotation:[0,0,edit.yaw===undefined?0:finite(edit.yaw,'yaw')],active:1};
      if (!hasModelForEntity(e, manifest) || hasLockedAltitudeAndRotation(e)) throw new Error('Unsupported placement; use supported ground structures.');
      p.entities.push(e);
    } else {
      const candidates = p.entities.filter(e=>e.id===edit.id);
      if (candidates.length!==1) throw new Error('Entity ID must resolve exactly once.');
      e=candidates[0];
    }
    if (touched.has(e.id)) throw new Error('Each entity may be changed only once per batch.');
    touched.add(e.id);
    let pair: StateEntity | undefined;
    if (edit.mirror) {
      if (![1,2].includes(e.team)) throw new Error('Only team entities can be mirrored.');
      if (edit.operation==='add') {
        pair={...e,id:`mcp-${crypto.randomUUID()}`,team:3-e.team,position:[p.terrain.worldWidth-e.position[0],p.terrain.worldHeight-e.position[1],0],rotation:[0,0,(e.rotation[2]+Math.PI)%(2*Math.PI)]};
        if (!hasModelForEntity(pair,manifest)) throw new Error('Opposing model unavailable.');
        p.entities.push(pair);
      } else {
        const pairs=p.entities.filter(o=>o.team===3-e.team&&o.token===e.token&&o.subtype===e.subtype&&Math.hypot(o.position[0]-(p.terrain.worldWidth-e.position[0]),o.position[1]-(p.terrain.worldHeight-e.position[1]))<0.01);
        if(pairs.length!==1)throw new Error('Mirrored partner missing or ambiguous.');pair=pairs[0];
      }
      if(touched.has(pair.id))throw new Error('Mirrored entity already edited in this batch.');touched.add(pair.id);
    }
    if(edit.operation==='remove'){const ids=new Set([e.id,pair?.id]);p.entities=p.entities.filter(o=>!ids.has(o.id));continue;}
    if(edit.operation==='move'){
      e.position[0]=edit.x===undefined?e.position[0]:finite(edit.x,'x');e.position[1]=edit.y===undefined?e.position[1]:finite(edit.y,'y');
      if(edit.yaw!==undefined){if(hasLockedAltitudeAndRotation(e))throw new Error('Starship rotation is locked.');e.rotation[2]=finite(edit.yaw,'yaw');}
      if(pair){pair.position[0]=p.terrain.worldWidth-e.position[0];pair.position[1]=p.terrain.worldHeight-e.position[1];if(!hasLockedAltitudeAndRotation(pair))pair.rotation[2]=(e.rotation[2]+Math.PI)%(2*Math.PI);}
    }
    for(const target of [e,pair])if(target){inside(p,target.position[0],target.position[1]);snap(target,p,manifest);}
  }
  return {project:finish(project,p,manifest),affectedIds:[...touched]};
}
export function editTerrain(project: WulframProject, edit: TerrainEdit, manifest: AssetManifest) {
  if('profile' in edit){
    const result=applyManualTerrainBrush(project,edit as ManualTerrainBrush,manifest);
    if(!result.vertices)throw new Error('This editor brush would not change terrain.');
    return result;
  }
  if(!['raise','lower','flatten','smooth','texture'].includes(edit.operation))throw new Error('Unknown terrain operation.');
  inside(project,edit.x,edit.y);const radius=finite(edit.radius,'radius');
  if(radius<=0||radius>Math.max(project.terrain.worldWidth,project.terrain.worldHeight))throw new Error('Invalid brush radius.');
  if(['raise','lower','flatten'].includes(edit.operation))finite(edit.value,'value');
  if(['raise','lower'].includes(edit.operation)&&edit.value!<0)throw new Error('Raise/lower amount must be nonnegative.');
  if(edit.operation==='texture'&&(!edit.texture||!manifest.terrainTextures[edit.texture]))throw new Error('Unknown texture.');
  const p=cloneProject(project),t=p.terrain,old=t.heights.slice(),centers=[[edit.x,edit.y]];
  if(edit.mirror)centers.push([t.worldWidth-edit.x,t.worldHeight-edit.y]);
  const tags=new Map(t.tagmap2.map((s,i)=>[s.trim(),i]));let vertices=0;
  for(let row=0;row<t.height;row++)for(let col=0;col<t.width;col++){
    const x=col*t.worldWidth/(t.width-1),y=row*t.worldHeight/(t.height-1),d=Math.min(...centers.map(([cx,cy])=>Math.hypot(x-cx,y-cy)));
    if(d>radius)continue;vertices++;const i=row*t.width+col,v=1-d/radius,w=v*v*(3-2*v);
    if(edit.operation==='texture'){paintTerrainTextureVertex(t,col,row,edit.texture!,tags);continue;}
    if(edit.operation==='flatten')t.heights[i]=old[i]+(edit.value!-old[i])*w;
    else if(edit.operation==='smooth') {let sum=0,n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=col+dx,yy=row+dy;if(xx>=0&&xx<t.width&&yy>=0&&yy<t.height){sum+=old[yy*t.width+xx];n++;}}t.heights[i]=old[i]+(sum/n-old[i])*w;}
    else t.heights[i]=old[i]+(edit.operation==='raise'?1:-1)*edit.value!*w;
    if(!Number.isFinite(t.heights[i])||Math.abs(t.heights[i])>100000)throw new Error('Height outside supported editing range.');
  }
  if(!vertices)throw new Error('Brush touched no terrain vertices.');
  const lockedIds=new Set(readDistricts(p.baseLayouts.find(l=>l.id===p.activeBaseLayoutId)?.metadata[DISTRICTS_KEY]).filter(g=>g.locked).flatMap(g=>g.entityIds));
  if(edit.operation!=='texture')for(const e of p.entities){
    if(lockedIds.has(e.id))continue;
    // Compare the complete footprint support, including interpolated edge samples.
    // Keep authored transforms when the brush has not changed that support.
    const before:StateEntity={...e,position:[...e.position],rotation:[...e.rotation]};
    const after:StateEntity={...e,position:[...e.position],rotation:[...e.rotation]};
    snap(before,project,manifest);snap(after,p,manifest);
    if(before.position[2]!==after.position[2]||before.rotation[0]!==after.rotation[0]||before.rotation[1]!==after.rotation[1]){
      e.position=after.position;e.rotation=after.rotation;
    }
  }
  return {project:finish(project,p,manifest),vertices};
}

