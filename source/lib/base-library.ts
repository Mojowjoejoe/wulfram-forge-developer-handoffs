import {valleyPocketTemplate} from './valley-pockets.ts';
import {threeLaneAnchorTemplate} from './three-lane-anchor.ts';
import {brokenRingTemplateV3} from './broken-ring-v3.ts';
import {serviceCourtyardTemplate,SERVICE_COURTYARD_ROUTES} from './service-courtyard.ts';
import type {AuthoredLibraryEntry} from './authored-base-library.ts';
import type {AuthoredBasePackage} from './authored-base-package.ts';
import {frontierCampTemplate} from './frontier-camp.ts';
import {basePlanBounds,type BasePlanBounds} from './base-plan-bounds.ts';
import {OFFSET_BASTION_ARRANGEMENTS,offsetBastionTemplate,offsetBastionPath,type OffsetBastionArrangement} from './offset-bastion.ts';
import { creativeBaseTemplate, CREATIVE_BASE_LAYOUTS, type CreativeSize } from './creative-base-layouts.ts';
import type { FormationFavorite } from './formation-favorites.ts';
import { CATALOG, hasModelForEntity, type AssetManifest, type BaseTemplate } from './wulfram.ts';

export const REVIEWED_CREATIVE_FAMILY_IDS = [...CREATIVE_BASE_LAYOUTS.map(style=>style.id), 'offset-bastion', 'frontier-camp', 'service-courtyard', 'broken-ring', 'valley-pockets', 'three-lane-anchor'] as const;

