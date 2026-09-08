# Valley Pockets — reviewed family design

Status: admitted as the twentieth reviewed Creative family, with promoted GUI/MCP verification in private v100. Exact admission evidence is in VALLEY_POCKETS_ADMISSION.md. Not included in the accepted v96 installer; full v100 combined verification remains in progress. Earlier Experimental milestones below are historical.

## Spatial contract

A continuous 240 u central passage runs along the local X axis. Independently staggered powered yards sit on alternating sides, each with a 120 u branch to its inward frontage. Repair and refuel occupy the first two opposing yards at different longitudinal stations. Command remains with the repair yard. The route has two open ends and no perimeter loop, shared turning court or radial hub.

This differs from Service Courtyard's opposing service banks and central court, Broken Ring's loop and open interior, and Switchback Supply's stepped chain: the continuous floor stays open while side pockets fit usable terrain. Buildings do not become larger with size. A valley is a suitability target, not a terrain prerequisite; flat sites can also fit.

## Initial composition and variation

| Size | Yards | Power cells | Uplink | Repair | Refuel | Gun | Flak | Missile | Darklight | Total per team |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Small | 2 | 4 | 1 | 1 | 1 | 2 | 1 | 0 | 0 | 10 |
| Standard | 3 | 6 | 1 | 1 | 1 | 4 | 2 | 0 | 0 | 15 |
| Large | 4 | 8 | 1 | 1 | 1 | 5 | 3 | 1 | 0 | 20 |
| Massive | 6 | 12 | 1 | 1 | 1 | 7 | 4 | 2 | 2 | 30 |

Each yard has two cells and three required roles. Initial roles are fixed by size; exact expanded counts require a later, explicit fitting contract. Seeds vary side order, longitudinal spacing, side setback and branch skew. No randomized decoration is counted as topology variation. Local reference geometry uses version `valley-pockets-v1`; freeze full template fixtures only after the building layout is accepted.

## Terrain and access contract to implement

Adapt whole powered yards within bounded side-pocket windows, retaining their side and station order. Do not use unconstrained 800 u shifts that cross the floor or disconnect a branch. After moving a yard, reconstruct its branch to the moved inward frontage and validate the resulting full reservation on both teams. Terrain remains byte-for-byte unchanged. Check center and original model footprint support; slopes must respect the stricter saved limit and 18 degrees. Final candidate feasibility includes saved areas, protected regions, locks and team pairing.

Power uses the existing saved service radius, capped at 280 u with the existing 10 u allowance; smaller settings remain binding. Repair/refuel need at least 96 u center-to-neighbor-model-edge margin and independently checked service routes. Check the main and branch corridors using the existing 80 u sampled vehicle estimate. An empty route or a shortcut disconnected from its pad is not access proof. Impossible terrain, narrow radius, missing assets or budgets reject atomically with a specific remedy; never flatten to force success.

Persist the actual adapted sites, branch geometry and version with formation reservations. Fixed favorites retain their saved arrangement; destination checks cannot silently choose fresh sites. Whole-map projects retain subsequent manual corridor edits. GUI and MCP must use one implementation with preview, Apply/Undo and stale-revision protection.

## Admission work still required

Local geometry and original-asset templates; bounded terrain search; final reservation, power and endpoint checks; explicit count fitting; GUI/MCP integration; versioned portable reconstruction; all four sizes across 12 seeds and flat/valley/irregular fixtures (record safe rejections); controlled overhead and side visual comparisons; independent review and fixes; save/reopen, cross-map favorite import/export and native Apply/Undo. Add a sizing/editing guide and card thumbnail only after actual layout evidence exists.

No weapon-cover, collision, service entry, competitive balance, novice or game/server acceptance is implied by this design.


## Local geometry checkpoint

`lib/valley-pockets.ts` now constructs the four local plans and role budgets. `tests/valley-pockets.test.mjs` passes two tests covering 192 deterministic samples, alternating sides, station order, full-width passage/branch clearance against 260 u yard envelopes, connected branch mouths, conservative bounds and independent returned data. Source TypeScript and targeted lint pass. Logs: `outputs/valley-pockets-core-tests.log`, `outputs/valley-pockets-types.log`, `outputs/valley-pockets-lint.log`. Independent core review found no actionable local geometry defect.

