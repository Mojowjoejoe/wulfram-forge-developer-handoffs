import {checkFormationAccess} from './formation-access.ts';
import {BROKEN_RING_PAD_MARGIN,type BrokenRingPlan} from './broken-ring.ts';
import {checkBuildAreas, type BuildArea} from './build-areas.ts';
import {routeClearance} from './route-inspection.ts';
import {analyzeRotationalEntityPairs} from './balanced-map-analysis.ts';
import {structureTerrainClearance,type AssetManifest,type WulframProject} from './wulfram.ts';

export function checkBrokenRingPlacement(project: WulframProject, manifest: AssetManifest, plan: BrokenRingPlan, x: number, y: number, rotation: number, radius?: number) {
 if (![x, y, rotation].every(Number.isFinite)) throw new Error('Broken Ring placement must be finite.');
 const paths = [plan.route, ...plan.serviceRoutes, plan.circulation,
  // A one-unit capsule conservatively contains the circular empty interior and rotates exactly.
  {width: plan.interiorRadius * 2, points: [[-.5, 0], [.5, 0]] as Array<[number, number]>}];
 if (radius !== undefined && (!Number.isFinite(radius) || paths.some(route => route.points.some(p => Math.hypot(...p) + route.width / 2 > radius)))) throw new Error('Broken Ring reservations exceed the yellow area. Increase its radius.');
 // Preserve site/frontage associations after count fitting and terrain adaptation.
 for (const entity of project.entities) {
  if (entity.team !== 1 && entity.team !== 2) continue;
  const yaw = (rotation + (entity.team === 2 ? 180 : 0)) * Math.PI / 180;
  const ax = entity.team === 1 ? x : project.terrain.worldWidth - x, ay = entity.team === 1 ? y : project.terrain.worldHeight - y;
  const dx = entity.position[0] - ax, dy = entity.position[1] - ay;
  const px = dx * Math.cos(yaw) + dy * Math.sin(yaw), py = -dx * Math.sin(yaw) + dy * Math.cos(yaw);
  const service = ['u', 'r', 'f'].includes(entity.token);
  const eligible = plan.sites.filter(site => entity.token === 'e' || site.roles.includes(entity.token));
  const limit = entity.token === 'e' ? 100 : 270;
  if ((service && px >= 0) || !eligible.some(site => Math.hypot(px - site.center[0], py - site.center[1]) <= limit)) throw new Error('Broken Ring terrain adaptation detached a building from its perimeter site or rear service frontage. Move the base or reshape the terrain.');
 }
 // New recipes enforce the endpoint contract on final entities, including adapted/count-fitted favorites.
 if(plan.version==='broken-ring-v3')for(const pad of project.entities.filter(e=>['r','f'].includes(e.token)))for(const other of project.entities){
  if(other===pad)continue;
  const margin=Math.hypot(pad.position[0]-other.position[0],pad.position[1]-other.position[1])-structureTerrainClearance(other,manifest,0,0).footprint/Math.SQRT2;
  if(margin<BROKEN_RING_PAD_MARGIN-1e-6)throw new Error('Broken Ring service pad needs more clearance from neighboring buildings. Move the base or change its size/count.');
 }
 const areas: BuildArea[] = [1, 2].flatMap(team => {
  const yaw = (rotation + (team === 2 ? 180 : 0)) * Math.PI / 180, c = Math.cos(yaw), s = Math.sin(yaw);
  const ax = team === 1 ? x : project.terrain.worldWidth - x, ay = team === 1 ? y : project.terrain.worldHeight - y;
  return paths.map((route, i) => ({id: `broken-ring-${team}-${i}`, name: `Team ${team} Broken Ring ${['through passage', 'first service frontage', 'second service frontage', 'perimeter circulation', 'open interior'][i]}`, team: 'all' as const, kind: 'corridor' as const, width: route.width, points: route.points.map(([px, py]) => [ax + px * c - py * s, ay + px * s + py * c] as [number, number])}));
 });
 const problems = checkBuildAreas(areas, project.entities, project.terrain.worldWidth, project.terrain.worldHeight, manifest);
 if (problems.length) throw new Error(`Broken Ring reservation: ${problems[0]}`);
 const pairing = analyzeRotationalEntityPairs(project, manifest);
 if (!pairing.passed) throw new Error(`Broken Ring requires matching paired terrain support: ${pairing.message}`);
 const routes = areas.filter(a => !a.id.endsWith('-4')).map(area => {
  if (area.kind !== 'corridor') throw new Error('Invalid Broken Ring route.');
  const markers = routeClearance(project, manifest, area.points, 80, false);
  const blocked = markers.find(m => m.severity === 'blocked');
  if (blocked) throw new Error(`Broken Ring ${area.name}: ${blocked.message}. Move the base or reshape the terrain.`);
  return {id: area.id, points: area.points, markers};
 });
 let serviceAccess;
 if(plan.version==='broken-ring-v3'){
  const checked=checkFormationAccess(project,manifest);
  const serviceRoutes=checked.routes.map(points=>({points,markers:routeClearance(project,manifest,points,80)}));
  if(checked.clearance<BROKEN_RING_PAD_MARGIN||serviceRoutes.some(r=>r.markers.length))throw new Error('Broken Ring needs wider service approaches. Move the base or reshape the terrain.');
  serviceAccess={vehicleWidth:80,clearance:checked.clearance,routes:serviceRoutes};
 }
 return {areas, access: {version: 1,...(serviceAccess?{serviceAccess}:{}), vehicleWidth: 80, evidence: 'Sampled terrain and estimated building clearance; not in-game collision or pad-entry proof.', routes}};
}
