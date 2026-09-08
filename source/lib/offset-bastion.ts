import {structureTerrainClearance,type AssetManifest,type BaseTemplate,type BaseTemplateUnit,type WulframProject} from './wulfram.ts';
import {distanceToSegment,type BuildArea} from './build-areas.ts';
import type {CreativeSize} from './creative-base-layouts.ts';
export const OFFSET_BASTION_VERSION='offset-bastion-v1';
export const OFFSET_BASTION_PATH:Array<[number,number]>=[[1100,-450],[350,-450],[350,350],[-450,350]];
export const OFFSET_BASTION_ARRANGEMENTS=['classic','wide-front','deep-court','split-wings'] as const;
export type OffsetBastionArrangement=typeof OFFSET_BASTION_ARRANGEMENTS[number];
const arrangements:Record<Exclude<OffsetBastionArrangement,'classic'>,{centers:Array<[number,number]>;path:Array<[number,number]>}>={
 'wide-front':{centers:[[-850,-100],[650,-900],[-500,1000],[-1450,650],[1100,600]],path:[[1400,-350],[400,-350],[400,300],[-550,300]]},
 'deep-court':{centers:[[-1000,450],[800,-650],[-650,-850],[-1500,-400],[600,950]],path:[[1400,0],[100,0],[100,750],[-650,750]]},
 'split-wings':{centers:[[-1050,0],[800,800],[800,-800],[-450,1050],[-500,-1000]],path:[[1400,200],[200,200],[200,-350],[-650,-350]]},
};
export function offsetBastionVersion(arrangement:OffsetBastionArrangement='classic'){
 if(!OFFSET_BASTION_ARRANGEMENTS.includes(arrangement))throw new Error('Unknown Offset Bastion arrangement.');
 return arrangement==='classic'?OFFSET_BASTION_VERSION:`offset-bastion-arrangements-v1:${arrangement}`;
}
export function offsetBastionPath(arrangement:OffsetBastionArrangement='classic'):Array<[number,number]>{
 offsetBastionVersion(arrangement);
 return (arrangement==='classic'?OFFSET_BASTION_PATH:arrangements[arrangement].path).map(p=>[...p]);
}
const sites:Array<{center:[number,number];roles:string[]}>= [
 {center:[-700,0],roles:['u','r','f','g']},
 {center:[300,-800],roles:['g','s']},
 {center:[50,850],roles:['r','f','s','L']},
 {center:[-1350,650],roles:['d','g','g','s']},
 {center:[1050,600],roles:['L','L','s','g']},
];
export function offsetBastionRequiredCounts(size:CreativeSize):Record<string,number>{
 const count={small:2,standard:3,large:4,massive:5}[size];if(!count)throw new Error('Unsupported Offset Bastion size.');
 const result:Record<string,number>={e:count*2};for(const site of sites.slice(0,count))for(const token of site.roles)result[token]=(result[token]??0)+1;return result;
}
export function assertOffsetBastionComposition(template:BaseTemplate,size:CreativeSize){
 for(const [token,minimum] of Object.entries(offsetBastionRequiredCounts(size)))if(template.units.filter(u=>u.token===token).length<minimum)throw new Error(`Offset Bastion ${size} needs at least ${minimum} ${token} structures to retain its roles. Raise the target count or choose a smaller size.`);
}
export function offsetBastionTemplate(seed:string,size:CreativeSize,manifest:AssetManifest,arrangement:OffsetBastionArrangement='classic'):BaseTemplate{
 offsetBastionRequiredCounts(size);const count={small:2,standard:3,large:4,massive:5}[size];
 const version=offsetBastionVersion(arrangement),approach=offsetBastionPath(arrangement);
 const selectedSites=arrangement==='classic'?sites:sites.map((site,i)=>({...site,center:arrangements[arrangement].centers[i]}));
 let state=2166136261;for(const c of `${version}:${seed}`)state=Math.imul(state^c.charCodeAt(0),16777619)>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const units:BaseTemplateUnit[]=[],radii=new Map<string,number>();
 const radius=(token:string)=>{if(!radii.has(token))radii.set(token,Math.max(...[1,2].map(team=>structureTerrainClearance({token,team},manifest,0,0).footprint/Math.SQRT2)));return radii.get(token)!;};
 const clear=(token:string,x:number,y:number)=>!units.some(u=>Math.hypot(x-u.offset[0],y-u.offset[1])<radius(token)+radius(u.token)+14)&&!approach.slice(1).some((p,i)=>distanceToSegment(x,y,approach[i],p)<100+radius(token)+14);
 const add=(token:string,x:number,y:number,yaw=0)=>units.push({token,offset:[x,y],groundOffset:0,rotation:[0,0,yaw],active:1});
 for(const [i,site] of selectedSites.slice(0,count).entries()){
  const cx=site.center[0]+(random()-.5)*40,cy=site.center[1]+(random()-.5)*40;
  add('e',cx-20,cy);add('e',cx+20,cy);
  const roles=[...site.roles];if(random()>.5)roles.push(i===0?'d':'g');
  for(const token of roles){let placed=false;for(let n=0;n<400;n++){
   const angle=(['u','r','f'].includes(token)?Math.PI:0)+(random()-.5)*Math.PI,distance=110+random()*105;
   const x=cx+Math.cos(angle)*distance,y=cy+Math.sin(angle)*distance;
   if(!clear(token,x,y))continue;add(token,x,y,angle);placed=true;break;
  }if(!placed)throw new Error('Offset Bastion seed cannot keep the bent approach clear.');}
 }
 return {id:arrangement==='classic'?'experimental-offset-bastion-v1':`experimental-${version}`,name:arrangement==='classic'?'Offset Bastion (review candidate)':`Offset Bastion · ${arrangement} (review candidate)`,description:'A rear command yard reached through a bent reserved approach, with offset forward and side defenses.',sourceMap:version,sourceState:seed,sourceTeam:1,sourceWorldSize:[12000,8000],sourceAnchor:[0,0],unitCount:units.length,footprint:{width:Math.max(...units.map(u=>u.offset[0]))-Math.min(...units.map(u=>u.offset[0]))+100,height:Math.max(...units.map(u=>u.offset[1]))-Math.min(...units.map(u=>u.offset[1]))+100},units};
}
export function offsetBastionAreas(project:WulframProject,x:number,y:number,rotation:number,arrangement:OffsetBastionArrangement='classic'):BuildArea[]{
 if(![x,y,rotation].every(Number.isFinite))throw new Error('Approach placement must be finite.');
 const approach=offsetBastionPath(arrangement);
 return [1,2].map(team=>{const yaw=(rotation+(team===2?180:0))*Math.PI/180,c=Math.cos(yaw),s=Math.sin(yaw),ax=team===1?x:project.terrain.worldWidth-x,ay=team===1?y:project.terrain.worldHeight-y;
 return {id:`offset-bastion-approach-${team}`,name:`Team ${team} bent approach`,team:'all',kind:'corridor',width:200,points:approach.map(([px,py])=>[ax+px*c-py*s,ay+px*s+py*c] as [number,number])};});
}
