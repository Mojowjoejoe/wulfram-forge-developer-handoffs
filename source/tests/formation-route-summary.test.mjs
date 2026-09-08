import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {formationRouteSummary} from '../lib/formation-route-summary.ts';
import {createBlankProject,structureTerrainClearance} from '../lib/wulfram.ts';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json'));
const project=createBlankProject('Approaches',65);project.terrain.worldWidth=4000;project.terrain.worldHeight=4000;
const entity={id:'cell',token:'e',team:1,position:[2000,2000,0],rotation:[0,0,0],active:1};
function layout(routes){return {id:'candidate',name:'Candidate',entities:[entity],validation:project.validation,metadata:routes===undefined?{}:{'formation.access':JSON.stringify({routes})}};}
void test('Candidate summaries separate clear, tight and blocked routes without changing source',()=>{
 const radius=structureTerrainClearance(entity,manifest,0,0).footprint/Math.SQRT2;
 const routes=[[[1700,2000],[2300,2000]],[[1700,2000+radius+60],[2300,2000+radius+60]],[[1700,2600],[2300,2600]]];
 const candidate=layout(routes),before=structuredClone({project,candidate});
 assert.deepEqual(formationRouteSummary(project,manifest,candidate),{routes:3,tight:1,blocked:1,vehicleWidth:80});assert.deepEqual({project,candidate},before);
});
void test('Missing or malformed approach evidence never becomes an all-clear result',()=>{
 assert.match(formationRouteSummary(project,manifest,layout()).unavailable,/not checked/);
 for(const routes of [[],[[[1,2]]],[[[1,2],['bad',4]]]])assert.match(formationRouteSummary(project,manifest,layout(routes)).unavailable,/unavailable/);
});
