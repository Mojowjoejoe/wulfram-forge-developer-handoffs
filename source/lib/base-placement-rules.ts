import { analyzeRotationalEntityPairs } from './balanced-map-analysis.ts';
import { instantiatePairedTemplate } from './paired-template.ts';
import { CATALOG, hasModelForEntity, sampleSlopeDegrees, structureTerrainClearance, validateProject,
  type AssetManifest, type BaseTemplate, type StateEntity, type WulframProject } from './wulfram.ts';

/** Bounded deterministic search. Never changes the source, terrain, anchors or scale. */
export function placeBaseWithRules(project: WulframProject, template: BaseTemplate,
  anchors: [[number, number], [number, number]], diameter: number, yaw: number,
  manifest: AssetManifest | undefined, random: () => number) {
  const variant = structuredClone(template);
  const added: string[] = [];
  for (const [token, offset] of [['e', [0, 0]], ['r', [-110, 0]], ['u', [0, -110]]] as const) {
    if (!variant.units.some(unit => unit.token === token && unit.active !== 0)) {
      variant.units.push({ token, offset: [...offset], groundOffset: 3, rotation: [0, 0, 0], active: 1 });
      added.push(token === 'e' ? 'power cell' : token === 'r' ? 'deployed repair pad' : 'uplink');
    }
  }
  const failure = (message: string) => ({ template: variant, passed: false, message, added, attempts: trials });
  let trials = 0;
  const validation = project.validation;
  if (![validation.serviceRadius, validation.backupRadius, validation.maxSlopeDegrees, validation.minSpacing].every(Number.isFinite)
    || validation.serviceRadius <= 10 || validation.backupRadius < 10 || validation.maxSlopeDegrees < 0 || validation.maxSlopeDegrees >= 90 || validation.minSpacing < 0) {
    return failure('Invalid power, spacing or slope rules. Correct placement settings first.');
  }
  if (!variant.units.length || variant.units.length > 100) return failure('Template must contain 1–100 structures after adding essentials.');
  if (variant.units.some(unit => ![...unit.offset, ...unit.rotation, unit.groundOffset, unit.active].every(Number.isFinite))) return failure('Template contains invalid coordinates or rotations.');
  if (variant.units.some(unit => Math.hypot(...unit.offset) > diameter / 2)) return failure('Template exceeds the requested diameter. Increase diameter or choose a smaller template.');
  if (manifest && variant.units.some(unit => [1, 2].some(team => !hasModelForEntity({ ...unit, team }, manifest)))) return failure('Template requires models unavailable for one or both teams.');
  if (project.entities.some(entity => entity.team !== 1 && entity.team !== 2 && entity.token === '*')) return failure('An opaque decoration cannot be footprint-checked.');
  const priority = (token: string) => token === 'e' ? 0 : token === 'r' ? 1 : token === 'u' ? 2 : 3;
  variant.units.sort((a, b) => priority(a.token) - priority(b.token));
  const neutral = project.entities.filter(entity => entity.team !== 1 && entity.team !== 2);
  if (neutral.some(entity => ![...entity.position, ...entity.rotation].every(Number.isFinite))) return failure('A retained neutral entity has invalid coordinates.');
  let idPrefix = 'rule';
  while (neutral.some(entity => entity.id.startsWith(`${idPrefix}-`))) idPrefix += '-candidate';
  const radius = (entity: StateEntity) => {
    const item = CATALOG.find(item => item.token === entity.token && (entity.token !== 'c' || item.subtype === entity.subtype));
    return structureTerrainClearance(entity, manifest, item?.footprint ?? project.validation.minSpacing, 0).footprint / Math.SQRT2;
  };
  let lastReason = 'No legal paired placement found.';
  // Preserve the original attempts (and successful seed layouts). If they fail,
  // add a bounded power-aware fallback instead of widening any legality rule.
  for (let restart = 0; restart < 6; restart += 1) {
    const accepted: StateEntity[] = [...neutral];
    const units = structuredClone(variant.units);
    let complete = true;
    for (let index = 0; index < units.length; index += 1) {
      const unit = units[index]; const preferred = [...unit.offset];
      const phase = random() * Math.PI * 2;
      let placed = false;
      for (let trial = 0; trial < 64; trial += 1) {
        trials += 1;
        const angle = phase + trial * 2.399963229728653;
        const displacement = trial === 0 && restart === 0 ? 0 : 20 + Math.sqrt(trial / 63) * Math.min(250, diameter / 2);
        unit.offset = [preferred[0] + Math.cos(angle) * displacement, preferred[1] + Math.sin(angle) * displacement];
        if (restart >= 3 && trial >= 16 && CATALOG.some(item => item.token === unit.token && item.requiresPower)) {
          const powers = units.slice(0, index).filter(item => item.token === 'e' && item.active !== 0);
          if (powers.length) {
            const power = powers[(trial - 16) % powers.length];
            const distance = Math.sqrt((trial - 15) / 48) * Math.max(1, validation.serviceRadius - 20);
            unit.offset = [power.offset[0] + Math.cos(angle) * distance, power.offset[1] + Math.sin(angle) * distance];
          }
        }
        const pair = anchors.flatMap((anchor, teamIndex) => instantiatePairedTemplate({ ...variant, units: [unit], unitCount: 1 }, project.terrain,
          anchor, teamIndex + 1, 1, yaw + teamIndex * Math.PI, manifest, undefined, () => `${idPrefix}-${teamIndex}-${index}`).entities);
        if (pair.length !== 2) { lastReason = 'Missing team model.'; continue; }
        let legal = true;
        for (let teamIndex = 0; teamIndex < 2 && legal; teamIndex += 1) {
          const entity = pair[teamIndex]; const [x, y] = entity.position; const r = radius(entity);
          const anchor = anchors[teamIndex];
          const limit = project.terrain;
          if (Math.hypot(x - anchor[0], y - anchor[1]) + r > diameter / 2
            || x < r || y < r || x + r > limit.worldWidth || y + r > limit.worldHeight) {
            legal = false; lastReason = 'Footprint exceeds base diameter or map bounds.'; break;
          }
          if ([...accepted, pair[1 - teamIndex]].some(other => Math.hypot(x - other.position[0], y - other.position[1]) < r + radius(other) + project.validation.minSpacing)) {
            legal = false; lastReason = 'Model footprints overlap or lack a safety gap.'; break;
          }
          // Reserve an 80-unit-wide forward exit outside the essential core.
          const dx = limit.worldWidth / 2 - anchor[0], dy = limit.worldHeight / 2 - anchor[1];
          const length = Math.hypot(dx, dy); const along = ((x - anchor[0]) * dx + (y - anchor[1]) * dy) / length;
          const cross = Math.abs((x - anchor[0]) * dy - (y - anchor[1]) * dx) / length;
          if (along + r > 120 && along - r < diameter / 2 && cross < 40 + r) {
            legal = false; lastReason = 'Structure blocks the reserved base exit.'; break;
          }
          // Sample the enclosing footprint (not just its center) at <= half-grid intervals.
          const step = Math.max(1, Math.min(limit.worldWidth / (limit.width - 1), limit.worldHeight / (limit.height - 1)) / 2);
          const count = Math.max(2, Math.ceil(r * 2 / step));
          for (let sy = 0; sy <= count && legal; sy += 1) for (let sx = 0; sx <= count; sx += 1) {
            if (sampleSlopeDegrees(limit, x - r + 2 * r * sx / count, y - r + 2 * r * sy / count) > project.validation.maxSlopeDegrees) {
              legal = false; lastReason = 'Terrain under the structure footprint is too steep.'; break;
            }
          }
        }
        if (!legal) continue;
        const partial = { ...project, entities: [...accepted, ...pair] };
        const errors = validateProject(partial).filter(issue => issue.severity === 'error' && !issue.code.startsWith('state-'));
        if (errors.length) { lastReason = errors[0].message; continue; }
        if (!analyzeRotationalEntityPairs({ ...project, entities: pair }, manifest).passed) { lastReason = 'Terrain-conformed team pair does not match.'; continue; }
        accepted.push(...pair); placed = true; break;
      }
      if (!placed) { complete = false; lastReason = `${unit.token} pair: ${lastReason}`; break; }
    }
    if (complete) return { template: { ...variant, units, unitCount: units.length }, passed: true, added, attempts: trials,
      message: `Placement rules passed after ${trials} paired trials.${added.length ? ` Added essentials: ${added.join(', ')}.` : ''}` };
  }
  return failure(`Could not fit a legal base after ${trials} bounded paired trials. ${lastReason} Increase diameter, reduce spacing, or choose a smaller template. Current map is unchanged.`);
}
