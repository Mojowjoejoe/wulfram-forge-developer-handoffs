import fs from 'node:fs/promises';
import {buildBaseLibrary} from '../lib/base-library.ts';
import {ADVANCED_BASE_TEMPLATES} from '../lib/advanced-base-templates.ts';
import {COMBAT_BASE_TEMPLATE} from '../lib/combat-base-template.ts';
const manifest=JSON.parse(await fs.readFile('public/assets/manifest.json','utf8'));
const source=JSON.parse(await fs.readFile('public/assets/base-templates.json','utf8')).templates;
const templates=[...ADVANCED_BASE_TEMPLATES,...source.filter(t=>t.id!==COMBAT_BASE_TEMPLATE.id&&!ADVANCED_BASE_TEMPLATES.some(a=>a.id===t.id)),COMBAT_BASE_TEMPLATE];
const samples=Object.fromEntries(['small','standard','large','massive'].map(size=>[size,buildBaseLibrary(templates,[],manifest,size).map(e=>({key:e.key,name:e.name,category:e.category,sourceMap:e.template?.sourceMap,modeledCount:e.modeledCount,power:e.power,services:e.services,defenses:e.defenses,darklights:e.concealment,traits:e.traits,footprint:e.template?.footprint,error:e.error}))]));
const groups=new Map();
for(const t of templates){const signature=JSON.stringify(t.units.map(u=>JSON.stringify([u.token,u.subtype??null,u.offset,u.groundOffset,u.rotation,u.active])).sort());const group=groups.get(signature)||[];group.push(t.id);groups.set(signature,group);}
const report={schema:'forge-base-library-inventory-v1',sourceTemplates:source.length,availableTemplates:templates.length,creativeFamilies:samples.large.filter(e=>e.category==='Creative').length,exactUnitRecordDuplicates:[...groups.values()].filter(g=>g.length>1),samples,limits:'Traits describe deterministic samples. Exact duplicates compare sorted complete known unit records, not visual similarity or gameplay equivalence. Favorites are user data and excluded.'};
await fs.mkdir('outputs',{recursive:true});await fs.writeFile('outputs/base-library-inventory-v34.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({availableTemplates:report.availableTemplates,creativeFamilies:report.creativeFamilies,samples:Object.values(samples).reduce((n,list)=>n+list.length,0),exactUnitRecordDuplicates:report.exactUnitRecordDuplicates,errors:Object.values(samples).flat().filter(e=>e.error).length}));
