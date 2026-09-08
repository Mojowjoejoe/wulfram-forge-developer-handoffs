# Three-Lane Anchor — reviewed family

Current status: admitted in private v106; see the [admission record](THREE_LANE_ANCHOR_ADMISSION.md). The reviewed catalog now contains 21 families. Historical checkpoints below retain their original scope; the latest sections record current evidence. This family does not implement gameplay mechanics. V106 is the accepted combined private baseline; see [combined evidence](COMBINED_BASELINE_V106.md).

For placement, role budgets, terrain limits, entrance binding and reuse, see the illustrated [Three-Lane Anchor user guide](THREE_LANE_ANCHOR_GUIDE.md).

## Spatial identity

Three separate departure courts feed three authored lane mouths. A rear transverse service road connects their rear edges, while a command/service yard sits behind that road. Vehicles can stage for each lane without sharing one central exit. Lane mouths face forward through offset approaches; direct lines into rear services are deliberately interrupted by the geometry of the reserved approaches, not by a claim of bullet-proof terrain.

The nearest existing family is Trident Reach, whose three forward prongs are building positions supplied by a rear yard. Three-Lane Anchor instead reserves three usable departure courts and their connections as the primary plan. Its identity must survive when defense counts change. It differs from Service Courtyard by having three separate front courts, from Valley Pockets by having all lane mouths on the forward edge rather than alternating beside a longitudinal spine, and from Broken Ring by having no circulation loop.

## Proposed constraints

- Preserve three distinct mouths at every supported size; Starter reduces buildings, not the three-lane topology.
- Each mouth binds to one explicit editor lane approach. Standalone placement may expose three local exit sockets, but must label them unbound until a map author connects them to actual routes.
- Rear repair/refuel access must connect to the transverse road without crossing the front of a defense position.
- Use original building sizes and existing power/service/defense assets. Do not create towers, minion waves, scoring or lane progression mechanics.
- Keep lane spacing, court width, rear-road width and connector bends as versioned geometry. Seed variation changes their proportions within tested bounds and varies building positions, rather than merely adding another identical court.
- Preserve existing map entities and route/protection rules. Ambiguous or incompatible lane bindings must reject before Apply.
- Favorite capture must preserve three court reservations, exit bindings and local service routes, or explicitly require whole-map export when destination-independent reuse cannot represent those bindings.

## Work order

1. Inspect the existing route/entrance-binding formats and determine a shared local socket representation. Avoid a separate lane metadata system.
2. Build a deterministic local plan with three non-overlapping court/exit pairs and a connected rear road; define numeric minimum widths from existing editor access checks and original model bounds.
3. Assign minimum roles and exact count-fitting behavior for all four sizes. Record dimensions and feasible count bounds rather than promising every count.
4. Connect destination validation, GUI/MCP preview/Apply/Undo and persistent bindings.
5. Supply versioned portable reuse or an explicit reviewed binding portability contract.
6. Run the established seed/terrain/count, native lifecycle and critic/visual gates before admission.

This remains a proposed design; numeric budgets and geometry are intentionally not implementation claims.

## Local topology checkpoint — September 8

`lib/three-lane-anchor.ts` now generates deterministic local plans with three rectangular staging courts, three offset 120-unit mouths, three 120-unit rear connectors, a 240-unit transverse service road, and a separate rear command/service yard. Small/standard/large/massive plans retain all three courts and target 15/21/30/42 roles respectively. Every plan has eight power cells and one uplink, repair pad, refuel pad and Darklight; remaining roles form the three defense yards. These are role budgets, not fitted or powered building placements yet.

Seeds vary spacing, court width/depth/setback and mouth bends. All local coordinates remain unbound until destination authoring selects actual lane connections. Bounds include full route widths and yard/court envelopes. Defense yards were moved to a 460-times-size-scale lateral offset so they clear entire staging rectangles by at least 14 units, matching the circulation buffer. The independent critic identified the same gap in the earlier 420-offset version; the correction has an explicit rectangle-to-circle regression.

`outputs/three-lane-anchor-plan-tests.log` passes two tests exercising 384 size/seed combinations, topology preservation, deterministic output, full-width route clearance, entire court clearance, bounds, count budgets and invalid inputs. TypeScript and scoped lint pass in `outputs/three-lane-anchor-plan-typecheck.log` and `outputs/three-lane-anchor-plan-lint.log`. Original-model fitting, power/service checks, terrain placement, GUI/MCP exposure and portable family capture remain required before admission. The shared plan is not exposed as an incomplete editor operation; MCP integration accompanies destination placement. V102 remains unchanged.


