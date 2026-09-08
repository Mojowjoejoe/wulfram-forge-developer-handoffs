'use client';
import {LanePathOverlay,type LanePathControls} from './lane-path-overlay';

import { useEffect, useMemo, useRef } from 'react';
import {areaFitsMap,areaOutlinePaths,type BuildArea} from '@/lib/build-areas';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

import { cameraInputFromCodes, isCameraControlCode } from '@/lib/camera-controls';
import {
  entityPositionToScene,
  entityRotationToScene,
  hasLockedAltitudeAndRotation,
  scenePositionToEntity,
  sceneRotationToEntity,
} from '@/lib/model-transform';
import type { TerrainBrushShape } from '@/lib/terrain-brush';
import { createTerrainMaterial } from '@/lib/terrain-material';
import { createUnitMaterial } from '@/lib/unit-material';
import { powerCoverage } from '@/lib/power-coverage';
import {baseCameraPose,inspectPower,type BaseCameraRequest} from '@/lib/base-inspection';
import type {ClearanceMarker,RouteCameraRequest,RoutePoint} from '@/lib/route-inspection';
import type {FormationOverlay} from '@/lib/formation-diagnostics';
import { createSkybox } from '@/lib/skybox';
import { resolveSkyboxName } from '@/lib/sky-settings';
import type { AssetManifest, ShapeModel, StateEntity, TerrainData } from '@/lib/wulfram';
import { MODEL_WORLD_SCALE, catalogFor, modelNameFor, sampleHeight } from '@/lib/wulfram';

export type EditorMode = 'terrain' | 'base';
export type TerrainTool = 'sculpt' | 'lower' | 'level' | 'smooth' | 'paint' | 'stamp' | 'landform' | 'lane';
export type StrokePhase = 'start' | 'move' | 'end' | 'cancel';
export type ModelTransformMode = 'translate' | 'rotate';

  interface TerrainViewportProps {
    lanePathControls?:LanePathControls;
    inspection?:{enabled:boolean;selectedId?:string;onSelect:(id?:string)=>void;showLinks?:boolean;showHighlights?:boolean};
    routeCameraRequest?:RouteCameraRequest;
    routeMarkers?:ClearanceMarker[];
    routePath?:RoutePoint[];
    onRouteMarker?:(marker:ClearanceMarker)=>void;
    onManualCamera?:()=>void;
    onInspectionPoint?:(x:number,y:number)=>void;
    baseCameraRequest?:BaseCameraRequest;
  onBaseAnchor?: (x:number,y:number,commit:boolean)=>void;
  accessOverlay?: FormationOverlay;
  powerTint?: boolean;
  powerIcons?: boolean;
  coverage?: {power:boolean;darklight:boolean;turrets:boolean};
  baseBoundary?: { x: number; y: number; radius: number; entranceDegrees?:number;showCircle?:boolean };
  buildAreas?:BuildArea[];
  terrain: TerrainData;
  entities: StateEntity[];
  manifest: AssetManifest;
  mode: EditorMode;
  terrainTool: TerrainTool;
  brushRadius: number;
  brushShape: TerrainBrushShape;
  stampGhost?: { heights: number[]; changed: boolean[]; blocked: boolean };
  stampProtected?: boolean[];
  stampError?: string;
  stampSurface?: TerrainData;
  onRotateStamp?: (direction: number) => void;
  placementPreview: StateEntity[];
  placementPreviewStyle?: 'ghost'|'original';
  placementPreviewAnchor?: [number, number];
  selectedEntityId?: string;
  selectedEntityIds?: string[];
  selectedPlacementKey: string;
  serviceRadius: number;
  backupRadius: number;
  showGrid: boolean;
  transformMode: ModelTransformMode;
  onTerrainStroke: (x: number, y: number, phase: StrokePhase) => void;
  onPlace: (x: number, y: number) => void;
  onSelectEntity: (id?: string) => void;
  onMoveEntity: (id: string, x: number, y: number) => void;
  onTransformEntity: (id: string, position: [number, number, number], rotation: [number, number, number]) => void;
  resolveEntityMove: (entity: StateEntity, x: number, y: number) => StateEntity;
  onCursor: (point?: [number, number, number]) => void;
}

