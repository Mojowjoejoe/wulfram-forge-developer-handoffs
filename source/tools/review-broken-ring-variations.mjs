import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createBlankProject,activateBaseLayout,validateProject} from '../lib/wulfram.ts';
import {createCreativeBaseLayout} from '../lib/builtin-base-layouts.ts';
const out=process.argv[2];if(!out)throw new Error('Supply a new review directory');await fs.mkdir(out);
const manifest=JSON.parse(await fs.readFile('public/assets/manifest.json','utf8'));
const hash=s=>createHash('sha256').update(s).digest('hex'),cases=[];
const colors={e:'#ffd366',r:'#72dadd',f:'#72dadd',u:'#fff',d:'#c1a0ff',g:'#f69b80',s:'#f69b80',L:'#f69b80'};
for(const size of ['small','standard','large','massive']){
 const svg=[`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="480"><rect width="1200" height="480" fill="#121d25"/><style>text{font-family:Arial;fill:#eee}</style><text x="20" y="32" font-size="22">Broken Ring / ${size} / same size, count, anchor and rotation</text>`];
 for(const [column,index] of [0,3,11].entries()){
 const seed=`broken-ring-visual-${index}`,p=createBlankProject('Broken Ring comparison',129);p.terrain.worldWidth=16000;p.terrain.worldHeight=12000;
 const before=JSON.stringify(p),placement={size,x:4000,y:6000,rotation:0,radius:3300,terrainAware:false,checkAccess:true,targetCount:{small:18,standard:23,large:28,massive:38}[size]};
 const l=createCreativeBaseLayout(p,manifest,'broken-ring',`compare-${size}`,seed,placement);
 const repeat=createCreativeBaseLayout(p,manifest,'broken-ring',`compare-${size}`,seed,placement);assert.deepEqual({...l,updatedAt:''},{...repeat,updatedAt:''});assert.equal(JSON.stringify(p),before);
 p.baseLayouts.push(l);activateBaseLayout(p,l.id);assert.deepEqual(validateProject(p).filter(i=>i.severity==='error'),[]);
 const bytes=JSON.stringify(p),file=path.join(out,`${size}-${index}.json`);await fs.writeFile(file,bytes,{flag:'wx'});cases.push({size,seed,count:placement.targetCount,file,sha256:hash(bytes)});
 const ox=20+column*395,scale=.052,point=([x,y])=>[ox+187.5+(x-4000)*scale,237.5-(y-6000)*scale];
 svg.push(`<rect x="${ox}" y="60" width="375" height="355" fill="#1b2b36" stroke="#456"/><text x="${ox+12}" y="440" font-size="16">Seed ${index} / ${placement.targetCount} structures</text>`);
 for(const a of JSON.parse(l.metadata['forge.build-areas.v1']).filter(a=>a.id.startsWith('broken-ring-1-')))svg.push(`<polyline points="${a.points.map(p=>point(p).join(',')).join(' ')}" fill="none" stroke="#ac86da" stroke-width="${a.width*scale}" stroke-linecap="round" opacity=".4"/>`);
 for(const e of l.entities.filter(e=>e.team===1)){const [x,y]=point(e.position);assert.ok(x>=ox&&x<=ox+375&&y>=60&&y<=415);svg.push(`<circle cx="${x}" cy="${y}" r="4" fill="${colors[e.token]??'#ccc'}"/><text x="${x+6}" y="${y-3}" font-size="10">${e.token}</text>`);}
 }
 svg.push('<text x="20" y="468" font-size="12">Team 1 flat samples / symbols are building centers / purple: passage, frontage, loop and interior reservations / no gameplay or collision proof</text></svg>');
 const text=svg.join('');await fs.writeFile(path.join(out,`${size}.svg`),text);await sharp(Buffer.from(text)).png().toFile(path.join(out,`${size}.png`));
}
await fs.writeFile(path.join(out,'report.json'),JSON.stringify({passed:true,scope:'12 controlled flat visual representatives, seeds0/3/11 chosen to cover both elongation axes; through-route terrain matrix is separate',cases},null,2));
