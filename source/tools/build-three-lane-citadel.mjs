import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {instantiatePairedTemplate} from '../lib/paired-template.ts';
import {synchronizeActiveBaseLayout, validateProject, sampleSlopeDegrees, structureTerrainClearance, parseLand, parseState} from '../lib/wulfram.ts';
import {analyzeRotationalEntityPairs} from '../lib/balanced-map-analysis.ts';
import {paintTerrainTextureVertex} from '../lib/terrain-textures.ts';
import {createMapArchive, readMapArchive} from '../lib/map-package.ts';

// A separate authored map. No changes to Power Run or the editor's generators.
const out=path.resolve(process.argv[2]??'outputs/three-lane-citadel-v1');
assert.ok(!fs.existsSync(out),'Use a fresh output directory.');
const powerPath='outputs/canyon-citadel-central-outpost-v3/Canyon-Citadel-Power-Run-v3.zip';
const hash=b=>createHash('sha256').update(b).digest('hex');
const sourceHash=hash(fs.readFileSync(powerPath));
const source=JSON.parse(fs.readFileSync('outputs/canyon-citadel-central-outpost-v3/project.json'));
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json'));
const W=12800,H=6400,step=25,width=513,height=257;
const mirror=([x,y])=>[W-x,H-y];
const reverseMirror=p=>p.map(mirror).reverse();
const entrance=[[1000,3200],[1300,3600],[1800,3600]];
const top=[...entrance,[2000,2200],[2600,1300],[4000,1400],[5200,1200],[7600,1200],[8800,1400],[10200,1300],[10800,2200],[11000,2800],...reverseMirror(entrance).slice(1)];
const lanes=[{name:'Top',points:top},{name:'Mid',points:[...entrance,[2200,3200],[10600,3200],...reverseMirror(entrance)]},{name:'Bottom',points:reverseMirror(top)}];
const crossings=[[[3500,1364],[3500,5036]],[[9300,1364],[9300,5036]]];
// Each narrow link only joins one outer lane to mid; no central repair facility.
const flanks=[[[5550,1200],[6000,2250],[6200,3200]],[[7250,5200],[6800,4150],[6600,3200]]];
const distance=(x,y,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy;const t=den?Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/den)):0;return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);};
const lineDistance=(x,y,p)=>Math.min(...p.slice(1).map((b,i)=>distance(x,y,p[i],b)));
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
const placements=[];
const add=(role,token,x,y)=>placements.push({role,token,x,y});
const cells=(role,x,y)=>{add(`${role}-power`,'e',x,y);add(`${role}-backup`,'e',x-40,y);};
cells('base',650,3200);
add('main-base','u',470,3200);add('home-repair','r',600,3000);add('home-refuel','f',600,3400);
cells('base-guard',1550,3680);
add('base-tower-upper','L',1550,3400);add('base-tower-lower','L',1550,3800);
for(const [lane,y1,y2] of [['top',1109,1080],['mid',2980,2980],['bottom',5291,5320]]) {
  for(const [tier,x,y] of [['inner',3000,y1],['outer',4600,y2]]) {
    add(`${lane}-${tier}-tower`,'L',x,y);cells(`${lane}-${tier}`,x-140,y);
  }
}
const allPads=placements.flatMap(p=>[[p.x,p.y],mirror([p.x,p.y])]);
const terrain={width,height,worldWidth:W,worldHeight:H,skyName:'bluesky',heights:new Array(width*height).fill(0),textureIds:new Array(width*height).fill(0),tagmap:source.terrain.tagmap.slice(),tagmap2:['gbdirt001']};
const textureNames=new Array(width*height);
for(let i=0;i<=Math.floor(terrain.heights.length/2);i++) {
  const x=i%width*step,y=Math.floor(i/width)*step;
  const laneDistance=Math.min(...lanes.map(l=>lineDistance(x,y,l.points)));
  const crossDistance=Math.min(...crossings.map(p=>lineDistance(x,y,p)));
  const flankDistance=Math.min(...flanks.map(p=>lineDistance(x,y,p)));
  const padDistance=Math.min(...allPads.map(([px,py])=>Math.hypot(x-px,y-py)));
  const baseDistance=Math.min(Math.hypot(x-800,y-3200),Math.hypot(x-12000,y-3200));
  const reserve=Math.min(smooth(200,355,laneDistance),smooth(150,290,crossDistance),smooth(95,235,flankDistance),smooth(120,230,padDistance),smooth(620,820,baseDistance));
  // Low separators and short terrain lips, with flat full-width route reserves.
  let h=105*reserve;
  const wall=Math.min(Math.abs(x-1800),Math.abs(x-11000));
  if(Math.abs(y-3200)<650)h=Math.max(h,190*(1-smooth(60,160,wall))*reserve);
  h=Number(h.toFixed(6));
  const material=padDistance<110||baseDistance<530?'groundstruct001':laneDistance<195?'megadirt001':crossDistance<140||flankDistance<90?'4sand001':h>75?'olivesage001':'gbdirt001';
  terrain.heights[i]=h;terrain.heights[terrain.heights.length-1-i]=h;
  textureNames[i]=material;textureNames[textureNames.length-1-i]=material;
}
const tags=new Map(terrain.tagmap2.map((v,i)=>[v,i]));
for(let i=0;i<textureNames.length;i++){assert.ok(manifest.terrainTextures[textureNames[i]]);paintTerrainTextureVertex(terrain,i%width,Math.floor(i/width),textureNames[i],tags);}
const project={format:'wulfram-map-project',version:1,name:'Three Lane Citadel',metadata:{'moba.layout':JSON.stringify({worldSize:[W,H],baseAnchors:[[1000,3200],[11800,3200]],lanes,crossings,flanks,towersPerTeam:8,laneTowersPerTier:1,towerToken:'L',centralOutpost:false,sourcePowerRunSha256:sourceHash}),'moba.status':'Terrain and supported missile-launcher stand-ins only. No custom tower HP, minions, unlock sequence, Nexus or scripted victory. Live testing pending.'},terrain,entities:[],validation:{...source.validation},baseLayouts:[],activeBaseLayoutId:'default',updatedAt:new Date().toISOString()};
for(const team of [1,2])for(const p of placements){
  const template={id:p.role,name:p.role,sourceMap:'Three Lane Citadel',sourceState:'authored',sourceTeam:1,sourceWorldSize:[W,H],sourceAnchor:[0,0],unitCount:1,footprint:{width:100,height:100},units:[{token:p.token,offset:[0,0],groundOffset:0,rotation:[0,0,0],active:1}]};
  const placed=instantiatePairedTemplate(template,terrain,team===1?[p.x,p.y]:mirror([p.x,p.y]),team,1,team===1?0:Math.PI,manifest,undefined,()=>`team-${team}-${p.role}`);
  assert.equal(placed.skippedWithoutModel,0,p.role);assert.equal(placed.entities.length,1);project.entities.push(...placed.entities);
}
synchronizeActiveBaseLayout(project,project.updatedAt);project.baseLayouts[0].name='Three lanes / two tiers / paired base guards';
const issues=validateProject(project),pairing=analyzeRotationalEntityPairs(project,manifest);
assert.equal(issues.filter(i=>i.severity==='error').length,0,JSON.stringify(issues.filter(i=>i.severity==='error')));
assert.ok(pairing.passed,JSON.stringify(pairing));
for(const team of [1,2])assert.equal(project.entities.filter(e=>e.team===team&&e.token==='L').length,8);
assert.equal(project.entities.filter(e=>e.team===0).length,0);
assert.equal(project.entities.filter(e=>e.token==='r').length,2);
const radius=e=>structureTerrainClearance(e,manifest,18,0).footprint/Math.SQRT2;
const routes=[...lanes.map(l=>({...l,halfWidth:60})),...crossings.map((points,i)=>({name:`Crossover ${i+1}`,points,halfWidth:60})),...flanks.map((points,i)=>({name:`Flank ${i+1}`,points,halfWidth:35}))].map(route=>{
  let maximumSlope=0,minimumClearance=Infinity,length=0;
  for(let i=1;i<route.points.length;i++){
    const a=route.points[i-1],b=route.points[i],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);length+=len;
    if(!len)continue;
    for(let d=0;d<=len;d+=10){const x=a[0]+dx*d/len,y=a[1]+dy*d/len;
      for(const off of [-route.halfWidth,0,route.halfWidth])maximumSlope=Math.max(maximumSlope,sampleSlopeDegrees(terrain,x-dy*off/len,y+dx*off/len));
      for(const e of project.entities)minimumClearance=Math.min(minimumClearance,Math.hypot(x-e.position[0],y-e.position[1])-radius(e));
    }
  }
  return {name:route.name,length,maximumSlope,minimumClearance,sampledWidth:route.halfWidth*2,passed:maximumSlope<=22&&minimumClearance>=route.halfWidth};
});
assert.ok(routes.every(r=>r.passed),JSON.stringify(routes));
assert.ok(routes[0].length>routes[1].length&&routes[2].length>routes[1].length);
assert.ok(Math.abs(routes[0].length-routes[2].length)<1e-6);
for(let i=0;i<terrain.heights.length;i++)assert.equal(terrain.heights[i],terrain.heights[terrain.heights.length-1-i]);
const bytes=Buffer.from(await createMapArchive(project));
const entries=await readMapArchive(bytes);
const reopened=JSON.parse(entries.find(e=>e.name.endsWith('/wulfram-project.json')).text);
assert.deepEqual(reopened.terrain,terrain);assert.deepEqual(reopened.entities,JSON.parse(JSON.stringify(project.entities)));
const land=parseLand(entries.find(e=>e.name.endsWith('/land')).text);
assert.equal(land.worldWidth,W);assert.equal(land.worldHeight,H);assert.deepEqual(land.heights,terrain.heights);
assert.equal(parseState(entries.find(e=>e.name.endsWith('/state')).text).length,project.entities.length);
assert.equal(hash(fs.readFileSync(powerPath)),sourceHash);
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'Three-Lane-Citadel-v1.zip'),bytes);
fs.writeFileSync(path.join(out,'project.json'),JSON.stringify(project));
fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify({stage:'OFFLINE PLAYTEST CANDIDATE',pairing,issues,routes,archiveRoundTrip:true,powerRunUnchanged:true,limitations:'Sampled slope and model-radius checks are not live collision, line-of-sight, combat-strength or game-rule proof.'},null,2));
fs.writeFileSync(path.join(out,'SHA256SUMS.txt'),`${hash(bytes)}  Three-Lane-Citadel-v1.zip\n`);
// Overview generated from these exact route and entity coordinates.
const svg=[`<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="850" viewBox="0 0 1440 850"><rect width="1440" height="850" fill="#101820"/><g font-family="Segoe UI,Arial" fill="#e8edf1"><text x="64" y="47" font-size="29" font-weight="700">THREE LANE CITADEL</text><text x="64" y="77" font-size="17" fill="#aebfc7">Rectangular terrain · 12,800 × 6,400 units · 8 towers per team · no central outpost</text></g><g transform="translate(80 110) scale(.1)"><rect width="12800" height="6400" fill="#354636"/>`];
for(let gy=0;gy<height-1;gy+=4)for(let gx=0;gx<width-1;gx+=4){const h=terrain.heights[gy*width+gx];if(h>10)svg.push(`<rect x="${gx*25}" y="${gy*25}" width="100" height="100" fill="${h>120?'#697368':h>75?'#516047':'#46523d'}"/>`);}
const poly=(points,color,w,dash='')=>svg.push(`<polyline points="${points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" ${dash?`stroke-dasharray="${dash}"`:''}/>`);
for(const l of lanes)poly(l.points,'#c4b694',280);
for(const p of crossings)poly(p,'#93a7a0',190);
for(const p of flanks)poly(p,'#d3c47d',110,'90 70');
for(const e of project.entities){const [x,y]=e.position,c=e.team===1?'#f47d70':'#63b6f1';if(e.token==='L')svg.push(`<circle cx="${x}" cy="${y}" r="112" fill="${c}" stroke="#101820" stroke-width="25"/><path d="M${x-45} ${y+45} L${x} ${y-55} L${x+45} ${y+45}Z" fill="#101820"/>`);else if(e.token==='u')svg.push(`<rect x="${x-140}" y="${y-190}" width="280" height="380" rx="45" fill="${c}" stroke="#101820" stroke-width="25"/>`);}
svg.push('</g><g font-family="Segoe UI,Arial" text-anchor="middle" font-size="17" fill="#ffffff"><text x="720" y="210">TOP LANE</text><text x="720" y="455">MID LANE</text><text x="720" y="692">BOTTOM LANE</text><text x="142" y="405">BASE A</text><text x="1298" y="488">BASE B</text></g><g font-family="Segoe UI,Arial" font-size="16" fill="#bdcbd2"><text x="80" y="787">▲ Missile-launcher tower stand-in</text><text x="440" y="787">Gray: team-side crossovers</text><text x="790" y="787">Dashed: narrow flank links</text><text x="80" y="819">Exact layout overview · support power and home services omitted here for clarity · live playtest pending</text></g></svg>');
fs.writeFileSync(path.join(out,'layout.svg'),svg.join('\n'));
fs.writeFileSync(path.join(out,'README.md'),`# Three Lane Citadel — v1\n\nSeparate rectangular map; Power Run SHA-256 remained ${sourceHash}.\n\n- Opposing end bases, three routes, two crossover areas and two narrow center flank links.\n- Each team: two main-base guard towers, one inner and one outer tower per lane (8 per team, 16 total).\n- Towers are supported native missile launchers (L), each lane tower with local primary/backup power. No custom health or damage has been set.\n- Main bases contain uplink, powered repair/refuel and primary/backup power. No central repair outpost or neutral entities.\n- The uplink marks the main base; it is not a scripted Nexus.\n\nImport Three-Lane-Citadel-v1.zip in the map editor, or open project.json. layout.svg shows the exact layout. validation.json contains structure validation, rotational pairing, three 120-unit-wide route samples, crossover/flank checks and archive roundtrip checks.\n\nRequirements: compatible Wulfram map editor/client and normal native map loading. The 513 × 257 rectangular grid, collision, tower targeting/strength, base sightlines and multiplayer balance still need native playtesting. This map does not implement minions, tower invulnerability/progression or custom victory rules.\n`);
console.log(JSON.stringify({out,entities:project.entities.length,towers:16,pairing,routes},null,2));
