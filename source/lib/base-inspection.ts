import {powerCoverage} from './power-coverage.ts';
import {sampleHeight,modelNameFor,MODEL_WORLD_SCALE,type AssetManifest,type StateEntity,type TerrainData} from './wulfram.ts';
export function inspectPower(entity:StateEntity,entities:StateEntity[],radius:number){
  const status=powerCoverage(entity,entities,radius),limit=Math.max(0,radius-10);
  const cells=entities.filter(e=>e.token==='e'&&e.team===entity.team).map(cell=>({cell,distance:Math.hypot(cell.position[0]-entity.position[0],cell.position[1]-entity.position[1])})).sort((a,b)=>a.distance-b.distance);
  return {status,limit,sources:status==='powered'?cells.filter(c=>c.distance<=limit):[],nearest:status==='independent'?undefined:cells[0]};
}
export interface BaseCameraRequest {serial:number;team:number;view:'overhead'|'ground'|'detail';entities:StateEntity[]}
export function baseCameraPose(terrain:TerrainData,entities:StateEntity[],team:number,view:'overhead'|'ground'|'detail',aspect=1,manifest?:AssetManifest){
  const base=entities.filter(e=>e.team===team);if(!base.length)return undefined;
  if(view==='detail'){
    const entity=base[0],bounds=manifest?.models[modelNameFor(entity)??'']?.bounds;
    // A sphere around the model origin also encloses rotated and off-center models.
    const radius=bounds?Math.max(20,Math.hypot(...[0,1,2].map(i=>Math.max(Math.abs(bounds.min[i]),Math.abs(bounds.max[i]))))*MODEL_WORLD_SCALE):80;
    const [x,y,z]=entity.position,distance=radius*3.2/Math.max(.1,Math.min(1,aspect));
    const direction=team===2?-1:1,ex=x+direction*distance*.7,ey=y+distance*.35;
    return {target:[x,y,z] as [number,number,number],eye:[ex,ey,Math.max(z+distance*.7,sampleHeight(terrain,ex,ey)+30)] as [number,number,number]};
  }
  const xs=base.map(e=>e.position[0]),ys=base.map(e=>e.position[1]);
  const x=(Math.min(...xs)+Math.max(...xs))/2,y=(Math.min(...ys)+Math.max(...ys))/2;
  const radius=Math.max(250,...base.map(e=>Math.hypot(e.position[0]-x,e.position[1]-y)+120));
  const z=Math.max(sampleHeight(terrain,x,y),...base.map(e=>e.position[2]))+40;
  if(view==='overhead')return {target:[x,y,z] as [number,number,number],eye:[x,y+1,z+radius*2.8/Math.min(1,aspect)] as [number,number,number]};
  const direction=team===1?1:-1,ex=Math.max(0,Math.min(terrain.worldWidth,x+direction*(radius+150)));
  return {target:[x,y,z] as [number,number,number],eye:[ex,y,Math.max(z+20,sampleHeight(terrain,ex,y)+70)] as [number,number,number]};
}
