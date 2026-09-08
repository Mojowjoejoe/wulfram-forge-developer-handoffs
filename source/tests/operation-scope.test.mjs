import test from 'node:test';import assert from 'node:assert/strict';
import {operationScope} from '../lib/operation-scope.ts';
const context={mode:'base',tool:'landform',mirror:true,inspection:false,creative:false,placement:true,layoutName:'North base',dialog:false};
await test('Scope uses the active mode, not stale mirror or inspection settings',()=>{
  assert.match(operationScope(context).detail,/do not automatically mirror/);
  const terrain=operationScope({...context,mode:'terrain',inspection:true,creative:true});assert.equal(terrain.kind,'preview');assert.match(terrain.label,/mirrored footprints/);
  assert.match(operationScope({...context,mode:'terrain',tool:'paint',inspection:true}).label,/texture painting.*immediate/);
  const blocked=operationScope({...context,mode:'terrain',blocked:'Restore authored route metadata.'});assert.match(blocked.label,/preview blocked/);assert.doesNotMatch(blocked.label,/click to apply/);assert.equal(blocked.detail,'Restore authored route metadata.');
});
await test('Inspection and modal previews take precedence over armed base placement',()=>{
  assert.equal(operationScope({...context,creative:true,inspection:true}).kind,'read');
  assert.match(operationScope({...context,creative:true,inspection:false}).label,/New base layout/);
  assert.equal(operationScope({...context,dialog:true,inspection:true}).kind,'preview');
});

await test('Lane scope only claims an active preview when one exists',()=>{
 const lane={...context,mode:'terrain',tool:'lane'};
 assert.match(operationScope(lane).label,/Draw a lane/);
 assert.match(operationScope({...lane,lanePreview:true}).label,/lane preview/);
 assert.match(operationScope({...lane,lanePreview:false}).label,/Draw a lane/);
});
