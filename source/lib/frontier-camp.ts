import {structureTerrainClearance,type AssetManifest,type BaseTemplate,type BaseTemplateUnit,type WulframProject} from './wulfram.ts';
import type {CreativeSize} from './creative-base-layouts.ts';
import type {BuildArea} from './build-areas.ts';
export const FRONTIER_CAMP_VERSION='frontier-camp-v1';
export function frontierRequiredCounts(size:CreativeSize):Record<string,number>{
 const counts={small:{e:2,u:1,r:1,f:1,g:1,s:1,L:0},standard:{e:4,u:1,r:2,f:2,g:2,s:1,L:0},large:{e:6,u:1,r:2,f:2,g:2,s:2,L:1},massive:{e:8,u:1,r:2,f:2,g:3,s:3,L:3}}[size];
 if(!counts)throw new Error('Unsupported Frontier Camp size.');return counts;
}
export function assertFrontierComposition(template:BaseTemplate,size:CreativeSize){
 for(const [token,min] of Object.entries(frontierRequiredCounts(size))){const count=template.units.filter(u=>u.token===token).length;if(count<min)throw new Error(`Frontier Camp ${size} needs at least ${min} ${token} structures to retain its roles. Raise the target count or choose a smaller size.`);}
}
export const FRONTIER_CAMP_SITES:Record<CreativeSize,Array<[number,number]>>={small:[[-350,0]],standard:[[-350,0],[-100,-750]],large:[[-350,0],[-100,-750],[-850,750]],massive:[[-350,0],[-100,-750],[-850,750],[-1050,-700]]};
/** Experimental family: occupied hook west of a deliberately empty expansion strip. */
export function frontierCampTemplate(seed:string,size:CreativeSize,manifest:AssetManifest):BaseTemplate{
 const sites=FRONTIER_CAMP_SITES[size];if(!sites)throw new Error('Unsupported Frontier Camp size.');
 let state=2166136261;for(const c of `${FRONTIER_CAMP_VERSION}:${seed}`)state=Math.imul(state^c.charCodeAt(0),16777619)>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const units:BaseTemplateUnit[]=[],radii=new Map<string,number>();
 const radius=(token:string)=>{if(!radii.has(token))radii.set(token,Math.max(...[1,2].map(team=>structureTerrainClearance({token,team},manifest,0,0).footprint/Math.SQRT2)));return radii.get(token)!;};
 const add=(token:string,x:number,y:number,yaw=0)=>units.push({token,offset:[x,y],groundOffset:0,rotation:[0,0,yaw],active:1});
 sites.forEach(([x,y],i)=>{
  const cx=x+(random()-.5)*35,cy=y+(random()-.5)*35;add('e',cx-20,cy);add('e',cx+20,cy);
  const tokens=i===0?['u','r','f','g','s']:i===1?['r','f','g','g']:i===2?['s','s','L','d']:['g','L','L','s'];
  if(random()>.45)tokens.push(i<2?'d':'g');
  for(const token of tokens){let placed=false;for(let n=0;n<400;n++){
   const rear=['u','r','f'].includes(token),angle=(rear?Math.PI:0)+(random()-.5)*Math.PI,distance=110+random()*110;
   const px=cx+Math.cos(angle)*distance,py=cy+Math.sin(angle)*distance;
   if(units.some(u=>Math.hypot(px-u.offset[0],py-u.offset[1])<radius(token)+radius(u.token)+14))continue;
   add(token,px,py,angle);placed=true;break;
  }if(!placed)throw new Error('Frontier Camp seed cannot fit its required role budget.');}
 });
 return {id:'experimental-frontier-camp-v1',name:'Frontier Camp (review candidate)',description:'An occupied service hook west of an empty reserved expansion strip. Larger sizes add supply, anti-air and missile roles around the hook.',sourceMap:FRONTIER_CAMP_VERSION,sourceState:seed,sourceTeam:1,sourceWorldSize:[12000,8000],sourceAnchor:[0,0],unitCount:units.length,footprint:{width:Math.max(...units.map(u=>u.offset[0]))-Math.min(...units.map(u=>u.offset[0]))+100,height:Math.max(...units.map(u=>u.offset[1]))-Math.min(...units.map(u=>u.offset[1]))+100},units};
}
export function frontierExpansionAreas(project:WulframProject,x:number,y:number,rotation:number):BuildArea[]{
 if(![x,y,rotation].every(Number.isFinite))throw new Error('Expansion placement must be finite.');
 return [1,2].map(team=>{const yaw=(rotation+(team===2?180:0))*Math.PI/180,c=Math.cos(yaw),s=Math.sin(yaw),ax=team===1?x:project.terrain.worldWidth-x,ay=team===1?y:project.terrain.worldHeight-y;
  return {id:`frontier-expansion-${team}`,name:`Team ${team} future expansion strip`,team:'all',kind:'corridor',width:320,points:[-250,250].map(v=>[ax+350*c-v*s,ay+350*s+v*c] as [number,number])};
 });
}
