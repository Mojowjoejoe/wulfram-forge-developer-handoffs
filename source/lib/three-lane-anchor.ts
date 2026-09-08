import type {CreativeSize} from './creative-base-layouts.ts';
import {hasModelForEntity,structureTerrainClearance,type AssetManifest,type BaseTemplate,type BaseTemplateUnit} from './wulfram.ts';
import {distanceToSegment} from './build-areas.ts';

export const THREE_LANE_ANCHOR_VERSION='three-lane-anchor-v1';
type Point=[number,number];
type Path={id:string;width:number;points:Point[]};
export type ThreeLaneAnchorPlan={
 version:typeof THREE_LANE_ANCHOR_VERSION|'three-lane-anchor-v2';seed:string;size:CreativeSize;
 courts:Array<{id:string;center:Point;width:number;depth:number;mouth:Path;rearConnector:Path;
  defenseYard:{center:Point;radius:number;roles:string[]}}>;
 rearRoad:Path;serviceConnector:Path;serviceYard:{center:Point;radius:number;roles:string[]};
 bounds:{min:Point;max:Point};
};
const sizes:Record<CreativeSize,{scale:number;defenses:string[]}>= {
 small:{scale:1,defenses:['g']},
 standard:{scale:1.1,defenses:['g','s','g']},
 large:{scale:1.25,defenses:['g','s','g','L','g','s']},
 massive:{scale:1.45,defenses:['g','s','g','L','g','s','g','L','s','g']},
};

/** Local topology only. Destination placement must validate terrain, power and every entrance. */
export function threeLaneAnchorPlan(seed:string,size:CreativeSize,targetCount?:number):ThreeLaneAnchorPlan{
 if(!Object.hasOwn(sizes,size))throw new Error('Unsupported Three-Lane Anchor size.');
 if(typeof seed!=='string'||seed.length>256)throw new Error('Three-Lane Anchor seed must be at most 256 characters.');
 let state=2166136261;for(const c of `${THREE_LANE_ANCHOR_VERSION}:${seed}`)state=Math.imul(state^c.charCodeAt(0),16777619)>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const spec=sizes[size],scale=spec.scale;
 const minimum=6+3*(2+spec.defenses.length),target=targetCount===undefined||targetCount===0?minimum:targetCount;
 if(!Number.isInteger(target)||target<minimum||target>120)throw new Error(`Three-Lane Anchor count must be 0 or an integer from ${minimum} to 120 per team.`);
 const spacing=(1100+random()*180)*scale,roadWidth=240,courtWidth=(260+random()*80)*scale;
 const courts:ThreeLaneAnchorPlan['courts']=[-1,0,1].map((side,i)=>{
  const x=side*spacing,depth=(340+random()*100)*scale,front=-(650+random()*120)*scale;
  const center:Point=[x,front+depth/2],mouthShift=(random()<.5?-1:1)*(140+random()*80)*scale;
  return {id:`court-${i+1}`,center,width:courtWidth,depth,
   mouth:{id:`mouth-${i+1}`,width:120,points:[[x+mouthShift,front-600*scale],[x+mouthShift,front-300*scale],[x,front-180*scale],[x,front]]},
   rearConnector:{id:`court-rear-${i+1}`,width:120,points:[[x,front+depth],[x,0]]},
   defenseYard:{center:[x+460*scale,center[1]],radius:240*scale,roles:['e','e',...spec.defenses]}};
 });
 for(let extra=0;extra<target-minimum;extra++)courts[extra%3].defenseYard.roles.push(['g','s','L'][Math.floor(extra/3)%3]);
 const rearRoad:Path={id:'rear-service-road',width:roadWidth,points:[[-spacing-200*scale,0],[spacing+760*scale,0]]};
 const serviceYard:ThreeLaneAnchorPlan['serviceYard']={center:[0,700*scale],radius:300*scale,roles:['e','e','u','r','f','d']};
 const serviceConnector:Path={id:'rear-services',width:120,points:[[0,0],[0,serviceYard.center[1]-serviceYard.radius]]};
 const xs:number[]=[],ys:number[]=[];
 const box=(center:Point,halfWidth:number,halfDepth:number)=>{xs.push(center[0]-halfWidth,center[0]+halfWidth);ys.push(center[1]-halfDepth,center[1]+halfDepth);};
 for(const court of courts){box(court.center,court.width/2,court.depth/2);box(court.defenseYard.center,court.defenseYard.radius,court.defenseYard.radius);}
 box(serviceYard.center,serviceYard.radius,serviceYard.radius);
 for(const route of [rearRoad,serviceConnector,...courts.flatMap(c=>[c.mouth,c.rearConnector])])for(const point of route.points)box(point,route.width/2,route.width/2);
 return {version:target===minimum?THREE_LANE_ANCHOR_VERSION:'three-lane-anchor-v2',seed,size,courts,rearRoad,serviceConnector,serviceYard,bounds:{min:[Math.min(...xs),Math.min(...ys)],max:[Math.max(...xs),Math.max(...ys)]}};
}

export function threeLaneAnchorRequiredCounts(size:CreativeSize,targetCount?:number):Record<string,number>{
 const plan=threeLaneAnchorPlan('',size,targetCount),counts:Record<string,number>={};
 for(const token of [...plan.serviceYard.roles,...plan.courts.flatMap(c=>c.defenseYard.roles)])counts[token]=(counts[token]??0)+1;
 return counts;
}

