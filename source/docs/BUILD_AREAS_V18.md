# Build areas and reserved space — v18

Private R4/R6 foundation for authored boundaries, entrances and courts. These are layout-specific rectangular constraints, not route/pathfinding or gameplay guarantees.

## Author a rectangle

Open Base builder → **Build areas and reserved space**. Set a name, purpose, team and rectangle:

- **Build inside** (blue): matching buildings must fit inside this rectangle using a conservative circle around their footprint.
- **Keep clear** (orange): matching buildings cannot overlap this rectangle. Use it to reserve an entrance, straight connection strip or courtyard.
- Team can be 1, 2, neutral or all teams. Rules apply to every matching non-metadata structure in this layout, not just the current selection.
- X/Y is the corner with the smaller coordinates. Width/height are full extents in world units; rectangles must fit inside the map.

**Preview build area** draws the outline and checks current buildings without changing the map. Editing a field hides the old preview so it cannot be mistaken for the new values. **Apply build area** validates and saves the rule in one map Undo step. Preview is optional; Apply always validates. **Hide area preview** hides the temporary outline while saved rules remain visible and enforced.

Click a saved name to edit that record. Apply updates it; Create another area changes the next Apply to an addition. Remove area removes only that rule and is undoable. Up to 50 rules are supported per layout. Conflicts report the area and building involved; buildings are never moved or removed to make a rule fit.

## Enforcement and visualization

Rules persist in `forge.build-areas.v1` layout metadata and ordinary map exports. The shared authoring guard checks proposed editor transactions and MCP edits, alongside district locks. It also checks inactive layouts against their own buildings. Rules cannot disappear through an unrelated edit or generated replacement; edit/remove them explicitly in the panel first.

Each layout owns its own rules. A separate newly created layout does not inherit another layout's areas automatically. New/open/import/load map operations remain whole-document operations, and Undo/Redo restore historical constraints. Rectangles do not travel inside individual saved district modules.

Overlapping Build inside rules all apply: their intersection is the permitted space for matching buildings. Multiple Keep clear rectangles combine their excluded space. Rectangles reserve building space only; they do not flatten or freeze terrain, verify drivability, reserve a slope, or protect a connection from steep terrain edits. Use district locks for supporting heights and inspect routes separately.

Outlines follow terrain height and do not intercept mouse picking. They obey Display options → Show display overlays / Building area circles. Hiding display overlays does not disable constraints. Building placement ghosts retain their existing behavior; the final transaction checks these rules before committing, even if a ghost is visible at a conflicting location.

The geometry check uses a conservative circular bound around the structure footprint. It may reject a tight fit that a detailed collision mesh would accept. It is not a measured vehicle clearance or game collision result. Start with generous entrances and test in-game separately.

## Verification

Source tests cover metadata/schema validation, team scope, footprint containment, clear-space conflict, rejected MCP movement, inactive layouts and explicit constraint removal. Native acceptance exercises preview without revision change, Apply with one Undo step, blocked MCP placement, exported rule metadata, Remove and Undo. Broader terrain, base/library and randomized-map workflows run on the same executable.

```powershell
node tools/test-product-baseline.mjs dist/desktop/build-areas-v18-release/WulframForge.exe outputs-stamp-lab-IdQbRb/Landform-visual-lab.zip --districts
```

Rotated/polygonal areas, direct drawing handles, district connection sockets, partial rerolls respecting authored routes, and the complete R4/R6 journey remain open.

## Accepted private build

- Executable: `dist/desktop/build-areas-v18-release/WulframForge.exe`, version `0.7.0-creative.18`.
- SHA-256: `77DAEB5A5D685DB1C23C7CB3CD60F3126C6F2F0391A92FB9E081A5E17DF8242B`.
- Aggregate: `outputs/product-baseline-o6zdmB/report.json` — all five stages passed.
- Source tests: 245 total, 244 passed, one existing fixture skip; TypeScript and scoped lint passed.
- Combined terrain native receipt: `outputs-desktop-test-gUcyTF/report.json`.
- Native base/library/area receipt: `outputs/creative-native-fj5gEz/report.json`.
- Random-map native receipt: `outputs-desktop-test-tkC96P/report.json`.
- Reviewed panel and outline screenshot: `outputs/creative-native-fj5gEz/build-area-preview.png`.
- Exported area fixture: `outputs/mcp-exports/area-test-1788750838820.zip`.

The initial candidate failed native Apply because sibling panels shared a React key (`outputs/product-baseline-9BXu3c/report.json`). The release uses a distinct area-panel key, and the native suite asserts that only one panel exists after import and workshop edits. Out-of-map rectangles are rejected before preview rendering; imported out-of-map outlines are also omitted. The intermediate `build-areas-v18` and `build-areas-v18-final` folders are not the accepted build.

Existing large-bundle and WindowsBase build warnings remain. Editor acceptance does not establish gameplay or novice-user acceptance; the full roadmap remains active.

