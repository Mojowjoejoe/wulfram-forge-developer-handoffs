import {createBlankProject} from '../lib/wulfram.ts';
export function offsetPortabilityTarget(terrain){
 if(!['valley','irregular'].includes(terrain))throw new Error('Unknown portability terrain.');
 const p=createBlankProject(`Offset ${terrain} favorite target`,129);p.terrain.worldWidth=14000;p.terrain.worldHeight=10000;
 p.terrain.heights=p.terrain.heights.map((_,i)=>terrain==='valley'?Math.abs(Math.floor(i/129)-64)*8:100*Math.cos((i%129-64)/10)*Math.cos((Math.floor(i/129)-64)/10));
 return p;
}
