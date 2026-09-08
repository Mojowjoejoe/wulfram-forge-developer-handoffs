export const DISPLAY_PREFERENCES_KEY = 'wulfram-forge-display-v1';
export const defaultDisplayPreferences = {
  powerTint: true, powerIcons: true, showAccessPaths: true, showGrid: true,
  coverage: { power: true, darklight: false, turrets: false },
  displayOptions: { overlays: true, boundaries: true, areas: true, entrances: true, links: true, routes: true, markers: true },
};
export type DisplayPreferences = typeof defaultDisplayPreferences;

/** Whitelist booleans; ignore unknown fields and recover malformed storage. */
export function parseDisplayPreferences(raw: string | null): DisplayPreferences {
  const result = structuredClone(defaultDisplayPreferences);
  try {
    const input = JSON.parse(raw ?? '{}');
    if (!input || typeof input !== 'object' || Array.isArray(input)) return result;
    for (const key of ['powerTint', 'powerIcons', 'showAccessPaths', 'showGrid'] as const) {
      if (typeof input[key] === 'boolean') result[key] = input[key];
    }
    // Older profiles used the boundary toggle for both circles and authored areas.
    if (typeof input.displayOptions?.areas !== 'boolean' && typeof input.displayOptions?.boundaries === 'boolean') result.displayOptions.areas = input.displayOptions.boundaries;
    for (const group of ['coverage', 'displayOptions'] as const) {
      for (const key of Object.keys(result[group])) {
        if (typeof input[group]?.[key] === 'boolean') (result[group] as Record<string, boolean>)[key] = input[group][key];
      }
    }
  } catch { /* Invalid preferences fall back to defaults without affecting projects. */ }
  return result;
}
