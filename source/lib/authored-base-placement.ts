import {restoreAuthoredBase,validateAuthoredBase} from './authored-base-package.ts';
import type {BaseCoordinateFrame} from './portable-base-geometry.ts';
import {restoreBaseGeometry} from './portable-base-geometry.ts';
import {activateBaseLayout,synchronizeActiveBaseLayout,validateProject,catalogFor,hasModelForEntity,structureTerrainClearance,snapStructureToTerrain,MODEL_WORLD_SCALE,modelNameFor,type AssetManifest,type WulframProject,type BaseLayoutState} from './wulfram.ts';
import {Euler,Vector3} from 'three';
import {entityRotationToScene,hasLockedAltitudeAndRotation} from './model-transform.ts';
import {assertEditorConstraints} from './editor-constraints.ts';
import {inspectEntranceRouting} from './entrance-routing.ts';
import {BUILD_AREAS_KEY,readBuildAreas,checkBuildAreas} from './build-areas.ts';

export interface AuthoredBasePlacement {activeLayoutId:string;layoutId:string;frame:BaseCoordinateFrame;terrainMode:'preserve'|'conform'}
/** Pure preview/new-layout operation. GUI/MCP callers own revision checks and one-step history commit. */
export function placeAuthoredBase(project:WulframProject,value:unknown,request:AuthoredBasePlacement,manifest:AssetManifest){
  if(!request||request.activeLayoutId!==project.activeBaseLayoutId||project.baseLayouts.filter(l=>l.id===request.activeLayoutId).length!==1)throw new Error('Active layout changed. Inspect the editor again.');
  if(typeof request.layoutId!=='string'||!request.layoutId.trim()||request.layoutId.length>120||project.baseLayouts.some(l=>l.id===request.layoutId))throw new Error('Choose a new layout ID; existing layouts are preserved.');
  if(!['preserve','conform'].includes(request.terrainMode))throw new Error('Choose preserve or conform terrain placement.');
  const p=validateAuthoredBase(value),next=structuredClone(project);
  synchronizeActiveBaseLayout(next);
  const restored=restoreAuthoredBase(p,request.frame,request.layoutId,next.terrain.worldWidth,next.terrain.worldHeight,manifest);
  const source=restoreBaseGeometry(p.geometry,p.sourceFrame,'source').entities;
  const radii:number[]=[];
  for(const [index,e] of restored.entities.entries()){
    if(!hasModelForEntity(e,manifest))throw new Error(`Missing model for ${e.token}; no layout was added.`);
    const clearance=structureTerrainClearance(e,manifest,catalogFor(e)?.footprint??10,0),radius=clearance.footprint/Math.SQRT2;
    radii.push(radius);
    const [x,y]=e.position;
    if(x-radius<0||y-radius<0||x+radius>next.terrain.worldWidth||y+radius>next.terrain.worldHeight)throw new Error('A complete building footprint would leave the map.');
    if(hasLockedAltitudeAndRotation(e)){
      // Moving the base does not rotate or change the altitude of an editor-locked starship.
      e.position[2]=source[index].position[2];e.rotation=[...source[index].rotation];
    }else {
    const snap=snapStructureToTerrain(next.terrain,x,y,clearance.footprint,e.rotation[2],clearance.groundOffset,clearance.margin);
    if(request.terrainMode==='conform'){
      e.position[2]=snap.height;e.rotation[0]=snap.pitch;e.rotation[1]=snap.roll;
    }else if(e.position[2]<snap.height-.01)throw new Error('Saved building height conflicts with destination terrain. Choose conform placement or another position.');
    }
    const bounds=manifest.models[modelNameFor(e)!].bounds;
    const rotation=new Euler(...entityRotationToScene(e.rotation),'YXZ');
    const corners=[];
    for(const bx of [bounds.min[0],bounds.max[0]])for(const by of [bounds.min[1],bounds.max[1]])for(const bz of [bounds.min[2],bounds.max[2]]){
      corners.push(new Vector3(bx*MODEL_WORLD_SCALE,bz*MODEL_WORLD_SCALE,-by*MODEL_WORLD_SCALE).applyEuler(rotation));
    }
    const minX=x+Math.min(...corners.map(v=>v.x)),maxX=x+Math.max(...corners.map(v=>v.x));
    const minY=y+Math.min(...corners.map(v=>v.z)),maxY=y+Math.max(...corners.map(v=>v.z));
    if(minX<0||minY<0||maxX>next.terrain.worldWidth||maxY>next.terrain.worldHeight)throw new Error('The oriented model would leave the map.');
    radii[index]=Math.max(radius,...corners.map(v=>Math.hypot(v.x,v.z)));
    if(request.terrainMode==='preserve'||hasLockedAltitudeAndRotation(e)){
      const t=next.terrain,sx=t.worldWidth/(t.width-1),sy=t.worldHeight/(t.height-1);
      let peak=-Infinity;
      for(let gy=Math.max(0,Math.floor(minY/sy));gy<=Math.min(t.height-1,Math.ceil(maxY/sy));gy++)for(let gx=Math.max(0,Math.floor(minX/sx));gx<=Math.min(t.width-1,Math.ceil(maxX/sx));gx++)peak=Math.max(peak,t.heights[gy*t.width+gx]);
      const bottom=e.position[2]+Math.min(...corners.map(v=>v.y));
      if(!Number.isFinite(peak)||bottom<peak-.01)throw new Error('Preserved model bounds conflict with terrain. Choose conform placement or another position.');
    }
  }
  for(let i=0;i<restored.entities.length;i++)for(let j=i+1;j<restored.entities.length;j++){
    const a=restored.entities[i],b=restored.entities[j];
    if(Math.hypot(a.position[0]-b.position[0],a.position[1]-b.position[1])-radii[i]-radii[j]<Math.max(8,p.validation.minSpacing))throw new Error('Saved buildings lack full model-footprint clearance.');
  }
  const layout:BaseLayoutState={id:request.layoutId,name:p.name,entities:restored.entities,metadata:{...restored.metadata,'authoredBase.sourceMetadata':JSON.stringify(p.sourceMetadata),'authoredBase.placement':JSON.stringify(request)},validation:{...p.validation},updatedAt:new Date().toISOString()};
  const areaIssues=checkBuildAreas(readBuildAreas(layout.metadata[BUILD_AREAS_KEY]),layout.entities,next.terrain.worldWidth,next.terrain.worldHeight,manifest,new Map(layout.entities.map((e,i)=>[e.id,radii[i]])));
  if(areaIssues.length)throw new Error(areaIssues[0]);
  next.baseLayouts.push(layout);activateBaseLayout(next,layout.id);
  const errors=validateProject(next).filter(i=>i.severity==='error');
  if(errors.length)throw new Error(`Authored base cannot be placed: ${errors[0].message}`);
  const entrances=inspectEntranceRouting(next,manifest,layout);
  assertEditorConstraints(project,next,manifest);
  return {project:next,affectedIds:layout.entities.map(e=>e.id),entrances};
}
