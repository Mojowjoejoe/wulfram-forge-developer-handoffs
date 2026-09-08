import {insertLanePoint} from '@/lib/lane-path';
import type {TerrainLaneOptions} from '@/lib/terrain-lane';
export function TerrainLanePanel({options,onChange,drawing,onDraw,onCancel,onApply,message,canApply}:{options:TerrainLaneOptions;onChange:(change:Partial<TerrainLaneOptions>)=>void;drawing:boolean;onDraw:()=>void;onCancel:()=>void;onApply:()=>void;message:string;canApply:boolean}){
 return <section className="inspector-block terrain-lane-panel"><p className="section-label">LANE TOOL</p>
 <button className="secondary-action" type="button" onClick={onDraw} disabled={drawing}>Draw lane</button>
 <p className="field-help">Drag from the start to the end on the terrain. Release to preview; Apply lane commits one Undo step.</p>
 <label>Operation<select value={options.operation} onChange={e=>onChange({operation:e.target.value as TerrainLaneOptions['operation']})}><option value="cut">Cut high terrain only</option><option value="cut-fill">Cut and fill to floor height</option></select></label>
 {([['width','Lane width',80,2000,20],['shoulder','Shoulder blend',40,2000,20],['floorHeight','Floor height',-5000,5000,5]] as const).map(([key,label,min,max,step])=><label key={key}>{label}<input aria-label={label} type="number" min={min} max={max} step={step} value={options[key]} onChange={e=>{const value=e.target.valueAsNumber;if(Number.isFinite(value))onChange({[key]:value});}}/></label>)}
 <label className="range-field"><span><b>Curve / bend</b><output>{Math.round((options.bend ?? 0)*100)}%</output></span><input aria-label="Lane curve / bend" disabled={drawing||options.points.length>2} type="range" min={-1} max={1} step={.05} value={options.bend ?? 0} onChange={e=>onChange({bend:Number(e.target.value)})}/></label>
 <p className="field-help">Drag the numbered points on the map to reshape the preview. The square handle bends a two-point lane.</p>
 {options.points.length>=2&&<details><summary>Path points ({options.points.length})</summary>
   <p className="field-help">Edit coordinates or drag map handles. Set bend to zero to add turns. Multi-point lanes use straight segments with rounded joins.</p>
   <fieldset disabled={drawing} style={{border:0,padding:0,minWidth:0}}>
   {options.points.map((point,i)=><div key={i} style={{marginTop:12,display:'grid',gap:8,paddingTop:10,borderTop:'1px solid #39434a'}}><strong>Point {i+1}</strong>
     {(['X','Y'] as const).map((axis,j)=><label key={axis} style={{display:'grid',gap:4}}>{axis}<input aria-label={`Lane point ${i+1} ${axis}`} type="number" step={10} value={Number(point[j].toFixed(2))} onChange={e=>{const v=e.target.valueAsNumber;if(Number.isFinite(v))onChange({points:options.points.map((p,k)=>k===i?[j===0?v:p[0],j===1?v:p[1]]:p)});}}/></label>)}
     <button className="secondary-action" type="button" aria-label={`Remove lane point ${i+1}`} disabled={options.points.length<=2} onClick={()=>onChange({points:options.points.filter((_,k)=>k!==i)})}>Remove point</button>
     {i<options.points.length-1&&<button className="secondary-action" type="button" aria-label={`Add lane point after ${i+1}`} disabled={options.points.length>=32||!!options.bend} onClick={()=>onChange({points:insertLanePoint(options.points,i)})}>Add point after</button>}
   </div>)}
   </fieldset>
 </details>}
 <label>Placement protection<select value={options.placementMode} onChange={e=>onChange({placementMode:e.target.value as TerrainLaneOptions['placementMode']})}><option value="manual">Manual</option><option value="protected">Protect authored routes</option></select></label>
 <label className="lane-mirror"><input type="checkbox" checked={options.mirror} onChange={e=>onChange({mirror:e.target.checked})}/> Mirror lane</label>
 <output>{drawing?'Drawing lane · release to preview · Escape cancels':message}</output>
 <div className="lane-actions"><button type="button" disabled={!canApply||drawing} onClick={onApply}>Apply lane</button><button type="button" onClick={onCancel}>Clear lane preview</button></div>
 <p className="field-help">Width sets the lane core; Shoulder blend adds a transition on each side and around the ends. Structures and saved height rules stay protected in both modes. Cut only leaves lower ground unchanged. Check the resulting slopes and driving route in game.</p>
 </section>;
}
