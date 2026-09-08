import {parseTerrainTextureTag, paintTerrainTextureVertex, TERRAIN_CORNER_BITS} from './terrain-textures.ts';
import type {WulframProject} from './wulfram.ts';

// Seeded texture-only accents. Output uses one-vertex MCP brushes so circular
// brush silhouettes cannot leak into the directional generated shapes.
export function planTerrainAccents(project: WulframProject, seed: string) {
  if (!seed.trim()) throw new Error('A nonempty seed is required.');
  const t=project.terrain, dx=t.worldWidth/(t.width-1), dy=t.worldHeight/(t.height-1);
  let state=2166136261; for(const c of seed)state=Math.imul(state^c.charCodeAt(0),16777619)>>>0;
  const random=()=>{state+=0x6D2B79F5;let v=state;v=Math.imul(v^(v>>>15),v|1);v^=v+Math.imul(v^(v>>>7),v|61);return ((v^(v>>>14))>>>0)/4294967296;};
  const textureAt=(col:number,row:number)=>{
    const cx=Math.min(col,t.width-2),cy=Math.min(row,t.height-2);
    const bit=TERRAIN_CORNER_BITS[(row-cy)*2+col-cx];
    return parseTerrainTextureTag(t.tagmap2[t.textureIds[cy*(t.width-1)+cx]]).find(l=>l.corners&bit)?.name??'';
  };
  const original=Array.from({length:t.width*t.height},(_,i)=>textureAt(i%t.width,Math.floor(i/t.width)));
  const clean=original.map(s=>s==='fire/1'?'marsvolc001':s==='8ice001'?'1snow001':s);
  const biome=(s:string)=>['marsvolc001','marslava001'].includes(s)?'ember':['1snow001','2snow001','1ice001','11ice001'].includes(s)?'ice':undefined;
  const at=(x:number,y:number)=>Math.max(0,Math.min(t.height-1,Math.round(y/dy)))*t.width+Math.max(0,Math.min(t.width-1,Math.round(x/dx)));
  const safe=(x:number,y:number,kind:string)=>{
    if(x<dx*3||y<dy*3||x>t.worldWidth-dx*3||y>t.worldHeight-dy*3)return false;
    if(project.entities.some(e=>Math.hypot(e.position[0]-x,e.position[1]-y)<360))return false;
    for(const [a,b] of [[0,0],[200,0],[-200,0],[0,200],[0,-200]])if(biome(clean[at(x+a,y+b)])!==kind)return false;
    const slope=Math.hypot((t.heights[at(x+dx,y)]-t.heights[at(x-dx,y)])/(2*dx),(t.heights[at(x,y+dy)]-t.heights[at(x,y-dy)])/(2*dy));
    return slope<0.5;
  };
  const target=clean.slice();
  const features:Array<{kind:string;x:number;y:number;length:number;angle:number;vertices:number}>=[];
  const scale=Math.min(t.worldWidth,t.worldHeight)/5600;
  for(const kind of ['ember','ice'])for(let feature=0;feature<3;feature++){
    let chosen:{x:number;y:number}|undefined;
    for(let attempt=0;attempt<900;attempt++){
      const x=650*scale+random()*(t.worldWidth-1300*scale),y=650*scale+random()*(t.worldHeight-1300*scale);
      if(!safe(x,y,kind)||features.some(f=>Math.hypot(f.x-x,f.y-y)<1000*scale))continue;
      if(![[450*scale,0],[-450*scale,0],[0,450*scale],[0,-450*scale]].every(([a,b])=>safe(x+a,y+b,kind)))continue;
      chosen={x,y};break;
    }
    if(!chosen)throw new Error(`No protected terrain region found for ${kind} feature ${feature+1}.`);
    const {x,y}=chosen,gx=t.heights[at(x+dx,y)]-t.heights[at(x-dx,y)],gy=t.heights[at(x,y+dy)]-t.heights[at(x,y-dy)];
    const angle=Math.hypot(gx,gy)>0.5?Math.atan2(gy,gx)+(kind==='ice'?Math.PI/2:Math.PI):random()*Math.PI*2;
    const length=(kind==='ember'?650+random()*310:650+random()*250)*scale;
    const width=(kind==='ember'?35+random()*14:68+random()*25)*scale;
    const points:Array<[number,number,number]>=[];
    for(let k=0;k<=6;k++){
      const along=(k/6-0.5)*length,lateral=(random()-0.5)*length*0.17;
      points.push([x+Math.cos(angle)*along-Math.sin(angle)*lateral,y+Math.sin(angle)*along+Math.cos(angle)*lateral,width*(k===0||k===6?0.16:kind==='ice'?[0,0.65,1.45,0.7,1.1,0.5][k]*(0.85+random()*0.3):0.65+random()*0.6)]);
    }
    const lines=[points];
    for(let branch=0;branch<(kind==='ember'?2:1);branch++){
      const origin=points[2+branch],a=angle+(branch%2?1:-1)*(0.7+random()*0.45),len=length*(0.23+random()*0.12);
      lines.push([origin,[origin[0]+Math.cos(a)*len*0.55,origin[1]+Math.sin(a)*len*0.55,width*0.45],[origin[0]+Math.cos(a)*len,origin[1]+Math.sin(a)*len,width*0.1]]);
    }
    const bright=new Set<number>();
    for(let row=0;row<t.height;row++)for(let col=0;col<t.width;col++){
      const px=col*dx,py=row*dy;
      if(Math.hypot(px-x,py-y)>length*0.85||!safe(px,py,kind))continue;
      let ratio=Infinity;
      for(const line of lines)for(let j=1;j<line.length;j++){
        const a=line[j-1],b=line[j],vx=b[0]-a[0],vy=b[1]-a[1],u=Math.max(0,Math.min(1,((px-a[0])*vx+(py-a[1])*vy)/(vx*vx+vy*vy)));
        const w=a[2]+(b[2]-a[2])*u;
        ratio=Math.min(ratio,Math.hypot(px-a[0]-u*vx,py-a[1]-u*vy)/Math.max(w,Math.min(dx,dy)*0.65));
      }
      const rough=1+0.1*Math.sin(col*1.7+row*2.3+feature*9);
      const i=row*t.width+col;
      const along=(px-x)*Math.cos(angle)+(py-y)*Math.sin(angle),lateral=-(px-x)*Math.sin(angle)+(py-y)*Math.cos(angle);
      const iceNotch=kind==='ice'&&along>length*0.08&&along<length*0.2&&lateral>width*0.15;
      if(ratio<rough&&!iceNotch){target[i]=kind==='ember'?'fire/1':'8ice001';bright.add(i);}
      else if(ratio<1.65)target[i]=kind==='ember'?'marslava001':'11ice001';
    }
    // Grid rasterization and protected terrain can sever tapered tips. Keep the
    // main connected feature instead of leaving detached bright paint flecks.
    const remaining=new Set(bright),components:number[][]=[];
    while(remaining.size){const start=remaining.values().next().value!;remaining.delete(start);const group=[start];
      for(let cursor=0;cursor<group.length;cursor++){const v=group[cursor],cx=v%t.width,cy=Math.floor(v/t.width);
        for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++){if(cx+xx<0||cx+xx>=t.width||cy+yy<0||cy+yy>=t.height)continue;const n=(cy+yy)*t.width+cx+xx;if(remaining.delete(n))group.push(n);}
      }components.push(group);
    }
    components.sort((a,b)=>b.length-a.length);
    for(const group of components.slice(1))for(const i of group)target[i]=clean[i];
    const count=components[0]?.length??0;
    if(count<5)throw new Error('Feature cannot resolve at this terrain grid density.');
    features.push({kind,x,y,length,angle,vertices:count});
  }
  const brushes=target.flatMap((texture,i)=>texture===original[i]?[]:[{operation:'texture' as const,x:(i%t.width)*dx,y:Math.floor(i/t.width)*dy,radius:Math.min(dx,dy)*0.3,texture}]);
  const counts=(values:string[])=>({ice:values.filter(s=>s==='8ice001').length,ember:values.filter(s=>s==='fire/1').length});
  return {version:1,seed,features,brushes,before:counts(original),after:counts(target)};
}

export function applyAccentPlanOffline(project:WulframProject,plan:ReturnType<typeof planTerrainAccents>){
  const p=structuredClone(project),t=p.terrain,tags=new Map(t.tagmap2.map((s,i)=>[s.trim(),i]));
  for(const b of plan.brushes)paintTerrainTextureVertex(t,Math.round(b.x/t.worldWidth*(t.width-1)),Math.round(b.y/t.worldHeight*(t.height-1)),b.texture,tags);
  return p;
}
