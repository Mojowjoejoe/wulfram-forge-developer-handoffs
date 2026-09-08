import { readFormationFavorites, type FormationFavorite } from './formation-favorites.ts';
export const BASE_LIBRARY_FORMAT = 'wulfram-base-library';
export const BASE_LIBRARY_VERSION = 1;
export function validatePersonalBases(value: unknown): FormationFavorite[] {
  const bases = readFormationFavorites(JSON.stringify(value));
  const ids = new Set<string>();
  for (const b of bases) {
    if (!b.id.trim() || b.id.length > 160 || ids.has(b.id)) throw new Error('Saved bases need unique, nonempty IDs.');
    ids.add(b.id);
    if (!b.name.trim() || b.name.length > 120) throw new Error('Base names must contain 1–120 characters.');
    if (b.radius < 1 || b.radius > 4000) throw new Error('Saved base radius must be between 1 and 4,000 world units.');
    const t = b.template;
    if(b.kind==='district'&&t?.id!==b.id)throw new Error('District module and template IDs must match.');
    if (!t || typeof t.id !== 'string' || typeof t.name !== 'string' || typeof t.sourceMap !== 'string' || typeof t.sourceState !== 'string'
      || ![0,1,2].includes(t.sourceTeam) || !Array.isArray(t.sourceWorldSize) || t.sourceWorldSize.length !== 2 || !t.sourceWorldSize.every(Number.isFinite)
      || !Array.isArray(t.sourceAnchor) || t.sourceAnchor.length !== 2 || !t.sourceAnchor.every(Number.isFinite)
      || !Number.isFinite(t.footprint?.width) || !Number.isFinite(t.footprint?.height) || t.footprint.width <= 0 || t.footprint.height <= 0
      || t.unitCount !== t.units.length) throw new Error('Saved base template metadata is incomplete or invalid.');
    for (const u of t.units) {
      if (u.offset.some(n => Math.abs(n) > 1000000) || !Number.isFinite(u.groundOffset) || !Number.isFinite(u.active)) throw new Error('Saved base contains invalid structure data.');
    }
  }
  return structuredClone(bases);
}
export function parsePortableBases(raw: string): FormationFavorite[] {
  if (raw.length > 2_000_000) throw new Error('Base library exceeds the 2 MB limit.');
  const value: unknown = JSON.parse(raw);
  if (Array.isArray(value)) return validatePersonalBases(value); // Legacy local favorites export.
  if (!value || typeof value !== 'object') throw new Error('This is not a base library.');
  const doc = value as { format?: unknown; version?: unknown; bases?: unknown };
  if (doc.format !== BASE_LIBRARY_FORMAT || (doc.version !== BASE_LIBRARY_VERSION && doc.version !== 2 && doc.version !== 3 && doc.version !== 4 && doc.version !== 5 && doc.version !== 6 && doc.version !== 7)) throw new Error('Unsupported base library format or version.');
  const bases = validatePersonalBases(doc.bases);
  if(doc.version===1 && bases.some(b=>b.kind==='district'))throw new Error('District modules require library version 2.');
  if(doc.version!==3&&doc.version!==4&&doc.version!==5&&doc.version!==6&&doc.version!==7&&bases.some(b=>b.reservations))throw new Error('Reserved expansion areas require library version 3 or later.');
  if(doc.version!==4&&doc.version!==5&&doc.version!==6&&doc.version!==7&&bases.some(b=>b.reservations?.entranceRouting))throw new Error('Entrance routing requires library version 4.');
  if(doc.version!==5&&doc.version!==6&&doc.version!==7&&bases.some(b=>b.reservations?.version===4))throw new Error('Courtyard reservations require library version 5.');
  if(doc.version!==6&&doc.version!==7&&bases.some(b=>b.reservations?.version===5))throw new Error('Broken Ring reservations require library version 6.');
  if(doc.version!==7&&bases.some(b=>b.valleyRecipe))throw new Error('Valley Pockets requires library version 7.');
  return bases;
}
export function exportPortableBases(bases: FormationFavorite[]): string {
  return JSON.stringify({ format: BASE_LIBRARY_FORMAT, version: bases.some(b=>b.valleyRecipe)?7:bases.some(b=>b.reservations?.version===5)?6:bases.some(b=>b.reservations?.version===4)?5:bases.some(b=>b.reservations?.entranceRouting)?4:bases.some(b=>b.reservations)?3:bases.some(b=>b.kind==='district')?2:BASE_LIBRARY_VERSION, bases: validatePersonalBases(bases) }, null, 2);
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([key,v]) => [key,canonical(v)]));
  return value;
}
const fingerprint = (b: FormationFavorite) => {
  // Only storage IDs may change during conflict resolution. Preserve provenance
  // and extension metadata when deciding whether an entry is truly identical.
  const data = structuredClone(b) as Partial<FormationFavorite>;
  delete data.id;
  const template = data.template as Partial<FormationFavorite['template']>;
  delete template.id;
  return JSON.stringify(canonical(data));
};
export function mergePersonalBases(current: FormationFavorite[], incoming: FormationFavorite[]) {
  const merged = validatePersonalBases(current);
  const seen = new Set(merged.map(fingerprint));
  const ids = new Set(merged.map(b => b.id));
  let added = 0, skipped = 0, conflicts = 0;
  for (const source of validatePersonalBases(incoming)) {
    const signature = fingerprint(source);
    if (seen.has(signature)) { skipped++; continue; }
    const b = structuredClone(source);
    if (ids.has(b.id)) {
      conflicts++; let suffix = 2;
      while (ids.has(`${source.id.slice(0,140)}-import-${suffix}`)) suffix++;
      b.id = `${source.id.slice(0,140)}-import-${suffix}`; b.template.id = b.id;
    }
    merged.push(b); seen.add(signature); ids.add(b.id); added++;
  }
  if (merged.length > 50) throw new Error('This import would exceed 50 saved bases. Nothing has changed; remove entries or import a smaller library.');
  return { bases: merged, added, skipped, conflicts };
}
