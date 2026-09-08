import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {activateBaseLayout,synchronizeActiveBaseLayout,validateProject} from '../lib/wulfram.ts';
import {createMapArchive,readMapArchive} from '../lib/map-package.ts';

const source=path.resolve('outputs/base-count-map-pack-v2');
const out=path.resolve('outputs/base-count-layouts-v1');
assert.ok(!fs.existsSync(out),'Preserve previous output.');
const names=['01-light-17','02-standard-23','03-bastion-25','04-twin-courts-27','05-ringhold-34'];
const maps=names.map(name=>JSON.parse(fs.readFileSync(path.join(source,`${name}.json`),'utf8')));
const project=structuredClone(maps[0]);
project.name='Base Placement Comparison - Five Layouts';
project.baseLayouts=maps.map((map,index)=>{
  assert.deepEqual(map.terrain,project.terrain);
  return {id:names[index],name:map.name,entities:structuredClone(map.entities),validation:{...map.validation},metadata:{...map.metadata},updatedAt:map.updatedAt};
});
project.activeBaseLayoutId=names[0];
project.metadata={'tryout.status':'Five selectable base layout states on shared rectangular test terrain. See each layout metadata for provisional range assumptions.'};
synchronizeActiveBaseLayout(project);
const expected=JSON.parse(JSON.stringify(project.baseLayouts));
for(const id of [...names,...names.toReversed()]){
  activateBaseLayout(project,id);
  const original=maps[names.indexOf(id)];
  assert.deepEqual(project.entities,original.entities);
  assert.deepEqual(validateProject(project).filter(i=>i.severity==='error'),[]);
  assert.deepEqual(project.terrain,maps[0].terrain);
}
assert.deepEqual(project.baseLayouts,expected);
const archive=Buffer.from(await createMapArchive(project));
const entries=await readMapArchive(archive);
const reopened=JSON.parse(entries.find(e=>e.name.endsWith('/wulfram-project.json')).text);
assert.deepEqual(reopened.baseLayouts,expected);
assert.equal(reopened.activeBaseLayoutId,names[0]);
const collection=JSON.parse(entries.find(e=>e.name.endsWith('/base-layouts.json')).text);
assert.equal(collection.layouts.length,5);
for(const id of names){activateBaseLayout(reopened,id);assert.deepEqual(reopened.entities,maps[names.indexOf(id)].entities);}
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'Base-Placement-Five-Layouts.zip'),archive);
fs.writeFileSync(path.join(out,'Base-Placement-Five-Layouts.json'),JSON.stringify(project));
fs.writeFileSync(path.join(out,'README.md'),'# Five selectable base layouts\n\nImport Base-Placement-Five-Layouts.zip into the Map Editor. Base Layout States will contain Light Garrison (17 per team), Standard Garrison (23), Bastion Gate (25), Twin Service Courts (27), and Ringhold (34). The dropdown appends the total count for both teams. Switching layouts changes structures while preserving shared terrain.\n\nThese are the same placements from the comparison pack, including the revised Bastion Darklight. Range assumptions remain provisional; no game combat certification. Existing maps are untouched.\n');
console.log(JSON.stringify({out,layouts:expected.map(l=>({name:l.name,total:l.entities.length})),switchAndReopenChecks:'passed'},null,2));
