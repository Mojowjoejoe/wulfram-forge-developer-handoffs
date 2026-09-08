import {catalogFor,structureTerrainClearance,type AssetManifest,type WulframProject,type StateEntity} from './wulfram.ts';
export const BUILD_AREAS_KEY='forge.build-areas.v1';
type AreaIdentity={id:string;name:string;team:'all'|'0'|'1'|'2';width:number};
export type BuildArea=AreaIdentity & ({kind:'boundary'|'clear'|'terrain';x:number;y:number;height:number}|{kind:'corridor';points:Array<[number,number]>});
export function distanceToSegment(x:number,y:number,a:[number,number],b:[number,number]){
  const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));
  return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);
}
export function areaFitsMap(a:BuildArea,width:number,height:number){
  return a.kind==='corridor'?a.points.every(p=>p[0]>=a.width/2&&p[1]>=a.width/2&&p[0]+a.width/2<=width&&p[1]+a.width/2<=height):a.x+a.width<=width&&a.y+a.height<=height;
}
export function areaOutlinePaths(a:BuildArea):Array<Array<[number,number]>>{
  if(a.kind!=='corridor')return [[[a.x,a.y],[a.x+a.width,a.y],[a.x+a.width,a.y+a.height],[a.x,a.y+a.height],[a.x,a.y]]];
  return a.points.slice(1).map((b,i)=>{
    const start=a.points[i],angle=Math.atan2(b[1]-start[1],b[0]-start[0]),r=a.width/2,points:Array<[number,number]>=[];
    for(let j=0;j<=16;j++){const t=angle+Math.PI/2+Math.PI*j/16;points.push([start[0]+Math.cos(t)*r,start[1]+Math.sin(t)*r]);}
    for(let j=0;j<=16;j++){const t=angle-Math.PI/2+Math.PI*j/16;points.push([b[0]+Math.cos(t)*r,b[1]+Math.sin(t)*r]);}
    points.push(points[0]);return points;
  });
}
export function buildAreaOutlines(raw?:string,preview?:BuildArea):BuildArea[]{
  let areas:BuildArea[]=[];try{areas=readBuildAreas(raw);}catch{/* The panel displays malformed metadata. */}
  return preview?[...areas.filter(a=>a.id!==preview.id),preview]:areas;
}
export function readBuildAreas(raw?:string):BuildArea[]{
  if(!raw)return [];
  const value:unknown=JSON.parse(raw);
  if(!Array.isArray(value)||value.length>50)throw new Error('Invalid build-area collection.');
  const ids=new Set<string>();
  for(const a of value){
    if(!a||typeof a.id!=='string'||!a.id||ids.has(a.id)||typeof a.name!=='string'||!a.name.trim()||a.name.length>120||!['boundary','clear','corridor','terrain'].includes(a.kind)||!['all','0','1','2'].includes(a.team)||!Number.isFinite(a.width)||a.width<=0)throw new Error('Invalid build-area record.');
    if(a.kind==='terrain'&&a.team!=='all')throw new Error('Terrain protection applies to all teams because terrain is shared.');
    if(a.kind==='corridor'){
      if(!Array.isArray(a.points)||a.points.length<2||a.points.length>32||a.points.some((p:unknown)=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||p.some(n=>n<0)))throw new Error('A corridor needs 2–32 finite X,Y points.');
      if(a.points.slice(1).some((p:number[],i:number)=>Math.hypot(p[0]-a.points[i][0],p[1]-a.points[i][1])<.001))throw new Error('Consecutive corridor points must differ.');
    }else if(![a.x,a.y,a.height].every(Number.isFinite)||a.x<0||a.y<0||a.height<=0)throw new Error('Invalid build-area record.');
    ids.add(a.id);
  }
  return value;
}
export function checkBuildAreas(areas:BuildArea[],entities:StateEntity[],width:number,height:number,manifest?:AssetManifest,orientedRadii?:ReadonlyMap<string,number>):string[]{
  const issues:string[]=[];
  for(const a of areas){
    if(!areaFitsMap(a,width,height)){issues.push(`${a.name}: reserved extent extends outside the map.`);continue;}
    if(a.kind==='terrain')continue;
    for(const e of entities){
      if(e.token==='*'||(a.team!=='all'&&e.team!==Number(a.team)))continue;
      const standardRadius=structureTerrainClearance(e,manifest,catalogFor(e)?.footprint??10,0).footprint/Math.SQRT2;
      const radius=Math.max(standardRadius,orientedRadii?.get(e.id)??standardRadius);
      if(!Number.isFinite(radius))throw new Error('Invalid oriented building radius.');
      const [x,y]=e.position;
      const blocked=a.kind==='corridor'?a.points.slice(1).some((p,i)=>distanceToSegment(x,y,a.points[i],p)<radius+a.width/2):a.kind==='boundary'?(x-radius<a.x||x+radius>a.x+a.width||y-radius<a.y||y+radius>a.y+a.height):Math.hypot(x-Math.max(a.x,Math.min(x,a.x+a.width)),y-Math.max(a.y,Math.min(y,a.y+a.height)))<radius;
      if(blocked)issues.push(`${a.name}: ${catalogFor(e)?.label??e.token} (${e.id}) ${a.kind==='boundary'?'extends outside the build area':'overlaps reserved space'}.`);
    }
  }
  return issues;
}
export function assertBuildAreas(before:WulframProject,after:WulframProject,manifest?:AssetManifest,allowChanges=false){
  // All layouts share terrain. Check the old protection even during an explicit
  // rule edit, so removing a rule cannot conceal a simultaneous terrain edit.
  for(const layout of before.baseLayouts)for(const a of readBuildAreas(layout.metadata[BUILD_AREAS_KEY])){
    if(a.kind!=='terrain')continue;
    const t=before.terrain,n=after.terrain;
    const fail=()=>{throw new Error(`${a.name}: terrain heights are protected. Remove or resize this rule before reshaping its terrain. Nothing was applied.`);};
    if(t.width!==n.width||t.height!==n.height||t.worldWidth!==n.worldWidth||t.worldHeight!==n.worldHeight)fail();
    if(t.heights===n.heights)continue;
    const sx=t.worldWidth/(t.width-1),sy=t.worldHeight/(t.height-1);
    // Preserve surrounding vertices, including those outside the rectangle,
    // because interpolation inside the protected area depends on them.
    const x0=Math.max(0,Math.floor(a.x/sx)),x1=Math.min(t.width-1,Math.ceil((a.x+a.width)/sx));
    const y0=Math.max(0,Math.floor(a.y/sy)),y1=Math.min(t.height-1,Math.ceil((a.y+a.height)/sy));
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(t.heights[y*t.width+x]!==n.heights[y*t.width+x])fail();
  }
  if(!allowChanges)for(const old of before.baseLayouts){
    const areas=readBuildAreas(old.metadata[BUILD_AREAS_KEY]);if(!areas.length)continue;
    const next=after.baseLayouts.find(l=>l.id===old.id);
    if(!next||JSON.stringify(readBuildAreas(next.metadata[BUILD_AREAS_KEY]))!==JSON.stringify(areas))throw new Error('Remove or edit authored build areas explicitly before replacing their layout or constraints.');
  }
  for(const layout of after.baseLayouts){
    const issues=checkBuildAreas(readBuildAreas(layout.metadata[BUILD_AREAS_KEY]),layout.id===after.activeBaseLayoutId?after.entities:layout.entities,after.terrain.worldWidth,after.terrain.worldHeight,manifest);
    if(issues.length)throw new Error(`${issues[0]} Adjust the building or edit the build area. Nothing was applied.`);
  }
}
