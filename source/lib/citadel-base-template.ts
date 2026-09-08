import type { BaseTemplate } from './wulfram.ts';

// Three separated power districts: rear services and two forward defensive wings.
// Coordinates are side/forward relative to the southwest team's center approach.
const positions: Array<[string, number, number]> = [];
for (const side of [-390, 390]) {
  positions.push(['e', side, 220], ['e', side + 40, 220],
    ['g', side - 100, 390], ['g', side + 100, 390],
    ['s', side - 140, 190], ['s', side + 140, 190],
    ['g', side, 100], ['L', side, 420]);
}
positions.push(['e', 0, -470], ['e', 40, -470],
  ['r', -150, -430], ['f', 150, -430], ['L', 0, -620],
  ['s', -170, -570], ['s', 170, -570], ['u', -120, -680],
  ['p', -280, -400], ['d', 280, -400], ['u', 120, -680]);
export const CITADEL_BASE_TEMPLATE: BaseTemplate = {
  id: 'canyon-citadel-fortified-v1', name: 'Canyon Citadel fortified districts', curated: true,
  sourceMap: 'Canyon Citadel', sourceState: 'authored', sourceTeam: 1,
  sourceWorldSize: [6400, 6400], sourceAnchor: [0, 0], unitCount: positions.length,
  footprint: { width: 1600, height: 1600 },
  units: positions.map(([token,side,forward]) => ({ token,
    offset: [(forward+side)/Math.SQRT2,(forward-side)/Math.SQRT2],
    groundOffset: 0, rotation: [0,0,Math.PI/4], active: 1 })),
};
