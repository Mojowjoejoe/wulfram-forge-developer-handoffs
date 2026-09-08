import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {checkFormationAccess} from '../lib/formation-access.ts';
import {createBlankProject,structureTerrainClearance} from '../lib/wulfram.ts';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json'));
void test('Open approaches prefer the wider search; narrow valid entrances retain the original fallback',()=>{
 const project=createBlankProject('Access preference',65);project.terrain.worldWidth=2000;project.terrain.worldHeight=2000;
 project.entities=[];
 assert.equal(checkFormationAccess(project,manifest,[[600,600]]).clearance,96);
 const radius=structureTerrainClearance({token:'e',team:1},manifest,0,0).footprint/Math.SQRT2;
 project.entities=[-1,1].map((side,i)=>({id:`cell-${i}`,token:'e',team:1,position:[600+side*(radius+65),600,0],rotation:[0,0,0],active:1}));
 const before=structuredClone(project),result=checkFormationAccess(project,manifest,[[600,600]]);
 assert.equal(result.clearance,56);assert.equal(result.routes.length,1);assert.deepEqual(project,before);
});
