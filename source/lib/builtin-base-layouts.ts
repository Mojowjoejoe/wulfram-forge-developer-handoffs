import {previewValleyPocketPlacement} from './valley-pockets-placement.ts';
import {previewThreeLaneAnchorPlacement} from './three-lane-anchor-placement.ts';
import {brokenRingTemplateV3} from './broken-ring-v3.ts';
import {brokenRingRequiredCounts} from './broken-ring.ts';
import {checkBrokenRingPlacement} from './broken-ring-placement.ts';
import {checkCourtyardAccess} from './courtyard-access.ts';
import {serviceCourtyardTemplate,serviceCourtyardAreas,courtyardRequiredCounts,assertCourtyardComposition,SERVICE_COURTYARD_VERSION,SERVICE_COURTYARD_ROUTES} from './service-courtyard.ts';
import {offsetBastionTemplate,offsetBastionAreas,offsetBastionRequiredCounts,assertOffsetBastionComposition,offsetBastionVersion,offsetBastionPath,type OffsetBastionArrangement} from './offset-bastion.ts';
import { ADVANCED_BASE_PRESETS } from './advanced-base-templates.ts';
import {frontierCampTemplate,frontierExpansionAreas,frontierRequiredCounts,assertFrontierComposition,FRONTIER_CAMP_VERSION} from './frontier-camp.ts';
import {BUILD_AREAS_KEY,checkBuildAreas} from './build-areas.ts';
import {analyzeRotationalEntityPairs} from './balanced-map-analysis.ts';
import { instantiatePairedTemplate, instantiateSymmetricPairedTemplate } from './paired-template.ts';
import { structureTerrainClearance, validateProject, type AssetManifest, type BaseLayoutState, type BaseTemplate, type WulframProject } from './wulfram.ts';
import { creativeBaseTemplate, type CreativeSize } from './creative-base-layouts.ts';
import {fitFormationCount} from './formation-count.ts';
import {checkFormationAccess} from './formation-access.ts';
import {FormationDiagnosticError} from './formation-diagnostics.ts';
import {adaptFormationTerrain,checkFormationEntrances} from './formation-terrain.ts';

export interface CreativePlacement { size: CreativeSize; x: number; y: number; rotation: number; radius: number; targetCount?: number; checkAccess?: boolean; terrainAware?:boolean; entranceDegrees?:number; offsetArrangement?:OffsetBastionArrangement }

export const BUILTIN_BASE_LAYOUTS = [
  { id: 'light', name: 'Light Garrison', count: 17, preset: 0 },
  { id: 'standard', name: 'Standard Garrison', count: 23, preset: 0 },
  { id: 'bastion', name: 'Bastion Gate', count: 25, preset: 0 },
  { id: 'twin-courts', name: 'Twin Service Courts', count: 27, preset: 2 },
  { id: 'ringhold', name: 'Ringhold', count: 34, preset: 3 },
];

/** Prepare a separate layout without changing the open map or its existing states. */
export function createBuiltinBaseLayout(project: WulframProject, manifest: AssetManifest, presetId: string, id: string): BaseLayoutState {
  const spec = BUILTIN_BASE_LAYOUTS.find(item => item.id === presetId);
  if (!spec) throw new Error('Unknown built-in formation.');
  const template = structuredClone(ADVANCED_BASE_PRESETS[spec.preset].template);
  if (spec.id === 'light') template.units = template.units.filter((u, i) => !['p', 'd'].includes(u.token) && ![7, 5, 13, 16, 20, 23].includes(i));
  if (spec.id === 'standard') template.units = template.units.filter(u => !['p', 'd'].includes(u.token));
  if (spec.id === 'bastion') template.units.find(u => u.token === 'd')!.offset = [-570, 0];
  template.unitCount = template.units.length;
  return placeFormation(project, manifest, template, id, `${spec.name} - ${spec.count} per team`, { 'formation.preset': spec.id });
}

