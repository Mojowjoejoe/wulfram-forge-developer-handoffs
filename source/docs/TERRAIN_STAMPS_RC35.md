# Terrain controls and stamps — RC35

Private unsigned Windows build: `dist/desktop/WulframForge-0.7.0-rc.35-win-x64-self-contained.zip`.
SHA256: `ca29a7add3c626cfaca82c0f5cf6d0da0881351412357c91222c1055203b29b7`.

## Random terrain designer

Open Terrain detail. Added width ratio (0.2–1), rotation (−180–180 degrees), and edge profile (1 broad–6 concentrated). Leave width blank for the original seeded widths. Existing height/depth ranges, modes, seeds, protections and full candidate checks remain. Optional controls are stored and replayed; old settings retain their previous defaults and random sequence.

## Manual terrain stamps

Open Terrain tab → Terrain stamps, beside the manual terrain tools. Choose ridge, valley, crater or saddle. Configure radius 80–2,000 units, width ratio 0.2–1, rotation, height/depth scale 5–2,000 units and edge profile. Click the top-down map to position, use arrow keys on the map, or enter Center X/Y. The preview updates automatically; orange raises and blue lowers. Optional 180-degree partner is enabled by default. Apply after acknowledging this is a manual edit. Undo/redo restores complete project snapshots.

This first version is a procedural preset library with single-placement preview, not continuous drag painting, captured terrain copy/paste, or external stamp-file import. Existing textures remain unchanged. Radius is a half-size; height/depth is a scale rather than guaranteed sampled peak. Mirrored overlaps are averaged, not double-height.

Stamp placement rejects map-edge truncation, sub-grid narrow features, invalid numbers, and edits within structure reserves in active/inactive layouts. Untouched terrain retains its original precision. Stamps do NOT enforce authored route/center reserves or certify gameplay balance: they are manual sculpting. They can change access and sightlines; revalidate/playtest. Cached analysis is cleared, and metadata explicitly marks manual revalidation required. A stamp after generated detail causes safe detail replacement to reject rather than discard that manual work.

Source Power Run and Ice ZIPs were not modified. Desktop tests use isolated copies/profiles.

## Verification

- Main test suite: 111 passed, one existing skip.
- Four stamp unit tests; two valley tests; six critic/replacement regressions passed.
- TypeScript and scoped lint passed.
- RC34 native stamp UI passed preview, rotation input, apply, unchanged entities/textures, undo, redo, save and process restart: `outputs-desktop-test-XY7dg2/report.json`.
- RC34 native valleys/mixed replacement workflow passed: `outputs-desktop-test-2aipa4/report.json`.
- RC35 corrects stamp preview aspect ratio and preserves full precision outside stamp footprints. Final native stamp preview/apply/undo/redo/save/restart passed: `outputs-desktop-test-zOi78u/report.json`.

Existing large-bundle and WindowsBase build warnings remain. No in-game balance claim. No public release or repository push performed.
