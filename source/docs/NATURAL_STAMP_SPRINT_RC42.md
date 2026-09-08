# Natural terrain stamp sprint — RC42

Private unsigned release: `dist/desktop/WulframForge-0.7.0-rc.42-win-x64-self-contained.zip`.
SHA256: `db569dd740d4a58b5eed25bff249c1249d181356b744768aa0ace39772735bb1`.

## Delivered

1. Natural variation, peak roughness and curve/bend controls for the existing ridge, valley, crater and saddle presets. Seeded smooth modulation changes their interior relief; all changes stay inside the existing elliptical footprint and amplitude bounds. This is procedural variation, not geological erosion or arbitrary terrain copy/paste.
2. Edge blending adds a stronger taper into the existing ground without changing the rest of the map. Existing edge profile remains available. This does not smooth unrelated terrain or automatically repair paths.
3. Variation seed and New shape variation button. The button changes only the seed, retaining length, width, rotation, height and shape-control limits. Nonzero variation/roughness/bend is needed for visible seed changes. New sessions start with modest natural settings; legacy presets omit them and retain their old shape exactly.
4. Optional rock, ice or snow textures drawn from supported original assets. Keep existing textures is the default. Coverage controls which stronger portions of the stamp are painted. Corner-based native painting retains texture blending and rotational symmetry. Painting is skipped where neighboring cell corners touch protected reserves; actual coverage may be less than requested.

The live wireframe previews geometry only, not the chosen texture. Texture selection is applied with the stamp and undone in the same history step. Original materials are cosmetic and do not add slippery surfaces, damage or collision behavior.

All settings save in named presets and stamp provenance. Loading an older preset clears newer optional settings instead of leaking settings from the previously selected preset. Protected/Manual modes and blocked-placement alerts remain; applying recomputes against current terrain.

## Verification

- TypeScript and scoped lint passed.
- Nine stamp tests passed: seeded variation, mirroring, bounds, independent dimensions, legacy behavior, blending containment, optional textures, exact no-paint mode, source preservation and protection rejection.
- Main suite and six critic/replacement regressions passed.
- Packaged Windows UI passed in `outputs-desktop-test-XmjlvC/report.json`: all new controls, New shape variation retaining dimensions, ice selection and actual texture changes, blocked-click preservation, two placements, Undo/Redo, presets and restart recovery. No renderer errors. Preview screenshot inspected.

Use Terrain → 3D stamp brush → Natural shape and blending / Stamp textures. Revalidate traversal and playtest after edits. Existing bundle-size and WindowsBase build warnings remain. No public publishing or original map-source overwrites.
