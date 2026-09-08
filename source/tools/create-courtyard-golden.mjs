import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createBlankProject} from '../lib/wulfram.ts';
import {createCreativeBaseLayout} from '../lib/builtin-base-layouts.ts';
const manifest=JSON.parse(await fs.readFile('public/assets/manifest.json','utf8'));
const project=createBlankProject('Golden',129);project.terrain.worldWidth=14000;project.terrain.worldHeight=10000;
const seed='courtyard-golden-v1',cases=[];
for(const size of ['small','standard','large','massive']){
 const layout=createCreativeBaseLayout(project,manifest,'service-courtyard',`golden-${size}`,seed,{size,x:3200,y:5000,rotation:35,radius:2600,checkAccess:true,terrainAware:false,targetCount:0});
 const content={entities:layout.entities,areas:JSON.parse(layout.metadata['forge.build-areas.v1']),access:JSON.parse(layout.metadata['formation.courtyardAccess'])};
 cases.push({size,sha256:createHash('sha256').update(JSON.stringify(content)).digest('hex')});
}
await fs.writeFile('tests/fixtures/service-courtyard-v1.json',JSON.stringify({version:'service-courtyard-v1',seed,cases},null,2),{flag:'wx'});
