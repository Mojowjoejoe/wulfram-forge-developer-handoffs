import path from 'node:path';
import {applyManualTerrainBrush} from '../lib/manual-terrain-brush.ts';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';

export const MANUAL_EDITING_INPUTS=['lib/manual-terrain-brush.ts','lib/terrain-brush.ts','lib/terrain-selection.ts','lib/terrain-edge.ts','lib/terrain-textures.ts','lib/terrain-blend.ts','public/assets/manifest.json','tools/test-manual-brush-native.mjs','tools/test-lane-handles-scenario.mjs','tools/verify-manual-editing-receipt.mjs'];

export function verifyLaneHandlesReceipt(receipt){
 for(const key of ['noMotionClick','smallDrag','escape','blur','pointerCancel','keyboardNudge','bendDrag','insertRemoveAndNumeric','previewReadOnly'])assert.equal(receipt.laneHandles?.[key],true,`laneHandles.${key}`);
 for(const key of ['curved','previewWithoutMutation','adjustments','releaseCoordinates','escape','blur','pointerCancel','toolSwitch','mapRevisionInvalidation','undoRedo'])assert.equal(receipt.laneTool?.[key],true,`laneTool.${key}`);
 const {displayedPoints,appliedPoints}=receipt.laneHandles;
 assert.ok(Array.isArray(displayedPoints)&&displayedPoints.length===6&&displayedPoints.every(Number.isFinite));assert.ok(Array.isArray(appliedPoints)&&appliedPoints.length===3&&appliedPoints.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)));assert.equal(appliedPoints.flat().length,6);
 for(const [i,value] of appliedPoints.flat().entries())assert.ok(Number.isFinite(value)&&Math.abs(value-displayedPoints[i])<=.0051,'Saved handle coordinates match the displayed proposal');
}

export async function verifyManualBrushReceipt(receipt){
 const manifest=JSON.parse(await fs.readFile(path.resolve('public/assets/manifest.json'),'utf8'));
 const brush=receipt.editorBrush;assert.equal(brush?.invalidHeightRejected,true);assert.equal(brush?.sourceRestored,true);
 const expected=['round','square','diamond'].flatMap(shape=>['soft','linear','hard'].flatMap(falloff=>['sculpt','lower','level','stamp','smooth','paint'].map(tool=>[shape,falloff,tool])));
 assert.deepEqual(brush.cases.map(c=>[c.shape,c.falloff,c.tool]),expected);
 const artifacts=[];
 const read=async item=>{
   assert.ok(item&&typeof item.path==='string'&&/^[a-f0-9]{64}$/.test(item.sha256));
   const bytes=await fs.readFile(item.path);assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256);
   artifacts.push({path:item.path,sha256:item.sha256});return JSON.parse(bytes);
 };
 const stable=p=>{const n=structuredClone(p);delete n.updatedAt;const active=n.baseLayouts.find(l=>l.id===n.activeBaseLayoutId);if(active)delete active.updatedAt;return n;};
 const initial=await read(brush.snapshots.initial),source=await read(brush.snapshots.source);
 for(const c of brush.cases){
   for(const key of ['sourceParity','staleRejected','undo'])assert.equal(c[key],true);
   assert.ok(Number.isInteger(c.vertices)&&c.vertices>0);
   assert.equal(c.brush.profile,'editor-v1');assert.equal(c.brush.shape,c.shape);assert.equal(c.brush.falloff,c.falloff);assert.equal(c.brush.tool,c.tool);
   const applied=await read(c),stale=await read(c.staleSnapshot),undo=await read(c.undoSnapshot);
   const expected=applyManualTerrainBrush(source,c.brush,manifest);assert.equal(c.vertices,expected.vertices);assert.deepEqual(stable(applied),stable(expected.project),'Native terrain matches the pinned shared operation');
   assert.deepEqual(applied,stale,'Stale brush must leave the full project unchanged');
   assert.deepEqual(stable(undo),stable(source),'Undo restores the full source');
   assert.deepEqual(applied.entities,source.entities);
   const untouched=p=>{const n=stable(p);delete n.terrain;return n;};assert.deepEqual(untouched(applied),untouched(source));
 }
 assert.deepEqual(brush.snapshots.beforeInvalid,brush.cases.at(-1).undoSnapshot);
 const beforeInvalid=await read(brush.snapshots.beforeInvalid),afterInvalid=await read(brush.snapshots.afterInvalid);
 assert.deepEqual(beforeInvalid,afterInvalid,'Invalid brush preserves exact full project');
 const restored=await read(brush.snapshots.restored);assert.deepEqual(stable(restored),stable(initial));
 return artifacts;
}
