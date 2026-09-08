import { DISTRICTS_KEY, readDistricts } from './base-districts.ts';
import { catalogFor, structureTerrainClearance, type AssetManifest, type WulframProject } from './wulfram.ts';

/** Check the entire proposed transaction before committing any part of it. */
export function assertDistrictLocks(before: WulframProject, after: WulframProject, manifest?: AssetManifest, allowUnlock=false) {
  for(const layout of before.baseLayouts){
    const groups=readDistricts(layout.metadata[DISTRICTS_KEY]).filter(g=>g.locked);
    if(!groups.length)continue;
    const nextLayout=after.baseLayouts.find(l=>l.id===layout.id);
    if(!nextLayout)throw new Error(`Unlock districts in ${layout.name} before removing that layout.`);
    const nextGroups=readDistricts(nextLayout.metadata[DISTRICTS_KEY]);
    const source=layout.id===before.activeBaseLayoutId?before.entities:layout.entities;
    const target=layout.id===after.activeBaseLayoutId?after.entities:nextLayout.entities;
    for(const group of groups){
      const next=nextGroups.find(g=>g.id===group.id);
      const fail=()=>{throw new Error(`District “${group.name}” is locked. Unlock it in Base Workshop before changing its buildings or supporting terrain.`);};
      if(!next||(!next.locked&&!allowUnlock)||next.entityIds.length!==group.entityIds.length||group.entityIds.some(id=>!next.entityIds.includes(id)))fail();
      for(const id of group.entityIds){
        const a=source.find(e=>e.id===id),b=target.find(e=>e.id===id);
        if(JSON.stringify(a)!==JSON.stringify(b))fail();
        if(!a)continue; // Retain orphan locks until explicitly repaired after unlocking.
        const t=before.terrain,n=after.terrain;
        if(t.width!==n.width||t.height!==n.height||t.worldWidth!==n.worldWidth||t.worldHeight!==n.worldHeight)fail();
        if(t.heights===n.heights)continue;
        const radius=structureTerrainClearance(a,manifest,catalogFor(a)?.footprint??10,0).footprint/Math.SQRT2;
        const sx=t.worldWidth/(t.width-1),sy=t.worldHeight/(t.height-1);
        const minX=Math.max(0,Math.floor((a.position[0]-radius)/sx)),maxX=Math.min(t.width-1,Math.ceil((a.position[0]+radius)/sx));
        const minY=Math.max(0,Math.floor((a.position[1]-radius)/sy)),maxY=Math.min(t.height-1,Math.ceil((a.position[1]+radius)/sy));
        for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)if(t.heights[y*t.width+x]!==n.heights[y*t.width+x])fail();
      }
    }
  }
}
