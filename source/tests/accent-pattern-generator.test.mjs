import test from 'node:test';
import assert from 'node:assert/strict';
import {planTerrainAccents,applyAccentPlanOffline} from '../lib/accent-pattern-generator.ts';

function fixture(){
 return {name:'Texture fixture',entities:[{position:[1200,1200,40],token:'e',team:1},{position:[4400,4400,40],token:'e',team:2}],terrain:{width:129,height:129,worldWidth:5600,worldHeight:5600,heights:Array.from({length:129*129},(_,i)=>15*Math.sin((i%129)/9)+8*Math.cos(Math.floor(i/129)/7)),tagmap2:['marsvolc001','1snow001'],textureIds:Array.from({length:128*128},(_,i)=>Math.floor(i/128)<64?0:1)}};
}
test('same input and seed reproduce exact plan; another seed changes shapes',()=>{
 const p=fixture(),before=structuredClone(p),a=planTerrainAccents(p,'review-seed');
 assert.deepEqual(a,planTerrainAccents(p,'review-seed'));
 assert.notDeepEqual(a.features,planTerrainAccents(p,'different-seed').features);
 assert.deepEqual(p,before);
 assert.equal(a.features.length,6);
});
test('texture plan preserves geometry/entities, protected base areas and biome edge',()=>{
 const p=fixture(),plan=planTerrainAccents(p,'review-seed'),q=applyAccentPlanOffline(p,plan);
 assert.deepEqual(q.terrain.heights,p.terrain.heights);assert.deepEqual(q.entities,p.entities);
 for(const b of plan.brushes){
  assert.equal(b.operation,'texture');
  assert.ok(Math.abs(b.y-2800)>=180,'approved middle boundary is untouched');
  assert.ok(p.entities.every(e=>Math.hypot(e.position[0]-b.x,e.position[1]-b.y)>=360));
  assert.ok(b.radius<5600/128/2,'MCP brush selects a single planned vertex');
 }
});
test('unsupported terrain fails explicitly instead of painting across exclusions',()=>{
 const p=fixture();p.terrain.tagmap2=['unsupported','unsupported'];
 assert.throws(()=>planTerrainAccents(p,'seed'),/No protected terrain/);
 assert.throws(()=>planTerrainAccents(fixture(),''),/nonempty seed/);
});