/** Original-scale local candidate; its provisional power budget is not a game-range claim. */
export function threeLaneAnchorTemplate(seed:string,size:CreativeSize,manifest:AssetManifest,targetCount?:number){
 const plan=threeLaneAnchorPlan(seed,size,targetCount),counts=threeLaneAnchorRequiredCounts(size,targetCount),radii=new Map<string,number>();
 for(const token of Object.keys(counts)){
  for(const team of [1,2])if(!hasModelForEntity({token,team},manifest))throw new Error(`Three-Lane Anchor needs the original ${token} model for team ${team}.`);
  const radius=Math.max(...[1,2].map(team=>structureTerrainClearance({token,team},manifest,0,0).footprint/Math.SQRT2));
  if(!Number.isFinite(radius)||radius<=0)throw new Error('Invalid original model footprint.');radii.set(token,radius);
 }
 const radius=(token:string)=>radii.get(token)!;
 let state=2166136261;for(const c of `${THREE_LANE_ANCHOR_VERSION}:units:${seed}`)state=Math.imul(state^c.charCodeAt(0),16777619)>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const units:BaseTemplateUnit[]=[],yardUnitIndices:number[][]=[];
 const paths=[plan.rearRoad,plan.serviceConnector,...plan.courts.flatMap(c=>[c.mouth,c.rearConnector])];
 const serviceRoutes:Array<{unitIndex:number;width:number;points:Point[]}>=[];
 const center=plan.serviceYard.center;
 const pads=[{token:'r',point:[center[0]-130,center[1]-130] as Point},{token:'f',point:[center[0]+130,center[1]-130] as Point}];
 const branches=pads.map(p=>({token:p.token,width:80,points:[[...plan.serviceConnector.points.at(-1)!],p.point] as Point[]}));
 const yards=[...plan.courts.map(c=>c.defenseYard),plan.serviceYard];
 for(const [yardIndex,yard] of yards.entries()){
  const indices:number[]=[];
  const clear=(token:string,x:number,y:number)=>{
   if(Math.hypot(x-yard.center[0],y-yard.center[1])+radius(token)>yard.radius)return false;
   if(units.some(u=>Math.hypot(x-u.offset[0],y-u.offset[1])<Math.max(radius(token)+radius(u.token)+14,['r','f'].includes(token)?radius(u.token)+96:0,['r','f'].includes(u.token)?radius(token)+96:0)))return false;
   for(const route of [...paths,...branches.filter(b=>!(yardIndex===3&&b.token===token))])for(let i=1;i<route.points.length;i++)if(distanceToSegment(x,y,route.points[i-1],route.points[i])<radius(token)+route.width/2+14)return false;
   return true;
  };
  const add=(token:string,point:Point,yaw=0)=>{if(!clear(token,...point))throw new Error('Three-Lane Anchor cannot fit original models while preserving circulation.');const index=units.length;units.push({token,offset:[...point],rotation:[0,0,yaw],groundOffset:0,active:1});indices.push(index);return index;};
  const [x,y]=yard.center;
  add('e',[x-20,y+(yardIndex===3?60:0)]);add('e',[x+20,y+(yardIndex===3?60:0)]);
  if(yardIndex===3){
   for(const pad of pads){const unitIndex=add(pad.token,pad.point,-Math.PI/2);serviceRoutes.push({unitIndex,width:80,points:branches.find(b=>b.token===pad.token)!.points.map(p=>[...p])});}
   add('u',[x-130,y+140]);add('d',[x+130,y+140]);
  }else for(const token of yard.roles.filter(t=>t!=='e')){
   let placed=false;
   for(let attempt=0;attempt<1200;attempt++){
    const angle=random()*Math.PI*2,reach=125+random()*85,point:Point=[x+Math.cos(angle)*reach,y+Math.sin(angle)*reach];
    if(!clear(token,...point))continue;add(token,point,angle);placed=true;break;
   }
   if(!placed)throw new Error('Three-Lane Anchor seed cannot fit its requested original models.');
  }
  yardUnitIndices.push(indices);
 }
 const template:BaseTemplate={id:plan.version,name:'Three-Lane Anchor (experimental)',description:'Three departure courts share a rear service road and separate command yard.',sourceMap:plan.version,sourceState:seed,sourceTeam:1,sourceWorldSize:[16000,12000],sourceAnchor:[0,0],unitCount:units.length,footprint:{width:plan.bounds.max[0]-plan.bounds.min[0],height:plan.bounds.max[1]-plan.bounds.min[1]},units};
 // A mouth continues through its court and the rear road to the shared service
 // junction. These are local exits, not inferred bindings to a map's lanes.
 const entranceRoutes=plan.courts.map(court=>{
  const points:Point[]=[];
  for(const point of [...court.mouth.points,...court.rearConnector.points,...plan.serviceConnector.points])if(!points.length||Math.hypot(point[0]-points.at(-1)![0],point[1]-points.at(-1)![1])>1e-9)points.push([...point]);
  for(const unit of units)for(let j=1;j<points.length;j++)if(distanceToSegment(...unit.offset,points[j-1],points[j])<radius(unit.token)+60+14)throw new Error('Three-Lane Anchor full-width entrance reservation intersects a building.');
  const padRoutes=serviceRoutes.map(branch=>({unitIndex:branch.unitIndex,width:branch.width,points:[...points,...branch.points.slice(1)].map(p=>[...p] as Point)}));
  for(const route of padRoutes)for(const [i,unit] of units.entries())if(i!==route.unitIndex)for(let j=1;j<route.points.length;j++)if(distanceToSegment(...unit.offset,route.points[j-1],route.points[j])<radius(unit.token)+route.width/2+14)throw new Error('Three-Lane Anchor entrance cannot reach a service pad without narrowing circulation.');
  return {courtId:court.id,width:120,points,padRoutes};
 });
 return {template,plan,yardUnitIndices,serviceRoutes,entranceRoutes};
}
