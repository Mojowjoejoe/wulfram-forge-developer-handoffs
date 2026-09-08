import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {generateBaseLayout} from '../lib/mcp-commands.ts';
import {createBlankProject} from '../lib/wulfram.ts';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json','utf8'));
const blank=()=>{const p=createBlankProject('MCP generation',129);p.terrain.worldWidth=12000;p.terrain.worldHeight=8000;p.terrain.heights.fill(0);return p;};
const request=p=>({activeLayoutId:p.activeBaseLayoutId,layoutId:'new-offset',style:'offset-bastion',seed:'mcp-arrangement',placement:{size:'small',x:2800,y:4000,rotation:0,radius:2400,checkAccess:true,offsetArrangement:'deep-court'}});
void test('Creative command preserves source and stored layouts, returns deterministic candidate and selected geometry',()=>{
 const p=blank(),before=structuredClone(p),r=request(p),a=generateBaseLayout(p,r,manifest).project,b=generateBaseLayout(p,r,manifest).project;
 assert.deepEqual(p,before);assert.equal(a.baseLayouts.length,p.baseLayouts.length+1);assert.equal(a.activeBaseLayoutId,r.layoutId);
 assert.deepEqual(a.entities,b.entities);assert.deepEqual(a.terrain,p.terrain);
 for(const old of p.baseLayouts){const saved=a.baseLayouts.find(l=>l.id===old.id);assert.deepEqual(saved.entities,old.entities);assert.deepEqual(saved.metadata,old.metadata);}
 assert.equal(a.baseLayouts.at(-1).metadata['formation.version'],'offset-bastion-arrangements-v1:deep-court');
 assert.throws(()=>generateBaseLayout(a,{...r,activeLayoutId:a.activeBaseLayoutId},manifest),/new layout ID/);
});
void test('Malformed generation and failing fit leave input untouched',()=>{
 const p=blank(),before=structuredClone(p),r=request(p);
 for(const change of [{activeLayoutId:'stale'},{seed:''},{style:'unknown'},{extra:true},{placement:{...r.placement,checkAccess:'yes'}},{placement:{...r.placement,offsetArrangement:'unknown'}},{placement:{...r.placement,radius:100}},{placement:{...r.placement,x:NaN}}])assert.throws(()=>generateBaseLayout(p,{...r,...change},manifest));
 assert.deepEqual(p,before);
});

void test('Generation preserves populated active and inactive layouts, locks and authored rules',()=>{
 const p=generateBaseLayout(blank(),request(blank()),manifest).project;
 const active=p.baseLayouts.find(l=>l.id===p.activeBaseLayoutId);
 active.metadata['forge.districts.v1']=JSON.stringify([{id:'locked',name:'Keep command',entityIds:[p.entities[0].id],locked:true}]);
 const inactive=structuredClone(active);inactive.id='saved-other';inactive.name='Existing design';p.baseLayouts.push(inactive);
 // Unsynchronized live state must be retained when switching layouts.
 p.entities[1].subtype='preserved-live-value';
 const before=structuredClone(p),r={...request(p),layoutId:'next-offset',seed:'other-seed'};
 const next=generateBaseLayout(p,r,manifest).project;
 assert.deepEqual(p,before);assert.deepEqual(JSON.parse(JSON.stringify(next.baseLayouts.find(l=>l.id===inactive.id))),JSON.parse(JSON.stringify(inactive)));
 const kept=next.baseLayouts.find(l=>l.id===active.id);
 assert.deepEqual(JSON.parse(JSON.stringify(kept.entities)),JSON.parse(JSON.stringify(p.entities)));assert.deepEqual(kept.metadata,active.metadata);
 assert.deepEqual(next.terrain,p.terrain);
});
