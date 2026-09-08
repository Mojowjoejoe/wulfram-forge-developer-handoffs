import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTerrainDetail, previewTerrainDetail, DEFAULT_TERRAIN_DETAIL } from '../lib/terrain-detail-generator.ts';
const source = JSON.parse(fs.readFileSync('outputs/canyon-citadel-showcase-v1/project.json'));
const manifest = JSON.parse(fs.readFileSync('public/assets/manifest.json'));
void test('Citadel detail preserves bases, custom route shoulders, source and deterministic replacement', () => {
  const before = JSON.stringify(source);
  const first = generateTerrainDetail(source, DEFAULT_TERRAIN_DETAIL, manifest);
  assert.equal(first.passed, true);
  assert.ok(first.changedVertices > 0);
  assert.deepEqual(first.project.entities, source.entities);
  const anchors = JSON.parse(source.metadata['showcase.identity']).baseAnchors;
  for (let i = 0; i < source.terrain.heights.length; i++) {
    const wx = i % 257 * 25, wy = Math.floor(i / 257) * 25;
    const u = (wx + wy - 6400) / 3200 / Math.SQRT2, v = (wx - wy) / 3200 / Math.SQRT2;
    const flank = .64 * Math.cos(Math.PI / 2 * Math.min(1, Math.abs(u) / .82));
    if (anchors.some(([x,y]) => Math.hypot(wx-x,wy-y) < 1950)
      || Math.min(Math.abs(v),Math.abs(Math.abs(v)-flank)) < .27 || Math.hypot(u,v)<.43) {
      assert.equal(first.project.terrain.heights[i],source.terrain.heights[i]);
    }
  }
  const options = {...DEFAULT_TERRAIN_DETAIL, seed:'citadel-replace', height:1000};
  const replaced = previewTerrainDetail(JSON.parse(JSON.stringify(first.project)),options,manifest);
  assert.deepEqual(replaced.project.terrain,generateTerrainDetail(source,options,manifest).project.terrain);
  assert.equal(JSON.stringify(source),before);
  const edited=structuredClone(first.project); edited.terrain.heights[0]++;
  assert.throws(()=>previewTerrainDetail(edited,options,manifest),/changed/);
});
void test('Unknown or altered custom protection metadata fails closed',()=>{
  for(const change of [i=>i.version='unknown',i=>i.baseAnchors[0][0]++,i=>i.options.size=129]) {
    const p=structuredClone(source), identity=JSON.parse(p.metadata['showcase.identity']); change(identity);
    p.metadata['showcase.identity']=JSON.stringify(identity);
    assert.throws(()=>generateTerrainDetail(p,DEFAULT_TERRAIN_DETAIL,manifest));
  }
});

const powerRun = JSON.parse(fs.readFileSync('outputs/canyon-citadel-central-outpost-v3/project.json'));
const iceDraft = {...DEFAULT_TERRAIN_DETAIL,seed:'f324e654-ced3-4bf2-862e-7608d9f294dd',textureName:'snowrocks001'};
void test('Authored Power Run outpost allows terrain-only detail without hiding full-map errors',()=>{
  const before=JSON.stringify(powerRun);
  const r=previewTerrainDetail(powerRun,iceDraft,manifest);
  assert.equal(r.passed,true);assert.equal(r.analysis.passed,false);
  assert.equal(r.expectedOutpostIssues.length,1);assert.equal(r.blockingIssues.length,0);
  assert.equal(r.expectedOutpostIssues[0].entityId,'central-neutral-repair-1');
  assert.deepEqual(r.project.entities,powerRun.entities);
  assert.deepEqual(r.project.baseLayouts.map(l=>l.entities),powerRun.baseLayouts.map(l=>l.entities));
  for(let i=0;i<powerRun.terrain.heights.length;i++)if(Math.hypot(i%257*25-3200,Math.floor(i/257)*25-3200)<1100)assert.equal(r.project.terrain.heights[i],powerRun.terrain.heights[i]);
  const replacement=previewTerrainDetail(JSON.parse(JSON.stringify(r.project)),{...iceDraft,seed:'ice-replacement'},manifest);
  assert.equal(replacement.passed,true);
  assert.equal(JSON.stringify(powerRun),before);
});
void test('Outpost exemption rejects altered identity and never defers ordinary power failures',()=>{
  for(const change of [
    p=>delete p.metadata['showcase.outpost'],
    p=>p.metadata['showcase.outpost']='{',
    p=>p.entities.find(e=>e.id==='central-neutral-repair-1').team=1,
    p=>p.entities.find(e=>e.id==='central-neutral-repair-1').position[0]+=25,
    p=>p.entities.find(e=>e.id==='central-neutral-repair-1').active=0,
  ]) {
    const p=structuredClone(powerRun);change(p);const r=generateTerrainDetail(p,iceDraft,manifest);
    assert.equal(r.passed,false);assert.equal(r.expectedOutpostIssues.length,0);
  }
  const p=structuredClone(powerRun);
  p.entities=p.entities.filter(e=>e.token!=='e');
  const r=generateTerrainDetail(p,iceDraft,manifest);
  assert.equal(r.passed,false);assert.equal(r.expectedOutpostIssues.length,1);
  assert.ok(r.blockingIssues.some(i=>i.code==='power'&&i.entityId!=='central-neutral-repair-1'));
});
