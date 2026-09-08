import {routeElevation} from '@/lib/route-elevation';
import {RouteElevationProfile} from './route-elevation-profile';
import {useEffect,useMemo,useState} from 'react';
import {inspectionRoutes,type InspectionRoute} from '@/lib/inspection-routes';
import {routeCameraPose,routeClearance,routeLength,type ClearanceMarker,type RouteCameraRequest,type RoutePoint} from '@/lib/route-inspection';
import type {AssetManifest,WulframProject} from '@/lib/wulfram';
import {sampleHeight} from '@/lib/wulfram';
export function RouteInspector({project,manifest,onCamera,onMarkers,onRoute,pauseToken,includeAuthored=true,sketch}:{project:WulframProject;manifest:AssetManifest;onCamera:(request:RouteCameraRequest)=>void;onMarkers:(markers:ClearanceMarker[])=>void;onRoute:(route:RoutePoint[])=>void;pauseToken:unknown;includeAuthored?:boolean;sketch?:{active:boolean;drawing:boolean;points:RoutePoint[];onStart:()=>void;onFinish:()=>void;onClear:()=>void;onRemove:()=>void}}){
  const [width,setWidth]=useState(80);
  const [state,setState]=useState({source:project,index:0,progress:0,playing:false,pauseToken});
  const current=state.source===project?state:{source:project,index:0,progress:0,playing:false,pauseToken};
  const playing=current.playing&&current.pauseToken===pauseToken;
  const result=useMemo(()=>inspectionRoutes(project,manifest,includeAuthored),[project,manifest,includeAuthored]);
  const selected:InspectionRoute|undefined=sketch?.active?{id:'temporary',name:'Temporary path',kind:'temporary',points:sketch.points}:result.routes[current.index];
  const route=useMemo(()=>selected?.points??[],[selected?.points]);
  const elevation=useMemo(()=>routeElevation(project.terrain,route),[project,route]);
  const clearance=useMemo(()=>{try{return {markers:routeClearance(project,manifest,route,width,selected?.kind==='service'),error:''};}catch(error){return {markers:[] as ClearanceMarker[],error:error instanceof Error?error.message:'Route cannot be inspected.'};}},[project,manifest,route,width,selected?.kind]);
  const markers=clearance.markers;
  useEffect(()=>{onMarkers(markers);return()=>onMarkers([]);},[markers,onMarkers]);
  useEffect(()=>{onRoute(route);return()=>onRoute([]);},[route,onRoute]);
  const move=(progress:number,play=false)=>{setState({...current,source:project,progress,playing:play,pauseToken});if(route.length)onCamera(routeCameraPose(project,route,progress));};
  useEffect(()=>{
    if(!playing||route.length<2)return;
    let progress=current.progress,last=performance.now();
    const timer=setInterval(()=>{const now=performance.now();progress=Math.min(1,progress+(now-last)/1000*250/Math.max(1,routeLength(route)));last=now;setState({source:project,index:current.index,progress,playing:progress<1,pauseToken});onCamera(routeCameraPose(project,route,progress));},80);
    return()=>clearInterval(timer);
  },[playing,route,project,current.index,current.progress,onCamera,pauseToken]);
  return <section className="inspector-block" aria-label="Route inspection">
    <p className="section-label">ROUTE INSPECTION</p>
    {sketch&&<div className="temporary-route-controls">
      <button type="button" className="secondary-action" onClick={()=>{setState({...current,progress:0,playing:false,pauseToken});sketch.onStart();}}>Draw inspection path</button>
      {sketch.active&&<>
        <p className="field-help" role="status">{sketch.drawing?`Click terrain to add points (${sketch.points.length}/32). Finish to inspect; Escape cancels.`:'Temporary inspection path · not saved to the map.'}</p>
        <button type="button" className="secondary-action" disabled={!sketch.points.length} onClick={()=>{setState({...current,progress:0,playing:false,pauseToken});sketch.onRemove();}}>Remove last point</button>
        {sketch.drawing&&<button type="button" className="secondary-action" disabled={sketch.points.length<2} onClick={sketch.onFinish}>Finish inspection path</button>}
        <button type="button" className="secondary-action" onClick={()=>{setState({...current,progress:0,playing:false,pauseToken});sketch.onClear();}}>Clear inspection path</button>
      </>}
    </div>}

    {!sketch?.active&&result.error&&<output className="field-help">{result.error}</output>}
    <label className="field-help">Approach or corridor<select aria-label="Inspect route" className="template-select" value={sketch?.active?-1:current.index} disabled={!result.routes.length||sketch?.active} onChange={event=>{const index=Number(event.target.value);setState({source:project,index,progress:0,playing:false,pauseToken});const reserved=result.routes[index]?.reservedWidth;if(reserved)setWidth(Math.max(20,Math.min(400,Math.round(reserved/10)*10)));}}>{sketch?.active?<option value={-1}>Temporary inspection path</option>:result.routes.length?result.routes.map((r,i)=><option key={`${r.kind}:${r.id}`} value={i}>{r.name}</option>):<option value={0}>No routes available</option>}</select></label>
    {selected?.kind==='service'&&<p className="field-help" data-service-route>{selected.entranceCorridorId?'Service approach through the selected entrance. Every authored turn is included.':'Automatic service approach. It may take a different path from an authored corridor; inspect each separately.'}</p>}
    {selected?.kind==='authored'&&<p className="field-help" data-authored-route>Authored reservation: {selected.reservedWidth} u wide. Inspection follows the saved point order and checks all teams. Vehicle width below is an inspection assumption; changing it does not edit the saved corridor.</p>}
    {selected?.reservedWidth!==undefined&&width>selected.reservedWidth&&<p className="field-help" data-reservation-width-warning>The assumed vehicle is wider than the reserved corridor. Any extra clearance depends on unreserved space.</p>}
    <label className="field-help" style={{display:'block',margin:'12px 0'}}>Assumed vehicle width: {width} u<input style={{display:'block',width:'100%',accentColor:'#ef8f4c'}} aria-label="Vehicle clearance width" type="range" min={20} max={400} step={10} value={width} onChange={e=>setWidth(Number(e.target.value))} /></label>
    <RouteElevationProfile profile={elevation} progress={current.progress}/>
    <label className="field-help" style={{display:'block',margin:'12px 0'}}>Route progress: {Math.round(current.progress*100)}%<input style={{display:'block',width:'100%',accentColor:'#ef8f4c'}} aria-label="Route progress" type="range" min={0} max={100} step={1} value={current.progress*100} disabled={route.length<2||sketch?.drawing||!!clearance.error} onChange={event=>move(Number(event.target.value)/100)} /></label>
    <button type="button" className="secondary-action" disabled={route.length<2||sketch?.drawing||!!clearance.error} onClick={()=>playing?move(current.progress):move(current.progress>=1?0:current.progress,true)}>{playing?'Pause route':'Follow route'}</button>
    <p className="field-help">250 u/s camera tour {selected?.kind!=='service'?'from first to last path point; buildings at endpoints are included in clearance checks':'from battlefield to pad; the destination pad is treated as drive-on'}. Red: insufficient estimated clearance. Yellow: less than 40 u extra clearance per side. Pause to orbit freely.</p>
    <p className="field-help" data-route-clearance>{clearance.error?clearance.error:route.length<2?'Add at least two points or select a route to check clearance.':markers.length?`${markers.filter(m=>m.severity==='blocked').length} blocked, ${markers.filter(m=>m.severity==='tight').length} tight`:'No clearance issues found at this width.'} Sampled terrain and conservative building circles; not vehicle collision proof.</p>
    <div style={{maxHeight:240,overflowY:'auto'}}>{markers.slice(0,30).map((m,i)=><button type="button" className="secondary-action" style={{color:m.severity==='blocked'?'#ff8888':'#ffdb70',display:'block',width:'100%',marginTop:5}} key={i} onClick={()=>{setState({...current,source:project,progress:m.progress,playing:false,pauseToken});const z=sampleHeight(project.terrain,m.x,m.y)+15;onCamera({eye:[m.x,m.y+1,z+500],target:[m.x,m.y,z]});}}>{m.message} · {Math.round(m.progress*100)}%</button>)}</div>
    {markers.length>30&&<p className="field-help">Showing the first 30 of {markers.length} issues.</p>}
  </section>;
}
