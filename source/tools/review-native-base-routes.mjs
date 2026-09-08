import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readBuildAreas,checkBuildAreas,BUILD_AREAS_KEY} from '../lib/build-areas.ts';
import {routeClearance,routeLength} from '../lib/route-inspection.ts';
import {formationRouteSummary} from '../lib/formation-route-summary.ts';

const directory=path.resolve(process.argv[2]??'');
assert.ok(process.argv[2],'Provide a completed native family-matrix receipt directory.');
const native=JSON.parse(await fs.readFile(path.join(directory,'report.json'),'utf8'));
assert.equal(native.passed,true,'Native matrix must have completed successfully.');
const cases=native.offsetMatrix??native.frontierMatrix;
assert.equal(cases?.length,12,'Expected all four sizes and three terrains.');
assert.equal(new Set(cases.map(c=>`${c.terrain}-${c.size}`)).size,12);
const manifest=JSON.parse(await fs.readFile('public/assets/manifest.json','utf8'));
const report={nativeReceipt:path.join(directory,'report.json'),vehicleWidth:80,limits:'Editor circle clearances and sampled slopes only. Reserved paths and automatic service routes are reviewed separately; neither proves game traversal.',cases:[]};
for(const item of cases){
 const file=path.join(directory,`matrix-${item.terrain}-${item.size}.json`),raw=await fs.readFile(file,'utf8'),project=JSON.parse(raw);
 const layout=project.baseLayouts.find(l=>l.id===project.activeBaseLayoutId);
 assert.ok(layout);assert.deepEqual(project.entities,layout.entities);
 const areas=readBuildAreas(layout.metadata[BUILD_AREAS_KEY]);assert.equal(areas.length,2);
 const areaIssues=checkBuildAreas(areas,layout.entities,project.terrain.worldWidth,project.terrain.worldHeight,manifest);
 const reserved=areas.map(area=>{assert.equal(area.kind,'corridor');const markers=routeClearance(project,manifest,area.points,80,false);return {id:area.id,width:area.width,length:routeLength(area.points),blocked:markers.filter(m=>m.severity==='blocked').length,tight:markers.filter(m=>m.severity==='tight').length,markers};});
 const automatic=formationRouteSummary(project,manifest,layout);
 report.cases.push({terrain:item.terrain,size:item.size,countPerTeam:item.countPerTeam,sourceSha256:createHash('sha256').update(raw).digest('hex'),areaIssues,reserved,automatic});
 assert.equal(await fs.readFile(file,'utf8'),raw,'Review must not alter saved maps.');
}
report.summary={cases:report.cases.length,reservationIssueCases:report.cases.filter(c=>c.areaIssues.length).length,reservedBlockedCases:report.cases.filter(c=>c.reserved.some(r=>r.blocked)).length,reservedTightCases:report.cases.filter(c=>c.reserved.some(r=>r.tight)).length,automaticBlockedCases:report.cases.filter(c=>c.automatic.blocked).length,automaticTightCases:report.cases.filter(c=>c.automatic.tight).length,automaticUnavailableCases:report.cases.filter(c=>c.automatic.unavailable).length};
await fs.writeFile(path.join(directory,'route-review.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report.summary,null,2));
