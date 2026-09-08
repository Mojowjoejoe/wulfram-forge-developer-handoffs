import {terrainBrushWeight,terrainBrushMix,type TerrainBrushShape,type TerrainBrushFalloff} from './terrain-brush.ts';
import {terrainSelectionContainsVertex,terrainSelectionError,type TerrainSelection} from './terrain-selection.ts';
import {shouldPaintTextureVertex} from './terrain-blend.ts';
import {paintTerrainTextureVertex} from './terrain-textures.ts';
import {pinTerrainEdgeHeights} from './terrain-edge.ts';
import {ensureTextureTag,sampleHeight,type AssetManifest,type WulframProject} from './wulfram.ts';
import {assertEditorConstraints} from './editor-constraints.ts';

export interface ManualTerrainBrush {
 profile:'editor-v1';tool:'sculpt'|'lower'|'level'|'stamp'|'smooth'|'paint';
 x:number;y:number;radius:number;strength:number;shape:TerrainBrushShape;falloff:TerrainBrushFalloff;
 targetHeight?:number;texture?:string;selection?:TerrainSelection;
}

/** One GUI brush sample; repeated samples form a GUI stroke. Source is never mutated. */
export function applyManualTerrainBrush(current:WulframProject,brush:ManualTerrainBrush,manifest:AssetManifest){
 if(!brush||typeof brush!=='object'||Array.isArray(brush)||Object.keys(brush).some(k=>!['profile','tool','x','y','radius','strength','shape','falloff','targetHeight','texture','selection'].includes(k)))throw new Error('Invalid editor brush settings.');
 if(brush.profile!=='editor-v1'||!['sculpt','lower','level','stamp','smooth','paint'].includes(brush.tool)||!['round','square','diamond'].includes(brush.shape)||!['soft','linear','hard'].includes(brush.falloff))throw new Error('Choose a supported editor brush, shape and falloff.');
 if(![brush.x,brush.y,brush.radius,brush.strength].every(Number.isFinite)||brush.x<0||brush.y<0||brush.x>current.terrain.worldWidth||brush.y>current.terrain.worldHeight||brush.radius<25||brush.radius>600||brush.strength<1||brush.strength>100)throw new Error('Editor brush coordinates, radius (25-600) or strength (1-100) are outside their limits.');
 if(brush.targetHeight!==undefined&&(!Number.isFinite(brush.targetHeight)||Math.abs(brush.targetHeight)>100000))throw new Error('Target height must be finite and within the supported height range.');
 if(brush.tool==='stamp'&&(brush.targetHeight===undefined||Math.abs(brush.targetHeight)>5000))throw new Error('Set height needs a target from -5000 to 5000.');
 if(brush.tool==='paint'&&(!brush.texture||!manifest.terrainTextures[brush.texture]))throw new Error('Choose an original terrain texture.');
 if(brush.selection){
   if(typeof brush.selection!=='object'||Object.keys(brush.selection).some(k=>!['x','y','width','height'].includes(k)))throw new Error('Invalid brush selection.');
   const error=terrainSelectionError(brush.selection,current.terrain);if(error)throw new Error(error);
 }else if(brush.selection!==undefined)throw new Error('Invalid brush selection.');
      const painting = brush.tool === 'paint';
      const terrain = {
        ...current.terrain,
        heights: painting ? current.terrain.heights : [...current.terrain.heights],
        textureIds: painting ? [...current.terrain.textureIds] : current.terrain.textureIds,
        tagmap: painting ? [...current.terrain.tagmap] : current.terrain.tagmap,
        tagmap2: painting ? [...current.terrain.tagmap2] : current.terrain.tagmap2,
      };
      const sourceHeights = brush.tool === 'smooth' ? current.terrain.heights : terrain.heights;
      const cellX = terrain.worldWidth / Math.max(1, terrain.width - 1);
      const cellY = terrain.worldHeight / Math.max(1, terrain.height - 1);
      const minX = Math.max(0, Math.floor((brush.x - brush.radius) / cellX));
      const maxX = Math.min(terrain.width - 1, Math.ceil((brush.x + brush.radius) / cellX));
      const minY = Math.max(0, Math.floor((brush.y - brush.radius) / cellY));
      const maxY = Math.min(terrain.height - 1, Math.ceil((brush.y + brush.radius) / cellY));
      let textureId: number | undefined;
      let textureTags: Map<string, number> | undefined;
      for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          const px = x / (terrain.width - 1) * terrain.worldWidth;
          const py = y / (terrain.height - 1) * terrain.worldHeight;
          const falloff = terrainBrushWeight(
            px - brush.x,
            py - brush.y,
            brush.radius,
            brush.shape,
            brush.falloff,
          );
          if (falloff <= 0 || !terrainSelectionContainsVertex(brush.selection, terrain, x, y)) continue;
          const index = y * terrain.width + x;
          // A selected brush preserves the existing outer ring, including imported nonzero edges.
          if (brush.selection && !painting && (x === 0 || y === 0 || x === terrain.width - 1 || y === terrain.height - 1)) continue;
          if (brush.tool === 'paint') {
            if (textureId === undefined) {
              textureId = ensureTextureTag(terrain, brush.texture!);
              textureTags = new Map(terrain.tagmap2.map((tag, id) => [tag.trim(), id]));
            }
            if (shouldPaintTextureVertex(x, y, textureId, falloff, brush.strength)) {
              paintTerrainTextureVertex(terrain, x, y, brush.texture!, textureTags);
            }
          } else if (brush.tool === 'sculpt' || brush.tool === 'lower') {
            const direction = brush.tool === 'lower' ? -1 : 1;
            terrain.heights[index] += direction * brush.strength / 100 * 7 * falloff;
          } else if (brush.tool === 'level') {
            const mix = terrainBrushMix(brush.strength, falloff, brush.falloff === 'hard' ? 1 : 0.34);
            terrain.heights[index] += ((brush.targetHeight ?? sampleHeight(current.terrain,brush.x,brush.y)) - terrain.heights[index]) * mix;
          } else if (brush.tool === 'stamp') {
            const mix = terrainBrushMix(brush.strength, falloff);
            terrain.heights[index] += (brush.targetHeight! - terrain.heights[index]) * mix;
          } else if (brush.tool === 'smooth') {
            let total = 0;
            let count = 0;
            for (let oy = -1; oy <= 1; oy += 1) {
              for (let ox = -1; ox <= 1; ox += 1) {
                const sx = Math.max(0, Math.min(terrain.width - 1, x + ox));
                const sy = Math.max(0, Math.min(terrain.height - 1, y + oy));
                total += sourceHeights[sy * terrain.width + sx];
                count += 1;
              }
            }
            const mix = terrainBrushMix(brush.strength, falloff, 0.3);
            terrain.heights[index] += (total / count - terrain.heights[index]) * mix;
          }
        }
      }
      if (!painting) {
        if (!brush.selection) pinTerrainEdgeHeights(terrain.heights, terrain.width, terrain.height);
      }
      if (terrain.heights.every((h, i) => h === current.terrain.heights[i]) && terrain.textureIds.every((id, i) => id === current.terrain.textureIds[i])) return {project:current,vertices:0};
      if(terrain.heights.some(h=>!Number.isFinite(h)||Math.abs(h)>100000))throw new Error('Height outside supported editing range.');
      const vertices=terrain.heights.reduce((n,h,i)=>n+(h!==current.terrain.heights[i]||terrain.textureIds[i]!==current.terrain.textureIds[i]?1:0),0);
      const next={...current,terrain,updatedAt:new Date().toISOString()};
      assertEditorConstraints(current,next,manifest);
      return {project:next,vertices};
}