export function createCreativeBaseLayout(project: WulframProject, manifest: AssetManifest, style: string, id: string, seed: string, placement?: CreativePlacement): BaseLayoutState {
  if(placement?.entranceDegrees!==undefined&&!Number.isFinite(placement.entranceDegrees))throw new Error('Choose a finite entrance direction.');
  if(placement?.targetCount!==undefined&&placement.targetCount!==0&&(!Number.isInteger(placement.targetCount)||placement.targetCount<6||placement.targetCount>120))throw new Error('Target count must be 0 (automatic) or a whole number from 6 to 120.');
  if (placement && (!['small', 'standard', 'large', 'massive'].includes(placement.size) || ![placement.x, placement.y, placement.rotation, placement.radius].every(Number.isFinite) || placement.radius < 100)) throw new Error('Choose valid size, position, rotation and building-area values.');
  if(placement?.offsetArrangement!==undefined){if(style!=='offset-bastion')throw new Error('Arrangement choices apply only to Offset Bastion.');offsetBastionVersion(placement.offsetArrangement);}
  if(style==='three-lane-anchor'){
    const w=project.terrain.worldWidth,h=project.terrain.worldHeight;
    const options=placement??{size:'large' as const,x:w>=h?w/4:w/2,y:w>=h?h/2:h/4,rotation:w>=h?0:90,radius:3300};
    const preview=previewThreeLaneAnchorPlacement(project,manifest,seed,options,id);
    const active=preview.project.baseLayouts.find(l=>l.id===preview.project.activeBaseLayoutId)!;
    return {...active,id,name:'Three-Lane Anchor',entities:preview.project.entities,updatedAt:new Date().toISOString(),metadata:{...active.metadata,'formation.style':style,'formation.version':preview.fitted.plan.version,'formation.seed':seed,'formation.placement':JSON.stringify(options),'formation.access':JSON.stringify({routes:preview.padRoutes.map(r=>r.points),blocked:[],clearance:96}),'formation.portability':'Save an authored base or whole map to retain all six entrance sockets. Formation favorites cannot retain these rules.'}};
  }
  if(style==='valley-pockets'){
    const w=project.terrain.worldWidth,h=project.terrain.worldHeight;
    const options=placement??{size:'large' as const,x:w>=h?w/4:w/2,y:w>=h?h/2:h/4,rotation:w>=h?0:90,radius:3300};
    const preview=previewValleyPocketPlacement(project,manifest,seed,options,id);
    const active=preview.project.baseLayouts.find(l=>l.id===preview.project.activeBaseLayoutId)!;
    return {...active,id,name:'Valley Pockets',entities:preview.project.entities,updatedAt:new Date().toISOString(),metadata:{...active.metadata,'formation.style':style,'formation.version':preview.fitted.plan.version,'formation.seed':seed,'formation.placement':JSON.stringify(options),'formation.access':JSON.stringify({routes:[...preview.access.routes,...preview.access.serviceRoutes].map(r=>r.points),blocked:[],clearance:96}),'formation.portability':'Generated yards and passages can be saved as a fixed favorite; other buildings and additional rules require a whole-map save.'}};
  }
  let reason = 'No candidate fits.';
  let diagnostic:FormationDiagnosticError|undefined;
  for (let attempt = 0; attempt < 24; attempt++) {
    try {
      const candidateSeed = `${seed}:${attempt}`;
      const brokenRing=style==='broken-ring',courtyard=style==='service-courtyard',frontier=style==='frontier-camp',offsetBastion=style==='offset-bastion',size=placement?.size??'large';
      const ring = brokenRing ? brokenRingTemplateV3(candidateSeed,size,manifest) : undefined;
      let template = ring ? {...ring.template,name:'Broken Ring'} : courtyard?serviceCourtyardTemplate(candidateSeed,size,manifest):frontier?frontierCampTemplate(candidateSeed,size,manifest):offsetBastion?offsetBastionTemplate(candidateSeed,size,manifest,placement?.offsetArrangement):creativeBaseTemplate(style, candidateSeed, manifest, placement?.size);
      if(placement?.targetCount)template=fitFormationCount(template,placement.targetCount,manifest,candidateSeed);
      if(brokenRing)for(const [token,count] of Object.entries(brokenRingRequiredCounts(size)))if(template.units.filter(u=>u.token===token).length<count)throw new Error(`Broken Ring ${size} needs at least ${count} ${token} structures.`);
      if(courtyard)assertCourtyardComposition(template,size);
      if(frontier)assertFrontierComposition(template,size);
      if(offsetBastion)assertOffsetBastionComposition(template,size);
      let adaptation;
      if(placement&&(placement.terrainAware||placement.entranceDegrees!==undefined)){adaptation=adaptFormationTerrain(template,project,manifest,placement);template=adaptation.template;}
      if (placement && template.units.some(u => Math.hypot(...u.offset) + Math.max(...[1, 2].map(team => structureTerrainClearance({token:u.token,team},manifest,0,0).footprint / Math.SQRT2)) > placement.radius)) throw new Error('Buildings exceed the yellow area. Increase its radius or choose a smaller size.');
      const layout=placeFormation(project, manifest, template, id, `${template.name} - ${template.unitCount} per team`, { 'formation.style': style, 'formation.seed': seed, 'formation.candidateSeed': candidateSeed, 'formation.version': brokenRing?ring!.plan.version:courtyard?SERVICE_COURTYARD_VERSION:frontier?FRONTIER_CAMP_VERSION:offsetBastion?offsetBastionVersion(placement?.offsetArrangement):'creative-v2', ...(adaptation?{'formation.adaptation':JSON.stringify(adaptation.shifts)}:{}), ...(placement ? {'formation.placement':JSON.stringify(placement)} : {}) }, placement,brokenRing||courtyard||frontier||offsetBastion?'shared-footprint-v2':'legacy');
      if(ring){
        const w=project.terrain.worldWidth,h=project.terrain.worldHeight,horizontal=w>=h;
        const checked=checkBrokenRingPlacement({...project,entities:layout.entities,validation:layout.validation},manifest,ring.plan,placement?.x??(horizontal?w*.25:w/2),placement?.y??(horizontal?h/2:h*.25),placement?.rotation??(horizontal?0:90),placement?.radius);
        layout.metadata[BUILD_AREAS_KEY]=JSON.stringify(checked.areas);
        layout.metadata['formation.brokenRingAccess']=JSON.stringify(checked.access);
        layout.metadata['formation.requiredCounts']=JSON.stringify(brokenRingRequiredCounts(size));
        layout.metadata['formation.brokenRingPlan']=JSON.stringify(ring.plan);
      }
      if(courtyard){
        if(placement&&SERVICE_COURTYARD_ROUTES.some(route=>route.points.some(p=>Math.hypot(...p)+route.width/2>placement.radius)))throw new Error('The turning court or its entrances exceed the yellow area. Increase its radius.');
        const w=project.terrain.worldWidth,h=project.terrain.worldHeight,horizontal=w>=h;
        const areas=serviceCourtyardAreas(project,placement?.x??(horizontal?w*.25:w/2),placement?.y??(horizontal?h/2:h*.25),placement?.rotation??(horizontal?0:90));
        const problems=checkBuildAreas(areas,layout.entities,w,h,manifest);if(problems.length)throw new Error(`Service Courtyard reservation: ${problems[0]} Change placement, size or seed.`);
        const pairing=analyzeRotationalEntityPairs({...project,entities:layout.entities},manifest);if(!pairing.passed)throw new Error(`Service Courtyard requires matching paired terrain support: ${pairing.message}`);
        layout.metadata['formation.courtyardAccess']=JSON.stringify(checkCourtyardAccess({...project,entities:layout.entities,validation:layout.validation},manifest,areas));
        layout.metadata[BUILD_AREAS_KEY]=JSON.stringify(areas);layout.metadata['formation.requiredCounts']=JSON.stringify(courtyardRequiredCounts(size));
      }
      if(frontier){
        if(placement&&placement.radius<Math.hypot(350,250)+160)throw new Error('The Frontier expansion strip exceeds the yellow area. Increase its radius.');
        const w=project.terrain.worldWidth,h=project.terrain.worldHeight,horizontal=w>=h;
        const areas=frontierExpansionAreas(project,placement?.x??(horizontal?w*.25:w/2),placement?.y??(horizontal?h/2:h*.25),placement?.rotation??(horizontal?0:90));
        const problems=checkBuildAreas(areas,layout.entities,w,h,manifest);
        if(problems.length)throw new Error(`Frontier expansion reservation: ${problems[0]} Move the base or change its size/seed.`);
        const pairing=analyzeRotationalEntityPairs({...project,entities:layout.entities},manifest);
        if(!pairing.passed)throw new Error(`Frontier Camp requires matching paired terrain support: ${pairing.message}`);
        layout.metadata[BUILD_AREAS_KEY]=JSON.stringify(areas);
        layout.metadata['formation.requiredCounts']=JSON.stringify(frontierRequiredCounts(size));
      }
      if(offsetBastion){
        if(placement&&offsetBastionPath(placement.offsetArrangement).some(p=>Math.hypot(...p)+100>placement.radius))throw new Error('The bent approach exceeds the yellow area. Increase its radius.');
        const w=project.terrain.worldWidth,h=project.terrain.worldHeight,horizontal=w>=h;
        const areas=offsetBastionAreas(project,placement?.x??(horizontal?w*.25:w/2),placement?.y??(horizontal?h/2:h*.25),placement?.rotation??(horizontal?0:90),placement?.offsetArrangement);
        const problems=checkBuildAreas(areas,layout.entities,w,h,manifest);if(problems.length)throw new Error(`Offset Bastion approach: ${problems[0]} Change placement, size or seed.`);
        const pairing=analyzeRotationalEntityPairs({...project,entities:layout.entities},manifest);if(!pairing.passed)throw new Error(`Offset Bastion requires matching paired terrain support: ${pairing.message}`);
        layout.metadata[BUILD_AREAS_KEY]=JSON.stringify(areas);layout.metadata['formation.requiredCounts']=JSON.stringify(offsetBastionRequiredCounts(size));
      }
      return layout;
    } catch (error) { reason = error instanceof Error ? error.message : reason; diagnostic=error instanceof FormationDiagnosticError?error:undefined; }
  }
  if(diagnostic)throw new FormationDiagnosticError(`No valid ${style} layout found after 24 arrangements. ${reason}`,diagnostic.overlay);
  throw new Error(`No valid ${style} layout found after 24 arrangements. ${reason}`);
}

