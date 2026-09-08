import {lanePath} from './lane-path.ts';
import {distanceToSegment} from './build-areas.ts';
import {stampProtection} from './terrain-stamp-project.ts';
import {assertEditorConstraints} from './editor-constraints.ts';
import type {AssetManifest,WulframProject} from './wulfram.ts';

export interface TerrainLaneOptions {
 points:Array<[number,number]>;
 bend?:number;
 width:number;
 shoulder:number;
 floorHeight:number;
 operation:'cut'|'cut-fill';
 mirror:boolean;
 placementMode:'protected'|'manual';
}
export function previewTerrainLane(project:WulframProject,options:TerrainLaneOptions,manifest:AssetManifest){
 if(!options||typeof options!=='object'||Object.keys(options).some(k=>!['points','bend','width','shoulder','floorHeight','operation','mirror','placementMode'].includes(k)))throw new Error('Invalid lane settings.');
 if(!Array.isArray(options.points)||options.points.length<2||options.points.length>32||options.points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)))throw new Error('Draw a lane with 2–32 finite points.');
 for(const [value,min,max] of [[options.width,80,2000],[options.shoulder,40,2000],[options.floorHeight,-5000,5000]])if(!Number.isFinite(value)||value<min||value>max)throw new Error('Lane dimensions or floor height are outside their limits.');
 if(!['cut','cut-fill'].includes(options.operation)||!['protected','manual'].includes(options.placementMode)||typeof options.mirror!=='boolean')throw new Error('Choose lane operation, placement protection and mirror setting.');
 const bend=options.bend===undefined ? 0 : options.bend;
 if(!Number.isFinite(bend)||Math.abs(bend)>1)throw new Error('Lane bend must be between −100% and 100%.');
 if(bend!==0&&options.points.length!==2)throw new Error('Curved lanes need exactly two endpoints. Use an unbent polyline for multiple points.');
 if(options.points.slice(1).some((p,i)=>Math.hypot(p[0]-options.points[i][0],p[1]-options.points[i][1])<1))throw new Error('Consecutive lane points must differ.');
 const points=lanePath(options.points,bend);
 const terrain=project.terrain,reach=options.width/2+options.shoulder;
 if(points.some(p=>!p.every(Number.isFinite)||p[0]<=reach||p[1]<=reach||p[0]>=terrain.worldWidth-reach||p[1]>=terrain.worldHeight-reach))throw new Error('Move the lane and its shoulders farther inside the map.');
 const dx=terrain.worldWidth/(terrain.width-1),dy=terrain.worldHeight/(terrain.height-1);
 if(options.width<2*Math.max(dx,dy))throw new Error('Lane is too narrow for this terrain grid. Increase its width.');
 const paths=[points,...(options.mirror?[points.map(p=>[terrain.worldWidth-p[0],terrain.worldHeight-p[1]] as [number,number])]:[])];
 const protection=stampProtection(project,manifest,options.placementMode==='protected');
 let changed=0;
 const heights=terrain.heights.map((h,i)=>{
   const x=i%terrain.width*dx,y=Math.floor(i/terrain.width)*dy;
   const distance=Math.min(...paths.flatMap(path=>path.slice(1).map((p,j)=>distanceToSegment(x,y,path[j],p))));
   if(distance>=reach)return h;
   const target=options.operation==='cut'?Math.min(h,options.floorHeight):options.floorHeight;
   if(target===h)return h;
   const t=Math.max(0,Math.min(1,(distance-options.width/2)/options.shoulder)),mix=1-t*t*(3-2*t);
   const next=Number((h+(target-h)*mix).toFixed(6));if(next===h)return h;
   if(!Number.isFinite(next))throw new Error('Lane produced a non-finite height.');
   if(protection.mask?.[i]||protection.circles.some(c=>Math.hypot(x-c.x,y-c.y)<=c.radius+Math.hypot(dx,dy)))throw new Error('Lane touches a protected route or structure. Nothing was applied.');
   changed++;return next;
 });
 if(!changed)throw new Error('This lane would not change terrain. Lower its floor or choose Cut and fill.');
 const next=structuredClone(project);next.terrain={...structuredClone(terrain),heights};
 assertEditorConstraints(project,next,manifest);
 return {project:next,changed};
}
export function applyTerrainLane(project:WulframProject,options:TerrainLaneOptions,manifest:AssetManifest){
 const result=previewTerrainLane(project,options,manifest);
 for(const metadata of [result.project.metadata,...result.project.baseLayouts.map(l=>l.metadata)])if(metadata)for(const key of Object.keys(metadata))if(key.endsWith('.analysis'))delete metadata[key];
 result.project.metadata={...result.project.metadata,'terrainLane.last':JSON.stringify({version:options.bend ? 2 : 1,...options}),'terrainLane.validation':'manual-edit-needs-revalidation'};
 return result;
}
