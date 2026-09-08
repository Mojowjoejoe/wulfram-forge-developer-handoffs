import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyLaneHandlesReceipt,MANUAL_EDITING_INPUTS} from '../tools/verify-manual-editing-receipt.mjs';
const receipt=()=>({laneHandles:{...Object.fromEntries(['noMotionClick','smallDrag','escape','blur','pointerCancel','keyboardNudge','bendDrag','insertRemoveAndNumeric','previewReadOnly'].map(k=>[k,true])),displayedPoints:[1,2,3,4,5,6],appliedPoints:[[1,2],[3,4],[5,6]]},laneTool:Object.fromEntries(['curved','previewWithoutMutation','adjustments','releaseCoordinates','escape','blur','pointerCancel','toolSwitch','mapRevisionInvalidation','undoRedo'].map(k=>[k,true]))});
test('lane receipt rejects empty pairs, nonfinite values and incomplete interaction evidence',()=>{
 verifyLaneHandlesReceipt(receipt());
 for(const points of [[[],[],[]],[[1,2],[3,4],[5,NaN]],[[1,2],[3,4],[5,6,7]],[[1,2],[3,4],[5,7]]]){
   const r=receipt();r.laneHandles.appliedPoints=points;assert.throws(()=>verifyLaneHandlesReceipt(r));
 }
 const r=receipt();r.laneHandles.displayedPoints[0]=NaN;assert.throws(()=>verifyLaneHandlesReceipt(r));
 const missing=receipt();delete missing.laneHandles.bendDrag;assert.throws(()=>verifyLaneHandlesReceipt(missing));
 assert.equal(MANUAL_EDITING_INPUTS.length,new Set(MANUAL_EDITING_INPUTS).size);
});
