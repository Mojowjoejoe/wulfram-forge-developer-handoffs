import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const file=process.argv[2];if(!file)throw new Error('Pass the native report path.');
const sha=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
const native=JSON.parse(await fs.readFile(file,'utf8')),audit={passed:false,report:file,reportSha256:await sha(file),artifacts:[]};
try{
 assert.equal(native.passed,true);assert.equal(await sha(native.executable),native.executableSha256);
 const scope=native.valleyPockets,sizes=['small','standard','large','massive'];
 const counted=scope.layouts.some(l=>l.expanded===true);
 assert.deepEqual(scope.layouts.map(l=>l.size),counted?[...sizes,...sizes]:sizes);
 if(counted){assert.deepEqual(scope.layouts.map(l=>[l.size,l.expanded,l.targetCount]),[false,true].flatMap(expanded=>sizes.map(size=>[size,expanded,{small:10,standard:15,large:20,massive:30}[size]+(expanded?4:0)])));assert.equal(scope.impossibleCountUnchanged,true);assert.deepEqual(scope.layouts.map(l=>l.expanded),[false,false,false,false,true,true,true,true]);}
 const defaults=new Map();
 for(const item of [{copy:scope.gui.copy},...scope.layouts,...(scope.portable?[{copy:scope.portable.copy}]:[])]){
  const project=JSON.parse(await fs.readFile(item.copy,'utf8')),layout=project.baseLayouts.find(l=>l.id===project.activeBaseLayoutId);
  const record=JSON.parse(layout.metadata[`formation.valleyPockets.${layout.id}`]);
  if(counted){
   const target=item.targetCount??24,generated=layout.entities.filter(e=>record.entityIds.includes(e.id));
   assert.equal(new Set(record.entityIds).size,target*2);assert.equal(generated.length,target*2);
   for(const team of [1,2])assert.equal(generated.filter(e=>e.team===team).length,target);
   assert.equal(record.placement.targetCount,target);
   if(item.expanded===false)defaults.set(item.size,{layout,record});
   if(item.expanded===true){
    const base=defaults.get(item.size);assert.ok(base);
    const minimum={small:10,standard:15,large:20,massive:30}[item.size];assert.equal(target,minimum+4);
    assert.deepEqual(record.serviceRoutes,base.record.serviceRoutes);assert.deepEqual(record.shifts,base.record.shifts);
    assert.deepEqual(record.plan.passage,base.record.plan.passage);
    assert.deepEqual(record.plan.sites.map(s=>({center:s.center,frontage:s.frontage})),base.record.plan.sites.map(s=>({center:s.center,frontage:s.frontage})));
    for(const team of [1,2])for(let i=0;i<target;i++){
     const entity=generated.find(e=>e.id===`${layout.id}-${team}-${i}`);assert.ok(entity);
     if(i<minimum){const original=base.layout.entities.find(e=>e.id===`${base.layout.id}-${team}-${i}`);assert.ok(original);assert.deepEqual({...entity,id:''},{...original,id:''});}
     else assert.ok(['g','s','L'].includes(entity.token));
    }
   }
   assert.equal(layout.metadata['formation.version'],item.expanded===false?'valley-pockets-v1':'valley-pockets-v2');
  }
  assert.equal(record.serviceRoutes.length,2);assert.equal(new Set(record.serviceRoutes.map(r=>r.unitIndex)).size,2);
  const expected=[1,2].flatMap(team=>record.serviceRoutes.map(r=>`${layout.id}-${team}-${r.unitIndex}`));
  assert.equal(new Set(expected).size,4);
  assert.deepEqual(expected.sort((a,b)=>a.localeCompare(b)),layout.entities.filter(e=>record.entityIds.includes(e.id)&&['r','f'].includes(e.token)).map(e=>e.id).sort((a,b)=>a.localeCompare(b)));
  const access=JSON.parse(layout.metadata['formation.access']);assert.deepEqual(access.blocked,[]);
  audit.artifacts.push({path:item.copy,sha256:await sha(item.copy),uniquePads:expected});
  if(item.zip)audit.artifacts.push({path:item.zip,sha256:await sha(item.zip)});
 }
 if(scope.portable){
  for(const flag of ['captureReadOnly','destinationFixtureExact','independentTransformedCoordinates','guiMcpRecipeMatch','previewReadOnly','applyUndo','staleRejected','recapture'])assert.equal(scope.portable[flag],true,flag);
  const library=JSON.parse(await fs.readFile(scope.portable.package,'utf8'));assert.equal(library.version,7);assert.equal(library.bases.length,1);assert.equal(library.bases[0].valleyRecipe.targetCount,24);
  audit.artifacts.push({path:scope.portable.package,sha256:await sha(scope.portable.package)});
 }
 audit.passed=true;
}catch(error){audit.error=error.stack;process.exitCode=1;}
await fs.writeFile(path.join(path.dirname(file),'valley-pockets-artifact-audit.json'),JSON.stringify(audit,null,2));console.log(JSON.stringify(audit,null,2));