## Existing entrance contract inspected

`lib/entrance-routing.ts` currently stores version 1 under `forge.entrance-routing.v1`, limits bindings to two, and requires a unique team per binding. Each binding selects an existing build-area corridor and its ordered battlefield-to-base direction. `components/editor/entrance-routing-panel.tsx` likewise selects one binding per team. `lib/portable-reservations.ts` embeds that same contract in version-3 portable reservations. Therefore three exits per team cannot be represented by adding more version-1 entries.

Before implementing this family, extend the shared entrance contract with explicit named sockets and a versioned multi-entrance policy, including GUI selection, MCP editing, inspection and portable round trips. Preserve version-1 interpretation for existing maps. Distinguish each local exit socket from its optional destination corridor binding; unbound sockets must remain visibly unbound. Validate every bound route separately rather than treating one successful entrance as proof for all three. Exact schema and migration require implementation review; this inspection does not claim multi-entrance support exists.


### Integration checks for the multi-entrance sprint

- Existing `inspectionRoutes` service IDs use only team and pad index. Multiple entrances for a team require socket-qualified IDs so route selection and camera following cannot alias separate entrances.
- The current GUI rebuilds each team's binding on selection changes. Preserve all other sockets when editing or clearing one, and make an unbound socket visible without falling back to a misleading bound-route result.
- Authored-base packages also carry `EntranceRouting` through `lib/authored-base-package.ts`; extend package compatibility deliberately, alongside favorite reservations. Existing version-1 maps and packages must retain exact old routing behavior.
- Exercise three different corridors for the same team, reversed direction, missing corridors, duplicate socket identifiers, unsupported schema versions, one blocked entrance among two clear entrances, and selective unbinding. Check independent route IDs, all expected pad endpoints, source immutability, stale preview rejection, Apply/Undo and export/reopen through both GUI and MCP.

These are implementation acceptance requirements, not completed tests. Keep the current v100 verification source stable while its native suites run; introduce multi-entrance runtime changes in the next versioned sprint.


## Multi-entrance source foundation

`lib/entrance-sockets.ts` defines the candidate version-2 contract with globally unique named socket IDs, up to three per team, one distinct saved mouth corridor per socket, and optional separate approach binding. Omitted approaches remain explicitly unbound. Mouth direction runs from the lane-facing endpoint toward the internal court; approach direction runs from battlefield toward that endpoint. Same-team corridor reuse across mouth and approach roles rejects, including references to another socket's mouth.

The pure resolver validates corridor existence and width >=80, copies their ordered geometry and requires an explicit approach/mouth join within 1e-6 world units. It returns bound state separately from the local mouth path. Destination world bounds, terrain, clearance and service-pad validation remain mandatory future integration; a resolved path alone is not an access acceptance receipt.

`outputs/entrance-sockets-foundation.log`: nine tests pass, including existing v1 behavior, six sockets, explicit unbound state, reversed approach, immutable source points, duplicate/ambiguous references, invalid join, missing corridor and narrow corridor. TypeScript (`outputs/entrance-sockets-typecheck.log`) and scoped lint pass. Independent initial review identified cross-role ambiguity, now corrected with both-order regression coverage; resolver follow-up review passed with no further helper defect.

This helper is not yet wired into the saved v1 metadata reader, GUI, MCP dispatch or portable packages. No current executable gains multi-entrance support. Next work is shared policy integration, socket-qualified inspection IDs, preserving all socket rows during editing, versioned package capture/reuse, and destination/native acceptance. V100 remains the accepted combined build.

Integration must validate each original mouth and approach reservation at its own full width. The combined path minimum width is an inspection hint, not a replacement for either full reservation or its world/protection checks.


## Destination validation source checkpoint

`inspectEntranceSockets` now validates each socket against candidate layout entities and validation settings. Every original reservation retains its full width for world/building checks, including opposing-team buildings. Shared route inspection checks terrain and service-pad access for each entrance independently. Results include stable socket-qualified route IDs, explicit bound state, and `automaticConnectors:true` because the existing service checker adds automatic battlefield and pad connections.