Yard centers are separated longitudinally by 640–960 u and set back 650–950 u from the floor. Branches end 350 u inward from each center; they reserve frontage, not a proved connection to a future pad. Main passage endpoints extend 600 u beyond the first/last station. The 260 u circles are candidate site envelopes, not actual original-model footprints or power ranges.

The next terrain solver must bound each complete yard to ±160 u along the floor and ±140 u across it, relative to the immutable local candidate; retain its original side, at least 320 u station order separation and at least 600 u setback. Reject candidates that cannot satisfy these limits. Rebuild the branch from its original mouth to the moved inward frontage and validate the whole resulting graph; do not move only the buildings. Store original and adapted site coordinates, explicit shifts and actual branch points for validation and portable reuse. Favorite placement uses the stored final geometry rather than a fresh terrain search. These adaptation rules are specified, not yet implemented.

MCP impact: no exposed operation or serialization changed at this checkpoint. The core is not imported by production generation. Integrating generation, placement and portable reservations through the shared GUI/MCP path remains required. This source was added after the v96 executable and combined suite list were created; v96 neither contains nor certifies it.


## Original-model template checkpoint

The local candidate now supplies original models for both teams, exact role budgets, indexed yard membership and explicit 80 u connections from each frontage to its repair/refuel pad. All 192 local templates pass deterministic repeat, role count, 260 u envelope, default 270 u power proximity, 96 u pad margin and connector clearance checks. Four complete template reference hashes are retained in `tests/fixtures/valley-pockets-v1.json`. The expanded test file has four passing tests (`outputs/valley-pockets-template-tests.log`); template TypeScript/lint passed. Independent template review found no actionable local defect.

`outputs/valley-pockets-local-visuals.json` records twelve local templates with original-model bounding radii. Four corresponding `outputs/valley-pockets-*-schematic.png` sheets compare seeds0/3/11 at one scale across all sizes. Primary review inspected all four: Small has clearly staggered opposing service yards; larger plans retain the continuous floor and alternating pockets. These are schematic model bounds, not rendered models or native editor evidence. Physical model orientation and pad entry remain unverified.

Terrain fitting and saved power settings are not validated by this local template. This code remains unconnected to the live GUI/MCP and excluded from v96. Next: bounded whole-yard terrain search and final transformed reservation/access validation, then integration and native/portable evidence.


## Bounded terrain fitting checkpoint

`lib/valley-pockets-terrain.ts` implements whole-yard shifts within ±160/140 u, original-side preservation, 600 u setback and ordered stations. It keeps each branch mouth fixed while moving its frontage and entire pad connector with the yard. Returned data includes the immutable original plan, explicit shifts and actual fitted geometry. Existing project terrain and entities are never mutated.

Building support is sampled at model centers and cardinal footprint edges on both teams. Corridors use <=40 u steps, full-width transverse tracks, plus half-width world bounds and cardinal support samples (including endpoints). Slopes respect min(saved limit,18 degrees); saved power radius is capped at280 with10 allowance. Finite inputs, placement radius, model spacing and service-pad margins constrain every candidate. The bounded deterministic grid can reject feasible off-grid arrangements; this is not a complete geometric solver.

Eight core/terrain tests pass in `outputs/valley-pockets-terrain-tests.log`:144 seed/size/terrain combinations (12 seeds ×4sizes ×flat/valley/irregular), paired obstacle causing real whole-yard movement, fixed-mode rejection, stricter saved power rejection, impassable floor rejection and all four rotated map-edge cap failures. Exact local reference fixtures remain unchanged. TypeScript and targeted lint pass in the corresponding terrain logs. Independent review found an omitted longitudinal cap world-bound check; the fix and four-edge regressions were re-reviewed with no further actionable finding.

This is an isolated fitter, not final placement acceptance. Existing-map entities, saved build areas, locks/protection, paired entity support equivalence, final transformed service clearance, portable reconstruction and GUI/MCP integration still require their shared final checks. No new desktop build or catalog admission; accepted combined v96 and19 reviewed families remain unchanged.


## Final additive candidate checks

