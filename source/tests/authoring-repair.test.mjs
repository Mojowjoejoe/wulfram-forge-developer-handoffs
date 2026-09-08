import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankProject,cloneProject} from '../lib/wulfram.ts';
import {authoringRepairDraft,previewAuthoringRepair} from '../lib/authoring-repair.ts';
import {COMPOSITION_KEY} from '../lib/composition-budgets.ts';
import {BUILD_AREAS_KEY} from '../lib/build-areas.ts';
await test('Atomic repair replaces only reviewed active-layout categories and preserves originals',()=>{
 const p=createBlankProject();p.baseLayouts[0].metadata[BUILD_AREAS_KEY]='invalid';p.baseLayouts[0].metadata[COMPOSITION_KEY]=JSON.stringify([{team:1,role:'repair',min:1,max:1}]);p.baseLayouts[0].metadata.custom='keep';p.baseLayouts.push({...structuredClone(p.baseLayouts[0]),id:'inactive'});
 const original=cloneProject(p),draft=authoringRepairDraft(p);draft[BUILD_AREAS_KEY]='[]';
 assert.throws(()=>previewAuthoringRepair(p,draft),/still has/);assert.deepEqual(p,original);
 draft[COMPOSITION_KEY]='';const {project:next,changed}=previewAuthoringRepair(p,draft);
 assert.deepEqual(changed,['Build areas','Composition limits']);assert.deepEqual(next.entities,p.entities);assert.deepEqual(next.terrain,p.terrain);assert.deepEqual(next.baseLayouts[1],p.baseLayouts[1]);assert.equal(next.baseLayouts[0].metadata.custom,'keep');assert.equal(next.baseLayouts[0].metadata[COMPOSITION_KEY],undefined);assert.deepEqual(p,original);
 const restored=cloneProject(next);restored.baseLayouts[0].metadata=structuredClone(original.baseLayouts[0].metadata);assert.deepEqual(restored,original);
});
await test('Repair rejects unsupported keys, incomplete drafts and unchanged proposals',()=>{
 const p=createBlankProject(),draft=authoringRepairDraft(p);
 assert.throws(()=>previewAuthoringRepair(p,draft),/No saved rules changed/);
 assert.throws(()=>previewAuthoringRepair(p,{...draft,other:'[]'}),/four displayed/);
 assert.throws(()=>previewAuthoringRepair(p,{}),/at most/);
 assert.throws(()=>previewAuthoringRepair(p,{...draft,[BUILD_AREAS_KEY]:'x'.repeat(100001)}),/at most/);
});