Independent review found an upright-only footprint gap. `lib/oriented-building-radius.ts` now supplies a conservative circle enclosing all eight transformed model corners, using the same coordinate/Euler convention as Valley placement. Both full-width reservations and returned service segments use these radii; only the actual destination pad is exempted from the service-segment obstacle check. A tall tilted-model regression rejects the intrusion and confirms its upright counterpart passes. Second review found no further actionable defect.

`outputs/entrance-sockets-destination.log`: 13 new/legacy tests pass, including distinct three-entrance pad routes, explicit unbound state, full-width world-edge failure, a blocked third entrance, steep terrain, oriented models and nonmutation. TypeScript (`outputs/entrance-sockets-destination-typecheck.log`) and scoped lint pass.

These are shared source helpers, not a new live editor command. Saved-policy integration, GUI rows and inspection presentation, MCP exposure, versioned authored-base portability and native Apply/Undo/restart checks remain next. V100 is unchanged and remains the accepted combined executable.


## Saved policy, GUI, MCP and authored-package integration — v101 source

The shared entrance reader now accepts legacy version 1 and named-socket version 2 in the existing entrance metadata field. Existing single-entrance behavior remains unchanged. Inspection presents socket-qualified routes with Bound approach/Unbound exit and explicit automatic-connector labels.

The Base Entrances panel offers Design multiple entrances for legacy maps and automatically shows editable named rows for saved version-2 policies. Add/remove/name/mouth/approach/direction edits invalidate previews; project changes prevent stale candidates from applying. Applying an empty reviewed policy clears entrance rules. Independent review found unsafe render-time parsing, now fixed with guarded diagnostics and disabled Add/Preview/Apply for malformed saved metadata.

MCP `set_entrance_routing` accepts both versions. Preview routes through a new native `preview_entrance_routing` action, so an old host rejects the action rather than treating a preview request as a write. The native allowlist, bridge, integrated/standalone servers and READMEs are updated. Version-2 authored-base packages capture/restore all socket references and transformed corridors; downgrading to version 1 rejects. Legacy formation favorite formats cannot hold these rules and explicitly require authored-base or whole-map export.

Checks: `outputs/multi-entrance-integration-tests.log` 32 passed; `outputs/multi-entrance-regression-tests.log` 27 passed; TypeScript and scoped lint pass. MCP synchronization and standalone `outputs/multi-entrance-package-tests.log` pass. Independent integration review and render-error follow-up found no remaining actionable source issue.

Private v101 build started in `outputs/multi-entrance-v101-build.log`. Native GUI/MCP preview, Apply/Undo, versioned export/reopen, cross-map reuse and malformed-metadata rendering still require verification. V100 remains the accepted combined executable, and no Three-Lane Anchor family has been admitted.

## Native checkpoint and visual correction — September 8

`outputs/multi-entrance-v101-native-strengthened-final.log` records a passing scoped native run against v101 SHA-256 `d6dc4a40ce373768a52107795b13f4de1921001f1b65a05c91f2ba319e7107c1`. GUI and MCP preview/Apply/Undo, stale revision rejection, capture without map changes, six reopened rows, and cross-map authored-package reuse pass. Strengthened assertions compare the full MCP-applied map with the GUI result except operation timestamps, require one Undo entry, and verify all twelve translated corridors and all six building positions/rotations. The fixture uses actual model terrain snapping and required uplinks; JSON normalization handles signed zero. Earlier failed fixture runs are retained.

Independent review requested these stronger assertions. Per-socket route geometry and fresh-process restart remain unverified; the current reopen check imports into the same process. The screenshot from `outputs/multiple-entrances-native-w0Fo30` revealed crowded, unstyled controls and an error below the form. Source now adds spaced full-width fields, visible button/focus states, and puts the saved-data alert above the controls. TypeScript passes (`outputs/multi-entrance-polish-typecheck.log`). These visual corrections are not in v101 and require a rebuilt native visual check. MCP semantics are unchanged by this presentation correction.

V100 remains the accepted combined build. Three-Lane Anchor admission, the remaining family catalog, and full roadmap acceptance remain open. No commit, push, or public distribution was performed.

## Original-model local fitting checkpoint

