import type {TerrainData} from './wulfram.ts';
import {terrainSelectionError,type TerrainSelection} from './terrain-selection.ts';
type Point = [number,number,number];
export interface TerrainMeasurement {width:number;height:number;gridX:number;gridY:number;minHeight:number;maxHeight:number;relief:number;maxSlopeDegrees:number;triangles:number}
function clip(points:Point[],axis:0|1,limit:number,greater:boolean):Point[]{
 const output:Point[]=[];
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length],insideA=greater?a[axis]>=limit:a[axis]<=limit,insideB=greater?b[axis]>=limit:b[axis]<=limit;
  if(insideA)output.push(a);
  if(insideA!==insideB){const t=(limit-a[axis])/(b[axis]-a[axis]);output.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1]),a[2]+t*(b[2]-a[2])]);}
 }
 return output;
}
/** Exact planar height range/slope on the editor's alternating triangles, clipped to a rectangle. */
export function measureTerrain(terrain:TerrainData,selection?:TerrainSelection):TerrainMeasurement{
 if(!Number.isInteger(terrain.width)||!Number.isInteger(terrain.height)||terrain.width<2||terrain.height<2||!Number.isFinite(terrain.worldWidth)||!Number.isFinite(terrain.worldHeight)||terrain.worldWidth<=0||terrain.worldHeight<=0)throw new Error('Terrain grid dimensions are invalid.');
 const region=selection??{x:0,y:0,width:terrain.worldWidth,height:terrain.worldHeight};
 const error=terrainSelectionError(region,terrain);if(error)throw new Error(error);
 const sx=terrain.worldWidth/(terrain.width-1),sy=terrain.worldHeight/(terrain.height-1);
 let minHeight=Infinity,maxHeight=-Infinity,maxGrade=0,triangles=0;
 const x0=Math.max(0,Math.floor(region.x/sx)),x1=Math.min(terrain.width-1,Math.ceil((region.x+region.width)/sx));
 const y0=Math.max(0,Math.floor(region.y/sy)),y1=Math.min(terrain.height-1,Math.ceil((region.y+region.height)/sy));
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
  const a:Point=[x*sx,y*sy,terrain.heights[y*terrain.width+x]],b:Point=[(x+1)*sx,y*sy,terrain.heights[y*terrain.width+x+1]],c:Point=[x*sx,(y+1)*sy,terrain.heights[(y+1)*terrain.width+x]],d:Point=[(x+1)*sx,(y+1)*sy,terrain.heights[(y+1)*terrain.width+x+1]];
  if(![a,b,c,d].every(p=>Number.isFinite(p[2])))throw new Error('The measured region contains missing or non-finite heights.');
  for(const triangle of ((x^y)&1)?[[a,b,c],[b,d,c]]:[[a,b,d],[a,d,c]]){
   let polygon=clip(triangle,0,region.x,true);polygon=clip(polygon,0,region.x+region.width,false);polygon=clip(polygon,1,region.y,true);polygon=clip(polygon,1,region.y+region.height,false);
   if(polygon.length<3)continue;
   const origin=polygon[0];let area=0;
   for(let i=1;i<polygon.length-1;i++)area+=(polygon[i][0]-origin[0])*(polygon[i+1][1]-origin[1])-(polygon[i][1]-origin[1])*(polygon[i+1][0]-origin[0]);
   if(Math.abs(area)===0)continue;
   const [p,q,r]=triangle,ux=q[0]-p[0],uy=q[1]-p[1],uz=q[2]-p[2],vx=r[0]-p[0],vy=r[1]-p[1],vz=r[2]-p[2],det=ux*vy-uy*vx;
   maxGrade=Math.max(maxGrade,Math.hypot((uz*vy-uy*vz)/det,(ux*vz-uz*vx)/det));
   for(const point of polygon){minHeight=Math.min(minHeight,point[2]);maxHeight=Math.max(maxHeight,point[2]);}triangles++;
  }
 }
 if(!triangles)throw new Error('No measurable terrain surface in this region.');
 return {width:region.width,height:region.height,gridX:sx,gridY:sy,minHeight,maxHeight,relief:maxHeight-minHeight,maxSlopeDegrees:Math.atan(maxGrade)*180/Math.PI,triangles};
}
