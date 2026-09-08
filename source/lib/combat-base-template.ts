import type { BaseTemplate } from './wulfram.ts';

// Side/forward coordinates leave a central departure aisle toward the map center.
const positions: Array<[string, number, number]> = [
  ['e', -70, -50], ['r', -95, -155], ['f', 95, -155], ['u', 160, -80],
  ['g', -155, 105], ['g', 155, 105], ['s', -190, -25], ['s', 190, -25],
  ['L', 0, -220], ['p', -180, -160], ['d', 180, -160],
];
export const COMBAT_BASE_TEMPLATE: BaseTemplate = {
  id: 'forge-combat-base-v1', name: 'Forge deployed combat base', curated: true,
  sourceMap: 'Forge Combat Trial', sourceState: 'designed', sourceTeam: 1,
  sourceWorldSize: [5600, 5600], sourceAnchor: [0, 0],
  unitCount: positions.length, footprint: { width: 600, height: 600 },
  units: positions.map(([token, side, forward]) => ({ token,
    offset: [(forward + side) / Math.SQRT2, (forward - side) / Math.SQRT2],
    groundOffset: 0, rotation: [0, 0, Math.PI / 4], active: 1 })),
};