`threeLaneAnchorTemplate` now fits the exact default role budgets into the three defense yards and rear service yard, using original models for both teams. Bounded seeded placement preserves the entire yard envelope, 14-unit model separation, full-width circulation and service branches. Repair/refuel pads have 96-unit clearance from other model envelopes, with only each pad's own branch endpoint exempted from its corridor test. The returned template includes explicit yard membership and pad service routes for destination integration.

`outputs/three-lane-anchor-model-tests.log` passes three tests, retaining the 384 topology cases and adding 192 size/seed original-model fitting cases. Assertions check exact counts, deterministic output, yard membership, pairwise spacing, both pad branches and pad clearances, missing-model rejection and manifest nonmutation. Every powered role lies within 270 units of both local cells; this is a provisional local design budget, not verified engine range. TypeScript and scoped lint pass in `outputs/three-lane-anchor-model-typecheck.log` and `outputs/three-lane-anchor-model-lint.log`.

Independent fitting review found no actionable defect in this source-only scope. Destination integration must still connect every court interior through the transverse road to the service yard, transform and snap models, validate terrain/access/protection/power and preserve socket bindings. GUI/MCP preview, Apply/Undo, family portability, native proof and catalog admission remain unfinished. The local template is not yet an exposed editor/MCP operation and no new executable was built for this checkpoint.

## Connected local entrance paths

The local template now returns three `entranceRoutes` and six complete pad paths. Each route retains its offset mouth, crosses the court front-to-rear, follows the rear connector and transverse road, and reaches the shared service junction. Only adjacent duplicate junction points are removed. Each pad path retains that complete prefix and ends at its exact repair/refuel model index; these paths do not infer bindings to external map lanes.

`outputs/three-lane-anchor-connected-tests.log` passes the existing 384 topology and 192 fitting cases with new ordered-prefix, court traversal, exact-pad endpoint and whole-path clearance assertions. The full 120-unit entrance reservation clears every model with a 14-unit margin. Each 80-unit pad branch uses the same margin, exempting only its destination pad. TypeScript passes in `outputs/three-lane-anchor-connected-typecheck.log`. Independent connectivity review confirms the implied transverse-road segments remain inside the authored rear-road span and found no actionable defect.

This closes local court-to-service connectivity only. Destination transforms, terrain snapping and validation, existing-map constraint preservation, saved socket integration, GUI/MCP exposure and native acceptance remain next. No new build or family admission is claimed.

## Destination candidate source checkpoint

`lib/three-lane-anchor-placement.ts` now produces a pure additive paired candidate with original-scale terrain snapping, paired-support validation, oriented model bounds and spacing, full-width building reservations, 80-unit sampled driving routes and twelve complete pad paths. It saves six named unbound version-2 sockets and checks each with the shared entrance inspector. Existing entrance policies reject rather than being overwritten: this family consumes all three sockets per team. Existing entities, inactive layouts, reservations and composition constraints remain authoritative. Custom target counts beyond the size default are not implemented; the standard zero/automatic sentinel selects that default.

Independent review found that the initial candidate ignored placement radius. The fixed operation validates finite coordinates/rotation and positive radius, checks every oriented building envelope, and checks all reservation endpoint disks against each team's requested circle. Follow-up review confirms endpoint disks contain the straight capsule segments because the placement circle is convex.

`outputs/three-lane-anchor-destination-radius-tests.log` passes four tests: all four sizes at 0/35/90-degree rotations, source/terrain preservation, six unbound sockets and twelve exact pad endpoints, unrelated/inactive state preservation, budget and reservation rejection, building obstruction, duplicate placement/existing policy rejection, invalid/narrow radius atomicity and automatic count. TypeScript passes in `outputs/three-lane-anchor-destination-typecheck.log`. Route terrain checks sample an 80-unit vehicle; full court-width terrain usability is not established by the reservation check.

This is source-only destination groundwork. Nonflat terrain cases, GUI/MCP command integration, portable family records, native lifecycle checks and admission remain unfinished. No executable was rebuilt for this checkpoint.

## Terrain and shared generation integration

Gentle paired hills now pass at every size with unchanged terrain and nonzero building tilts; steep and asymmetric support reject without source mutation. `outputs/three-lane-anchor-integration-tests.log` passes six tests including earlier destination cases, shared `generateBaseLayout` creation of a separate layout, preservation of the previous layout, six saved sockets/twelve access paths, and rejection of lossy formation-favorite capture.

