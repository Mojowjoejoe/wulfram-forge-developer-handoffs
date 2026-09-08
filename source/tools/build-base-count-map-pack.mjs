import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {ADVANCED_BASE_PRESETS} from '../lib/advanced-base-templates.ts';
import {instantiatePairedTemplate} from '../lib/paired-template.ts';
import {synchronizeActiveBaseLayout,validateProject,structureTerrainClearance} from '../lib/wulfram.ts';
import {analyzeRotationalEntityPairs} from '../lib/balanced-map-analysis.ts';
import {createMapArchive,readMapArchive} from '../lib/map-package.ts';

const out=path.resolve('outputs/base-count-map-pack-v2');
assert.ok(!fs.existsSync(out),'Use a new output version to preserve previous maps.');
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json','utf8'));
const bastion=ADVANCED_BASE_PRESETS[0];
function subset(name,filter){const p=structuredClone(bastion);p.template.name=name;p.template.units=p.template.units.filter(filter);p.template.unitCount=p.template.units.length;return p;}
const variants=[
  {id:'01-light-17',name:'Light Garrison',preset:subset('Light Garrison',(u,i)=>!['p','d'].includes(u.token)&&!([7,5,13,16,20,23].includes(i)))},
  {id:'02-standard-23',name:'Standard Garrison',preset:subset('Standard Garrison',u=>!['p','d'].includes(u.token))},
  {id:'03-bastion-25',name:'Bastion Gate',preset:bastion},
  {id:'04-twin-courts-27',name:'Twin Service Courts',preset:ADVANCED_BASE_PRESETS[2]},
  {id:'05-ringhold-34',name:'Ringhold',preset:ADVANCED_BASE_PRESETS[3]},
];
const expected=[17,23,25,27,34],receipts=[],files=[];
const distance=(a,b)=>Math.hypot(a.position[0]-b.position[0],a.position[1]-b.position[1]);
for(const [index,v] of variants.entries()){
  const t=structuredClone(v.preset.template);t.id=v.id;
  // Place Bastion's Darklight inside its service court, between the uplink and cells.
  // This protects support assets even under the smallest historical radius estimate.
  if(v.id==='03-bastion-25')t.units.find(u=>u.token==='d').offset=[-570,0];
  assert.equal(t.unitCount,expected[index]);
  const p={format:'wulfram-map-project',version:1,name:`${v.name} - ${t.unitCount} per team`,
    terrain:{width:161,height:97,worldWidth:8000,worldHeight:4800,skyName:'bluesky',heights:Array(161*97).fill(0),textureIds:Array(161*97).fill(0),tagmap:['gbdirt001'],tagmap2:['gbdirt001']},
    entities:[],validation:{serviceRadius:280,backupRadius:80,maxSlopeDegrees:22,minSpacing:8},baseLayouts:[],activeBaseLayoutId:'default',updatedAt:new Date().toISOString(),
    metadata:{'tryout.status':'Flat rectangular placement comparison. No gameplay balance or current-server range certification.','tryout.variant':v.id,'tryout.power':'Provisional 280-unit radius minus 10-unit margin. Backup activation range remains unverified.','tryout.darklight':'Partial concealment only; historical radii conflict. See validation.json.'}};
  for(const team of [1,2]){let n=0;const r=instantiatePairedTemplate(t,p.terrain,team===1?[1800,2400]:[6200,2400],team,1,team===1?0:Math.PI,manifest,undefined,()=>`${v.id}-${team}-${n++}`);assert.equal(r.skippedWithoutModel,0);assert.equal(r.scale,1);p.entities.push(...r.entities);}
  synchronizeActiveBaseLayout(p);p.baseLayouts[0].name=p.name;
  const issues=validateProject(p);assert.deepEqual(issues.filter(i=>i.severity==='error'),[]);
  assert.ok(analyzeRotationalEntityPairs(p,manifest).passed);
  const radii=new Map(p.entities.map(e=>[e.id,structureTerrainClearance(e,manifest,0,0).footprint/Math.SQRT2]));
  let minimumFootprintGap=Infinity,maximumSecondCellDistance=0;
  for(const team of [1,2]){
    const es=p.entities.filter(e=>e.team===team),cells=es.filter(e=>e.token==='e');
    for(let i=0;i<es.length;i++)for(let j=i+1;j<es.length;j++){const gap=distance(es[i],es[j])-radii.get(es[i].id)-radii.get(es[j].id);minimumFootprintGap=Math.min(minimumFootprintGap,gap);assert.ok(gap>=8,'Model footprint clearance');}
    for(const e of es.filter(e=>['g','s','L','r','f','u'].includes(e.token))){const ds=cells.map(c=>distance(c,e)).sort((a,b)=>a-b);assert.ok(ds[1]<=270,'Two cells must be geometrically within provisional power margin');maximumSecondCellDistance=Math.max(maximumSecondCellDistance,ds[1]);}
  }
  const teamOne=p.entities.filter(e=>e.team===1),darklights=teamOne.filter(e=>e.token==='d');
  const count=Object.fromEntries([...new Set(teamOne.map(e=>e.token))].map(token=>[token,teamOne.filter(e=>e.token===token).length]));
  const concealment=[150,180,210].map(radius=>({radius,otherStructuresCovered:teamOne.filter(e=>e.token!=='d'&&darklights.some(d=>distance(d,e)<=radius)).length,otherStructuresTotal:teamOne.filter(e=>e.token!=='d').length}));
  if(darklights.length){
    for(const e of teamOne.filter(e=>['r','f','u'].includes(e.token)||e.token==='e'&&e.position[0]<1800))assert.ok(darklights.some(d=>distance(d,e)<=150),'Bastion service court must fit the provisional 150-unit Darklight radius');
  }
  const bytes=Buffer.from(await createMapArchive(p)),entries=await readMapArchive(bytes);
  const reopened=JSON.parse(entries.find(e=>e.name.endsWith('/wulfram-project.json')).text);
  assert.deepEqual(reopened.entities,JSON.parse(JSON.stringify(p.entities)));assert.deepEqual(reopened.terrain,p.terrain);assert.deepEqual(reopened.validation,p.validation);
  files.push([`${v.id}.zip`,bytes],[`${v.id}.json`,JSON.stringify(p)]);
  receipts.push({id:v.id,name:v.name,perTeam:t.unitCount,total:p.entities.length,countsPerTeam:count,errors:0,warnings:issues.filter(i=>i.severity!=='error'),rotationalPairing:true,archiveRoundTrip:true,minimumFootprintGap,maximumSecondCellDistance,darklightSensitivity:concealment});
}
const columns=['e','g','s','L','r','f','u','p','d'];
const csv=['Map,Per team,Total,Power Cells,Gun Turrets,Flak Turrets,Missile Launchers,Repair,Refuel,Uplink,Skypump,Darklight',...receipts.map(r=>[r.name,r.perTeam,r.total,...columns.map(k=>r.countsPerTeam[k]??0)].join(','))].join('\n');
const readme=`# Base placement comparison maps\n\nFive separate maps with equal, rotationally mirrored opposing teams. Counts include every placed structure, including power and support units; they are not tank or minion counts.\n\n| Map | Structures per team | Total |\n|---|---:|---:|\n${receipts.map(r=>`| ${r.name} | ${r.perTeam} | ${r.total} |`).join('\n')}\n\nOpen an individual map ZIP using the Map Editor's map import/open control, or load its matching project JSON. Extract this outer pack first. The editor executable is not included.\n\nAll maps use the same flat 8,000 by 4,800 world-unit rectangle. Bases face each other from the left and right ends. This isolates formation/count differences for comparison; these are test ranges with no authored lanes, central outpost, waves, or scripted victory conditions. Existing Power Run and Citadel maps are preserved.\n\nLight and Standard are reduced Bastion formations. Bastion retains its Skypump and one Darklight per team. Twin Courts has two logistics courts; Ringhold has four districts. See comparison.csv for exact structure counts.\n\nValidation: archive reopen preserves entities, terrain, and settings; rotational team pairing and model footprint separation pass. Powered support/defense structures lie within 270 units of two friendly cells, using a provisional 280-unit power radius minus a 10-unit margin. This is geometric redundancy, not proof of standby activation: the editor's 80-unit backup rule remains unverified against the game.\n\nDarklight coverage is partial in Bastion, not base-wide. validation.json reports how many other structures are within 150, 180, and 210 units. Those are conflicting historical estimates, not confirmed server settings. Turret firing coverage, line of sight, explosion safety, movement, standby activation, and gameplay balance have not been tested in the game.\n\nNo existing project or live editor session was changed.\n`;
files.push(['README.md',readme],['comparison.csv',csv],['validation.json',JSON.stringify(receipts,null,2)]);
const pack=new JSZip();for(const [name,data] of files)pack.file(name,data);
const packed=await pack.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
const reopenedPack=await JSZip.loadAsync(packed);for(const [name,data] of files)assert.deepEqual(await reopenedPack.file(name).async('nodebuffer'),Buffer.from(data));
fs.mkdirSync(out,{recursive:true});for(const [name,data] of files)fs.writeFileSync(path.join(out,name),data);
fs.writeFileSync(path.join(out,'Base-Placement-Comparison-v1.zip'),packed);
console.log(JSON.stringify({out,maps:receipts.map(({name,perTeam,total,countsPerTeam,maximumSecondCellDistance,darklightSensitivity})=>({name,perTeam,total,countsPerTeam,maximumSecondCellDistance,darklightSensitivity})),packBytes:packed.length},null,2));
