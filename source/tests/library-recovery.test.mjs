import test from 'node:test';
import assert from 'node:assert/strict';
import {backupAndResetLibrary,latestLibraryBackup} from '../lib/library-recovery.ts';
const store=raw=>{const data=new Map([['library',raw]]);return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};};
test('recovery preserves original bytes and resets only the selected unchanged library',()=>{
 const raw='  broken JSON\n{',s=store(raw);s.data.set('map','keep');const backup=backupAndResetLibrary(s,'library',raw,'one');assert.equal(s.getItem(backup),raw);assert.equal(s.getItem('library'),'[]');assert.equal(s.getItem('map'),'keep');assert.equal(latestLibraryBackup(s,'library'),backup);
 assert.throws(()=>backupAndResetLibrary(s,'library','[]','one'),/already exists/);assert.equal(s.getItem(backup),raw);
});
test('quota, missing backup verification and changed data do not discard the original',()=>{
 const s=store('damaged');assert.throws(()=>backupAndResetLibrary(s,'library','older','a'),/changed/);assert.equal(s.getItem('library'),'damaged');
 assert.throws(()=>backupAndResetLibrary({...s,setItem:()=>{throw new Error('quota');}},'library','damaged','a'),/quota/);assert.equal(s.getItem('library'),'damaged');
 assert.throws(()=>backupAndResetLibrary({...s,setItem:()=>{}},'library','damaged','a'),/verified/);assert.equal(s.getItem('library'),'damaged');
 const changed={...s,setItem:(key,value)=>{s.setItem(key,value);if(key!=='library')s.setItem('library','newer');}};
 assert.throws(()=>backupAndResetLibrary(changed,'library','damaged','b'),/changed during backup/);assert.equal(s.getItem('library'),'newer');assert.equal(s.getItem('library-recovery-b'),'damaged');
});

test('a change during recovery reference write is retained instead of reset',()=>{
 const s=store('damaged');
 const racing={...s,setItem:(key,value)=>{s.setItem(key,value);if(key==='library-latest-recovery')s.setItem('library','newer');}};
 assert.throws(()=>backupAndResetLibrary(racing,'library','damaged','late'),/changed during recovery reference/);
 assert.equal(s.getItem('library'),'newer');assert.equal(s.getItem('library-recovery-late'),'damaged');
});