`lib/valley-pockets-placement.ts` now provides a pure additive candidate: bounded fit, shared paired original-model instantiation, saved power validation, matched team support, transformed reservations and four exact service endpoints. It preserves existing buildings, terrain, inactive layouts and saved rules. Appended corridor reservations and actual fitted plan/shift/entity associations are retained in candidate metadata. This internal record is not yet a portable-library schema.

Existing and new models use conservative transformed eight-corner radii for collision, reservation and explicit approach checks; new oriented footprints also stay inside map bounds. Only the intended pad is exempt from its endpoint check. Existing entities with missing models or invalid coordinates reject. Unsupported custom entrances, expanded counts and Offset arrangements reject explicitly.

Five placement tests pass (`outputs/valley-pockets-placement-tests.log`):four sizes ×three rotations, four pad endpoints, actual metadata, source/inactive-layout preservation, existing obstacles/unknown models/saved reservations, duplicate IDs, composition limit enforcement, locked distant district preservation, and synthetic tall-model tilted rejection versus upright acceptance. TypeScript/lint logs use the same placement prefix. Independent review found an orientation radius gap and an ignored Offset setting; both were fixed and re-reviewed with no further actionable finding. The final additional oriented-world-bound guard passed the placement tests.

Remaining: connect the candidate to GUI/MCP preview and explicit atomic Apply/Undo, define portable record reconstruction and replay guards, implement the accepted count-fitting contract, and run native terrain/visual/round-trip admission evidence. No v97 executable yet; v96 remains the combined baseline and Valley Pockets is not a twentieth admitted family.


## Shared GUI/MCP source integration

The Experimental library and layout dropdown now expose Valley Pockets through `createCreativeBaseLayout`. It returns a new additive layout with existing entities and constraints retained; GUI Apply and MCP `generate_base_layout` use their existing guarded activation/history paths. Default placement radius is3300 u. A candidate's sampled access routes are available through the normal preview overlay. Formation favorites reject explicitly with whole-map guidance until versioned reconstruction is implemented.

Twenty-six affected source tests pass (`outputs/valley-pockets-integration-tests.log`), including the common generation operation, old-layout/source preservation, Experimental card, favorite refusal and MCP regressions. TypeScript, targeted lint and MCP synchronization pass. Independent integration review found no actionable defect; the function-only module cycle has no initialization-time call.

Private v97 build is in progress under `D:/WulframForgeBuilds/valley-pockets-v97`. Native GUI/MCP preview, Apply/Undo and whole-map reopen are still required; no native acceptance is claimed. V96 remains the accepted combined baseline. Count fitting, portable favorites and family admission remain open.

V97 build completed successfully. EXE SHA256: 87E02C5D521606EF65A449C479988907FD767407D9562FACAA07A39878A50327. Native acceptance remains pending.


## V97 native failure and overlay fix

Original native `tools/mcp/MapEditerMCP/outputs/mcp-native-test-ZjmIKe/report.json` failed at GUI preview. Diagnostic rerun `mcp-native-test-NYWQim/report.json` reproduced the timeout with blank page text and retained `valley-preview-failure.png`; both runs exited1. V97 is not accepted.

Source inspection found that the generated `formation.access` omitted required `blocked: []`, which the viewport iterates directly. The field and an overlay-shape regression were added. Source placement tests and TypeScript passed; independent review confirmed the shape fix. Native assertions also now compare imported layouts/validation, full preview snapshots, exact reservation transforms, pad endpoints and terrain Undo.

Private v97.1 rebuilt successfully: `D:/WulframForgeBuilds/valley-pockets-v97-1/WulframForge.exe`, SHA256 `8d286243219dede912777b32e83e5dc442713d91567767065f7db35fc3a44289`. Its strengthened native suite is running; no passing native result is claimed yet. An additional independent receipt check must ensure service records identify unique pads and cover every generated repair/refuel building. V96 remains the accepted combined baseline.


## V97.1 scoped native result

`tools/mcp/MapEditerMCP/outputs/mcp-native-test-czCZay/report.json` PASS against the v97.1 hash above. GUI Experimental card, five large-size reservation bands, preview/history preservation, Apply/Undo and unsupported-favorite refusal passed. MCP small/standard/large/massive generation retained the source entities/layouts, matched preview geometry, rejected stale/duplicate requests, restored Undo and reopened whole-map JSON/ZIP with exact entities/layouts/terrain. Exact transformed reservation geometry and all four pad endpoints were checked.