The GUI dropdown exposes Three-Lane Anchor as experimental. It defaults to a 3300-unit radius and explains fixed counts, unbound exits, existing-policy rejection and authored-base/whole-map reuse. Critic findings corrected misleading controls: access checks are mandatory, terrain adaptation is replaced with a fixed-arrangement explanation, and option counts exclude retained buildings. Both MCP server descriptions and READMEs document the same operation and pending v103 compatibility; no new native action is needed because `generate_base_layout` already dispatches the shared generator.

TypeScript, scoped lint, MCP synchronization, MCP command regression and standalone package tests pass in `outputs/three-lane-anchor-integration-typecheck.log`, `outputs/three-lane-anchor-integration-lint.log`, `outputs/three-lane-anchor-integration-sync.log`, `outputs/three-lane-anchor-mcp-tests.log` and standalone `outputs/three-lane-anchor-package-tests.log`. A rebuilt native GUI/MCP lifecycle and authored-package reuse test remain required. These source checks do not admit the family or replace v100 combined acceptance.

## Private v103 native MCP checkpoint

Built `D:/WulframForgeBuilds/three-lane-anchor-v103/WulframForge.exe`, SHA-256 `f93fdcdc71b4d06f46c9c1013b78346cee5ad00570126c6d1f7f528c9b1bd960`; archive `dist/desktop/WulframForge-0.7.0-v103-win-x64-self-contained.zip`, build log `outputs/three-lane-anchor-v103-build.log`.

Standard native MCP regression plus the Anchor branch pass in `tools/mcp/MapEditerMCP/outputs/mcp-native-test-I7JEAM/report.json`. The blank 16000×12000 fixture hash is `0ae35c05d68b1f02cc8437fc9d4ac22531fc70b8dde9f23b1802b37a9409f450`. Anchor preview preserves the whole map; Apply matches preview entities and metadata, preserves the prior layout and terrain and adds one Undo entry. Stale revision rejects with unchanged map. Authored capture is version 2, retains six unbound sockets and leaves the map unchanged. Undo restores the full initial map. The captured package is adjacent to the report.

Source authored reuse passes in `outputs/three-lane-anchor-authored-reuse-tests.log`: export/parse, translate both teams by500 units on each horizontal axis onto an 18000×14000 map, preserve all reservations, socket policy and building poses, and leave the destination input unchanged. Rotation comparisons normalize JSON signed zero; numerical positions use a 1e-8 tolerance. This is source reuse evidence, not a native cross-map lifecycle.

Native GUI preview/Apply, visual inspection, fresh-process reopening and native authored reuse remain required before family admission. V100 remains the accepted combined baseline and the existing installer/launcher are unchanged. No commit, push or public distribution.

## Native GUI and translated reuse follow-up

`tools/mcp/MapEditerMCP/outputs/mcp-native-test-EG0hnX/report.json` passes on the same v103 executable and fixture hashes. Preview and capture now compare revision, Undo, Redo and dirty state in addition to full map snapshots. Native authored reuse translates every reservation and all thirty captured building poses by500 units on both horizontal axes, preserves the six-socket policy and supports preview/Apply/Undo. This is same-map translation, not cross-map or fresh-process proof.

The GUI selects the experimental dropdown entry, checks mandatory access controls, previews the default fortified pair (60 buildings), applies one Undo entry, preserves previous layout/terrain and restores the full source on Undo. The controlled dropdown correctly returns to the original active-layout value while the draft is open. Earlier harness failures `mcp-native-test-j6dIbL` (selected an optgroup) and `mcp-native-test-furxn3` (expected the temporary option to remain selected) are retained; no product fix or EXE change was required.

`anchor-gui-preview.png` was visually inspected: both pairs of three courts, preview circles, 60-unit preview count and fixed-arrangement/mandatory-access controls are visible. Buildings are too small at this full-map zoom for close model-arrangement review. Fresh-process file reopening, close visual inspection, broader native size/terrain coverage and full family admission remain pending.

## Fresh-process file reopening

`outputs/anchor-restart-native-AZFMAW/report.json` passes against the same v103 executable. The native generator creates a fortified 35-degree arrangement, saves it, waits for process30480 to exit, starts process26552, and imports the saved file. Full map equality, all inspected route geometry/errors, twelve service routes and six GUI socket rows pass; renderer errors are empty. Saved file SHA-256: `6b40ada96a52e96785ae3824c12d8edfb24322d181d805197cf813e2ab02bb34`. Independent review verified EXE/fixture/saved hashes and the process lifecycle with no actionable finding.

