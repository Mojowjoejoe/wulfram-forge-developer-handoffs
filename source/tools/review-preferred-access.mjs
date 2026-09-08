import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {checkFormationAccess} from '../lib/formation-access.ts';
import {formationRouteSummary} from '../lib/formation-route-summary.ts';
const directory=process.argv[2];assert.ok(directory,'Native matrix directory required');
const native=JSON.parse(await fs.readFile(path.join(directory,'report.json'),'utf8'));assert.equal(native.passed,true);
const manifest=JSON.parse(await fs.readFile('public/assets/manifest.json','utf8')),cases=[];
for(const item of native.offsetMatrix??native.frontierMatrix){
 const file=path.join(directory,`matrix-${item.terrain}-${item.size}.json`),raw=await fs.readFile(file,'utf8'),project=JSON.parse(raw),layout=project.baseLayouts.find(l=>l.id===project.activeBaseLayoutId);
 const before=formationRouteSummary(project,manifest,layout),access=checkFormationAccess(project,manifest),updated={...layout,metadata:{...layout.metadata,'formation.access':JSON.stringify(access)}},after=formationRouteSummary(project,manifest,updated);
 assert.equal(await fs.readFile(file,'utf8'),raw);cases.push({terrain:item.terrain,size:item.size,clearance:access.clearance,before,after});
}
const report={sourceDirectory:directory,scope:'Recomputed routes on unchanged native v46 layouts; no new native generation proof.',cases};
await fs.writeFile('outputs/preferred-access-v49-review.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(cases.map(c=>({terrain:c.terrain,size:c.size,clearance:c.clearance,before:c.before.tight,after:c.after.tight,blocked:c.after.blocked})),null,2));
