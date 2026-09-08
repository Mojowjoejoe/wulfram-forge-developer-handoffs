import {DISTRICTS_KEY,readDistricts,districtVariationStatus,transformDistrict} from './base-districts.ts';
import {assertEditorConstraints} from './editor-constraints.ts';
import {checkFormationAccess} from './formation-access.ts';
import {hasLockedAltitudeAndRotation} from './model-transform.ts';
import {hasModelForEntity,validateProject,synchronizeActiveBaseLayout,structureTerrainClearance,type WulframProject,type AssetManifest,type StateEntity} from './wulfram.ts';

export type DistrictTeamPolicy='preserve-unpaired'|'paired-positions';
export async function previewDistrictArrangements(source:WulframProject,manifest:AssetManifest,seed:string,distance:number,conform:(e:StateEntity)=>void,signal?:AbortSignal,teamPolicy:DistrictTeamPolicy='preserve-unpaired'){
  if(!['preserve-unpaired','paired-positions'].includes(teamPolicy))throw new Error('Choose independent districts or paired positions.');
  if(!seed.trim()||seed.length>200||!Number.isFinite(distance)||distance<10||distance>800)throw new Error('Use a seed of 1–200 characters and movement radius 10–800 world units.');
  const groups=readDistricts(source.baseLayouts.find(l=>l.id===source.activeBaseLayoutId)?.metadata[DISTRICTS_KEY]);
  const status=districtVariationStatus(groups,source.entities),eligible=groups.filter(g=>status.find(s=>s.id===g.id)?.eligible);
  if(!eligible.length)throw new Error('No eligible districts. Allow reposition on a saved district; unlock it and resolve fixed/shared or missing membership first.');
  const ids=eligible.flatMap(g=>g.entityIds);if(new Set(ids).size!==ids.length)throw new Error('Eligible districts share buildings. Give each moving building one district before previewing.');
  if(source.entities.some(e=>ids.includes(e.id)&&!hasModelForEntity(e,manifest)))throw new Error('A moving district contains an unavailable structure model. Resolve its assets before previewing.');
  const pairs=new Map<string,string>();
  if(teamPolicy==='paired-positions'){
    const members=(g:typeof eligible[number])=>source.entities.filter(e=>g.entityIds.includes(e.id));
    const matches=(a:StateEntity,b:StateEntity)=>a.token===b.token&&[1,2].includes(a.team)&&b.team===3-a.team&&Math.abs(a.position[0]+b.position[0]-source.terrain.worldWidth)<.001&&Math.abs(a.position[1]+b.position[1]-source.terrain.worldHeight)<.001;
    for(const g of eligible){
      if(pairs.has(g.id))continue;const units=members(g);
      if(new Set(units.map(e=>e.team)).size!==1||![1,2].includes(units[0].team))throw new Error(`${g.name}: paired districts must each contain one team, 1 or 2.`);
      const partners=eligible.filter(other=>other.id!==g.id&&!pairs.has(other.id)&&other.entityIds.length===g.entityIds.length&&units.every(a=>members(other).filter(b=>matches(a,b)).length===1)&&members(other).every(b=>units.filter(a=>matches(a,b)).length===1));
      if(partners.length!==1)throw new Error(`${g.name}: needs exactly one eligible district with matching opposite-team units at 180-degree paired positions. Add or fix its partner, or choose independent districts.`);
      pairs.set(g.id,partners[0].id);pairs.set(partners[0].id,g.id);
    }
  }
  const movedIds=new Set(ids),candidates:WulframProject[]=[],failures=new Map<string,number>();
  let state=2166136261;for(const c of seed)state=Math.imul(state^c.charCodeAt(0),16777619);
  const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  let attempts=0;
  while(attempts<24&&candidates.length<3){
    await new Promise(resolve=>setTimeout(resolve,0));if(signal?.aborted)throw new Error('District preview canceled. Map unchanged.');attempts++;
    try{
      let entities=source.entities;
      const shifts=new Map<string,[number,number]>();
      for(const g of eligible){
        let shift=shifts.get(g.id);
        if(!shift){const angle=random()*Math.PI*2,r=distance*(.25+.75*Math.sqrt(random()));shift=[Math.cos(angle)*r,Math.sin(angle)*r];const partner=pairs.get(g.id);if(partner)shifts.set(partner,[-shift[0],-shift[1]]);}
        entities=transformDistrict(entities,g.entityIds,{dx:shift[0],dy:shift[1],degrees:0,duplicate:false},source.terrain.worldWidth,source.terrain.worldHeight,hasLockedAltitudeAndRotation,conform,()=>{throw new Error('Unexpected duplicate');}).entities;
      }
      const candidate={...source,entities,baseLayouts:source.baseLayouts.map(l=>({...l,metadata:{...l.metadata}})),metadata:{...source.metadata}};
      for(const e of entities)if(movedIds.has(e.id)){
        const radius=structureTerrainClearance(e,manifest,0,0).footprint/Math.SQRT2;
        if(e.position[0]<radius||e.position[1]<radius||e.position[0]+radius>source.terrain.worldWidth||e.position[1]+radius>source.terrain.worldHeight)throw new Error('A moved building footprint leaves the map. Reduce movement radius.');
      }
      assertEditorConstraints(source,candidate,manifest);
      const issue=validateProject(candidate).find(i=>i.severity==='error');if(issue)throw new Error(`${issue.code}: ${issue.message}`);
      checkFormationAccess(candidate,manifest);
      candidate.metadata['districtArrangement.last']=JSON.stringify({version:teamPolicy==='paired-positions'?2:1,seed,distance,attempt:attempts,districtIds:eligible.map(g=>g.id),teamPolicy,transform:'translation-only'});
      synchronizeActiveBaseLayout(candidate);candidates.push(candidate);
    }catch(error){const reason=error instanceof Error?error.message:'Candidate rejected';failures.set(reason,(failures.get(reason)??0)+1);}
  }
  return {candidates,attempts,failures:[...failures].map(([reason,count])=>({reason,count})),movedIds:ids};
}
