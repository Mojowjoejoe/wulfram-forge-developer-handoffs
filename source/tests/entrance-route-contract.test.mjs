import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createBlankProject} from '../lib/wulfram.ts';
import {checkFormationAccess,checkFormationAccessViaCorridor} from '../lib/formation-access.ts';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json','utf8'));
function fixture(){const p=createBlankProject();p.terrain.worldWidth=4000;p.terrain.worldHeight=4000;p.terrain.heights.fill(0);p.entities=[{id:'pad',token:'r',team:1,position:[1000,1000,0],rotation:[0,0,0],active:1}];return p;}
const points=[[2400,1600],[2400,800],[1600,800]];
test('Explicit entrance route includes every authored turn in order and preserves legacy access and source',()=>{
 const p=fixture(),before=structuredClone(p),legacy=checkFormationAccess(p,manifest),r=checkFormationAccessViaCorridor(p,manifest,1,points);
 assert.equal(r.pads,1);assert.equal(r.routes.length,1);assert.equal(r.policy,'via-authored-corridor-v1');
 const route=[...r.routes[0]].reverse();let cursor=-1;
 for(const point of points){const index=route.findIndex((p,i)=>i>cursor&&p[0]===point[0]&&p[1]===point[1]);assert.ok(index>cursor);cursor=index;}
 assert.deepEqual(route.at(-1),[1000,1000]);assert.deepEqual(p,before);assert.deepEqual(checkFormationAccess(p,manifest),legacy);
 assert.deepEqual(checkFormationAccessViaCorridor(p,manifest,1,points),r);
});
test('Blocked or invalid authored entrances reject without substituting an automatic shortcut',()=>{
 const p=fixture();p.entities.push({id:'obstacle',token:'g',team:2,position:[2400,1200,0],rotation:[0,0,0],active:1});const before=structuredClone(p);
 assert.throws(()=>checkFormationAccessViaCorridor(p,manifest,1,points),/insufficient sampled clearance/);assert.deepEqual(p,before);
 assert.throws(()=>checkFormationAccessViaCorridor(fixture(),manifest,2,points),/no service pads/);
 assert.throws(()=>checkFormationAccessViaCorridor(fixture(),manifest,1,[[1000,1000],[1000,1000]]),/Consecutive corridor points/);
 assert.throws(()=>checkFormationAccessViaCorridor(fixture(),manifest,1,[[0,0],[1e300,1]]),/sampling budget/);
});
