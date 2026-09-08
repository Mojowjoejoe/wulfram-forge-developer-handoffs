import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createCreativeBaseLayout} from '../lib/builtin-base-layouts.ts';
import {FormationDiagnosticError} from '../lib/formation-diagnostics.ts';
import {createBlankProject} from '../lib/wulfram.ts';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json'));
for(const terrain of ['flat','valley','hills'])for(const size of ['small','standard','massive'])void test(`${terrain}: ${size} routes connect service pads without modifying terrain`,()=>{
  const p=createBlankProject('Access trial',65);p.terrain.worldWidth=12000;p.terrain.worldHeight=8000;
  p.terrain.heights=p.terrain.heights.map((_,i)=>terrain==='flat'?0:terrain==='valley'?Math.abs(Math.floor(i/65)-32)*8:80*Math.sin(i%65/8)*Math.cos(Math.floor(i/65)/8));
  const before=structuredClone(p);
  const layout=createCreativeBaseLayout(p,manifest,'anvil','trial','access-test',{size,x:2800,y:4000,rotation:0,radius:2700,checkAccess:true});
  const access=JSON.parse(layout.metadata['formation.access']);
  assert.equal(access.routes.length,layout.entities.filter(e=>['r','f'].includes(e.token)).length);
  assert.equal(access.blocked.length,0);assert.ok(access.routes.every(r=>r.length>2));
  assert.deepEqual(p,before);
});
void test('Rejected boundary placement provides map markers and preserves source',()=>{
  const p=createBlankProject('Edge',65);p.terrain.heights.fill(0);p.terrain.worldWidth=8000;p.terrain.worldHeight=6000;
  const before=structuredClone(p);
  assert.throws(()=>createCreativeBaseLayout(p,manifest,'anvil','edge','edge',{size:'small',x:0,y:0,rotation:0,radius:2000,checkAccess:true}),e=>e instanceof FormationDiagnosticError&&e.overlay.blocked.length>0);
  assert.deepEqual(p,before);
});
