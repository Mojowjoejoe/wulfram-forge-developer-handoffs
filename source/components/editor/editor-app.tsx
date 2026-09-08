'use client';
import {applyManualTerrainBrush,type ManualTerrainBrush} from '@/lib/manual-terrain-brush';
import {bendAtPoint} from '@/lib/lane-path';
import type {LaneHandleEdit} from '@/components/editor/lane-path-overlay';
import type {AuthoredBasePackage} from '@/lib/authored-base-package';
import {AuthoredBasePanel,type AuthoredPreview} from './authored-base-panel';
import {routeInspectionProject} from '@/lib/inspection-routes';
import {EditorMenuBar} from './editor-menu-bar';
import {TerrainMeasurementPanel} from './terrain-measurement-panel';
import {BrushLibraryPanel} from './brush-library-panel';
import { terrainSelectionError, terrainSelectionFromPoints, type TerrainSelection } from '@/lib/terrain-selection';
import {BuildAreaPanel} from '@/components/editor/build-area-panel';
import {EntranceRoutingPanel} from './entrance-routing-panel';
import {BUILD_AREAS_KEY,readBuildAreas,buildAreaOutlines as getBuildAreaOutlines,type BuildArea} from '@/lib/build-areas';
import { DistrictArrangementPanel } from './district-arrangement-panel';
import {AuthoringRepairPanel} from '@/components/editor/authoring-repair-panel';
import {previewAuthoringRepair} from '@/lib/authoring-repair';
import {AuthoringProblemsPanel} from '@/components/editor/authoring-problems-panel';
import {CompositionBudgetPanel} from '@/components/editor/composition-budget-panel';
import {COMPOSITION_KEY} from '@/lib/composition-budgets';
import { withCompositionBudgets, assertEditorConstraints, withBuildAreas, withDistrictRelationships } from '@/lib/editor-constraints';
import {DistrictRelationshipsPanel} from '@/components/editor/district-relationships-panel';
import {DISTRICT_RELATIONSHIPS_KEY} from '@/lib/district-relationships';
import {OperationScope} from '@/components/editor/operation-scope';
import {ToolFinder} from '@/components/editor/tool-finder';
import { districtModuleFromSelection, moduleDistrictMetadata } from '@/lib/district-module';
import { WorkflowGuide } from '@/components/editor/workflow-guide';
import { BaseDistrictPanel } from '@/components/editor/base-district-panel';
import { DISTRICTS_KEY, readDistricts, transformDistrict, validateDistrictUpdate } from '@/lib/base-districts';
import { BaseLibraryDialog } from '@/components/editor/base-library-dialog';
import { DISPLAY_PREFERENCES_KEY, parseDisplayPreferences } from '@/lib/display-preferences';
import { PassingMapSearch } from '@/components/editor/passing-map-search';
import { useMcpBridge } from '@/lib/use-mcp-bridge';
import {previewTerrainLane,applyTerrainLane,type TerrainLaneOptions} from '@/lib/terrain-lane';
import {TerrainLanePanel} from './terrain-lane-panel';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Box,
  CheckCircle2,
  CircleDot,
  Download,
  ExternalLink,
  FileArchive,
  FileJson,
  FolderOpen,
  Grid3X3,
  Image as ImageIcon,
  Layers3,
  Mountain,
  Paintbrush,
  Pickaxe,
  Plus,
  Redo2,
  RefreshCw,
  RotateCw,
  Save,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BaseTemplatePreview } from '@/components/editor/base-template-preview';
import { BalancedCandidatePreview } from '@/components/editor/balanced-candidate-preview';
import { buildBalancedCandidate, terrainOnlyCandidate } from '@/lib/balanced-candidate';
import { TerrainDetailDialog } from '@/components/editor/terrain-detail-dialog';
import { TerrainStampDialog } from '@/components/editor/terrain-stamp-dialog';
import {TerrainCompositionPanel} from '@/components/editor/terrain-composition-panel';
import type {previewTerrainComposition} from '@/lib/terrain-composition';
import { TerrainStampPanel } from '@/components/editor/terrain-stamp-panel';
import { stampTerrain, rotateTerrainStamp, type TerrainStampOptions } from '@/lib/terrain-stamp';
import { applyProjectStamp, stampProtection, previewStampTerrain } from '@/lib/terrain-stamp-project';
import { DiagnosticsButton } from '@/components/editor/diagnostics-button';
import { TerrainViewport, type EditorMode, type ModelTransformMode, type StrokePhase, type TerrainTool } from '@/components/editor/terrain-viewport';
import { type BalancedProjectAnalysis } from '@/lib/balanced-map-analysis';
import { generateBalancedBase } from '@/lib/balanced-base-generator';
import { readTerrainGeneratorSettings, readBaseGeneratorSettings } from '@/lib/generator-settings';
import { COMBAT_BASE_TEMPLATE } from '@/lib/combat-base-template';
import { ADVANCED_BASE_TEMPLATES } from '@/lib/advanced-base-templates';
import { BUILTIN_BASE_LAYOUTS, createBuiltinBaseLayout, createCreativeBaseLayout, type CreativePlacement } from '@/lib/builtin-base-layouts';
import {formationRouteSummary} from '@/lib/formation-route-summary';
import {createFormationOptions,preferredFormationOption,type FormationOption} from '@/lib/formation-options';
import {inspectPower,type BaseCameraRequest} from '@/lib/base-inspection';
import {RouteInspector} from '@/components/editor/route-inspector';
import type {ClearanceMarker,RouteCameraRequest,RoutePoint} from '@/lib/route-inspection';
import { CREATIVE_BASE_LAYOUTS } from '@/lib/creative-base-layouts';
import {favoriteFromLayout,placeFavorite,readFormationFavorites,type FormationFavorite} from '@/lib/formation-favorites';
import {FormationDiagnosticError,type FormationOverlay} from '@/lib/formation-diagnostics';
import {
  BALANCED_GENERATOR_VERSION,
  BALANCED_DEFAULT_SIZE,
  BALANCED_DEFAULT_WORLD_SIZE,
  BALANCED_STANDARD_RELIEF,
  randomizeBalancedSettings,
  type BalancedMapTopology,
  type BalancedProjectResult,
} from '@/lib/balanced-map-generator';
import { createMapArchive, readMapArchive, safeMapName } from '@/lib/map-package';
import { heightmapMidpointHeight, heightsFromGrayscaleRgba, recenterHeightmapRange } from '@/lib/heightmap';
import { constrainEntityTransform, hasLockedAltitudeAndRotation } from '@/lib/model-transform';
import {
  type TerrainBrushFalloff,
  type TerrainBrushShape,
} from '@/lib/terrain-brush';
import {
  configureLocalRepository,
  diagnoseLocalRepository,
  hasNativeRepositoryBridge,
  listLocalRepositoryMaps,
  loadLocalRepositoryMap,
  publishLocalRepositoryMap,
  saveLocalRepositoryMap,
  switchLocalRepositoryBranch,
  type RepositoryCatalog,
  type RepositoryDiagnostics,
  type RepositorySaveScope,
} from '@/lib/map-repository-client';
import {
  MAP_REQUIRED_SOURCE_FILES,
  MAP_SOURCE_FILES,
  createMapSourceArchive,
  parseBaseLayoutCollection,
  parseMapSourceFiles,
  readMapSourceArchive,
  type MapSourceFiles,
} from '@/lib/map-source';
import { terrainTemplateFamily } from '@/lib/terrain-textures';
import { resolveSkyboxName, skyboxFromStartScript } from '@/lib/sky-settings';
import { pinTerrainEdgeHeights } from '@/lib/terrain-edge';
import {
  CATALOG,
  DEFAULT_VALIDATION,
  ENTITY_NAMES,
  STRUCTURE_BOTTOM_MARGIN,
  activateBaseLayout,
  catalogFor,
  catalogItemHasModel,
  cloneProject,
  createBlankProject,
  createId,
  hasModelForEntity,
  instantiateBaseTemplate,
  parseBaseLayout,
  parseLand,
  parseLines,
  parseState,
  placementHeightForToken,
  sampleHeight,
  sampleSlopeDegrees,
  snapStructureToTerrain,
  structureTerrainClearance,
  synchronizeActiveBaseLayout,
  toBaseLayout,
  usesFootprintTerrainSnap,
  validateProject,
  type AssetManifest,
  type BaseLayoutMetadata,
  type BaseLayoutState,
  type BaseTemplateLibrary,
  type StateEntity,
  type Vec3,
  type WulframProject,
} from '@/lib/wulfram';

interface MapAnalysis {
  turretDefaults: Record<string, {
    heightOffset: number;
    pitch: number;
    roll: number;
    yawCircularMean: number;
    sampleCount: number;
  }>;
  placementDefaults: Record<string, {
    heightOffset: number;
    method: string;
    name: string;
    sampleCount: number;
    snapMargin: number;
  }>;
  powerCell: {
    serviceRadius: number;
    backupRadius: number;
  };
}

interface Notice {
  tone: 'ready' | 'working' | 'error';
  text: string;
}

interface DirtyScopes {
  terrain: boolean;
  base: boolean;
}

interface BalancedCandidate {
  baseMessage?: string;
  result: BalancedProjectResult;
  analysis: BalancedProjectAnalysis;
}

const STORAGE_KEY = 'wulfram-forge-project-v1';
const MAX_HISTORY = 32;
const BALANCED_TOPOLOGIES: Array<{ id: BalancedMapTopology; label: string; description: string }> = [
  { id: 'open-field', label: 'Open field', description: 'Broad movement space with a central contest lane.' },
  { id: 'three-route', label: 'Three route', description: 'A main route plus two separated flanking routes.' },
  { id: 'ring-center', label: 'Ring center', description: 'A defended central objective with a surrounding rotation lane.' },
];
const BALANCED_TEXTURE_CHOICES = [
  ['canyon003', 'Canyon'],
  ['4sand001', 'Desert sand'],
  ['3grass001', 'Grass'],
  ['1snow001', 'Snow'],
  ['8ice001', 'Ice'],
  ['1martian001', 'Martian'],
  ['reddirt001', 'Red dirt'],
  ['grandcan001', 'Grand canyon'],
] as const;
const TERRAIN_TOOL_LABELS: Record<TerrainTool, string> = {
  lane: 'Lane tool',
  sculpt: 'Raise',
  lower: 'Lower',
  level: 'Flatten',
  smooth: 'Smooth',
  paint: 'Paint texture',
  stamp: 'Set height',
  landform: 'Landform stamp',
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function parseLayoutMetadataSource(source: string): BaseLayoutMetadata {
  const metadata: BaseLayoutMetadata = {};
  for (const [index, rawLine] of source.split(/\r?\n/).entries()) {
    if (!rawLine.trim()) continue;
    const equals = rawLine.indexOf('=');
    if (equals < 1) throw new Error(`Metadata line ${index + 1} must use key=value.`);
    const key = rawLine.slice(0, equals).trim();
    const value = rawLine.slice(equals + 1).trim();
    if (!key) throw new Error(`Metadata line ${index + 1} has an empty key.`);
    if (Object.hasOwn(metadata, key)) throw new Error(`Metadata key “${key}” is duplicated.`);
    metadata[key] = value;
  }
  return metadata;
}

function projectWithLayoutMetadataDraft(project: WulframProject, source?: string): WulframProject {
  const next = cloneProject(project);
  if (source === undefined) return next;
  const active = next.baseLayouts.find((layout) => layout.id === next.activeBaseLayoutId);
  if (active) {
    const parsed = parseLayoutMetadataSource(source);
    // Saving an unchanged imported map must remain possible even when its
    // existing rules need repair. Only an actual metadata edit is a mutation.
    if (Object.keys(parsed).length === Object.keys(active.metadata).length && Object.entries(parsed).every(([key,value]) => active.metadata[key] === value)) return synchronizeActiveBaseLayout(next);
    active.metadata = parsed;
  }
  assertEditorConstraints(project,next);
  return synchronizeActiveBaseLayout(next);
}

function importedStateLayoutName(fileName: string): string {
  const base = fileName.replace(/\\/g, '/').split('/').pop() ?? fileName;
  return base.toLowerCase() === 'state' ? 'Default' : base.replaceAll('_', ' ');
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const displayedValue = Number.isFinite(value) ? String(Number(value.toFixed(4))) : '0';
  return (
    <label className="number-field">
      <span>{label}</span>
      <input
        disabled={disabled}
        max={max}
        min={min}
        onBlur={() => setDraft(null)}
        onFocus={() => setDraft(displayedValue)}
        onChange={(event) => {
          setDraft(event.target.value);
          const next = event.target.valueAsNumber;
          if (Number.isFinite(next)) onChange(next);
        }}
        step={step}
        type="number"
        value={draft ?? displayedValue}
      />
    </label>
  );
}

function RangeField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix = '',
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <label className="range-field">
      <span><b>{label}</b><output>{Math.round(value * 100) / 100}{suffix}</output></span>
      <input aria-label={label} max={max} min={min} onChange={(event) => onChange(Number(event.target.value))} step={step} type="range" value={value} />
    </label>
  );
}