export function placeFormation(project: WulframProject, manifest: AssetManifest, template: BaseTemplate, id: string, name: string, metadata: Record<string, string>, placement?: CreativePlacement, snapPolicy: 'legacy'|'shared-footprint-v2'='legacy'): BaseLayoutState {
  const { worldWidth: w, worldHeight: h } = project.terrain;
  const horizontal = w >= h;
  const entities = [1, 2].flatMap(team => {
    const fraction = team === 1 ? 0.25 : 0.75;
    const anchor: [number, number] = placement ? team === 1 ? [placement.x, placement.y] : [w-placement.x,h-placement.y] : horizontal ? [w * fraction, h / 2] : [w / 2, h * fraction];
    const yaw = (placement ? placement.rotation * Math.PI / 180 : horizontal ? 0 : Math.PI / 2) + (team === 2 ? Math.PI : 0);
    const instantiate=snapPolicy==='shared-footprint-v2'?instantiateSymmetricPairedTemplate:instantiatePairedTemplate;
    const result = instantiate(template, project.terrain, anchor, team, 1, yaw, manifest, undefined, (() => { let n = 0; return () => `${id}-${team}-${n++}`; })());
    if (result.skippedWithoutModel || result.scale !== 1 || Math.hypot(result.anchor[0] - anchor[0], result.anchor[1] - anchor[1]) > 0.001) throw new FormationDiagnosticError('This formation cannot fit at its original size here. Move its center farther from the map edge.',{routes:[],blocked:[{x:anchor[0],y:anchor[1],message:`Team ${team} formation cannot fit at this center`}]});
    return result.entities;
  });
  const radii = entities.map(e => structureTerrainClearance(e, manifest, 0, 0).footprint / Math.SQRT2);
  for (let i = 0; i < entities.length; i++) {
    const [x, y] = entities[i].position;
    if (x - radii[i] < 0 || y - radii[i] < 0 || x + radii[i] > w || y + radii[i] > h) throw new FormationDiagnosticError('Map is too small for the full formation footprints.',{routes:[],blocked:[{x,y,message:'Building footprint crosses map boundary'}]});
    for (let j = i + 1; j < entities.length; j++) {
      if (Math.hypot(x - entities[j].position[0], y - entities[j].position[1]) - radii[i] - radii[j] < Math.max(8, project.validation.minSpacing)) throw new FormationDiagnosticError('Not enough space between structures for this formation.',{routes:[],blocked:[entities[i],entities[j]].map(e=>({x:e.position[0],y:e.position[1],message:'Structures overlap or lack clearance'}))});
    }
  }
  const validation = { ...project.validation, serviceRadius: Math.min(project.validation.serviceRadius, 280) };
  const errors = validateProject({ ...project, entities, validation }).filter(issue => issue.severity === 'error');
  if (errors.length) throw new FormationDiagnosticError(`Formation cannot be placed on this terrain: ${errors[0].message} Choose a larger or flatter base area before trying again.`,{routes:[],blocked:errors.flatMap(issue=>{const e=entities.find(e=>e.id===issue.entityId);return e?[{x:e.position[0],y:e.position[1],message:issue.message}]:[];})});
  const entrances=placement?checkFormationEntrances({...project,entities,validation},manifest,placement):[];
  const access=placement?.checkAccess||entrances.length?checkFormationAccess({...project,entities,validation},manifest,entrances.map(route=>route[0])):undefined;
  if(access)access.routes.push(...entrances);
  return { id, name, entities, validation, updatedAt: new Date().toISOString(), metadata: { ...metadata, ...(snapPolicy==='shared-footprint-v2'?{'formation.snapPolicy':snapPolicy}:{}), ...(access?{'formation.access':JSON.stringify(access)}:{}), 'formation.ranges': 'Provisional power radius; turret and Darklight ranges require game testing. Darklights do not guarantee whole-base concealment.' } };
}
