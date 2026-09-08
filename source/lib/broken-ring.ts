import {hasModelForEntity, structureTerrainClearance, type AssetManifest, type BaseTemplate, type BaseTemplateUnit} from './wulfram.ts';
import {distanceToSegment} from './build-areas.ts';
import type {CreativeSize} from './creative-base-layouts.ts';

export const BROKEN_RING_VERSION = 'broken-ring-v1';
export const BROKEN_RING_PAD_MARGIN = 96;
type Point = [number, number];
export type BrokenRingPlan = {
 version: typeof BROKEN_RING_VERSION | 'broken-ring-v2' | 'broken-ring-v3';
 size: CreativeSize;
 seed: string;
 interiorRadius: number;
 route: {width: number; points: Point[]};
 serviceRoutes: Array<{width: number; points: Point[]}>;
 circulation: {width: number; points: Point[]};
 sites: Array<{center: Point; roles: string[]}>;
};
const specs = {
 small: {radius: 1050, angles: [135, 225, 45, 300], roles: [['u','r','g'], ['f','s','g'], ['g','s'], ['g','s']]},
 standard: {radius: 1250, angles: [135, 225, 40, 300, 85], roles: [['u','r','g'], ['f','s','g'], ['g','s'], ['g','L'], ['g','g','s']]},
 large: {radius: 1450, angles: [135, 225, 40, 305, 85, 270], roles: [['u','r','g'], ['f','s','g'], ['g','s'], ['g','L'], ['g','g','s'], ['g','L','s']]},
 massive: {radius: 1800, angles: [155, 215, 40, 320, 80, 120, 250, 285], roles: [['u','r','g'], ['f','s','g'], ['g','s'], ['g','L'], ['g','g','s'], ['d','g','s'], ['g','L','s'], ['d','L','g']]},
};
function specFor(size: CreativeSize) {
 if (!Object.hasOwn(specs, size)) throw new Error('Unsupported Broken Ring size.');
 return specs[size];
}
function seeded(seed: string) {
 let state = 2166136261;
 for (const c of `${BROKEN_RING_VERSION}:${seed}`) state = Math.imul(state ^ c.charCodeAt(0), 16777619) >>> 0;
 return () => {state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296;};
}
export function brokenRingRequiredCounts(size: CreativeSize): Record<string, number> {
 const spec = specFor(size), counts: Record<string, number> = {e: spec.angles.length * 2};
 for (const roles of spec.roles) for (const role of roles) counts[role] = (counts[role] ?? 0) + 1;
 return counts;
}
/** Local candidate geometry only. Admission and destination placement remain separate. */
export function brokenRingPlan(seed: string, size: CreativeSize): BrokenRingPlan {
 const spec = specFor(size), random = seeded(seed);
 const rearOffset = 100 + random() * 160, bend = -200 + random() * 120;
 const plan: BrokenRingPlan = {version: BROKEN_RING_VERSION, seed, size, interiorRadius: 450, serviceRoutes: [], circulation: {width: 120, points: []},
  route: {width: 240, points: [[-spec.radius - 350, rearOffset], [bend, rearOffset], [200, 0], [spec.radius + 350, 0]]},
  sites: spec.angles.map((angle, i) => {
   const radians = (angle + (random() - .5) * 8) * Math.PI / 180;
   const radius = spec.radius + (random() - .5) * 160;
   return {center: [Math.cos(radians) * radius, Math.sin(radians) * radius], roles: [...spec.roles[i]]};
  })};
 const loopRadius = spec.radius - 430;
 const siteAngles = plan.sites.map(site => (Math.atan2(site.center[1], site.center[0]) + Math.PI * 2) % (Math.PI * 2));
 const angles = [...new Set([...Array.from({length: 16}, (_, i) => i * Math.PI / 8), ...siteAngles])].sort((a, b) => a - b);
 const loopPoints: Point[] = angles.map(angle => [Math.cos(angle) * loopRadius, Math.sin(angle) * loopRadius]);
 plan.circulation.points = [...loopPoints, [...loopPoints[0]]];
 plan.serviceRoutes = siteAngles.slice(0, 2).map(angle => ({width: 120, points: [[bend, rearOffset], [...loopPoints[angles.indexOf(angle)]]]}));
 return plan;
}
export function brokenRingTemplate(seed: string, size: CreativeSize, manifest: AssetManifest): {template: BaseTemplate; plan: BrokenRingPlan} {
 return buildBrokenRingTemplate(brokenRingPlan(seed,size),manifest);
}
export function buildBrokenRingTemplate(plan:BrokenRingPlan,manifest:AssetManifest):{template:BaseTemplate;plan:BrokenRingPlan}{
 const {seed,size}=plan, required=brokenRingRequiredCounts(size),random=seeded(plan.version===BROKEN_RING_VERSION?`units:${seed}`:`${plan.version==='broken-ring-v3'?'broken-ring-v2':plan.version}:units:${seed}`);
 for (const token of Object.keys(required)) for (const team of [1, 2]) if (!hasModelForEntity({token, team}, manifest)) throw new Error(`Broken Ring needs the original ${token} model for team ${team}.`);
 const units: BaseTemplateUnit[] = [], radii = new Map<string, number>();
 const radius = (token: string) => {
  if (!radii.has(token)) radii.set(token, Math.max(...[1, 2].map(team => structureTerrainClearance({token, team}, manifest, 0, 0).footprint / Math.SQRT2)));
  return radii.get(token)!;
 };
 const clear = (token: string, x: number, y: number) =>
  Math.hypot(x, y) >= plan.interiorRadius + radius(token) + 14 &&
  units.every(u => Math.hypot(x - u.offset[0], y - u.offset[1]) >= Math.max(radius(token) + radius(u.token) + 14, plan.version==='broken-ring-v3'&&['r','f'].includes(token)?radius(u.token)+BROKEN_RING_PAD_MARGIN:0, plan.version==='broken-ring-v3'&&['r','f'].includes(u.token)?radius(token)+BROKEN_RING_PAD_MARGIN:0)) &&
  [plan.route, ...plan.serviceRoutes, plan.circulation].every(route => route.points.slice(1).every((b, i) => distanceToSegment(x, y, route.points[i], b) >= route.width / 2 + radius(token) + 14));
 const add = (token: string, x: number, y: number, yaw = 0) => {
  if (!clear(token, x, y)) throw new Error('Broken Ring cannot preserve its open interior, openings and model spacing.');
  units.push({token, offset: [x, y], rotation: [0, 0, yaw], groundOffset: 0, active: 1});
 };
 for (const site of plan.sites) {
  const [x, y] = site.center;
  add('e', x - 20, y); add('e', x + 20, y);
  for (const token of site.roles) {
   let placed = false;
   const inward = ['r', 'f', 'u'].includes(token);
   for (let attempt = 0; attempt < 500; attempt++) {
    const angle = Math.atan2(y, x) + (inward ? Math.PI : 0) + (random() - .5) * Math.PI * .8;
    const reach = 120 + random() * 80, px = x + Math.cos(angle) * reach, py = y + Math.sin(angle) * reach;
    if (!clear(token, px, py)) continue;
    add(token, px, py, angle); placed = true; break;
   }
   if (!placed) throw new Error('Broken Ring seed cannot fit its required roles.');
  }
 }
 // Include original model bounds, the full-width route and the open interior.
 const xs = units.flatMap(u => [u.offset[0] - radius(u.token), u.offset[0] + radius(u.token)]);
 const ys = units.flatMap(u => [u.offset[1] - radius(u.token), u.offset[1] + radius(u.token)]);
 for (const route of [plan.route, ...plan.serviceRoutes, plan.circulation]) for (const [x, y] of route.points) {xs.push(x - route.width / 2, x + route.width / 2); ys.push(y - route.width / 2, y + route.width / 2);}
 xs.push(-plan.interiorRadius, plan.interiorRadius); ys.push(-plan.interiorRadius, plan.interiorRadius);
 const template: BaseTemplate = {id: plan.version, name: 'Broken Ring (experimental)', description: 'Unequal perimeter segments with an open interior and connected offset rear and forward openings.', sourceMap: plan.version, sourceState: seed, sourceTeam: 1, sourceWorldSize: [16000, 12000], sourceAnchor: [0, 0], unitCount: units.length, footprint: {width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys)}, units};
 return {template, plan};
}
