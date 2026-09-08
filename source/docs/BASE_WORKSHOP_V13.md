# Base Workshop: named districts and group transforms — v13

Private R4 foundation sprint. This adds building-set editing; it does not complete the entire district designer.

Open **Base builder**, then expand **Base Workshop · districts** in the right inspector. The workshop edits saved buildings and is hidden while a generated formation preview is active.

## Workflow

1. Filter the building list by team or text, select individual checkboxes, or select all listed buildings. “Add focused building” adds the ordinary single selection. Selected buildings receive viewport rings.
2. Enter relative X/Y movement in world units and rotation in degrees. Rotation uses the selection's mean X/Y position. Click **Transform selection** to apply all three values together.
3. **Duplicate selection** applies the same movement/rotation to new copies, assigns unique IDs and selects the copies. Copies do not automatically become a named district; save them as one if desired.
4. Enter a name and choose **Save named district**. This records membership in the active layout. Selecting the named record restores that exact selection. Removing a district record leaves its buildings intact.
5. Map Undo reverses each transform, duplication, district save or district removal in one step. Named membership is included in ordinary project/map exports.

The selection affects exactly the chosen buildings; other teams and inactive layouts are not implicitly mirrored or moved. Each building conforms to the terrain using existing editor rules. Structures with locked rotation reject a group rotation; their established altitude constraints remain in force. A group move that puts any center outside the map is rejected before committing. Invalid fitting and duplicate generated IDs also reject the operation without altering source entities.

Selection IDs that disappear after Undo or deletion no longer count as selected or receive highlights. Selecting a saved district with missing members shows an error rather than silently editing the surviving subset. Up to 100 district records and 500 members per saved record are supported.

## Scope and remaining work

This is list-based multi-selection plus named membership and numeric group transforms. Box/lasso selection, direct group gizmos, locks, alignment, reusable district modules, cross-map district libraries, district-level rerolls and the full R4 acceptance journey remain open. The group bounds check uses structure centers. Collision footprints, power, service access and gameplay validity still need inspection; the operation does not certify them.

## Verification

Unit tests cover rigid X/Y spacing and yaw, per-structure terrain fitting, preservation of unrelated entities, unique duplicate IDs, missing selection, bounds rejection, locked rotations, invalid fitting and district metadata validation.

The native acceptance extension selects two power cells, saves a named supply yard, translates and rotates it, checks that other buildings are unchanged, duplicates it, checks IDs and Undo counts, restores the original buildings, and exports the named membership. Existing library/portability, creative layouts, hybrid landform/save/restart and randomized-map checks run on the same executable.

```powershell
node tools/test-product-baseline.mjs dist/desktop/base-workshop-v13-final/WulframForge.exe outputs-stamp-lab-IdQbRb/Landform-visual-lab.zip --districts
```

The prior local fixtures and MCP SDK are required. Native results and exact artifact identity are recorded below after acceptance. No public publishing, remote push, or gameplay verification is implied.

## Accepted private build

- Version: `0.7.0-creative.13`
- Executable: `dist/desktop/base-workshop-v13-final/WulframForge.exe`
- SHA-256: `C280EC9C16142632AF6DFA228D838C7B79F6A80EEC3215A6FCD58541D668C9D8`
- Aggregate receipt: `outputs/product-baseline-4dKp9X/report.json` — all five stages passed.
- Source tests: 233 total, 232 passed, one existing fixture skip; no failures. Typecheck and scoped lint passed.
- Combined landforms native receipt: `outputs-desktop-test-6CR1Kz/report.json`.
- Creative, portable library and district native evidence: `outputs/creative-native-Q7qW5D`.
- Workshop screenshot: `outputs/creative-native-Q7qW5D/district-workshop.png`.
- Randomized maps native receipt: `outputs-desktop-test-AREkXY/report.json`.

This verifies the private editor build and tested workflows. Gameplay/server acceptance and novice-user evidence remain separate roadmap gates.
