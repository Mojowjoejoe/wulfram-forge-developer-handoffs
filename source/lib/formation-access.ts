import {routeClearance,assertRouteInspectionBudget,type RoutePoint} from './route-inspection.ts';
import {sampleHeight,sampleSlopeDegrees,structureTerrainClearance,type AssetManifest,type WulframProject,type StateEntity} from './wulfram.ts';
import {FormationDiagnosticError,type FormationOverlay} from './formation-diagnostics.ts';

/** Conservative sampled access; not game collision or traversal certification. */
export function checkFormationAccess(project: WulframProject, manifest: AssetManifest, entrances:Array<[number,number]>=[]) {
  try{return findFormationAccess(project,manifest,entrances,96);}
  catch(error){if(!(error instanceof FormationDiagnosticError))throw error;}
  return findFormationAccess(project,manifest,entrances,56);
}

/** Prefer an 80-unit edge margin; preserve the original 40-unit pass as a fallback. */
function findFormationAccess(project:WulframProject,manifest:AssetManifest,entrances:Array<[number,number]>,clearance:number,context:{origin?:RoutePoint;pads?:StateEntity[]}={}){
  const {terrain,entities}=project,step=80;
  const width=Math.floor(terrain.worldWidth/step)+1,height=Math.floor(terrain.worldHeight/step)+1;
  if(width*height>100000)throw new Error('Map is too large for this access-check resolution.');
  const free=new Uint8Array(width*height),seen=new Uint8Array(free.length);
  const parents=new Int32Array(free.length).fill(-1),overlay:FormationOverlay={routes:[],blocked:[]};
  const obstacles=entities.map(e=>({id:e.id,x:e.position[0],y:e.position[1],r:structureTerrainClearance(e,manifest,0,0).footprint/Math.SQRT2+clearance}));
  const segmentClear=(ax:number,ay:number,bx:number,by:number,ignore?:string)=>!obstacles.some(o=>{
    if(o.id===ignore)return false;
    const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((o.x-ax)*dx+(o.y-ay)*dy)/Math.max(1,dx*dx+dy*dy)));
    return Math.hypot(o.x-ax-t*dx,o.y-ay-t*dy)<o.r-16;
  });
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const px=x*step,py=y*step;
    if(px<clearance||py<clearance||px>terrain.worldWidth-clearance||py>terrain.worldHeight-clearance)continue;
    if(obstacles.some(o=>Math.hypot(px-o.x,py-o.y)<o.r))continue;
    if(sampleSlopeDegrees(terrain,px,py)>Math.min(project.validation.maxSlopeDegrees,18))continue;
    free[y*width+x]=1;
  }
  const origin=context.origin??[terrain.worldWidth/2,terrain.worldHeight/2];
  let start=-1,best=Infinity;
  for(let i=0;i<free.length;i++)if(free[i]){
    const d=Math.hypot(i%width*step-origin[0],Math.floor(i/width)*step-origin[1]);
    if(d<best){best=d;start=i;}
  }
  if(start<0||best>320)throw new FormationDiagnosticError(context.origin?'Access check: no clear approach near the selected entrance endpoint.':'Access check: no clear approach near the central battlefield.',{routes:[],blocked:[{x:origin[0],y:origin[1],message:context.origin?'Entrance endpoint blocked':'Central approach blocked'}]});
  const queue=[start];seen[start]=1;
  for(let cursor=0;cursor<queue.length;cursor++){
    const at=queue[cursor],x=at%width,y=Math.floor(at/width);
    for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
      const nx=x+dx,ny=y+dy,next=ny*width+nx;
      if(nx<0||nx>=width||ny<0||ny>=height||!free[next]||seen[next])continue;
      const rise=Math.abs(sampleHeight(terrain,nx*step,ny*step)-sampleHeight(terrain,x*step,y*step));
      if(rise/step>Math.tan(Math.min(project.validation.maxSlopeDegrees,18)*Math.PI/180))continue;
      if(!segmentClear(x*step,y*step,nx*step,ny*step))continue;
      if(sampleSlopeDegrees(terrain,(x+nx)*step/2,(y+ny)*step/2)>Math.min(project.validation.maxSlopeDegrees,18))continue;
      seen[next]=1;parents[next]=at;queue.push(next);
    }
  }
  const pads=context.pads??entities.filter(e=>['r','f'].includes(e.token));
  for(const pad of [...pads,...entrances.map((position,i)=>({id:`entrance-${i}`,token:'entrance',team:i+1,position}))]){
    const r=pad.token==='entrance'?0:structureTerrainClearance(pad,manifest,0,0).footprint/Math.SQRT2;
    let reachable=false,endpoint=-1,nearest=Infinity;
    const px=pad.position[0],py=pad.position[1];
    for(let y=Math.max(0,Math.floor((py-r-160)/step));y<Math.min(height,Math.ceil((py+r+160)/step));y++)for(let x=Math.max(0,Math.floor((px-r-160)/step));x<Math.min(width,Math.ceil((px+r+160)/step));x++){
      if(seen[y*width+x]&&Math.hypot(x*step-px,y*step-py)<=r+160&&segmentClear(x*step,y*step,px,py,pad.id)
        &&sampleSlopeDegrees(terrain,(x*step+px)/2,(y*step+py)/2)<=Math.min(project.validation.maxSlopeDegrees,18)){
          reachable=true;const distance=Math.hypot(x*step-px,y*step-py);if(distance<nearest){nearest=distance;endpoint=y*width+x;}
        }
    }
    if(!reachable)overlay.blocked.push({x:px,y:py,message:`Team ${pad.team} ${pad.token==='entrance'?'entrance':pad.token==='r'?'repair':'refuel'} approach blocked`});
    else {const route:Array<[number,number]>=[[px,py]];for(let at=endpoint;at>=0;at=parents[at])route.push([at%width*step,Math.floor(at/width)*step]);overlay.routes.push(route);}
  }
  if(overlay.blocked.length)throw new FormationDiagnosticError(`Access check: ${overlay.blocked[0].message}. Red markers show blocked approaches.`,overlay);
  return {passed:true,pads:pads.length,gridStep:step,clearance,reachableSamples:queue.length,...overlay};
}

