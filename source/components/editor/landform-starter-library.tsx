'use client';
import {useMemo,useState} from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {TERRAIN_STARTER_PRESETS} from '@/lib/terrain-stamp-presets';
import {terrainStampWeight,type TerrainStampOptions} from '@/lib/terrain-stamp';

const descriptions:Record<string,string>={
 'Mountain Ridge':'A narrow raised crest with a curved shoulder.',
 'Winding Valley':'A winding depression for a low route.',
 'Impact Crater':'A depressed center surrounded by a raised rim.',
 'Gentle Foothills':'Low rolling relief with broad blended edges.',
 'Mountain Pass':'Two shoulders with a lower route between them.',
 'Flat-top Mesa':'A broad raised top with sloped sides. Level on flat starting terrain.',
 'Broad Basin':'A broad lowered floor with sloped sides. Level on flat starting terrain.',
};
function Preview({options}:{options:Omit<TerrainStampOptions,'x'|'y'>}){
 const polygons=useMemo(()=>{
  const n=16,settings={...options,x:0,y:0};
  const point=(x:number,y:number)=>{const h=terrainStampWeight((x/n-.5)*options.length!,(y/n-.5)*options.width!,settings);return {x:100+(x-y)*5.3,y:24+(x+y)*2.4-h*25,h};};
  return Array.from({length:n*n},(_,i)=>{const x=i%n,y=Math.floor(i/n),corners=[point(x,y),point(x+1,y),point(x+1,y+1),point(x,y+1)],h=corners.reduce((s,p)=>s+p.h,0)/4;return {points:corners.map(p=>`${p.x},${p.y}`).join(' '),fill:h<0?`hsl(202 35% ${32+h*12}%)`:`hsl(32 35% ${35+h*32}%)`};});
 },[options]);
 return <svg viewBox="0 0 200 115" aria-hidden="true">{polygons.map((p,i)=><polygon key={i} points={p.points} fill={p.fill} stroke="#172027" strokeWidth=".25"/>)}</svg>;
}
export function LandformStarterLibrary({onChoose}:{onChoose:(preset:typeof TERRAIN_STARTER_PRESETS[number])=>void}){
 const [open,setOpen]=useState(false),[search,setSearch]=useState('');
 const shown=TERRAIN_STARTER_PRESETS.filter(p=>(p.name+' '+descriptions[p.name]).toLowerCase().includes(search.trim().toLowerCase()));
 return <><button className="secondary-action" type="button" onClick={()=>setOpen(true)}>Browse landform brushes · {TERRAIN_STARTER_PRESETS.length}</button>
 <Dialog open={open} onOpenChange={setOpen}><DialogContent className="landform-library-dialog"><DialogHeader><DialogTitle>Landform brushes</DialogTitle><DialogDescription>Choose a brush, then hover over your map to preview placement. Cards show the height profile on flat ground; your terrain is changed only when you place it.</DialogDescription></DialogHeader>
 <label>Find a landform<input aria-label="Find a landform" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ridge, basin, pass…"/></label>
 <div className="landform-starter-grid">{shown.map(p=><button type="button" key={p.name} onClick={()=>{onChoose(p);setOpen(false);}} aria-label={`Use ${p.name}`}><Preview options={p.options}/><strong>{p.name}</strong><span>{descriptions[p.name]}</span></button>)}</div>
 {!shown.length&&<output>No matching landforms.</output>}
 </DialogContent></Dialog></>;
}