Supplemental `outputs/anchor-restart-native-XhEHKA/report.json` repeats that lifecycle and captures a zoomed view after camera input, then checks the map remains unchanged. Screenshots show the restored unbound controls and court topology, but status icons and the remaining zoom level still prevent detailed model arrangement review. This proves explicit file reopening, not automatic recovery. Close model visuals, broader native size/terrain cases and the remaining family admission gates stay open.

## Native size and terrain matrix

`outputs/anchor-restart-native-3XeL5o/report.json` passes 24 cases on the same v103 executable: four sizes, two seeds (0/35-degree rotations), and flat/gentle paired hills/steep terrain. Sixteen valid cases verify full preview map/history preservation, Apply matching preview entities/metadata, correct30/42/60/84 total counts, six unbound sockets, twelve unique socket-qualified service routes and each same-team repair/refuel endpoint, preserved previous layouts/terrain, and exact whole-map Undo. Eight steep cases require a terrain/slope/support rejection message and unchanged revision, Undo, Redo, dirty state and whole map.

Each successful candidate is retained with a path and SHA-256 in the report; all sixteen hashes were independently re-read and matched. Each case pins its terrain fixture. The initial weaker `anchor-restart-native-q3fIRY` pass is retained; critic requests added explicit rejection reasons, route identity/endpoints and candidate artifact hashes before the stronger rerun. Final independent receipt review remains pending at this checkpoint.

The matrix also repeats fresh-process file reopening. It does not establish driving or game/server behavior. Close model visuals, searchable catalog presentation, custom-count policy completion and the remaining family admission review still require work; the admitted-family count stays20.

## Searchable experimental card source

The base library now includes Three-Lane Anchor in Experimental at every size. Its deterministic original-model sample shows eight full-width bands: rear road, service connector, three entrance routes and three courts. Counts are15/21/30/42; plan bounds include all bands. Guidance explains fixed yards, required access/terrain validation, unbound sockets and authored-base/whole-map reuse. The fixed terrain filter includes this card through an explicit `terrainAdaptive:false` property rather than incorrectly treating every generated style as adaptive. The placement workflow retains its3300-unit default radius.

`outputs/three-lane-anchor-library-tests.log` passes13 tests covering all-size samples, search, fixed/adaptive filter behavior, counts, band bounds, existing library behavior and unchanged reviewed-family membership. TypeScript, scoped lint and MCP synchronization pass in corresponding `three-lane-anchor-library-*` logs. MCP impact: no new mutation or tool; the existing documented shared generator already exposes this style. Card selection remains a GUI discovery feature.

The native matrix received independent receipt approval: all24case tuples,16candidate hashes,three fixture hashes andeight explicit slope rejections match. Card source is newer than v103 and needs a rebuilt native library test. There are still20 admitted families; the additional experimental card does not count as admission.

## Private v104 library verification

Built `D:/WulframForgeBuilds/three-lane-anchor-v104/WulframForge.exe`, SHA-256 `26b10faaa50eed1d707a39690100c39f1c13669510c0415315c3e8b07abde883`; build log `outputs/three-lane-anchor-v104-build.log`. `outputs/anchor-restart-native-ZSxBXq/report.json` passes experimental collection search, all four size counts, eight rendered reservation bands per diagram, adaptive exclusion/fixed inclusion, and placement handoff/Cancel with unchanged whole map and history. It also repeats generation and fresh-process reopening on this executable.

Library screenshots wait for finite UI animations before capture. The first `anchor-restart-native-k5zmgB` run passed behavior but its Starter screenshot caught the opening transition; it is retained. Settled Starter and Massive views were inspected: courts/road bands, counts, source, fixed placement guidance and footer actions are readable; the details pane scrolls normally. These are symbolic plan diagrams, not close original-model rendering evidence.

V104 adds the searchable experimental card; v100 remains the combined baseline. Broader v103 matrix evidence is not claimed as a v104 rerun. Full family admission and the whole roadmap remain open; existing installer and launcher selections are unchanged.

## Exact-count source extension

