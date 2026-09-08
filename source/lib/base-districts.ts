import type { StateEntity } from './wulfram.ts';
export const DISTRICTS_KEY = 'forge.districts.v1';
export const DISTRICT_ROLES=['mixed','command','services','power','defense','concealment'] as const;
export interface BaseDistrict { id: string; name: string; entityIds: string[]; locked?: boolean; role?:typeof DISTRICT_ROLES[number]; variation?:'fixed'|'reposition' }
export function readDistricts(raw?: string): BaseDistrict[] {
  if (!raw) return [];
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data) || data.length > 100) throw new Error('Invalid district collection.');
  const ids = new Set<string>();
  for (const d of data) {
    if (!d || typeof d.id !== 'string' || !d.id || ids.has(d.id) || typeof d.name !== 'string' || !d.name.trim() || d.name.length > 120
      || !Array.isArray(d.entityIds) || !d.entityIds.length || d.entityIds.length > 500 || d.entityIds.some((id: unknown) => typeof id !== 'string' || !id)
      || new Set(d.entityIds).size !== d.entityIds.length || (d.locked !== undefined && typeof d.locked !== 'boolean')) throw new Error('Invalid district record.');
    ids.add(d.id);
    if(d.role!==undefined&&!DISTRICT_ROLES.includes(d.role))throw new Error('Invalid district role.');
    if(d.variation!==undefined&&!['fixed','reposition'].includes(d.variation))throw new Error('Invalid district variation permission.');
  }
  return data as BaseDistrict[];
}
/** Whole-group eligibility; shared membership cannot bypass a fixed or locked district. */
export function districtVariationStatus(groups:BaseDistrict[],entities:StateEntity[]){
  readDistricts(JSON.stringify(groups));
  const existing=new Set(entities.filter(e=>e.token!=='*').map(e=>e.id));
  const fixed=new Set(groups.filter(g=>g.locked||g.variation!=='reposition').flatMap(g=>g.entityIds));
  return groups.map(g=>({id:g.id,eligible:!g.locked&&g.variation==='reposition'&&g.entityIds.every(id=>existing.has(id)&&!fixed.has(id)),reason:g.locked?'District is locked.':g.variation!=='reposition'?'Kept fixed by default.':g.entityIds.some(id=>!existing.has(id))?'Contains missing buildings.':g.entityIds.some(id=>fixed.has(id))?'Shares buildings with a fixed or locked district.':'Eligible for a future reposition preview; buildings are unchanged.'}));
}
/** Unchanged orphan records may be retained while another record is repaired or removed. */
export function validateDistrictUpdate(previous: BaseDistrict[], next: BaseDistrict[], entities: StateEntity[]) {
  readDistricts(JSON.stringify(next));
  const available = new Set(entities.filter(e => e.token !== '*').map(e => e.id));
  for (const group of next) {
    const old = previous.find(g => g.id === group.id);
    const unchangedMembership = old && old.entityIds.length === group.entityIds.length && old.entityIds.every(id => group.entityIds.includes(id));
    if (!unchangedMembership && group.entityIds.some(id => !available.has(id))) throw new Error('The new district membership contains missing buildings. Select existing buildings before saving.');
  }
}
export interface DistrictTransform { dx: number; dy: number; degrees: number; duplicate: boolean; mirror?: 'x' | 'y'; arrange?: 'align-x'|'align-y'|'space-x'|'space-y' }
export function transformDistrict(entities: StateEntity[], selection: string[], operation: DistrictTransform, width: number, height: number,
  locked: (entity: StateEntity) => boolean, conform: (entity: StateEntity) => void, newId: () => string) {
  if (![operation.dx,operation.dy,operation.degrees,width,height].every(Number.isFinite) || width <= 0 || height <= 0) throw new Error('Enter finite movement and rotation values.');
  const ids = new Set(selection), chosen = entities.filter(e => ids.has(e.id));
  if (!chosen.length || chosen.length !== ids.size) throw new Error('Selection is empty or contains missing buildings. Select the district again.');
  if (chosen.some(e => e.token === '*')) throw new Error('Metadata records cannot be transformed as buildings.');
  if (operation.mirror !== undefined && operation.mirror !== 'x' && operation.mirror !== 'y') throw new Error('Invalid mirror direction.');
  if ((operation.degrees !== 0 || operation.mirror) && chosen.some(locked)) throw new Error('This selection includes a structure with locked rotation. Remove it before rotating or mirroring the district.');
  const x = chosen.reduce((sum,e) => sum+e.position[0],0)/chosen.length, y = chosen.reduce((sum,e) => sum+e.position[1],0)/chosen.length;
  const targets=new Map<string,number>();
  let arrangementAxis: 0|1=0;
  if(operation.arrange){
    if(!['align-x','align-y','space-x','space-y'].includes(operation.arrange))throw new Error('Invalid alignment action.');
    if(operation.dx||operation.dy||operation.degrees||operation.duplicate||operation.mirror)throw new Error('Alignment must be a separate operation.');
    arrangementAxis=operation.arrange.endsWith('x')?0:1;
    const spacing=operation.arrange.startsWith('space');
    if(chosen.length<(spacing?3:2))throw new Error(spacing?'Select at least three buildings to distribute.':'Select at least two buildings to align.');
    const sorted=[...chosen].sort((a,b)=>a.position[arrangementAxis]-b.position[arrangementAxis]||a.id.localeCompare(b.id));
    const low=sorted[0].position[arrangementAxis],high=sorted[sorted.length-1].position[arrangementAxis];
    if(spacing&&high-low<1e-8)throw new Error('Spread the end buildings apart before distributing.');
    sorted.forEach((e,i)=>targets.set(e.id,spacing?low+(high-low)*i/(sorted.length-1):(arrangementAxis===0?x:y)));
    if(chosen.every(e=>Math.abs(e.position[arrangementAxis]-targets.get(e.id)!)<1e-8))throw new Error('Buildings already have this alignment or spacing. Nothing changed.');
  }
  const angle = operation.degrees*Math.PI/180, c = Math.cos(angle), s = Math.sin(angle), used = new Set(entities.map(e => e.id));
  const moved = chosen.map(source => {
    const e = structuredClone(source);
    let dx = e.position[0]-x, dy = e.position[1]-y;
    if (operation.mirror === 'x') { dx = -dx; e.rotation[2] = Math.PI-e.rotation[2]; }
    if (operation.mirror === 'y') { dy = -dy; e.rotation[2] = -e.rotation[2]; }
    e.position[0] = x+dx*c-dy*s+operation.dx; e.position[1] = y+dx*s+dy*c+operation.dy;
    if(operation.arrange)e.position[arrangementAxis]=targets.get(e.id)!;
    if (e.position[0]<0 || e.position[0]>width || e.position[1]<0 || e.position[1]>height) throw new Error('The district would leave the map. Reduce movement or rotation.');
    if (operation.degrees !== 0) e.rotation[2] += angle;
    if (operation.duplicate) { e.id = newId(); if (!e.id || used.has(e.id)) throw new Error('Duplicate building ID. Nothing was applied.'); used.add(e.id); }
    conform(e);
    if (![...e.position,...e.rotation].every(Number.isFinite)) throw new Error('Terrain fitting produced an invalid transform.');
    return e;
  });
  const replacements = new Map(moved.map(e => [e.id,e]));
  return { entities: operation.duplicate ? [...entities,...moved] : entities.map(e => replacements.get(e.id) ?? e), selectedIds: moved.map(e => e.id) };
}
