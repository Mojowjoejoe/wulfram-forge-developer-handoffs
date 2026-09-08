import { catalogFor, type StateEntity } from './wulfram.ts';

export function powerCoverage(entity: StateEntity, entities: StateEntity[], radius: number): 'powered' | 'unpowered' | 'independent' {
  if (!catalogFor(entity)?.requiresPower) return 'independent';
  // Match the editor validator's center-distance test and ten-unit margin.
  return entities.some(cell => cell.token === 'e' && cell.team === entity.team
    && Math.hypot(cell.position[0] - entity.position[0], cell.position[1] - entity.position[1]) <= Math.max(0, radius - 10)) ? 'powered' : 'unpowered';
}
