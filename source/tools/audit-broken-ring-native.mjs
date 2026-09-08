import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const input=path.resolve(process.argv[2]);
const sha=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
const r=JSON.parse(await fs.readFile(input,'utf8'));
assert.equal(r.passed,true);assert.equal(await sha(r.executable),r.executableSha256);
assert.equal(r.brokenRingGui.experimentalCard,true);assert.equal(r.brokenRingGui.fiveBands,true);assert.equal(r.brokenRingGui.previewUnchanged,true);assert.equal(r.brokenRingGui.applyUndo,true);
assert.deepEqual(r.brokenRingLayouts.map(l=>l.arrangement),['small','standard','large','massive']);
const copies=[];
for(const row of r.brokenRingLayouts){
 for(const key of ['previewUnchanged','previewApplyGeometry','preservedLayouts','duplicateRejected','staleRejected','undo','reopened','zipReopened'])assert.equal(row[key],true);
 const p=JSON.parse(await fs.readFile(row.copy,'utf8')),layout=p.baseLayouts.find(l=>l.id===p.activeBaseLayoutId);
 const areas=JSON.parse(layout.metadata['forge.build-areas.v1']),access=JSON.parse(layout.metadata['formation.brokenRingAccess']);
 assert.deepEqual(areas.map(a=>a.id).sort(),[1,2].flatMap(t=>[0,1,2,3,4].map(i=>`broken-ring-${t}-${i}`)).sort());
 assert.deepEqual(access.routes.map(r=>r.id).sort(),[1,2].flatMap(t=>[0,1,2,3].map(i=>`broken-ring-${t}-${i}`)).sort());
 for(const route of access.routes){assert.deepEqual(route.points,areas.find(a=>a.id===route.id).points);assert.ok(!route.markers.some(m=>m.severity==='blocked'));}
 copies.push({path:row.copy,sha256:await sha(row.copy)});
}
const out=path.join(path.dirname(input),'broken-ring-route-audit.json');
await fs.writeFile(out,JSON.stringify({passed:true,receipt:input,receiptSha256:await sha(input),executableSha256:r.executableSha256,copies,scope:'Exact all-team route coverage audited from native saved copies. Native workflow flags are receipt assertions; no portability or gameplay acceptance.'},null,2));
console.log(out);
