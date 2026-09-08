# Preview district arrangements — v25

R6 continuation: bounded deterministic translation of explicitly eligible named districts. This is a working preview/Apply path, not the complete composition solver.

## Workflow

Give the districts you want to move **Allow reposition preview** in Base Workshop. Keep service districts fixed or locked. Open Preview district arrangements, enter a seed and maximum center movement of 10–800 world units, and Preview arrangements. The search yields between attempts and can be canceled. It tries at most 24 candidates and returns up to three passing options.

Each district shifts as a whole, retaining internal XY spacing and headings. Terrain fitting updates the moved buildings' heights/tilts through the existing manual fitting function. Untargeted building records, teams, counts and terrain remain unchanged. There is no automatic mirrored-team edit. The overhead cards share map coordinates: cyan marks moved centers and gray marks fixed centers; dots are not footprint/collision geometry. Apply one option for one map Undo step. Changing the map, fitting context, seed or radius invalidates the preview. Cancel leaves the map unchanged.

## Checks and failure handling

Only v24-eligible groups participate. Missing membership, fixed/shared membership and locks take precedence; overlapping eligible groups are rejected to avoid moving one building twice. Missing moving models reject. Each attempted placement checks moved footprint bounds, the existing project validator (including power, spacing and slope), authored constraints and sampled service access. Whole-project validation errors can make every candidate fail. The UI groups failed attempts by their reason; no failed candidate enables Apply.

The random kernel is version 1, uses the seed and distance, and shifts centers between 25% and 100% of that distance. Actual terrain fitting depends on the current map and fitting context. Applied metadata `districtArrangement.last` records version, seed, radius, accepted attempt, district IDs, translation-only behavior and unpaired team policy. It is an operation receipt, not a standalone portable recipe: reproducing it requires the same starting map, districts, assets and fitting context.

No role-budget changes, unit replacement, district rotation, relationship sockets, internal rearrangement or general symmetry solver is implemented here. Roles remain author intent. Power uses editor assumptions; access remains sampled and does not prove vehicle driving or game balance.

## Verification

Focused source tests verify deterministic results, three passing candidates on a controlled service fixture, exact fixed-building preservation, unchanged terrain/counts/source, missing permissions and cancellation. Native acceptance previews an eligible power district, checks unchanged revision, applies an option, checks unselected records and one Undo step, then restores the original arrangement. Scoped lint and typecheck passed.

Accepted private build: `dist/desktop/district-arrangements-v25/WulframForge.exe`, version `0.7.0-creative.25`; SHA-256 `C8A3229B82C3E7AAD0D8302685EF500082817613E7E842365515BADC79592CF1`. All five stages passed in `outputs/product-baseline-kKQ27I/report.json`: 256 passing source tests, one existing fixture skip, typecheck, combined terrain, creative bases and random maps. Native receipts: `outputs-desktop-test-OqlF05/report.json`, `outputs/creative-native-Ftpmya/report.json`, `outputs-desktop-test-M0upJn/report.json`. Visually reviewed `outputs/creative-native-Ftpmya/district-arrangements.png`; the three map-scale cards and Apply actions fit the scrolling inspector. The native trial uses a 20-unit move; broader performance and infeasibility coverage remain future work.
