import test from 'node:test';
import assert from 'node:assert/strict';
import {lanePath,bendAtPoint,insertLanePoint} from '../lib/lane-path.ts';

test('dragging the curve midpoint recovers bend for arbitrary endpoint directions',()=>{
 for(const points of [[[100,400],[2100,400]],[[400,100],[400,2100]],[[300,700],[1800,2300]]]){
   for(const bend of [-1,-.3,0,.65,1]){
     const path=lanePath(points,bend),mid=bend?path[16]:[(points[0][0]+points[1][0])/2,(points[0][1]+points[1][1])/2];
     assert.ok(Math.abs(bendAtPoint(points,mid)-bend)<1e-12);
     assert.deepEqual(path[0],points[0]);assert.deepEqual(path.at(-1),points[1]);
   }
 }
 assert.equal(bendAtPoint([[0,0],[100,0]],[50,500]),1);
 assert.equal(bendAtPoint([[0,0],[100,0]],[50,-500]),-1);
 assert.equal(bendAtPoint([[0,0],[0,0]],[50,500]),0);
});

test('inserting points preserves ordered endpoints, source and limits',()=>{
 const points=[[100,400],[2100,400]],before=structuredClone(points);
 assert.deepEqual(insertLanePoint(points,0),[[100,400],[1100,400],[2100,400]]);assert.deepEqual(points,before);
 assert.throws(()=>insertLanePoint(points,1));assert.throws(()=>insertLanePoint(points,-1));
 const full=Array.from({length:32},(_,i)=>[i*10,0]);assert.throws(()=>insertLanePoint(full,5));
 const multi=insertLanePoint(points,0);assert.deepEqual(lanePath(multi,0),multi);
});
