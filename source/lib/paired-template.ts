import { CATALOG, hasModelForEntity, instantiateBaseTemplate, snapStructureToTerrain, structureTerrainClearance, usesFootprintTerrainSnap } from './wulfram.ts';

/** Preserve source-model bottom clearance when generating the opposite team's art.
 * Legacy groundOffset is an origin height, not a team-independent bottom height.
 * This only affects generated paired bases; imported/manual templates stay intact.
 */
export function instantiatePairedTemplate(...args: Parameters<typeof instantiateBaseTemplate>) {
  const [template, terrain, anchor, team, scale, yaw, manifest, margin, idFactory] = args;
  const normalized = { ...template, units: template.units.map(unit => {
    if (!manifest || !usesFootprintTerrainSnap(unit.token)) return unit;
    const source = structureTerrainClearance({ token: unit.token, team: template.sourceTeam }, manifest, 0, 0);
    const target = structureTerrainClearance({ token: unit.token, team }, manifest, 0, 0);
    if (!source.modelName || !target.modelName) return unit;
    return { ...unit, groundOffset: Math.max(0, unit.groundOffset - source.modelBottom) + target.modelBottom };
  }) };
  return instantiateBaseTemplate(normalized, terrain, anchor, team, scale, yaw, manifest, margin, idFactory);
}

/** Opt-in v2 policy: both team models sample the same conservative footprint.
 * Their origin offsets remain distinct. Existing paired recipes keep v1 behavior.
 */
export function instantiateSymmetricPairedTemplate(...args: Parameters<typeof instantiateBaseTemplate>) {
  const [template,terrain,,team,,,,margin]=args,manifest=args[6];
  const result=instantiatePairedTemplate(...args);
  if(!manifest)return result;
  const units=template.units.filter(u=>hasModelForEntity({...u,team},manifest));
  result.entities.forEach((entity,index)=>{
    if(!usesFootprintTerrainSnap(entity.token))return;
    const unit=units[index],item=CATALOG.find(c=>c.token===unit.token&&(unit.token!=='c'||c.subtype===unit.subtype));
    const requested=(item?.footprint??10)*result.scale;
    const source=structureTerrainClearance({token:unit.token,team:template.sourceTeam},manifest,requested,0,margin);
    const first=structureTerrainClearance({token:unit.token,team:1},manifest,requested,0,margin);
    const second=structureTerrainClearance({token:unit.token,team:2},manifest,requested,0,margin);
    const target=structureTerrainClearance(entity,manifest,requested,0,margin);
    if(!source.modelName||!first.modelName||!second.modelName||!target.modelName)return;
    const offset=Math.max(0,(Number.isFinite(unit.groundOffset)?unit.groundOffset:0)-source.modelBottom)+target.modelBottom;
    const snap=snapStructureToTerrain(terrain,entity.position[0],entity.position[1],Math.max(first.footprint,second.footprint),entity.rotation[2],offset,target.margin);
    entity.position[2]=snap.height;entity.rotation[0]=snap.pitch;entity.rotation[1]=snap.roll;
  });
  return result;
}