Three-Lane Anchor now accepts count0 for the size minimum or an integer target from that minimum through120. Extra gun/flak/launcher roles are distributed across the three existing powered defense yards. Court/road geometry, original model scale, eight cells and service roles remain unchanged. Bounded model fitting rejects impossible requests rather than dropping units or narrowing routes. Default counts retain recipe v1; expanded counts use `three-lane-anchor-v2` in plan/template/formation metadata. This changes composition, not just a label; building locations are deterministically regenerated for the requested roles.

`outputs/three-lane-anchor-count-tests.log` passes five tests including96 expanded cases (four sizes × twelve seeds × minimum+1/minimum+9), exact counts, invariant topology/service roles and old-default identity. The overloaded120-unit Starter case explicitly rejects. `outputs/three-lane-anchor-count-placement-tests.log` verifies the shared generator produces48 buildings for24/team and rejects the overload without source mutation. TypeScript, MCP sync and standalone package tests pass in the corresponding count logs.

GUI/library wording and both MCP server descriptions/READMEs now explain extra-defense fitting and v105 compatibility. V103/v104 binaries remain default-count-only; this source extension needs a new build and native count/reuse checks. No new family admission or public release is claimed.

## Private v105 expanded-count native verification

Built `D:/WulframForgeBuilds/three-lane-anchor-v105/WulframForge.exe`, SHA-256 `8d5bc8b4f059645a3a7f751a72df7dba97064de7a83e8b6d0be5093c101302c5`. Build log: `outputs/three-lane-anchor-v105-build.log`. This supersedes the pending-build status above for expanded counts.

`outputs/anchor-restart-native-A2Ni37/report.json` passes the native `--library --matrix --expanded` run: four size cards and filtering, GUI 39/team Preview/Apply/Undo, and 24 placement cases (four sizes, two seeds/rotations, three terrain fixtures). Sixteen flat/hilly placements produce exactly 24/30/39/51 buildings per team with v2 recipe metadata, unchanged terrain and prior layouts, matching preview/Apply results, six sockets and twelve distinct pad routes. Eight steep cases reject explicitly for slope without changing map or revision/history. Fresh-process file reopening preserves the full expanded map and inspected routes. Independent review verified the executable, fixture, saved-map and candidate hashes and exact case tuples; no actionable finding remained. Expanded GUI Cancel and automatic recovery are not exercised by this run.

`outputs/anchor-restart-native-nsOnsL/report.json` passes `--expanded --authored` on the same executable. It repeats fresh-process reopening, captures an authored v2 package without changing map/history, then previews and applies all 78 buildings on a separate 18000 x 14000 map. Every building keeps token, team and rotation and translates exactly +500 X/+500 Y; all 16 corridor reservations translate equally and the six-socket policy is retained. Preview leaves destination/history unchanged; Apply creates one Undo entry and Undo restores the exact destination. The package, destination and reused map are retained with hashes in the report. This is authored-package reuse, not formation-favorite conversion.

Independent review verified all six build/artifact hashes and the authored assertions without a material finding. Authored reuse coverage is translation-only on a larger flat map. Fresh-process reopening covers the original generated map, not the subsequently reused destination.

Three-Lane Anchor remains Experimental. Close original-model visual review and full family admission remain open; admitted family count stays 20. V100 remains the combined baseline and the accepted v96 installer and selected launcher build are unchanged. No commit, push or publication was performed.

## Focused native model review

`outputs/anchor-restart-native-JhvhJk/report.json` passes v105 `--expanded --visual`, with 20 hashed screenshots taken through existing GUI camera controls: overhead/ground views for each team and eight building roles per team. Power icons, tint and terrain grid are disabled for visibility. Whole-map and history comparisons prove these inspection actions did not edit the generated map.

Independent review inspected both overheads and both teams' power cell, repair pad, refuel pad, gun and launcher close views. Focused original models are fully framed and legible with no obvious intersection or rendering defect; neighboring models can be cropped at viewport edges. Overheads show the three courts and rear road. Whole-base ground views remain too distant for individual placement review. This closes the focused-model visibility gap for this large, expanded, flat-map seed only; multi-seed/size visual comparison and full admission remain open.

## Expanded authored library round trip

