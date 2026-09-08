# Authored connection corridors — v19

Private R4/R6 continuation of [build areas](BUILD_AREAS_V18.md). This adds bent building-clearance reservations, not road generation, connection sockets or automatic driving validation.

## Reserve a connection

Open Base builder → Build areas and reserved space. Choose **Connection corridor**, name it, choose a team scope, and enter the full width in world units. Enter one `X, Y` pair per line, in travel order. Use 2–32 points; consecutive points must differ. For example:

```text
4000, 400
4500, 400
4500, 900
```

Preview build area draws the magenta reservation without changing the map. Every segment reserves a rounded strip of the specified full width. Segment strips overlap at bends; their union is protected. The entire reservation, including round end caps, must fit within the map. Invalid/out-of-map data is rejected before drawing.

Apply build area validates existing buildings, then saves the corridor in one Undo step. Later placements or edits that overlap it are rejected for the chosen team scope. End a corridor beside a service entrance rather than at the building's center: service buildings are not exempt from the reservation.

Click a saved corridor to edit its points, width, team or name; Apply updates the same record. Undo restores its previous values. Remove area removes the rule without changing buildings. Existing rectangle controls and their behavior remain available.

## Scope and compatibility

Corridors are stored in the active layout's `forge.build-areas.v1` metadata as `kind: "corridor"`, full `width`, and ordered `points`. Existing rectangle records retain their original schema. v19 is required to edit maps containing corridors; older editors that validate this metadata reject the unfamiliar kind. Ordinary project/map exports preserve the points and width. These are editor constraints, not server gameplay rules.

Like rectangles, corridors are fixed in world coordinates and belong to a layout. Moving a district does not move a corridor or change its endpoints. New independent layouts do not automatically inherit the old layout's corridors. Whole-document Open/New/Import and historical Undo/Redo retain their established semantics.

Building checks use exact point-to-segment distance against conservative circular building footprints plus half the corridor width. Outlines represent the same segment reservations with sampled terrain-following lines. This is neither precise model collision nor a vehicle navigation proof. Terrain can still be steep or obstructed by terrain geometry: corridors do not flatten, grade, lock heights, or provide automatic camera tours. Inspect terrain and perform driving trials separately.

Direct point picking/dragging, district-bound connection endpoints, slope/route constraints, partial rerolls and full authoring acceptance remain open. The new control is numeric/text authoring with preview and transactional enforcement.

## Verification

Source tests cover widths, bends, round ends, team scope, invalid/duplicate points, bounds and agreement between outline samples and segment distance. Native acceptance covers preview without revision change, saved bent corridor, blocked placement at a bend, width editing and Undo, exported points/width, and removal through Undo. Existing rectangular constraints, district editing, locks, portable libraries, terrain workflows and randomized maps run on the same build.

```powershell
node tools/test-product-baseline.mjs dist/desktop/corridors-v19/WulframForge.exe outputs-stamp-lab-IdQbRb/Landform-visual-lab.zip --districts
```

## Accepted private build

- Executable: `dist/desktop/corridors-v19/WulframForge.exe`, version `0.7.0-creative.19`.
- SHA-256: `2DC19368EC18CE1376EE0D12359F71C805C565CEF49BA0BF6740345D1E4D406E`.
- Aggregate: `outputs/product-baseline-Q1VZri/report.json` — all five stages passed.
- Source tests: 246 total, 245 passed, one existing fixture skip; TypeScript and scoped lint passed.
- Combined terrain native receipt: `outputs-desktop-test-wCwjUW/report.json`.
- Native base/library/corridor receipt: `outputs/creative-native-1gtoiF/report.json`.
- Native random-map receipt: `outputs-desktop-test-7mP69t/report.json`.
- Reviewed corridor screenshot: `outputs/creative-native-1gtoiF/corridor-preview.png`.
- Exported fixture: `outputs/mcp-exports/corridor-test-1788751527292.zip`.

Existing large-bundle and WindowsBase build warnings remain. The full roadmap remains active; editor checks do not establish driving, game-balance or novice-user acceptance.