const shapeCache = new Map<string, Promise<ShapeModel>>();
const powerBadgeTextures = new Map<string, THREE.CanvasTexture>();
function powerBadgeTexture(status: 'powered' | 'unpowered') {
  if (powerBadgeTextures.has(status)) return powerBadgeTextures.get(status)!;
  const canvas = document.createElement('canvas'); canvas.width = 96; canvas.height = 96;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#141a20'; c.beginPath(); c.arc(48,48,42,0,Math.PI*2); c.fill();
  c.fillStyle = status === 'powered' ? '#ffdc36' : '#ff4a4a';
  c.beginPath(); c.moveTo(53,10); c.lineTo(25,52); c.lineTo(44,52); c.lineTo(35,85); c.lineTo(73,39); c.lineTo(53,39); c.closePath(); c.fill();
  if (status === 'unpowered') {
    c.lineCap='round'; c.lineWidth=13; c.strokeStyle='#141a20'; c.beginPath(); c.moveTo(20,18); c.lineTo(78,78); c.stroke();
    c.lineWidth=6; c.strokeStyle='#ff4a4a'; c.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace=THREE.SRGBColorSpace;
  powerBadgeTextures.set(status,texture); return texture;
}
function updatePowerBadge(holder: THREE.Group, model: THREE.Group, status: ReturnType<typeof powerCoverage>, scale: number) {
  let badge = holder.getObjectByName('power-status-badge') as THREE.Sprite | undefined;
  if (status === 'independent') { if(badge) badge.visible=false; return; }
  if (!badge) {
    badge = new THREE.Sprite(new THREE.SpriteMaterial({depthTest:false,depthWrite:false,sizeAttenuation:false}));
    badge.name='power-status-badge'; badge.scale.set(0.025,0.025,1); badge.renderOrder=50; badge.raycast=()=>undefined; holder.add(badge);
  }
  badge.visible=true; badge.material.map=powerBadgeTexture(status); badge.material.needsUpdate=true;
  model.updateWorldMatrix(true,true);
  const box=new THREE.Box3().setFromObject(model), origin=holder.getWorldPosition(new THREE.Vector3());
  badge.position.set(0, Math.max(40*scale,box.max.y-origin.y+28*scale),0);
}
function tintPower(root: THREE.Object3D, status: ReturnType<typeof powerCoverage>) {
  root.traverse(part => {
    if (!(part instanceof THREE.Mesh)) return;
    for (const material of (Array.isArray(part.material) ? part.material : [part.material])) {
      if (!(material instanceof THREE.MeshStandardMaterial) && !(material instanceof THREE.MeshBasicMaterial)) continue;
      material.userData.powerOriginalColor ??= material.color.clone();
      material.color.copy(material.userData.powerOriginalColor as THREE.Color);
      if (material instanceof THREE.MeshStandardMaterial) {
        material.userData.powerOriginalEmissive ??= material.emissive.clone();
        material.emissive.copy(material.userData.powerOriginalEmissive as THREE.Color);
      }
      if (status !== 'independent') {
        material.color.set(status === 'powered' ? 0x4ee581 : 0xff4343);
        if (material instanceof THREE.MeshStandardMaterial) material.emissive.set(status === 'powered' ? 0x103f19 : 0x4a0909);
      }
    }
  });
}
const imageCache = new Map<string, Promise<HTMLImageElement>>();
const materialTextureCache = new Map<string, THREE.Texture>();

function loadShape(url: string): Promise<ShapeModel> {
  let pending = shapeCache.get(url);
  if (!pending) {
    pending = fetch(url).then((response) => {
      if (!response.ok) throw new Error(`Model request failed: ${response.status}`);
      return response.json() as Promise<ShapeModel>;
    });
    shapeCache.set(url, pending);
  }
  return pending;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  let pending = imageCache.get(url);
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Texture request failed: ${url}`));
      image.src = url;
    });
    imageCache.set(url, pending);
  }
  return pending;
}

function brushOutlineGeometry(shape: TerrainBrushShape): THREE.RingGeometry {
  if (shape === 'square') {
    const cornerRadius = Math.SQRT2;
    return new THREE.RingGeometry(cornerRadius * 0.92, cornerRadius, 4, 1, Math.PI / 4);
  }
  if (shape === 'diamond') return new THREE.RingGeometry(0.92, 1, 4);
  return new THREE.RingGeometry(0.92, 1, 64);
}

function disposeTree(root: THREE.Object3D) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) material.dispose();
    }
  });
  root.clear();
}

function terrainGeometry(terrain: TerrainData, scale: number): THREE.BufferGeometry {
  const count = terrain.width * terrain.height;
  const positions = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  for (let y = 0; y < terrain.height; y += 1) {
    for (let x = 0; x < terrain.width; x += 1) {
      const index = y * terrain.width + x;
      positions[index * 3] = (x / (terrain.width - 1) * terrain.worldWidth - terrain.worldWidth / 2) * scale;
      positions[index * 3 + 1] = (terrain.heights[index] ?? 0) * scale;
      positions[index * 3 + 2] = (y / (terrain.height - 1) * terrain.worldHeight - terrain.worldHeight / 2) * scale;
      uvs[index * 2] = x / (terrain.width - 1);
      uvs[index * 2 + 1] = 1 - y / (terrain.height - 1);
    }
  }
  const indices: number[] = [];
  for (let y = 0; y < terrain.height - 1; y += 1) {
    for (let x = 0; x < terrain.width - 1; x += 1) {
      const a = y * terrain.width + x;
      const b = a + 1;
      const c = a + terrain.width;
      const d = c + 1;
      if (((x ^ y) & 1) === 1) indices.push(a, c, b, b, c, d);
      else indices.push(a, c, d, a, d, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function updateTerrainHeights(geometry: THREE.BufferGeometry, terrain: TerrainData, scale: number) {
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
  if (!positions || positions.count !== terrain.width * terrain.height) return;
  for (let index = 0; index < positions.count; index += 1) {
    positions.setY(index, (terrain.heights[index] ?? 0) * scale);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}

function materialTexture(url: string, invalidate: () => void): THREE.Texture {
  const cached = materialTextureCache.get(url);
  if (cached) return cached;
  const texture = new THREE.TextureLoader().load(url, invalidate);
  texture.colorSpace = THREE.SRGBColorSpace;
  // Shape UVs are passed directly to D3D; v=0 addresses the first stored row.
  texture.flipY = false;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapLinearFilter;
  materialTextureCache.set(url, texture);
  return texture;
}

function fallbackUnit(entity: StateEntity, scale: number): THREE.Group {
  const group = new THREE.Group();
  const teamColor = entity.team === 0 ? 0x9aa1a5 : entity.team === 2 ? 0x5d91d8 : 0xd56542;
  const item = catalogFor(entity);
  const radius = Math.max(0.3, (item?.footprint ?? 8) * scale * 0.45);
  let geometry: THREE.BufferGeometry;
  if (entity.token === 'e') geometry = new THREE.CylinderGeometry(radius, radius * 1.1, radius * 0.9, 10);
  else if (entity.token === 'u') geometry = new THREE.ConeGeometry(radius, radius * 2.2, 6);
  else geometry = new THREE.BoxGeometry(radius * 1.5, radius, radius * 1.5);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: teamColor, roughness: 0.68, metalness: 0.28 }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}

function stylePlacementGhost(root: THREE.Object3D, team: number) {
  const accent = new THREE.Color(team === 0 ? 0xd8dcde : team === 2 ? 0x6eafff : 0xff8b68);
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.material) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      material.transparent = true;
      material.opacity = 0.62;
      material.depthWrite = false;
      if (material instanceof THREE.MeshStandardMaterial) {
        material.color.lerp(accent, 0.42);
        material.emissive.copy(accent);
        material.emissiveIntensity = 0.22;
        material.polygonOffset = true;
        material.polygonOffsetFactor = -1;
      }
    }
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.renderOrder = 12;
  });
}

interface PlacementHolderParts {
  holder: THREE.Group;
  modelHolder: THREE.Group;
  footprint: THREE.Mesh;
}

function positionPlacementGhosts(
  root: THREE.Group,
  holders: Map<string, PlacementHolderParts>,
  preview: StateEntity[],
  terrain: TerrainData,
  mode: EditorMode,
  scale: number,
) {
  root.position.set(0, 0, 0);
  const activeIds = new Set(preview.map((entity) => entity.id));
  for (const [id, parts] of holders) parts.holder.visible = activeIds.has(id);
  for (const entity of preview) {
    const parts = holders.get(entity.id);
    if (!parts) continue;
    parts.holder.position.fromArray(entityPositionToScene(entity.position, terrain, scale));
    parts.modelHolder.rotation.set(...entityRotationToScene(entity.rotation), 'YXZ');
    parts.footprint.position.y = (sampleHeight(terrain, entity.position[0], entity.position[1]) - entity.position[2]) * scale + 0.04;
  }
  root.visible = mode === 'base' && preview.length > 0;
}

function positionEntityHolder(holder: THREE.Group, entity: StateEntity, terrain: TerrainData, scale: number) {
  holder.position.fromArray(entityPositionToScene(entity.position, terrain, scale));
  const modelHolder = holder.children.find((child) => child.userData.entityModelHolder === true);
  modelHolder?.rotation.set(...entityRotationToScene(entity.rotation), 'YXZ');
  const ground = sampleHeight(terrain, entity.position[0], entity.position[1]);
  for (const child of holder.children) {
    if (typeof child.userData.groundOverlayLift !== 'number') continue;
    child.position.y = (ground - entity.position[2]) * scale + child.userData.groundOverlayLift;
  }
}

async function originalUnit(
  entity: StateEntity,
  manifest: AssetManifest,
  scale: number,
  invalidate: () => void,
): Promise<THREE.Group | undefined> {
  const name = modelNameFor(entity);
  const asset = name ? manifest.models[name] : undefined;
  if (!asset) return undefined;
  const shape = await loadShape(asset.url);
  const group = new THREE.Group();
  const modelScale = scale * MODEL_WORLD_SCALE;
  for (const part of shape.meshes) {
    const positions = new Float32Array(part.positions.length);
    for (let index = 0; index < part.positions.length; index += 3) {
      positions[index] = part.positions[index] * modelScale;
      positions[index + 1] = part.positions[index + 2] * modelScale;
      positions[index + 2] = -part.positions[index + 1] * modelScale;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    if (part.uvs.length) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(part.uvs, 2));
    geometry.computeVertexNormals();
    const sourceMaterialName = shape.materials[part.materialIndex];
    const material = createUnitMaterial(sourceMaterialName, entity.team, manifest,
      (url) => materialTexture(url, invalidate));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}

export function TerrainViewport({
  lanePathControls,
  routeCameraRequest,routeMarkers,routePath,onRouteMarker,onManualCamera,onInspectionPoint,
  inspection,
  baseCameraRequest,
  onBaseAnchor,
  accessOverlay,
  powerTint = true,
  powerIcons = true,
  coverage = {power:true,darklight:false,turrets:false},
  baseBoundary,
  buildAreas,
  terrain,
  entities,
  manifest,
  mode,
  terrainTool,
  brushRadius,
  brushShape,
  stampGhost,
  stampProtected,
  stampError,
  stampSurface,
  onRotateStamp,
  placementPreview,
  placementPreviewStyle='ghost',
  placementPreviewAnchor,
  selectedEntityId,
  selectedEntityIds,
  selectedPlacementKey,
  serviceRadius,
  backupRadius,
  showGrid,
  transformMode,
  onTerrainStroke,
  onPlace,
  onSelectEntity,
  onMoveEntity,
  onTransformEntity,
  resolveEntityMove,
  onCursor,
}: TerrainViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const baseAnchorCallback=useRef(onBaseAnchor);
  useEffect(()=>{baseAnchorCallback.current=onBaseAnchor;},[onBaseAnchor]);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const routeMarkerRoot=useRef(new THREE.Group());
  const routeCallbacks=useRef({onRouteMarker,onManualCamera,onInspectionPoint});
  useEffect(()=>{routeCallbacks.current={onRouteMarker,onManualCamera,onInspectionPoint};},[onRouteMarker,onManualCamera,onInspectionPoint]);
  const inspectionRef=useRef(inspection);
  useEffect(()=>{inspectionRef.current=inspection;},[inspection]);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const transformControlsRef = useRef<TransformControls | null>(null);
  const transformHeldRef = useRef(false);
  const refreshTransformRef = useRef<() => void>(() => undefined);
  const terrainRootRef = useRef(new THREE.Group());
  const entityRootRef = useRef(new THREE.Group());
  const placementRootRef = useRef(new THREE.Group());
  const placementHoldersRef = useRef(new Map<string, PlacementHolderParts>());
  const placementPreviewRef = useRef(placementPreview);
  const placementPreviewAnchorRef = useRef(placementPreviewAnchor);
  const terrainMeshRef = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> | null>(null);
  const terrainMaterialRef = useRef<ReturnType<typeof createTerrainMaterial> | null>(null);
  const gridRef = useRef<THREE.Mesh | null>(null);
  const brushRef = useRef<THREE.Mesh | null>(null);
  const invalidateRef = useRef<(updateShadows?: boolean) => void>(() => undefined);
  const scaleRef = useRef(160 / Math.max(terrain.worldWidth, terrain.worldHeight));
  const propsRef = useRef({ mode, terrainTool, transformMode, selectedEntityId, selectedPlacementKey, onTerrainStroke, onPlace, onSelectEntity, onMoveEntity, onTransformEntity, resolveEntityMove, onCursor, onRotateStamp });
  const entitiesRef = useRef(entities);
  const terrainRef = useRef(terrain);
  const strokeRef = useRef(false);
  const entitySceneKey = useMemo(
    () => entities.map((entity) => `${entity.id}:${entity.token}:${entity.subtype ?? ''}:${entity.team}:${entity.position.join(',')}:${entity.rotation.join(',')}:${entity.active}`).join('|'),
    [entities],
  );
  const placementModelKey = useMemo(
    () => placementPreview.map((entity) => `${entity.id}:${entity.token}:${entity.subtype ?? ''}:${entity.team}`).join('|'),
    [placementPreview],
  );
  const skyAsset = manifest.skyboxes?.[resolveSkyboxName(terrain.skyName)];

  useEffect(() => {
    entitiesRef.current = entities;
    terrainRef.current = terrain;
  }, [entities, terrain]);

  useEffect(() => {
    placementPreviewRef.current = placementPreview;
    placementPreviewAnchorRef.current = placementPreviewAnchor;
  }, [placementPreview, placementPreviewAnchor]);

  useEffect(() => {
    propsRef.current = { mode, terrainTool, transformMode, selectedEntityId, selectedPlacementKey, onTerrainStroke, onPlace, onSelectEntity, onMoveEntity, onTransformEntity, resolveEntityMove, onCursor, onRotateStamp };
    refreshTransformRef.current();
  }, [mode, onCursor, onMoveEntity, onPlace, onSelectEntity, onTerrainStroke, onTransformEntity, resolveEntityMove, selectedEntityId, selectedPlacementKey, terrainTool, transformMode, onRotateStamp]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const placementRoot = placementRootRef.current;
    const placementHolders = placementHoldersRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0e10);
    scene.fog = new THREE.Fog(0x0c0e10, 145, 270);
    const camera = new THREE.PerspectiveCamera(48, 1, 0.01, 500);
    camera.position.set(102, 84, 108);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D map viewport. Use W A S D to pan, arrow keys to turn and tilt, Q and E or plus and minus to zoom, and Home to reset the camera.');
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 0);
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minDistance = 0;
    controls.maxDistance = 260;
    controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
    controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;

    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.size = 0.82;
    const transformHelper = transformControls.getHelper();
    transformHelper.visible = false;
    scene.add(transformHelper);
    transformControlsRef.current = transformControls;

    scene.add(new THREE.HemisphereLight(0xd9e7ee, 0x382619, 1.7));
    const sun = new THREE.DirectionalLight(0xffd2a1, 2.2);
    sun.position.set(-70, 110, -45);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -110;
    sun.shadow.camera.right = 110;
    sun.shadow.camera.top = 110;
    sun.shadow.camera.bottom = -110;
    scene.add(sun);
    scene.add(terrainRootRef.current, entityRootRef.current, placementRoot);

    const brush = new THREE.Mesh(
      brushOutlineGeometry('round'),
      new THREE.MeshBasicMaterial({ color: 0xffa15f, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthTest: false }),
    );
    brush.rotation.x = -Math.PI / 2;
    brush.renderOrder = 20;
    brush.visible = false;
    scene.add(brush);
    brushRef.current = brush;

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;

    const pressedCodes = new Set<string>();
    let interacting = false;
    let frame = 0;
    let previousFrameTime = performance.now();
    const initialPosition = new THREE.Vector3(102, 84, 108);
    const initialTarget = new THREE.Vector3(0, 0, 0);

    const moveKeyboardCamera = (deltaSeconds: number) => {
      const input = cameraInputFromCodes(pressedCodes);
      if (!input.panForward && !input.panRight && !input.yaw && !input.tilt && !input.zoom) return false;
      const offset = camera.position.clone().sub(controls.target);
      const distance = Math.max(controls.minDistance, offset.length());
      if (input.panForward || input.panRight) {
        const forward = controls.target.clone().sub(camera.position).setY(0);
        if (forward.lengthSq() < 1e-8) forward.set(0, 0, -1);
        forward.normalize();
        const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
        const direction = forward.multiplyScalar(input.panForward).add(right.multiplyScalar(input.panRight));
        if (direction.lengthSq() > 1) direction.normalize();
        const movement = direction.multiplyScalar(Math.max(8, distance * 0.72) * deltaSeconds);
        camera.position.add(movement);
        controls.target.add(movement);
      }
      if (input.yaw) offset.applyAxisAngle(camera.up, -input.yaw * 1.25 * deltaSeconds);
      if (input.tilt) {
        const spherical = new THREE.Spherical().setFromVector3(offset);
        spherical.phi = THREE.MathUtils.clamp(
          spherical.phi - input.tilt * 0.95 * deltaSeconds,
          0.12,
          controls.maxPolarAngle,
        );
        offset.setFromSpherical(spherical);
      }
      if (input.zoom) {
        const nextDistance = THREE.MathUtils.clamp(
          offset.length() * Math.exp(-input.zoom * 1.5 * deltaSeconds),
          controls.minDistance,
          controls.maxDistance,
        );
        offset.setLength(nextDistance);
      }
      camera.position.copy(controls.target).add(offset);
      return true;
    };

    const renderFrame = (time: number) => {
      frame = 0;
      const deltaSeconds = Math.min(0.05, Math.max(0.001, (time - previousFrameTime) / 1000));
      previousFrameTime = time;
      const keyboardMoved = moveKeyboardCamera(deltaSeconds);
      const controlsMoved = controls.update();
      renderer.render(scene, camera);
      if (keyboardMoved || pressedCodes.size > 0 || interacting || controlsMoved) requestRender();
    };
    const requestRender = (updateShadows = false) => {
      if (updateShadows) renderer.shadowMap.needsUpdate = true;
      if (!frame) {
        previousFrameTime = performance.now();
        frame = requestAnimationFrame(renderFrame);
      }
    };
    invalidateRef.current = requestRender;

    let transformStart = '';
    const selectedTransformParts = () => {
      const id = propsRef.current.selectedEntityId;
      const entity = id ? entitiesRef.current.find((candidate) => candidate.id === id) : undefined;
      const holder = id
        ? entityRootRef.current.children.find((child) => child.userData.entityId === id) as THREE.Group | undefined
        : undefined;
      const modelHolder = holder?.children.find((child) => child.userData.entityModelHolder === true) as THREE.Group | undefined;
      return { id, entity, holder, modelHolder };
    };
    const transformSignature = (object: THREE.Object3D | undefined) => object
      ? [...object.position.toArray(), ...object.rotation.toArray().slice(0, 3)].join(',')
      : '';
    const refreshTransform = () => {
      if (transformControls.dragging) return;
      const { id, entity, holder, modelHolder } = selectedTransformParts();
      if (!transformHeldRef.current || propsRef.current.mode !== 'base' || !holder || !modelHolder) {
        transformControls.detach();
        transformHelper.visible = false;
        container.dataset.transformHandles = 'hidden';
        delete container.dataset.transformEntity;
        requestRender();
        return;
      }
      const transformLocked = Boolean(entity && hasLockedAltitudeAndRotation(entity));
      const editingRotation = propsRef.current.transformMode === 'rotate' && !transformLocked;
      transformControls.setMode(editingRotation ? 'rotate' : 'translate');
      transformControls.space = editingRotation ? 'local' : 'world';
      transformControls.showX = true;
      transformControls.showY = !transformLocked;
      transformControls.showZ = true;
      transformControls.attach(editingRotation ? modelHolder : holder);
      const boundedControls = transformControls as TransformControls & {
        minX: number;
        maxX: number;
        minZ: number;
        maxZ: number;
      };
      const worldHalfWidth = terrainRef.current.worldWidth * scaleRef.current / 2;
      const worldHalfHeight = terrainRef.current.worldHeight * scaleRef.current / 2;
      boundedControls.minX = -worldHalfWidth;
      boundedControls.maxX = worldHalfWidth;
      boundedControls.minZ = -worldHalfHeight;
      boundedControls.maxZ = worldHalfHeight;
      transformHelper.visible = true;
      container.dataset.transformHandles = transformLocked ? 'translate-xy' : editingRotation ? 'rotate' : 'translate';
      container.dataset.transformEntity = id ?? '';
      requestRender();
    };
    refreshTransformRef.current = refreshTransform;
    refreshTransform();

    const publishTransformCursor = () => {
      const { holder } = selectedTransformParts();
      if (!holder) return;
      propsRef.current.onCursor(scenePositionToEntity(
        holder.position.toArray(),
        terrainRef.current,
        scaleRef.current,
      ));
    };
    const transformChanged = () => {
      publishTransformCursor();
      requestRender();
    };
    const transformStarted = () => {
      transformStart = transformSignature(transformControls.object ?? undefined);
      requestRender();
    };
    const transformFinished = () => {
      const { id, holder, modelHolder } = selectedTransformParts();
      if (id && holder && modelHolder && transformStart !== transformSignature(transformControls.object ?? undefined)) {
        propsRef.current.onTransformEntity(
          id,
          scenePositionToEntity(holder.position.toArray(), terrainRef.current, scaleRef.current),
          sceneRotationToEntity([modelHolder.rotation.x, modelHolder.rotation.y, modelHolder.rotation.z]),
        );
      }
      transformStart = '';
      if (!transformHeldRef.current) refreshTransform();
      requestRender(true);
    };
    const transformDraggingChanged = (event: { value: unknown }) => {
      const dragging = Boolean(event.value);
      controls.enabled = !dragging;
      interacting = dragging;
      if (!dragging && !transformHeldRef.current) refreshTransform();
      requestRender();
    };
    transformControls.addEventListener('change', transformChanged);
    transformControls.addEventListener('mouseDown', transformStarted);
    transformControls.addEventListener('mouseUp', transformFinished);
    transformControls.addEventListener('dragging-changed', transformDraggingChanged);

    const controlsChanged = () => requestRender();
    const controlsStarted = () => { interacting = true; requestRender(); };
    const controlsEnded = () => { interacting = false; requestRender(); };
    controls.addEventListener('change', controlsChanged);
    controls.addEventListener('start', controlsStarted);
    controls.addEventListener('end', controlsEnded);

    const keyboardEnabled = () => document.activeElement === renderer.domElement || renderer.domElement.matches(':hover');
    const editingText = (target: EventTarget | null) => target instanceof HTMLElement && target.matches('input, textarea, select, [contenteditable="true"]');
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Control' && !editingText(event.target) && keyboardEnabled()) {
        transformHeldRef.current = true;
        refreshTransform();
      }
      if (editingText(event.target) || event.ctrlKey || event.metaKey || event.altKey || !keyboardEnabled()) return;
      if (event.code === 'Home') {
        routeCallbacks.current.onManualCamera?.();
        event.preventDefault();
        camera.position.copy(initialPosition);
        controls.target.copy(initialTarget);
        controls.update();
        requestRender();
        return;
      }
      if (!isCameraControlCode(event.code)) return;
      routeCallbacks.current.onManualCamera?.();
      event.preventDefault();
      pressedCodes.add(event.code);
      requestRender();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Control') {
        transformHeldRef.current = false;
        if (!transformControls.dragging) refreshTransform();
      }
      if (!pressedCodes.delete(event.code)) return;
      event.preventDefault();
      requestRender();
    };
    const clearPressedCodes = () => {
      pressedCodes.clear();
      transformHeldRef.current = false;
      if (!transformControls.dragging) refreshTransform();
    };
    const focusViewport = () => renderer.domElement.focus({ preventScroll: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearPressedCodes);
    renderer.domElement.addEventListener('pointerdown', focusViewport);

    const resize = () => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      requestRender();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    requestRender(true);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.removeEventListener('change', controlsChanged);
      controls.removeEventListener('start', controlsStarted);
      controls.removeEventListener('end', controlsEnded);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearPressedCodes);
      renderer.domElement.removeEventListener('pointerdown', focusViewport);
      transformControls.removeEventListener('change', transformChanged);
      transformControls.removeEventListener('mouseDown', transformStarted);
      transformControls.removeEventListener('mouseUp', transformFinished);
      transformControls.removeEventListener('dragging-changed', transformDraggingChanged);
      transformControls.detach();
      transformControls.dispose();
      scene.remove(transformHelper);
      controls.dispose();
      disposeTree(placementRoot);
      placementHolders.clear();
      renderer.dispose();
      brush.geometry.dispose();
      (brush.material as THREE.Material).dispose();
      renderer.domElement.remove();
      invalidateRef.current = () => undefined;
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
      transformControlsRef.current = null;
      refreshTransformRef.current = () => undefined;
      delete container.dataset.transformHandles;
      delete container.dataset.transformEntity;
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !skyAsset) return;
    scene.background = new THREE.Color(skyAsset.horizon);
    scene.fog?.color.set(skyAsset.horizon);
    const sky = createSkybox(skyAsset, terrain.worldWidth, terrain.worldHeight, loadImage, () => invalidateRef.current());
    scene.add(sky.mesh);
    invalidateRef.current();
    return () => {
      scene.remove(sky.mesh);
      sky.dispose();
    };
  }, [skyAsset, terrain.worldHeight, terrain.worldWidth]);

  useEffect(() => {
    const root = terrainRootRef.current;
    const currentTerrain = terrainRef.current;
    terrainMaterialRef.current?.dispose();
    disposeTree(root);
    const scale = 160 / Math.max(currentTerrain.worldWidth, currentTerrain.worldHeight);
    scaleRef.current = scale;
    const geometry = terrainGeometry(currentTerrain, scale);
    const terrainMaterial = createTerrainMaterial(currentTerrain, manifest, loadImage, () => invalidateRef.current());
    const material = terrainMaterial.material;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.userData.terrain = true;
    root.add(mesh);
    terrainMeshRef.current = mesh;
    terrainMaterialRef.current = terrainMaterial;
    invalidateRef.current(true);
    return () => {
      if (terrainMeshRef.current === mesh) {
        terrainMeshRef.current = null;
        terrainMaterialRef.current = null;
      }
      terrainMaterial.dispose();
      disposeTree(root);
    };
  }, [manifest, terrain.height, terrain.width, terrain.worldHeight, terrain.worldWidth]);

  useEffect(() => {
    const mesh = terrainMeshRef.current;
    if (!mesh) return;
    updateTerrainHeights(mesh.geometry, terrainRef.current, scaleRef.current);
    invalidateRef.current(!strokeRef.current);
  }, [terrain.height, terrain.heights, terrain.width, terrain.worldHeight, terrain.worldWidth]);

  useEffect(() => {
    const root = terrainRootRef.current;
    const previous = gridRef.current;
    if (previous) {
      root.remove(previous);
      (previous.material as THREE.Material).dispose();
      gridRef.current = null;
    }
    const mesh = terrainMeshRef.current;
    if (!showGrid || !mesh) {
      invalidateRef.current();
      return;
    }
    const wire = new THREE.Mesh(
      mesh.geometry,
      new THREE.MeshBasicMaterial({ color: 0xffd0a0, wireframe: true, transparent: true, opacity: 0.075, depthWrite: false }),
    );
    wire.position.y = 0.012;
    wire.raycast = () => undefined;
    root.add(wire);
    gridRef.current = wire;
    invalidateRef.current();
    return () => {
      if (gridRef.current === wire) gridRef.current = null;
      root.remove(wire);
      (wire.material as THREE.Material).dispose();
    };
  }, [showGrid, terrain.height, terrain.width, terrain.worldHeight, terrain.worldWidth]);

  useEffect(() => {
    const material = terrainMaterialRef.current;
    if (!material) return;
    void material.update(stampSurface ?? terrainRef.current).catch((error: unknown) => {
      console.error('Terrain texture loading failed:', error);
    });
  }, [manifest, terrain.height, terrain.tagmap2, terrain.textureIds, terrain.width, terrain.worldHeight, terrain.worldWidth, stampSurface]);

  useEffect(() => {
    const root = entityRootRef.current;
    transformControlsRef.current?.detach();
    disposeTree(root);
    let cancelled = false;
    const scale = scaleRef.current;
    for (const entity of entitiesRef.current.filter((item) => item.token !== '*')) {
      const holder = new THREE.Group();
      holder.userData.entityId = entity.id;
      holder.position.fromArray(entityPositionToScene(entity.position, terrainRef.current, scale));
      root.add(holder);
      const modelHolder = new THREE.Group();
      modelHolder.userData.entityId = entity.id;
      modelHolder.userData.entityModelHolder = true;
      modelHolder.rotation.set(...entityRotationToScene(entity.rotation), 'YXZ');
      holder.add(modelHolder);
      const placeholder = fallbackUnit(entity, scale);
      placeholder.userData.entityId = entity.id;
      modelHolder.add(placeholder);
      tintPower(placeholder, mode === 'base' && powerTint ? powerCoverage(entity, entitiesRef.current, serviceRadius) : 'independent');
      updatePowerBadge(holder,modelHolder,mode==='base'&&powerIcons?powerCoverage(entity,entitiesRef.current,serviceRadius):'independent',scale);
      void originalUnit(entity, manifest, scale, () => invalidateRef.current()).then((model) => {
        if (!model) return;
        if (cancelled || !modelHolder.parent) {
          disposeTree(model);
          return;
        }
        disposeTree(placeholder);
        modelHolder.remove(placeholder);
        model.userData.entityId = entity.id;
        model.traverse((part) => { part.userData.entityId = entity.id; });
        modelHolder.add(model);
        tintPower(model, mode === 'base' && powerTint ? powerCoverage(entity, entitiesRef.current, serviceRadius) : 'independent');
        updatePowerBadge(holder,modelHolder,mode==='base'&&powerIcons?powerCoverage(entity,entitiesRef.current,serviceRadius):'independent',scale);
        invalidateRef.current(true);
      }).catch(() => undefined);

      if (entity.id === selectedEntityId || selectedEntityIds?.includes(entity.id)) {
        const footprint = catalogFor(entity)?.footprint ?? 10;
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(footprint * scale * 0.9, footprint * scale, 48),
          new THREE.MeshBasicMaterial({ color: 0xffb169, side: THREE.DoubleSide, transparent: true, opacity: 0.95, depthTest: false }),
        );
        ring.raycast = () => undefined;
        ring.rotation.x = -Math.PI / 2;
        ring.userData.groundOverlayLift = 0.025;
        ring.position.y = (sampleHeight(terrainRef.current, entity.position[0], entity.position[1]) - entity.position[2]) * scale + 0.025;
        ring.renderOrder = 30;
        holder.add(ring);
      }
      if (coverage.power && entity.token === 'e' && (entity.id === selectedEntityId || mode === 'base')) {
        const radius = serviceRadius * scale;
        const rangeColor = entity.team === 0 ? 0xaeb5b9 : entity.team === 2 ? 0x65a6ff : 0xff7659;
        const range = new THREE.Mesh(
          new THREE.RingGeometry(Math.max(0, radius - 0.08), radius, 96),
          new THREE.MeshBasicMaterial({ color: rangeColor, transparent: true, opacity: entity.id === selectedEntityId ? 0.45 : 0.16, side: THREE.DoubleSide, depthWrite: false }),
        );
        range.raycast = () => undefined;
        range.rotation.x = -Math.PI / 2;
        range.userData.groundOverlayLift = 0.018;
        range.position.y = (sampleHeight(terrainRef.current, entity.position[0], entity.position[1]) - entity.position[2]) * scale + 0.018;
        holder.add(range);
        const backup = backupRadius * scale;
        const backupRange = new THREE.Mesh(
          new THREE.RingGeometry(Math.max(0, backup - 0.06), backup, 64),
          new THREE.MeshBasicMaterial({ color: 0xf6c16f, transparent: true, opacity: entity.id === selectedEntityId ? 0.7 : 0.22, side: THREE.DoubleSide, depthWrite: false }),
        );
        backupRange.raycast = () => undefined;
        backupRange.rotation.x = -Math.PI / 2;
        backupRange.userData.groundOverlayLift = 0.022;
        backupRange.position.y = (sampleHeight(terrainRef.current, entity.position[0], entity.position[1]) - entity.position[2]) * scale + 0.022;
        holder.add(backupRange);
      }
    }
    refreshTransformRef.current();
    invalidateRef.current(true);
    return () => { cancelled = true; };
  }, [backupRadius, coverage.power, entitySceneKey, manifest, mode, powerIcons, powerTint, selectedEntityId, selectedEntityIds, serviceRadius, terrain.worldHeight, terrain.worldWidth]);

  useEffect(() => {
    const root = placementRootRef.current;
    const holders = placementHoldersRef.current;
    disposeTree(root);
    holders.clear();
    root.position.set(0, 0, 0);
    const blueprints = placementPreviewRef.current;
    if (mode !== 'base' || !blueprints.length) {
      root.visible = false;
      invalidateRef.current();
      return;
    }

    let cancelled = false;
    const scale = scaleRef.current;
    root.visible = true;
    for (const entity of blueprints) {
      const holder = new THREE.Group();
      holder.userData.entityId=entity.id;
      const modelHolder = new THREE.Group();
      const placeholder = fallbackUnit(entity, scale);
      if(placementPreviewStyle==='ghost')stylePlacementGhost(placeholder, entity.team);
      modelHolder.add(placeholder);
      holder.add(modelHolder);

      const footprintRadius = Math.max(0.25, (catalogFor(entity)?.footprint ?? 10) * scale * 0.5);
      const footprint = new THREE.Mesh(
        new THREE.RingGeometry(Math.max(0, footprintRadius - 0.055), footprintRadius, 40),
        new THREE.MeshBasicMaterial({
          color: entity.team === 0 ? 0xd8dcde : entity.team === 2 ? 0x6eafff : 0xff8b68,
          transparent: true,
          opacity: 0.68,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      footprint.rotation.x = -Math.PI / 2;
      footprint.renderOrder = 13;
      footprint.raycast = () => undefined;
      holder.add(footprint);
      root.add(holder);
      holders.set(entity.id, { holder, modelHolder, footprint });

      void originalUnit(entity, manifest, scale, () => invalidateRef.current()).then((model) => {
        if (!model) return;
        if (cancelled || !modelHolder.parent) {
          disposeTree(model);
          return;
        }
        if(placementPreviewStyle==='ghost')stylePlacementGhost(model, entity.team);
        const latest = placementPreviewRef.current.find(e => e.id === entity.id) ?? entity;
        tintPower(model, powerTint ? powerCoverage(latest, [...entitiesRef.current, ...placementPreviewRef.current], serviceRadius) : 'independent');
        disposeTree(placeholder);
        modelHolder.remove(placeholder);
        modelHolder.add(model);
        updatePowerBadge(holder,modelHolder,powerIcons?powerCoverage(latest,[...entitiesRef.current,...placementPreviewRef.current],serviceRadius):'independent',scale);
        invalidateRef.current();
      }).catch(() => undefined);
    }
    invalidateRef.current();
    return () => { cancelled = true; };
  }, [manifest, mode, placementModelKey, placementPreviewStyle, powerIcons, powerTint, serviceRadius]);

  useEffect(() => {
    const root = placementRootRef.current;
    const holders = placementHoldersRef.current;
    placementPreviewAnchorRef.current = placementPreviewAnchor;
    positionPlacementGhosts(root, holders, placementPreview, terrain, mode, scaleRef.current);
    for (const entity of placementPreview) {
      const holder = holders.get(entity.id);
      if (holder) tintPower(holder.modelHolder, powerTint ? powerCoverage(entity, [...entities, ...placementPreview], serviceRadius) : 'independent');
      if (holder) updatePowerBadge(holder.holder,holder.modelHolder,powerIcons?powerCoverage(entity,[...entities,...placementPreview],serviceRadius):'independent',scaleRef.current);
    }
    invalidateRef.current();
  }, [entities, mode, placementPreview, placementPreviewStyle, placementPreviewAnchor, powerIcons, powerTint, serviceRadius, terrain]);

  useEffect(()=>{
    const camera=cameraRef.current,controls=controlsRef.current;if(!camera||!controls||!routeCameraRequest)return;
    controls.maxPolarAngle=Math.PI-0.01;
    controls.target.set(...entityPositionToScene(routeCameraRequest.target,terrainRef.current,scaleRef.current));
    camera.position.set(...entityPositionToScene(routeCameraRequest.eye,terrainRef.current,scaleRef.current));
    controls.update();invalidateRef.current();
  },[routeCameraRequest]);
  useEffect(()=>{
    const scene=sceneRef.current;if(!scene||mode!=='base')return;
    const root=routeMarkerRoot.current,scale=scaleRef.current;
    if(routePath&&routePath.length>1){const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(routePath.map(([x,y])=>new THREE.Vector3(...entityPositionToScene([x,y,sampleHeight(terrain,x,y)+8],terrain,scale)))),new THREE.LineBasicMaterial({color:0x66ffff,depthTest:false}));line.raycast=()=>undefined;line.renderOrder=63;root.add(line);}
    for(const marker of routeMarkers??[]){
      const color=marker.severity==='blocked'?0xff4545:0xffd34e;
      const mesh=new THREE.Sprite(new THREE.SpriteMaterial({color,depthTest:false,sizeAttenuation:false}));mesh.scale.set(.018,.018,1);
      mesh.position.set(...entityPositionToScene([marker.x,marker.y,sampleHeight(terrain,marker.x,marker.y)+25],terrain,scale));mesh.renderOrder=65;mesh.userData.routeMarker=marker;root.add(mesh);
    }
    scene.add(root);invalidateRef.current();return()=>{scene.remove(root);disposeTree(root);root.clear();invalidateRef.current();};
  },[routeMarkers,routePath,terrain,mode]);
  useEffect(()=>{
    const camera=cameraRef.current,controls=controlsRef.current;
    if(!camera||!controls||!baseCameraRequest)return;
    const terrain=terrainRef.current,pose=baseCameraPose(terrain,baseCameraRequest.entities,baseCameraRequest.team,baseCameraRequest.view,camera.aspect,manifest);
    if(!pose)return;
    controls.maxPolarAngle=baseCameraRequest.view==='ground'?Math.PI/2-0.005:Math.PI*0.48;
    controls.target.set(...entityPositionToScene(pose.target,terrain,scaleRef.current));
    camera.position.set(...entityPositionToScene(pose.eye,terrain,scaleRef.current));
    controls.update();invalidateRef.current();
  },[baseCameraRequest,manifest]);

  useEffect(()=>{
    const scene=sceneRef.current;if(!scene||!inspection?.enabled||inspection.showHighlights===false)return;
    const all=[...entities,...placementPreview],selected=all.find(e=>e.id===inspection.selectedId);if(!selected)return;
    const power=inspectPower(selected,all,serviceRadius),root=new THREE.Group(),scale=scaleRef.current;
    const line=(points:Array<[number,number,number]>,color:number)=>{const object=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...entityPositionToScene(p,terrain,scale)))),new THREE.LineBasicMaterial({color,depthTest:false}));object.raycast=()=>undefined;object.renderOrder=60;root.add(object);};
    for(const entity of [selected,...(inspection.showLinks===false?[]:power.sources.map(s=>s.cell))]){
      const radius=entity===selected?65:45;
      line(Array.from({length:49},(_,i)=>{const a=i/48*Math.PI*2,x=entity.position[0]+Math.cos(a)*radius,y=entity.position[1]+Math.sin(a)*radius;return [x,y,sampleHeight(terrain,x,y)+8];}),entity===selected?0xffffff:0x55ffff);
    }
    if(inspection.showLinks!==false)for(const {cell} of power.sources)line([[selected.position[0],selected.position[1],selected.position[2]+35],[cell.position[0],cell.position[1],cell.position[2]+35]],0x55ffff);
    scene.add(root);invalidateRef.current();return()=>{scene.remove(root);disposeTree(root);invalidateRef.current();};
  },[entities,placementPreview,inspection,serviceRadius,terrain]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !baseBoundary || mode !== 'base') return;
    const root = new THREE.Group(), scale = scaleRef.current;
    for (const [x, y] of [[baseBoundary.x, baseBoundary.y], [terrain.worldWidth - baseBoundary.x, terrain.worldHeight - baseBoundary.y]]) {
      const points = Array.from({ length: 129 }, (_, i) => {
        const angle = i / 128 * Math.PI * 2;
        const px = x + Math.cos(angle) * baseBoundary.radius, py = y + Math.sin(angle) * baseBoundary.radius;
        return new THREE.Vector3(...entityPositionToScene([px, py, sampleHeight(terrain, px, py) + 3], terrain, scale));
      });
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0xffda66, depthTest: false }));
        line.raycast = () => undefined; line.renderOrder = 40; line.visible=baseBoundary.showCircle!==false; root.add(line);
        if(baseBoundary.entranceDegrees!==undefined){
          const teamTwo=x!==baseBoundary.x||y!==baseBoundary.y,angle=(baseBoundary.entranceDegrees+(teamTwo?180:0))*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
          for(const side of [-90,90]){
            const path=Array.from({length:65},(_,i)=>{const d=i/64*baseBoundary.radius,px=x+c*d-s*side,py=y+s*d+c*side;return new THREE.Vector3(...entityPositionToScene([px,py,sampleHeight(terrain,px,py)+5],terrain,scale));});
            const guide=new THREE.Line(new THREE.BufferGeometry().setFromPoints(path),new THREE.LineBasicMaterial({color:0x55ddff,depthTest:false}));guide.raycast=()=>undefined;guide.renderOrder=41;root.add(guide);
          }
        }
    }
    scene.add(root); invalidateRef.current();
    return () => { scene.remove(root); disposeTree(root); invalidateRef.current(); };
  }, [baseBoundary, mode, terrain]);

  useEffect(()=>{
    const scene=sceneRef.current;if(!scene||!buildAreas?.length||(mode!=='base'&&mode!=='terrain'))return;
    const root=new THREE.Group(),scale=scaleRef.current;
    for(const a of buildAreas){
      if(!areaFitsMap(a,terrain.worldWidth,terrain.worldHeight))continue;
      for(const corners of areaOutlinePaths(a)){
      const points=[];
      for(let edge=0;edge<corners.length-1;edge++){
        const steps=Math.max(1,Math.min(32,Math.ceil(Math.hypot(corners[edge+1][0]-corners[edge][0],corners[edge+1][1]-corners[edge][1])/25)));
        for(let i=0;i<=steps;i++){
        const x=corners[edge][0]+(corners[edge+1][0]-corners[edge][0])*i/steps,y=corners[edge][1]+(corners[edge+1][1]-corners[edge][1])*i/steps;
        points.push(new THREE.Vector3(...entityPositionToScene([x,y,sampleHeight(terrain,x,y)+6],terrain,scale)));
        }
      }
      const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:a.kind==='terrain'?0x80e3a1:a.kind==='corridor'?0xe896ff:a.kind==='boundary'?0x58bfff:0xffa34a,depthTest:false}));line.raycast=()=>undefined;line.renderOrder=65;root.add(line);
      }
    }
    scene.add(root);invalidateRef.current();return()=>{scene.remove(root);disposeTree(root);invalidateRef.current();};
  },[buildAreas,mode,terrain]);

  useEffect(()=>{
    const scene=sceneRef.current;if(!scene||!accessOverlay||mode!=='base')return;
    const group=new THREE.Group(),scale=scaleRef.current;
    const addLine=(path:Array<[number,number]>,color:number)=>{
      const points=path.map(([x,y])=>new THREE.Vector3(...entityPositionToScene([x,y,sampleHeight(terrain,x,y)+4],terrain,scale)));
      const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,depthTest:false}));line.raycast=()=>undefined;line.renderOrder=45;group.add(line);
    };
    for(const route of accessOverlay.routes)addLine(route,0x44ff88);
    for(const p of accessOverlay.blocked){
      const r=90;addLine([[p.x-r,p.y-r],[p.x+r,p.y+r]],0xff3434);addLine([[p.x-r,p.y+r],[p.x+r,p.y-r]],0xff3434);
      addLine(Array.from({length:49},(_,i)=>[p.x+Math.cos(i/48*Math.PI*2)*130,p.y+Math.sin(i/48*Math.PI*2)*130]),0xff3434);
    }
    scene.add(group);invalidateRef.current();return()=>{scene.remove(group);disposeTree(group);invalidateRef.current();};
  },[accessOverlay,mode,terrain]);

  useEffect(()=>{
    const scene=sceneRef.current;if(!scene||mode!=='base')return;
    const group=new THREE.Group(),scale=scaleRef.current;
    for(const entity of [...entities,...placementPreview]){
      const circles:Array<[number,number,boolean]>=[];
      if(coverage.power&&entity.token==='e'&&placementPreview.some(e=>e.id===entity.id))circles.push([serviceRadius,entity.team===1?0xff7659:0x65a6ff,false]);
      if(coverage.darklight&&entity.token==='d')circles.push([180,0xcc88ff,false]);
      if(coverage.turrets){
        if(entity.token==='g')circles.push([475,0x53cfff,false]);
        if(entity.token==='s')circles.push([1000,0xffab54,false],[300,0xffab54,true]);
        if(entity.token==='L')circles.push([1400,0xf5d5ff,false],[900,0xf5d5ff,true]);
      }
      for(const [radius,color,dashed] of circles){
        const points=Array.from({length:97},(_,i)=>{
          const angle=i/96*Math.PI*2,x=entity.position[0]+Math.cos(angle)*radius,y=entity.position[1]+Math.sin(angle)*radius;
          return new THREE.Vector3(...entityPositionToScene([x,y,sampleHeight(terrain,x,y)+2],terrain,scale));
        });
        const material=dashed?new THREE.LineDashedMaterial({color,dashSize:1,gapSize:0.7,depthTest:false,transparent:true,opacity:0.6}):new THREE.LineBasicMaterial({color,depthTest:false,transparent:true,opacity:0.45});
        const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),material);line.computeLineDistances();line.raycast=()=>undefined;line.renderOrder=35;group.add(line);
      }
    }
    scene.add(group);invalidateRef.current();return()=>{scene.remove(group);disposeTree(group);invalidateRef.current();};
  },[coverage,entities,mode,placementPreview,serviceRadius,terrain]);

  useEffect(() => {
    const brush = brushRef.current;
    if (!brush) return;
    const diameter = brushRadius * scaleRef.current;
    brush.scale.set(diameter, diameter, diameter);
    invalidateRef.current();
  }, [brushRadius, terrain.worldHeight, terrain.worldWidth]);

  useEffect(() => {
    const brush = brushRef.current;
    if (!brush) return;
    const previous = brush.geometry;
    brush.geometry = brushOutlineGeometry(brushShape);
    previous.dispose();
    invalidateRef.current();
  }, [brushShape]);

  useEffect(() => {
    const original = terrainMeshRef.current, scene = sceneRef.current;
    if (!original || !scene || !stampSurface) return;
    const geometry = terrainGeometry(stampSurface, scaleRef.current);
    const preview = new THREE.Mesh(geometry, original.material);
    preview.receiveShadow = true;
    // Cursor raycasts continue using the unchanged original mesh, avoiding feedback drift.
    original.visible = false;
    const grid = gridRef.current; if (grid) grid.visible = false;
    scene.add(preview); invalidateRef.current();
    return () => { scene.remove(preview); geometry.dispose(); original.visible = true; if (grid) grid.visible = true; invalidateRef.current(); };
  }, [stampSurface]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !stampProtected || mode !== 'terrain' || terrainTool !== 'landform') return;
    const positions: number[] = [];
    const scale = 160 / Math.max(terrain.worldWidth, terrain.worldHeight);
    for (let i = 0; i < stampProtected.length; i += 1) {
      if (!stampProtected[i]) continue;
      positions.push(...entityPositionToScene([i % terrain.width / (terrain.width - 1) * terrain.worldWidth,
        Math.floor(i / terrain.width) / (terrain.height - 1) * terrain.worldHeight, terrain.heights[i] + 2], terrain, scale));
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: 0xf7a34b, size: 2, sizeAttenuation: false, transparent: true, opacity: .45, depthWrite: false });
    const overlay = new THREE.Points(geometry, material); overlay.renderOrder = 21;
    scene.add(overlay); invalidateRef.current();
    return () => { scene.remove(overlay); geometry.dispose(); material.dispose(); invalidateRef.current(); };
  }, [stampProtected, terrain, mode, terrainTool]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !stampGhost || mode !== 'terrain' || terrainTool !== 'landform') return;
    const positions: number[] = [];
    const scale = 160 / Math.max(terrain.worldWidth, terrain.worldHeight);
    const vertex = (i: number) => positions.push(...entityPositionToScene([
      i % terrain.width / (terrain.width - 1) * terrain.worldWidth,
      Math.floor(i / terrain.width) / (terrain.height - 1) * terrain.worldHeight,
      stampGhost.heights[i] + 2], terrain, scale));
    const covered = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= terrain.width - 1 || y >= terrain.height - 1) return false;
      const a = y * terrain.width + x;
      return [a, a + 1, a + terrain.width, a + terrain.width + 1].some(i => stampGhost.changed[i]);
    };
    for (let y = 0; y < terrain.height - 1; y += 1) for (let x = 0; x < terrain.width - 1; x += 1) {
      const a = y * terrain.width + x, b = a + 1, c = a + terrain.width, d = c + 1;
      if (!covered(x, y)) continue;
      if (stampGhost.blocked) for (const i of [a, c, b, b, c, d]) vertex(i);
      else {
        if (!covered(x - 1, y)) { vertex(a); vertex(c); }
        if (!covered(x + 1, y)) { vertex(b); vertex(d); }
        if (!covered(x, y - 1)) { vertex(a); vertex(b); }
        if (!covered(x, y + 1)) { vertex(c); vertex(d); }
      }
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const material = stampGhost.blocked
      ? new THREE.MeshBasicMaterial({ color: 0xff5656, wireframe: true, transparent: true, opacity: .85, depthTest: false, depthWrite: false })
      : new THREE.LineBasicMaterial({ color: 0x5ee8ef, transparent: true, opacity: .65, depthTest: false, depthWrite: false });
    const ghost = material instanceof THREE.MeshBasicMaterial ? new THREE.Mesh(geometry, material) : new THREE.LineSegments(geometry, material); ghost.renderOrder = 25;
    scene.add(ghost); invalidateRef.current();
    return () => { scene.remove(ghost); geometry.dispose(); material.dispose(); invalidateRef.current(); };
  }, [stampGhost, terrain, mode, terrainTool]);

  useEffect(() => {
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const container = containerRef.current;
    if (!renderer || !camera || !controls || !container) return;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const hit = (clientX: number, clientY: number, includeEntities = false) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set((clientX - rect.left) / rect.width * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const terrainMesh = terrainMeshRef.current;
      const targets: THREE.Object3D[] = includeEntities ? [entityRootRef.current] : [];
      if(includeEntities&&inspectionRef.current?.enabled)targets.push(placementRootRef.current);
      if(includeEntities)targets.push(routeMarkerRoot.current);
      if (terrainMesh) targets.push(terrainMesh);
      return raycaster.intersectObjects(targets, true);
    };
    const terrainPoint = (intersections: THREE.Intersection[]) => intersections.find((result) => {
      let object: THREE.Object3D | null = result.object;
      while (object) {
        if (object.userData.terrain) return true;
        object = object.parent;
      }
      return false;
    });
    const entityId = (object: THREE.Object3D): string | undefined => {
      let current: THREE.Object3D | null = object;
      while (current) {
        if (typeof current.userData.entityId === 'string') return current.userData.entityId;
        current = current.parent;
      }
      return undefined;
    };
    const toWorld = (point: THREE.Vector3): [number, number, number] => {
      return scenePositionToEntity(point.toArray(), terrainRef.current, scaleRef.current);
    };
    const holderForEntity = (id: string) => entityRootRef.current.children.find((child) => child.userData.entityId === id) as THREE.Group | undefined;
    let unitDrag: { id: string; original: StateEntity; last?: [number, number] } | undefined;
    let baseDrag:[number,number]|undefined;
    let lastCursorUpdate = 0;
    let cursorVisible = false;
    const publishCursor = (point?: [number, number, number]) => {
      if (!point) {
        if (cursorVisible) propsRef.current.onCursor(undefined);
        cursorVisible = false;
        return;
      }
      const now = performance.now();
      if (!cursorVisible || now - lastCursorUpdate >= 75) {
        propsRef.current.onCursor(point);
        lastCursorUpdate = now;
      }
      cursorVisible = true;
    };
    const previewUnitDrag = (x: number, y: number) => {
      if (!unitDrag) return;
      const moved = propsRef.current.resolveEntityMove(unitDrag.original, x, y);
      const holder = holderForEntity(unitDrag.id);
      if (holder) positionEntityHolder(holder, moved, terrainRef.current, scaleRef.current);
      unitDrag.last = [x, y];
      publishCursor([x, y, moved.position[2]]);
      invalidateRef.current();
    };
    const moveBrush = (result?: THREE.Intersection) => {
      const brush = brushRef.current;
      if (!brush) return;
      brush.visible = brush.scale.x > 0 && Boolean(result) && propsRef.current.mode === 'terrain' && propsRef.current.terrainTool !== 'landform';
      if (result) {
        brush.position.copy(result.point);
        brush.position.y += 0.08;
        const world = toWorld(result.point);
        publishCursor(world);
        const previewAnchor = placementPreviewAnchorRef.current;
        if (propsRef.current.mode === 'base' && previewAnchor) {
          placementRootRef.current.position.set(
            (world[0] - previewAnchor[0]) * scaleRef.current,
            0,
            (world[1] - previewAnchor[1]) * scaleRef.current,
          );
          placementRootRef.current.visible = placementHoldersRef.current.size > 0;
        }
      } else {
        publishCursor(undefined);
        placementRootRef.current.visible = false;
      }
      invalidateRef.current();
    };
    let pointerFrame = 0;
    let latestPointer: { clientX: number; clientY: number } | undefined;
    const processPointerMove = () => {
      pointerFrame = 0;
      if (!latestPointer) return;
      const intersections = hit(latestPointer.clientX, latestPointer.clientY);
      const ground = terrainPoint(intersections);
      if(baseDrag){if(ground){const [x,y]=toWorld(ground.point);baseDrag=[x,y];baseAnchorCallback.current?.(baseDrag[0],baseDrag[1],false);}return;}
      if (unitDrag) {
        if (ground) {
          const [x, y] = toWorld(ground.point);
          previewUnitDrag(x, y);
        }
        return;
      }
      moveBrush(ground);
      if (strokeRef.current && ground) {
        const [x, y] = toWorld(ground.point);
        propsRef.current.onTerrainStroke(x, y, 'move');
      }
    };
    const flushPointerMove = () => {
      if (pointerFrame) cancelAnimationFrame(pointerFrame);
      pointerFrame = 0;
      processPointerMove();
      latestPointer = undefined;
    };
    const onPointerMove = (event: PointerEvent) => {
      if ((event.buttons & 2) !== 0) return;
      if (transformHeldRef.current || transformControlsRef.current?.dragging) return;
      latestPointer = { clientX: event.clientX, clientY: event.clientY };
      if (!pointerFrame) pointerFrame = requestAnimationFrame(processPointerMove);
    };
    const onPointerDown = (event: PointerEvent) => {
      routeCallbacks.current.onManualCamera?.();
      if (event.button !== 0) return;
      if(routeCallbacks.current.onInspectionPoint){
        event.stopImmediatePropagation();renderer.domElement.focus({preventScroll:true});
        const ground=terrainPoint(hit(event.clientX,event.clientY,true));
        if(ground){const [x,y]=toWorld(ground.point);routeCallbacks.current.onInspectionPoint(x,y);}return;
      }
      if(propsRef.current.mode==='base'){
        const marker=hit(event.clientX,event.clientY,true).find(result=>result.object.userData.routeMarker)?.object.userData.routeMarker as ClearanceMarker|undefined;
        if(marker){event.stopImmediatePropagation();routeCallbacks.current.onRouteMarker?.(marker);return;}
      }
      if(inspectionRef.current?.enabled){
        event.stopImmediatePropagation();renderer.domElement.focus({preventScroll:true});
        const intersections=hit(event.clientX,event.clientY,true),groundHit=terrainPoint(intersections),direct=intersections.find(result=>entityId(result.object)&&(!groundHit||result.distance<=groundHit.distance));
        let id=direct?entityId(direct.object):undefined;
        if(!id){const rect=renderer.domElement.getBoundingClientRect();let best=20;
          for(const entity of [...entitiesRef.current,...placementPreviewRef.current]){
            const p=new THREE.Vector3(...entityPositionToScene([entity.position[0],entity.position[1],entity.position[2]+20],terrainRef.current,scaleRef.current)).project(camera);
            if(p.z<-1||p.z>1)continue;
            const distance=Math.hypot((p.x+1)*rect.width/2+rect.left-event.clientX,(1-p.y)*rect.height/2+rect.top-event.clientY);
            if(distance<best){
              raycaster.setFromCamera(new THREE.Vector2(p.x,p.y),camera);
              const ground=terrainMeshRef.current?raycaster.intersectObject(terrainMeshRef.current,false)[0]:undefined;
              const center=new THREE.Vector3(...entityPositionToScene([entity.position[0],entity.position[1],entity.position[2]+20],terrainRef.current,scaleRef.current));
              if(ground&&ground.distance+5*scaleRef.current<camera.position.distanceTo(center))continue;
              best=distance;id=entity.id;
            }
          }
        }
        inspectionRef.current.onSelect(id);return;
      }
      if (event.ctrlKey && transformControlsRef.current?.object) return;
      event.stopImmediatePropagation();
      renderer.domElement.focus({ preventScroll: true });
      const intersections = hit(event.clientX, event.clientY, propsRef.current.mode === 'base');
      const unitHit = intersections.find((result) => entityId(result.object));
      const ground = terrainPoint(intersections);
      if(ground&&propsRef.current.mode==='base'&&baseAnchorCallback.current){
        const [x,y]=toWorld(ground.point);baseDrag=[x,y];controls.enabled=false;renderer.domElement.setPointerCapture(event.pointerId);renderer.domElement.style.cursor='grabbing';baseAnchorCallback.current(baseDrag[0],baseDrag[1],false);return;
      }
      if (propsRef.current.mode === 'base' && unitHit) {
        const id = entityId(unitHit.object);
        if (!id) return;
        propsRef.current.onSelectEntity(id);
        if (event.shiftKey && ground) {
          const original = entitiesRef.current.find((entity) => entity.id === id);
          if (!original) return;
          unitDrag = {
            id,
            original: { ...original, position: [...original.position], rotation: [...original.rotation] },
          };
          controls.enabled = false;
          renderer.domElement.style.cursor = 'grabbing';
          renderer.domElement.setPointerCapture(event.pointerId);
          const [x, y] = toWorld(ground.point);
          previewUnitDrag(x, y);
        }
        return;
      }
      if (!ground) return;
      const [x, y] = toWorld(ground.point);
      if (propsRef.current.mode === 'terrain' && propsRef.current.terrainTool === 'landform') {
        propsRef.current.onTerrainStroke(x, y, 'start');
        return; // One placement per click: never repeatedly stamp pointer-move events.
      }
      if (propsRef.current.mode === 'base') {
        if (propsRef.current.selectedPlacementKey) propsRef.current.onPlace(x, y);
        else propsRef.current.onSelectEntity(undefined);
      } else {
        strokeRef.current = true;
        controls.enabled = false;
        renderer.domElement.setPointerCapture(event.pointerId);
        propsRef.current.onTerrainStroke(x, y, 'start');
      }
    };
    const endInteraction = (event: PointerEvent) => {
      if(baseDrag){flushPointerMove();const point=baseDrag;baseDrag=undefined;controls.enabled=true;renderer.domElement.style.cursor='';if(renderer.domElement.hasPointerCapture(event.pointerId))renderer.domElement.releasePointerCapture(event.pointerId);if(event.type!=='pointercancel')baseAnchorCallback.current?.(point[0],point[1],true);return;}
      if (unitDrag) {
        flushPointerMove();
        const completed = unitDrag;
        unitDrag = undefined;
        controls.enabled = true;
        renderer.domElement.style.cursor = '';
        if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
        if (event.type === 'pointercancel' || !completed.last) {
          const holder = holderForEntity(completed.id);
          if (holder) positionEntityHolder(holder, completed.original, terrainRef.current, scaleRef.current);
        } else {
          propsRef.current.onMoveEntity(completed.id, completed.last[0], completed.last[1]);
        }
        invalidateRef.current(true);
        return;
      }
      if (!strokeRef.current) return;
      flushPointerMove();
      strokeRef.current = false;
      controls.enabled = true;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
      propsRef.current.onTerrainStroke(0, 0, event.type==='pointercancel'?'cancel':'end');
      invalidateRef.current(true);
    };
    const onLeave = () => {
      if (unitDrag || baseDrag) return;
      if (brushRef.current) brushRef.current.visible = false;
      placementRootRef.current.visible = false;
      publishCursor(undefined);
      invalidateRef.current();
    };
    const onContextMenu = (event: MouseEvent) => event.preventDefault();
    const onStampWheel = (event: WheelEvent) => {
      routeCallbacks.current.onManualCamera?.();
      if (!event.altKey || propsRef.current.mode !== 'terrain' || propsRef.current.terrainTool !== 'landform') return;
      event.preventDefault(); event.stopImmediatePropagation();
      propsRef.current.onRotateStamp?.(event.deltaY);
    };
    renderer.domElement.addEventListener('wheel', onStampWheel, { capture: true, passive: false });
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown, true);
    renderer.domElement.addEventListener('pointerup', endInteraction);
    renderer.domElement.addEventListener('pointercancel', endInteraction);
    renderer.domElement.addEventListener('pointerleave', onLeave);
    renderer.domElement.addEventListener('contextmenu', onContextMenu);
    return () => {
      if (pointerFrame) cancelAnimationFrame(pointerFrame);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown, true);
      renderer.domElement.removeEventListener('pointerup', endInteraction);
      renderer.domElement.removeEventListener('pointercancel', endInteraction);
      renderer.domElement.removeEventListener('pointerleave', onLeave);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      renderer.domElement.removeEventListener('wheel', onStampWheel, true);
      renderer.domElement.style.cursor = '';
    };
  }, [terrain.worldHeight, terrain.worldWidth]);

  const selectedTransformLocked = Boolean(
    selectedEntityId && entities.some((entity) => entity.id === selectedEntityId && hasLockedAltitudeAndRotation(entity)),
  );

  return (
    <div className="terrain-viewport" ref={containerRef}>
      {lanePathControls&&lanePathControls.points.length>=2&&<LanePathOverlay value={lanePathControls} camera={cameraRef} mesh={terrainMeshRef} terrain={stampSurface??terrain} scale={scaleRef.current}/> }
      {mode === 'terrain' && terrainTool === 'landform' && stampError && <div role="alert" data-stamp-error style={{ position: 'absolute', top: 60, left: 16, right: 16, maxWidth: 650, zIndex: 30, pointerEvents: 'none', padding: '12px 16px', border: '1px solid #c76848', borderRadius: 6, background: 'rgba(45, 20, 16, .96)', color: '#ffd6c6', fontSize: 14 }}><strong>Cannot place terrain stamp</strong><div style={{ marginTop: 5 }}>{stampError}</div></div>}
      <div className="viewport-badges" aria-hidden="true">
        <span>3D PERSPECTIVE</span>
        <span>ORIGINAL TEXTURES</span>
        {stampSurface && <span>{terrainTool==='lane'?'LANE':'STAMP'} SURFACE PREVIEW · NOT APPLIED</span>}
        {mode === 'base' && placementPreview.length > 0 && (
          <span className="placement-preview-badge">PLACEMENT PREVIEW · {placementPreview.length} {placementPreview.length === 1 ? 'UNIT' : 'UNITS'}</span>
        )}
        {mode === 'base' && selectedEntityId && (
          <span className="transform-preview-badge">HOLD CTRL · {selectedTransformLocked ? 'XY MOVE · Z + ROTATION LOCKED' : transformMode === 'translate' ? 'XYZ MOVE' : 'PITCH / ROLL / YAW'}</span>
        )}
      </div>
      <details className="viewport-help">
        <summary>View controls</summary>
        <dl>
          <dt>Orbit / zoom</dt><dd>Right-drag / mouse wheel</dd>
          <dt>Pan / turn</dt><dd>WASD / arrow keys</dd>
          <dt>Zoom / reset</dt><dd>Q/E or +/− / Home</dd>
          <dt>{mode === 'base' ? 'Place / select' : 'Use brush'}</dt><dd>Left mouse button</dd>
          {mode === 'base' && <><dt>Move building</dt><dd>Shift-drag</dd><dt>Transform handles</dt><dd>Hold Ctrl</dd></>}
          <dt>Cancel placement</dt><dd>Escape</dd>
        </dl>
      </details>
    </div>
  );
}
