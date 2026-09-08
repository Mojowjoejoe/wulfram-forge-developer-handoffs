export const BRUSH_LIBRARY_KEY = 'forge-manual-brushes-v1';
export interface BrushSettings {
  tool: 'sculpt' | 'lower' | 'level' | 'smooth' | 'paint' | 'stamp';
  radius: number; strength: number;
  shape: 'round' | 'square' | 'diamond'; falloff: 'soft' | 'linear' | 'hard';
  targetHeight: number; texture: string;
}
export interface SavedBrush { name: string; settings: BrushSettings }
export function readBrushLibrary(raw: string): SavedBrush[] {
  if (raw.length > 200000) throw new Error('Brush library exceeds 200 KB.');
  const value = JSON.parse(raw);
  const entries = Array.isArray(value) ? value : value?.format === 'wulfram-brush-library' && value.version === 1 ? value.entries : undefined;
  if (!Array.isArray(entries) || entries.length > 30) throw new Error('Use a version 1 brush library with at most 30 entries.');
  const names = new Set<string>();
  return entries.map(entry => {
    if (typeof entry?.name !== 'string' || !entry.name.trim() || entry.name.trim().length > 60 || names.has(entry.name.trim())) throw new Error('Brush names must be unique and contain 1–60 characters.');
    names.add(entry.name.trim());
    const s = entry.settings;
    if (!s || !['sculpt','lower','level','smooth','paint','stamp'].includes(s.tool) || !['round','square','diamond'].includes(s.shape) || !['soft','linear','hard'].includes(s.falloff)) throw new Error('Invalid brush tool, shape or edge profile.');
    for (const [key,min,max] of [['radius',25,600],['strength',1,100],['targetHeight',-5000,5000]] as const) if (!Number.isFinite(s[key]) || s[key] < min || s[key] > max) throw new Error(`Invalid brush ${key}.`);
    if (typeof s.texture !== 'string' || !s.texture || s.texture.length > 120) throw new Error('Invalid brush texture name.');
    return {name: entry.name.trim(), settings: {tool:s.tool,radius:s.radius,strength:s.strength,shape:s.shape,falloff:s.falloff,targetHeight:s.targetHeight,texture:s.texture}};
  });
}
export function saveBrush(current: SavedBrush[], entry: SavedBrush, replaceName?: string): SavedBrush[] {
  const entries = readBrushLibrary(JSON.stringify(current));
  const next = readBrushLibrary(JSON.stringify([entry]))[0];
  if (replaceName !== undefined && !entries.some(e => e.name === replaceName)) throw new Error('Selected brush no longer exists.');
  if (entries.some(e => e.name === next.name && e.name !== replaceName)) throw new Error('That name is already saved. Select it and use Update, or choose a different name.');
  return readBrushLibrary(JSON.stringify(replaceName === undefined ? [...entries,next] : entries.map(e => e.name === replaceName ? next : e)));
}
export function mergeBrushLibraries(current: SavedBrush[], incoming: SavedBrush[]): SavedBrush[] {
  let merged = readBrushLibrary(JSON.stringify(current));
  for (const entry of readBrushLibrary(JSON.stringify(incoming))) {
    const existing = merged.find(e => e.name === entry.name);
    if (existing && JSON.stringify(existing) === JSON.stringify(entry)) continue;
    merged = saveBrush(merged,entry);
  }
  return merged;
}
