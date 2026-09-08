import type {RouteElevation} from '@/lib/route-elevation';
export function RouteElevationProfile({profile,progress}:{profile:RouteElevation;progress:number}) {
 if(profile.error)return <p className="field-help" role="status">{profile.error}</p>;
 if(!profile.samples.length)return null;
 const heights=profile.samples.map(s=>s.height),low=Math.min(...heights),high=Math.max(...heights),span=Math.max(1,high-low);
 const x=(distance:number)=>10+distance/Math.max(1,profile.length)*280;
 const y=(height:number)=>90-(height-low)/span*70;
 const at=profile.samples.find(s=>s.distance>=progress*profile.length)??profile.samples[profile.samples.length-1];
 return <figure style={{margin:'12px 0'}} aria-label="Sampled route elevation">
  <figcaption className="field-help">Elevation along route · {profile.length.toFixed(0)} u</figcaption>
  <svg viewBox="0 0 300 110" role="img" aria-label={`Sampled terrain profile, elevation ${low.toFixed(0)} to ${high.toFixed(0)} units. Current elevation ${at.height.toFixed(0)}, preceding interval grade ${at.gradeDegrees.toFixed(1)} degrees.`} style={{width:'100%',display:'block',background:'#101619'}}>
   <polyline fill="none" stroke="#efaa68" strokeWidth="2" points={profile.samples.map(s=>`${x(s.distance)},${y(s.height)}`).join(' ')}/>
   <line x1={x(progress*profile.length)} x2={x(progress*profile.length)} y1="10" y2="95" stroke="#80d9ff" strokeDasharray="3 3"/>
   <text x="10" y="106" fill="#ccd5df" fontSize="10">Start</text><text x="290" y="106" textAnchor="end" fill="#ccd5df" fontSize="10">End</text>
  </svg>
  <p className="field-help">Climb {profile.ascent.toFixed(0)} u · Descent {profile.descent.toFixed(0)} u<br/>Steepest sampled uphill {profile.maxUphillDegrees.toFixed(1)}° · downhill {profile.maxDownhillDegrees.toFixed(1)}°</p>
  <p className="field-help">Terrain profile only. Vertical scale is exaggerated; craft motion is not simulated. Use Route progress below to inspect the hill.</p>
 </figure>;
}
