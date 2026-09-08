import {brokenRingPlanV2} from './broken-ring-v2.ts';
import {buildBrokenRingTemplate,type BrokenRingPlan} from './broken-ring.ts';
import type {CreativeSize} from './creative-base-layouts.ts';
import type {AssetManifest} from './wulfram.ts';
export const BROKEN_RING_V3='broken-ring-v3';
/** V2 macro geometry with extra room around service pad centers. */
export function brokenRingPlanV3(seed:string,size:CreativeSize):BrokenRingPlan{return {...brokenRingPlanV2(seed,size),version:BROKEN_RING_V3};}
export function brokenRingTemplateV3(seed:string,size:CreativeSize,manifest:AssetManifest){return buildBrokenRingTemplate(brokenRingPlanV3(seed,size),manifest);}
