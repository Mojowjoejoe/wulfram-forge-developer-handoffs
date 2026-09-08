import {reconstructBrokenRingPlan as legacyPlan} from './broken-ring-v2.ts';
import {brokenRingPlanV3,BROKEN_RING_V3} from './broken-ring-v3.ts';
import type {CreativeSize} from './creative-base-layouts.ts';
export function reconstructBrokenRingPlan(version:string,seed:string,size:CreativeSize){return version===BROKEN_RING_V3?brokenRingPlanV3(seed,size):legacyPlan(version,seed,size);}
