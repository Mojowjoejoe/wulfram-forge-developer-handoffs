import { structureTerrainClearance, type AssetManifest, type BaseTemplate, type BaseTemplateUnit } from './wulfram.ts';

export const CREATIVE_BASE_LAYOUTS = [
  { id: 'starter', name: 'Starter Hideaway', description: 'One compact service yard with a few defenders.' },
  { id: 'caravan', name: 'Caravan Depot', description: 'Two offset service yards along a diagonal supply route.' },
  { id: 'crescent', name: 'Crescent Defense', description: 'Three unequal positions wrapping an open approach.' },
  { id: 'spine', name: 'Longfront', description: 'Four staggered positions spread across a broad defensive front.' },
  { id: 'capital', name: 'Capital Compound', description: 'Five distinct command, logistics and defense areas around an open interior.' },
  { id: 'relay', name: 'Relay Watch', description: 'A small rear supply post with a detached forward watch station.' },
  { id: 'gatehouse', name: 'Split Gatehouse', description: 'Two defensive shoulders flanking a wide central entrance, with logistics behind.' },
  { id: 'trident', name: 'Trident Reach', description: 'Three separated forward prongs supplied by a rear command yard.' },
  { id: 'harbor', name: 'Sheltered Harbor', description: 'A bent chain of service and defense yards around a sheltered vehicle court.' },
  { id: 'archipelago', name: 'Fortress Archipelago', description: 'Six scattered positions with two supply hubs and staggered outer defenses.' },
  { id: 'workshop', name: 'Roadside Workshop', description: 'A compact repair and refuel yard with close gun protection and minimal infrastructure.' },
  { id: 'crossfire', name: 'Crossfire Posts', description: 'Two offset gun-heavy positions, with rear services supporting a detached forward post.' },
  { id: 'switchback', name: 'Switchback Supply', description: 'Three yards stepping diagonally forward, with two supply stops and a missile outpost.' },
  { id: 'anvil', name: 'Iron Anvil', description: 'A rear command yard supports broad flak-heavy shoulders and two close-range forward positions.' },
  { id: 'necklace', name: 'Citadel Necklace', description: 'Seven perimeter yards surround a broad open interior, with supply centers at opposite rear corners.' },
];

export type CreativeSize = 'small' | 'standard' | 'large' | 'massive';
export function creativeBaseTemplate(style: string, seed: string, manifest: AssetManifest, size?: CreativeSize): BaseTemplate {
  let state = 2166136261;
  for (const c of seed) state = Math.imul(state ^ c.charCodeAt(0), 16777619) >>> 0;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const spec = CREATIVE_BASE_LAYOUTS.find(s => s.id === style);
  if (!spec) throw new Error('Unknown creative formation.');
  const centers: Record<string, number[][]> = {
    starter: [[0, 0]], caravan: [[-380, -250], [380, 250]],
    crescent: [[-500, 0], [200, -700], [200, 700]],
    spine: [[-250, -1100], [150, -370], [-150, 370], [250, 1100]],
    capital: [[-750, 0], [-250, -850], [-250, 850], [650, -450], [650, 450]],
    relay: [[-400, -120], [380, 160]],
    gatehouse: [[-600, 0], [180, -450], [180, 450]],
    trident: [[-650, 0], [250, -900], [650, 0], [250, 900]],
    harbor: [[-650, -500], [-650, 500], [150, 1000], [650, 300]],
    archipelago: [[-1000, -650], [-950, 650], [-100, -1150], [50, 150], [750, -650], [900, 850]],
    workshop: [[0, 0]], crossfire: [[-420, 350], [420, -350]],
    switchback: [[-700, -650], [0, 0], [700, 650]],
    anvil: [[-850, 0], [-100, -1050], [-100, 1050], [650, -400], [650, 400]],
    necklace: [[-1100, -700], [-1100, 700], [-300, -1300], [-300, 1300], [650, -1000], [650, 1000], [1100, 0]],
  };
  const units: BaseTemplateUnit[] = [];
  const radii = new Map<string, number>();
  const radius = (token: string) => {
    if (!radii.has(token)) radii.set(token, Math.max(...[1, 2].map(team => structureTerrainClearance({ token, team }, manifest, 0, 0).footprint / Math.SQRT2)));
    return radii.get(token)!;
  };
  const add = (token: string, x: number, y: number, yaw = 0) => units.push({ token, offset: [x, y], rotation: [0, 0, yaw], active: 1, groundOffset: 0 });
  let sites = centers[style];
  if (size === 'small') sites = sites.slice(0, Math.min(2, sites.length));
  if (size === 'standard') sites = sites.slice(0, Math.max(1, Math.ceil(sites.length * 0.65)));
  const meanX = size ? sites.reduce((sum, p) => sum + p[0], 0) / sites.length : 0;
  const meanY = size ? sites.reduce((sum, p) => sum + p[1], 0) / sites.length : 0;
  sites.forEach(([baseX, baseY], index) => {
    baseX -= meanX; baseY -= meanY;
    const cx = baseX + (random() - 0.5) * 70, cy = baseY + (random() - 0.5) * 70;
    add('e', cx - 20, cy); add('e', cx + 20, cy);
    // Different roles and budgets per site; neither the unit count nor arrangement is a repeated module.
    const service = index === 0 || (['capital', 'harbor', 'archipelago', 'switchback', 'necklace'].includes(style) && index === 1) || style === 'caravan';
    const tokens = service ? ['u', 'r', 'f', 'g', 's'] : style === 'relay' ? ['g', 's'] : ['g', 'g', 's', 'L'];
    if (style === 'workshop') tokens.splice(4, 1, 'g');
    if (style === 'crossfire' && !service) tokens.splice(0, tokens.length, 'g', 'g', 'g', 's');
    if (style === 'anvil' && (index === 1 || index === 2)) tokens.splice(0, tokens.length, 'g', 's', 's', 's');
    if (random() > 0.4) tokens.push(service ? 'd' : 's');
    if (!['starter', 'relay', 'workshop'].includes(style)) {
      const extras = (size === 'massive' ? 3 : 1) + Math.floor(random() * (style === 'capital' ? 5 : 3));
      for (let n = 0; n < extras; n++) tokens.push(['g', 's', 'L'][Math.floor(random() * 3)]);
      if (service && random() > 0.5) tokens.push('p');
    }
    for (const token of tokens) {
      let placed = false;
      for (let attempt = 0; attempt < 400; attempt++) {
        // Logistics favor the rear, guns the front. Occasional wraparound sites break the arc.
        const rear = ['u', 'r', 'f'].includes(token);
        const angle = (rear ? Math.PI : 0) + (random() - 0.5) * (attempt < 180 ? Math.PI : 2 * Math.PI);
        const distance = 95 + random() * 145;
        const x = cx + Math.cos(angle) * distance, y = cy + Math.sin(angle) * distance;
        if (units.some(u => Math.hypot(x - u.offset[0], y - u.offset[1]) < radius(token) + radius(u.token) + 14)) continue;
        add(token, x, y, angle); placed = true; break;
      }
      if (!placed) throw new Error('Could not find enough structure clearance for this seed.');
    }
  });
  return { id: `creative-${style}`, name: spec.name, description: spec.description, sourceMap: 'Creative formations', sourceState: seed, sourceTeam: 1, sourceWorldSize: [8000, 8000], sourceAnchor: [0, 0], unitCount: units.length, footprint: { width: Math.max(...units.map(u => u.offset[0])) - Math.min(...units.map(u => u.offset[0])) + 100, height: Math.max(...units.map(u => u.offset[1])) - Math.min(...units.map(u => u.offset[1])) + 100 }, units };
}