`outputs/anchor-restart-native-d7S3yB/report.json` passes v105 `--expanded --authored --authored-library`. The captured v2 base is saved to the isolated authored library, exported to a harness-written JSON file, removed, preview-imported without writing, and imported. The restored library entry supplies the package for the larger-map reuse test. Map/history remain unchanged through library operations. A second fresh process (15280 to 24540) explicitly reopens the reused map and verifies the complete persisted library and reused map, closing the earlier reused-destination reopening gap.

Independent harness review found no material assertion defect. This is MCP library operation coverage and explicit file reopening; GUI export/import and automatic recovery are not claimed. The runner now rejects `--authored-library` without `--authored` rather than silently skipping that coverage.

## Admission work remaining

The family quality contract in `BASE_LIBRARY_AND_DESIGNER_PLAN.md` still requires a complete review before promotion:

- Spatial/composition contracts and source topology/model-fitting checks exist; retain those contracts and the v1/v2 distinction.
- The 288-case offline variation report is complete below. Rotation follows seed parity, so this is not an independently crossed rotation matrix.
- Representative native-imported flat variations and focused original models have been reviewed as recorded below. Coverage remains sampled, not exhaustive.
- Eight stable golden recipe expectations now cover default and expanded counts at each size.
- Assemble the eight-contract admission review using the exact native/source/portable evidence above, then perform promotion and rebuilt catalog verification. Do not count Experimental as admitted or substitute v105 scoped tests for whole-editor combined acceptance.

## Golden recipe regression

`tests/fixtures/three-lane-anchor-golden.json` pins all four sizes at default and expanded counts (eight full local recipe outputs), seed `anchor-golden-v1`, SHA-256 `762c631983d976394677ef67e15286b929f13f348de9ec77588ed71c77108ea3`. The first test in `tests/three-lane-anchor.test.mjs` compares full topology, original-model placements, service paths and recipe metadata. Targeted test passes in `outputs/three-lane-anchor-golden-tests.log`. The explicit fixture writer refuses to overwrite an existing file. Independent review found no substantive defect. This supplies regression expectations for existing v1/v2 behavior, not an independent proof that the generated design is correct; no product code or executable changed.

Initial native variation evidence `outputs/anchor-restart-native-ZVAqSr/report.json` passes import equality and camera-only checks for two expanded seeds at all four sizes. Independent review confirmed readable topology but found that differing rotation and checkerboard texture obscure a clean variation comparison. These images do not close the variation visual gate. A following comparison uses same-angle seeds 0/2 and separate copies with original snow texture tags; original source candidates remain untouched.

## Completed variation matrix and controlled visual comparison

`outputs/anchor-variation-review-f2ms9z/report.json` passes all 288 offline cases: twelve deterministic seeds x four sizes x flat/valley/irregular fixtures x minimum/expanded counts. All 288 placements succeed on these deliberately gentle fixtures. Each successful recipe repeats identically apart from the new layout's wall-clock authoring timestamp; terrain and prior layouts remain unchanged, exact team counts and eight cells/team hold, and six sockets, sixteen reservations and twelve service paths remain present. Every candidate and all three input fixtures are saved with hashes. Rejection evidence comes from the separate steep-terrain native matrix, not this all-success run. Initial `anchor-variation-review-c5YAah` failed because the test compared changing authoring timestamps; it is retained and only that field is excluded in the corrected comparison.

`outputs/anchor-restart-native-VHZcdE/report.json` passes import equality and camera/history preservation for the eight visual candidates (all four sizes, expanded seeds 0/2 at the same zero-degree angle), with sixteen overhead screenshots. Separate named visual copies replace only texture tag tables with original snow textures; source files and both hashes remain recorded. Independent comparison of small/large/massive pairs finds modest but substantive changes in mouth bend direction, court lengths/frontage and defense placement, while the three-court identity stays consistent. No obvious topology clipping or overlap is visible. The earlier close-model views remain the model-quality evidence; these overheads cover two expanded flat seeds and do not represent every possible arrangement.

Independent audit verified the exact 288 tuples, all candidate/fixture hashes and the manifest hash. Its remaining documentation finding was addressed by `THREE_LANE_ANCHOR_GUIDE.md` and three reviewed images. Follow-up review confirmed role totals, all four example footprints, corridor widths, terrain/count/version limits and socket/reuse instructions, with no actionable factual error. The eight-contract evidence is ready for a final admission record; source promotion and rebuilt catalog verification remain the next steps.