Supplemental `valley-pockets-artifact-audit.json` in that directory PASS: unchanged native receipt and EXE hash, nine saved artifact hashes, unique two service indices/four generated pad IDs and complete repair/refuel coverage in GUI plus four MCP copies. The native library screenshot was viewed as a workflow receipt, not a substitute for rendered-map visual admission. Independent receipt review verified the EXE, original receipt and all nine artifact hashes; scoped native acceptance is supported.

This is usable scoped native evidence, not a new combined baseline or twentieth-family admission. Portable formation favorites, expanded count fitting, larger terrain/variation evidence, visual guide and cross-process reuse remain open. No push/publication or launcher change.

The library screenshot also exposed generic guidance inviting unsupported count/entrance changes. Source text now names size, position, rotation and reroll, with default-count and whole-map limits. This text correction is not embedded in the v97.1 binary; it will ship with the next build. The screenshot captures dialog fade and is retained as functional evidence only.


### Valley Pockets expanded counts — source verification, 2026-09-08

Exact targets now add defenses within the existing powered yard envelopes. Size minima remain 10/15/20/30 newly added structures per team; zero or an exact minimum retains the original V1 recipe. Expanded recipes use `valley-pockets-v2`, preserve original units and service routes, and reject infeasible targets without returning a partial layout. Four V2 reference hashes are frozen in `tests/fixtures/valley-pockets-v2-count.json`; the original V1 fixtures are unchanged.

The existing independent critic found no actionable count-fitting defect. Source acceptance: 38 tests pass in `outputs/valley-pockets-count-integration-tests.log` (count/core/terrain/placement/library/MCP), TypeScript passes in `outputs/valley-pockets-count-types.log`, and affected-file lint passes in `outputs/valley-pockets-count-lint.log` after removing a redundant test-array spread. MCP synchronization passes. The matrix includes 48 seeded expansions and 12 final placements across flat, valley and irregular terrain, plus invalid/impossible requests and reference stability.

GUI guidance and both MCP packages now describe exact newly added counts and the older-host limit. The unsupported custom entrance control is hidden for this family. This is local source evidence only: expanded-count native GUI/MCP acceptance and a new private binary remain pending. v97.1 still supports default counts only; the installer remains accepted v96. Portable favorites and family admission remain open; the reviewed family count stays 19.


### Expanded-count native v98 — 2026-09-08

Private executable: `D:/WulframForgeBuilds/valley-pockets-v98/WulframForge.exe`, SHA256 `47e9d5e8ecd561b9bf45596b5a734d0f90e930db9bdaea088971b1e38236c0fb`. Build log: `outputs/valley-pockets-v98-build.log` (successful, with WebView2 assembly-reference warnings).

`tools/mcp/MapEditerMCP/outputs/mcp-native-test-bSLjNi/report.json` PASS: GUI target 24/team, preview preservation, Apply/Undo, and MCP eight default/expanded size combinations (10/14, 15/19, 20/24, 30/34). Impossible 120-count preview and Apply reject with full project/history preservation. Stale/duplicate rejection, retained entities/layouts, exact preview/Apply metadata, reservations, service endpoints and JSON/ZIP reopen pass.

Critic-requested supplemental evidence is in `bSLjNi/valley-pockets-artifact-audit.json` PASS: exact eight size/count combinations, current executable hash and 17 saved artifact hashes; default-versus-expanded original entities, yard shifts, service routes, main passage and branch geometry match. Four appended units per team are defense roles. Generated IDs/counts and unique complete service-pad coverage are verified. Final independent receipt re-review is pending. Portable favorites and family admission remain open. The accepted combined baseline and installer remain v96; v98 is scoped Valley count evidence.


Final v98 receipt review: independent critic verified executable, native receipt and all 17 artifact hashes; both prior findings are resolved. Scoped default/+4-count workflow acceptance is supported, not general feasibility through 120 or family admission.

