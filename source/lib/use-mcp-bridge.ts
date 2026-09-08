'use client';
import { useLayoutEffect, useRef } from 'react';
import {captureAuthoredBase,exportAuthoredBase,parseAuthoredBase} from './authored-base-package.ts';
import {placeAuthoredBase,type AuthoredBasePlacement} from './authored-base-placement.ts';
import type {BaseCoordinateFrame} from './portable-base-geometry.ts';
import {AUTHORED_LIBRARY_KEY,readAuthoredLibrary,editAuthoredLibrary,commitAuthoredLibrary,recoverAuthoredLibrary,type AuthoredLibraryEdit} from './authored-base-library.ts';
import { flushSync } from 'react-dom';
import { assertEditorConstraints } from './editor-constraints.ts';
import { captureFormationPackage,placeFormationPackage,generateBaseLayout, type CreativeLayoutRequest, editEntities, editTerrain, editTerrainProtection, editLandform, editLane, editEntranceRouting, type EntityEdit, type TerrainEdit, type TerrainProtectionEdit } from './mcp-commands.ts';
import {ENTRANCE_ROUTING_KEY,readEntranceRouting,type EntranceRouting} from './entrance-routing.ts';
import type {TerrainLaneOptions} from './terrain-lane.ts';
import type {TerrainStampOptions} from './terrain-stamp.ts';
import {inspectRoutes} from './inspection-routes.ts';
import { BUILD_AREAS_KEY, readBuildAreas } from './build-areas.ts';
import { validateProject, type WulframProject, type AssetManifest } from './wulfram.ts';

type Host = {project?:WulframProject;manifest?:AssetManifest;selectedEntityId?:string;dirty:boolean;undoCount:number;redoCount:number;commit:(p:WulframProject,kind?:'terrain-protection')=>void;undo:()=>void};
type Command = {action:string;favoriteId?:string;favoriteRequestJson?:string;expectedLibraryRaw?:string|null;libraryEditJson?:string;expectedRevision?:string;edits?:EntityEdit[];brush?:TerrainEdit;activeLayoutId?:string;edit?:TerrainProtectionEdit;stamp?:TerrainStampOptions;placementMode?:'protected'|'manual';lane?:TerrainLaneOptions;vehicleWidth?:number;points?:[number,number][];policy?:EntranceRouting|null;request?:CreativeLayoutRequest;previewOnly?:boolean;sourceFrame?:BaseCoordinateFrame;packageJson?:string;authoredRequest?:AuthoredBasePlacement};
declare global { interface Window { wulframMcp?: {version:1;dispatch:(command:Command)=>unknown} } }

