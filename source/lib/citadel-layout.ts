// Local [forward, side] entrance route; mirrored for the other gate and team.
export const CITADEL_ENTRANCE: Array<[number, number]> = [
  [0,0], [0,620], [300,980], [900,980], [1250,620], [1400,0],
];
export function segmentDistance(x: number,y: number,a: number[],b: number[]) {
  const dx=b[0]-a[0],dy=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));
  return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);
}