export function EditorApp() {
  const [manifest, setManifest] = useState<AssetManifest>();
  const [analysis, setAnalysis] = useState<MapAnalysis>();
  const [baseTemplates, setBaseTemplates] = useState<BaseTemplateLibrary>();
  const [baseLibraryOpen, setBaseLibraryOpen] = useState(false);
  const [navigationTarget,setNavigationTarget]=useState<{selector:string;label:string;resolve:(message:string)=>void}>();
  useEffect(()=>{
    if(!navigationTarget)return;
    let timer:ReturnType<typeof setTimeout>,attempts=0;
    const focus=()=>{
      const target=document.querySelector<HTMLElement>(navigationTarget.selector);
      if(!target){if(++attempts<10)timer=setTimeout(focus,50);else navigationTarget.resolve(`Could not find ${navigationTarget.label}. Try opening the shortcut again. Map unchanged.`);return;}
      for(let element:HTMLElement|null=target;element;element=element.parentElement)if(element instanceof HTMLDetailsElement)element.open=true;
      target.scrollIntoView({block:'center'});
      const control=target.matches('details')?target.querySelector<HTMLElement>('summary'):target.querySelector<HTMLElement>('input:not([disabled]),select:not([disabled]),button:not([disabled]),summary');
      if(control)control.focus({preventScroll:true});else{target.tabIndex=-1;target.focus({preventScroll:true});}
      navigationTarget.resolve(`Opened ${navigationTarget.label}. Map unchanged.`);
    };
    timer=setTimeout(focus,0);return()=>{clearTimeout(timer);navigationTarget.resolve('Navigation superseded. Map unchanged.');};
  },[navigationTarget]);
  const [project, setProject] = useState<WulframProject>();
  const [authoredSelection,setAuthoredSelection]=useState<{base?:AuthoredBasePackage;serial:string}>();
  const [authoredPreview,setAuthoredPreview]=useState<AuthoredPreview>();

  const [mode, setMode] = useState<EditorMode>('base');
  const [baseInspectorPage,setBaseInspectorPage]=useState<'build'|'rules'>('build');
  const [terrainTool, setTerrainTool] = useState<TerrainTool>('sculpt');
  const [brushRadius, setBrushRadius] = useState(165);
  const [terrainStampOpen, setTerrainStampOpen] = useState(false);
  const [stampSettings, setStampSettings] = useState<Omit<TerrainStampOptions, 'x' | 'y'>>({ shapeVersion: 'natural-v2', preset: 'ridge', radius: 300, aspect: .4, rotation: 0, amplitude: 150, edgePower: 2, mirror: true, seed: 'landform-001', naturalness: .6, roughness: .3, bend: .5, blend: .25 });
  const [stampSafe, setStampSafe] = useState(true);
  const [showStampProtection, setShowStampProtection] = useState(true);
  const [brushStrength, setBrushStrength] = useState(32);
  const [terrainSelection, setTerrainSelection] = useState<TerrainSelection>();
  const [drawingSelection,setDrawingSelection]=useState(false);
  const [laneOptions,setLaneOptions]=useState<TerrainLaneOptions>({points:[],width:300,shoulder:400,floorHeight:0,operation:'cut',mirror:false,placementMode:'manual'});
  const [drawingLane,setDrawingLane]=useState(false);
  const [editingLaneHandle,setEditingLaneHandle]=useState(false);
  const laneHandleOriginal=useRef<{project:WulframProject;options:TerrainLaneOptions}|undefined>(undefined);
  const [laneSource,setLaneSource]=useState<WulframProject>();
  const laneGesture=useRef<{source:WulframProject;start?:[number,number];cancelled?:boolean}|undefined>(undefined);
  const cancelLane=useCallback(()=>{laneHandleOriginal.current=undefined;setEditingLaneHandle(false);if(laneGesture.current?.start)laneGesture.current.cancelled=true;else laneGesture.current=undefined;setDrawingLane(false);setLaneSource(undefined);setLaneOptions(o=>({...o,points:[]}));},[]);
  useEffect(()=>{let current=true;queueMicrotask(()=>{if(current)cancelLane();});return()=>{current=false;};},[mode,terrainTool,project,cancelLane]);
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&laneGesture.current){e.preventDefault();cancelLane();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[cancelLane]);
  useEffect(()=>{const blur=()=>{if(laneGesture.current)cancelLane();};window.addEventListener('blur',blur);return()=>window.removeEventListener('blur',blur);},[cancelLane]);
  const [selectionDraft,setSelectionDraft]=useState<TerrainSelection>();
  const selectionGesture=useRef<{source:WulframProject;start?:[number,number];last?:[number,number];cancelled?:boolean}|undefined>(undefined);
  const cancelSelectionDrawing=useCallback(()=>{const gesture=selectionGesture.current;if(gesture?.start)gesture.cancelled=true;else selectionGesture.current=undefined;setDrawingSelection(false);setSelectionDraft(undefined);},[]);
  useEffect(()=>{let current=true;queueMicrotask(()=>{if(current)cancelSelectionDrawing();});return()=>{current=false;};},[mode,terrainTool,project,cancelSelectionDrawing]);
  useEffect(()=>{const key=(event:KeyboardEvent)=>{if(event.key==='Escape'&&selectionGesture.current){event.preventDefault();cancelSelectionDrawing();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[cancelSelectionDrawing]);

  const [brushShape, setBrushShape] = useState<TerrainBrushShape>('round');
  const [brushFalloff, setBrushFalloff] = useState<TerrainBrushFalloff>('soft');
  const [terrainTargetHeight, setTerrainTargetHeight] = useState(0);
  const [lastTerrainHeight, setLastTerrainHeight] = useState<number>();
  const [selectedTexture, setSelectedTexture] = useState('canyon003');
  const [compositionEditing,setCompositionEditing]=useState(false);
  const composingTerrain=mode==='terrain'&&terrainTool==='landform'&&compositionEditing;
  const [compositionPreview,setCompositionPreview]=useState<{source:WulframProject;proposal:ReturnType<typeof previewTerrainComposition>;original?:boolean}>();
  const activeComposition=mode==='terrain'&&terrainTool==='landform'&&compositionPreview&&compositionPreview.source===project?compositionPreview.proposal:undefined;
  const [textureSearch, setTextureSearch] = useState('');
  const [texturePage, setTexturePage] = useState(0);
  const [team, setTeam] = useState(1);
  const [placementHeight, setPlacementHeight] = useState(STRUCTURE_BOTTOM_MARGIN);
  const [selectedPlacementKey, setSelectedPlacementKey] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>();
  const [templateScale, setTemplateScale] = useState(1);
  const [templateYaw, setTemplateYaw] = useState(0);
  const [selectedEntityId, setSelectedEntityId] = useState<string>();
  useEffect(()=>{
    if(mode==='base'&&selectedEntityId)document.querySelector('.inspector')?.scrollTo({top:0});
  },[mode,selectedEntityId]);
  const [districtSelection,setDistrictSelection]=useState<{layoutId:string;ids:string[]}>();
  const [inspectionMode,setInspectionMode]=useState(false);
  const [inspectedId,setInspectedId]=useState<string>();
  const [baseCameraRequest,setBaseCameraRequest]=useState<BaseCameraRequest>();
  const [routeCameraRequest,setRouteCameraRequest]=useState<RouteCameraRequest>();
  const [routeMarkers,setRouteMarkers]=useState<ClearanceMarker[]>([]);
  const [routePath,setRoutePath]=useState<RoutePoint[]>([]);
  const [inspectionSketch,setInspectionSketch]=useState<{source:WulframProject;points:RoutePoint[];drawing:boolean}>();
  const [routePause,setRoutePause]=useState(0);
  const [displayOptions,setDisplayOptions]=useState({overlays:true,boundaries:true,areas:true,entrances:true,links:true,routes:true,markers:true});
  const pauseRoute=useCallback(()=>setRoutePause(n=>n+1),[]);
  const routePauseToken=useMemo(()=>({baseCameraRequest,routePause}),[baseCameraRequest,routePause]);
  const routeCamera=useCallback((request:RouteCameraRequest)=>{setInspectionMode(true);setSelectedEntityId(undefined);setRouteCameraRequest(request);},[]);
  const entrancePreviewCamera=useCallback((request:RouteCameraRequest)=>{setSelectedEntityId(undefined);setRouteCameraRequest(request);},[]);
  const [modelTransformMode, setModelTransformMode] = useState<ModelTransformMode>('translate');
  const [showGrid, setShowGrid] = useState(true);
  const [cursor, setCursor] = useState<Vec3>();
  const [areaPreview,setAreaPreview]=useState<{layout:BaseLayoutState;area:BuildArea}>();
  const [powerTint, setPowerTint] = useState(true);
  const [powerIcons, setPowerIcons] = useState(true);
  const [creativeDraft, setCreativeDraft] = useState<{style:string;seed:string;placement:CreativePlacement;favoriteId?:string}>();
  const [formationFavorites,setFormationFavorites]=useState<FormationFavorite[]>([]);
  const [coverage,setCoverage]=useState({power:true,darklight:false,turrets:false});
  const [creativeCandidate, setCreativeCandidate] = useState<{layout:BaseLayoutState;source:WulframProject;draft:typeof creativeDraft}>();
  const [creativeOptions,setCreativeOptions]=useState<{items:FormationOption[];source:WulframProject;draft:typeof creativeDraft}>();
  const [creativeDiagnostics,setCreativeDiagnostics]=useState<{source:WulframProject;draft:typeof creativeDraft;overlay:FormationOverlay}>();
  const [showAccessPaths,setShowAccessPaths]=useState(true);
  const [displayPreferencesLoaded, setDisplayPreferencesLoaded] = useState(false);
  const [displayPreferencesMessage, setDisplayPreferencesMessage] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => {
    try {
      const p = parseDisplayPreferences(localStorage.getItem(DISPLAY_PREFERENCES_KEY));
      setPowerTint(p.powerTint); setPowerIcons(p.powerIcons); setShowAccessPaths(p.showAccessPaths);
      setShowGrid(p.showGrid); setCoverage(p.coverage); setDisplayOptions(p.displayOptions);
    } catch { setDisplayPreferencesMessage('Display settings cannot be stored on this device; changes last for this session.'); }
    setDisplayPreferencesLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!displayPreferencesLoaded) return;
    const timer = window.setTimeout(() => {
    try {
      localStorage.setItem(DISPLAY_PREFERENCES_KEY, JSON.stringify({ powerTint, powerIcons, showAccessPaths, showGrid, coverage, displayOptions }));
      setDisplayPreferencesMessage('Display settings are remembered on this device, separately from maps.');
    } catch { setDisplayPreferencesMessage('Display settings cannot be stored on this device; changes last for this session.'); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [displayPreferencesLoaded, powerTint, powerIcons, showAccessPaths, showGrid, coverage, displayOptions]);
  const [heightmapRange, setHeightmapRange] = useState<[number, number]>([0, 180]);
  const [heightmapGamma, setHeightmapGamma] = useState(1);
  const [heightmapSmoothing, setHeightmapSmoothing] = useState(2);
  const [heightmapFile, setHeightmapFile] = useState<File>();
  const [heightmapPreviewUrl, setHeightmapPreviewUrl] = useState('');
  const [heightmapDialogOpen, setHeightmapDialogOpen] = useState(false);
  const [balancedDialogOpen, setBalancedDialogOpen] = useState(false);
  const [terrainDetailOpen, setTerrainDetailOpen] = useState(false);
  const [balancedSeed, setBalancedSeed] = useState('forge-001');
  const [baseDesignerOpen, setBaseDesignerOpen] = useState(false);
  const [baseSeed, setBaseSeed] = useState('base-001');
  const [baseFootprint, setBaseFootprint] = useState(1000);
  const [baseSpacing, setBaseSpacing] = useState(1);
  const [baseRotation, setBaseRotation] = useState(0);
  const [baseDesignerError, setBaseDesignerError] = useState('');
  const [baseCandidate, setBaseCandidate] = useState<(ReturnType<typeof generateBalancedBase> & { source: WulframProject })>();
  const [balancedName, setBalancedName] = useState('Generated balanced map');
  const [balancedRelief, setBalancedRelief] = useState(BALANCED_STANDARD_RELIEF);
  const [balancedBaseHeight, setBalancedBaseHeight] = useState(0);
  const [balancedSize, setBalancedSize] = useState(BALANCED_DEFAULT_SIZE);
  const [balancedPreset, setBalancedPreset] = useState<BalancedMapTopology | 'all'>('all');
  const [balancedSeparation, setBalancedSeparation] = useState(46);
  const [balancedRouteWidth, setBalancedRouteWidth] = useState(1);
  const [balancedCentralSize, setBalancedCentralSize] = useState(1);
  const balancedCandidateCount = balancedPreset === 'all' ? 3 : 1;
  const [balancedWorldWidth, setBalancedWorldWidth] = useState(BALANCED_DEFAULT_WORLD_SIZE);
  const [balancedWorldHeight, setBalancedWorldHeight] = useState(BALANCED_DEFAULT_WORLD_SIZE);
  const [balancedTextureName, setBalancedTextureName] = useState('canyon003');
  const [balancedTemplateId, setBalancedTemplateId] = useState('curated-base-in-a-box');
  const [balancedCandidates, setBalancedCandidates] = useState<BalancedCandidate[]>([]);
  const [balancedSelectedIndex, setBalancedSelectedIndex] = useState(0);
  const [balancedError, setBalancedError] = useState('');
  const [balancedGenerating, setBalancedGenerating] = useState(false);
  const [balancedGenerationProgress, setBalancedGenerationProgress] = useState(0);
  const [undoStack, setUndoStack] = useState<WulframProject[]>([]);
  const [redoStack, setRedoStack] = useState<WulframProject[]>([]);
  const [dirtyScopes, setDirtyScopes] = useState<DirtyScopes>({ terrain: false, base: false });
  const [notice, setNotice] = useState<Notice>({ tone: 'working', text: 'Loading original Wulfram assets…' });
  useEffect(()=>{queueMicrotask(()=>{try{setFormationFavorites(readFormationFavorites(localStorage.getItem('forge-formation-favorites-v1')??'[]'));}catch{setNotice({tone:'error',text:'Saved formation favorites could not be read. The stored library has been left untouched.'});}});},[]);
  const [repositoryCatalog, setRepositoryCatalog] = useState<RepositoryCatalog>();
  const [repositorySlug, setRepositorySlug] = useState('');
  const [repositoryChecked, setRepositoryChecked] = useState(false);
  const [repositoryBusy, setRepositoryBusy] = useState(false);
  const [repositoryWizardOpen, setRepositoryWizardOpen] = useState(false);
  const [repositoryDiagnostics, setRepositoryDiagnostics] = useState<RepositoryDiagnostics>();
  const [repositoryDiagnosticError, setRepositoryDiagnosticError] = useState('');
  const [repositoryDiagnosticBusy, setRepositoryDiagnosticBusy] = useState(false);
  const [repositoryBranchDraft, setRepositoryBranchDraft] = useState('');
  const [lastPullRequestUrl, setLastPullRequestUrl] = useState('');
  const [nativeRepositoryBridge] = useState(hasNativeRepositoryBridge);
  const importRef = useRef<HTMLInputElement>(null);
  const heightmapRef = useRef<HTMLInputElement>(null);
  const layoutMetadataRef = useRef<HTMLTextAreaElement>(null);
  const balancedGenerationTokenRef = useRef(0);
  const balancedWasGeneratingRef = useRef(false);
  const balancedGenerateButtonRef = useRef<HTMLButtonElement>(null);
  const balancedSelectedButtonRef = useRef<HTMLButtonElement>(null);
  const strokeSnapshotRef = useRef<WulframProject | null>(null);
  const levelHeightRef = useRef(0);
  const dirty = dirtyScopes.terrain || dirtyScopes.base;

  useEffect(() => {
    const finished = balancedWasGeneratingRef.current && !balancedGenerating;
    balancedWasGeneratingRef.current = balancedGenerating;
    if (finished && balancedDialogOpen && document.activeElement === document.body) {
      // Disabling Generate can blur it. Restore a useful review target, but never
      // steal focus from a control the user chose while generation was running.
      (balancedSelectedButtonRef.current ?? balancedGenerateButtonRef.current)?.focus();
    }
  }, [balancedGenerating, balancedDialogOpen]);

  const markDirty = useCallback((scope: RepositorySaveScope | 'both') => {
    setDirtyScopes((current) => ({
      terrain: current.terrain || scope === 'terrain' || scope === 'all' || scope === 'both',
      base: current.base || scope === 'base' || scope === 'all' || scope === 'both',
    }));
  }, []);

  const updateCursor = useCallback((point?: Vec3) => {
    setCursor(point);
    if (point) setLastTerrainHeight(point[2]);
  }, []);

  useEffect(() => () => {
    if (heightmapPreviewUrl) URL.revokeObjectURL(heightmapPreviewUrl);
  }, [heightmapPreviewUrl]);

  useEffect(() => {
    const cancelPlacement = (event: KeyboardEvent) => {
      if (event.key !== 'Escape'
        || mode !== 'base'
        || repositoryWizardOpen
        || heightmapDialogOpen
        || balancedDialogOpen
        || (!selectedPlacementKey && !selectedTemplateId)) return;
      event.preventDefault();
      setSelectedPlacementKey('');
      setSelectedTemplateId(undefined);
      setNotice({ tone: 'ready', text: 'Placement tool cleared · select a unit or template to place again' });
    };
    window.addEventListener('keydown', cancelPlacement);
    return () => window.removeEventListener('keydown', cancelPlacement);
  }, [balancedDialogOpen, heightmapDialogOpen, mode, repositoryWizardOpen, selectedPlacementKey, selectedTemplateId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [assetsResponse, analysisResponse, templatesResponse] = await Promise.all([
          fetch('/assets/manifest.json', { cache: 'no-cache' }),
          fetch('/assets/map-analysis.json'),
          fetch('/assets/base-templates.json'),
        ]);
        if (!assetsResponse.ok || !analysisResponse.ok || !templatesResponse.ok) throw new Error('The extracted asset manifest is unavailable.');
        const assets = await assetsResponse.json() as AssetManifest;
        const mapAnalysis = await analysisResponse.json() as MapAnalysis;
        const templateLibrary = await templatesResponse.json() as BaseTemplateLibrary;
        if (cancelled) return;
        setManifest(assets);
        setAnalysis(mapAnalysis);
        setBaseTemplates({ ...templateLibrary, templates: [
          ...structuredClone(ADVANCED_BASE_TEMPLATES),
          ...templateLibrary.templates.filter(template => template.id !== COMBAT_BASE_TEMPLATE.id && !ADVANCED_BASE_TEMPLATES.some(advanced => advanced.id === template.id)),
          structuredClone(COMBAT_BASE_TEMPLATE),
        ] });
        if (assets.terrainTextures.canyon003 === undefined) {
          setSelectedTexture(Object.keys(assets.terrainTextures)[0] ?? '10martian001');
        }

        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const restored = JSON.parse(stored) as WulframProject;
            if (restored.format === 'wulfram-map-project' && restored.version === 1) {
              setProject(cloneProject(restored));
              setNotice({ tone: 'ready', text: 'Restored the latest local project' });
              return;
            }
          } catch {
            window.localStorage.removeItem(STORAGE_KEY);
          }
        }

        const base = assets.demo.baseUrl;
        const [land, state, tagmap, tagmap2, startScript] = await Promise.all([
          fetch(`${base}/land`).then((response) => response.text()),
          fetch(`${base}/state`).then((response) => response.text()),
          fetch(`${base}/tagmap`).then((response) => response.text()),
          fetch(`${base}/tagmap2`).then((response) => response.text()),
          fetch(`${base}/start_script`).then((response) => response.ok ? response.text() : ''),
        ]);
        const terrain = parseLand(land);
        terrain.tagmap = parseLines(tagmap);
        terrain.tagmap2 = parseLines(tagmap2);
        terrain.skyName = skyboxFromStartScript(startScript);
        const entities = parseState(state);
        const updatedAt = new Date().toISOString();
        const validation = {
          ...DEFAULT_VALIDATION,
          serviceRadius: mapAnalysis.powerCell.serviceRadius,
          backupRadius: mapAnalysis.powerCell.backupRadius,
        };
        const demo: WulframProject = {
          format: 'wulfram-map-project',
          version: 1,
          name: assets.demo.name,
          terrain,
          entities,
          validation,
          baseLayouts: [{
            id: 'default',
            name: 'Default',
            metadata: {},
            entities: entities.map((entity) => ({
              ...entity,
              position: [...entity.position] as Vec3,
              rotation: [...entity.rotation] as Vec3,
            })),
            validation: { ...validation },
            updatedAt,
          }],
          activeBaseLayoutId: 'default',
          updatedAt,
        };
        if (!cancelled) {
          setProject(demo);
          setNotice({ tone: 'ready', text: 'Crossroads loaded from the original map files' });
        }
      } catch (error) {
        if (!cancelled) setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Editor initialization failed.' });
      }
    }
    void load().finally(() => {
      // Reveal the native editor only after initialization (including its error UI)
      // has had a chance to render. No artificial minimum splash duration.
      if (cancelled) return;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!cancelled) (window as typeof window & {
          chrome?: { webview?: { postMessage(value: unknown): void } };
        }).chrome?.webview?.postMessage('forge-startup-ready');
      }));
    });
    return () => { cancelled = true; };
  }, []);

  const refreshRepository = useCallback(async (announce = false) => {
    try {
      const catalog = await listLocalRepositoryMaps(announce ? 8000 : 1500);
      setRepositoryCatalog(catalog);
      setRepositorySlug((current) => catalog.maps.some((map) => map.slug === current) ? current : (catalog.maps[0]?.slug ?? ''));
      if (announce) setNotice({ tone: 'ready', text: `Found ${catalog.maps.length} map${catalog.maps.length === 1 ? '' : 's'} in the local repository` });
    } catch (error) {
      setRepositoryCatalog(undefined);
      if (announce) {
        setRepositoryWizardOpen(true);
        setRepositoryDiagnosticError(error instanceof Error ? error.message : 'Local maps service is offline.');
        setNotice({
          tone: 'error',
          text: error instanceof Error ? `${error.message} Run npm run dev to enable repository access.` : 'Local maps service is offline.',
        });
      }
    } finally {
      setRepositoryChecked(true);
    }
  }, []);

  const diagnoseRepository = useCallback(async () => {
    try {
      setRepositoryDiagnosticBusy(true);
      setRepositoryDiagnosticError('');
      setRepositoryDiagnostics(await diagnoseLocalRepository());
    } catch (error) {
      setRepositoryDiagnostics(undefined);
      setRepositoryDiagnosticError(error instanceof Error ? error.message : 'The local maps service did not respond.');
    } finally {
      setRepositoryDiagnosticBusy(false);
    }
  }, []);

  const openRepositoryWizard = useCallback(() => {
    setRepositoryWizardOpen(true);
    void diagnoseRepository();
  }, [diagnoseRepository]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshRepository(false), 0);
    return () => window.clearTimeout(timer);
  }, [refreshRepository]);

  const configureRepository = useCallback(async () => {
    try {
      setRepositoryBusy(true);
      const catalog = await configureLocalRepository();
      setRepositoryCatalog(catalog);
      setRepositorySlug(catalog.maps[0]?.slug ?? '');
      setRepositoryChecked(true);
      setNotice({ tone: 'ready', text: `Using ${catalog.repository}` });
      void diagnoseRepository();
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Repository selection failed.' });
    } finally {
      setRepositoryBusy(false);
    }
  }, [diagnoseRepository]);

  const changeRepositoryBranch = useCallback(async (branch: string, create: boolean) => {
    const normalized = branch.trim();
    if (!normalized) return;
    try {
      setRepositoryBusy(true);
      const catalog = await switchLocalRepositoryBranch(normalized, create);
      setRepositoryCatalog(catalog);
      setRepositorySlug((current) => catalog.maps.some((map) => map.slug === current) ? current : (catalog.maps[0]?.slug ?? ''));
      setRepositoryBranchDraft('');
      setNotice({ tone: 'ready', text: `${create ? 'Created and switched to' : 'Switched to'} ${catalog.branch}` });
      void diagnoseRepository();
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Branch operation failed.' });
    } finally {
      setRepositoryBusy(false);
    }
  }, [diagnoseRepository]);

  useEffect(() => {
    if (!project) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
      } catch {
        setNotice({ tone: 'error', text: 'Local autosave is full; export a ZIP backup.' });
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [project]);

  const pushHistory = useCallback((snapshot: WulframProject) => {
    setUndoStack((stack) => [...stack.slice(-(MAX_HISTORY - 1)), snapshot]);
    setRedoStack([]);
  }, []);

  const mutate = useCallback((
    change: (draft: WulframProject) => void,
    record = true,
    scope: RepositorySaveScope | 'both' = mode === 'base' ? 'base' : 'terrain',
    allowUnlock = false,
    allowAreaChanges = false,
    allowRelationshipChanges = false,
    allowCompositionChanges = false,
  ) => {
    setProject((current) => {
      if (!current) return current;
      const next = cloneProject(current);
      change(next);
      const updatedAt = new Date().toISOString();
      next.updatedAt = updatedAt;
      if (scope === 'base' || scope === 'all' || scope === 'both') {
        synchronizeActiveBaseLayout(next, updatedAt);
      }
      try{assertEditorConstraints(current,next,manifest,allowUnlock,allowAreaChanges,allowRelationshipChanges,allowCompositionChanges);}catch(error){setNotice({tone:'error',text:error instanceof Error?error.message:'Authoring constraint blocked this edit.'});return current;}
      if (record) pushHistory(cloneProject(current));
      markDirty(scope);
      return next;
    });
  }, [markDirty, mode, pushHistory, manifest]);

  const undo = useCallback(() => {
    setUndoStack((stack) => {
      const previous = stack[stack.length - 1];
      if (!previous) return stack;
      setProject((current) => {
        if (current) setRedoStack((redo) => [...redo.slice(-(MAX_HISTORY - 1)), cloneProject(current)]);
        return cloneProject(previous);
      });
      markDirty('both');
      return stack.slice(0, -1);
    });
  }, [markDirty]);

  useMcpBridge({ project, manifest, selectedEntityId, dirty, undoCount: undoStack.length, redoCount: redoStack.length,
    commit: (next, kind) => mutate((draft) => { Object.assign(draft, next); }, true, kind==='terrain-protection'?'base':'both', false, kind==='terrain-protection'), undo });

  const redo = useCallback(() => {
    setRedoStack((stack) => {
      const next = stack[stack.length - 1];
      if (!next) return stack;
      setProject((current) => {
        if (current) setUndoStack((undoHistory) => [...undoHistory.slice(-(MAX_HISTORY - 1)), cloneProject(current)]);
        return cloneProject(next);
      });
      markDirty('both');
      return stack.slice(0, -1);
    });
  }, [markDirty]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('.base-library-dialog')) return;
      if (target.matches('input, textarea, select')) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (project) {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
          setDirtyScopes({ terrain: false, base: false });
          setNotice({ tone: 'ready', text: 'Saved locally' });
        }
      } else if (event.key === 'Delete' && selectedEntityId) {
        mutate((draft) => { draft.entities = draft.entities.filter((entity) => entity.id !== selectedEntityId); });
        setSelectedEntityId(undefined);
      } else if (mode === 'terrain' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const shortcutTools: Record<string, TerrainTool> = {
          '1': 'sculpt',
          '2': 'lower',
          '3': 'level',
          '4': 'smooth',
          '5': 'paint',
          '6': 'stamp',
        };
        const tool = shortcutTools[event.key];
        if (tool) {
          event.preventDefault();
          setTerrainTool(tool);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, mutate, project, redo, selectedEntityId, undo]);

  const creativePreviewLayout=creativeDraft&&creativeCandidate?.draft===creativeDraft&&creativeCandidate.source===project?creativeCandidate.layout:undefined;
  const activeAuthoredPreview=mode==='base'&&!creativeDraft&&authoredPreview?.source===project?authoredPreview:undefined;
  const inspectionEntities=activeAuthoredPreview?activeAuthoredPreview.project.entities:creativeDraft?(creativePreviewLayout?.entities??[]):project?.entities??[];
  const inspected=inspectionEntities.find(e=>e.id===inspectedId);
  const inspectionRadius=activeAuthoredPreview?.project.validation.serviceRadius??creativePreviewLayout?.validation.serviceRadius??project?.validation.serviceRadius??280;
  const routeProject=useMemo(()=>project?routeInspectionProject(activeAuthoredPreview?.project??project,!!creativeDraft,creativePreviewLayout):undefined,[project,creativeDraft,creativePreviewLayout,activeAuthoredPreview]);
  const activeInspectionSketch=inspectionSketch?.source===routeProject&&mode==='base'&&inspectionMode&&displayOptions.routes?inspectionSketch:undefined;
  useEffect(()=>{if(inspectionSketch&&!activeInspectionSketch)setInspectionSketch(undefined);},[inspectionSketch,activeInspectionSketch]);
  useEffect(()=>{
    if(!activeInspectionSketch?.drawing)return;
    const cancel=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();setInspectionSketch(undefined);}};
    window.addEventListener('keydown',cancel);return()=>window.removeEventListener('keydown',cancel);
  },[activeInspectionSketch?.drawing]);
  const inspectedPower=inspected?inspectPower(inspected,inspectionEntities,inspectionRadius):undefined;
  const issues = useMemo(() => project ? validateProject(activeAuthoredPreview?activeAuthoredPreview.project:creativePreviewLayout?{...project,entities:creativePreviewLayout.entities,validation:creativePreviewLayout.validation}:project) : [], [creativePreviewLayout,project,activeAuthoredPreview]);
  const districtSelectedIds = useMemo(() => districtSelection?.layoutId === project?.activeBaseLayoutId
    ? districtSelection?.ids.filter(id => project?.entities.some(e => e.id === id)) ?? [] : [], [districtSelection, project?.activeBaseLayoutId, project?.entities]);
  const selectedEntity = useMemo(
    () => project?.entities.find((entity) => entity.id === selectedEntityId),
    [project, selectedEntityId],
  );
  const selectedTransformLocked = Boolean(selectedEntity && hasLockedAltitudeAndRotation(selectedEntity));
  const selectedIssues = useMemo(
    () => issues.filter((issue) => issue.entityId === selectedEntityId),
    [issues, selectedEntityId],
  );
  const stateRequirementIssues = useMemo(
    () => issues.filter((issue) => issue.code === 'state-uplink' || issue.code === 'state-powered-repair'),
    [issues],
  );
  const selectedTemplate = useMemo(
    () => baseTemplates?.templates.find((template) => template.id === selectedTemplateId) ?? formationFavorites.find(f=>f.kind==='district'&&f.id===selectedTemplateId)?.template,
    [baseTemplates, selectedTemplateId, formationFavorites],
  );
  const activeLayout = useMemo(
    () => project?.baseLayouts.find((layout) => layout.id === project.activeBaseLayoutId),
    [project],
  );
  const buildAreaOutlines=getBuildAreaOutlines((creativeDraft?creativePreviewLayout:activeLayout)?.metadata[BUILD_AREAS_KEY],!creativeDraft&&areaPreview && areaPreview.layout===activeLayout ? areaPreview.area : undefined);

  const selectBaseLayout = useCallback((id: string) => {
    if (!project || id === project.activeBaseLayoutId) return;
    if (id.startsWith('creative:')) {
      const {worldWidth:w,worldHeight:h}=project.terrain;
      setCreativeCandidate(undefined);
      setCreativeDraft({style:id.slice(9),seed:createId('seed'),placement:{size:'large',x:w>=h?w/4:w/2,y:w>=h?h/2:h/4,rotation:w>=h?0:90,radius:['broken-ring','valley-pockets','three-lane-anchor'].includes(id.slice(9))?3300:1800,targetCount:0,checkAccess:true,terrainAware:true}});
      setSelectedEntityId(undefined);
      return;
    }
    setCreativeDraft(undefined); setCreativeCandidate(undefined);
    if (id.startsWith('builtin:') || id.startsWith('creative:')) {
      if (!manifest) return;
      try {
        const layoutId = createId('layout');
        const layout = id.startsWith('creative:')
          ? createCreativeBaseLayout(project, manifest, id.slice(9), layoutId, createId('seed'))
          : createBuiltinBaseLayout(project, manifest, id.slice(8), layoutId);
        mutate((draft) => {
          draft.baseLayouts.push(layout);
          activateBaseLayout(draft, layout.id);
        }, true, 'base');
        setSelectedEntityId(undefined);
        setNotice({ tone: 'ready', text: `${layout.name} added as a separate layout. Check terrain and firing coverage before play.` });
      } catch (error) {
        setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Formation could not be placed.' });
      }
      return;
    }
    mutate((draft) => { activateBaseLayout(draft, id); }, true, 'base');
    setSelectedEntityId(undefined);
    const name = project.baseLayouts.find((layout) => layout.id === id)?.name ?? id;
    setNotice({ tone: 'ready', text: `${name} is now the active base layout` });
  }, [manifest, mutate, project]);

  const previewCreativeDraft=useCallback((draft:NonNullable<typeof creativeDraft>)=>{
    if(!project||!manifest)return;
    setCreativeCandidate(undefined);setCreativeDiagnostics(undefined);setCreativeOptions(undefined);
    try{
      const favorite=formationFavorites.find(f=>f.id===draft.favoriteId);
      const candidates:FormationOption[]=favorite?[{layout:placeFavorite(project,manifest,favorite,draft.placement,createId('layout'))}]:createFormationOptions(project,manifest,draft.style,createId('layout'),draft.seed,draft.placement);
      const items=candidates.map(item=>item.layout?{...item,routeSummary:formationRouteSummary(project,manifest,item.layout)}:item);
      setCreativeOptions({items,source:project,draft});
      const layout=preferredFormationOption(items)?.layout;
      if(layout){setCreativeCandidate({layout,source:project,draft});setNotice({tone:'ready',text:`${items.filter(item=>item.layout).length} of ${items.length} arrangements fit. The initial selection prefers checked approaches with fewer blocked, then tight routes. Select any option to compare; Apply adds only the selected layout.`});}
      else {const failure:FormationOption=items[0];if(failure.overlay)setCreativeDiagnostics({source:project,draft,overlay:failure.overlay});setNotice({tone:'error',text:failure.error??'No arrangement fits here.'});}
    }catch(error){
      if(error instanceof FormationDiagnosticError)setCreativeDiagnostics({source:project,draft,overlay:error.overlay});
      setNotice({tone:'error',text:error instanceof Error?error.message:'Preview failed.'});
    }
  },[formationFavorites,manifest,project]);

  const addBaseLayout = useCallback((duplicate: boolean) => {
    if (!project || !activeLayout) return;
    const id = createId('layout');
    const now = new Date().toISOString();
    const layout: BaseLayoutState = {
      id,
      name: duplicate ? `${activeLayout.name} copy` : `Layout ${project.baseLayouts.length + 1}`,
      metadata: duplicate ? { ...activeLayout.metadata } : {},
      entities: duplicate
        ? activeLayout.entities.map((entity) => ({
            ...entity,
            position: [...entity.position] as Vec3,
            rotation: [...entity.rotation] as Vec3,
          }))
        : [],
      validation: { ...activeLayout.validation },
      updatedAt: now,
    };
    mutate((draft) => {
      draft.baseLayouts.push(layout);
      activateBaseLayout(draft, id);
    }, true, 'base');
    setSelectedEntityId(undefined);
    setNotice({ tone: 'ready', text: `${layout.name} created${duplicate ? ' from the active layout' : ' as an empty layout'}` });
  }, [activeLayout, mutate, project]);

  const deleteActiveBaseLayout = useCallback(() => {
    if (!project || !activeLayout) return;
    if (project.baseLayouts.length === 1) {
      setNotice({ tone: 'error', text: 'Every map must keep at least one base layout.' });
      return;
    }
    if (!window.confirm(`Delete base layout “${activeLayout.name}”?`)) return;
    mutate((draft) => {
      synchronizeActiveBaseLayout(draft);
      const index = draft.baseLayouts.findIndex((layout) => layout.id === draft.activeBaseLayoutId);
      draft.baseLayouts.splice(index, 1);
      const next = draft.baseLayouts[Math.min(index, draft.baseLayouts.length - 1)];
      draft.activeBaseLayoutId = next.id;
      draft.entities = next.entities.map((entity) => ({
        ...entity,
        position: [...entity.position] as Vec3,
        rotation: [...entity.rotation] as Vec3,
      }));
      draft.validation = { ...next.validation };
    }, true, 'base');
    setSelectedEntityId(undefined);
    setNotice({ tone: 'ready', text: `${activeLayout.name} deleted` });
  }, [activeLayout, mutate, project]);

  const applyLayoutMetadata = useCallback((source: string) => {
    try {
      const metadata = parseLayoutMetadataSource(source);
      mutate((draft) => {
        const layout = draft.baseLayouts.find((candidate) => candidate.id === draft.activeBaseLayoutId);
        if (layout) layout.metadata = metadata;
      }, true, 'base');
      setNotice({ tone: 'ready', text: `${Object.keys(metadata).length} metadata entr${Object.keys(metadata).length === 1 ? 'y' : 'ies'} applied to the active layout` });
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Layout metadata is invalid.' });
    }
  }, [mutate]);

  const textureNames = useMemo(() => {
    if (!manifest) return [];
    const query = textureSearch.trim().toLowerCase();
    return Object.keys(manifest.terrainTextures)
      .filter((name) => !query || name.toLowerCase().includes(query))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [manifest, textureSearch]);
  const texturePageCount = Math.max(1, Math.ceil(textureNames.length / 18));
  const activeTexturePage = Math.min(texturePage, texturePageCount - 1);
  const visibleTextures = textureNames.slice(activeTexturePage * 18, activeTexturePage * 18 + 18);
  const placeableCatalog = useMemo(
    () => manifest ? CATALOG.filter((item) => catalogItemHasModel(item, team, manifest)) : [],
    [manifest, team],
  );
  const placementPreview = useMemo((): StateEntity[] => {
    if (mode !== 'base' || !cursor || !project || !manifest) return [];
    const [x, y] = cursor;
    if (selectedTemplate) {
      const preview = instantiateBaseTemplate(
        selectedTemplate,
        project.terrain,
        [x, y],
        team,
        templateScale,
        templateYaw * Math.PI / 180,
        manifest,
        placementHeight,
      );
      if(formationFavorites.some(f=>f.kind==='district'&&f.id===selectedTemplate.id)&&(preview.skippedWithoutModel||Math.abs(preview.scale-templateScale)>.00001))return [];
      return preview.entities.map((entity, index) => ({ ...entity, id: `placement-preview-${index}` }));
    }
    const item = placeableCatalog.find((entry) => entry.key === selectedPlacementKey);
    if (!item) return [];
    const defaultData = analysis?.turretDefaults[item.token];
    const placementDefault = analysis?.placementDefaults?.[item.token];
    const ground = sampleHeight(project.terrain, x, y);
    const offset = placementDefault?.heightOffset ?? defaultData?.heightOffset ?? 0;
    const yaw = defaultData?.yawCircularMean ?? 0;
    const clearance = structureTerrainClearance(
      { token: item.token, team },
      manifest,
      item.footprint,
      offset,
      placementHeight,
    );
    const snap = usesFootprintTerrainSnap(item.token)
      ? snapStructureToTerrain(project.terrain, x, y, clearance.footprint, yaw, clearance.groundOffset, clearance.margin)
      : undefined;
    return [{
      id: 'placement-preview-0',
      token: item.token,
      subtype: item.subtype,
      team,
      position: [x, y, placementHeightForToken(item.token, snap?.height ?? ground + offset)],
      rotation: [snap?.pitch ?? defaultData?.pitch ?? 0, snap?.roll ?? defaultData?.roll ?? 0, yaw],
      active: 1,
    }];
  }, [analysis, cursor, manifest, mode, placeableCatalog, placementHeight, project, selectedPlacementKey, selectedTemplate, team, templateScale, templateYaw, formationFavorites]);

  const applyBrush = useCallback((worldX: number, worldY: number) => {
    if (!manifest) return;
    setProject((current) => {
      if (!current) return current;
      let next:WulframProject;
      try{next=applyManualTerrainBrush(current,{profile:'editor-v1',tool:terrainTool as ManualTerrainBrush['tool'],x:worldX,y:worldY,radius:brushRadius,strength:brushStrength,shape:brushShape,falloff:brushFalloff,targetHeight:terrainTool==='level'?levelHeightRef.current:terrainTargetHeight,texture:selectedTexture,selection:terrainSelection},manifest).project;}catch(error){setNotice({tone:'error',text:error instanceof Error?error.message:'Brush blocked.'});return current;}
      if(next===current)return current;
      markDirty('terrain');return next;
    });
  }, [terrainSelection, brushFalloff, brushRadius, brushShape, brushStrength, manifest, markDirty, selectedTexture, terrainTargetHeight, terrainTool]);

  const stampGuard = useMemo(() => {
    if (!project || !manifest || mode !== 'terrain' || terrainTool !== 'landform') return {};
    try { return { protection: stampProtection(project, manifest, stampSafe) }; }
    catch (error) { return { error: error instanceof Error ? error.message : 'Protection unavailable.' }; }
  }, [project, manifest, mode, terrainTool, stampSafe]);
  const stampGhost = useMemo(() => {
    if (!project || !cursor || composingTerrain || mode !== 'terrain' || terrainTool !== 'landform') return undefined;
    const options = { ...stampSettings, x: cursor[0], y: cursor[1] };
    try {
      if (options.textureName && (!manifest?.terrainTextures[options.textureName] || terrainTemplateFamily(options.textureName) === undefined)) throw new Error('Choose an available supported terrain texture.');
      const result = stampTerrain(project.terrain, options);
      let error = stampGuard.error;
      let surface;
      if (!error) {
        try { if (manifest && stampGuard.protection) surface = previewStampTerrain(project.terrain, options, manifest, stampGuard.protection).terrain; }
        catch (problem) { error = problem instanceof Error ? problem.message : 'Placement blocked.'; }
      }
      return { surface, heights: result.terrain.heights, changed: result.deltas.map(d => d !== 0), blocked: Boolean(error), message: error ?? `${result.changed} vertices · click to place` };
    } catch (error) { return { blocked: true, message: error instanceof Error ? error.message : 'Placement blocked.' }; }
  }, [project, cursor, mode, terrainTool, stampSettings, stampGuard, manifest, composingTerrain]);
  const rotateStamp = useCallback((direction: number) => setStampSettings(s => ({ ...s, rotation: rotateTerrainStamp(s.rotation, direction) })), []);
  const lanePreview=useMemo<{project?:WulframProject;source?:WulframProject;changed?:number;error?:string}>(()=>{
    if(!project||!manifest||mode!=='terrain'||terrainTool!=='lane'||laneOptions.points.length<2)return {};
    if(laneSource!==project)return {error:'Map changed. Draw the lane again.'};
    try{return {...previewTerrainLane(project,laneOptions,manifest),source:project};}catch(error){return {error:error instanceof Error?error.message:'Lane preview failed.'};}
  },[project,manifest,mode,terrainTool,laneOptions,laneSource]);
  const onLaneHandleEdit=useCallback((phase:'start'|'move'|'end'|'cancel',edit?:LaneHandleEdit)=>{
    if(!project||laneSource!==project||mode!=='terrain'||terrainTool!=='lane')return;
    if(phase==='start'){laneHandleOriginal.current={project,options:structuredClone(laneOptions)};setEditingLaneHandle(true);return;}
    const original=laneHandleOriginal.current;if(!original||original.project!==project)return;
    if(phase==='cancel'){setLaneOptions(original.options);laneHandleOriginal.current=undefined;setEditingLaneHandle(false);return;}
    if(phase==='end'){laneHandleOriginal.current=undefined;setEditingLaneHandle(false);return;}
    if(edit)setLaneOptions(o=>edit.handle==='bend'?{...o,bend:bendAtPoint(o.points,edit.point)}:{...o,points:o.points.map((p,i)=>i===edit.handle?edit.point:p)});
  },[project,laneSource,mode,terrainTool,laneOptions]);
  const onTerrainStroke = useCallback((x: number, y: number, phase: StrokePhase) => {
    if (!project) return;
    if(laneGesture.current){
      const gesture=laneGesture.current;
      if(gesture.cancelled){if(phase==='end'||phase==='cancel')laneGesture.current=undefined;return;}
      if(gesture.source!==project||mode!=='terrain'||terrainTool!=='lane'||phase==='cancel'){cancelLane();if(phase==='end'||phase==='cancel')laneGesture.current=undefined;return;}
      if(phase==='start')gesture.start=[x,y];
      if(gesture.start&&phase==='move')setLaneOptions(o=>({...o,points:[gesture.start!,[x,y]]}));
      if(phase==='end'){laneGesture.current=undefined;setDrawingLane(false);}
      return;
    }
    if(terrainTool==='lane')return;
    const gesture=selectionGesture.current;
    if(gesture){
      const ending=phase==='end'||phase==='cancel';
      if(gesture.cancelled||gesture.source!==project||mode!=='terrain'||terrainTool==='landform'){
        if(ending)selectionGesture.current=undefined;
        return;
      }
      if(phase==='start'){gesture.start=[x,y];gesture.last=[x,y];}
      if(phase==='move'&&gesture.start){gesture.last=[x,y];setSelectionDraft(terrainSelectionFromPoints(gesture.start,gesture.last,project.terrain));}
      if(ending){
        const rectangle=gesture.start&&gesture.last?terrainSelectionFromPoints(gesture.start,gesture.last,project.terrain):undefined;
        if(phase!=='cancel'&&rectangle){setTerrainSelection(rectangle);setNotice({tone:'ready',text:'Brush selection drawn. Terrain unchanged; refine its coordinates in Brush selection.'});}
        else setNotice({tone:'ready',text:'Selection drawing cancelled or too small. Previous selection retained.'});
        selectionGesture.current=undefined;setDrawingSelection(false);setSelectionDraft(undefined);
      }
      return;
    }

    if (terrainTool === 'landform') {
      if (phase !== 'start' || !manifest) return;
      setProject(current => {
        if (!current) return current;
        try {
          // Recompute from the exact clicked coordinates and current project, never a cached hover.
          const next = applyProjectStamp(current, { ...stampSettings, x, y }, manifest, stampSafe);
          assertEditorConstraints(current,next,manifest);
          pushHistory(cloneProject(current)); markDirty('both');
          setNotice({ tone: 'ready', text: 'Stamp placed. Click again to place another; Undo removes one placement. Revalidate and playtest.' });
          return next;
        } catch (error) {
          setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Stamp blocked; terrain unchanged.' });
          return current;
        }
      });
      return;
    }
    if (phase === 'start') {
      strokeSnapshotRef.current = cloneProject(project);
      levelHeightRef.current = sampleHeight(project.terrain, x, y);
      applyBrush(x, y);
    } else if (phase === 'move') {
      applyBrush(x, y);
    } else if (strokeSnapshotRef.current) {
      if(JSON.stringify(project.terrain)!==JSON.stringify(strokeSnapshotRef.current.terrain))pushHistory(strokeSnapshotRef.current);
      strokeSnapshotRef.current = null;
    }
  }, [mode, applyBrush, markDirty, project, pushHistory, terrainTool, manifest, stampSettings, stampSafe,cancelLane]);

  const conformEntityToTerrain = useCallback((entity: StateEntity, terrain: WulframProject['terrain']) => {
    if (hasLockedAltitudeAndRotation(entity)) return;
    const item = catalogFor(entity);
    const placementDefault = analysis?.placementDefaults?.[entity.token];
    const turretDefault = analysis?.turretDefaults[entity.token];
    const groundOffset = placementDefault?.heightOffset ?? turretDefault?.heightOffset ?? 0;
    if (usesFootprintTerrainSnap(entity.token)) {
      const clearance = structureTerrainClearance(
        entity,
        manifest,
        item?.footprint ?? 10,
        groundOffset,
        placementHeight,
      );
      const snap = snapStructureToTerrain(
        terrain,
        entity.position[0],
        entity.position[1],
        clearance.footprint,
        entity.rotation[2],
        clearance.groundOffset,
        clearance.margin,
      );
      entity.position[2] = snap.height;
      entity.rotation[0] = snap.pitch;
      entity.rotation[1] = snap.roll;
    } else {
      entity.position[2] = sampleHeight(terrain, entity.position[0], entity.position[1]) + groundOffset;
    }
  }, [analysis, manifest, placementHeight]);

  const resolveEntityMove = useCallback((source: StateEntity, x: number, y: number): StateEntity => {
    if (!project) return source;
    const moved: StateEntity = {
      ...source,
      position: [x, y, source.position[2]],
      rotation: [...source.rotation],
    };
    conformEntityToTerrain(moved, project.terrain);
    return moved;
  }, [conformEntityToTerrain, project]);

  const moveEntity = useCallback((id: string, x: number, y: number) => {
    if (!project) return;
    mutate((draft) => {
      const entity = draft.entities.find((candidate) => candidate.id === id);
      if (!entity) return;
      entity.position[0] = x;
      entity.position[1] = y;
      conformEntityToTerrain(entity, draft.terrain);
    });
    setSelectedEntityId(id);
    setNotice({ tone: 'ready', text: `Unit moved and terrain-tuned at ${x.toFixed(1)}, ${y.toFixed(1)}` });
  }, [conformEntityToTerrain, mutate, project]);

  const transformEntity = useCallback((id: string, position: Vec3, rotation: Vec3) => {
    const transformLocked = Boolean(project?.entities.find((entity) => entity.id === id && hasLockedAltitudeAndRotation(entity)));
    mutate((draft) => {
      const entity = draft.entities.find((candidate) => candidate.id === id);
      if (!entity) return;
      const constrained = constrainEntityTransform(entity, position, rotation);
      entity.position = constrained.position;
      entity.rotation = constrained.rotation;
    }, true, 'base');
    setSelectedEntityId(id);
    setNotice({
      tone: 'ready',
      text: transformLocked
        ? `Starship moved to X ${position[0].toFixed(1)} · Y ${position[1].toFixed(1)} · altitude and orientation locked`
        : `3D transform committed · XYZ ${position.map((value) => value.toFixed(1)).join(', ')} · rotation ${rotation.map((value) => value.toFixed(3)).join(', ')}`,
    });
  }, [mutate, project]);

  const placeUnit = useCallback((x: number, y: number) => {
    if (!project) return;
    if (selectedTemplate) {
      const placement = instantiateBaseTemplate(
        selectedTemplate,
        project.terrain,
        [x, y],
        team,
        templateScale,
        templateYaw * Math.PI / 180,
        manifest,
        placementHeight,
      );
      const savedModule=formationFavorites.find(f=>f.kind==='district'&&f.id===selectedTemplate.id);
      if(savedModule){
        try{
          if(placement.skippedWithoutModel||Math.abs(placement.scale-templateScale)>.00001)throw new Error('This module cannot fit at the selected spacing or has unavailable models. Choose more space, reduce footprint scale explicitly, or use supported assets.');
          const districtMetadata=moduleDistrictMetadata(project,savedModule.name,placement.entities,createId('district'));
          mutate((draft) => { draft.entities.push(...placement.entities);const layout=draft.baseLayouts.find(l=>l.id===draft.activeBaseLayoutId);if(layout)layout.metadata[DISTRICTS_KEY]=districtMetadata; });
          setDistrictSelection({layoutId:project.activeBaseLayoutId,ids:placement.entities.map(e=>e.id)});
        }catch(error){setNotice({tone:'error',text:error instanceof Error?error.message:'Module placement failed.'});return;}
      }else if(placement.entities.length)mutate((draft) => { draft.entities.push(...placement.entities); });
      if (!placement.entities.length) return;
      setSelectedEntityId(undefined);
      const autoFit = Math.abs(placement.scale - templateScale) > 0.001
        ? ` · auto-fit ${placement.scale.toFixed(2)}×`
        : '';
      setNotice({
        tone: 'ready',
        text: `${selectedTemplate.name} placed · ${placement.entities.length} modeled units terrain-conformed${placement.skippedWithoutModel ? ` · ${placement.skippedWithoutModel} removed omitted` : ''}${autoFit}`,
      });
      return;
    }
    const item = placeableCatalog.find((entry) => entry.key === selectedPlacementKey);
    if (!item) return;
    const defaultData = analysis?.turretDefaults[item.token];
    const placementDefault = analysis?.placementDefaults?.[item.token];
    const ground = sampleHeight(project.terrain, x, y);
    const offset = placementDefault?.heightOffset ?? defaultData?.heightOffset ?? 0;
    const yaw = defaultData?.yawCircularMean ?? 0;
    const clearance = structureTerrainClearance(
      { token: item.token, team },
      manifest,
      item.footprint,
      offset,
      placementHeight,
    );
    const snap = usesFootprintTerrainSnap(item.token)
      ? snapStructureToTerrain(project.terrain, x, y, clearance.footprint, yaw, clearance.groundOffset, clearance.margin)
      : undefined;
    const entity: StateEntity = {
      id: createId(item.key),
      token: item.token,
      subtype: item.subtype,
      team,
      position: [x, y, placementHeightForToken(item.token, snap?.height ?? ground + offset)],
      rotation: [snap?.pitch ?? defaultData?.pitch ?? 0, snap?.roll ?? defaultData?.roll ?? 0, yaw],
      active: 1,
    };
    mutate((draft) => { draft.entities.push(entity); });
    setSelectedEntityId(entity.id);
    setNotice({ tone: 'ready', text: `${item.label} placed at ${x.toFixed(1)}, ${y.toFixed(1)}` });
  }, [analysis, manifest, mutate, placeableCatalog, placementHeight, project, selectedPlacementKey, selectedTemplate, team, templateScale, templateYaw, formationFavorites]);

  const updateSelected = useCallback((change: (entity: StateEntity) => void, record = true) => {
    if (!selectedEntityId) return;
    mutate((draft) => {
      const entity = draft.entities.find((item) => item.id === selectedEntityId);
      if (entity) change(entity);
    }, record);
  }, [mutate, selectedEntityId]);

  const stageHeightmap = useCallback((file: File) => {
    setHeightmapFile(file);
    setHeightmapPreviewUrl(URL.createObjectURL(file));
    setHeightmapDialogOpen(true);
  }, []);

  const closeHeightmapDialog = useCallback(() => {
    setHeightmapDialogOpen(false);
    setHeightmapFile(undefined);
    setHeightmapPreviewUrl('');
  }, []);

  const importHeightmap = useCallback(async () => {
    const file = heightmapFile;
    if (!project) return;
    if (!file) return;
    try {
      setNotice({ tone: 'working', text: `Reading grayscale heightmap ${file.name}…` });
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = project.terrain.width;
      canvas.height = project.terrain.height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Canvas image decoding is unavailable.');
      context.imageSmoothingEnabled = false;
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const [minimum, maximum] = heightmapRange;
      const heights = heightsFromGrayscaleRgba(pixels, canvas.width, canvas.height, {
        minimum,
        maximum,
        gamma: heightmapGamma,
        smoothingPasses: heightmapSmoothing,
      });
      pinTerrainEdgeHeights(heights, canvas.width, canvas.height);
      bitmap.close();
      mutate((draft) => { draft.terrain.heights = heights; }, true, 'terrain');
      setMode('terrain');
      setTerrainTool('sculpt');
      closeHeightmapDialog();
      setNotice({ tone: 'ready', text: `Heightmap applied at ${minimum}–${maximum} units with ${heightmapSmoothing} smoothing pass${heightmapSmoothing === 1 ? '' : 'es'}` });
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Heightmap import failed.' });
    }
  }, [closeHeightmapDialog, heightmapFile, heightmapGamma, heightmapRange, heightmapSmoothing, mutate, project]);

  const importFiles = async (files: File[]) => {
    if (!files.length || !project) return;
    try {
      setNotice({ tone: 'working', text: `Importing ${files.length === 1 ? files[0].name : `${files.length} map files`}…` });
      if (files.length === 1 && files[0].type.startsWith('image/')) {
        stageHeightmap(files[0]);
        setNotice({ tone: 'ready', text: 'Adjust the grayscale height controls, then apply the image' });
        return;
      }
      let landText: string | undefined;
      const stateTexts: Array<{ name: string; text: string }> = [];
      let tagmapText: string | undefined;
      let tagmap2Text: string | undefined;
      let jsonValue: unknown;
      let sourceProject: WulframProject | undefined;
      let startScriptText: string | undefined;
      const sourceFiles: Partial<MapSourceFiles> = {};
      let importedName: string | undefined;

      const consume = async (name: string, text: string) => {
        const base = name.replace(/\\/g, '/').split('/').pop()?.toLowerCase() ?? name.toLowerCase();
        if (MAP_SOURCE_FILES.includes(base as (typeof MAP_SOURCE_FILES)[number])) {
          sourceFiles[base as (typeof MAP_SOURCE_FILES)[number]] = text;
        } else if (base === 'land' || base.endsWith('.land')) landText = text;
        else if (base === 'state' || /^state\d*$/.test(base) || base === 'db_state' || base === 'bigstate' || base.endsWith('.state')) stateTexts.push({ name: base, text });
        else if (base === 'tagmap2' || base.endsWith('.tagmap2')) tagmap2Text = text;
        else if (base === 'tagmap' || base.endsWith('.tagmap')) tagmapText = text;
        else if (base === 'start_script') startScriptText = text;
        else if (base.endsWith('.json')) jsonValue = JSON.parse(text);
        else if (/^\d+x\d+\s*[\r\n]+[\d.]+x[\d.]+/i.test(text.trim())) landText = text;
      };

      for (const file of files) {
        if (/\.zip$/i.test(file.name)) {
          importedName = file.name.replace(/\.zip$/i, '');
          const sourceArchive = await readMapSourceArchive(file);
          if (sourceArchive) {
            sourceProject = sourceArchive.project;
            importedName = sourceArchive.root.split('/').pop() || importedName;
            continue;
          }
          for (const entry of await readMapArchive(file)) {
            await consume(entry.name, entry.text);
          }
        } else {
          await consume(file.name, await file.text());
          if (!importedName && !['land', 'state', 'tagmap', 'tagmap2', 'start_script'].includes(file.name.toLowerCase())) {
            importedName = file.name.replace(/\.[^.]+$/, '');
          }
        }
      }

      if (!sourceProject && MAP_REQUIRED_SOURCE_FILES.every((fileName) => typeof sourceFiles[fileName] === 'string')) {
        sourceProject = parseMapSourceFiles(sourceFiles);
      }

      const importedCollection = !sourceProject && typeof sourceFiles['base-layouts.json'] === 'string'
        ? parseBaseLayoutCollection(sourceFiles['base-layouts.json'])
        : jsonValue && typeof jsonValue === 'object'
          && (jsonValue as { format?: unknown }).format === 'wulfram-base-layout-collection'
          ? parseBaseLayoutCollection(JSON.stringify(jsonValue))
          : undefined;

      if (sourceProject) {
        pushHistory(cloneProject(project));
        setProject(sourceProject);
        setRepositorySlug('');
        setLastPullRequestUrl('');
        markDirty('both');
        setSelectedEntityId(undefined);
        setNotice({ tone: 'ready', text: `Git map source ${sourceProject.name} imported` });
        return;
      }

      if (jsonValue && typeof jsonValue === 'object' && (jsonValue as WulframProject).format === 'wulfram-map-project') {
        const restored = jsonValue as WulframProject;
        pushHistory(cloneProject(project));
        setProject(cloneProject(restored));
        setRepositorySlug('');
        setLastPullRequestUrl('');
        markDirty('both');
        setSelectedEntityId(undefined);
        setNotice({ tone: 'ready', text: `Project ${restored.name} imported` });
        return;
      }

      mutate((draft) => {
        if (landText) {
          const imported = parseLand(landText);
          imported.tagmap = tagmapText ? parseLines(tagmapText) : draft.terrain.tagmap;
          imported.tagmap2 = tagmap2Text ? parseLines(tagmap2Text) : draft.terrain.tagmap2;
          draft.terrain = imported;
        } else {
          if (tagmapText) draft.terrain.tagmap = parseLines(tagmapText);
          if (tagmap2Text) draft.terrain.tagmap2 = parseLines(tagmap2Text);
        }
        if (startScriptText !== undefined) draft.terrain.skyName = skyboxFromStartScript(startScriptText);
        if (importedCollection) {
          draft.baseLayouts = importedCollection.layouts;
          draft.activeBaseLayoutId = importedCollection.activeLayoutId;
          const active = importedCollection.layouts.find((layout) => layout.id === importedCollection.activeLayoutId)!;
          draft.entities = active.entities.map((entity) => ({
            ...entity,
            position: [...entity.position] as Vec3,
            rotation: [...entity.rotation] as Vec3,
          }));
          draft.validation = { ...active.validation };
        } else if (stateTexts.length > 1) {
          const updatedAt = new Date().toISOString();
          draft.baseLayouts = stateTexts.map((stateFile, index) => ({
            id: index === 0 ? 'default' : `original-${stateFile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
            name: importedStateLayoutName(stateFile.name),
            metadata: { sourceFile: stateFile.name },
            entities: parseState(stateFile.text),
            validation: { ...draft.validation },
            updatedAt,
          }));
          draft.activeBaseLayoutId = draft.baseLayouts[0].id;
          draft.entities = draft.baseLayouts[0].entities.map((entity) => ({
            ...entity,
            position: [...entity.position] as Vec3,
            rotation: [...entity.rotation] as Vec3,
          }));
        } else if (stateTexts.length === 1) {
          draft.entities = parseState(stateTexts[0].text);
          const active = draft.baseLayouts.find((layout) => layout.id === draft.activeBaseLayoutId);
          if (active) active.metadata = { ...active.metadata, sourceFile: stateTexts[0].name };
        }
        if (jsonValue && !importedCollection) {
          const layout = parseBaseLayout(jsonValue);
          draft.entities = layout.entities;
          if (layout.name) draft.name = layout.name;
          if (layout.validation) draft.validation = layout.validation;
          if (layout.layout) {
            const active = draft.baseLayouts.find((candidate) => candidate.id === draft.activeBaseLayoutId);
            if (active) {
              active.name = layout.layout.name;
              active.metadata = { ...layout.layout.metadata };
            }
          }
        }
        if (importedName) draft.name = importedName;
      }, true, 'both');
      setRepositorySlug('');
      setLastPullRequestUrl('');
      setSelectedEntityId(undefined);
      setNotice({ tone: 'ready', text: 'Map files imported and ready to edit' });
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Map import failed.' });
    }
  };

  const saveLocal = useCallback(() => {
    if (!project) return;
    try {
      const projectToSave = projectWithLayoutMetadataDraft(project, layoutMetadataRef.current?.value);
      const serialized = JSON.stringify(projectToSave);
      window.localStorage.setItem(STORAGE_KEY, serialized);
      // Keep source-bound previews when saving has not changed map content.
      // Actual metadata edits still replace the source and invalidate previews.
      if (serialized !== JSON.stringify(project)) setProject(projectToSave);
      setDirtyScopes({ terrain: false, base: false });
      setNotice({ tone: 'ready', text: 'Project saved in this browser' });
    } catch {
      setNotice({ tone: 'error', text: 'Local save failed; export a ZIP backup.' });
    }
  }, [project]);

  const exportJson = useCallback(() => {
    if (!project) return;
    try {
      const projectToExport = projectWithLayoutMetadataDraft(project, layoutMetadataRef.current?.value);
      const layout = toBaseLayout(projectToExport);
      downloadBlob(
        new Blob([`${JSON.stringify(layout, null, 2)}\n`], { type: 'application/json' }),
        `${safeMapName(project.name)}-${safeMapName(layout.layout.name)}.base-layout.json`,
      );
      setNotice({ tone: 'ready', text: `${layout.layout.name} exported as new-server JSON` });
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Base layout export failed.' });
    }
  }, [project]);

  const exportSource = useCallback(async () => {
    if (!project) return;
    try {
      const slug = safeMapName(project.name);
      setNotice({ tone: 'working', text: 'Packing line-oriented Git map source…' });
      const archive = await createMapSourceArchive(
        projectWithLayoutMetadataDraft(project, layoutMetadataRef.current?.value),
        slug,
      );
      downloadBlob(new Blob([archive], { type: 'application/zip' }), `${slug}-source.zip`);
      setNotice({ tone: 'ready', text: 'Git-friendly TSV, JSONL, and tag-map source exported' });
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Source export failed.' });
    }
  }, [project]);

  const exportMap = useCallback(async () => {
    if (!project) return;
    try {
      setNotice({ tone: 'working', text: 'Packing original map files and JSON layout…' });
      const archive = await createMapArchive(
        projectWithLayoutMetadataDraft(project, layoutMetadataRef.current?.value),
      );
      const blob = new Blob([archive], { type: 'application/zip' });
      downloadBlob(blob, `${safeMapName(project.name)}.zip`);
      setDirtyScopes({ terrain: false, base: false });
      setNotice({ tone: 'ready', text: 'Map ZIP exported with original and new-server formats' });
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Export failed.' });
    }
  }, [project]);

  const loadRepositorySelection = useCallback(async () => {
    if (!repositorySlug || !project) return;
    if (dirty && !window.confirm('Load the selected repository map? Your current project is autosaved in this browser, but the canvas will be replaced.')) return;
    try {
      setRepositoryBusy(true);
      setNotice({ tone: 'working', text: `Loading ${repositorySlug} from the local maps checkout…` });
      const loaded = await loadLocalRepositoryMap(repositorySlug);
      pushHistory(cloneProject(project));
      setProject(loaded.project);
      setRedoStack([]);
      setSelectedEntityId(undefined);
      setDirtyScopes({ terrain: false, base: false });
      setNotice({ tone: 'ready', text: `${loaded.project.name} loaded from Git source` });
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Repository map load failed.' });
    } finally {
      setRepositoryBusy(false);
    }
  }, [dirty, project, pushHistory, repositorySlug]);

  const saveRepositorySelection = useCallback(async (publish: boolean) => {
    if (!project) return;
    const slug = repositorySlug || safeMapName(project.name);
    const scope: RepositorySaveScope = mode === 'base' ? 'base' : 'terrain';
    const scopeLabel = scope === 'base' ? 'base layouts' : 'terrain';
    if (publish && !window.confirm(
      repositoryCatalog?.branch === repositoryCatalog?.defaultBranch
        ? `Save only the ${scopeLabel} for ${project.name}, create a feature branch, commit it, push it, and open a pull request into main?`
        : `Save only the ${scopeLabel} for ${project.name}, commit it on ${repositoryCatalog?.branch}, push it, and open or update its pull request into main?`,
    )) return;
    try {
      setRepositoryBusy(true);
      setNotice({
        tone: 'working',
        text: publish
          ? `Saving ${scopeLabel} only and publishing ${slug}…`
          : `Saving ${scopeLabel} only · ${scope === 'base' ? 'terrain will not be written' : 'base layouts will not be replaced'}…`,
      });
      const projectToSave = projectWithLayoutMetadataDraft(
        project,
        scope === 'base' ? layoutMetadataRef.current?.value : undefined,
      );
      if (scope === 'base') {
        const updatedAt = new Date().toISOString();
        projectToSave.updatedAt = updatedAt;
        synchronizeActiveBaseLayout(projectToSave, updatedAt);
      }
      const saved = await saveLocalRepositoryMap(slug, projectToSave, scope);
      setProject(projectToSave);
      setRepositorySlug(slug);
      const wroteBase = saved.writtenFiles?.includes('base-layouts.json') ?? scope === 'base';
      setDirtyScopes((current) => ({
        terrain: scope === 'terrain' ? false : current.terrain,
        base: wroteBase ? false : current.base,
      }));
      if (publish) {
        const result = await publishLocalRepositoryMap(slug);
        setLastPullRequestUrl(result.prUrl);
        setRepositoryCatalog(result);
        setNotice({ tone: 'ready', text: result.message });
      } else {
        setNotice({
          tone: 'ready',
          text: scope === 'base'
            ? `${project.baseLayouts.length} base layout${project.baseLayouts.length === 1 ? '' : 's'} saved to maps/${slug} · terrain untouched`
            : `${project.name} terrain saved to maps/${slug} · base layouts preserved`,
        });
      }
      await refreshRepository(false);
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Repository map save failed.' });
    } finally {
      setRepositoryBusy(false);
    }
  }, [mode, project, refreshRepository, repositoryCatalog?.branch, repositoryCatalog?.defaultBranch, repositorySlug]);

  const newMap = useCallback(() => {
    if (dirty && !window.confirm('Start a new map? Your current project is autosaved locally, but unexported changes will leave the canvas.')) return;
    const name = window.prompt('Map name', 'Untitled map')?.trim();
    if (name === undefined) return;
    const blank = createBlankProject(name || 'Untitled map');
    if (project) pushHistory(cloneProject(project));
    setProject(blank);
    setRepositorySlug('');
    setLastPullRequestUrl('');
    setRedoStack([]);
    setSelectedEntityId(undefined);
    setMode('terrain');
    markDirty('both');
    setNotice({ tone: 'ready', text: 'Blank 129 × 129 map created with the backface checkerboard' });
  }, [dirty, markDirty, project, pushHistory]);

  const openBalancedGenerator = useCallback(() => {
    balancedGenerationTokenRef.current += 1;
    try {
      const saved = project && readTerrainGeneratorSettings(project);
      if (saved) {
        setBalancedName(saved.name); setBalancedSeed(saved.seed); setBalancedPreset(saved.topology);
        setBalancedRelief(saved.relief); setBalancedBaseHeight(saved.baseHeight); setBalancedSize(saved.size);
        setBalancedWorldWidth(saved.worldWidth); setBalancedWorldHeight(saved.worldHeight);
        setBalancedSeparation(saved.baseSeparation * 100); setBalancedRouteWidth(saved.routeWidth);
        setBalancedCentralSize(saved.centralAreaSize); setBalancedTextureName(saved.textureName);
        setBalancedTemplateId(saved.templateId);
        if (!baseTemplates?.templates.some(template => template.id === saved.templateId)) throw new Error(`Saved starter template ${saved.templateId} is unavailable. Choose an available template before regenerating.`);
      } else {
    setBalancedName(project?.name && project.name !== 'Untitled map'
      ? `${project.name} balanced`
      : 'Generated balanced map');
        setBalancedBaseHeight(0);
      }
      setBalancedError('');
    } catch (error) { setBalancedError(error instanceof Error ? error.message : String(error)); }
    setBalancedCandidates([]);
    setBalancedSelectedIndex(0);
    setBalancedGenerating(false);
    setBalancedGenerationProgress(0);
    setBalancedDialogOpen(true);
  }, [project, baseTemplates]);

  const openBaseDesigner = useCallback(() => {
    setBaseCandidate(undefined);
    try {
      const saved = project && readBaseGeneratorSettings(project);
      setBaseSeed(saved?.seed ?? 'base-001'); setBaseFootprint(saved?.footprint ?? 1000);
      setBaseSpacing(saved?.spacing ?? 1); setBaseRotation(saved?.rotation ?? 0);
      setBalancedTemplateId(saved?.templateId ?? 'curated-base-in-a-box');
      if (saved && !baseTemplates?.templates.some(template => template.id === saved.templateId)) throw new Error(`Saved base template ${saved.templateId} is unavailable. Choose another template.`);
      setBaseDesignerError('');
    } catch (error) { setBaseDesignerError(error instanceof Error ? error.message : String(error)); }
    setBaseDesignerOpen(true);
  }, [project, baseTemplates]);

  const closeBalancedGenerator = useCallback(() => {
    balancedGenerationTokenRef.current += 1;
    if (balancedGenerating) {
      setNotice({ tone: 'ready', text: 'Balanced candidate generation canceled; the current map was not changed' });
    }
    setBalancedGenerating(false);
    setBalancedGenerationProgress(0);
    setBalancedDialogOpen(false);
  }, [balancedGenerating]);

  const buildBalancedCandidates = useCallback(async () => {
    const seed = balancedSeed.trim();
    const template = baseTemplates?.templates.find((item) => item.id === balancedTemplateId);
    if (!seed) {
      setBalancedError('Enter a seed so this map can be reproduced.');
      return;
    }
    if (!template || !manifest) {
      setBalancedError('Choose an available base template.');
      return;
    }
    const generationToken = balancedGenerationTokenRef.current + 1;
    balancedGenerationTokenRef.current = generationToken;
    try {
      setBalancedCandidates([]);
      setBalancedSelectedIndex(0);
      setBalancedError('');
      setBalancedGenerating(true);
      setBalancedGenerationProgress(0);
      setNotice({ tone: 'working', text: 'Regenerating with the same seed and independently analyzing the selected layouts…' });
      const candidates: BalancedCandidate[] = [];
      for (const { id } of BALANCED_TOPOLOGIES.filter((item) => balancedPreset === 'all' || item.id === balancedPreset)) {
        await new Promise<void>((resolve) => { window.setTimeout(resolve, 0); });
        if (balancedGenerationTokenRef.current !== generationToken) return;
        const candidate = buildBalancedCandidate({
          seed,
          topology: id,
          relief: balancedRelief,
          baseHeight: balancedBaseHeight,
          size: balancedSize,
          baseSeparation: balancedSeparation / 100,
          routeWidth: balancedRouteWidth,
          centralAreaSize: balancedCentralSize,
          worldWidth: balancedWorldWidth,
          worldHeight: balancedWorldHeight,
          textureName: balancedTextureName,
          name: balancedName.trim() || 'Generated balanced map',
        }, template, manifest, project);
        candidates.push(candidate);
        if (balancedGenerationTokenRef.current !== generationToken) return;
        setBalancedCandidates([...candidates]);
        setBalancedGenerationProgress(candidates.length);
      }
      const firstPassing = candidates.findIndex((candidate) => candidate.analysis.passed);
      setBalancedCandidates(candidates);
      setBalancedSelectedIndex(firstPassing >= 0 ? firstPassing : 0);
      setBalancedError('');
      setNotice({
        tone: firstPassing >= 0 ? 'ready' : 'error',
        text: firstPassing >= 0
          ? `${candidates.filter((candidate) => candidate.analysis.passed).length} of ${candidates.length} generated candidates passed every offline gate`
          : 'No generated candidate passed every offline gate; adjust the seed, relief, or base template.',
      });
    } catch (error) {
      if (balancedGenerationTokenRef.current !== generationToken) return;
      const message = error instanceof Error ? error.message : 'Balanced generation failed.';
      setBalancedCandidates([]);
      setBalancedError(message);
      setNotice({ tone: 'error', text: message });
    } finally {
      if (balancedGenerationTokenRef.current === generationToken) setBalancedGenerating(false);
    }
  }, [balancedName, balancedRelief, balancedBaseHeight, balancedSeed, balancedSize, balancedPreset, balancedSeparation, balancedRouteWidth, balancedCentralSize, balancedWorldWidth, balancedWorldHeight, balancedTemplateId, balancedTextureName, baseTemplates?.templates, manifest, project]);

  const applyBalancedCandidate = useCallback((terrainOnly = false) => {
    const candidate = balancedCandidates[balancedSelectedIndex];
    if (!candidate || !(terrainOnly ? candidate.analysis.terrain.passed : candidate.analysis.passed)) return;
    const next=terrainOnly ? terrainOnlyCandidate(candidate.result) : cloneProject(candidate.result.project);
    try{if(project)assertEditorConstraints(project,next,manifest);}catch(error){setNotice({tone:'error',text:error instanceof Error?error.message:'District is locked.'});return;}
    if (!window.confirm(terrainOnly
      ? 'Apply terrain without team bases? This removes team 1/2 structures from the active layout. Neutral entities and inactive layouts in this candidate are retained but need revalidation. The map is incomplete until you add valid bases using Random base. Undo restores the previous project.'
      : project?.metadata?.['generator.parameters']
      ? 'Apply regenerated terrain and replace the active team bases? Neutral entities and inactive layouts are preserved, but inactive layouts must be revalidated against the changed terrain. Undo restores the previous project.'
      : 'Replace the current map with this generated candidate? Export any work you want to keep first. Undo restores the previous project.')) return;
    if (project) pushHistory(cloneProject(project));
    setProject(next);
    setRepositorySlug('');
    setLastPullRequestUrl('');
    setRedoStack([]);
    setSelectedEntityId(undefined);
    setSelectedPlacementKey('');
    setSelectedTemplateId(undefined);
    setMode('terrain');
    markDirty('both');
    setBalancedDialogOpen(false);
    const topology = BALANCED_TOPOLOGIES.find((item) => item.id === candidate.result.identity.topology)?.label
      ?? candidate.result.identity.topology;
    setNotice({
      tone: 'ready',
      text: terrainOnly ? 'Terrain applied without team bases. Next: Random base → Preview bases → Apply. This map is not play-ready.' : `${topology} candidate applied · ${(candidate.analysis.terrain.metrics.traversableFraction * 100).toFixed(1)}% traversable proxy · export still requires review and playtesting`,
    });
  }, [balancedCandidates, balancedSelectedIndex, markDirty, project, pushHistory, manifest]);

  if (!manifest || !baseTemplates || !project) {
    return (
      <main className="loading-screen">
        <img alt="Wulfram II" src="/assets/wulfram2-logo.png" />
        <div className="loading-bar"><span /></div>
        <p>{notice.text}</p>
      </main>
    );
  }

  const errorCount = issues.filter((issue) => issue.severity === 'error').length;
  const warningCount = issues.filter((issue) => issue.severity === 'warning').length;
  const selectedBalancedCandidate = balancedCandidates[balancedSelectedIndex];
  const selectedBalancedCandidatePassed = Boolean(
    selectedBalancedCandidate
    && selectedBalancedCandidate.analysis.passed,
  );
  const activePlacementKey = selectedTemplate ? `template:${selectedTemplate.id}` : selectedPlacementKey;
  const modeLabel = mode === 'terrain'
    ? TERRAIN_TOOL_LABELS[terrainTool]
    : selectedTemplate
      ? `Place ${selectedTemplate.name}`
      : selectedPlacementKey
        ? `Place ${CATALOG.find((item) => item.key === selectedPlacementKey)?.label}`
        : 'Select units';

  return (
    <main className="editor-shell">
      {baseLibraryOpen && <BaseLibraryDialog templates={baseTemplates.templates} favorites={formationFavorites} manifest={manifest} onSaveFavorites={next => {
        localStorage.setItem('forge-formation-favorites-v1', JSON.stringify(next));
        setFormationFavorites(next);
        if(selectedTemplateId && formationFavorites.some(f=>f.kind==='district'&&f.id===selectedTemplateId))setSelectedTemplateId(undefined);
        if (creativeDraft?.favoriteId) { setCreativeDraft(undefined); setCreativeCandidate(undefined); setCreativeOptions(undefined); setCreativeDiagnostics(undefined); }
      }} onClose={() => setBaseLibraryOpen(false)} onChoose={entry => {
        setAuthoredPreview(undefined);setAuthoredSelection({serial:crypto.randomUUID()});
        setMode('base'); setInspectionMode(false); pauseRoute(); setSelectedEntityId(undefined);
        setSelectedPlacementKey(''); setSelectedTemplateId(undefined);
        setCreativeDraft(undefined); setCreativeCandidate(undefined); setCreativeOptions(undefined); setCreativeDiagnostics(undefined);
        if(entry.authoredBase){setAuthoredSelection({base:entry.authoredBase,serial:crypto.randomUUID()});setBaseInspectorPage('build');setBaseLibraryOpen(false);setNotice({tone:'ready',text:`${entry.name} loaded. Preview authored base before applying. Map unchanged.`});return;}
        if (entry.category === 'Creative'||entry.category==='Experimental') {
          const {worldWidth:w,worldHeight:h}=project.terrain;
          setCreativeDraft({style:entry.id,seed:entry.seed!,placement:{size:entry.size!,x:w>=h?w/4:w/2,y:w>=h?h/2:h/4,rotation:w>=h?0:90,radius:['broken-ring','valley-pockets','three-lane-anchor'].includes(entry.id)?3300:entry.approach?2400:1800,targetCount:0,checkAccess:true,terrainAware:true,...(entry.offsetArrangement?{offsetArrangement:entry.offsetArrangement}:{})}});
        } else if (entry.category === 'My bases') {
          const favorite=formationFavorites.find(f=>f.id===entry.id);
          if (!favorite) return;
          const {worldWidth:w,worldHeight:h}=project.terrain;
          setCreativeDraft({style:'',favoriteId:favorite.id,seed:createId('seed'),placement:{size:favorite.valleyRecipe?.size??'large',x:w>=h?w/4:w/2,y:w>=h?h/2:h/4,rotation:w>=h?0:90,radius:favorite.radius,checkAccess:true}});
        } else { setSelectedTemplateId(entry.id); setTemplateScale(1); setTemplateYaw(0); }
        setBaseLibraryOpen(false);
        setNotice({tone:'ready',text:entry.category === 'Original' || entry.category === 'Curated' || entry.category === 'My districts' ? `${entry.name} ready. Choose team, footprint scale and yaw; hover to preview, then click terrain to place one copy. Undo restores it.` : `${entry.name} selected. Adjust placement below, then Preview formation and Apply formation. The map has not changed.`});
      }} />}
      {terrainStampOpen && <TerrainStampDialog project={project} manifest={manifest} onClose={() => setTerrainStampOpen(false)} onApply={(next, source) => {
        if (source !== project) return;
        mutate(draft => { Object.assign(draft, cloneProject(next)); }, true, 'both');
        setTerrainStampOpen(false);
        setNotice({ tone: 'ready', text: 'Terrain stamp applied. Undo restores the previous terrain. Revalidate routes, base placement and sightlines before release.' });
      }} />}
      {terrainDetailOpen && <TerrainDetailDialog project={project} manifest={manifest} onClose={() => setTerrainDetailOpen(false)} onApply={(next, source) => {
        if (source !== project) return;
        mutate(draft => { Object.assign(draft, cloneProject(next)); }, true, 'both');
        setTerrainDetailOpen(false);
        setMode('terrain');
        setNotice({ tone: 'ready', text: next.metadata?.['generator.stage'] === 'terrain-only-bases-required'
          ? 'Terrain detail applied. Bases are still required: Random base → Preview bases → Apply. Undo restores the original terrain.'
          : 'Rocky terrain detail applied. Undo restores the original terrain. Review in 3D and playtest before release.' });
      }} />}
      <input
        className="sr-only"
        multiple
        onChange={(event) => {
          void importFiles(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
        ref={importRef}
        type="file"
      />
      <input
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) stageHeightmap(file);
          event.target.value = '';
        }}
        ref={heightmapRef}
        type="file"
      />

      <Dialog open={baseDesignerOpen} onOpenChange={setBaseDesignerOpen}>
        <DialogContent className="balanced-generator-dialog">
          <DialogHeader><DialogTitle>Terrain-aware random bases</DialogTitle>
            <DialogDescription>Uses the applied generated terrain without sculpting it. Places power, deployed repair pads and uplinks first; supplements missing essentials, then retries paired positions with footprint, power, slope and exit rules. Replaces team 1/2 structures in the active layout only; neutral entities and other layouts are kept. Preview before applying. Passing means offline validation, not playtested balance.</DialogDescription></DialogHeader>
          <section className="balanced-generator-form">
            <label>Base seed<input value={baseSeed} onChange={(event) => setBaseSeed(event.target.value)} maxLength={200} /></label>
            <label>Base template<select value={balancedTemplateId} onChange={(event) => setBalancedTemplateId(event.target.value)}>
              {baseTemplates.templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select></label>
            <NumberField label="Maximum base diameter (world units)" value={baseFootprint} onChange={setBaseFootprint} min={100} max={2000} step={50} />
            <NumberField label="Structure spacing multiplier" value={baseSpacing} onChange={setBaseSpacing} min={0.5} max={1.5} step={0.05} />
            <NumberField label="Base rotation (degrees)" value={baseRotation} onChange={setBaseRotation} min={0} max={360} step={15} />
          </section>
          {baseDesignerError && <p role="alert" className="balanced-generator-error">{baseDesignerError}</p>}
          {baseCandidate && <>
            <p>Preview seed: {baseCandidate.seed} · {baseCandidate.passed ? 'PASS' : 'REJECTED'} · {baseCandidate.project.entities.length} entities</p>
            <p>Preview settings: diameter {baseCandidate.options.footprint} · spacing {baseCandidate.options.spacing}× · rotation {baseCandidate.options.rotation}°. Edited controls take effect only after Preview bases.</p>
            <svg aria-label="Top-down terrain and mirrored base structure centers: team 1 red, team 2 blue" viewBox={`0 0 ${project.terrain.worldWidth} ${project.terrain.worldHeight}`} style={{ width: '100%', height: 230, background: '#15191c' }}>
              {Array.from({ length: 256 }, (_, index) => {
                const x = index % 16; const y = Math.floor(index / 16);
                const height = project.terrain.heights[Math.round(y / 15 * (project.terrain.height - 1)) * project.terrain.width + Math.round(x / 15 * (project.terrain.width - 1))];
                return <rect key={index} x={x * project.terrain.worldWidth / 16} y={y * project.terrain.worldHeight / 16} width={project.terrain.worldWidth / 16} height={project.terrain.worldHeight / 16} fill={`hsl(35 12% ${Math.max(10, Math.min(70, 35 + height / 20))}%)`} />;
              })}
              {baseCandidate.project.entities.map((entity) => <circle key={entity.id} cx={entity.position[0]} cy={entity.position[1]} r={project.terrain.worldWidth / 180} fill={entity.team === 1 ? '#ff7777' : entity.team === 2 ? '#77aaff' : '#eeeeee'}><title>{`Team ${entity.team}: ${entity.token}`}</title></circle>)}
            </svg>
            <small>Dots mark structure centers, not collision footprints. Terrain remains unchanged.</small>
            <p>{baseCandidate.message}</p>
            <div className="balanced-gate-list">
              {baseCandidate.analysis.terrain.gates.map((gate) => <div key={gate.code} className={gate.passed ? 'pass' : 'fail'}><span>{gate.passed ? '✓' : '!'}</span><span><strong>{gate.code}</strong><small>{gate.message}</small></span></div>)}
            </div>
            <p>{baseCandidate.analysis.entityPairing.message}</p>
            <p>{baseCandidate.analysis.projectErrorCount} legality errors · {baseCandidate.analysis.projectWarningCount} warnings</p>
            {baseCandidate.analysis.projectIssues.map((issue, index) => <p key={index}>{issue.severity}: {issue.message}</p>)}
          </>}
          <DialogFooter>
            <DiagnosticsButton project={project} manifest={manifest} context={{ surface: 'random-base', draft: { seed: baseSeed, templateId: balancedTemplateId, footprint: baseFootprint, spacing: baseSpacing, rotation: baseRotation }, message: baseDesignerError || baseCandidate?.message, candidate: baseCandidate?.project, candidatePassed: baseCandidate?.passed, candidateIsCurrent: baseCandidate?.source === project }} />
            <Button variant="outline" onClick={() => setBaseDesignerOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => { setBaseSeed(crypto.randomUUID()); setBaseCandidate(undefined); }}>Randomize base seed</Button>
            <Button onClick={() => {
              try {
                const template = baseTemplates.templates.find((item) => item.id === balancedTemplateId);
                if (!template) throw new Error('Choose a base template.');
                const candidate = generateBalancedBase(project, template, { seed: baseSeed, footprint: baseFootprint, spacing: baseSpacing, rotation: baseRotation }, manifest);
                setBaseCandidate({ ...candidate, source: project }); setBaseDesignerError('');
              } catch (error) { setBaseCandidate(undefined); setBaseDesignerError(error instanceof Error ? error.message : String(error)); }
            }}>Preview bases</Button>
            <Button disabled={!baseCandidate?.passed || baseCandidate.source !== project} onClick={() => {
              if (!baseCandidate?.passed || baseCandidate.source !== project) return;
              mutate((draft) => {
                draft.entities = structuredClone(baseCandidate.project.entities);
                // The successful candidate clears the terrain-first marker. Carry that
                // transition through the UI Apply path as well as the generator path.
                if (draft.metadata?.['generator.stage'] === 'terrain-only-bases-required'
                  && !baseCandidate.project.metadata?.['generator.stage']) delete draft.metadata['generator.stage'];
                const target = draft.baseLayouts.find((layout) => layout.id === draft.activeBaseLayoutId);
                const source = baseCandidate.project.baseLayouts.find((layout) => layout.id === draft.activeBaseLayoutId);
                if (target && source) { target.metadata = { ...source.metadata }; target.name = source.name; }
              }, true, project.metadata?.['generator.stage'] === 'terrain-only-bases-required' ? 'both' : 'base');
              setSelectedEntityId(undefined); setMode('base'); setBaseDesignerOpen(false);
              setNotice({ tone: 'ready', text: 'Mirrored base layout applied. Terrain unchanged; Undo restores the previous bases.' });
            }}>Apply previewed bases</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setRepositoryWizardOpen} open={repositoryWizardOpen}>
        <DialogContent className="repository-wizard">
          <DialogHeader>
            <DialogTitle>Maps repository setup</DialogTitle>
            <DialogDescription>
              Diagnose the local checkout, choose a working branch, and publish map commits as pull requests into <code>main</code>.
            </DialogDescription>
          </DialogHeader>

          <section className="repository-wizard-summary">
            <div className={repositoryDiagnosticError ? 'diagnostic-row fail' : 'diagnostic-row pass'}>
              {repositoryDiagnosticError ? <AlertTriangle /> : <CheckCircle2 />}
              <span>
                <strong>{nativeRepositoryBridge ? 'Desktop repository bridge' : 'Loopback maps service'}</strong>
                <small>{repositoryDiagnosticError || (repositoryDiagnostics ? `${repositoryDiagnostics.service} is responding.` : 'Run diagnostics to check the connection.')}</small>
              </span>
            </div>
            {repositoryDiagnostics?.checks.map((check) => (
              <div className={`diagnostic-row ${check.status}`} key={check.id}>
                {check.status === 'fail' ? <AlertTriangle /> : check.status === 'warn' ? <CircleDot /> : <CheckCircle2 />}
                <span>
                  <strong>{check.label}</strong>
                  <small>{check.detail}</small>
                  {check.fix && check.status !== 'pass' && <code>{check.fix}</code>}
                </span>
              </div>
            ))}
          </section>

          {repositoryCatalog && (
            <section className="repository-branch-panel">
              <div>
                <span>WORKING BRANCH</span>
                <strong>{repositoryCatalog.branch}</strong>
              </div>
              <label>
                Switch branch
                <select
                  disabled={repositoryBusy}
                  onChange={(event) => void changeRepositoryBranch(event.target.value, false)}
                  value={repositoryCatalog.branch}
                >
                  {repositoryCatalog.branches.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
                </select>
              </label>
              <label>
                Create feature branch
                <span>
                  <input
                    onChange={(event) => setRepositoryBranchDraft(event.target.value)}
                    placeholder="maps/my-layout"
                    value={repositoryBranchDraft}
                  />
                  <button
                    disabled={repositoryBusy || !repositoryBranchDraft.trim()}
                    onClick={() => void changeRepositoryBranch(repositoryBranchDraft, true)}
                    type="button"
                  >Create</button>
                </span>
              </label>
              <p>Publishing from <code>main</code> automatically creates a timestamped feature branch. Publishing from another branch commits there and opens or updates its PR into <code>main</code>.</p>
            </section>
          )}

          <section className="repository-start-help">
            <strong>{nativeRepositoryBridge ? 'Checkout discovery' : 'Start the browser companion'}</strong>
            {nativeRepositoryBridge ? (
              <>
                <p>Choose the local <code>blackwatergaming/wulfram-maps</code> Git checkout if automatic discovery picked the wrong folder.</p>
                <button disabled={repositoryBusy} onClick={() => void configureRepository()} type="button"><FolderOpen /> Choose maps checkout</button>
              </>
            ) : (
              <>
                <p>Run one of these from the editor checkout, then retry. The service listens on loopback only.</p>
                <code>npm run dev</code>
                <code>npm run maps:serve</code>
                <code>$env:WULFRAM_MAPS_REPO=&apos;C:&#92;path&#92;to&#92;wulfram-maps&apos;</code>
                <small>Diagnostic endpoint: http://127.0.0.1:4319/diagnostics</small>
              </>
            )}
          </section>

          <DialogFooter className="repository-wizard-footer">
            <Button onClick={() => setRepositoryWizardOpen(false)} variant="outline">Done</Button>
            <Button disabled={repositoryDiagnosticBusy} onClick={() => void diagnoseRepository()}>
              <RefreshCw /> {repositoryDiagnosticBusy ? 'Checking…' : 'Retry diagnostics'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={(open) => { if (!open) closeHeightmapDialog(); }} open={heightmapDialogOpen}>
        <DialogContent className="heightmap-dialog">
          <DialogHeader>
            <DialogTitle>Import grayscale heightmap</DialogTitle>
            <DialogDescription>
              Black maps to the minimum height and white maps to the maximum. Set a negative midpoint to lower the terrain below ground without changing its elevation range. The outer terrain ring stays at zero.
            </DialogDescription>
          </DialogHeader>
          <div className="heightmap-preview">
            {heightmapPreviewUrl && <img alt="Selected grayscale heightmap" src={heightmapPreviewUrl} />}
            <span>{heightmapFile?.name}</span>
          </div>
          <div className="heightmap-control-grid">
            <NumberField label="Minimum (black)" max={5000} min={-5000} onChange={(value) => setHeightmapRange(([_, maximum]) => [value, maximum])} value={heightmapRange[0]} />
            <NumberField label="Maximum (white)" max={5000} min={-5000} onChange={(value) => setHeightmapRange(([minimum]) => [minimum, value])} value={heightmapRange[1]} />
          </div>
          <NumberField label="Midpoint height (50% gray)" onChange={(value) => setHeightmapRange((range) => recenterHeightmapRange(range, heightmapGamma, value))} value={heightmapMidpointHeight(heightmapRange, heightmapGamma)} />
          <div className="heightmap-curves">
            <RangeField label="Spike smoothing" max={6} min={0} onChange={setHeightmapSmoothing} step={1} suffix=" passes" value={heightmapSmoothing} />
            <RangeField label="Midtone curve" max={2.5} min={0.35} onChange={setHeightmapGamma} step={0.05} suffix="×" value={heightmapGamma} />
          </div>
          <div className="heightmap-presets">
            <button onClick={() => { setHeightmapRange([0, 120]); setHeightmapSmoothing(3); setHeightmapGamma(1); }} type="button">Gentle 0–120</button>
            <button onClick={() => { setHeightmapRange([0, 240]); setHeightmapSmoothing(2); setHeightmapGamma(1); }} type="button">Medium 0–240</button>
            <button onClick={() => { setHeightmapRange([0, 420]); setHeightmapSmoothing(0); setHeightmapGamma(1); }} type="button">Raw 0–420</button>
            <button onClick={() => { setHeightmapRange([-420, 0]); setHeightmapSmoothing(2); setHeightmapGamma(1); }} type="button">Below ground −420–0</button>
          </div>
          <p className="heightmap-note">Image resizing uses exact nearest-pixel sampling. Smoothing is an explicit terrain-height pass and can be set to zero.</p>
          <DialogFooter>
            <Button onClick={closeHeightmapDialog} variant="outline">Cancel</Button>
            <Button disabled={!heightmapFile} onClick={() => void importHeightmap()}><ImageIcon /> Apply heightmap</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={(open) => { if (open) setBalancedDialogOpen(true); else closeBalancedGenerator(); }} open={balancedDialogOpen}>
        <DialogContent className="balanced-generator-dialog">
          <DialogHeader>
            <DialogTitle>Generate balanced-map candidates</DialogTitle>
            <DialogDescription>
              Choose a layout or compare all three. Keep seed & regenerate preserves the seed; the randomize buttons choose a new one. Every candidate still passes through the same fairness checks. A passing result is an offline candidate—not proof of live match balance.
            </DialogDescription>
          </DialogHeader>

          <section className="balanced-generator-form">
            <label>Layout preset
              <select disabled={balancedGenerating} value={balancedPreset} onChange={(event) => setBalancedPreset(event.target.value as BalancedMapTopology | 'all')}>
                <option value="all">Compare all three</option>
                {BALANCED_TOPOLOGIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <NumberField label="Base separation (% of map diagonal)" disabled={balancedGenerating} min={30} max={65} step={1} value={balancedSeparation} onChange={setBalancedSeparation} />
            <NumberField label="Route width (× default)" disabled={balancedGenerating} min={0.5} max={1.75} step={0.05} value={balancedRouteWidth} onChange={setBalancedRouteWidth} />
            <NumberField label="Central-area diameter (× default)" disabled={balancedGenerating} min={0.5} max={2.5} step={0.1} value={balancedCentralSize} onChange={setBalancedCentralSize} />
            <label>
              Map name
              <input name="balanced-name" disabled={balancedGenerating} maxLength={100} onChange={(event) => setBalancedName(event.target.value)} value={balancedName} />
            </label>
            <label>
              Reproducible seed
              <input name="balanced-seed" disabled={balancedGenerating} maxLength={200} onChange={(event) => setBalancedSeed(event.target.value)} value={balancedSeed} />
            </label>
            <div className="balanced-seed-actions">
              <Button title="Choose a new seed and all generation settings; keep the map name. Review, then regenerate." disabled={balancedGenerating || !baseTemplates.templates.length || !BALANCED_TEXTURE_CHOICES.some(([name]) => manifest.terrainTextures[name])} onClick={() => {
                const settings = randomizeBalancedSettings(crypto.randomUUID(),
                  baseTemplates.templates.map((item) => item.id),
                  BALANCED_TEXTURE_CHOICES.filter(([name]) => manifest.terrainTextures[name]).map(([name]) => name));
                setBalancedSeed(settings.seed);
                setBalancedPreset(settings.topology);
                setBalancedSeparation(Math.round(settings.baseSeparation * 100));
                setBalancedRouteWidth(settings.routeWidth);
                setBalancedCentralSize(settings.centralAreaSize);
                setBalancedSize(settings.size);
                setBalancedWorldWidth(settings.worldWidth);
                setBalancedWorldHeight(settings.worldHeight);
                setBalancedRelief(settings.relief);
                setBalancedTemplateId(settings.templateId);
                setBalancedTextureName(settings.textureName);
                setBalancedCandidates([]);
                setBalancedSelectedIndex(0);
                setBalancedError('');
                setNotice({ tone: 'ready', text: 'Settings randomized; map name kept. Review them, then Keep seed & regenerate. Fairness checks are unchanged.' });
              }} variant="outline">Randomize all settings</Button>
              <Button disabled={balancedGenerating} onClick={() => setBalancedSeed(crypto.randomUUID())} variant="outline">Randomize seed</Button>
              <Button disabled={balancedGenerating || !balancedSeed.trim()} onClick={() => {
                if (!navigator.clipboard) {
                  setBalancedError('Clipboard access is unavailable. Select the seed text and copy it manually.');
                  return;
                }
                void navigator.clipboard.writeText(balancedSeed.trim()).then(
                  () => setNotice({ tone: 'ready', text: 'Seed copied to clipboard.' }),
                  () => setBalancedError('Clipboard access failed. Select the seed text and copy it manually.'),
                );
              }} variant="outline">Copy seed</Button>
            </div>
            <label>
              Starter base
              <select disabled={balancedGenerating} onChange={(event) => setBalancedTemplateId(event.target.value)} value={balancedTemplateId}>
                {baseTemplates.templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.curated ? 'Curated · ' : ''}{template.name} · {template.unitCount} units
                  </option>
                ))}
              </select>
            </label>
            <label>
              Terrain theme
              <select disabled={balancedGenerating} onChange={(event) => setBalancedTextureName(event.target.value)} value={balancedTextureName}>
                {BALANCED_TEXTURE_CHOICES.filter(([name]) => manifest.terrainTextures[name]).map(([name, label]) => (
                  <option key={name} value={name}>{label} · {name}</option>
                ))}
              </select>
            </label>
            <NumberField
              label="Terrain relief"
              disabled={balancedGenerating}
              max={1200}
              min={100}
              onChange={(value) => setBalancedRelief(value)}
              step={10}
              value={balancedRelief}
            />
            <NumberField label="Grid vertices per side (odd)" disabled={balancedGenerating}
              min={17} max={513} step={2} value={balancedSize} onChange={setBalancedSize} />
            <NumberField label="Base terrain elevation" disabled={balancedGenerating}
              step={10} value={balancedBaseHeight} onChange={setBalancedBaseHeight} />
            <NumberField label="World width" disabled={balancedGenerating}
              min={1} step={100} value={balancedWorldWidth} onChange={setBalancedWorldWidth} />
            <NumberField label="World height" disabled={balancedGenerating}
              min={1} step={100} value={balancedWorldHeight} onChange={setBalancedWorldHeight} />
          </section>

          <div className="balanced-profile-note">
            <strong>{BALANCED_GENERATOR_VERSION}</strong>
            <span>{balancedSize} × {balancedSize} · {balancedWorldWidth} × {balancedWorldHeight} world · 22° slope proxy · 58% raw coverage · 1-vertex clearance · 2 routes per team</span>
          </div>

          {balancedError && <p className="balanced-generator-error"><AlertTriangle />{balancedError}</p>}

          {balancedGenerating && (
            <output aria-live="polite" className="balanced-generation-progress">
              <span style={{ width: `${balancedGenerationProgress / balancedCandidateCount * 100}%` }} />
              <strong>Generating candidate {Math.min(balancedGenerationProgress + 1, balancedCandidateCount)} of {balancedCandidateCount}</strong>
              <small>Cancel safely between candidates; the current map and repository remain unchanged.</small>
            </output>
          )}

          {balancedCandidates.length > 0 && (
            <>
              <section className="balanced-candidate-grid" aria-label="Generated candidates">
                {balancedCandidates.map((candidate, index) => {
                  const topology = BALANCED_TOPOLOGIES.find((item) => item.id === candidate.result.identity.topology)
                    ?? BALANCED_TOPOLOGIES[index];
                  const passed = candidate.analysis.passed;
                  return (
                    <button
                      aria-pressed={balancedSelectedIndex === index}
                      ref={balancedSelectedIndex === index ? balancedSelectedButtonRef : undefined}
                      className={`${balancedSelectedIndex === index ? 'selected ' : ''}${passed ? 'pass' : 'fail'}`}
                      key={candidate.result.identity.topology}
                      onClick={() => setBalancedSelectedIndex(index)}
                      type="button"
                    >
                      <span>{passed ? <CheckCircle2 /> : <AlertTriangle />}<strong>{topology.label}</strong></span>
                      <small>{topology.description}</small>
                      <BalancedCandidatePreview label={topology.label} result={candidate.result} />
                      <dl>
                        <div><dt>Coverage</dt><dd>{(candidate.analysis.terrain.metrics.traversableFraction * 100).toFixed(1)}%</dd></div>
                        <div><dt>Connected</dt><dd>{(Math.min(...candidate.analysis.terrain.metrics.teams.map((item) => item.reachableFractionOfTraversable)) * 100).toFixed(1)}%</dd></div>
                        <div><dt>High ground</dt><dd>{(Math.min(...candidate.analysis.terrain.metrics.teams.map((item) => item.reachableHighGroundFraction)) * 100).toFixed(1)}%</dd></div>
                        <div><dt>Routes</dt><dd>{candidate.analysis.terrain.metrics.teams.map((item) => item.routeCount).join(' / ')}</dd></div>
                        <div><dt>Map errors</dt><dd>{candidate.analysis.projectErrorCount}</dd></div>
                      </dl>
                    </button>
                  );
                })}
              </section>

              {selectedBalancedCandidate && (
                <section className="balanced-gate-list">
                  <p className="balanced-candidate-identity">
                    Selected candidate seed: <code>{selectedBalancedCandidate.result.identity.seed}</code>
                    {' · '}{selectedBalancedCandidate.result.identity.topology}
                    {' · '}{BALANCED_GENERATOR_VERSION}
                    {' · '}{selectedBalancedCandidate.result.identity.size} × {selectedBalancedCandidate.result.identity.size}
                    {' · '}{selectedBalancedCandidate.result.identity.worldWidth} × {selectedBalancedCandidate.result.identity.worldHeight} world
                    {' · '}bases {Math.round(selectedBalancedCandidate.result.identity.baseSeparation * 100)}%
                    {' · '}routes {selectedBalancedCandidate.result.identity.routeWidth}×
                    {' · '}center {selectedBalancedCandidate.result.identity.centralAreaSize}×
                  </p>
                  {selectedBalancedCandidate.analysis.terrain.gates.map((gate) => (
                    <div className={gate.passed ? 'pass' : 'fail'} key={gate.code}>
                      {gate.passed ? <CheckCircle2 /> : <AlertTriangle />}
                      <span><strong>{gate.code.replaceAll('-', ' ')}</strong><small>{gate.message}</small></span>
                    </div>
                  ))}
                  <div className={selectedBalancedCandidate.analysis.entityPairing.passed ? 'pass' : 'fail'}>
                    {selectedBalancedCandidate.analysis.entityPairing.passed ? <CheckCircle2 /> : <AlertTriangle />}
                    <span>
                      <strong>entity pairing</strong>
                      <small>{selectedBalancedCandidate.analysis.entityPairing.message}</small>
                    </span>
                  </div>
                  <div className={selectedBalancedCandidate.analysis.projectErrorCount === 0 ? 'pass' : 'fail'}>
                    {selectedBalancedCandidate.analysis.projectErrorCount === 0 ? <CheckCircle2 /> : <AlertTriangle />}
                    <span>
                      <strong>base-layout validation</strong>
                      <small>{selectedBalancedCandidate.analysis.projectErrorCount === 0
                        ? `No map errors${selectedBalancedCandidate.analysis.projectWarningCount ? `; ${selectedBalancedCandidate.analysis.projectWarningCount} warning(s).` : '.'}`
                        : `${selectedBalancedCandidate.analysis.projectErrorCount} blocking map error(s).`}</small>
                    </span>
                  </div>
                </section>
              )}
            </>
          )}

          <DialogFooter className="balanced-generator-footer" style={{ flexWrap: 'wrap' }}>
            {balancedDialogOpen && <PassingMapSearch disabled={balancedGenerating} request={{
              options: { seed: balancedSeed, topology: balancedPreset === 'all' ? 'open-field' : balancedPreset,
                name: balancedName.trim() || 'Generated balanced map', relief: balancedRelief, baseHeight: balancedBaseHeight,
                size: balancedSize, baseSeparation: balancedSeparation / 100, routeWidth: balancedRouteWidth,
                centralAreaSize: balancedCentralSize, worldWidth: balancedWorldWidth, worldHeight: balancedWorldHeight, textureName: balancedTextureName },
              topologies: BALANCED_TOPOLOGIES.filter(item => balancedPreset === 'all' || item.id === balancedPreset).map(item => item.id),
              template: baseTemplates.templates.find(item => item.id === balancedTemplateId)!, manifest, source: project,
            }} onInvalidate={() => { setBalancedCandidates([]); setBalancedSelectedIndex(0); }}
              onPreview={candidate => { setBalancedCandidates([candidate]); setBalancedSelectedIndex(0); setBalancedError(''); }} />}
            <DiagnosticsButton project={project} manifest={manifest} context={{ surface: 'balanced', draft: { seed: balancedSeed, topology: balancedPreset, relief: balancedRelief, size: balancedSize, baseSeparation: balancedSeparation / 100, routeWidth: balancedRouteWidth, centralAreaSize: balancedCentralSize, worldWidth: balancedWorldWidth, worldHeight: balancedWorldHeight, baseHeight: balancedBaseHeight, textureName: balancedTextureName, templateId: balancedTemplateId }, message: selectedBalancedCandidate?.baseMessage ?? balancedError, candidate: selectedBalancedCandidate?.result.project, candidatePassed: selectedBalancedCandidate?.analysis.passed }} />
            <div aria-live="polite" style={{ flexBasis: '100%' }}>
              {selectedBalancedCandidate ? <>
                <p>{selectedBalancedCandidate.baseMessage}</p>
                {!selectedBalancedCandidatePassed && <p>Full Apply is blocked. {selectedBalancedCandidate.analysis.terrain.passed ? 'Terrain passed: apply terrain only, or choose another starter base and regenerate.' : 'Terrain failed: change relief, routes or seed and regenerate.'}</p>}
                {selectedBalancedCandidate.analysis.terrain.gates.filter(gate => !gate.passed).map(gate => <small key={gate.code}>{gate.message} </small>)}
                {selectedBalancedCandidate.analysis.projectIssues.filter(issue => issue.severity === 'error').slice(0, 6).map((issue, index) => <p key={index}>{issue.message}</p>)}
              </> : <p>Generate a preview first. Apply unlocks only after its checks pass.</p>}
            </div>
            <Button onClick={closeBalancedGenerator} variant="outline">{balancedGenerating ? 'Stop and close' : 'Cancel'}</Button>
            <Button ref={balancedGenerateButtonRef} disabled={balancedGenerating} onClick={() => void buildBalancedCandidates()} variant="outline"><RefreshCw /> {balancedGenerating ? `Generating ${balancedGenerationProgress}/${balancedCandidateCount}` : 'Keep seed & regenerate'}</Button>
            <Button disabled={balancedGenerating || !selectedBalancedCandidate?.analysis.terrain.passed} onClick={() => applyBalancedCandidate(true)} variant="outline">Apply terrain only</Button>
            <Button disabled={balancedGenerating || !selectedBalancedCandidatePassed} onClick={() => applyBalancedCandidate()}><Sparkles /> Apply passing candidate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <header className="topbar">
        <button className="brand-lockup" onClick={() => window.open('https://github.com/blackwatergaming/wulfram-mapeditor', '_blank')} type="button">
          <span className="brand-mark"><Layers3 /></span>
          <span><strong>WULFRAM</strong><small>FORGE</small></span>
        </button>
        <div className="map-title">
          <span>MAP</span>
          <input
            aria-label="Map name"
            onChange={(event) => mutate((draft) => { draft.name = event.target.value; }, false, 'terrain')}
            value={project.name}
          />
          {dirty && <i aria-label="Unsaved changes" title={`${dirtyScopes.terrain ? 'Terrain' : ''}${dirtyScopes.terrain && dirtyScopes.base ? ' + ' : ''}${dirtyScopes.base ? 'base layouts' : ''} changed`} />}
          <Badge className="source-badge" variant="outline">ORIGINAL ASSETS</Badge>
        </div>
        <div className="top-actions">
          <details className="header-action-menu" data-header-menu="generate">
            <summary>Generate</summary><div className="header-action-items">
          <Button onClick={event=>{event.currentTarget.closest('details')?.removeAttribute('open');openBalancedGenerator();}} size="sm" title="Generate and analyze balanced-map candidates" variant="ghost"><Sparkles /> Balanced</Button>
          <Button onClick={event=>{event.currentTarget.closest('details')?.removeAttribute('open');openBaseDesigner();}} size="sm" title="Random base" variant="ghost"><Box />Random base</Button>
          <Button onClick={event=>{event.currentTarget.closest('details')?.removeAttribute('open');setTerrainDetailOpen(true);}} size="sm" title="Terrain detail" variant="ghost"><Mountain />Terrain detail</Button>
            </div>
          </details>
          <Button onClick={newMap} size="sm" title="New map" variant="ghost"><Plus /> New</Button>
          <Button onClick={() => importRef.current?.click()} size="sm" title="Import map or heightmap" variant="ghost"><FolderOpen /> Import</Button>
          <Button onClick={saveLocal} size="sm" title="Save the complete editor project in this browser" variant="ghost"><Save /> Save local</Button>
          <DiagnosticsButton project={project} manifest={manifest} context={() => ({ surface: 'editor', draft: { mode, layoutMetadata: layoutMetadataRef.current?.value }, message: notice.text })} />
          <details className="header-action-menu" data-header-menu="exports">
            <summary>Other exports</summary><div className="header-action-items">
          <Button onClick={event=>{event.currentTarget.closest('details')?.removeAttribute('open');void exportSource();}} size="sm" title="Export Git source" variant="ghost"><FileArchive /> Source</Button>
          <Button onClick={event=>{event.currentTarget.closest('details')?.removeAttribute('open');exportJson();}} size="sm" title="Export server JSON" variant="ghost"><FileJson /> JSON</Button>
            </div>
          </details>
          <Button className="export-button" onClick={() => void exportMap()} size="sm" title="Export Wulfram package"><Download /> Export map</Button>
        </div>
      </header>

      <EditorMenuBar groups={[
        {label:'File',items:[{label:'New map',run:newMap},{label:'Import…',run:()=>importRef.current?.click()},{label:'Save local',run:saveLocal},{label:'Export map ZIP',run:()=>void exportMap()},{label:'Export Git source ZIP',run:()=>void exportSource()},{label:'Export base-layout JSON',run:exportJson}]},
        {label:'Edit',items:[{label:'Undo',run:undo,disabled:!undoStack.length},{label:'Redo',run:redo,disabled:!redoStack.length}]},
        {label:'View',items:[{label:'Toggle terrain grid',run:()=>setShowGrid(value=>!value)},{label:'Display options',run:()=>setNavigationTarget({selector:'.shared-display-options',label:'Display options',resolve:message=>setNotice({tone:'ready',text:message})})}]},
        {label:'Terrain',items:[...(['sculpt','lower','level','smooth','paint','stamp','landform','lane'] as const).map((tool,index)=>({label:['Raise','Lower','Flatten','Smooth','Paint texture','Set height','Large landforms','Lane tool'][index],run:()=>{pauseRoute();setMode('terrain');setInspectionMode(false);setTerrainTool(tool);}})),{label:'Stamp at coordinates…',run:()=>{setMode('terrain');setTerrainStampOpen(true);}}]},
        {label:'Bases',items:[{label:'Browse base library…',run:()=>{pauseRoute();setMode('base');setInspectionMode(false);setBaseLibraryOpen(true);}},{label:'Build',run:()=>{pauseRoute();setMode('base');setInspectionMode(false);setBaseInspectorPage('build');}},{label:'Inspect',run:()=>{pauseRoute();setMode('base');setInspectionMode(true);setSelectedEntityId(undefined);}},{label:'Rules',run:()=>{pauseRoute();setMode('base');setInspectionMode(false);setBaseInspectorPage('rules');}}]},
        {label:'Tools',items:[{label:'Generate balanced map…',run:openBalancedGenerator},{label:'Random base…',run:openBaseDesigner},{label:'Terrain detail…',run:()=>setTerrainDetailOpen(true)},{label:'Repository…',run:()=>setNavigationTarget({selector:'.repository-controls',label:'Repository',resolve:message=>setNotice({tone:'ready',text:message})})}]},
        {label:'Help',items:[{label:'Map-making guide',run:()=>setNavigationTarget({selector:'.workflow-guide > details',label:'Map-making guide',resolve:message=>setNotice({tone:'ready',text:message})})},{label:'Find tools and settings',run:()=>setNavigationTarget({selector:'.tool-finder',label:'Find tools and settings',resolve:message=>setNotice({tone:'ready',text:message})})},{label:'About this editor',run:()=>setNavigationTarget({selector:'.about-editor',label:'About this editor',resolve:message=>setNotice({tone:'ready',text:message})})}]},
      ]}/>

      <section className="tool-options-bar" aria-label="Tool options">
        <strong>{modeLabel}</strong>
        {mode === 'terrain' ? terrainTool==='lane'?<span>Width {laneOptions.width} u · Floor {laneOptions.floorHeight} u · Draw, preview, then Apply lane</span>: terrainTool === 'landform' ? <>
          <label>Height / depth <input aria-label="Toolbar landform height" type="range" min={5} max={2000} step={5} value={stampSettings.amplitude} onChange={event=>setStampSettings({...stampSettings,amplitude:Number(event.target.value)})}/><output>{stampSettings.amplitude} u</output></label>
          <label>Rotation <input aria-label="Toolbar landform rotation" type="range" min={-180} max={180} step={15} value={stampSettings.rotation} onChange={event=>setStampSettings({...stampSettings,rotation:Number(event.target.value)})}/><output>{stampSettings.rotation}°</output></label>
        </> : <>
          <label>Radius <input aria-label="Toolbar brush radius" type="range" min={25} max={600} step={5} value={brushRadius} onChange={event=>setBrushRadius(Number(event.target.value))}/><output>{brushRadius} u</output></label>
          <label>Strength <input aria-label="Toolbar brush strength" type="range" min={1} max={100} value={brushStrength} onChange={event=>setBrushStrength(Number(event.target.value))}/><output>{brushStrength}%</output></label>
          <label>Shape <select aria-label="Toolbar brush shape" value={brushShape} onChange={event=>setBrushShape(event.target.value as TerrainBrushShape)}><option value="round">Round</option><option value="square">Square</option><option value="diamond">Diamond</option></select></label>
          <label>Edge <select aria-label="Toolbar brush edge" value={brushFalloff} onChange={event=>setBrushFalloff(event.target.value as TerrainBrushFalloff)}><option value="soft">Soft</option><option value="linear">Linear</option><option value="hard">Hard</option></select></label>
          {terrainTool==='stamp' && <label>Target height <input aria-label="Toolbar target height" type="number" min={-5000} max={5000} step={0.25} value={terrainTargetHeight} onChange={event=>{const value=event.target.valueAsNumber;if(Number.isFinite(value))setTerrainTargetHeight(Math.max(-5000,Math.min(5000,value)));}}/> u</label>}
          {terrainTool==='paint' && <button className="toolbar-material" type="button" aria-label="Choose paint material" onClick={()=>{const search=document.querySelector<HTMLInputElement>('.texture-library input');search?.scrollIntoView({block:'center'});search?.focus();}}><img alt="" src={manifest.terrainTextures[selectedTexture]?.url}/>Material: {selectedTexture}</button>}
        </> : inspectionMode ? <span>Inspect buildings and routes</span> : creativeDraft ? <span>Formation preview · placement settings in the left panel</span> : <>
          <label>Build team <select aria-label="Toolbar build team" value={team} onChange={event=>setTeam(Number(event.target.value))}><option value={0}>Neutral</option><option value={1}>Team 1</option><option value={2}>Team 2</option></select></label>
          <label>Placement clearance <input aria-label="Toolbar placement clearance" type="range" min={0} max={2} step={0.05} value={placementHeight} onChange={event=>setPlacementHeight(Number(event.target.value))}/><output>{placementHeight} u</output></label>
        </>}
      </section>

      <div className="workspace">
        <aside className="tool-rail">
          <WorkflowGuide mode={mode} tool={terrainTool} inspecting={inspectionMode} templateCount={baseTemplates.templates.length} onAction={action => {
            pauseRoute();
            if (action === 'sculpt' || action === 'landform') { setMode('terrain'); setTerrainTool(action); setInspectionMode(false); }
            if (action === 'bases') { setMode('base'); setInspectionMode(false); setBaseLibraryOpen(true); }
            if (action === 'random') openBalancedGenerator();
            if (action === 'inspect') { setMode('base'); setInspectionMode(true); setSelectedEntityId(undefined); }
            if (action === 'save') setNotice({ tone: 'ready', text: 'Save local keeps an editable copy on this device. Export map downloads a portable ZIP; use Import to reopen it. Source exports Git source, and JSON exports server data. Review validation before game use.' });
          }} />
          <ToolFinder onNavigate={async tool=>{
            setNavigationTarget(undefined);
            if(tool.savedLayout&&creativeDraft)return 'Apply or cancel the current formation preview before opening saved-layout tools. Your preview is retained.';
            pauseRoute();
            if(tool.mode)setMode(tool.mode);
            if(tool.mode==='base')setBaseInspectorPage(tool.savedLayout&&tool.id!=='districts'&&tool.id!=='layout-metadata'&&tool.id!=='authored-bases'?'rules':'build');
            if(tool.tool)setTerrainTool(tool.tool);
            if(tool.mode)setInspectionMode(!!tool.inspection);
            if(tool.inspection)setSelectedEntityId(undefined);
            if(tool.action==='library')setBaseLibraryOpen(true);
            if(tool.action==='random')openBalancedGenerator();
            if(tool.action==='stamp-dialog')setTerrainStampOpen(true);
            if(tool.selector)return new Promise<string>(resolve=>setNavigationTarget({selector:tool.selector!,label:tool.label,resolve}));
            return `Opened ${tool.label}. Map unchanged.`;
          }}/>
          <div className="mode-switch" role="tablist">
            <button aria-selected={mode === 'terrain'} className={mode === 'terrain' ? 'active' : ''} onClick={() => setMode('terrain')} role="tab" type="button"><Mountain /> Terrain</button>
            <button aria-selected={mode === 'base'} className={mode === 'base' ? 'active' : ''} onClick={() => setMode('base')} role="tab" type="button"><Box /> Base builder</button>
          </div>

                <details className="shared-display-options"><summary className="field-help">Display options</summary>
                {mode==='terrain'&&<p className="field-help">Power and route settings apply in Base builder.</p>}
                <output className="field-help">{displayPreferencesMessage}</output>
                <label className="field-help" style={{display:'block'}}><input type="checkbox" checked={showGrid} onChange={event=>setShowGrid(event.target.checked)} /> Terrain grid</label>
                <label className="field-help" style={{display:'block'}}><input type="checkbox" checked={powerTint} onChange={event=>setPowerTint(event.target.checked)} /> Power tint</label>
                <div className="field-help">
                  {(['power','darklight','turrets'] as const).map(key=><label key={key} style={{display:'block'}}><input type="checkbox" checked={coverage[key]} onChange={event=>setCoverage({...coverage,[key]:event.target.checked})} /> {key==='power'?'Power circles':key==='darklight'?'Estimated Darklight circles':'Estimated turret ranges / blind spots'}</label>)}
                  {(coverage.darklight||coverage.turrets)&&<p>Estimated radii: Darklight 180 u; gun 475 u; flak 300–1,000 u; missiles 900–1,400 u. Dashed inner circles mark blind spots. Terrain can block shots. These ranges need server verification.</p>}
                </div>
                <label className="field-help" style={{display:'block'}}><input type="checkbox" checked={powerIcons} onChange={event=>setPowerIcons(event.target.checked)} /> Power status icons</label>
                <label className="field-help" style={{display:'block'}}><input type="checkbox" checked={showAccessPaths} onChange={event=>setShowAccessPaths(event.target.checked)} /> Show access routes</label>
                {(Object.keys(displayOptions) as Array<keyof typeof displayOptions>).map(key=><label className="field-help" style={{display:'block'}} key={key}><input type="checkbox" checked={displayOptions[key]} onChange={event=>setDisplayOptions({...displayOptions,[key]:event.target.checked})} /> {{overlays:'Show display overlays',boundaries:'Building area circles',areas:'Reserved areas and corridors',entrances:'Entrance guides',links:'Inspection power links',routes:'Route inspection controls',markers:'Route clearance markers'}[key]}</label>)}
                {powerIcons && <p className="field-help">Yellow bolt: powered. Red slashed bolt: no friendly power. Icons appear only on buildings that require power.</p>}
                {powerTint && <p className="field-help"><span style={{color:'#4ee581'}}>Green: powered</span> · <span style={{color:'#ff6767'}}>Red: outside friendly power</span>. Self-powered buildings keep their colors. Uses placement-point distance and a 10 u margin.</p>}
                <button type="button" onClick={()=>{setShowGrid(true);setPowerTint(true);setPowerIcons(true);setCoverage({power:true,darklight:false,turrets:false});setShowAccessPaths(true);setDisplayOptions({overlays:true,boundaries:true,areas:true,entrances:true,links:true,routes:true,markers:true});}}>Reset display options</button>
                </details>
          {mode === 'terrain' ? (
            <>
              <section className="panel-section">
                <p className="section-label">TERRAIN TOOLS</p>
                <button className="secondary-action" type="button" onClick={() => setTerrainTool('landform')}><Mountain /> Landform brush</button>
                <button className="secondary-action" type="button" onClick={() => setTerrainTool('lane')}>Lane tool</button>
                <details className="precise-terrain-tools"><summary>Precise placement</summary><button className="secondary-action" type="button" onClick={() => setTerrainStampOpen(true)}><Mountain /> Stamp at coordinates</button></details>
                <div className="tool-list">
                  {([
                    ['sculpt', Pickaxe, 'Raise', '1'],
                    ['lower', Mountain, 'Lower', '2'],
                    ['level', CircleDot, 'Flatten', '3'],
                    ['smooth', RotateCw, 'Smooth', '4'],
                    ['paint', Paintbrush, 'Paint texture', '5'],
                    ['stamp', Grid3X3, 'Set height', '6'],
                  ] as const).map(([key, Icon, label, shortcut]) => (
                    <button className={terrainTool === key ? 'tool-item active' : 'tool-item'} key={key} onClick={() => setTerrainTool(key)} type="button">
                      <Icon /><span>{label}</span><kbd>{shortcut}</kbd>
                    </button>
                  ))}
                </div>
                <button className="heightmap-action" onClick={() => setNavigationTarget({selector:'.heightmap-import-controls',label:'Heightmap import settings',resolve:message=>setNotice({tone:'ready',text:message})})} type="button">
                  <ImageIcon /><span><strong>Import grayscale</strong><small>Create terrain from a heightmap</small></span>
                </button>
              <details className="heightmap-import-controls">
                <summary>Heightmap import settings</summary>
                <div className="number-grid two">
                  <NumberField label="Min / black" onChange={(value) => setHeightmapRange(([_, maximum]) => [value, maximum])} value={heightmapRange[0]} />
                  <NumberField label="Max / white" onChange={(value) => setHeightmapRange(([minimum]) => [minimum, value])} value={heightmapRange[1]} />
                </div>
                <div className="heightmap-inline-controls">
                  <NumberField label="Midpoint height (50% gray)" onChange={(value) => setHeightmapRange((range) => recenterHeightmapRange(range, heightmapGamma, value))} value={heightmapMidpointHeight(heightmapRange, heightmapGamma)} />
                  <RangeField label="Smoothing" max={6} min={0} onChange={setHeightmapSmoothing} step={1} value={heightmapSmoothing} />
                  <RangeField label="Midtone curve" max={2.5} min={0.35} onChange={setHeightmapGamma} step={0.05} suffix="×" value={heightmapGamma} />
                </div>
                <button className="secondary-action" onClick={() => heightmapRef.current?.click()} type="button"><ImageIcon /> Choose heightmap</button>
              </details>
              </section>
              <section className="panel-section">
                <label className="section-label" htmlFor="terrain-skybox">SKYBOX</label>
                <select
                  className="template-select"
                  id="terrain-skybox"
                  onChange={(event) => mutate((draft) => { draft.terrain.skyName = resolveSkyboxName(event.target.value); }, true, 'terrain')}
                  value={resolveSkyboxName(project.terrain.skyName)}
                >
                  {Object.entries(manifest.skyboxes ?? {}).map(([name, asset]) => (
                    <option key={name} value={name}>{asset.label}</option>
                  ))}
                </select>
              </section>
              <section className="panel-section texture-library">
                <div className="section-heading"><p className="section-label">ORIGINAL TEXTURES</p><span>{textureNames.length}</span></div>
                <label className="search-field"><Search /><input aria-label="Search textures" onChange={(event) => { setTextureSearch(event.target.value); setTexturePage(0); }} placeholder="Filter archive…" value={textureSearch} /></label>
                <div className="texture-grid">
                  {visibleTextures.map((name) => (
                    <button
                      aria-label={name}
                      className={selectedTexture === name ? 'texture-chip selected' : 'texture-chip'}
                      key={name}
                      onClick={() => { setSelectedTexture(name); setTerrainTool('paint'); }}
                      title={name}
                      type="button"
                    >
                      <img alt="" src={manifest.terrainTextures[name].url} />
                      <span>{name}</span>
                    </button>
                  ))}
                </div>
                <div className="pager">
                  <button disabled={activeTexturePage === 0} onClick={() => setTexturePage((page) => Math.max(0, page - 1))} type="button">←</button>
                  <span>{activeTexturePage + 1} / {texturePageCount}</span>
                  <button disabled={activeTexturePage + 1 >= texturePageCount} onClick={() => setTexturePage((page) => Math.min(texturePageCount - 1, page + 1))} type="button">→</button>
                </div>
              </section>
            </>
          ) : (
            <>
              <section className="panel-section layout-library">
                <button className="secondary-action" type="button" onClick={() => { pauseRoute(); setBaseLibraryOpen(true); }}><Box /> Browse base library</button>
                <div className="section-heading"><p className="section-label">MAP LAYOUTS</p><span>{project.baseLayouts.length}</span></div>
                <select
                  aria-label="Active base layout"
                  className="template-select"
                  onChange={(event) => selectBaseLayout(event.target.value)}
                  value={project.activeBaseLayoutId}
                >
                  {project.baseLayouts.map((layout) => (
                    <option key={layout.id} value={layout.id}>{layout.name} · {layout.entities.filter((entity) => entity.token !== '*').length} units</option>
                  ))}
                  <optgroup label="Add built-in formation">
                    {BUILTIN_BASE_LAYOUTS.map((preset) => (
                      <option key={preset.id} value={`builtin:${preset.id}`}>{preset.name} · {preset.count} per team</option>
                    ))}
                  </optgroup>
                  <optgroup label="Generate a new randomized layout">
                    {CREATIVE_BASE_LAYOUTS.map((preset) => (
                      <option key={preset.id} value={`creative:${preset.id}`}>{preset.name}</option>
                    ))}
                    <option value="creative:offset-bastion">Offset Bastion</option>
                    <option value="creative:frontier-camp">Frontier Camp</option>
                    <option value="creative:service-courtyard">Service Courtyard</option>
                    <option value="creative:broken-ring">Broken Ring</option>
                    <option value="creative:valley-pockets">Valley Pockets</option><option value="creative:three-lane-anchor">Three-Lane Anchor</option>
                  </optgroup>
                </select>
                <details className="formation-favorites"><summary>Saved formations</summary>
                <label className="field-help">Reuse a favorite
                  <select aria-label="Formation favorites" className="template-select" value="" onChange={event=>{
                    const favorite=formationFavorites.find(f=>f.id===event.target.value);if(!favorite)return;
                    const {worldWidth:w,worldHeight:h}=project.terrain;
                    setCreativeCandidate(undefined);setCreativeDraft({style:'',favoriteId:favorite.id,seed:createId('seed'),placement:{size:favorite.valleyRecipe?.size??'large',x:w>=h?w/4:w/2,y:w>=h?h/2:h/4,rotation:w>=h?0:90,radius:favorite.radius,checkAccess:true}});
                  }}><option value="">Choose a saved formation…</option>{formationFavorites.filter(f=>f.kind!=='district').map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select>
                </label>
                <button className="secondary-action" type="button" disabled={!activeLayout?.metadata['formation.placement']} onClick={()=>{
                  try{
                    if(!activeLayout)return;
                    if(formationFavorites.length>=50)throw new Error('Favorites library is full (50).');
                    const favorite=favoriteFromLayout(activeLayout,JSON.parse(activeLayout.metadata['formation.placement']),createId('favorite'),project,manifest??undefined);
                    const next=[...formationFavorites,favorite];localStorage.setItem('forge-formation-favorites-v1',JSON.stringify(next));setFormationFavorites(next);
                    setNotice({tone:'ready',text:`Saved ${favorite.name}. Available on other maps in this editor profile.`});
                  }catch(error){setNotice({tone:'error',text:error instanceof Error?error.message:'Could not save favorite.'});}
                }}>Save active formation as favorite</button>
                
                </details>
                {(coverage.darklight||coverage.turrets)&&<p className="field-help">Estimated coverage overlays enabled — not verified firing or concealment ranges. Dashed inner circles are blind spots.</p>}
                {creativeDraft && <div className="layout-controls">
                  <p className="field-help"><strong>{creativeDraft.favoriteId?formationFavorites.find(f=>f.id===creativeDraft.favoriteId)?.name:(creativeDraft.style==='three-lane-anchor'?'Three-Lane Anchor':creativeDraft.style==='valley-pockets'?'Valley Pockets':creativeDraft.style==='broken-ring'?'Broken Ring':creativeDraft.style==='service-courtyard'?'Service Courtyard':creativeDraft.style==='frontier-camp'?'Frontier Camp':creativeDraft.style==='offset-bastion'?'Offset Bastion':CREATIVE_BASE_LAYOUTS.find(s=>s.id===creativeDraft.style)?.name)} — placement preview</strong></p>
                  {creativeDraft.style==='offset-bastion'&&<p className="field-help">A rear command yard and offset defenses flank a bent reserved approach. Favorites retain both corridors. Automatic service routes are checked separately and may take another path. Reviewed under editor rules; game behavior remains unverified.</p>}
                  {creativeDraft.style==='valley-pockets'&&<p className="field-help">Adds side yards to the current buildings. Minimum new structures per team: 10 starter, 15 standard, 20 fortified, 30 massive. Higher targets add defenses when they fit. Favorites preserve the generated yards and passages; other buildings are excluded.</p>}
                  {creativeDraft.style==='three-lane-anchor'&&<p className="field-help">Three courts per team, with 15 starter, 21 standard, 30 fortified or 42 massive new buildings. Use count 0 for the size minimum; higher counts add defenses when they fit. Existing buildings are retained. All six exits start unbound; connect lanes in Rules. Requires a layout without entrance rules. Save an authored base or whole map for reuse.</p>}
                  {creativeDraft.style==='broken-ring'&&<p className="field-help">Perimeter base with rear services and two openings. Keep the loop and interior clear. Favorites retain this plan; save the whole map after editing its reserved routes.</p>}
                  {creativeDraft.style==='service-courtyard'&&<p className="field-help">Two powered banks face an open through-court. Favorites retain all six reservations. Preview checks an 80-unit passage on this terrain; sampled clearance is not in-game collision proof.</p>}
                  {creativeDraft.style==='frontier-camp'&&<p className="field-help">Occupied service yards leave a reserved expansion strip at each base. Preview checks both strips and matching terrain support. Favorites retain the reservations. Reviewed under editor rules; game behavior remains unverified.</p>}
                  {creativeDraft.style==='offset-bastion'&&!creativeDraft.favoriteId&&<label className="field-help">District arrangement
                    <select aria-label="Offset Bastion arrangement" className="template-select" value={creativeDraft.placement.offsetArrangement??'classic'} onChange={event=>setCreativeDraft({...creativeDraft,placement:{...creativeDraft.placement,offsetArrangement:event.target.value as CreativePlacement['offsetArrangement']}})}>
                      <option value="classic">Classic</option><option value="wide-front">Wide Front</option><option value="deep-court">Deep Court</option><option value="split-wings">Split Wings</option>
                    </select>
                    <span>Moves whole districts and reshapes the entrance. Reroll varies buildings within that plan.</span>
                  </label>}
                  <label className="field-help">Base size
                    <select aria-label="Creative base size" disabled={!!creativeDraft.favoriteId} className="template-select" value={creativeDraft.placement.size} onChange={event=>setCreativeDraft({...creativeDraft,placement:{...creativeDraft.placement,size:event.target.value as CreativePlacement['size']}})}>
                      <option value="small">Starter · fewer positions</option><option value="standard">Standard</option><option value="large">Fortified · full design</option><option value="massive">Massive · reinforced</option>
                    </select>
                  </label>
                  {!creativeDraft.favoriteId&&<label className="field-help">{creativeDraft.style==='valley-pockets'?'New structures per team (0 = size minimum)':'Target structures per team (0 = automatic)'}<input style={{display:'block',width:'100%',padding:8,border:'1px solid #465058',borderRadius:4}} aria-label="Target structures per team" type="number" min={0} max={120} step={1} value={creativeDraft.placement.targetCount??0} onChange={event=>setCreativeDraft({...creativeDraft,placement:{...creativeDraft.placement,targetCount:Number(event.target.value)}})} /></label>}
                  <label className="field-help"><input type="checkbox" disabled={creativeDraft.style==='three-lane-anchor'} checked={creativeDraft.style==='three-lane-anchor'||(creativeDraft.placement.checkAccess??false)} onChange={event=>setCreativeDraft({...creativeDraft,placement:{...creativeDraft.placement,checkAccess:event.target.checked}})} /> {creativeDraft.style==='three-lane-anchor'?'Pad access and exit checks required':'Check sampled pad access and exits'}</label>

                  {!creativeDraft.favoriteId&&<>
                    {creativeDraft.style==='three-lane-anchor'?<p className="field-help">Fixed yard arrangement; terrain support is checked before placement.</p>:<label className="field-help"><input type="checkbox" checked={creativeDraft.placement.terrainAware??false} onChange={event=>setCreativeDraft({...creativeDraft,placement:{...creativeDraft.placement,terrainAware:event.target.checked}})} /> Adapt powered yards to terrain</label>}
                    <label className="field-help" hidden={['valley-pockets','three-lane-anchor'].includes(creativeDraft.style)}><input type="checkbox" checked={creativeDraft.placement.entranceDegrees!==undefined} onChange={event=>setCreativeDraft({...creativeDraft,placement:{...creativeDraft.placement,entranceDegrees:event.target.checked?creativeDraft.placement.rotation:undefined}})} /> Reserve a main entrance</label>
                    {creativeDraft.placement.entranceDegrees!==undefined&&<><RangeField label="Entrance direction" min={0} max={355} step={5} suffix="°" value={creativeDraft.placement.entranceDegrees} onChange={entranceDegrees=>setCreativeDraft({...creativeDraft,placement:{...creativeDraft.placement,entranceDegrees}})} /><p className="field-help">180 u wide. Cyan guides show the requested approach; green routes appear after checks. 0° faces +X, 90° faces +Y. Team 2 faces the opposite direction. Reserving an entrance also adapts the yards.</p></>}
                  </>}
                  <p className="field-help">Click or drag on terrain to move Team 1&apos;s center; Team 2 mirrors it. Release to recheck. Green lines are sampled routes. Red crosses mark blocked approaches or rejected buildings.</p>
                  {creativeDiagnostics?.draft===creativeDraft&&creativeDiagnostics.source===project&&<div role="alert">{creativeDiagnostics.overlay.blocked.slice(0,6).map((point,i)=><p className="field-help" style={{color:'#ff7777'}} key={i}>{point.message} · X {Math.round(point.x)}, Y {Math.round(point.y)}</p>)}</div>}
                  <RangeField label="Building area radius" min={300} max={4000} step={50} suffix=" u" value={creativeDraft.placement.radius} onChange={radius=>setCreativeDraft({...creativeDraft,placement:{...creativeDraft.placement,radius}})} />
                  <RangeField label="Base center X" min={0} max={project.terrain.worldWidth} step={25} suffix=" u" value={creativeDraft.placement.x} onChange={x=>setCreativeDraft({...creativeDraft,placement:{...creativeDraft.placement,x}})} />
                  <RangeField label="Base center Y" min={0} max={project.terrain.worldHeight} step={25} suffix=" u" value={creativeDraft.placement.y} onChange={y=>setCreativeDraft({...creativeDraft,placement:{...creativeDraft.placement,y}})} />
                  <RangeField label="Base rotation" min={0} max={360} step={5} suffix="°" value={creativeDraft.placement.rotation} onChange={rotation=>setCreativeDraft({...creativeDraft,placement:{...creativeDraft.placement,rotation}})} />
                  <p className="field-help">Yellow circles limit the building area for each mirrored base; they are not power ranges. Size changes the number of positions and defenses, not model scale. Current layouts are hidden only while previewing.</p>
                  <p className="field-help">Option clearance counts approaches with findings at an assumed 80 u vehicle width. Blocked takes precedence over tight. Inspect the selected route for details; sampled checks are not vehicle collision proof.</p>
                  <button type="button" onClick={()=>previewCreativeDraft(creativeDraft)}>Preview formation</button>
                  {creativeOptions?.source===project&&creativeOptions.draft===creativeDraft&&<fieldset aria-label="Formation options">{creativeOptions.items.map((option,index)=><button style={{display:'block',width:'100%',textAlign:'left',padding:8,border:creativePreviewLayout===option.layout&&option.layout?'1px solid #63d99a':'1px solid #465058',marginBottom:6}} key={index} type="button" aria-pressed={!!option.layout&&creativePreviewLayout===option.layout} onClick={()=>{
                    setCreativeCandidate(option.layout?{layout:option.layout,source:project,draft:creativeDraft}:undefined);
                    setCreativeDiagnostics(option.overlay?{source:project,draft:creativeDraft,overlay:option.overlay}:undefined);
                    setNotice({tone:option.layout?'ready':'error',text:option.error??`Option ${index+1}: ${option.layout?.name}. Apply adds this arrangement.`});
                  }}>Option {index+1} · {option.layout?`${['valley-pockets','three-lane-anchor'].includes(option.layout.metadata['formation.style'])?option.layout.entities.filter(e=>e.team===1&&e.id.startsWith(`${option.layout!.id}-1-`)).length:option.layout.entities.length/2} per team · fits`:'does not fit'}{option.routeSummary&&<span className="field-help formation-option-clearance" style={{display:'block',color:option.routeSummary.blocked?'#ff8989':option.routeSummary.tight?'#ffd16b':undefined}}>{option.routeSummary.unavailable??`${option.routeSummary.routes} sampled approaches · ${option.routeSummary.blocked} blocked · ${option.routeSummary.tight} tight · 80 u vehicle`}</span>}{option.layout?.metadata['formation.adaptation']&&<span className="field-help" style={{display:'block'}}>{JSON.parse(option.layout.metadata['formation.adaptation']).filter((s:{dx:number;dy:number})=>s.dx||s.dy).length} yards repositioned</span>}</button>)}</fieldset>}
                  <button type="button" disabled={!!creativeDraft.favoriteId} onClick={()=>{setCreativeCandidate(undefined);setCreativeDraft({...creativeDraft,seed:createId('seed')});}}>Reroll seed</button>
                  <button type="button" disabled={!creativeCandidate || creativeCandidate.source!==project || creativeCandidate.draft!==creativeDraft} onClick={()=>{
                    if(!creativeCandidate || creativeCandidate.source!==project || creativeCandidate.draft!==creativeDraft)return;
                    const {layout}=creativeCandidate;
                    mutate(draft=>{draft.baseLayouts.push(layout);activateBaseLayout(draft,layout.id);},true,'base');
                    setCreativeDraft(undefined);setCreativeCandidate(undefined);
                    setNotice({tone:'ready',text:`${layout.name} added. Previous layouts preserved.`});
                  }}>Apply formation</button>
                  <button type="button" onClick={()=>{setCreativeDraft(undefined);setCreativeCandidate(undefined);}}>Cancel preview</button>
                </div>}
                <details className="layout-help"><summary>About layouts</summary>{activeLayout?.metadata['formation.style'] && (
                  <p className="field-help" style={{ overflowWrap: 'anywhere' }}>
                    <strong>{activeLayout.name}</strong><br />
                    {CREATIVE_BASE_LAYOUTS.find(preset => preset.id === activeLayout.metadata['formation.style'])?.description}
                  </p>
                )}
                <p className="field-help">Layouts share this terrain but hold separate building arrangements. Choose a style to preview a new layout; Apply keeps your existing layouts. Bases need enough level space.</p></details>
                {activeLayout && (
                  <div className="layout-controls">
                    <label className="layout-name-field">
                      <span>LAYOUT NAME</span>
                      <input
                        aria-label="Base layout name"
                        onChange={(event) => mutate((draft) => {
                          const layout = draft.baseLayouts.find((candidate) => candidate.id === draft.activeBaseLayoutId);
                          if (layout) layout.name = event.target.value;
                        }, false, 'base')}
                        value={activeLayout.name}
                      />
                    </label>
                    <div className="layout-actions">
                      <button onClick={() => addBaseLayout(false)} type="button"><Plus /> New empty</button>
                      <button onClick={() => addBaseLayout(true)} type="button">Duplicate</button>
                      <button aria-label="Delete active base layout" disabled={project.baseLayouts.length === 1} onClick={deleteActiveBaseLayout} title="Delete active layout" type="button"><Trash2 /></button>
                    </div>
                    <details className="layout-advanced"><summary>Advanced layout data</summary>
                    <label className="layout-metadata-field">
                      <span>METADATA · ONE KEY=VALUE PER LINE</span>
                      <textarea
                        aria-label="Base layout metadata"
                        defaultValue={Object.entries(activeLayout.metadata).map(([key, value]) => `${key}=${value}`).join('\n')}
                        key={`${activeLayout.id}:${JSON.stringify(activeLayout.metadata)}`}
                        onChange={() => markDirty('base')}
                        onBlur={(event) => applyLayoutMetadata(event.target.value)}
                        placeholder={'mode=competitive\nweather=clear'}
                        ref={layoutMetadataRef}
                        rows={3}
                      />
                    </label>
                    <button
                      className="layout-apply-metadata"
                      onClick={() => applyLayoutMetadata(layoutMetadataRef.current?.value ?? '')}
                      onMouseDown={(event) => event.preventDefault()}
                      type="button"
                    >Apply metadata</button>
                    </details>
                    
                  </div>
                )}
              </section>
              <section className="panel-section">
                <div className="section-heading"><p className="section-label">BUILD TEAM</p><span>STATE {team}</span></div>
                <div className="team-switch">
                  <button className={team === 0 ? 'team-neutral active' : 'team-neutral'} onClick={() => setTeam(0)} type="button">NEUTRAL</button>
                  <button className={team === 1 ? 'team-one active' : 'team-one'} onClick={() => setTeam(1)} type="button">TEAM 1</button>
                  <button className={team === 2 ? 'team-two active' : 'team-two'} onClick={() => setTeam(2)} type="button">TEAM 2</button>
                </div>
                <div className="placement-height-control">
                  <RangeField label="Default placement height" max={2} min={0} onChange={setPlacementHeight} step={0.05} suffix="u" value={placementHeight} />
                  <div aria-hidden="true" className="placement-height-scale">
                    <span>0u</span>
                    <span>0.5u</span>
                    <span>1u</span>
                    <span>1.5u</span>
                    <span>2u</span>
                  </div>
                  <p className="field-help">Extra clearance above terrain contact for previews, new placements, templates, and terrain-tuned moves.</p>
                </div>
              </section>
              <section className="panel-section template-library">
                <div className="section-heading"><p className="section-label">BASE TEMPLATES</p><span>{baseTemplates.templates.length}</span></div>
                <select
                  aria-label="Base template"
                  className="template-select"
                  onChange={(event) => {
                    const templateId = event.target.value || undefined;
                    setSelectedTemplateId(templateId);
                    if (templateId) setSelectedPlacementKey('');
                    setSelectedEntityId(undefined);
                  }}
                  value={selectedTemplateId ?? ''}
                >
                  <option value="">Choose a base template…</option>
                  {baseTemplates.templates.map((template) => (
                    <option key={template.id} value={template.id}>{template.name} · {template.unitCount} units</option>
                  ))}
                  <optgroup label="My districts">{formationFavorites.filter(f=>f.kind==='district').map(f=><option key={f.id} value={f.id}>{f.name} · {f.template.unitCount} units</option>)}</optgroup>
                </select>
                {selectedTemplate && (
                  <div className="template-controls">
                    {selectedTemplate.id.startsWith('forge-advanced-') && <p className="field-help">{selectedTemplate.description}</p>}
                    <BaseTemplatePreview manifest={manifest} scale={templateScale} team={team} template={selectedTemplate} yawDegrees={templateYaw} />
                    <div className="template-summary">
                      <span><strong>{selectedTemplate.units.filter((unit) => hasModelForEntity({ token: unit.token, subtype: unit.subtype, team }, manifest)).length}</strong> modeled units</span>
                      <span>{Math.round(selectedTemplate.footprint.width)} × {Math.round(selectedTemplate.footprint.height)} u</span>
                    </div>
                    <RangeField label="Footprint scale" max={1.5} min={0.5} onChange={setTemplateScale} step={0.05} suffix="×" value={templateScale} />
                    <RangeField label="Formation yaw" max={360} min={0} onChange={setTemplateYaw} step={5} suffix="°" value={templateYaw} />
                    <div className="rotation-presets template-rotation-presets">
                      {[0, 90, 180, 270].map((degrees) => <button key={degrees} onClick={() => setTemplateYaw(degrees)} type="button">{degrees}°</button>)}
                    </div>
                    <p className="field-help">Click terrain to place. Every surviving model clears its full rendered underside and slope footprint. Shift-drag an existing unit to pick it up and retune it.</p>
                  </div>
                )}
              </section>
              <section className="catalog-list">
                {(['infrastructure', 'defense', 'support', 'logistics'] as const).map((category) => (
                  <div className="catalog-group" key={category}>
                    <p className="section-label">{category.toUpperCase()}</p>
                    {placeableCatalog.filter((item) => item.category === category).map((item) => (
                      <button
                        className={!selectedTemplate && selectedPlacementKey === item.key ? 'catalog-item active' : 'catalog-item'}
                        key={item.key}
                        onClick={() => { setSelectedPlacementKey(item.key); setSelectedTemplateId(undefined); setSelectedEntityId(undefined); }}
                        type="button"
                      >
                        <span className={`catalog-glyph team-${team}`}>{item.shortLabel}</span>
                        <span><strong>{item.label}</strong><small>{item.description}</small></span>
                        {item.requiresPower && <i title="Requires power">⚡</i>}
                      </button>
                    ))}
                  </div>
                ))}
              </section>
            </>
          )}
        </aside>

        <section className="stage-column">
          <div className="stage-toolbar">
            <div className="history-controls">
              <Button aria-label="Undo" disabled={!undoStack.length} onClick={undo} size="icon-sm" variant="ghost"><Undo2 /></Button>
              <Button aria-label="Redo" disabled={!redoStack.length} onClick={redo} size="icon-sm" variant="ghost"><Redo2 /></Button>
              <span className="toolbar-rule" />
              {mode === 'terrain' ? <Mountain /> : <Box />}
              <span>{modeLabel}</span>
            </div>
            <details
              className={`repository-controls ${repositoryCatalog ? 'online' : 'offline'}`}
              title={repositoryCatalog
                ? `${repositoryCatalog.repository} · ${repositoryCatalog.branch} · ${repositoryCatalog.changes} uncommitted map change(s)`
                : 'Start the editor with npm run dev to enable the loopback maps service.'}
            >
              <summary>Repository</summary><div className="repository-actions">
              <p className="field-help">{repositoryCatalog ? `${repositoryCatalog.branch} · ${repositoryCatalog.changes} uncommitted changes` : 'Maps service unavailable'}</p>
              <select
                aria-label="Repository map"
                disabled={!repositoryCatalog || repositoryBusy}
                onChange={(event) => setRepositorySlug(event.target.value)}
                value={repositoryCatalog ? repositorySlug : ''}
              >
                <option value="">{repositoryCatalog ? 'New repository map…' : repositoryChecked ? 'Maps service offline' : 'Checking maps…'}</option>
                {repositoryCatalog?.maps.map((map) => <option key={map.slug} value={map.slug}>{map.name} · {map.slug}</option>)}
              </select>
              <button aria-label="Repository setup and diagnostics" disabled={repositoryBusy} onClick={openRepositoryWizard} title="Repository setup, branches, and diagnostics" type="button"><Settings2 /><span>Setup and diagnostics</span></button>
              <button aria-label="Refresh repository maps" disabled={repositoryBusy} onClick={() => void refreshRepository(true)} title="Refresh repository maps" type="button"><RefreshCw /><span>Refresh maps</span></button>
              <button disabled={!repositoryCatalog || !repositorySlug || repositoryBusy} onClick={() => void loadRepositorySelection()} title="Load selected Git source" type="button"><FolderOpen /><span>Load</span></button>
              <button disabled={!repositoryCatalog || repositoryBusy} onClick={() => void saveRepositorySelection(false)} title={mode === 'base' ? 'Save base layouts only; do not write terrain or map metadata' : 'Save terrain only; preserve base layouts'} type="button"><Save /><span>{mode === 'base' ? 'Save layouts' : 'Save terrain'}</span></button>
              <button disabled={!repositoryCatalog || repositoryBusy} onClick={() => void saveRepositorySelection(true)} title={`Save ${mode === 'base' ? 'base layouts' : 'terrain'}, commit to a feature branch, push, and open a PR into main`} type="button"><Upload /><span>Publish PR</span></button>
              <p className="field-help">{mode === 'base' ? 'Saves base layouts only.' : 'Saves terrain only.'} Publish PR also commits, pushes and opens a pull request.</p>
              </div></details>
            <div className="stage-stats">
              <span>{project.terrain.width} × {project.terrain.height}</span>
              <span>{project.terrain.worldWidth.toLocaleString()} × {project.terrain.worldHeight.toLocaleString()} u</span>
              <span>{(creativePreviewLayout?.entities??project.entities).filter((entity) => entity.token !== '*').length} units{creativePreviewLayout?' · PREVIEW':''}</span>
              <Button aria-label="Toggle terrain grid" className={showGrid ? 'grid-active' : ''} onClick={() => setShowGrid((value) => !value)} size="icon-sm" variant="ghost"><Grid3X3 /></Button>
            </div>
          </div>
          {drawingSelection?<output className="composition-preview-banner">Draw brush selection · drag across the terrain · release to select · Escape cancels · terrain edits paused</output>:composingTerrain?<output className="composition-preview-banner">{activeComposition?(compositionPreview?.original?'Original terrain · Show proposed terrain to return':'Composition preview · Apply or cancel in Compose several landforms'):'Composition editing · Preview to inspect the combined terrain'} · terrain clicks paused</output>:<OperationScope context={{mode,tool:terrainTool,lanePreview:!!lanePreview.project,mirror:!!stampSettings.mirror,inspection:inspectionMode,creative:!!creativeDraft,placement:!!activePlacementKey,layoutName:activeLayout?.name??'Active layout',dialog:balancedDialogOpen||baseDesignerOpen||heightmapDialogOpen||terrainDetailOpen||terrainStampOpen,blocked:stampGuard.error||(stampGhost?.blocked?stampGhost.message:undefined)}}/>}
          <TerrainViewport
            buildAreas={mode === 'terrain' ? [...(displayOptions.overlays&&displayOptions.areas?project.baseLayouts.flatMap(layout=>getBuildAreaOutlines(layout.metadata[BUILD_AREAS_KEY]).filter(area=>area.kind==='terrain')):[]), ...(terrainTool !== 'landform' && (selectionDraft??terrainSelection) && !terrainSelectionError((selectionDraft??terrainSelection)!, project.terrain) ? [{ ...(selectionDraft??terrainSelection)!, id: 'brush-selection', name: 'Brush selection', kind: 'boundary' as const, team: 'all' as const }] : [])] : displayOptions.overlays&&displayOptions.areas?activeAuthoredPreview?getBuildAreaOutlines(activeAuthoredPreview.project.baseLayouts.find(l=>l.id===activeAuthoredPreview.project.activeBaseLayoutId)?.metadata[BUILD_AREAS_KEY]):buildAreaOutlines:undefined}
            routeCameraRequest={routeCameraRequest}
            routePath={displayOptions.overlays&&showAccessPaths&&displayOptions.routes?routePath:[]}
            routeMarkers={displayOptions.overlays&&displayOptions.markers&&displayOptions.routes?routeMarkers:[]}
            onRouteMarker={marker=>{pauseRoute();const z=sampleHeight(project.terrain,marker.x,marker.y)+15;routeCamera({eye:[marker.x,marker.y+1,z+500],target:[marker.x,marker.y,z]});}}
            onManualCamera={pauseRoute}
            onInspectionPoint={activeInspectionSketch?.drawing?(x,y)=>setInspectionSketch(current=>{
              if(!current||current.source!==routeProject||!current.drawing||current.points.length>=32||!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>current.source.terrain.worldWidth||y>current.source.terrain.worldHeight)return current;
              if(current.points.some(p=>Math.hypot(p[0]-x,p[1]-y)<1))return current;
              return {...current,points:[...current.points,[x,y]]};
            }):undefined}
            inspection={{enabled:inspectionMode&&mode==='base',selectedId:inspected?.id,onSelect:setInspectedId,showLinks:displayOptions.links,showHighlights:displayOptions.overlays}}
            baseCameraRequest={baseCameraRequest}
            backupRadius={project.validation.backupRadius}
            brushRadius={drawingSelection||terrainTool==='lane'?0:brushRadius}
            brushShape={brushShape}
            entities={creativeDraft||activeAuthoredPreview ? [] : project.entities}
            powerTint={displayOptions.overlays&&powerTint}
            powerIcons={displayOptions.overlays&&powerIcons}
            coverage={displayOptions.overlays?coverage:{power:false,darklight:false,turrets:false}}
            baseBoundary={creativeDraft&&displayOptions.overlays ? {x:creativeDraft.placement.x,y:creativeDraft.placement.y,radius:creativeDraft.placement.radius,showCircle:displayOptions.boundaries,entranceDegrees:displayOptions.entrances?creativeDraft.placement.entranceDegrees:undefined} : undefined}
            onBaseAnchor={creativeDraft&&!inspectionMode?(x,y,commit)=>{
              const draft={...creativeDraft,placement:{...creativeDraft.placement,x,y}};
              setCreativeDraft(draft);setCreativeCandidate(undefined);
              if(commit)previewCreativeDraft(draft);
            }:undefined}
            accessOverlay={displayOptions.overlays&&showAccessPaths&&creativeDraft ? creativeDiagnostics?.draft===creativeDraft&&creativeDiagnostics.source===project?creativeDiagnostics.overlay:creativePreviewLayout?.metadata['formation.access']?JSON.parse(creativePreviewLayout.metadata['formation.access']):undefined:undefined}
            manifest={manifest}
            mode={mode}
            onCursor={updateCursor}
            onMoveEntity={moveEntity}
            onPlace={activeAuthoredPreview?()=>{}:placeUnit}
            resolveEntityMove={resolveEntityMove}
            onSelectEntity={id=>{setBaseInspectorPage('build');setSelectedEntityId(id);}}
            lanePathControls={mode==='terrain'&&terrainTool==='lane'&&laneSource===project?{points:laneOptions.points,bend:laneOptions.bend??0,disabled:drawingLane,onEdit:onLaneHandleEdit}:undefined}
            onTerrainStroke={composingTerrain?()=>{}:onTerrainStroke}
            onRotateStamp={composingTerrain?()=>{}:rotateStamp}
            stampSurface={terrainTool==='lane'?lanePreview.project?.terrain:composingTerrain?undefined:stampGhost?.surface}
            stampError={composingTerrain?undefined:stampGuard.error ?? (stampGhost?.blocked ? stampGhost.message : undefined)}
            stampGhost={!composingTerrain&&stampGhost?.heights && stampGhost.changed ? { heights: stampGhost.heights, changed: stampGhost.changed, blocked: stampGhost.blocked } : undefined}
            stampProtected={!composingTerrain && mode === 'terrain' && terrainTool === 'landform' && showStampProtection ? stampGuard.protection?.mask : undefined}
            onTransformEntity={transformEntity}
            placementPreview={activeAuthoredPreview?activeAuthoredPreview.project.entities:creativeDraft ? creativeCandidate?.draft === creativeDraft && creativeCandidate.source === project ? creativeCandidate.layout.entities : [] : placementPreview}
            placementPreviewStyle={activeAuthoredPreview?'original':'ghost'}
            placementPreviewAnchor={activeAuthoredPreview||creativeDraft ? undefined : cursor ? [cursor[0], cursor[1]] : undefined}
            selectedEntityId={creativeDraft ? undefined : selectedEntityId}
            selectedEntityIds={mode==='base'&&!creativeDraft&&districtSelectedIds.length?districtSelectedIds:undefined}
            selectedPlacementKey={activeAuthoredPreview||creativeDraft ? '' : activePlacementKey}
            serviceRadius={activeAuthoredPreview?activeAuthoredPreview.project.validation.serviceRadius:creativeDraft ? Math.min(project.validation.serviceRadius,280) : project.validation.serviceRadius}
            showGrid={showGrid}
            terrain={activeComposition&&!compositionPreview?.original?activeComposition.project.terrain:project.terrain}
            terrainTool={terrainTool}
            transformMode={modelTransformMode}
          />
          <footer className={`statusbar ${notice.tone}`}>
            <span>{notice.tone === 'error' ? <AlertTriangle /> : notice.tone === 'working' ? <CircleDot /> : <CheckCircle2 />}{notice.text}</span>
            {lastPullRequestUrl && <a className="pull-request-link" href={lastPullRequestUrl} rel="noreferrer" target="_blank">Open PR <ExternalLink /></a>}
            {cursor && <span className="cursor-position">X {cursor[0].toFixed(1)} · Y {cursor[1].toFixed(1)} · Z {cursor[2].toFixed(1)}</span>}
            <span className="format-state">GIT SOURCE + WULFRAM PACKAGE</span>
          </footer>
        </section>

        <aside className="inspector">
          {mode==='base'&&<nav className="inspector-pages" aria-label="Base inspector sections">
            <button type="button" aria-pressed={!inspectionMode&&baseInspectorPage==='build'} onClick={()=>{pauseRoute();setInspectionMode(false);setBaseInspectorPage('build');}}>Build</button>
            <button type="button" aria-pressed={inspectionMode} onClick={()=>{pauseRoute();setInspectionMode(true);setSelectedEntityId(undefined);}}>Inspect</button>
            <button type="button" aria-pressed={!inspectionMode&&baseInspectorPage==='rules'} onClick={()=>{pauseRoute();setInspectionMode(false);setBaseInspectorPage('rules');}}>Rules</button>
          </nav>}
          <div data-inspector-page="build" hidden={mode==='base'&&(inspectionMode||baseInspectorPage!=='build')}>
          {mode==='base'&&selectedEntity&&<div className="selected-building-controls">
            <>
              <div className="inspector-heading">
                <span>SELECTED UNIT</span>
                <h2>{catalogFor(selectedEntity)?.label ?? ENTITY_NAMES[selectedEntity.token] ?? selectedEntity.token}</h2>
                <Badge className={selectedEntity.team === 0 ? 'badge-team-neutral' : selectedEntity.team === 2 ? 'badge-team-two' : 'badge-team-one'}>{selectedEntity.team === 0 ? 'NEUTRAL' : `TEAM ${selectedEntity.team}`}</Badge>
              </div>
              <section className="inspector-block">
                <p className="section-label">POSITION</p>
                <div className="number-grid three">
                  {(['X', 'Y', 'Z'] as const).map((label, index) => (
                    <NumberField disabled={selectedTransformLocked && index === 2} key={label} label={label} onChange={(value) => updateSelected((entity) => {
                      if (hasLockedAltitudeAndRotation(entity) && index === 2) return;
                      entity.position[index] = value;
                      if (index !== 2 && usesFootprintTerrainSnap(entity.token)) conformEntityToTerrain(entity, project.terrain);
                    })} step={0.1} value={selectedEntity.position[index]} />
                  ))}
                </div>
                <button className="secondary-action" disabled={selectedTransformLocked} onClick={() => updateSelected((entity) => conformEntityToTerrain(entity, project.terrain))} type="button"><Mountain /> {selectedTransformLocked ? 'Starship altitude locked' : 'Snap and conform to footprint'}</button>
              </section>
              <section className="inspector-block transform-tool-controls">
                <p className="section-label">CTRL 3D TRANSFORM</p>
                <div className="brush-option-buttons">
                  <button className={modelTransformMode === 'translate' || selectedTransformLocked ? 'active' : ''} onClick={() => setModelTransformMode('translate')} type="button">{selectedTransformLocked ? 'Move XY' : 'Move XYZ'}</button>
                  <button className={modelTransformMode === 'rotate' && !selectedTransformLocked ? 'active' : ''} disabled={selectedTransformLocked} onClick={() => setModelTransformMode('rotate')} type="button">Pitch / Roll / Yaw</button>
                </div>
                <p className="field-help">{selectedTransformLocked ? 'Starships move only in X/Y. Their absolute Z, pitch, roll, and yaw remain locked.' : 'Hold Ctrl in the viewport to reveal standard 3D handles. Move is free on all three axes; Rotate edits pitch, roll, and yaw. One drag creates one undo step.'}</p>
              </section>
              {!selectedTransformLocked && <section className="inspector-block">
                <RangeField
                  label="Yaw"
                  max={360}
                  min={0}
                  onChange={(degrees) => updateSelected((entity) => {
                    entity.rotation[2] = degrees * Math.PI / 180;
                    if (usesFootprintTerrainSnap(entity.token)) conformEntityToTerrain(entity, project.terrain);
                  }, false)}
                  suffix="°"
                  value={(selectedEntity.rotation[2] * 180 / Math.PI + 360) % 360}
                />
                <div className="rotation-presets">
                  {[0, 45, 90, 180, 270].map((degrees) => <button key={degrees} onClick={() => updateSelected((entity) => {
                    entity.rotation[2] = degrees * Math.PI / 180;
                    if (usesFootprintTerrainSnap(entity.token)) conformEntityToTerrain(entity, project.terrain);
                  })} type="button">{degrees}°</button>)}
                </div>
                <div className="number-grid two">
                  <NumberField label="Pitch rad" onChange={(value) => updateSelected((entity) => { entity.rotation[0] = value; })} step={0.001} value={selectedEntity.rotation[0]} />
                  <NumberField label="Roll rad" onChange={(value) => updateSelected((entity) => { entity.rotation[1] = value; })} step={0.001} value={selectedEntity.rotation[1]} />
                </div>
              </section>}
              <section className="inspector-block">
                <label className="toggle-row"><span><strong>Active on load</strong><small>Original state flag</small></span><input aria-label="Active on load" checked={Boolean(selectedEntity.active)} onChange={(event) => updateSelected((entity) => { entity.active = event.target.checked ? 1 : 0; })} type="checkbox" /></label>
                <button className="danger-action" onClick={() => {
                  mutate((draft) => { draft.entities = draft.entities.filter((entity) => entity.id !== selectedEntity.id); });
                  setSelectedEntityId(undefined);
                }} type="button"><Trash2 /> Delete unit</button>
              </section>
              <section className="inspector-block validation-list">
                <div className="section-heading"><p className="section-label">PLACEMENT CHECKS</p><span>{selectedIssues.length ? `${selectedIssues.length} issue${selectedIssues.length === 1 ? '' : 's'}` : 'VALID'}</span></div>
                <p className="slope-readout">Ground slope: {sampleSlopeDegrees(project.terrain, selectedEntity.position[0], selectedEntity.position[1]).toFixed(1)}°</p>
                {selectedIssues.length ? selectedIssues.map((issue) => (
                  <div className={`validation-item ${issue.severity}`} key={`${issue.code}-${issue.message}`}>
                    {issue.severity === 'error' ? <AlertTriangle /> : <CircleDot />}<span>{issue.message}</span>
                  </div>
                )) : <div className="validation-item valid"><CheckCircle2 /><span>Bounds, slope, spacing, and power checks pass.</span></div>}
              </section>
            </>

          </div>}
          {mode==='base'&&!creativeDraft&&<AuthoredBasePanel key={authoredSelection?.serial??'manual'} initialPack={authoredSelection?.base} project={project} manifest={manifest} onPreview={setAuthoredPreview} onFocus={(proposal,team,view,entityId)=>{if(proposal.source!==project)throw new Error('Map changed. Preview again.');const entities=entityId?proposal.project.entities.filter(e=>e.id===entityId):proposal.project.entities;if(!entities.length)throw new Error('Preview building is missing. Preview again.');setBaseCameraRequest({serial:Date.now(),team,view,entities});}} onApply={proposal=>{
            if(proposal.source!==project)throw new Error('Map changed. Preview again.');
            assertEditorConstraints(project,proposal.project,manifest);pushHistory(structuredClone(project));markDirty('base');setProject(proposal.project);setAuthoredPreview(undefined);setSelectedEntityId(undefined);
          }}/>}
          {mode === 'base' && !creativeDraft && <BaseDistrictPanel key={project.activeBaseLayoutId} entities={project.entities} selected={districtSelectedIds} onSaveModule={name=>{
            if(formationFavorites.length>=50)throw new Error('Personal library is full (50 entries).');
            const savedModule=districtModuleFromSelection(project,districtSelectedIds,name,createId('district-module'),manifest);
            const next=[...formationFavorites,savedModule];localStorage.setItem('forge-formation-favorites-v1',JSON.stringify(next));setFormationFavorites(next);
          }} focusedId={selectedEntityId} raw={activeLayout?.metadata[DISTRICTS_KEY]} onSelect={ids=>{setDistrictSelection({layoutId:project.activeBaseLayoutId,ids});setSelectedTemplateId(undefined);setSelectedPlacementKey('');setInspectionMode(false);pauseRoute();}} onTransform={operation=>{
            const result=transformDistrict(project.entities,districtSelectedIds,operation,project.terrain.worldWidth,project.terrain.worldHeight,hasLockedAltitudeAndRotation,e=>conformEntityToTerrain(e,project.terrain),()=>createId('district-unit'));
            assertEditorConstraints(project,{...project,entities:result.entities},manifest);
            mutate(draft=>{draft.entities=result.entities;},true,'base');
            setDistrictSelection({layoutId:project.activeBaseLayoutId,ids:result.selectedIds});setSelectedEntityId(undefined);pauseRoute();
          }} onSave={(groups,allowUnlock)=>{
            validateDistrictUpdate(readDistricts(activeLayout?.metadata[DISTRICTS_KEY]),groups,project.entities);
            const proposed=cloneProject(project);const target=proposed.baseLayouts.find(l=>l.id===proposed.activeBaseLayoutId);if(target)target.metadata[DISTRICTS_KEY]=JSON.stringify(groups);
            assertEditorConstraints(project,proposed,manifest,allowUnlock);
            mutate(draft=>{const layout=draft.baseLayouts.find(l=>l.id===draft.activeBaseLayoutId);if(layout)layout.metadata[DISTRICTS_KEY]=JSON.stringify(groups);},true,'base',allowUnlock);
          }} />}
          {mode === 'terrain' ? (
            <>
              <div className="inspector-heading">
                <span>INSPECTOR</span>
                <h2>{TERRAIN_TOOL_LABELS[terrainTool]} brush</h2>
                <Badge variant="secondary">TERRAIN</Badge>
              </div>
              {terrainTool==='landform'&&<TerrainCompositionPanel onEditingChange={setCompositionEditing} project={project} manifest={manifest} settings={stampSettings} onPreview={(proposal,original)=>{setCompositionPreview(proposal?{source:project,proposal,original}:undefined);setNotice({tone:'ready',text:proposal?'COMPOSITION PREVIEW — terrain clicks paused. Apply or cancel in Compose several landforms.':'Composition preview cleared.'});}} onApply={(source,proposal)=>{
                if(source!==project)throw new Error('Map changed. Preview the composition again.');
                assertEditorConstraints(project,proposal.project,manifest);pushHistory(cloneProject(project));markDirty('both');setProject(proposal.project);setCompositionPreview(undefined);
              }}/>}
              {terrainTool === 'landform' && <TerrainStampPanel textures={Object.keys(manifest.terrainTextures).filter(name => /^(sandrock|marsrock|rockwall|1snow|4snow|11ice|8ice)\d{3}$/.test(name) && terrainTemplateFamily(name) !== undefined).sort()} options={stampSettings} onChange={change => setStampSettings(s => ({ ...s, ...change }))} safe={stampSafe} setSafe={setStampSafe} showProtected={showStampProtection} setShowProtected={setShowStampProtection} message={stampGhost?.message ?? stampGuard.error ?? 'Hover over the terrain to preview a stamp.'} />}
              {terrainTool === 'stamp' && (
                <section className="inspector-block height-stamp-controls">
                  <p className="section-label">EXACT HEIGHT</p>
                  <NumberField label="Target terrain height" max={5000} min={-5000} onChange={setTerrainTargetHeight} step={0.25} value={terrainTargetHeight} />
                  <div className="height-stamp-actions">
                    <button onClick={() => setTerrainTargetHeight((height) => height - 10)} type="button">−10</button>
                    <button disabled={lastTerrainHeight === undefined} onClick={() => { if (lastTerrainHeight !== undefined) setTerrainTargetHeight(lastTerrainHeight); }} type="button">Sample last cursor</button>
                    <button onClick={() => setTerrainTargetHeight((height) => height + 10)} type="button">+10</button>
                  </div>
                  <p className="field-help">At 100% strength with a Hard edge, all covered vertices are written to this exact height in one pass.</p>
                </section>
              )}
              {terrainTool === 'paint' && (
                <section className="inspector-block selected-texture">
                  <p className="section-label">PAINT MATERIAL</p>
                  <img alt={selectedTexture} src={manifest.terrainTextures[selectedTexture]?.url} />
                  <div><strong>{selectedTexture}</strong><small>Direct tagmap2 entry · original palette</small></div>
                </section>
              )}
              {terrainTool==='lane'&&<TerrainLanePanel options={laneOptions} onChange={change=>setLaneOptions(o=>({...o,...change}))} drawing={drawingLane||editingLaneHandle} onDraw={()=>{setLaneSource(project);setLaneOptions(o=>({...o,points:[]}));laneGesture.current={source:project};setDrawingLane(true);}} onCancel={cancelLane} canApply={!!lanePreview.project&&lanePreview.source===project} message={lanePreview.error??(lanePreview.changed?`${lanePreview.changed} vertices · preview only`:'Draw a lane to begin.')} onApply={()=>{
                if(!manifest||laneSource!==project)return;
                try{const result=applyTerrainLane(project,laneOptions,manifest);mutate(draft=>Object.assign(draft,result.project),true,'both');cancelLane();setNotice({tone:'ready',text:'Lane applied. Undo restores the previous terrain.'});}catch(error){setNotice({tone:'error',text:error instanceof Error?error.message:'Lane blocked.'});}
              }}/> }
              {terrainTool !== 'landform' && terrainTool !== 'lane' && <section className="inspector-block" aria-label="Terrain brush settings">
                <RangeField label="Radius / half-size" max={600} min={25} onChange={setBrushRadius} step={5} suffix=" u" value={brushRadius} />
                <RangeField label="Strength" max={100} min={1} onChange={setBrushStrength} suffix="%" value={brushStrength} />
                <fieldset className="brush-option-group">
                  <legend>FOOTPRINT</legend>
                  <div className="brush-option-buttons">
                    {(['round', 'square', 'diamond'] as const).map((shape) => (
                      <button className={brushShape === shape ? 'active' : ''} key={shape} onClick={() => setBrushShape(shape)} type="button">{shape}</button>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="brush-option-group">
                  <legend>EDGE PROFILE</legend>
                  <div className="brush-option-buttons">
                    {(['soft', 'linear', 'hard'] as const).map((falloff) => (
                      <button className={brushFalloff === falloff ? 'active' : ''} key={falloff} onClick={() => setBrushFalloff(falloff)} type="button">{falloff}</button>
                    ))}
                  </div>
                </fieldset>
                <button
                  className="secondary-action flat-pad-preset"
                  onClick={() => {
                    setTerrainTool('level');
                    setBrushShape('square');
                    setBrushFalloff('hard');
                    setBrushStrength(100);
                    setNotice({ tone: 'ready', text: 'Flat-pad preset ready · click the terrain height the square should match' });
                  }}
                  type="button"
                ><Grid3X3 /> Flat pad preset</button>
                <div className={`brush-profile ${brushShape} ${brushFalloff}`}><span /><span /><span /></div>
                <p className="field-help">Square + Hard covers every vertex evenly: Raise/Lower moves a flat pad without doming, Flatten copies the first clicked height, and Set height targets an exact value. Texture IDs remain exact pixels.</p>
                <details className="terrain-selection-panel">
                  <summary>Brush selection{terrainSelection ? " · active" : " · whole map"}</summary>
                  <p className="field-help">Limit manual height and texture brushes to the blue rectangle. Landforms and compositions use their own placement controls. Selection is temporary and is not saved with the map.</p>
                  <button type="button" disabled={drawingSelection} onClick={()=>{selectionGesture.current={source:project};setSelectionDraft(undefined);setDrawingSelection(true);}}>Draw brush selection</button>
                  {drawingSelection&&<button type="button" onClick={cancelSelectionDrawing}>Cancel selection drawing</button>}
                  {!terrainSelection ? <button type="button" disabled={drawingSelection} onClick={() => setTerrainSelection({ x: project.terrain.worldWidth / 4, y: project.terrain.worldHeight / 4, width: project.terrain.worldWidth / 2, height: project.terrain.worldHeight / 2 })}>Select center region</button> : <>
                    {(['x', 'y', 'width', 'height'] as const).map(key => <NumberField key={key} label={`Selection ${key}`} disabled={drawingSelection} min={key === 'x' || key === 'y' ? 0 : 1} step={25} value={terrainSelection[key]} onChange={value => setTerrainSelection(current => current ? { ...current, [key]: value } : current)} />)}
                    <button type="button" disabled={drawingSelection} onClick={() => setTerrainSelection(undefined)}>Clear brush selection</button>
                    <button type="button" disabled={drawingSelection||!!terrainSelectionError(terrainSelection,project.terrain)||!activeLayout} onClick={()=>{
                      try{
                        if(!terrainSelection||!activeLayout)return;
                        const error=terrainSelectionError(terrainSelection,project.terrain);if(error)throw new Error(error);
                        const areas=readBuildAreas(activeLayout.metadata[BUILD_AREAS_KEY]);
                        const area:BuildArea={...terrainSelection,id:createId('terrain-protection'),name:`Protected terrain ${areas.filter(a=>a.kind==='terrain').length+1}`,kind:'terrain',team:'all'};
                        const next=withBuildAreas(project,[...areas,area],manifest);
                        mutate(draft=>Object.assign(draft,next),true,'base',false,true);
                        setNotice({tone:'ready',text:`${area.name} saved with ${activeLayout.name}. Heights are protected across layouts; textures remain editable. Undo removes this rule.`});
                      }catch(error){setNotice({tone:'error',text:error instanceof Error?error.message:'Could not protect this region.'});}
                    }}>Protect selected heights</button>
                    <p className="field-help">Protection is saved with the layout and covers shared terrain heights. Texture painting stays available.</p>
                    <button type="button" onClick={()=>{pauseRoute();setMode('base');setInspectionMode(false);setBaseInspectorPage('rules');setNavigationTarget({selector:'.build-area-panel',label:'Protected areas',resolve:message=>setNotice({tone:'ready',text:message})});}}>Edit protected areas</button>
                    <output className="field-help">{terrainSelectionError(terrainSelection, project.terrain) ?? 'Selection active. Only vertices whose neighboring cells fit fully inside are editable; very narrow selections may contain none. Existing outer map edges are preserved.'}</output>
                  </>}
                </details>
                <TerrainMeasurementPanel terrain={project.terrain} selection={terrainSelection}/>
              </section>
              }
              {terrainTool !== 'landform' && terrainTool !== 'lane' && <BrushLibraryPanel settings={{tool:terrainTool,radius:brushRadius,strength:brushStrength,shape:brushShape,falloff:brushFalloff,targetHeight:terrainTargetHeight,texture:selectedTexture}} onLoad={settings=>{
                if(!manifest.terrainTextures[settings.texture])throw new Error('This brush texture is unavailable in the loaded asset catalog. Controls were not changed.');
                setTerrainTool(settings.tool);setBrushRadius(settings.radius);setBrushStrength(settings.strength);setBrushShape(settings.shape);setBrushFalloff(settings.falloff);setTerrainTargetHeight(settings.targetHeight);setSelectedTexture(settings.texture);
              }}/>}
            </>
          ) : selectedEntity ? null : (
            <>
              <div className="inspector-heading">
                <span>{selectedTemplate ? 'BASE TEMPLATE' : 'BASE BUILDER'}</span>
                <h2>{selectedTemplate?.name ?? 'Build tools'}</h2>
                <Badge variant="secondary">{creativePreviewLayout?`${creativePreviewLayout.entities.length} PREVIEW UNITS`:selectedTemplate ? `${selectedTemplate.unitCount} UNIT TEMPLATE` : `${project.entities.filter((entity) => entity.token !== '*').length} UNITS`}</Badge>
              </div>
              {selectedTemplate && (
                <section className="inspector-block template-detail">
                  <div><span>Source</span><strong>{selectedTemplate.curated ? 'Curated' : selectedTemplate.sourceMap}</strong></div>
                  <div><span>Original team</span><strong>{selectedTemplate.sourceTeam}</strong></div>
                  <div><span>Footprint</span><strong>{Math.round(selectedTemplate.footprint.width)} × {Math.round(selectedTemplate.footprint.height)} u</strong></div>
                  {selectedTemplate.description && <p>{selectedTemplate.description}</p>}
                  <p>Placement remaps the formation to {team === 0 ? 'Neutral' : `Team ${team}`}, rotates and scales its XY offsets, then conforms modeled units to the destination terrain.</p>
                </section>
              )}
            </>
          )}
          </div>
          <div data-inspector-page="inspect" hidden={mode!=='base'||!inspectionMode}>
          {mode==='base'&&inspectionMode&&displayOptions.routes&&routeProject&&<details className="route-inspection-section" open={inspectionMode}><summary>Inspect routes</summary><RouteInspector project={routeProject} manifest={manifest} onCamera={routeCamera} onMarkers={setRouteMarkers} onRoute={setRoutePath} pauseToken={routePauseToken} sketch={{active:!!activeInspectionSketch,drawing:!!activeInspectionSketch?.drawing,points:activeInspectionSketch?.points??[],onStart:()=>{pauseRoute();setInspectionSketch({source:routeProject,points:[],drawing:true});},onFinish:()=>setInspectionSketch(s=>s?{...s,drawing:false}:s),onClear:()=>setInspectionSketch(undefined),onRemove:()=>setInspectionSketch(s=>s?{...s,points:s.points.slice(0,-1)}:s)}} /></details>}
          {mode==='base'&&<section className="inspector-block">
            <p className="section-label">BASE INSPECTION</p>
            <label className="field-help"><input type="checkbox" checked={inspectionMode} onChange={event=>{setInspectionMode(event.target.checked);setSelectedEntityId(undefined);setInspectedId(undefined);}} /> Inspect buildings (clicks do not place or move)</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginTop:10}}>{[1,2].flatMap(team=>(['overhead','ground'] as const).map(view=><button className="secondary-action" key={`${team}-${view}`} type="button" disabled={!inspectionEntities.some(e=>e.team===team)} onClick={()=>{setInspectionMode(true);setSelectedEntityId(undefined);setBaseCameraRequest({serial:Date.now(),team,view,entities:inspectionEntities});}}>Team {team} · {view==='ground'?'Ground level':'Overhead'}</button>))}</div>
            <p className="field-help">Focus enters inspection mode. Switch preview options to compare from the same camera position. Turn inspection off to drag a base again.</p>
            {inspectionMode&&<>
              <label className="field-help">Building<select className="template-select" aria-label="Inspect building" value={inspected?.id??''} onChange={event=>setInspectedId(event.target.value||undefined)}><option value="">Click a building or choose here</option>{inspectionEntities.filter(e=>e.token!=='*').map((e,i)=><option key={e.id} value={e.id}>Team {e.team} · {catalogFor(e)?.label??e.token} · {i+1}</option>)}</select></label>
              {inspected&&inspectedPower&&<div aria-live="polite" data-building-inspection>
                <strong>{catalogFor(inspected)?.label??inspected.token} · Team {inspected.team}</strong>
                <p>{inspectedPower.status==='powered'?'Powered':inspectedPower.status==='unpowered'?'No friendly power in range':'Does not require external power'}</p>
                {inspectedPower.status!=='independent'&&<p className="field-help">Checked reach: {inspectedPower.limit} u (service radius {inspectionRadius} u).</p>}
                {inspectedPower.sources.length>0?<p className="field-help">{inspectedPower.sources.length} friendly sources highlighted in cyan. Nearest: {inspectedPower.sources[0].distance.toFixed(1)} u.</p>:inspectedPower.nearest?<p className="field-help">Nearest friendly cell: {inspectedPower.nearest.distance.toFixed(1)} u, outside checked reach.</p>:inspectedPower.status==='unpowered'?<p className="field-help">No friendly power cells in this arrangement.</p>:null}
                <button className="secondary-action" type="button" onClick={()=>setBaseCameraRequest({serial:Date.now(),team:inspected.team,view:'overhead',entities:[inspected]})}>Focus building</button>
                <button className="secondary-action" type="button" onClick={()=>setBaseCameraRequest({serial:Date.now(),team:inspected.team,view:'detail',entities:[inspected]})}>Close building view</button>
                <p className="field-help">Close view frames the building model. Orbit or zoom to examine it; use Team Overhead to return to the base.</p>
                <p className="field-help">White ring: selected building. These are editor checks using the current layout rules; live server power remains unverified.</p>
              </div>}
            </>}
          </section>}
          </div>
          <div data-inspector-page="rules" hidden={mode!=='base'||inspectionMode||baseInspectorPage!=='rules'}>
          {mode==='base'&&!creativeDraft&&!inspectionMode&&baseInspectorPage==='rules'&&<EntranceRoutingPanel project={project} manifest={manifest} renderPreview={preview=><RouteInspector project={preview} manifest={manifest} onCamera={entrancePreviewCamera} onMarkers={setRouteMarkers} onRoute={setRoutePath} pauseToken={routePauseToken}/>} onApply={(source,next)=>{
            if(source!==project)throw new Error('Map changed. Preview entrances again.');
            mutate(draft=>{Object.assign(draft,next);},true,'base');
          }}/>} 
          {mode === 'base' && !creativeDraft && <BuildAreaPanel key={`area:${project.name}:${project.activeBaseLayoutId}:${project.terrain.worldWidth}:${project.terrain.worldHeight}`} raw={activeLayout?.metadata[BUILD_AREAS_KEY]} entities={project.entities} width={project.terrain.worldWidth} height={project.terrain.worldHeight} manifest={manifest} onPreview={area=>setAreaPreview(area&&activeLayout?{layout:activeLayout,area}:undefined)} onSave={areas=>{
            const next=withBuildAreas(project,areas,manifest);
            mutate(draft=>{Object.assign(draft,next);},true,'base',false,true);
          }} />}
          {mode === 'base' && !creativeDraft && <AuthoringProblemsPanel project={project} manifest={manifest} onOpen={section=>{
            const selector={areas:'.build-area-panel',districts:'.district-panel',relationships:'.district-relationships-panel',composition:'.composition-budget-panel'}[section];
            setBaseInspectorPage(section==='districts'?'build':'rules');setNavigationTarget({selector,label:section,resolve:message=>setNotice({tone:'ready',text:message})});
          }}/>}
          {mode === 'base' && !creativeDraft && <AuthoringRepairPanel key={`repair:${project.activeBaseLayoutId}`} project={project} manifest={manifest} onBackup={()=>downloadBlob(new Blob([JSON.stringify(project)],{type:'application/json'}),`${safeMapName(project.name)}-before-rule-repair.json`)} onApply={(source,draft)=>{
            if(source!==project)throw new Error('Map changed. Load current rules and preview again.');
            const repaired=previewAuthoringRepair(project,draft,manifest).project;
            pushHistory(cloneProject(project));markDirty('base');setProject(repaired);
          }}/>}
          {mode === 'base' && !creativeDraft && <CompositionBudgetPanel key={`composition:${project.activeBaseLayoutId}`} raw={activeLayout?.metadata[COMPOSITION_KEY]} entities={project.entities} onSave={rules=>{
            withCompositionBudgets(project,rules,manifest);
            mutate(draft=>{const layout=draft.baseLayouts.find(l=>l.id===draft.activeBaseLayoutId);if(layout)layout.metadata[COMPOSITION_KEY]=JSON.stringify(rules);},true,'base',false,false,false,true);
          }}/>}
          {mode === 'base' && !creativeDraft && <DistrictRelationshipsPanel key={`relationships:${project.activeBaseLayoutId}`} raw={activeLayout?.metadata[DISTRICT_RELATIONSHIPS_KEY]} groupsRaw={activeLayout?.metadata[DISTRICTS_KEY]} entities={project.entities} onSave={rules=>{
            withDistrictRelationships(project,rules,manifest);
            mutate(draft=>{const layout=draft.baseLayouts.find(l=>l.id===draft.activeBaseLayoutId);if(layout)layout.metadata[DISTRICT_RELATIONSHIPS_KEY]=JSON.stringify(rules);},true,'base',false,false,true);
          }}/>}
          {mode === 'base' && !creativeDraft && <DistrictArrangementPanel project={project} manifest={manifest} conform={conformEntityToTerrain} onApply={(source,candidate)=>{
            if(source!==project)throw new Error('Map changed. Preview arrangements again.');
            assertEditorConstraints(project,candidate,manifest);
            mutate(draft=>{draft.entities=structuredClone(candidate.entities);draft.metadata={...draft.metadata,'districtArrangement.last':candidate.metadata?.['districtArrangement.last']??''};},true,'base');
          }} />}
          {mode==='base'&&<>
              <section className="inspector-block validation-summary">
                <div><strong className={errorCount ? 'has-errors' : ''}>{errorCount}</strong><span>Errors</span></div>
                <div><strong>{warningCount}</strong><span>Warnings</span></div>
                <div><strong>{issues.length - errorCount - warningCount}</strong><span>Info</span></div>
              </section>
              <section className="inspector-block validation-list">
                <div className="section-heading"><p className="section-label">{creativePreviewLayout?'PREVIEW REQUIREMENTS':'STATE REQUIREMENTS'}</p><span>{stateRequirementIssues.length ? `${stateRequirementIssues.length} missing` : 'VALID'}</span></div>
                {stateRequirementIssues.length ? stateRequirementIssues.map((issue) => (
                  <div className="validation-item error" key={`${issue.entityId}-${issue.code}`}>
                    <AlertTriangle /><span>{issue.message}</span>
                  </div>
                )) : <div className="validation-item valid"><CheckCircle2 /><span>Both teams have an uplink and a powered repair pad.</span></div>}
              </section>
              <section className="inspector-block">
                <p className="section-label">SERVER-SUPPLIED RADII</p>
                <RangeField label={creativePreviewLayout?'Saved state service radius':'Service radius'} max={1200} min={50} onChange={(value) => mutate((draft) => { draft.validation.serviceRadius = value; })} step={10} suffix=" u" value={project.validation.serviceRadius} />
                {creativePreviewLayout&&<p className="field-help">This preview uses {creativePreviewLayout.validation.serviceRadius} u for its service radius. Apply saves that value with the selected arrangement.</p>}
                <RangeField label="Backup radius" max={600} min={20} onChange={(value) => mutate((draft) => { draft.validation.backupRadius = value; })} step={10} suffix=" u" value={project.validation.backupRadius} />
                <p className="field-help">The original client receives these values from the server. The JSON layout preserves them for deterministic new-server validation.</p>
              </section>
              <section className="inspector-block">
                <p className="section-label">SURFACE & SPACING</p>
                <RangeField label="Maximum slope" max={60} min={0} onChange={(value) => mutate((draft) => { draft.validation.maxSlopeDegrees = value; })} suffix="°" value={project.validation.maxSlopeDegrees} />
                <RangeField label="Minimum spacing" max={80} min={0} onChange={(value) => mutate((draft) => { draft.validation.minSpacing = value; })} suffix=" u" value={project.validation.minSpacing} />
              </section>
              <section className="inspector-block format-note">
                <strong>Ghidra-verified power rules</strong>
                <p>Cells test backup at <code>backup − 10</code>, block primary overlap at <code>2 × service + 10</code>, and power units at <code>service − 10</code>.</p>
              </section>
              <section className="inspector-block">
                <button className="secondary-action" onClick={exportJson} type="button"><FileJson /> Export base-layout JSON</button>
              </section>
          </>}
          </div>
        </aside>
      </div>
    </main>
  );
}









