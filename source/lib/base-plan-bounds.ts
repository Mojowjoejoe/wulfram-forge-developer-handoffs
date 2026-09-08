import {Euler,Vector3} from 'three';
import {entityRotationToScene} from './model-transform.ts';
import {modelNameFor,MODEL_WORLD_SCALE,type AssetManifest,type BaseTemplate} from './wulfram.ts';
export interface BasePlanBounds {minX:number;maxX:number;minY:number;maxY:number;width:number;height:number}
/** Union of both team model boxes in one-team local coordinates and the supplied corridor. Flat sample only. */
export function basePlanBounds(template:BaseTemplate,manifest:AssetManifest,approach?:Array<[number,number]>,reservationWidth=200):BasePlanBounds{
 if(!Number.isFinite(reservationWidth)||reservationWidth<=0)throw new Error('Invalid reservation width.');
 const half=reservationWidth/2;
 const points:Array<[number,number]>=[];
 for(const unit of template.units){
  if(![...unit.offset,...unit.rotation].every(Number.isFinite))throw new Error('Non-finite sample transform.');
  const rotation=new Euler(...entityRotationToScene(unit.rotation),'YXZ');
  for(const team of [1,2]){
   const name=modelNameFor({...unit,team}),bounds=name?manifest.models[name]?.bounds:undefined;
   if(!bounds||![...bounds.min,...bounds.max].every(Number.isFinite))throw new Error('Sample model bounds unavailable.');
   for(const x of [bounds.min[0],bounds.max[0]])for(const y of [bounds.min[1],bounds.max[1]])for(const z of [bounds.min[2],bounds.max[2]]){
    const p=new Vector3(x*MODEL_WORLD_SCALE,z*MODEL_WORLD_SCALE,-y*MODEL_WORLD_SCALE).applyEuler(rotation);
    points.push([unit.offset[0]+p.x,unit.offset[1]+p.z]);
   }
  }
 }
 for(const point of approach??[]){if(!point.every(Number.isFinite))throw new Error('Non-finite entrance point.');for(const dx of [-half,half])for(const dy of [-half,half])points.push([point[0]+dx,point[1]+dy]);}
 if(!points.length)throw new Error('Empty plan.');
 const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1]));
 return {minX,maxX,minY,maxY,width:maxX-minX,height:maxY-minY};
}
