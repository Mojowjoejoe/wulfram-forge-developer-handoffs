import {sampleHeight,type TerrainData} from './wulfram.ts';
import {assertRouteInspectionBudget,type RoutePoint} from './route-inspection.ts';
export interface ElevationSample {distance:number;x:number;y:number;height:number;gradeDegrees:number}
export interface RouteElevation {evidence:'sampled-terrain-only';samples:ElevationSample[];length:number;ascent:number;descent:number;maxUphillDegrees:number;maxDownhillDegrees:number;spacing:number;error?:string}
/** Centerline geometry only. Grade is the preceding sampled interval, not craft capability. */
export function routeElevation(terrain:TerrainData,points:RoutePoint[],maxSamples=10001):RouteElevation {
 const result:RouteElevation={evidence:'sampled-terrain-only',samples:[],length:0,ascent:0,descent:0,maxUphillDegrees:0,maxDownhillDegrees:0,spacing:0};
 try {
  assertRouteInspectionBudget(points);
  if(!Number.isInteger(maxSamples)||maxSamples<1||maxSamples>10001)throw new Error('Elevation response budget exhausted. Inspect fewer routes.');
  if(points.length<2)return result;
  if(![terrain.width,terrain.height].every(v=>Number.isInteger(v)&&v>=2)||![terrain.worldWidth,terrain.worldHeight].every(v=>Number.isFinite(v)&&v>0))throw new Error('Invalid terrain dimensions.');
  if(terrain.heights.length!==terrain.width*terrain.height||!terrain.heights.every(Number.isFinite))throw new Error('Terrain height buffer is incomplete or nonfinite.');
  if(points.some(([x,y])=>x<0||y<0||x>terrain.worldWidth||y>terrain.worldHeight))throw new Error('Route leaves the map; elevation is unavailable.');
  const spacing=Math.min(40,terrain.worldWidth/(terrain.width-1)/2,terrain.worldHeight/(terrain.height-1)/2);
  const counts=points.slice(1).map((p,i)=>Math.ceil(Math.hypot(p[0]-points[i][0],p[1]-points[i][1])/spacing));
  if(counts.reduce((a,b)=>a+b,1)>maxSamples)throw new Error('Elevation sampling budget exceeded. Shorten the route.');
  result.spacing=spacing;
  const append=(x:number,y:number,distance:number)=>{
   const height=sampleHeight(terrain,x,y);if(!Number.isFinite(height))throw new Error('Nonfinite terrain height.');
   const previous=result.samples.at(-1),rise=previous?height-previous.height:0,run=previous?distance-previous.distance:0;
   const gradeDegrees=run>0?Math.atan2(rise,run)*180/Math.PI:0;
   result.samples.push({x,y,distance,height,gradeDegrees});result.ascent+=Math.max(0,rise);result.descent+=Math.max(0,-rise);
   result.maxUphillDegrees=Math.max(result.maxUphillDegrees,gradeDegrees);result.maxDownhillDegrees=Math.max(result.maxDownhillDegrees,-gradeDegrees);
  };
  append(...points[0],0);
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]),count=counts[i-1];
   for(let j=1;j<=count;j++){const t=j/count;append(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,result.length+length*t);}
   result.length+=length;
  }
  return result;
 }catch(error){return {...result,samples:[],length:0,ascent:0,descent:0,maxUphillDegrees:0,maxDownhillDegrees:0,error:error instanceof Error?error.message:'Elevation unavailable.'};}
}
