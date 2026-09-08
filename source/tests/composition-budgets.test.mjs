import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankProject,cloneProject,synchronizeActiveBaseLayout} from '../lib/wulfram.ts';
import {COMPOSITION_KEY,compositionCount,readCompositionBudgets} from '../lib/composition-budgets.ts';
import {assertEditorConstraints,withCompositionBudgets} from '../lib/editor-constraints.ts';
const unit=(id,token,team=1)=>({id,token,team,position:[1000,1000,10],rotation:[0,0,0],active:1});
const rule={team:1,role:'repair',min:1,max:1};
function fixture(){const p=createBlankProject();p.entities=[unit('repair','r'),unit('cell','e'),unit('cargo','c'),unit('other','r',2),unit('unknown','?'),unit('metadata','*')];synchronizeActiveBaseLayout(p);return p;}
await test('Role counts distinguish teams, cargo, metadata, unknown and inactive records',()=>{
 const p=fixture();p.entities[0].active=0;
 assert.equal(compositionCount(p.entities,1,'all'),4);assert.equal(compositionCount(p.entities,1,'repair'),1);assert.equal(compositionCount(p.entities,2,'repair'),1);
 assert.equal(compositionCount([unit('gun','g'),unit('shield','S'),unit('cargo','c')],1,'defense'),2);
});
await test('Limits enforce edits across active and inactive layouts and cannot disappear implicitly',()=>{
 const p=withCompositionBudgets(fixture(),[rule]),original=cloneProject(p);
 for(const change of [n=>n.entities.shift(),n=>n.entities.push(unit('extra','r')),n=>{n.entities[0].team=2;}]){const n=cloneProject(p);change(n);assert.throws(()=>assertEditorConstraints(p,n),/required 1–1/);}
 const drop=cloneProject(p);delete drop.baseLayouts[0].metadata[COMPOSITION_KEY];assert.throws(()=>assertEditorConstraints(p,drop),/explicitly/);
 const inactive=cloneProject(p);inactive.baseLayouts.push({...structuredClone(inactive.baseLayouts[0]),id:'second',metadata:{},entities:[]});inactive.activeBaseLayoutId='second';inactive.entities=[];assertEditorConstraints(p,inactive);inactive.baseLayouts[0].entities.shift();assert.throws(()=>assertEditorConstraints(p,inactive),/required 1–1/);
 assertEditorConstraints(p,JSON.parse(JSON.stringify(p)));assert.deepEqual(p,original);
 const removed=withCompositionBudgets(p,[]);removed.entities.shift();assertEditorConstraints(removed,removed);
});
await test('Invalid and infeasible count limits fail without mutating source',()=>{
 const p=fixture(),before=cloneProject(p);
 for(const invalid of [{...rule,min:2},{...rule,max:-1},{...rule,min:0.5},{...rule,team:0},{...rule,role:'madeup'}])assert.throws(()=>withCompositionBudgets(p,[invalid]));
 assert.throws(()=>readCompositionBudgets(JSON.stringify([rule,rule])),/Duplicate/);
 assert.throws(()=>readCompositionBudgets('x'.repeat(10001)),/size/);assert.deepEqual(p,before);
});
