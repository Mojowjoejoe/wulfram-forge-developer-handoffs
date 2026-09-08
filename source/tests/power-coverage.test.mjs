import test from 'node:test';
import assert from 'node:assert/strict';
import {powerCoverage} from '../lib/power-coverage.ts';
const entity=(token,team,x)=>({id:`${token}-${team}-${x}`,token,team,position:[x,0,0],rotation:[0,0,0],active:1});
void test('Power tint matches friendly-cell boundary and any-cell coverage',()=>{
  const cells=[entity('e',1,0),entity('e',2,400)];
  assert.equal(powerCoverage(entity('g',1,290),cells,300),'powered');
  assert.equal(powerCoverage(entity('g',1,291),cells,300),'unpowered');
  assert.equal(powerCoverage(entity('g',1,400),cells,300),'unpowered');
  cells.push(entity('e',1,500));assert.equal(powerCoverage(entity('g',1,400),cells,300),'powered');
  for(const token of ['e','d','p','u'])assert.equal(powerCoverage(entity(token,1,9999),cells,300),'independent');
});
