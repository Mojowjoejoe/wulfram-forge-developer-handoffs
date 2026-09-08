export interface ToolDestination {
  id:string;label:string;keywords:string;mode?:'terrain'|'base';
  tool?:'sculpt'|'lower'|'level'|'smooth'|'paint'|'stamp'|'landform'|'lane';
  selector?:string;action?:'library'|'random'|'stamp-dialog';savedLayout?:boolean;inspection?:boolean;
}
export const TOOL_DESTINATIONS:ToolDestination[]=[
  {id:'display-options',label:'Display options',keywords:'view grid overlays power tint icons circles darklight turret visibility',selector:'.shared-display-options'},
  {id:'heightmap-import',label:'Heightmap import settings',keywords:'grayscale black white image smoothing gamma midpoint import',mode:'terrain',selector:'.heightmap-import-controls'},
  {id:'coordinate-stamp',label:'Stamp at coordinates',keywords:'precise numeric center position terrain landform',mode:'terrain',action:'stamp-dialog'},
  {id:'layout-metadata',label:'Advanced layout metadata',keywords:'raw data keys values state settings',mode:'base',selector:'.layout-advanced',savedLayout:true},
  {id:'raise',label:'Raise terrain',keywords:'sculpt height brush',mode:'terrain',tool:'sculpt',selector:'[aria-label="Terrain brush settings"]'},
  {id:'terrain-measurement',label:'Measure terrain size and slope',keywords:'height relief grid spacing steepness dimensions region',mode:'terrain',tool:'sculpt',selector:'.terrain-measurement-panel'},
  {id:'brush-library',label:'Save and reuse manual brushes',keywords:'preset radius strength shape texture library',mode:'terrain',tool:'sculpt',selector:'.brush-library-panel'},
  {id:'brush-selection',label:'Select a terrain brush region',keywords:'rectangle mask restrict sculpt paint selection',mode:'terrain',tool:'sculpt',selector:'.terrain-selection-panel'},
  {id:'lower',label:'Lower terrain',keywords:'dig depression brush height',mode:'terrain',tool:'lower',selector:'[aria-label="Terrain brush settings"]'},
  {id:'flatten',label:'Flatten terrain',keywords:'level flat pad brush',mode:'terrain',tool:'level',selector:'[aria-label="Terrain brush settings"]'},
  {id:'smooth',label:'Smooth terrain',keywords:'soften slopes brush',mode:'terrain',tool:'smooth',selector:'[aria-label="Terrain brush settings"]'},
  {id:'paint',label:'Paint textures',keywords:'surface material original textures brush',mode:'terrain',tool:'paint',selector:'.texture-library'},
  {id:'height',label:'Set exact terrain height',keywords:'numeric elevation flat brush',mode:'terrain',tool:'stamp',selector:'.height-stamp-controls'},
  {id:'lane',label:'Draw a terrain lane',keywords:'road path trench cut mountain floor width shoulder',mode:'terrain',tool:'lane',selector:'.terrain-lane-panel'},
  {id:'landforms',label:'Large landforms and saved stamps',keywords:'ridge valley mountain large brush shapes mirror stamp library',mode:'terrain',tool:'landform',selector:'[aria-label="3D stamp controls"]'},
  {id:'terrain-compositions',label:'Compose and reuse landforms',keywords:'composition recipe saved terrain multi ridge valley library',mode:'terrain',tool:'landform',selector:'.terrain-composition-panel'},
  {id:'library',label:'Open base preset library',keywords:'presets styles favorites portable import export',mode:'base',action:'library'},
  {id:'random',label:'Generate a balanced map',keywords:'random seeds passing search terrain base',action:'random'},
  {id:'authored-bases',label:'Capture and reuse authored bases',keywords:'both teams complete layout portable import export placement preview rules reservations',mode:'base',selector:'.authored-base-panel',savedLayout:true},
  {id:'districts',label:'Edit and lock districts',keywords:'group select move rotate duplicate mirror buildings workshop',mode:'base',selector:'.district-panel',savedLayout:true},
  {id:'areas',label:'Build areas and reserved corridors',keywords:'boundary entrance courtyard keep clear protect terrain routes',mode:'base',selector:'.build-area-panel',savedLayout:true},
  {id:'relationships',label:'District distance relationships',keywords:'minimum maximum spacing centers connections',mode:'base',selector:'.district-relationships-panel',savedLayout:true},
  {id:'arrangements',label:'Preview district arrangements',keywords:'partial reroll seed fixed paired reposition',mode:'base',selector:'.district-arrangement-panel',savedLayout:true},
  {id:'inspection',label:'Inspect power and routes',keywords:'coverage darklight turret repair power cells clearance',mode:'base',selector:'[aria-label="Route inspection"]',inspection:true},
  {id:'about',label:'Build identity and recovery help',keywords:'version about save export backups supported files formats',selector:'.about-editor'},
];
export function findTools(query:string){
  const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return TOOL_DESTINATIONS.filter(tool=>terms.every(term=>`${tool.label} ${tool.keywords}`.toLowerCase().includes(term)));
}
