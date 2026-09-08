import {capturePortableAuthoring,restorePortableAuthoring,validatePortableAuthoring,type PortableAuthoring} from './portable-authoring.ts';
import {CATALOG,type StateEntity,type Vec3} from './wulfram.ts';

export interface BaseCoordinateFrame {origin:Vec3;yaw:number}
export interface PortableBaseGeometry {
  version:1;
  units:Omit<StateEntity,'id'|'raw'>[];
  authoring:PortableAuthoring;
}
function vector(value:unknown):value is Vec3{
  return Array.isArray(value)&&value.length===3&&value.every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1e9);
}
function frameValid(frame:BaseCoordinateFrame){
  if(!frame||!vector(frame.origin)||!Number.isFinite(frame.yaw)||Math.abs(frame.yaw)>Math.PI*2)throw new Error('Use a finite base origin and yaw from -2π to 2π radians.');
}
function checkUnits(units:unknown):asserts units is PortableBaseGeometry['units']{
  if(!Array.isArray(units)||!units.length||units.length>10000)throw new Error('A portable base needs 1–10,000 building records.');
  for(const u of units){
    if(!u||!CATALOG.some(c=>c.token===u.token&&u.token!=='*'&&(u.token!=='c'||c.subtype===u.subtype))
      ||![0,1,2].includes(u.team)||!vector(u.position)||!vector(u.rotation)||!Number.isSafeInteger(u.active)
      ||(u.subtype!==undefined&&typeof u.subtype!=='string'))throw new Error('Invalid portable base building.');
  }
}
function transform(position:Vec3,frame:BaseCoordinateFrame,inverse:boolean):Vec3{
  const sign=inverse?-1:1,c=Math.cos(sign*frame.yaw),s=Math.sin(sign*frame.yaw);
  const [x,y,z]=inverse?position.map((n,i)=>n-frame.origin[i]):position;
  return [x*c-y*s+(inverse?0:frame.origin[0]),x*s+y*c+(inverse?0:frame.origin[1]),z+(inverse?0:frame.origin[2])];
}
/** Coordinate codec only: never mirrors Team 2, scales, sorts, snaps or drops buildings.
 * Callers must separately preserve reservations/other metadata and validate destination terrain. */
export function captureBaseGeometry(entities:StateEntity[],metadata:Record<string,string>,frame:BaseCoordinateFrame):PortableBaseGeometry{
  frameValid(frame);checkUnits(entities);
  const authoring=capturePortableAuthoring(metadata,entities);
  const units=entities.map(e=>({token:e.token,team:e.team,...(e.subtype===undefined?{}:{subtype:e.subtype}),
    position:transform(e.position,frame,true),rotation:[e.rotation[0],e.rotation[1],e.rotation[2]-frame.yaw] as Vec3,active:e.active}));
  return validateBaseGeometry({version:1,units,authoring});
}
export function validateBaseGeometry(value:unknown):PortableBaseGeometry{
  const p=value as PortableBaseGeometry;
  if(!p||p.version!==1)throw new Error('Unsupported portable base geometry version.');
  checkUnits(p.units);const authoring=validatePortableAuthoring(p.authoring);
  // A local frame is also a rigid placement, so relationship distances remain meaningful.
  restorePortableAuthoring(authoring,p.units.map((u,i)=>({...u,id:`validation-${i}`})));
  return structuredClone(p);
}
/** Decodes into a NEW layout's records. This does not commit or bypass editor constraints.
 * Altitude/pitch/roll are preserved; terrain fitting is a separate, explicit placement operation. */
export function restoreBaseGeometry(value:unknown,frame:BaseCoordinateFrame,idPrefix:string){
  frameValid(frame);
  if(typeof idPrefix!=='string'||!idPrefix.trim()||idPrefix.length>160)throw new Error('Choose a nonempty new base ID of at most 160 characters.');
  const p=validateBaseGeometry(value);
  const entities:StateEntity[]=p.units.map((u,i)=>({...structuredClone(u),id:`${idPrefix}-${i}`,
    position:transform(u.position,frame,false),rotation:[u.rotation[0],u.rotation[1],u.rotation[2]+frame.yaw]}));
  checkUnits(entities);
  return {entities,metadata:restorePortableAuthoring(p.authoring,entities)};
}
