import type { TerrainData } from './wulfram.ts';

export interface TerrainSelection { x: number; y: number; width: number; height: number }
type Grid = Pick<TerrainData, 'width' | 'height' | 'worldWidth' | 'worldHeight'>;

export function terrainSelectionError(selection: TerrainSelection, terrain: Grid): string | undefined {
  if (![selection.x, selection.y, selection.width, selection.height].every(Number.isFinite)
    || selection.x < 0 || selection.y < 0 || selection.width <= 0 || selection.height <= 0)
    return 'Selection needs finite coordinates and positive dimensions.';
  if (selection.x + selection.width > terrain.worldWidth || selection.y + selection.height > terrain.worldHeight)
    return 'Selection extends outside this map. Resize it or clear the selection before brushing.';
}

/** Require the complete interpolation/paint support inside the rectangle. */
export function terrainSelectionContainsVertex(selection: TerrainSelection | undefined, terrain: Grid, x: number, y: number): boolean {
  if (!selection) return true;
  if (terrainSelectionError(selection, terrain) || terrain.width < 2 || terrain.height < 2) return false;
  const sx = terrain.worldWidth / (terrain.width - 1), sy = terrain.worldHeight / (terrain.height - 1);
  return Math.max(0, x - 1) * sx >= selection.x
    && Math.min(terrain.width - 1, x + 1) * sx <= selection.x + selection.width
    && Math.max(0, y - 1) * sy >= selection.y
    && Math.min(terrain.height - 1, y + 1) * sy <= selection.y + selection.height;
}

export function terrainSelectionFromPoints(start:readonly [number,number],end:readonly [number,number],terrain:Grid):TerrainSelection|undefined {
 if(![...start,...end,terrain.worldWidth,terrain.worldHeight].every(Number.isFinite)||terrain.worldWidth<=0||terrain.worldHeight<=0)return undefined;
 const x0=Math.max(0,Math.min(terrain.worldWidth,start[0])),x1=Math.max(0,Math.min(terrain.worldWidth,end[0]));
 const y0=Math.max(0,Math.min(terrain.worldHeight,start[1])),y1=Math.max(0,Math.min(terrain.worldHeight,end[1]));
 if(Math.abs(x1-x0)<1||Math.abs(y1-y0)<1)return undefined;
 return {x:Math.min(x0,x1),y:Math.min(y0,y1),width:Math.abs(x1-x0),height:Math.abs(y1-y0)};
}
