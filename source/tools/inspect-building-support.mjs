import fs from 'node:fs';
import {Euler,Vector3} from 'three';
import {modelNameFor,MODEL_WORLD_SCALE,sampleHeight} from '../lib/wulfram.ts';
import {entityRotationToScene} from '../lib/model-transform.ts';
const cache=new Map();
/** Samples actual transformed render vertices. This is not triangle-interior collision proof. */
export function inspectBuildingSupport(project,manifest){
 return project.entities.filter(e=>e.token!=='*').map(entity=>{
  const asset=manifest.models[modelNameFor(entity)];if(!asset)throw new Error(`Missing model for ${entity.id}`);
  if(!cache.has(asset.url))cache.set(asset.url,JSON.parse(fs.readFileSync(`public${asset.url}`,'utf8')));
  const shape=cache.get(asset.url),rotation=new Euler(...entityRotationToScene(entity.rotation),'YXZ');let minimumGap=Infinity,samples=0;
  for(const mesh of shape.meshes)for(let i=0;i<mesh.positions.length;i+=3){
   const point=new Vector3(mesh.positions[i]*MODEL_WORLD_SCALE,mesh.positions[i+2]*MODEL_WORLD_SCALE,-mesh.positions[i+1]*MODEL_WORLD_SCALE).applyEuler(rotation);
   const x=entity.position[0]+point.x,y=entity.position[1]+point.z,z=entity.position[2]+point.y;
   minimumGap=Math.min(minimumGap,z-sampleHeight(project.terrain,x,y));samples++;
  }
  if(!samples)throw new Error(`Empty model for ${entity.id}`);
  return {id:entity.id,token:entity.token,team:entity.team,samples,minimumGap};
 });
}
