import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import {brokenRingTemplateV2} from '../lib/broken-ring-v2.ts';
const out=process.argv[2];await fs.mkdir(out);
const manifest=JSON.parse(await fs.readFile('public/assets/manifest.json','utf8'));
for(const size of ['small','standard','large','massive']){
 const svg=[`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="500"><rect width="1200" height="500" fill="#12212a"/><style>text{font-family:Arial;fill:white}</style><text x="20" y="30" font-size="22">Broken Ring v2 / ${size} / same scale and count</text>`];
 for(const [column,n] of [0,5,11].entries()){
  const seed=`macro-${n}`,value=brokenRingTemplateV2(seed,size,manifest),{template,plan}=value;assert.deepEqual(value,brokenRingTemplateV2(seed,size,manifest));
  await fs.writeFile(path.join(out,`${size}-${n}.json`),JSON.stringify(value));
  const ox=20+column*395,scale=.052,point=([x,y])=>[ox+187.5+x*scale,235-y*scale];
  svg.push(`<rect x="${ox}" y="60" width="375" height="355" fill="#203440"/><text x="${ox+12}" y="440">Seed ${n} / ${template.units.length} structures</text>`);
  for(const route of [plan.route,...plan.serviceRoutes,plan.circulation])svg.push(`<polyline points="${route.points.map(p=>point(p).join(',')).join(' ')}" fill="none" stroke="#c9a0ed" stroke-width="${route.width*scale}" stroke-linecap="round" opacity=".6"/>`);
  const [cx,cy]=point([0,0]);svg.push(`<circle cx="${cx}" cy="${cy}" r="${450*scale}" fill="#c9a0ed" opacity=".25"/>`);
  for(const u of template.units){const [x,y]=point(u.offset);assert.ok(x>=ox&&x<=ox+375&&y>=60&&y<=415);svg.push(`<circle cx="${x}" cy="${y}" r="3" fill="${u.token==='e'?'#ffd366':['r','f','u'].includes(u.token)?'#72dadd':'#ff9f80'}"/>`);}
 }
 svg.push('<text x="20" y="478" font-size="13">Experimental local plans only / dots are building centers / no terrain, native or gameplay acceptance</text></svg>');
 await sharp(Buffer.from(svg.join(''))).png().toFile(path.join(out,`${size}.png`));
}