Portable reconstruction foundation (source only): `lib/valley-pockets-portable.ts` rebuilds local V1/V2 recipes with retained counts and bounded yard shifts. Three tests in `outputs/valley-pockets-portable-tests.log` pass, covering 64 size/count/seed cases, actual terrain-shifted yard reconstruction and malformed records. TypeScript and affected-file lint pass. This helper is not yet connected to favorite capture/import/reuse; destination checks, exact captured-entity matching and shared GUI/MCP integration remain required. Independent helper review is pending. The favorite guard remains in place until the full placement path is verified.


Portable destination validation (source only, 2026-09-08): the shared terrain fitter and additive placement checker now optionally accept a reconstructed portable recipe. Saved local geometry and yard shifts stay fixed; normal paired support, power, oriented footprints, reservations, routes and editor constraints are reapplied at the destination. Changed seed/size/count requests reject. Fourteen portable/terrain/placement tests pass (`outputs/valley-pockets-portable-destination-tests.log`), including larger-map reuse and atomic power/slope/collision rejection. TypeScript, affected-file lint and MCP synchronization pass. Critic-required exact envelope/shift keys now reject unknown fields and malformed values. Independent re-review is pending. GUI/MCP favorite capture/import integration and native portable acceptance remain open; v98 does not include these source changes.


Portable capture foundation (source only): `lib/valley-pockets-capture.ts` verifies the layout-specific generation record against deterministic reconstruction, source paired entities and exact passage reservations, then returns only the generated recipe/template. Unrelated retained buildings are excluded; changed generated entities, service geometry, corridors and additional authoring rules reject rather than being silently dropped. Two tests pass (`outputs/valley-pockets-capture-tests.log`), including retained-entity exclusion and six mutation classes. TypeScript and affected-file lint pass. Independent capture review is pending. The preceding reconstruction/destination follow-up received no actionable critic findings. Public favorite save/import wiring and native acceptance are still required; no new binary has been built since v98.


Favorite library integration (source only): GUI save now supplies source model evidence to verified Valley capture. `FormationFavorite.valleyRecipe` retains the versioned recipe; portable libraries export version 7 and reject Valley content mislabeled as an older version. Reuse checks the stored template against reconstruction, preserves fixed geometry and destination entities, and supports saving the reused group again. Capture review fixes reject renamed corridor labels and extra placement-record fields. The integration suite passes 24 tests in `outputs/valley-pockets-favorites-tests.log`; TypeScript, affected-file lint and MCP synchronization pass. Independent integration review is pending. Existing MCP exposes authored-base documents but not personal formation-favorite capture/reuse; same-feature shared command integration is the next required work, followed by rebuilt native acceptance. No new build or family admission is claimed.


MCP favorite source integration: added read-only `capture_formation_favorite` and explicit preview/Apply `place_formation_favorite`, backed by shared favorite capture/import/reuse helpers, with revision guards and new-layout activation. Both server packages and native allowlist are updated. Source tests in `outputs/valley-pockets-favorite-mcp-tests.log`, TypeScript and MCP synchronization pass; native rebuild and acceptance remain pending. Personal-library localStorage edits are not performed by these tools. This closes the capture/reuse command gap in source only.


Pre-v99 review: independent critic found no blocking capture/import/reuse/MCP commit defect. Fixed the reported option-label count to exclude retained destination entities; direct favorite and MCP helper tests now retain a neutral destination building through reuse/resave. Sixteen focused tests and TypeScript pass. Native harness now tests GUI favorite capture versus MCP package, larger-map reuse with retained entities, read-only preview, Apply, recapture, stale rejection and Undo. Private v99 build is running (`outputs/valley-pockets-v99-build.log`); no native v99 acceptance yet. GUI library export/import/restart coverage remains to be added for full portable acceptance.


### V99 scoped native portable acceptance — 2026-09-08

EXE `D:/WulframForgeBuilds/valley-pockets-v99/WulframForge.exe`, SHA256 `a63d9a434cb0686ae26c9261f8ea2f50ce5fefa1222975089500603bb34ffef0`. Preliminary native receipt `mcp-native-test-r92jeY/report.json` passed; superseded for scoped evidence by strengthened `tools/mcp/MapEditerMCP/outputs/mcp-native-test-WNhvbL/report.json` PASS. Full snapshots and revision/history prove read-only capture/preview; imported destination matches its written fixture. Every generated building XY and reserved path is independently checked at 90 degrees on a 20000 x 16000 map, including the mirrored team. GUI save and MCP captured recipes match, reuse retains the neutral destination building, Apply/Undo and stale rejection pass, and recapture retains the recipe.

