import {hasModelForEntity,structureTerrainClearance,type AssetManifest,type BaseTemplate,type BaseTemplateUnit,type WulframProject} from './wulfram.ts';
import {distanceToSegment,type BuildArea} from './build-areas.ts';
import type {CreativeSize} from './creative-base-layouts.ts';
export const SERVICE_COURTYARD_VERSION='service-courtyard-v1';
export const SERVICE_COURTYARD_ROUTES=[
 {name:'turning court',width:560,points:[[-420,0],[420,0]] as Array<[number,number]>},
 {name:'west entrance',width:320,points:[[-1100,0],[-420,0]] as Array<[number,number]>},
 {name:'east entrance',width:320,points:[[420,0],[1100,0]] as Array<[number,number]>},
];
const sites=[
 {x:-280,y:-590,roles:['u','r','g']},
 {x:280,y:590,roles:['f','s','g']},
 {x:-350,y:590,roles:['r','f','g']},
 {x:350,y:-590,roles:['d','L','s','g']},
 {x:-960,y:-590,roles:['r','f','g','s']},
 {x:960,y:590,roles:['d','L','L','g']},
];
const siteCount=(size:CreativeSize)=>{if(!['small','standard','large','massive'].includes(size))throw new Error('Unsupported Service Courtyard size.');const n={small:2,standard:3,large:4,massive:6}[size];if(!n)throw new Error('Unsupported Service Courtyard size.');return n;};
export function courtyardRequiredCounts(size:CreativeSize):Record<string,number>{
 const selected=sites.slice(0,siteCount(size)),counts:Record<string,number>={e:selected.length*2};
 for(const site of selected)for(const token of site.roles)counts[token]=(counts[token]??0)+1;
 return counts;
}
/** Reviewed editor family. Two service banks face a broad through-court, with distinct narrow mouths. */
export function serviceCourtyardTemplate(seed:string,size:CreativeSize,manifest:AssetManifest):BaseTemplate{
 const count=siteCount(size),required=courtyardRequiredCounts(size);
 for(const token of Object.keys(required))for(const team of [1,2])if(!hasModelForEntity({token,team},manifest))throw new Error(`Service Courtyard needs the original ${token} model for team ${team}.`);
 let state=2166136261;for(const c of `${SERVICE_COURTYARD_VERSION}:${seed}`)state=Math.imul(state^c.charCodeAt(0),16777619)>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const units:BaseTemplateUnit[]=[],radii=new Map<string,number>();
 const radius=(token:string)=>{if(!radii.has(token))radii.set(token,Math.max(...[1,2].map(team=>structureTerrainClearance({token,team},manifest,0,0).footprint/Math.SQRT2)));return radii.get(token)!;};
 const clear=(token:string,x:number,y:number)=>!units.some(u=>Math.hypot(x-u.offset[0],y-u.offset[1])<radius(token)+radius(u.token)+14)&&!SERVICE_COURTYARD_ROUTES.some(route=>distanceToSegment(x,y,route.points[0],route.points[1])<route.width/2+radius(token)+14);
 const add=(token:string,x:number,y:number,yaw=0)=>{if(!clear(token,x,y))throw new Error('Service Courtyard cannot preserve its spacing and open court.');units.push({token,offset:[x,y],groundOffset:0,rotation:[0,0,yaw],active:1});};
 for(const site of sites.slice(0,count)){
  const x=site.x+(random()-.5)*24,y=site.y+(random()-.5)*24;
  add('e',x-20,y);add('e',x+20,y);
  for(const token of site.roles){let placed=false;for(let attempt=0;attempt<500;attempt++){
   // Services face the court; defenses sit on the bank's outer side.
   const inward=['r','f'].includes(token),direction=site.y<0?1:-1;
   const angle=(inward?direction:-direction)*Math.PI/2+(random()-.5)*Math.PI*.8,distance=120+random()*80;
   const px=x+Math.cos(angle)*distance,py=y+Math.sin(angle)*distance;
   if(!clear(token,px,py))continue;add(token,px,py,angle);placed=true;break;
  }if(!placed)throw new Error('Service Courtyard seed cannot fit its required roles.');}
 }
 return {id:SERVICE_COURTYARD_VERSION,name:'Service Courtyard',description:'Two powered banks face an open turning court with separate west and east mouths.',sourceMap:SERVICE_COURTYARD_VERSION,sourceState:seed,sourceTeam:1,sourceWorldSize:[14000,10000],sourceAnchor:[0,0],unitCount:units.length,footprint:{width:Math.max(...units.map(u=>u.offset[0]))-Math.min(...units.map(u=>u.offset[0]))+100,height:Math.max(...units.map(u=>u.offset[1]))-Math.min(...units.map(u=>u.offset[1]))+100},units};
}
export function serviceCourtyardAreas(project:WulframProject,x:number,y:number,rotation:number):BuildArea[]{
 if(![x,y,rotation].every(Number.isFinite))throw new Error('Courtyard placement must be finite.');
 return [1,2].flatMap(team=>{const yaw=(rotation+(team===2?180:0))*Math.PI/180,c=Math.cos(yaw),s=Math.sin(yaw),ax=team===1?x:project.terrain.worldWidth-x,ay=team===1?y:project.terrain.worldHeight-y;
 return SERVICE_COURTYARD_ROUTES.map((route,i)=>({id:`service-courtyard-${team}-${i}`,name:`Team ${team} ${route.name}`,team:'all' as const,kind:'corridor' as const,width:route.width,points:route.points.map(([px,py])=>[ax+px*c-py*s,ay+px*s+py*c] as [number,number])}));});
}

export function assertCourtyardComposition(template:BaseTemplate,size:CreativeSize){
 for(const [token,minimum] of Object.entries(courtyardRequiredCounts(size)))if(template.units.filter(u=>u.token===token).length<minimum)throw new Error(`Service Courtyard ${size} needs at least ${minimum} ${token} structures. Increase the target count or choose a smaller size.`);
}
