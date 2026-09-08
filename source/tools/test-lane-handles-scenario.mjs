import assert from 'node:assert/strict';

export async function testLaneHandles({evaluate,send,button,field,screenshot,snapshot,original}){
 const pause=()=>new Promise(r=>setTimeout(r,160));
 await field('Floor height',-500,'.terrain-lane-panel');
 await button('Path points (2)');
 const settings=()=>evaluate(`({points:[...document.querySelectorAll('.terrain-lane-panel input[aria-label^="Lane point"]')].map(e=>Number(e.value)),bend:Number(document.querySelector('[aria-label="Lane curve / bend"]').value)})`);
 const center=async label=>evaluate(`(()=>{const e=document.querySelector('[aria-label="'+${JSON.stringify(label)}+'"]');e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
 const down=p=>send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});
 const move=p=>send('Input.dispatchMouseEvent',{type:'mouseMoved',...p,button:'left',buttons:1});
 const up=p=>send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});
 const key=async(key,code)=>{for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key,code,windowsVirtualKeyCode:key==='Escape'?27:39});};
 const initial=await settings();
 // Deeply modified surface at the existing oblique camera: no-motion click
 // must not jump back to the original terrain under the preview.
 let p=await center('Drag lane point 1');await down(p);await up(p);await pause();assert.deepEqual(await settings(),initial);
 for(const cancel of ['escape','blur','pointercancel']){
   p=await center('Drag lane point 1');const q={x:p.x+25,y:p.y};await down(p);await move(q);await pause();
   assert.notDeepEqual((await settings()).points,initial.points);
   if(cancel==='escape')await key('Escape','Escape');
   if(cancel==='blur')await evaluate(`window.dispatchEvent(new Event('blur'))`);
   if(cancel==='pointercancel')await evaluate(`document.querySelector('[aria-label="Drag lane point 1"]').dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:1}))`);
   await up(q);await pause();assert.deepEqual(await settings(),initial);
 }
 p=await center('Drag lane point 1');const q={x:p.x+25,y:p.y};await down(p);await move(q);await up(q);await pause();
 const moved=await settings();assert.notDeepEqual(moved.points,initial.points);
 assert.ok(Math.hypot(moved.points[0]-initial.points[0],moved.points[1]-initial.points[1])<500,'Small drag must not jump across the map');
 await key('ArrowRight','ArrowRight');await pause();const nudged=await settings();assert.equal(nudged.points[0],moved.points[0]+10);assert.equal(nudged.points[1],moved.points[1]);
 p=await center('Drag lane bend');const b={x:p.x,y:p.y+25};await down(p);await move(b);await up(b);await pause();assert.notEqual((await settings()).bend,initial.bend);
 assert.deepEqual(await snapshot(),original);
 await screenshot('lane-handles-curved',true);
 await field('Floor height',25,'.terrain-lane-panel');await field('Curve / bend',0,'.terrain-lane-panel');
 const two=(await settings()).points;
 await button('Add lane point after 1');await pause();const inserted=(await settings()).points;assert.equal(inserted.length,6);
 assert.deepEqual(inserted.slice(0,2),two.slice(0,2));assert.deepEqual(inserted.slice(4),two.slice(2));
 for(let axis=0;axis<2;axis++)assert.ok(Math.abs(inserted[2+axis]-(two[axis]+two[2+axis])/2)<=.011,'Inserted point is the segment midpoint to displayed precision');
 // Coordinate edit then remove and reinsert proves ordered multi-point controls.
 await evaluate(`(()=>{const e=document.querySelector('[aria-label="Lane point 2 Y"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,String(Number(e.value)+100));e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
 await pause();const edited=(await settings()).points;assert.ok(Math.abs(edited[3]-inserted[3]-100)<1e-8);assert.deepEqual(edited.filter((_,i)=>i!==3),inserted.filter((_,i)=>i!==3));await button('Remove lane point 2');await pause();assert.equal((await settings()).points.length,4);
 await button('Add lane point after 1');await pause();const reinserted=(await settings()).points;
 await evaluate(`(()=>{const e=document.querySelector('[aria-label="Lane point 2 Y"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,String(Number(e.value)+100));e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
 await pause();const finalPoints=(await settings()).points;assert.equal(finalPoints.length,6);assert.ok(Math.abs(finalPoints[3]-reinserted[3]-100)<1e-8);assert.deepEqual(finalPoints.filter((_,i)=>i!==3),reinserted.filter((_,i)=>i!==3));assert.deepEqual(await snapshot(),original);
 await button('Path points (3)');await screenshot('lane-handles-polyline',true);
 return {displayedPoints:finalPoints,noMotionClick:true,smallDrag:true,escape:true,blur:true,pointerCancel:true,keyboardNudge:true,bendDrag:true,insertRemoveAndNumeric:true,previewReadOnly:true};
}
