# Rocky terrain detail v1

Status: private RC16 candidate; native visual acceptance and live-game testing pending.

## Workflow

Apply a balanced generated map, then choose **Terrain detail** in the top toolbar.
Choose a detail seed, rock texture, requested cluster pairs (1–60), radius (80–400
world units), and maximum added height (5–2000). **Boost height · 1,000 u** sets
the height to 1000 without changing the seed or footprint; **Reset height · 65 u**
restores ordinary detail height. Both invalidate the previous preview. These are
steep heightfield formations, not vertical walls or whole-map elevation scaling.
Above 150 units the UI warns about access/balance risks; no checks are bypassed.
Preview shows raised vertices in
orange and the base anchors in red/blue. Only a nonempty candidate passing the
offline analysis can be applied. Editing an input invalidates the preview.
Apply records one ordinary project-history step; Undo/Redo and local/ZIP saves use
the existing project workflow. Preview alone does not alter the project.

This version is one pass: undo before replacing it. Regenerating the underlying
balanced terrain clears the old detail identity. Saved `terrainDetail.settings`
records version and inputs, not a reusable trust certificate or a base-terrain
snapshot. Reopen preserves the resulting terrain but not the session undo stack.

## Placement rules

- Deterministic seeded elliptical outcrops, tapered to zero at their boundary.
- Exact 180-degree height and texture-cell partners.
- Reserve generated route corridors using the existing route field, the center,
  650-unit base-anchor zones, map edges, and an interpolation halo.
- Reserve every active, neutral, and inactive-layout structure using conservative
  model-bound radii plus 300 units and the halo. Unknown model bounds or opaque
  decoration records reject generation. Preserve all entity coordinates.
- Reject an entire cluster if its sampled footprint intersects a protected zone.
  Density is a request, not a promise; insufficient room yields fewer clusters.
- Paint existing sandrock, marsrock, rockwall, or snowrocks texture cells around
  the raised ground. No external art, trees, ruins, or invented object records.
- Clear known generator/base/combat analysis metadata rather than attaching old terrain reports.
  Recompute active-project traversal, symmetry, pairing and placement analysis.

The symmetry validator now uses packed texture-cell stride, compares actual
texture layers with rotated corner masks, and ignores unused land trailing slots.
This corrects the old vertex-indexed texture comparison.

## Limits and remaining work

Route protection follows saved generated topology, not newly hand-authored paths.
Offline clearance is sampled terrain clearance, not vehicle or weapon simulation.
Mirrored formations can still alter cover, sight lines and combat pacing. Inactive
layout structures are protected but their gameplay routes are not separately
analyzed. Very small grids can make formations coarse. Texture patches currently
use full-cell rock coverage; natural feathered transitions are future polish.

Browser workflow and source tests passed for RC15; the RC16 height-button addition
has automated regression coverage. A private RC16 EXE package is available
in `dist/desktop/WulframForge-0.7.0-rc.16-win-x64-self-contained.zip`. Extract the
whole ZIP before running `WulframForge/WulframForge.exe`. It is unsigned and needs
Edge WebView2; native visual acceptance remains pending. RC14 is retained. No public
publication, signing, custom model support, or live match balance is claimed.

## Verification (2026-09-05)

RC16: 106 tests passed, one existing skip; typecheck/lint/build pass. Height boost
retains cluster positions, textures, unchanged protected vertices and entity
coordinates; the 1000-unit combat-trial candidate passes the offline gates.
2000-unit input is finite and retains the ordinary rejection gate. New buttons
have not yet been exercised in the native EXE. ZIP CRC and EXE parity pass.
RC16 SHA-256: `41f6505019552f604fffb5e932fe275fa3631fc11e98e41c6617a23cc1d37041`.

RC15 baseline verification:

- Full suite: 105 passed, one existing skip; typecheck and lint pass.
- Desktop web bundle builds (existing large-chunk warning).
- RC15 native package built with the existing WindowsBase reference warning.
  ZIP CRC and packaged EXE parity passed. Authenticode status: NotSigned.
  SHA-256: `a42081ff22f7a2b09139992c8be4f1da96825ac3529b554cd585a2456f19cc03`.
- New tests: determinism, changed seed, source immutability, entity preservation,
  protected routes/base/center/edges, paired texture cells including blend corners,
  ZIP project/native land roundtrip, invalid inputs, no stacking, dimension and
  symmetry rejection, six terrain seed/preset combinations.
- Browser: Combat Trial candidate with defaults placed 18/18 pairs, changed 1544
  vertices and 1368 cells; offline PASS, zero placement errors/warnings. Changing
  radius to 160 invalidated Apply; fresh preview changed 1236 vertices/1024 cells,
  then Apply, Undo and Redo were exercised through the UI. Save local/reopen restored
  the project and the single-pass guard correctly rejected stacking.
