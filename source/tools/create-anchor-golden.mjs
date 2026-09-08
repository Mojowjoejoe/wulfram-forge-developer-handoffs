import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {threeLaneAnchorTemplate} from '../lib/three-lane-anchor.ts';
const destination='tests/fixtures/three-lane-anchor-golden.json';
const manifestText=await fs.readFile('public/assets/manifest.json','utf8'),manifest=JSON.parse(manifestText),seed='anchor-golden-v1';
const cases=[];
for(const [i,size] of ['small','standard','large','massive'].entries())for(const targetCount of [0,[24,30,39,51][i]])cases.push({size,targetCount,recipe:threeLaneAnchorTemplate(seed,size,manifest,targetCount)});
await fs.writeFile(destination,JSON.stringify({format:'three-lane-anchor-golden',version:1,seed,manifestSha256:createHash('sha256').update(manifestText).digest('hex'),cases},null,2)+'\n',{flag:'wx'});
console.log(destination);
