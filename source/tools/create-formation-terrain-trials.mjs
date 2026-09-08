import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createBlankProject,activateBaseLayout} from '../lib/wulfram.ts';
import {createFormationOptions} from '../lib/formation-options.ts';
import {createMapArchive,readMapArchive} from '../lib/map-package.ts';
const manifest=JSON.parse(await fs.readFile('public/assets/manifest.json'));
const baseline=JSON.parse(await fs.readFile('outputs/base-count-layouts-v1/Base-Placement-Five-Layouts.json'));
const out='outputs/creative-terrain-v7-trials';await fs.mkdir(out,{recursive:true});const report=[];
for(const terrain of ['valley','hills','mounds']){
  const p=createBlankProject(`Terrain trial ${terrain}`,129);p.terrain.worldWidth=12000;p.terrain.worldHeight=8000;
  p.terrain.tagmap=baseline.terrain.tagmap;p.terrain.tagmap2=baseline.terrain.tagmap2;p.terrain.textureIds.fill(baseline.terrain.textureIds[0]);
  p.terrain.heights=p.terrain.heights.map((_,i)=>{const x=i%129/128*12000,y=Math.floor(i/129)/128*8000;return terrain==='valley'?Math.abs(Math.floor(i/129)-64)*12:terrain==='hills'?180*Math.sin(i%129/10)*Math.cos(Math.floor(i/129)/10):900*Math.exp(-((x-2800)**2+(y-4000)**2)/180**2)+900*Math.exp(-((x-9200)**2+(y-4000)**2)/180**2);});
  p.baseLayouts=[];
  for(const size of ['small','massive']){
    const options=createFormationOptions(p,manifest,'anvil',`${terrain}-${size}`,'terrain-sprint',{size,x:2800,y:4000,rotation:0,radius:2300,terrainAware:true,checkAccess:true,...(terrain!=='mounds'?{entranceDegrees:0}:{})});
    assert.ok(options.every(o=>o.layout),options.map(o=>o.error).join('\n'));
    options.forEach((o,i)=>{o.layout.name=`${size} · option ${i+1} · ${o.layout.entities.length/2} per team`;p.baseLayouts.push(o.layout);});
  }
  activateBaseLayout(p,p.baseLayouts[0].id);
  const archive=await createMapArchive(p),entries=await readMapArchive(archive);
  assert.equal(JSON.parse(entries.find(e=>e.name.endsWith('/wulfram-project.json')).text).baseLayouts.length,6);
  await fs.writeFile(`${out}/${terrain}.json`,JSON.stringify(p));await fs.writeFile(`${out}/${terrain}.zip`,Buffer.from(archive));
  report.push({terrain,layouts:6,path:`${out}/${terrain}.zip`,passed:true});
}
await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