`WNhvbL/valley-pockets-artifact-audit.json` PASS checks the tested EXE, native report and 19 artifact hashes (including favorite copy/package), exact counts and unique pad coverage. Independent critic reviewed the strengthened harness with no remaining findings. Standalone package tool-list expectations now include the two new commands; its package suite was rerun. GUI library export/import/restart acceptance, broader portability terrain/size coverage, guide and family admission remain open. Accepted combined baseline/installer remain v96.


### V99 GUI library and restart follow-up

`tools/mcp/MapEditerMCP/outputs/mcp-native-test-q9TyDf/report.json` PASS includes the preceding native count/portable scope plus GUI version-7 export, exact library comparison, removal, cancelled import, successful import and unchanged map/history. Its artifact audit passes. `q9TyDf/valley-restart-XI7IC9/valley-restart-report.json` PASS restarts the same isolated profile, compares persisted library to the GUI export, imports an exact larger-map fixture, and checks GUI favorite preview/Apply/Undo, retained buildings, independent transformed XY/yaw, corridor geometry and service endpoints. Six inspection screenshots were saved; camera changes preserve the map. Primary viewed overhead and repair closeup: the repair model renders, but checkerboard fixture terrain and distant overhead buildings make these functional evidence, not final terrain/visual admission. Independent receipt review is pending. Broader size/non-flat portability and family guide/admission remain open; 19 families remain admitted.


Portability breadth follow-up: `outputs/valley-pockets-portability-matrix.json` records 96 passing source cases across four sizes, three symmetric terrain types, default/+4 counts and four seeds. Each exports/imports, reuses at a rotated larger destination with a retained neutral building, verifies independent XY, and resaves the same local geometry. This is source evidence only. Independent v99 receipt review supports scoped acceptance; `q9TyDf/valley-restart-XI7IC9/service-pad-audit.json` closes the unique complete-pad coverage gap against retained report/map/EXE hashes. Future restart harness asserts that coverage directly. Added [Valley Pockets guide](VALLEY_POCKETS_GUIDE.md). Native terrain matrix and final visual/admission review remain open.


Native terrain matrix follow-up: `q9TyDf/valley-matrix-0WfZrw/valley-matrix-report.json` passes 24 cases (four sizes, three synthetic terrains, default/+4 counts), native generation/capture and same-map same-anchor favorite reuse at 35 degrees with one seed. It is not additional cross-map coverage. Critic requested stronger full fitted-plan/reservation equality and exact complete-pad endpoint checks; those assertions were added and a strengthened run is in progress (`outputs/valley-pockets-v99-native-matrix-strengthened.log`). Initial receipt remains preliminary for those added claims. Restart visual fixture now uses a valid snow terrain texture; its new log is `outputs/valley-pockets-v99-restart-textured.log`. Final visual/admission review remains open.


Strengthened native matrix `q9TyDf/valley-matrix-BG5xx0/valley-matrix-report.json` PASS verifies 24 cases, complete unique pad IDs/endpoints and clearance96, exact generated-versus-reused plans/shifts/service routes and reservation geometry. Its `matrix-artifact-audit.json` confirms exact case tuples, EXE/report hash and all 48 fixture/reused-map hashes. Textured restart `q9TyDf/valley-restart-tZFjI1/valley-restart-report.json` PASS includes direct complete pad assertions. Primary reviewed five views (both overhead, team1 ground and both repair closeups); snow textures and original models render, wide overhead scale leaves buildings small, and power icons dominate distant yards. Added overhead and repair images to the guide. Independent family quality/variation review remains pending; no promotion yet.


Final documentation image follow-up: `q9TyDf/valley-restart-4jo5BA/valley-restart-report.json` PASS repeats the isolated library/reuse/Undo checks and captures wider service-yard views through normal viewport zoom, with exact map preservation. Primary viewed Team-1-Service-yard.png: repair, both cells, neighboring structures and the reserved branch are visible together. Added it to the guide alongside the close pad view and representative seed schematic. Numeric role/space/adaptation/power limits and current selectable-v99 status are documented. Final documentation/admission critic review pending; no catalog promotion yet.