export type BaseLibraryCategory = 'Creative' | 'Experimental' | 'Original' | 'Curated' | 'My bases' | 'My districts' | 'Authored bases';
export interface BaseLibraryEntry {
  key: string; id: string; name: string; description: string; category: BaseLibraryCategory;
  authoredBase?:AuthoredBasePackage;
  terrainAdaptive?:boolean;
  template?: BaseTemplate; error?: string; seed?: string; size?: CreativeSize;
  reservationBands?:Array<{points:Array<[number,number]>;width:number}>;
  reservationWidth?:number; reservationLabel?:string; planBounds?:BasePlanBounds; traits: string[]; offsetArrangement?:OffsetBastionArrangement; approach?:Array<[number,number]>; guidance?:string;
  modeledCount: number; power: number; services: number; defenses: number; concealment: number;
}
export function buildBaseLibrary(templates: BaseTemplate[], favorites: FormationFavorite[], manifest: AssetManifest, size: CreativeSize, authored:AuthoredLibraryEntry[]=[]): BaseLibraryEntry[] {
  const entries: BaseLibraryEntry[] = [];
  const add = (id: string, category: BaseLibraryCategory, name: string, description: string, template?: BaseTemplate, extras: Partial<BaseLibraryEntry> = {}) => {
    const units = extras.authoredBase?extras.authoredBase.geometry.units.filter(u=>hasModelForEntity(u,manifest)):template?.units.filter(u => hasModelForEntity({ ...u, team: 1 }, manifest)) ?? [];
    const entry:BaseLibraryEntry = { traits:[], key: `${category}:${id}`, id, category, name, description, template,
      modeledCount: units.length, power: units.filter(u => u.token === 'e').length,
      services: units.filter(u => ['r','f'].includes(u.token)).length,
      defenses: units.filter(u => CATALOG.some(c=>c.token===u.token&&c.category==='defense')).length,
      concealment: units.filter(u => u.token === 'd').length, ...extras };
    if(entry.approach&&template)entry.planBounds=basePlanBounds(template,manifest,entry.approach,entry.reservationWidth);
    if(entry.reservationBands&&template){
      const bounds=entry.reservationBands.map(b=>basePlanBounds(template,manifest,b.points,b.width));
      const minX=Math.min(...bounds.map(b=>b.minX)),maxX=Math.max(...bounds.map(b=>b.maxX)),minY=Math.min(...bounds.map(b=>b.minY)),maxY=Math.max(...bounds.map(b=>b.maxY));
      entry.planBounds={minX,maxX,minY,maxY,width:maxX-minX,height:maxY-minY};
    }
    entry.traits=baseCompositionTraits(entry);entries.push(entry);
  };
  for (const style of CREATIVE_BASE_LAYOUTS) {
    const seed = `library-v1:${style.id}`;
    const description=size==='small'&&style.id==='gatehouse'?'Rear logistics and one shoulder; larger sizes flank both sides of the entrance.':size==='small'&&style.id==='harbor'?'Two rear yards; larger sizes extend the chain around a court.':style.description;
    try { add(style.id, 'Creative', style.name, description, creativeBaseTemplate(style.id, seed, manifest, size), { seed, size }); }
    catch (error) { add(style.id, 'Creative', style.name, description, undefined, { seed, size, error: error instanceof Error ? error.message : 'Sample unavailable.' }); }
  }
  const arrangementLabels={classic:'Classic','wide-front':'Wide Front','deep-court':'Deep Court','split-wings':'Split Wings'};
  const plans={classic:'Rear services and staggered districts beside a bent entrance.','wide-front':'A broad spread of districts around an offset approach.','deep-court':'Rear command services sit beyond a deeper entrance turn.','split-wings':size==='small'?'Rear services and one forward wing; larger sizes add the second wing.':'Forward districts separate into two wings around the approach.'};
  for(const arrangement of OFFSET_BASTION_ARRANGEMENTS){
    const seed=`library-offset-v1:${arrangement}`,extras={key:`Creative:offset-bastion:${arrangement}`,seed,size,offsetArrangement:arrangement,approach:offsetBastionPath(arrangement),guidance:'One reviewed creative family, four plans. Larger sizes add districts; reroll varies buildings within the chosen plan. Keep both entrance corridors clear. Preview fit, then inspect power and access on this map. Paired layouts need compatible terrain; entrance choices must be rechecked after edits.'};
    try{add('offset-bastion','Creative',`Offset Bastion · ${arrangementLabels[arrangement]}`,plans[arrangement],offsetBastionTemplate(seed,size,manifest,arrangement),extras);}
    catch(error){add('offset-bastion','Creative',`Offset Bastion · ${arrangementLabels[arrangement]}`,plans[arrangement],undefined,{...extras,error:error instanceof Error?error.message:'Sample unavailable.'});}
  }
  const pocketExtras={seed:'library-valley-pockets-v1',size,guidance:'Reviewed additive layout: staggered side yards keep a central passage open. Retains current buildings and saved constraints. Counts start at 10/15/20/30 per team by size; higher targets add defenses when they fit. Bounded terrain fitting may reject. Save a favorite to reuse unchanged yards and passages; extra authoring rules require a whole-map save.'};
  const anchorExtras={seed:'library-three-lane-anchor-v1',size,terrainAdaptive:false,reservationLabel:'three courts, entrances and rear service road',guidance:'Fixed arrangement with three departure courts and a rear service yard. Adds 15/21/30/42 buildings per team by size; use count 0 for the size minimum, or request more defenses when they fit. Terrain support and every pad route are checked, without relocating yards. Six exits start unbound; connect authored lanes in Rules. Requires a layout without entrance rules. Reuse with authored-base or whole-map export.'};
  try{const {template,plan,entranceRoutes}=threeLaneAnchorTemplate(anchorExtras.seed,size,manifest);add('three-lane-anchor','Creative','Three-Lane Anchor','Three separate staging courts joined by a transverse rear road.',template,{...anchorExtras,reservationBands:[plan.rearRoad,plan.serviceConnector,...entranceRoutes,...plan.courts.map(c=>({width:c.width,points:[c.mouth.points.at(-1)!,c.rearConnector.points[0]]}))]});}
  catch(error){add('three-lane-anchor','Creative','Three-Lane Anchor','Three separate staging courts joined by a transverse rear road.',undefined,{...anchorExtras,error:error instanceof Error?error.message:'Sample unavailable.'});}
  try{const {template,plan}=valleyPocketTemplate(pocketExtras.seed,size,manifest);add('valley-pockets','Creative','Valley Pockets','Powered side yards beside a continuous passage.',template,{...pocketExtras,reservationBands:[plan.passage,...plan.sites.map(s=>s.frontage)]});}
  catch(error){add('valley-pockets','Creative','Valley Pockets','Powered side yards beside a continuous passage.',undefined,{...pocketExtras,error:error instanceof Error?error.message:'Sample unavailable.'});}
  const ringExtras={seed:'library-broken-ring-v3',size,reservationLabel:'passage, frontages, loop and interior',guidance:'Reviewed creative family: rear services and unequal perimeter segments around an open interior. Preview checks paired terrain, power and reserved routes. Terrain adaptation must retain the planned sites. Favorites retain the plan and recheck it on another map. Save the whole map if you edit the reserved routes. Sampled routes do not prove pad entry or game collision.'};
  try{
    const {template,plan}=brokenRingTemplateV3(ringExtras.seed,size,manifest);
    add('broken-ring','Creative','Broken Ring','Rear services, two openings and a connected perimeter loop.',template,{...ringExtras,reservationBands:[plan.route,...plan.serviceRoutes,plan.circulation,{width:plan.interiorRadius*2,points:[[-.5,0],[.5,0]]}]});
  }catch(error){add('broken-ring','Creative','Broken Ring','Unequal perimeter segments with reserved circulation.',undefined,{...ringExtras,error:error instanceof Error?error.message:'Sample unavailable.'});}
  const courtyardExtras={reservationBands:SERVICE_COURTYARD_ROUTES.map(r=>({points:r.points,width:r.width})),reservationLabel:'court and mouths',seed:'library-courtyard-v1',size,guidance:'Reviewed under editor rules: two powered banks face a through-court with two mouths. Seeds vary local service and defense placement. Preview checks six reservations and sampled 80-unit through-routes; favorites retain and recheck them on the destination map. Sampled access is not in-game collision proof.'};
  try{add('service-courtyard','Creative','Service Courtyard','Two service banks around an open court with west and east exits.',serviceCourtyardTemplate(courtyardExtras.seed,size,manifest),courtyardExtras);}
  catch(error){add('service-courtyard','Creative','Service Courtyard','Two service banks around a through-court.',undefined,{...courtyardExtras,error:error instanceof Error?error.message:'Sample unavailable.'});}
  const frontierExtras={seed:'library-frontier-v1',size,approach:[[350,-250],[350,250]] as Array<[number,number]>,reservationWidth:320,reservationLabel:'expansion strip',guidance:'Reviewed service hook beside reserved room for expansion. The strip excludes buildings from every team until explicitly edited or removed. It does not reserve terrain or guarantee future power. Larger sizes add occupied yards; preview fit and inspect both teams.'};
  try{add('frontier-camp','Creative','Frontier Camp','A powered service hook beside an empty expansion strip.',frontierCampTemplate(frontierExtras.seed,size,manifest),frontierExtras);}
  catch(error){add('frontier-camp','Creative','Frontier Camp','A service hook with reserved expansion space.',undefined,{...frontierExtras,error:error instanceof Error?error.message:'Sample unavailable.'});}
  for (const t of templates) add(t.id, t.curated ? 'Curated' : 'Original', t.name, t.description ?? `Formation from ${t.sourceMap}. Fixed composition; preview its fit on your terrain.`, t);
  for (const f of favorites) add(f.id, f.kind==='district'?'My districts':'My bases', f.name, f.kind==='district'?'Your reusable district. Choose a team and preview one copy on the current terrain.':'Your saved arrangement. Reuse the same composition and preview its fit on this map.', f.template);
  for(const saved of authored){
    const base=saved.base,units=base.geometry.units;
    const xs=units.map(u=>u.position[0]),ys=units.map(u=>u.position[1]);
    // Diagram-only projection. Placement must use authoredBase, never this template.
    const template:BaseTemplate={id:saved.id,name:saved.name,sourceMap:base.name,sourceState:'authored',sourceTeam:0,sourceWorldSize:[0,0],sourceAnchor:[0,0],unitCount:units.length,footprint:{width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)},units:units.map(u=>({token:u.token,subtype:u.subtype,offset:[u.position[0],u.position[1]],groundOffset:u.position[2],rotation:[...u.rotation],active:u.active}))};
    add(saved.id,'Authored bases',saved.name,`Complete saved base: ${units.length} buildings across ${new Set(units.map(u=>u.team)).size} teams; ${base.geometry.authoring.districts.length} districts and ${base.areas.length} reserved areas.`,template,{authoredBase:structuredClone(base),guidance:`Saved districts: ${base.geometry.authoring.districts.map(d=>d.name).join(', ')||'none'}. Preserves saved teams, rules and building poses. Load into authored placement, then preview before Apply.`,...(units.some(u=>!hasModelForEntity(u,manifest))?{error:'A saved structure model is unavailable. Restore required assets before placement.'}:{})});
  }
  return entries;
}
export interface BaseLibraryFilter { query: string; category: string; count: string; role: string; terrain: string; trait?:string }
export function filterBaseLibrary(entries: BaseLibraryEntry[], filter: BaseLibraryFilter) {
  const terms = filter.query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return entries.filter(e => {
    const text = `${e.name} ${e.description} ${e.guidance??''} ${e.category} ${e.traits.join(' ')} ${e.template?.sourceMap ?? ''}`.toLowerCase();
    return (!filter.trait||filter.trait==='all'||e.traits.includes(filter.trait)) && terms.every(t => text.includes(t)) && (filter.category === 'All' || e.category === filter.category)
      && (filter.count === 'all' || (filter.count === 'small' ? e.modeledCount <= 15 : filter.count === 'medium' ? e.modeledCount >= 16 && e.modeledCount <= 35 : e.modeledCount >= 36))
      && (filter.role === 'all' || (filter.role === 'service' ? e.services > 0 : filter.role === 'defense' ? e.defenses > 0 : e.concealment > 0))
      && (filter.terrain === 'all' || (filter.terrain === 'adaptive' ? (e.terrainAdaptive??['Creative','Experimental'].includes(e.category)) : !(e.terrainAdaptive??['Creative','Experimental'].includes(e.category))));
  });
}

export const BASE_COMPOSITION_TRAITS=['Starter count','Service yard','Multiple service pads','Defense heavy','Darklights present','No service pads','Elongated footprint'] as const;
export function baseCompositionTraits(entry:Pick<BaseLibraryEntry,'modeledCount'|'services'|'defenses'|'concealment'|'template'>):string[]{
 if(!entry.template||!entry.modeledCount)return [];
 const traits:string[]=[];
 if(entry.modeledCount<=15)traits.push('Starter count');
 if(entry.services>=2)traits.push('Service yard');
 if(entry.services>=4)traits.push('Multiple service pads');
 if(entry.defenses/entry.modeledCount>=.5)traits.push('Defense heavy');
 if(entry.concealment>0)traits.push('Darklights present');
 if(entry.services===0)traits.push('No service pads');
 const {width,height}=entry.template.footprint;
 if(width>0&&height>0&&Math.max(width,height)/Math.min(width,height)>=2.5)traits.push('Elongated footprint');
 return traits;
}
