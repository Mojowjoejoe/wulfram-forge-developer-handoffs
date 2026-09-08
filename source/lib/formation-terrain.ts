import {sampleSlopeDegrees,structureTerrainClearance,type AssetManifest,type BaseTemplate,type WulframProject} from './wulfram.ts';
import type {CreativePlacement} from './builtin-base-layouts.ts';
import {FormationDiagnosticError} from './formation-diagnostics.ts';

export const ENTRANCE_HALF_WIDTH=90;
export function entranceDistance(x:number,y:number,angle:number,length:number){
  const c=Math.cos(angle),s=Math.sin(angle),along=Math.max(0,Math.min(length,x*c+y*s));
  return Math.hypot(x-along*c,y-along*s);
}

/** Move complete powered yards, preserving their internal geometry and paired symmetry. */
export function adaptFormationTerrain(source:BaseTemplate,project:WulframProject,manifest:AssetManifest,placement:CreativePlacement){
  const template=structuredClone(source),units=template.units;
  const cells=units.map((u,i)=>u.token==='e'?i:-1).filter(i=>i>=0);
  const groups:number[][]=[];
  for(const index of cells){
    const near=groups.filter(g=>g.some(i=>Math.hypot(units[i].offset[0]-units[index].offset[0],units[i].offset[1]-units[index].offset[1])<=80));
    if(!near.length)groups.push([index]);else {near[0].push(index);for(const g of near.slice(1)){near[0].push(...g);groups.splice(groups.indexOf(g),1);}}
  }
  if(!groups.length)throw new Error('Terrain adaptation requires powered yards.');
  units.forEach((u,i)=>{if(u.token==='e')return;let best=groups[0],distance=Infinity;for(const g of groups){const d=Math.min(...g.filter(j=>units[j].token==='e').map(j=>Math.hypot(u.offset[0]-units[j].offset[0],u.offset[1]-units[j].offset[1])));if(d<distance){best=g;distance=d;}}best.push(i);});
  const radii=units.map(u=>Math.max(...[1,2].map(team=>structureTerrainClearance({token:u.token,team},manifest,0,0).footprint/Math.SQRT2)));
  const yaw=placement.rotation*Math.PI/180,c=Math.cos(yaw),s=Math.sin(yaw);
  const entrance=placement.entranceDegrees===undefined?undefined:placement.entranceDegrees*Math.PI/180-yaw;
  const placed:number[]=[],shifts:Array<{units:number;dx:number;dy:number}>=[];
  const offsets:Array<[number,number]>=[];
  for(let x=-800;x<=800;x+=100)for(let y=-800;y<=800;y+=100)if(Math.hypot(x,y)<=800)offsets.push([x,y]);
  offsets.sort((a,b)=>Math.hypot(...a)-Math.hypot(...b));
  for(const group of groups){
    let best:[number,number]|undefined,bestScore=Infinity;
    for(const [dx,dy] of offsets){
      let score=Math.hypot(dx,dy)/80,valid=true;
      for(const i of group){
        const x=units[i].offset[0]+dx,y=units[i].offset[1]+dy,r=radii[i];
        if(Math.hypot(x,y)+r>placement.radius||(entrance!==undefined&&entranceDistance(x,y,entrance,placement.radius)<r+ENTRANCE_HALF_WIDTH)){valid=false;break;}
        if(placed.some(j=>Math.hypot(x-units[j].offset[0],y-units[j].offset[1])<r+radii[j]+Math.max(8,project.validation.minSpacing))){valid=false;break;}
        const wx=placement.x+x*c-y*s,wy=placement.y+x*s+y*c;
        for(const [tx,ty] of [[wx,wy],[project.terrain.worldWidth-wx,project.terrain.worldHeight-wy]]){
          if(tx-r<0||ty-r<0||tx+r>project.terrain.worldWidth||ty+r>project.terrain.worldHeight){valid=false;break;}
          for(const [ox,oy] of [[0,0],[r,0],[-r,0],[0,r],[0,-r]]){
            const slope=sampleSlopeDegrees(project.terrain,tx+ox,ty+oy);
            if(slope>Math.min(18,project.validation.maxSlopeDegrees)){valid=false;break;}
            score+=slope/group.length/10;
          }
          if(!valid)break;
        }
        if(!valid)break;
      }
      if(valid&&score<bestScore){best=[dx,dy];bestScore=score;}
    }
    if(!best)throw new FormationDiagnosticError('No terrain-safe position for a powered yard within 800 u. Move the base, enlarge its area, or change the entrance direction.',{routes:[],blocked:[{x:placement.x,y:placement.y,message:'Powered yard cannot fit slopes, entrance, and spacing constraints'}]});
    for(const i of group){units[i].offset[0]+=best[0];units[i].offset[1]+=best[1];}placed.push(...group);shifts.push({units:group.length,dx:best[0],dy:best[1]});
  }
  template.footprint={width:Math.max(...units.map(u=>u.offset[0]))-Math.min(...units.map(u=>u.offset[0]))+100,height:Math.max(...units.map(u=>u.offset[1]))-Math.min(...units.map(u=>u.offset[1]))+100};
  return {template,shifts};
}

export function checkFormationEntrances(project:WulframProject,manifest:AssetManifest,placement:CreativePlacement){
  if(placement.entranceDegrees===undefined)return [];
  const routes:Array<Array<[number,number]>>=[];
  for(const team of [1,2]){
    const angle=(placement.entranceDegrees+(team===2?180:0))*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
    const x=team===1?placement.x:project.terrain.worldWidth-placement.x,y=team===1?placement.y:project.terrain.worldHeight-placement.y;
    const fail=(px:number,py:number,message:string):never=>{throw new FormationDiagnosticError(message,{routes:[],blocked:[{x:px,y:py,message:`Team ${team}: ${message}`}]});};
    for(const e of project.entities){const r=structureTerrainClearance(e,manifest,0,0).footprint/Math.SQRT2;if(entranceDistance(e.position[0]-x,e.position[1]-y,angle,placement.radius)<r+ENTRANCE_HALF_WIDTH)fail(e.position[0],e.position[1],'Building blocks the selected entrance');}
    const route:Array<[number,number]>=[],steps=Math.ceil(placement.radius/40);
    for(let i=0;i<=steps;i++){
      const d=i/steps*placement.radius,px=x+c*d,py=y+s*d;
      for(const side of [-ENTRANCE_HALF_WIDTH,0,ENTRANCE_HALF_WIDTH]){
        const sx=px-s*side,sy=py+c*side;
        if(sx<0||sy<0||sx>project.terrain.worldWidth||sy>project.terrain.worldHeight)fail(px,py,'Entrance runs beyond the map edge');
        if(sampleSlopeDegrees(project.terrain,sx,sy)>Math.min(18,project.validation.maxSlopeDegrees))fail(px,py,'Entrance crosses steep terrain');
      }
      route.push([px,py]);
    }
    routes.push(route);
  }
  return routes;
}