export function useMcpBridge(host: Host) {
  const live=useRef(host),identity=useRef<WulframProject|undefined>(undefined),revision=useRef('');
  useLayoutEffect(()=>{
    live.current=host;
    if(identity.current!==host.project){identity.current=host.project;revision.current=crypto.randomUUID();}
  });
  useLayoutEffect(()=>{
    const state=()=>({revision:revision.current,name:live.current.project?.name??null,ready:!!live.current.project&&!!live.current.manifest,dirty:live.current.dirty,selectedEntityId:live.current.selectedEntityId,undoCount:live.current.undoCount,redoCount:live.current.redoCount});
    const bridge={version:1 as const,dispatch:(c:Command)=>{
      if(!c||typeof c.action!=='string')throw new Error('Invalid command.');
      if(c.action==='get_editor_state')return state();
      const h=live.current,p=h.project;
      if(!p||!h.manifest)throw new Error('Editor is not ready.');
      if(c.action==='inspect_map')return {...state(),dimensions:{width:p.terrain.width,height:p.terrain.height,worldWidth:p.terrain.worldWidth,worldHeight:p.terrain.worldHeight},entities:p.entities,activeBaseLayoutId:p.activeBaseLayoutId,terrainProtection:p.baseLayouts.map(l=>({layoutId:l.id,areas:readBuildAreas(l.metadata[BUILD_AREAS_KEY]).filter(a=>a.kind==='terrain')}))};
      if(c.action==='inspect_routes')return {...state(),activeLayoutId:p.activeBaseLayoutId,...inspectRoutes(p,h.manifest,c.vehicleWidth!,c.points)};
      if(c.action==='inspect_entrances'){const layout=p.baseLayouts.find(l=>l.id===p.activeBaseLayoutId);return {...state(),activeLayoutId:p.activeBaseLayoutId,policy:readEntranceRouting(layout?.metadata[ENTRANCE_ROUTING_KEY])??null,corridors:readBuildAreas(layout?.metadata[BUILD_AREAS_KEY]).filter(a=>a.kind==='corridor')};}
      if(c.action==='validate_map')return {...state(),issues:validateProject(p),evidence:'Offline editor validation; not native-game proof.'};
      if(c.action==='get_snapshot'){
        if(c.expectedRevision!==revision.current)throw new Error('Stale revision. Inspect the editor again.');
        return {...state(),project:p};
      }
      if(c.expectedRevision!==revision.current)throw new Error('Stale revision. Inspect the editor again.');
      if(c.action==='inspect_authored_library'){
        const raw=localStorage.getItem(AUTHORED_LIBRARY_KEY);
        try{return {...state(),raw,library:readAuthoredLibrary(raw),error:null};}catch(error){return {...state(),raw,library:null,error:String(error)};}
      }
      if(c.action==='edit_authored_library'||c.action==='preview_authored_library'||c.action==='recover_authored_library'){
        if(c.expectedLibraryRaw===undefined)throw new Error('Supply the exact inspected library value, or null for absent storage.');
        let result;
        if(c.action==='recover_authored_library'){
          if(c.expectedLibraryRaw===null)throw new Error('No damaged library to recover.');
          result=recoverAuthoredLibrary(localStorage,c.expectedLibraryRaw,crypto.randomUUID(),crypto.randomUUID());
        }else{
          if(typeof c.libraryEditJson!=='string'||c.libraryEditJson.length>2_000_000)throw new Error('Supply a library edit JSON document within 2 MB.');
          const edit=JSON.parse(c.libraryEditJson) as AuthoredLibraryEdit;
          if(c.action==='preview_authored_library'){if(localStorage.getItem(AUTHORED_LIBRARY_KEY)!==c.expectedLibraryRaw)throw new Error('Authored library changed. Inspect again.');return {...state(),previewOnly:true,library:editAuthoredLibrary(readAuthoredLibrary(c.expectedLibraryRaw),edit,crypto.randomUUID())};}
          result=commitAuthoredLibrary(localStorage,c.expectedLibraryRaw,edit,crypto.randomUUID());
        }
        window.dispatchEvent(new Event('authored-library-changed'));
        return {...state(),...result};
      }
      if(c.action==='capture_formation_favorite'){if(!c.activeLayoutId||!c.favoriteId)throw new Error('Supply current layout and favorite ID.');return {...state(),packageJson:captureFormationPackage(p,c.activeLayoutId,c.favoriteId,h.manifest)};}
      if(c.action==='capture_authored_base'){if(!c.sourceFrame||c.activeLayoutId!==p.activeBaseLayoutId)throw new Error('Supply the current layout and source frame.');const layout=p.baseLayouts.find(l=>l.id===p.activeBaseLayoutId);if(!layout)throw new Error('Missing active layout.');return {...state(),packageJson:exportAuthoredBase(captureAuthoredBase({...layout,entities:p.entities,validation:p.validation},c.sourceFrame))};}
      if(c.action==='undo'){
        if(!h.undoCount)throw new Error('Nothing to undo.');
        flushSync(()=>h.undo());return state();
      }
      let result;
      if(c.action==='edit_entities')result=editEntities(p,c.edits??[],h.manifest);
      else if(c.action==='edit_terrain') {if(!c.brush)throw new Error('Missing brush.');result=editTerrain(p,c.brush,h.manifest);}
      else if(c.action==='edit_terrain_protection') {if(!c.edit||!c.activeLayoutId)throw new Error('Missing layout or protection edit.');result=editTerrainProtection(p,c.activeLayoutId,c.edit,h.manifest);}
      else if(c.action==='apply_landform') {if(!c.stamp||!c.placementMode)throw new Error('Missing landform or placement mode.');result=editLandform(p,c.stamp,c.placementMode,h.manifest);}
      else if(c.action==='apply_lane') {if(!c.lane)throw new Error('Missing lane settings.');result=editLane(p,c.lane,h.manifest);}
      else if(c.action==='generate_base_layout') {if(!c.request||typeof c.previewOnly!=='boolean')throw new Error('Supply creative layout request and explicit previewOnly.');result=generateBaseLayout(p,c.request,h.manifest);if(c.previewOnly)return {...state(),previewOnly:true,layout:result.project.baseLayouts.find(l=>l.id===c.request!.layoutId),issues:validateProject(result.project)};}
      else if(c.action==='place_formation_favorite'){if(typeof c.packageJson!=='string'||typeof c.favoriteRequestJson!=='string'||typeof c.previewOnly!=='boolean')throw new Error('Supply favorite package, request and explicit previewOnly.');const favoriteResult=placeFormationPackage(p,c.packageJson,c.favoriteRequestJson,h.manifest);if(c.previewOnly)return {...state(),previewOnly:true,layout:favoriteResult.project.baseLayouts.find(l=>l.id===favoriteResult.layoutId),issues:validateProject(favoriteResult.project)};result=favoriteResult;}
      else if(c.action==='place_authored_base'){if(typeof c.packageJson!=='string'||!c.authoredRequest||typeof c.previewOnly!=='boolean')throw new Error('Supply authored package, placement and explicit previewOnly.');result=placeAuthoredBase(p,parseAuthoredBase(c.packageJson),c.authoredRequest,h.manifest);if(c.previewOnly)return {...state(),previewOnly:true,layout:result.project.baseLayouts.find(l=>l.id===c.authoredRequest!.layoutId),entrances:result.entrances,issues:validateProject(result.project)};}
      else if(c.action==='set_entrance_routing'||c.action==='preview_entrance_routing') {if(c.previewOnly!==undefined&&typeof c.previewOnly!=='boolean')throw new Error('previewOnly must be boolean.');if(c.policy===undefined||!c.activeLayoutId)throw new Error('Supply layout and explicit policy or null.');result=editEntranceRouting(p,c.activeLayoutId,c.policy,h.manifest);if(c.action==='preview_entrance_routing'||c.previewOnly===true)return {...state(),previewOnly:true,layout:result.project.baseLayouts.find(l=>l.id===c.activeLayoutId)};}
      else throw new Error('Unknown editor command.');
      const protection=c.action==='edit_terrain_protection';
      assertEditorConstraints(p,result.project,h.manifest,false,protection);
      const priorRevision=revision.current;
      flushSync(()=>h.commit(result.project,protection?'terrain-protection':undefined));
      if((protection||c.action==='place_formation_favorite'||c.action==='place_authored_base'||c.action==='generate_base_layout'||c.action==='apply_landform'||c.action==='apply_lane'||c.action==='set_entrance_routing')&&revision.current===priorRevision)throw new Error('Edit was not committed. Inspect the editor again.');
      return {...state(),...('affectedIds' in result?{affectedIds:result.affectedIds}:'affectedAreaId' in result?{affectedAreaId:result.affectedAreaId}:{vertices:result.vertices}),issues:validateProject(result.project)};
    }};
    window.wulframMcp=bridge;
    return ()=>{if(window.wulframMcp===bridge)delete window.wulframMcp;};
  },[]);
}

