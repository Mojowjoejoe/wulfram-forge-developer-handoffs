import assert from 'node:assert/strict';
import test from 'node:test';
import {measureTerrain} from '../lib/terrain-measurement.ts';
import {sampleHeight} from '../lib/wulfram.ts';
const terrain=(width,height,worldWidth,worldHeight,heights)=>({width,height,worldWidth,worldHeight,heights,textureIds:[],tagmap:[],tagmap2:[]});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('off-grid rectangle clips a plane exactly on a rectangular grid',()=>{
 const t=terrain(4,3,300,100,Array.from({length:12},(_,i)=>2*(i%4)*100+3*Math.floor(i/4)*50));
 const original=structuredClone(t),m=measureTerrain(t,{x:120,y:20,width:35,height:25});
 near(m.minHeight,300);near(m.maxHeight,445);near(m.relief,145);near(m.maxSlopeDegrees,Math.atan(Math.hypot(2,3))*180/Math.PI);
 assert.equal(m.gridX,100);assert.equal(m.gridY,50);assert.deepEqual(t,original);
});
test('alternating diagonals agree with the editor surface, including tiny regions',()=>{
 const t=terrain(3,2,200,100,[0,0,0,0,100,0]);
 for(const region of [{x:10,y:70,width:20,height:10},{x:110,y:20,width:1,height:1}]){
  const m=measureTerrain(t,region),values=[];
  for(let y=0;y<=10;y++)for(let x=0;x<=10;x++)values.push(sampleHeight(t,region.x+x/10*region.width,region.y+y/10*region.height));
  near(m.minHeight,Math.min(...values));near(m.maxHeight,Math.max(...values));near(m.maxSlopeDegrees,45);assert.ok(m.triangles>=1);
 }
});
test('faces merely touching the rectangle do not inflate its slope',()=>{
 const t=terrain(3,2,200,100,[0,100,100,0,100,100]);
 const m=measureTerrain(t,{x:100,y:0,width:100,height:100});
 assert.equal(m.maxSlopeDegrees,0);assert.equal(m.minHeight,100);assert.equal(m.maxHeight,100);assert.equal(m.triangles,2);
 assert.equal(measureTerrain(t).triangles,4);
});
test('invalid geometry and damaged measured heights fail explicitly',()=>{
 const t=terrain(2,2,100,100,[0,0,0,0]);
 assert.throws(()=>measureTerrain({...t,worldWidth:NaN}));
 assert.throws(()=>measureTerrain({...t,heights:[0,NaN,0,0]}));
 assert.throws(()=>measureTerrain(t,{x:90,y:0,width:20,height:10}));
});
