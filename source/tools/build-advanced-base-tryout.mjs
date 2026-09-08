import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {ADVANCED_BASE_PRESETS} from '../lib/advanced-base-templates.ts';
import {instantiatePairedTemplate} from '../lib/paired-template.ts';
import {synchronizeActiveBaseLayout,validateProject} from '../lib/wulfram.ts';
import {createMapArchive,readMapArchive} from '../lib/map-package.ts';
const out=path.resolve('outputs/advanced-base-tryout-v1');
assert.ok(!fs.existsSync(out),'Preserve previous tryouts.');fs.mkdirSync(out,{recursive:true});
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json'));
const source=JSON.parse(fs.readFileSync('outputs/three-lane-citadel-v1-final/project.json'));
const receipt=[];
for(const preset of ADVANCED_BASE_PRESETS){
  const p=structuredClone(source),t=preset.template;
  p.name=t.name.replace('Advanced · ','')+' — Base Tryout';p.metadata={'tryout.status':'Flat test range for base comparison; no gameplay balance certification.','tryout.preset':t.id};
  p.terrain={width:129,height:129,worldWidth:6400,worldHeight:6400,skyName:'bluesky',heights:Array(129*129).fill(0),textureIds:Array(129*129).fill(0),tagmap:['gbdirt001'],tagmap2:['gbdirt001']};
  p.entities=[];p.baseLayouts=[];p.updatedAt=new Date().toISOString();
  for(const team of [1,2]){let n=0;p.entities.push(...instantiatePairedTemplate(t,p.terrain,team===1?[1600,3200]:[4800,3200],team,1,team===1?0:Math.PI,manifest,undefined,()=>`advanced-${team}-${n++}`).entities);}
  synchronizeActiveBaseLayout(p);p.baseLayouts[0].name=t.name;
  const errors=validateProject(p).filter(i=>i.severity==='error');assert.deepEqual(errors,[]);
  const bytes=Buffer.from(await createMapArchive(p));const entries=await readMapArchive(bytes);
  const reopened=JSON.parse(entries.find(e=>e.name.endsWith('/wulfram-project.json')).text);assert.deepEqual(reopened.entities,JSON.parse(JSON.stringify(p.entities)));assert.deepEqual(reopened.terrain,p.terrain);
  fs.writeFileSync(path.join(out,t.id+'.zip'),bytes);fs.writeFileSync(path.join(out,t.id+'.json'),JSON.stringify(p));
  receipt.push({id:t.id,name:t.name,perTeam:t.unitCount,diameter:preset.recommendedDiameter,errors:0});
}
fs.writeFileSync(path.join(out,'presets.json'),JSON.stringify(ADVANCED_BASE_PRESETS,null,2));
fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(receipt,null,2));
console.log(JSON.stringify({out,presets:receipt},null,2));
