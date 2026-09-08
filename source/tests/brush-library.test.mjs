import assert from 'node:assert/strict';
import test from 'node:test';
import {readBrushLibrary,saveBrush,mergeBrushLibraries} from '../lib/brush-library.ts';
const settings={tool:'stamp',radius:450,strength:100,shape:'square',falloff:'hard',targetHeight:42,texture:'1snow001'};
const entry={name:'Flat site',settings};
test('brush presets round trip every control and strip unrelated map data',()=>{
 const source={...entry,selection:{x:100,y:200},settings:{...settings,entities:['untrusted']}};
 assert.deepEqual(readBrushLibrary(JSON.stringify({format:'wulfram-brush-library',version:1,entries:[source]})),[entry]);
 for(const key of ['radius','strength','targetHeight'])assert.throws(()=>readBrushLibrary(JSON.stringify([{...entry,settings:{...settings,[key]:null}}])));
 for(const bad of [{tool:'landform'},{shape:'triangle'},{falloff:'other'},{radius:601},{strength:0},{targetHeight:5001},{texture:''}])assert.throws(()=>readBrushLibrary(JSON.stringify([{...entry,settings:{...settings,...bad}}])));
 assert.throws(()=>readBrushLibrary(JSON.stringify({format:'wulfram-brush-library',version:2,entries:[entry]})));
});
test('explicit rename, import collisions and capacity failures preserve source libraries',()=>{
 const source=[structuredClone(entry)],original=structuredClone(source);
 assert.throws(()=>saveBrush(source,entry));
 const renamed=saveBrush(source,{name:'Plateau',settings},entry.name);
 assert.equal(renamed[0].name,'Plateau');
 assert.deepEqual(mergeBrushLibraries(source,[entry]),source);
 assert.throws(()=>mergeBrushLibraries(source,[{...entry,settings:{...settings,radius:200}}]));
 assert.throws(()=>saveBrush(source,entry,'Missing'));
 const full=Array.from({length:30},(_,i)=>({name:`Brush ${i}`,settings}));
 assert.throws(()=>mergeBrushLibraries(full,[entry]));assert.equal(full.length,30);
 assert.deepEqual(source,original);
 assert.throws(()=>readBrushLibrary('broken data'));
});