/** Explicit opt-in analysis. Legacy access and saved recipes are unchanged. */
export function checkFormationAccessViaCorridor(project:WulframProject,manifest:AssetManifest,team:1|2,points:RoutePoint[]){
 if(team!==1&&team!==2)throw new Error('Choose team 1 or 2 for the entrance.');
 if(points.length<2)throw new Error('The entrance needs at least two ordered points.');
 assertRouteInspectionBudget(points);
 if(points.slice(1).some((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1])<.001))throw new Error('Consecutive corridor points must differ.');
 if(points.some(([x,y])=>x<0||y<0||x>project.terrain.worldWidth||y>project.terrain.worldHeight))throw new Error('Entrance points must stay inside the map.');
 const check=(route:RoutePoint[],allowPad=false)=>{
  const blocked=routeClearance(project,manifest,route,80,allowPad).filter(m=>m.severity==='blocked');
  if(blocked.length)throw new FormationDiagnosticError('Selected entrance route has insufficient sampled clearance.',{routes:[route],blocked:blocked.map(m=>({x:m.x,y:m.y,message:m.message}))});
 };
 check(points);
 const pads=project.entities.filter(e=>e.team===team&&['r','f'].includes(e.token));
 if(!pads.length)throw new Error('Selected team has no service pads to connect.');
 const run=(entrances:RoutePoint[],context:{origin?:RoutePoint;pads:StateEntity[]})=>{
  try{return findFormationAccess(project,manifest,entrances,96,context);}catch(error){if(!(error instanceof FormationDiagnosticError))throw error;}
  return findFormationAccess(project,manifest,entrances,56,context);
 };
 const entry=run([points[0]],{pads:[]}).routes[0];
 const inside=run([],{origin:points[points.length-1],pads});
 // Routes retain the existing pad-to-battlefield direction used by access receipts.
 const routes=inside.routes.map(route=>{
  const joined=[...route,...[...points].reverse(),...entry].filter((p,i,a)=>!i||p[0]!==a[i-1][0]||p[1]!==a[i-1][1]);
  check(joined,true);return joined;
 });
 return {passed:true,policy:'via-authored-corridor-v1' as const,team,vehicleWidth:80 as const,pads:pads.length,routes,blocked:[],entrance:points.map(p=>[...p] as RoutePoint)};
}
