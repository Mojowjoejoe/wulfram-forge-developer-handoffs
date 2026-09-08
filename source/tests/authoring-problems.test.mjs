import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankProject,cloneProject} from '../lib/wulfram.ts';
import {inspectAuthoringProblems} from '../lib/authoring-problems.ts';
import {COMPOSITION_KEY} from '../lib/composition-budgets.ts';
import {BUILD_AREAS_KEY} from '../lib/build-areas.ts';
import {DISTRICTS_KEY} from '../lib/base-districts.ts';
import {DISTRICT_RELATIONSHIPS_KEY} from '../lib/district-relationships.ts';
await test('Saved-rule inspection collects independent failures without mutation',()=>{
 const p=createBlankProject(),m=p.baseLayouts[0].metadata;
 m[COMPOSITION_KEY]=JSON.stringify([{team:1,role:'repair',min:1,max:2}]);m[BUILD_AREAS_KEY]='broken json';
 m[DISTRICTS_KEY]=JSON.stringify([{id:'a',name:'Orphan',entityIds:['missing'],locked:true}]);
 m[DISTRICT_RELATIONSHIPS_KEY]=JSON.stringify([{id:'link',name:'Spacing',from:'a',to:'b',min:10,max:100}]);
 const before=cloneProject(p),problems=inspectAuthoringProblems(p);
 assert.deepEqual(problems.map(p=>p.section),['areas','districts','relationships','composition']);
 assert.match(problems[1].message,/locked district/);assert.match(problems[3].message,/0 placed; requires 1–2/);assert.deepEqual(p,before);
});
await test('Inspection uses active entities and does not imply other layouts were checked',()=>{
 const p=createBlankProject();p.baseLayouts[0].metadata[COMPOSITION_KEY]=JSON.stringify([{team:1,role:'repair',min:1,max:1}]);
 p.entities=[{id:'repair',token:'r',team:1,position:[100,100,0],rotation:[0,0,0],active:1}];
 assert.deepEqual(inspectAuthoringProblems(p),[]);
 p.baseLayouts.push({...structuredClone(p.baseLayouts[0]),id:'inactive',metadata:{[BUILD_AREAS_KEY]:'invalid'},entities:[]});
 assert.deepEqual(inspectAuthoringProblems(p),[]);
 p.entities=[];assert.equal(inspectAuthoringProblems(p)[0].section,'composition');
});
