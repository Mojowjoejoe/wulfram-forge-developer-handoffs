import assert from 'node:assert/strict';
import test from 'node:test';
import { terrainSelectionContainsVertex, terrainSelectionError, terrainSelectionFromPoints } from '../lib/terrain-selection.ts';
import { paintTerrainTextureVertex } from '../lib/terrain-textures.ts';

const grid = { width: 11, height: 9, worldWidth: 1000, worldHeight: 400 };
test('selection contains entire adjacent cells on rectangular terrain grids', () => {
  const region = { x: 200, y: 100, width: 400, height: 200 };
  const allowed = [];
  for (let y = 0; y < grid.height; y++) for (let x = 0; x < grid.width; x++) {
    if (terrainSelectionContainsVertex(region, grid, x, y)) allowed.push([x, y]);
  }
  assert.deepEqual(allowed, [[3,3],[4,3],[5,3],[3,4],[4,4],[5,4],[3,5],[4,5],[5,5]]);
  assert.equal(terrainSelectionContainsVertex({ ...region, width: 100 }, grid, 3, 4), false);
  assert.equal(terrainSelectionContainsVertex(undefined, grid, 0, 0), true);
  assert.equal(terrainSelectionContainsVertex({ x:0,y:0,width:1000,height:400 }, grid, 0, 0), true);
});

test('painting selected vertices preserves every cell outside a non-aligned rectangle', () => {
  const region = { x: 225, y: 105, width: 410, height: 210 };
  const terrain = { ...grid, heights: Array(99).fill(0), textureIds: Array(80).fill(0), tagmap: [], tagmap2: ['1snow001'] };
  const original = structuredClone(terrain);
  for (let y = 0; y < grid.height; y++) for (let x = 0; x < grid.width; x++) {
    if (terrainSelectionContainsVertex(region, grid, x, y)) paintTerrainTextureVertex(terrain, x, y, '4snow001');
  }
  let changed = 0;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 10; x++) {
    const id = y * 10 + x;
    if (terrain.textureIds[id] === original.textureIds[id]) continue;
    changed++;
    assert.ok(x * 100 >= region.x && (x + 1) * 100 <= region.x + region.width);
    assert.ok(y * 50 >= region.y && (y + 1) * 50 <= region.y + region.height);
  }
  assert.ok(changed > 0);
  assert.deepEqual(terrain.heights, original.heights);
});

test('invalid and stale map extents fail closed', () => {
  for (const region of [{x:NaN,y:0,width:10,height:10},{x:0,y:0,width:0,height:10},{x:-1,y:0,width:10,height:10},{x:900,y:0,width:200,height:100}]) {
    assert.ok(terrainSelectionError(region, grid));
    assert.equal(terrainSelectionContainsVertex(region, grid, 5, 4), false);
  }
});

test('drawn rectangles normalize either drag direction and stay within the map',()=>{
 assert.deepEqual(terrainSelectionFromPoints([700,300],[200,100],grid),{x:200,y:100,width:500,height:200});
 assert.deepEqual(terrainSelectionFromPoints([-100,-50],[1200,450],grid),{x:0,y:0,width:1000,height:400});
 assert.equal(terrainSelectionFromPoints([50,50],[50,100],grid),undefined);
 assert.equal(terrainSelectionFromPoints([50,50],[50.5,100],grid),undefined);
 assert.equal(terrainSelectionFromPoints([NaN,50],[100,100],grid),undefined);
});
