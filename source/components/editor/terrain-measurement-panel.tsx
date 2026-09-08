'use client';
import {useState} from 'react';
import {measureTerrain,type TerrainMeasurement} from '@/lib/terrain-measurement';
import type {TerrainData} from '@/lib/wulfram';
import type {TerrainSelection} from '@/lib/terrain-selection';
export function TerrainMeasurementPanel({terrain,selection}:{terrain:TerrainData;selection?:TerrainSelection}){
 const [result,setResult]=useState<{terrain:TerrainData;region:string;measurement:TerrainMeasurement}>();
 const [error,setError]=useState('');const region=JSON.stringify(selection??null),fresh=result?.terrain===terrain&&result.region===region;
 const n=(v:number)=>v.toLocaleString(undefined,{maximumFractionDigits:2});
 return <details className="terrain-measurement-panel"><summary>Terrain measurements</summary>
  <p>{selection?'Measures the current brush rectangle.':'Measures the whole map. Choose a brush selection to inspect a smaller site.'} Width and height are horizontal world units. Measurements do not edit terrain.</p>
  <button type="button" onClick={()=>{try{setResult({terrain,region,measurement:measureTerrain(terrain,selection)});setError('');}catch(e){setResult(undefined);setError(e instanceof Error?e.message:'Measurement unavailable.');}}}>Measure terrain region</button>
  {error&&<p role="alert">{error}</p>}
  {result&&!fresh&&<output>Terrain or selection changed. Measure again for current values.</output>}
  {result&&fresh&&<output><dl>
   <dt>Horizontal extent</dt><dd>{n(result.measurement.width)} × {n(result.measurement.height)} u</dd>
   <dt>Grid spacing</dt><dd>{n(result.measurement.gridX)} × {n(result.measurement.gridY)} u</dd>
   <dt>Lowest / highest</dt><dd>{n(result.measurement.minHeight)} / {n(result.measurement.maxHeight)} u</dd>
   <dt>Height difference</dt><dd>{n(result.measurement.relief)} u</dd>
   <dt>Steepest terrain face</dt><dd>{n(result.measurement.maxSlopeDegrees)}°</dd>
   <dt>Intersected triangles</dt><dd>{n(result.measurement.triangles)}</dd>
  </dl></output>}
  <p>Heights and slopes use the editor terrain triangles clipped to this region. A low slope alone does not establish building clearance, power, vehicle access or game collision.</p>
 </details>;
}
