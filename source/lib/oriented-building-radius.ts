import {Euler,Vector3} from 'three';
import {entityRotationToScene} from './model-transform.ts';
import {MODEL_WORLD_SCALE,modelNameFor,hasModelForEntity,structureTerrainClearance,type AssetManifest,type StateEntity} from './wulfram.ts';
/** Conservative XY circle enclosing all eight transformed model-bound corners. */
export function orientedBuildingRadius(e:StateEntity,manifest:AssetManifest){
 if(!hasModelForEntity(e,manifest)||![...e.position,...e.rotation].every(Number.isFinite))throw new Error('An entity cannot be footprint-checked. Resolve its model or coordinates first.');
 const bounds=manifest.models[modelNameFor(e)!].bounds,rotation=new Euler(...entityRotationToScene(e.rotation),'YXZ');
 const corners=[];
 for(const x of [bounds.min[0],bounds.max[0]])for(const y of [bounds.min[1],bounds.max[1]])for(const z of [bounds.min[2],bounds.max[2]])corners.push(new Vector3(x*MODEL_WORLD_SCALE,z*MODEL_WORLD_SCALE,-y*MODEL_WORLD_SCALE).applyEuler(rotation));
 return Math.max(structureTerrainClearance(e,manifest,0,0).footprint/Math.SQRT2,...corners.map(v=>Math.hypot(v.x,v.z)));
}
