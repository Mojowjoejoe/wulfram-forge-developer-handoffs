import {countedValleyPocketTemplate} from './valley-pockets-count.ts';
import type {CreativeSize} from './creative-base-layouts.ts';
import type {AssetManifest} from './wulfram.ts';
export interface PortableValleyRecipe {
 version:1; recipeVersion:'valley-pockets-v1'|'valley-pockets-v2'; seed:string; size:CreativeSize; targetCount:number;
 shifts:Array<{siteId:string;dx:number;dy:number}>;
}
/** Reconstruct local geometry only. Destination terrain, power and constraints must still be checked. */
export function reconstructPortableValley(value:unknown,manifest:AssetManifest){
 validatePortableValleyRecipe(value);
 const v=value;
 const original=countedValleyPocketTemplate(v.seed,v.size,manifest,v.targetCount),built=structuredClone(original);
 if(original.plan.version!==v.recipeVersion||v.shifts.length!==original.plan.sites.length)throw new Error('Portable Valley Pockets version or yard count does not match its recipe.');
 for(const [i,site] of built.plan.sites.entries()){
  const shift=v.shifts[i];
  if(shift.siteId!==site.id||!Number.isFinite(shift.dx)||!Number.isFinite(shift.dy)||Math.abs(shift.dx)>160||Math.abs(shift.dy)>140||shift.dx%20!==0||shift.dy%20!==0)throw new Error('Invalid portable Valley Pockets yard shift.');
  const {dx,dy}=shift;site.center=[site.center[0]+dx,site.center[1]+dy];
  if(Math.sign(site.center[1])!==site.side||Math.abs(site.center[1])<600||i>0&&site.center[0]-built.plan.sites[i-1].center[0]<320)throw new Error('Portable Valley Pockets yard order or setback is invalid.');
  site.frontage.points[1]=[site.frontage.points[1][0]+dx,site.frontage.points[1][1]+dy];
  for(const index of built.siteUnitIndices[i]){const u=built.template.units[index];u.offset=[u.offset[0]+dx,u.offset[1]+dy];}
  for(const route of built.serviceRoutes.filter(r=>r.siteId===site.id))route.points=route.points.map(([x,y])=>[x+dx,y+dy]);
 }
 const xs:number[]=[],ys:number[]=[];
 for(const site of built.plan.sites){xs.push(site.center[0]-site.radius,site.center[0]+site.radius);ys.push(site.center[1]-site.radius,site.center[1]+site.radius);}
 for(const route of [built.plan.passage,...built.plan.sites.map(s=>s.frontage)])for(const [x,y] of route.points){xs.push(x-route.width/2,x+route.width/2);ys.push(y-route.width/2,y+route.width/2);}
 built.plan.bounds={min:[Math.min(...xs),Math.min(...ys)],max:[Math.max(...xs),Math.max(...ys)]};
 built.template.footprint={width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
 return {...built,originalPlan:original.plan,shifts:structuredClone(v.shifts)};
}

export function validatePortableValleyRecipe(value:unknown):asserts value is PortableValleyRecipe{
 const keysMatch=(value:unknown,keys:string[])=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));
 if(!keysMatch(value,['version','recipeVersion','seed','size','targetCount','shifts']))throw new Error('Invalid portable Valley Pockets fields.');
 const v=value as PortableValleyRecipe;
 if(!v||v.version!==1||!['valley-pockets-v1','valley-pockets-v2'].includes(v.recipeVersion)||typeof v.seed!=='string'||v.seed.length>256||!['small','standard','large','massive'].includes(v.size)||!Number.isInteger(v.targetCount)||v.targetCount<1||v.targetCount>120||!Array.isArray(v.shifts))throw new Error('Invalid portable Valley Pockets recipe.');
 const count={small:2,standard:3,large:4,massive:6}[v.size];
 if(v.shifts.length!==count)throw new Error('Invalid portable Valley Pockets yard count.');
 for(const shift of v.shifts)if(!keysMatch(shift,['siteId','dx','dy'])||typeof shift.siteId!=='string'||!Number.isFinite(shift.dx)||!Number.isFinite(shift.dy)||Math.abs(shift.dx)>160||Math.abs(shift.dy)>140||shift.dx%20!==0||shift.dy%20!==0)throw new Error('Invalid portable Valley Pockets shift.');
}
