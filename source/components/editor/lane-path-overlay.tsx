import {useEffect,useRef,type RefObject} from 'react';
import * as THREE from 'three';
import {lanePath,type LanePoint} from '@/lib/lane-path';
import {entityPositionToScene,scenePositionToEntity} from '@/lib/model-transform';
import {sampleHeight,type TerrainData} from '@/lib/wulfram';

export type LaneHandleEdit={handle:number|'bend';point:LanePoint};
export interface LanePathControls {
 points:LanePoint[];bend:number;disabled:boolean;
 onEdit:(phase:'start'|'move'|'end'|'cancel',edit?:LaneHandleEdit)=>void;
}

/** Editor-only screen handles: these never become terrain or map entities. */
export function LanePathOverlay({value,camera,mesh,terrain,scale}:{value:LanePathControls;
 camera:RefObject<THREE.PerspectiveCamera|null>;mesh:RefObject<THREE.Mesh|null>;terrain:TerrainData;scale:number}){
 const root=useRef<HTMLDivElement>(null),current=useRef({value,terrain,scale});
 current.current={value,terrain,scale};
 const drag=useRef<{handle:number|'bend';pointerId:number;button:HTMLButtonElement;height:number;offset:LanePoint;client:LanePoint;last?:LanePoint}|undefined>(undefined);
 const finish=(cancel:boolean)=>{
   const active=drag.current;if(!active)return;drag.current=undefined;
   if(active.button.hasPointerCapture(active.pointerId))active.button.releasePointerCapture(active.pointerId);
   current.current.value.onEdit(cancel?'cancel':'end');
 };
 useEffect(()=>{
   let frame=0;
   const draw=()=>{
     const element=root.current,c=camera.current,{value:v,terrain:t,scale:s}=current.current;
     if(element&&c){
       const rect=element.getBoundingClientRect();
       const project=(p:LanePoint)=>new THREE.Vector3(...entityPositionToScene([p[0],p[1],sampleHeight(t,...p)+8],t,s)).project(c);
       const path=lanePath(v.points,v.bend),projected=path.map(project);
       const line=element.querySelector('polyline');
       line?.setAttribute('points',projected.filter(p=>p.z>=-1&&p.z<=1).map(p=>`${(p.x+1)*rect.width/2},${(1-p.y)*rect.height/2}`).join(' '));
       const handles=[...v.points,...(v.points.length===2?[path[Math.floor(path.length/2)]??v.points[0]]:[])];
       // A straight two-point path has no sampled midpoint.
       if(v.points.length===2&&!v.bend)handles[2]=[(v.points[0][0]+v.points[1][0])/2,(v.points[0][1]+v.points[1][1])/2];
       element.querySelectorAll<HTMLButtonElement>('button').forEach((button,i)=>{
         const p=handles[i];if(!p)return;const q=project(p);
         button.style.visibility=q.z < -1||q.z>1?'hidden':'visible';
         button.style.left=`${(q.x+1)*rect.width/2}px`;button.style.top=`${(1-q.y)*rect.height/2}px`;
       });
     }
     frame=requestAnimationFrame(draw);
   };
   frame=requestAnimationFrame(draw);
   const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&drag.current){e.preventDefault();finish(true);}};
   const blur=()=>finish(true);
   window.addEventListener('keydown',key);window.addEventListener('blur',blur);
   return()=>{cancelAnimationFrame(frame);window.removeEventListener('keydown',key);window.removeEventListener('blur',blur);drag.current=undefined;};
 },[camera]);
 const position=(clientX:number,clientY:number):LanePoint|undefined=>{
   const c=camera.current,m=mesh.current,r=root.current?.getBoundingClientRect();if(!c||!m||!r)return;
   const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((clientX-r.left)/r.width*2-1,1-(clientY-r.top)/r.height*2),c);
   const active=drag.current;
   const hit=active?ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-active.height),new THREE.Vector3()):ray.intersectObject(m,false)[0]?.point;if(!hit)return;
   const {terrain:t,scale:s}=current.current;const [x,y]=scenePositionToEntity(hit.toArray(),t,s);return [x+(active?.offset[0]??0),y+(active?.offset[1]??0)];
 };
 return <div ref={root} className="lane-path-overlay" aria-label="Lane path handles" style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:12}}>
   <svg width="100%" height="100%" aria-hidden="true" style={{position:'absolute',inset:0}}><polyline fill="none" stroke="#40d7f4" strokeWidth="3" strokeDasharray="7 5"/></svg>
   {[...value.points.map((_,i)=>i),...(value.points.length===2?['bend' as const]:[])].map(handle=><button key={handle} type="button" disabled={value.disabled}
     aria-label={handle==='bend'?'Drag lane bend':`Drag lane point ${handle+1}`} title={handle==='bend'?'Drag to bend the lane':'Drag point; arrow keys move 10 units, Shift + arrow moves 100'}
     style={{position:'absolute',transform:'translate(-50%,-50%)',pointerEvents:'auto',touchAction:'none',width:30,height:30,padding:0,border:'2px solid #fff',borderRadius:handle==='bend'?4:20,background:handle==='bend'?'#805922':'#145a69',color:'#fff',cursor:'grab'}}
     onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);const {terrain:t,scale:s}=current.current;const center=handle==='bend'?[(value.points[0][0]+value.points[1][0])/2-(value.points[1][1]-value.points[0][1])*value.bend/2,(value.points[0][1]+value.points[1][1])/2+(value.points[1][0]-value.points[0][0])*value.bend/2] as LanePoint:value.points[handle];drag.current={handle,pointerId:e.pointerId,button:e.currentTarget,height:(sampleHeight(t,...center)+8)*s,offset:[0,0],client:[e.clientX,e.clientY]};const hit=position(e.clientX,e.clientY);if(hit)drag.current.offset=[center[0]-hit[0],center[1]-hit[1]];value.onEdit('start');}}
     onPointerMove={e=>{const active=drag.current;if(!active||active.pointerId!==e.pointerId||(!active.last&&e.clientX===active.client[0]&&e.clientY===active.client[1]))return;const p=position(e.clientX,e.clientY);if(p){active.last=p;current.current.value.onEdit('move',{handle:active.handle,point:p});}}}
     onPointerUp={e=>{const active=drag.current;if(active?.pointerId!==e.pointerId)return;if(active.last||e.clientX!==active.client[0]||e.clientY!==active.client[1]){const p=position(e.clientX,e.clientY);if(p)current.current.value.onEdit('move',{handle,point:p});}finish(false);}}
     onPointerCancel={()=>finish(true)} onLostPointerCapture={()=>finish(true)}
     onKeyDown={e=>{if(handle==='bend'||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();e.stopPropagation();const p=value.points[handle],step=e.shiftKey?100:10;value.onEdit('start');value.onEdit('move',{handle,point:[p[0]+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),p[1]+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0)]});value.onEdit('end');}}
   >{handle==='bend'?'↔':handle+1}</button>)}
 </div>;
}
