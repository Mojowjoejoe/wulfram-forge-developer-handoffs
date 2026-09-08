# Wulfram Forge: complete map-making roadmap

Initial review: 2026-09-06. Status: implementation in progress. Current build/feature/test mapping and remaining acceptance are tracked in [Product acceptance matrix](PRODUCT_ACCEPTANCE_MATRIX.md). Sprint progress below records implemented slices; whole milestones remain open.

Latest scoped library checkpoint: [Three-Lane Anchor admission v106](THREE_LANE_ANCHOR_ADMISSION.md) adds the 21st reviewed family, with 27 remaining toward 48. Native Creative-library controls, expanded GUI/MCP placement, authored reuse and reopening pass; the 288-case source variation matrix and reviewed illustrated guide support admission. V106 is the accepted combined private baseline; see [combined evidence](COMBINED_BASELINE_V106.md).

## Product outcome

A first-time mapper can start from an empty map, an original map, or a randomized recipe; shape terrain; design and place bases; understand warnings; and save a portable, editable project and game export. An experienced mapper can work directly with precise manual tools, reusable formations, and controlled randomization.

The next priority is a coherent editor workflow and a better base-design workspace. Adding many more isolated controls or near-identical presets would make the current navigation problem larger.

This is the primary **product and usability** roadmap. The workspace's [publication roadmap](../../WULFRAM_BALANCED_MAP_GENERATOR_ROADMAP.md) still governs public-release readiness. This document does not authorize publication or replace its outstanding playtest requirements.

Companion: [Base library and designer specification](BASE_LIBRARY_AND_DESIGNER_PLAN.md).

Latest scoped progress: [multiple entrances v102](MULTIPLE_ENTRANCES_V102.md) adds up to three named exits per team with GUI/MCP preview, Apply/Undo, portable authored-package reuse and verified fresh-process file reopening. The corrected inspector has separated fields and top-of-form errors. V100 remains the combined baseline; family admission and remaining roadmap gates remain open.

## Review basis and boundaries

Reviewed the current editor UI source, terrain stamp controls/presets, generation and formation modules, inspection/coverage code, asset template JSON, package scripts, README, project catalog, and existing native receipts. The v9 EXE hash was checked against its report: `1863E1E19C9C41397BCFADED34C7C0C0B236C94D20C9B79C55EC5CB906463617`.

The latest route/base evidence is [v9](CREATIVE_ROUTES_V9.md), including `outputs/creative-native-XsPYAW/report.json`. Large landform evidence is [RC45](LANDFORM_POLISH_CRITIC_RC45.md), including separate stamp workflow and visual-lab receipts. These establish tested slices of the product. They do **not** establish that every feature combination has passed in one delivered build. This review did not rerun the complete editor or conduct new gameplay tests.

The checkout contains substantial uncommitted work. Existing release names, test counts, and public claims in older documents are historical. Baseline consolidation is therefore an explicit first step.

## Initial tool and feature inventory (v9 review)

“Present” means found in current source; evidence links describe the tested scope. “Planned” means requested work, not an existing guarantee.

| Area | Present now | Main gap to address |
| --- | --- | --- |
| Project lifecycle | New/import, original formats and JSON/source formats, local autosave, named layouts, undo/redo, ZIP export and repository workflow | Clear distinction between editable project, game export, local recovery and repository save; visible recovery history |
| Manual terrain | Raise/lower, smooth, level/exact heights, painting, brush shape/size controls, grayscale heightmap preview and shaping | Unified help, useful brush presets, clearer brush versus large-landform workflow, explicit affected area |
| Large brush shapes | 3D landform stamps with live terrain/texture preview, independent length/width, rotation, height/depth, bend, roughness, edge blending, protected/manual modes and saved presets | Searchable visual library; protection painting; later editable paths and reusable terrain compositions |
| Terrain starters | Five named starters: Mountain Ridge, Winding Valley, Impact Crater, Gentle Foothills, Mountain Pass | Broader authored examples and terrain-specific walkthroughs; not another implementation of the existing shapes |
| Random maps | Seeded generation; open-field, three-route and ring-center topologies; dimensions, relief, separation and route controls; candidates and bounded passing-map search | Beginner recipes, understandable tradeoffs, independently locked terrain/routes/bases, local regeneration |
| Terrain detail | Replaceable rocky terrain detail with authored-area protection requirements and preview/diagnostics | Explain prerequisites before rejection; manual projects need a clear way to author protection data |
| Manual building | Original asset catalog, team choice, single-unit placement/movement, numeric transforms, Ctrl handles, template placement and terrain fitting | Multi-select, groups, duplicate/align, named districts, editable base boundaries and entrances |
| Existing templates | Asset JSON contains **74 templates: 73 extracted formations and one curated Base in a Box** | One searchable browser with source, purpose, dimensions, thumbnail and supported controls |
| Formation families | **15 creative styles**, five built-in layout choices and four advanced preset definitions | These collections overlap conceptually; do not add their counts and advertise them as unique new base designs |
| Creative controls | Four sizes, target counts, mirrored placement, rotation, area radius, terrain adaptation, entrance reservation, three options | Pins, role budgets, district-level edits, partial rerolls and composition from manually authored modules |
| Reuse | Formation favorites and local terrain presets | Search, rename/delete, portable import/export, versioning and migration |
| Displays | Power tint/icons/circles, estimated Darklight and weapon rings, area/entrance guides, access lines, clearance markers; display panel/reset | Persistent preferences, contextual defaults, common legend and fewer simultaneous overlays |
| Inspection | Base/building camera focus, power-source inspection, route tour, width-based clearance warnings | Explain limits consistently; measurements, saved cameras and verified vehicle/game rules |
| Validation | Bounds, terrain slope, spacing, power and team requirements; sampled access/clearance and generation checks | One problem list with location, cause, consequence, suggested fix and evidence level |
| Automation | Local MCP bridge, test harnesses and repository tooling | Version/capability discovery, documented errors and parity with the same operations exposed in the UI |
| Delivery evidence | Native tests, diagnostics and private packaged builds exist | One release matrix covering manual, randomized and hybrid creation; clean-machine and gameplay receipts |

Primary source anchors: `components/editor/editor-app.tsx`, `terrain-viewport.tsx`, `terrain-stamp-panel.tsx`, `route-inspector.tsx`; `lib/terrain-brush.ts`, `terrain-stamp.ts`, `terrain-stamp-project.ts`, `balanced-map-generator.ts`, `formation-terrain.ts`, `formation-favorites.ts`, `route-inspection.ts`; `public/assets/base-templates.json`.

## Main findings

1. **Features are distributed across competing entry points.** The toolbar, modal generators, state dropdown, template selector, favorites, display controls and both inspectors need a common structure. A user should not have to know which generation system created an object to edit it.
2. **There is help, but no complete learning path.** Existing field help and diagnostics are valuable. Missing is a consistent “what this does, when to use it, what changes, how to undo, and why it failed” contract for every tool.
3. **Preview and saved state need a single vocabulary.** Some work previews and then applies; brush clicks apply immediately. Both can remain, provided the interface says which action will happen and what is affected.
4. **The library already has breadth but lacks discovery and authorship.** Browse existing templates first; build the catalog and editing model before expanding to dozens more creative families.
5. **Current creative adaptation moves powered groups.** It does not yet provide a general layout solver or a district editor. A proper base designer should let the mapper compose and constrain those groups directly.
6. **Visibility and interaction mode are different.** Hiding power colors must not disable power checks. Hiding an inspector should stop its camera tour. Inspection, placement, painting and transformation need clear active-mode feedback.
7. **Verification is fragmented.** Separate terrain and base releases are not sufficient proof of the complete mixed workflow. The main npm test list also does not automatically include every newer formation/inspection/MCP suite.

## Proposed editor organization

Retain a central viewport and familiar controls. Organize the workspace by task:

| Workspace | Primary actions |
| --- | --- |
| Start / Project | Blank map, randomized recipe, import original/project, recent maps, recover work |
| Terrain | Sculpt, paint, exact height, large landforms, heightmap import, terrain selections and protections |
| Bases | Unit catalog, preset browser, base designer, layout states, district/group editing |
| Inspect | Problems, power, access, clearance, measurements, cameras and comparison |
| Save / Export | Save editable project, export game map, reopen checks and optional repository tools |

Left side: tools/library. Right side: settings for the selected tool or object. Bottom: concise status and current operation. Put long technical diagnostics behind a details control. Keep primary Preview/Apply/Cancel or brush-operation controls visible while scrolling.

Provide **Guided** and **Advanced** presentation using the same underlying operations and data. Advanced exposes numeric controls and source details; it does not bypass validation. Experienced users can skip the tutorial entirely.

## Roadmap and dependencies

These are scope blocks, not calendar promises. Split a block if its acceptance gate cannot reasonably fit one sprint. Start with R0 and R1.

| ID | Sprint | Deliverables | Acceptance gate | Depends on |
| --- | --- | --- | --- | --- |
| R0 | Consolidate the product baseline | Inventory each visible action; select one private build; map all relevant suites to an acceptance runner; update catalog/version receipts | The same EXE completes manual, random and hybrid terrain-to-export workflows, including large landforms, v9 base/route tools, restart and reopen; originals unchanged | Current audit |
| R1 | Navigation, explanations and display preferences | Task-based navigation, active-mode banner, consistent action labels, tool help cards, shared overlay legend, persisted display preferences and reset | A fresh user can find sculpt, large stamp, base preset, undo and export without developer assistance; keyboard/high-DPI review; preferences survive restart without changing map files | R0 |
| R2 | Manual terrain workspace | Visual brush/landform library; selection masks, keep-out/protected areas for manual maps; terrain measurement; reusable brush settings | Build a ridge, valley, pass and flat base site by hand; protected structures/routes remain protected; undo and saved-setting reload reproduce the work | R1 |
| R3 | Unified preset catalog | Searchable cards for imported, curated, creative and user entries; filters, thumbnails, details, favorites management and portable libraries | Find an appropriate small base and large compound by role/terrain/size; inspect provenance; import/export a user library without duplicates or loss | R1; specification below |
| R4 | Base designer foundation | Multi-select, groups/districts, group transform/duplicate, anchor/orientation, explicit paired/unpaired placement, locks, save selected group as module | Manually create a unique base, move a service yard as a group, protect a command area, save the base and reuse it on another map with one-step undo per operation | R2, R3 |
| R5 | Randomized map recipes and hybrid editing | Beginner recipes; separate seeds for terrain/routes/bases/detail; lock sections; compare candidates; regenerate selected eligible areas | Keep hand-built bases and a protected ridge while rerolling eligible terrain/detail; seed/settings/version replay is reproducible; rejected generation changes nothing | R2, R4 |
| R6 | Constraint-based base composition | Role budgets, district relationships, editable entrances/courts, terrain suitability, pinned elements, partial rerolls, explanatory failures | Reroll defense districts while services stay exactly fixed; maintain chosen team/symmetry policy, counts, spacing, power and exits; explain infeasible combinations | R4, R5 |
| R7 | Expand the creative catalog | Grow to a proposed 48 distinct creative families in reviewed batches; terrain-aware examples and authoring guides | Every accepted family meets the catalog quality contract; topology differs meaningfully; variants and imported duplicates are not counted as new families | R3, R6 |
| R8 | Integrated inspection and help completion | Unified clickable problems; measurements/scale aids; overlay confidence badges; workflows and troubleshooting; performance/accessibility pass | Users can explain and fix an unpowered pad, blocked approach, unsuitable slope and invalid preview; large maps stay usable against an agreed benchmark | R1–R7; help written throughout |
| R9 | Complete map-making acceptance and release preparation | Small example-map pack, clean-machine test, complete manual, migration tests, runtime-rule receipts and game trial checklist | Manual, generated and hybrid maps survive export/reopen; game compilation/loading and vehicle trials recorded separately; public release only through the existing release process | R8 and game/server access |

### Ready-to-start backlog

R6 paired positions: [Paired districts v26](PAIRED_DISTRICTS_V26.md) adds explicit matching-partner validation and equal/opposite XY shifts. Independent mode remains the default. Native paired preview, Apply, fixed-building preservation and Undo passed in the scoped KxZ946 receipt. Full geometric symmetry and composition budgets remain open; the report records successful reruns and intermittent native-test failures.

R6 arrangement preview: [District arrangements v25](DISTRICT_ARRANGEMENTS_V25.md) shifts eligible groups with deterministic bounded search, fixed-building preservation, checked candidates, Cancel and Apply/Undo. Role budgets, internal rearrangement, relationships and mirrored composition remain open.

R6 composition intent: [District composition v24](DISTRICT_COMPOSITION_V24.md) adds saved roles, default-fixed variation permissions and whole-group eligibility explanations. Locks and overlapping fixed membership take precedence. Actual arrangement generation, budgets and partial rerolls remain open.

Progress: [Product sprint v10](PRODUCT_SPRINT_R0_R1_V10.md) adds a combined acceptance runner, task-navigation guide, active-tool help and persistent display preferences. R0/R1 remain open as overall milestones; the report lists acceptance gaps.

R3 first slice: [Visual base library v11](BASE_LIBRARY_V11.md) delivers searchable original/curated/creative/personal collections, role-colored layout cards, size/count/role/terrain-handling filters and placement handoffs. Portable personal libraries, favorites management, district editing and novice acceptance remain open; R3 is not marked complete.

R3 continuation: [Portable saved-base libraries v12](PORTABLE_BASE_LIBRARY_V12.md) implements versioned import/export, preview/cancel/merge, duplicate and ID-conflict handling, rename/remove, and separate library undo. District authoring and full novice acceptance remain open. This supersedes the v11 portability/management gap above without marking the whole roadmap complete.

R4 foundation: [Base Workshop v13](BASE_WORKSHOP_V13.md) adds list-based multi-selection, visible selection rings, named districts in layout metadata, numeric group move/rotation and duplication, and one-step map Undo. Direct group gizmos, locks, alignment, reusable district modules and the complete R4 acceptance journey remain open.

R4 continuation: [Base Workshop v14](BASE_WORKSHOP_V14.md) adds planar group mirroring, named-record renaming and membership replacement, including recovery when multiple records reference deleted buildings. Locks, reusable modules and the full authoring journey remain open.

R3/R4 module foundation: [District modules v15](DISTRICT_MODULES_V15.md) adds selection capture, My districts cards, version-2 portable storage, single-team hover placement and automatic named membership with one-step Undo. Locks, connections, direct group manipulation and the complete manual journey remain open.

R4 protection: [District locks v16](DISTRICT_LOCKS_V16.md) adds persisted lock controls and transaction checks for buildings, membership and supporting terrain, including inactive layouts and MCP edits. Direct group manipulation, authored connections, partial rerolls and complete workflow acceptance remain open.

R4 lock verification follow-up (v16.1): corrected distant MCP terrain edits so locked buildings retain their original transforms, and extended acceptance to individual movement plus near/far terrain edits. See the v16 guide for the regression and receipts.

R4 alignment: [District alignment v17](DISTRICT_ALIGNMENT_V17.md) adds explicit row/column alignment and equal center distribution with Undo and lock enforcement. These edit internal spacing; direct manipulation, authored boundaries/connections and partial rerolls remain open.

R4/R6 authored areas: [Build areas v18](BUILD_AREAS_V18.md) adds rectangular Build inside and Keep clear rules with team scope, terrain-following outlines, explicit Apply/Remove, map Undo and placement guards. This reserves building space; it does not yet implement editable route geometry, terrain/drivability constraints, connection sockets or partial rerolls.

R4/R6 corridor foundation: [Authored corridors v19](AUTHORED_CORRIDORS_V19.md) adds ordered-point paths with full-width rounded reservations, visible magenta outlines, editing, export and placement enforcement. This is building-space protection; direct point manipulation, district sockets, terrain/drivability constraints and partial rerolls remain open.

R6/R8 corridor inspection: [Corridor inspection v20](CORRIDOR_INSPECTION_V20.md) connects saved paths to width/terrain diagnostics, issue focus and camera following without map mutation. Samples and camera travel remain editor evidence; direct manipulation, constraint-aware partial rerolls and game driving trials remain open.

R2/R5 terrain protection: [Protected terrain v21](PROTECTED_TERRAIN_V21.md) adds named height-protection rectangles, shared-layout enforcement and whole-edit rejection for intersecting terrain changes. V21.1 also checks authored constraints in the shared stamp preview. Texture painting remains available. Eligible-region regeneration and protected paint masks remain open.

R2/R5 detail eligibility: [Authored detail v22](AUTHORED_DETAIL_V22.md) includes height areas and mirrored partners in detail generation's protected mask. V22.1 records versioned protection geometry and rejects changed protection before replacement. Supported-map detail rerolls preserve them; general terrain regeneration, asymmetric recipes and partial district rerolls remain open.

R2 reusable settings: [Portable stamp library v23](STAMP_LIBRARY_V23.md) adds validated import/export, merge preview/cancel, duplicate/conflict handling and explicit capacity rejection to existing saved stamps. V23.1 adds session library Undo and verified local backup before corrupt-data reset. Native recovery/download verification and multi-landform compositions remain open.

- [x] **R0-01:** Produce a single build/feature/test matrix, including newer tests outside `npm test`. [Current matrix](PRODUCT_ACCEPTANCE_MATRIX.md) inventories 44 source suites (29 outside default npm test), verifies the v23.1 EXE receipt and distinguishes standalone tools and unproven acceptance. This closes the mapping task, not R0 as a whole.
- [x] **R0-02:** Run the combined landform → creative base → manual adjustment → route inspection → export → reopen workflow on one exact EXE. V28 receipt `outputs-desktop-test-qFj7xu/report.json` verifies this sequence, Undo/Redo and normal process restart; [evidence](EDITOR_HELP_V28.md). Broader roadmap and gameplay acceptance remain separate.
- [x] **R0-03:** Record supported formats, template counts, build identity, limitations and recovery behavior in an editor-facing About/Help baseline. [V28 About/Help](EDITOR_HELP_V28.md) reads native identity and current catalog counts; native A2wHHe validates the display without map mutation. Broader combined acceptance remains open.
- [x] **R1-01:** Design a reviewable navigation prototype with the existing tools mapped into it; do not remove functions to simplify the screenshot. Delivered as the v10 task guide; full workspace reorganization remains future work.
- [ ] **R1-02:** Implement contextual settings and visible operation scope: preview, direct brush edit, active layout, mirrored pair or whole terrain.
  - [Tool finder v30](TOOL_FINDER_V30.md) adds searchable contextual shortcuts with focus and creative-preview protection. Native navigation and standard desktop workflow passed in `outputs-desktop-test-WkNggO/report.json`; broader contextual settings and novice/keyboard acceptance remain open.
- [x] **R1-03:** Add the common tool-help format and write it for the five most frequent operations first. V10 covers seven terrain modes plus base editing and inspection.
- [x] **R1-04:** Persist display preferences separately from projects; support reset and corrupt-preference recovery. Delivered in v10.
- [ ] **R1-05:** Test novice discovery, keyboard use, reduced window size and high DPI; fix issues before expanding the feature set.
  - [Tool finder v30.1](TOOL_FINDER_V30.md) passes keyboard result navigation and focus visibility at 1280×800 / 125% scale in `outputs-desktop-test-TQ8lsd/report.json`. This is a tested path, not full accessibility or novice acceptance.

## Manual terrain and large-shape plan

Keep and improve the current large brushes rather than rebuilding them. Make each card show footprint, relief, texture behavior and protected/manual placement behavior. Include a size reference beside the ghost; make units and the distinction between radius and full width explicit.

Next additions: select an area for sculpt/paint operations; paint protected zones; create flat service sites with explicit extent; save a composition of several landforms; provide a before/after preview for broad edits. Later, add user-drawn editable ridge/valley/ramp paths that share a tested geometry kernel with preview and Apply. The current bend controls already curve landforms; editable control-point paths are the proposed extension.

Proposed landform catalog categories: ridges and escarpments, valleys and channels, passes and ramps, plateaus and base shelves, craters and bowls, hills and low cover. Visual water/ice materials must not imply unimplemented water or slipping mechanics. Destructive terrain reshaping requires an explicit operation, not an invisible side effect of placing a base.

## Randomized and hybrid map plan

Offer recipes such as Open Battlefield, Three-Lane Arena, Ring Battlefield, Valley Front and Custom. The first three build on current topology options; other named recipes need explicit implementation and testing. Describe each recipe's route/terrain tradeoff in plain language.

For each generation layer, show its seed, locked areas, eligible change area, prerequisites and version. Let users reroll terrain, base arrangement or cosmetic detail independently. Compare candidates at a shared camera with counts and failure explanations. A failed or canceled search must preserve hand edits and the current map.

Preserve the requested rectangular three-lane concept as a future authored recipe: user-selected opposing base positions, no central repair outpost, two core defensive positions per base and two single defensive positions per lane per team. Use supported structures; do not claim tower strength, tower progression, minion waves or victory scripting without game support. Terrain layout and gameplay systems remain separate.

## A better base-design system

R7 pipeline progress: [Frontier v3](FRONTIER_PIPELINE_V3.md) moves recipe checks into shared candidate generation and verifies count/adaptation/reservation enforcement. Portable reservation support now has source implementation and regression coverage in [library schema 3](PORTABLE_RESERVATIONS_V3.md); native favorite reuse acceptance is still required before picker integration. The catalog remains 15 reviewed creative families.

R7 experimental work: [Frontier Camp v1 review](FRONTIER_CAMP_REVIEW_V1.md) provides four importable candidate sizes with enforced expansion strips. The 144-case report records 48 flat successes and 96 non-flat pairing rejections; native import/inspection of all four flat candidates passed. This does not add a reviewed family to the 15-family library yet.

Catalog progress: [Library traits v34](LIBRARY_TRAITS_V34.md) completes the shipped inventory with computed composition tags, a matching library filter and four exact source-arrangement duplicate pairs documented without deletion. Native filter/details/nonmutation checks passed in `outputs-desktop-test-p7brLw/report.json`. The catalog remains 15 creative families; expansion and topology review gates remain open.

R6 progress: [Composition counts and limits v31](COMPOSITION_LIMITS_V31.md) provides explicit per-team count constraints with common edit enforcement and native authoring/Undo evidence. This is a hard-count authoring layer; district role solving, soft targets and broader composition solving remain open. Retained repair-limit export/reimport and native bridge rejection passed in `outputs-desktop-test-BE8xMk/report.json`.

The target is a **base workshop**, not a longer dropdown. Users can start from an existing preset or an empty boundary, then work at three levels: whole base, district, and building.

- Draw or choose a base boundary and entrance directions; reserve courts, service approaches and connection paths.
- Place reusable districts: command, repair/refuel, power, gun/flak defense, missile support and concealment experiments.
- Move, rotate, duplicate, mirror or lock districts; drill into individual buildings when needed.
- Set composition goals such as target count, service capacity and defensive mix. Keep these separate from physical area and model scale.
- Randomize eligible districts while pinned buildings, authored exits and protected terrain stay unchanged.
- Show why a request cannot fit and which adjustable condition would help; never silently drop required structures or alter live-range assumptions.
- Save a fixed arrangement, a reusable district or a generative recipe as distinct library types.

Start with groups and direct editing in R4. General constraint solving comes later. This reduces the risk of a large generator rewrite before the authoring interface is useful.

## Explain every feature consistently

R8 progress: [Saved-rule problems v32.1](AUTHORING_PROBLEMS_V32.md) collects active-layout authoring failures and links to settings. Native imported-error, focus and preservation checks passed in `outputs-desktop-test-PvVOj0/report.json`; review also fixed unchanged recovery saves being blocked by existing invalid rules. Full unified inspection and multi-error recovery editing remain open.

Each tool/control needs: **purpose; when to use it; input units; preview behavior; scope of change; commit action; undo behavior; prerequisites; failure/fix examples; known limits**. Short help belongs beside the control; illustrated examples and technical details belong in the help panel.

Required walkthroughs: first manual map; first random map; hybrid editing without losing authored work; large brushes and protected zones; building a powered service yard; editing/reusing a base; explaining clearance and confidence levels; save versus export versus recovery.

Every overlay needs a name, symbol/line pattern, color legend, toggle and evidence level. Use text/patterns as well as color. Say “estimated weapon radius” and “sampled route clearance” where those are the actual limits. Do not turn “no detected problems” into “gameplay certified.”

## Data, automation and engineering requirements

Recovery progress: [Advanced saved-rule repair v33](RULE_REPAIR_V33.md) provides an explicit four-category metadata repair preview, original JSON download and one-step Undo. Native backup/nonmutation/Apply/Undo checks passed in `outputs-desktop-test-KfW96p/report.json`. This advances multi-error recovery; novice forms, retained-repair export/reopen and inactive-layout recovery remain open.

- Preserve original map import/export fidelity, unknown legacy rows, inactive layouts and user metadata.
- Version presets, recipes and generation kernels; store seed and exact generation version. Migrate by explicit versioned rules, never by rerunning an old seed with new logic.
- Store display preferences separately from maps; preserve portable libraries independently of browser storage. Recovery snapshots need clear timestamps, retention and restore previews.
- Reuse geometry, validation and placement operations across manual tools, generation, previews, MCP and exports. Split the large editor component along these boundaries as needed to support the roadmap, not as an unrelated rewrite.
- MCP should expose current capabilities and operation scope, require fresh session/revision checks for mutations, and report structured failure reasons. A preview is not an apply receipt.
- Establish benchmark maps and responsiveness targets before optimization. Large area previews/search should support progress/cancellation where work exceeds the agreed interaction budget.
- No hidden editing of existing maps to make checks pass; preserve Power Run, Icebound and other reference fixtures.

## Sprint completion and whole-product acceptance

Every implementation sprint: review against the relevant user journey, reproduce defects, repair, run targeted tests and required shared checks, inspect the packaged UI, save evidence against the exact build, and record remaining limits. Use the existing critic loop. Distinguish single-agent review from any independently requested reviews.

Minimum combined matrix:

| Journey | Required proof |
| --- | --- |
| Manual | Blank rectangle → large ridge/valley/pass → paint → custom base → inspect → undo/redo → save/export/reopen |
| Random | Recipe → seed → three candidates → choose → apply → reproduce source → inspect → export/reopen |
| Hybrid | Import original → protect important regions → partial regeneration → manual district changes → compare retained layouts |
| Failure/recovery | Impossible count, blocked entrance, missing protection metadata, empty preview, corrupt preferences/library, canceled work, autosave full and restart recovery |
| Accessibility | Keyboard-only discovery and operation, visible focus, non-color warning cues, small window and high-DPI layouts |
| Gameplay | Load compiled maps, drive service approaches, test turning/collision and runtime power/ranges; record game/server configuration |

The first five are editor acceptance. The last is separate game evidence. “Complete for custom map making” requires both a coherent editor and documented game compatibility; it does not require unsupported MOBA scripting or unrelated game features.

## Maintaining this plan

Use the R0–R9 IDs in task names and sprint reports. Check off acceptance with an exact artifact/test receipt, record any scope changes and link the new report here. Update the project catalog to point to the current product plan and latest tested build. Do not mark a feature complete solely because it appears in a screenshot, exists in source or passes a narrow unit test.

R6 distance relationships: [District relationships v27](DISTRICT_RELATIONSHIPS_V27.md) adds layout-local center-distance rules, explicit authoring and common manual/MCP/arrangement enforcement. Source checks and the full creative native suite pass, including constrained Apply, rule edit/remove/Undo and export/reopen enforcement. Broader native capture remains intermittent; see the exact receipts. Role budgets and other relationship types remain open.

R0-03 implementation: [About and recovery help v28](EDITOR_HELP_V28.md) replaces the stale sprint label with native build/runtime identity, live catalog counts and supported-file/recovery/validation explanations. The native About check and screenshot review passed in A2wHHe; R0-03 is complete. The later qFj7xu run also passed the full manual-adjustment and restart/reopen sequence, closing R0-02.

R1-02 scope display: [Operation scope v29.1](OPERATION_SCOPE_V29.md) adds a visible, expandable action-scope strip and distinguishes blocked landform previews. Native mode-transition and combined/manual/export/restart acceptance passed on v29.1 in `outputs-desktop-test-LlpogK/report.json`, including the blocked-state refinement. Broader contextual settings and novice acceptance remain open.

R7 private preview milestone: [Frontier v35.1](FRONTIER_PREVIEW_V35.md) adds an experimental picker entry and preview reservation outlines. Native generation, Apply/Undo, library export, larger-map reuse and restart pass. The extended library re-import test is pending after two isolated startup exits; full family review and catalog promotion remain open.

R7 portability acceptance follow-up: [v35.2](FRONTIER_PREVIEW_V35.md) passes native favorite removal/re-import, larger-map reuse, full map ZIP round trip and restart, including unchanged Save retaining the preview. Receipt: `outputs-desktop-test-iFXElt/report.json`. Remaining multi-size/non-flat and visual family review gates are unchanged.

R7 native size/terrain review: [twelve-case v35.2 matrix](FRONTIER_NATIVE_MATRIX_V35.md) passes generation, terrain preservation and Undo/Redo across all four sizes on flat/valley/irregular fixtures. [User guide](FRONTIER_CAMP_USER_GUIDE.md) added. Visual findings include tight route warnings on fitting candidates and reservation framing; family promotion remains open.

R8/R7 candidate comparison: [option clearance v36](OPTION_CLEARANCE_V36.md) shows blocked/tight approach counts before Apply, with explicit width and unavailable states. Native UI parity and portable workflow pass; this does not close family promotion or game collision gates.

R2/R5 composition foundation: [shared ordered landform proposal engine](TERRAIN_COMPOSITION_FOUNDATION.md) reuses stamp geometry, textures and protection checks, with source-preserving failure and portable validated recipes. Visual composition authoring, one-step editor Apply/Undo and native acceptance are the next integration work; the milestone remains open.

R2/R5 composition editor: [private v37.2](TERRAIN_COMPOSER_V37.md) adds ordered landform controls, combined terrain preview, source/draft checks, single-step Apply/Undo and portable recipe files. Native Preview/Cancel/Apply/Undo/export/import/restart passes. Persistent composition library, direct handles and remaining mixed/protected acceptance stay open.

R2/R3 composition persistence: [private v38](COMPOSITION_LIBRARY_V38.md) adds searchable local recipes, explicit update, remove/library Undo and restart reuse. Native persistence and map-preservation checks pass. Single-stamp/composer mode separation and remaining recovery/edit acceptance remain open.

R1/R2 composition mode: [private v39](COMPOSER_MODE_V39.md) pauses single-stamp input and hides its ghost/warning while composing, restores it on close, and adds tool-finder navigation. Native actual-click map preservation and full composition/library workflow pass.

R2 composition comparison: [private v40](COMPOSITION_COMPARE_V40.md) adds original/proposed terrain views and passes native comparison, protected-height rejection and source-change invalidation. The broader manual-region, direct-handle and mixed-map gates remain open.

R2 manual region editing: [private v41.1](TERRAIN_SELECTION_V41.md) adds numeric rectangular brush selections, visible outlines and full-cell clipping for heights/textures. Native boundary-crossing strokes, outside sculpt/paint no-ops, invalid extents and Undo/Redo pass. Direct handles, additional selection shapes, saved brush settings and broader acceptance remain open.

R2/R3 reusable manual brushes: [private v42.1](BRUSH_LIBRARY_V42.md) adds searchable saved brush controls, explicit update/rename, library Undo and portable validated import/export. Native restoration, duplicate rejection, export/re-import, restart and map preservation pass. Visual brush examples, direct selections and broader recovery/acceptance remain open.

R0 combined baseline refresh: [v42.1 acceptance matrix](PRODUCT_ACCEPTANCE_MATRIX.md) records passing full manual/hybrid, creative/district, random-search and recent terrain-workspace suites on one private EXE. Source: 289 pass, one existing skip. Repeatable supplemental runner and current 58-suite inventory added. Remaining feature, clean-machine, novice, game and intermittent restart-exit gates stay open.

R2/R8 terrain measurement: [private v43](TERRAIN_MEASUREMENT_V43.md) measures selected or whole-map extent, spacing, height range and steepest clipped terrain face. Analytic source tests and native edit/selection invalidation plus map preservation pass. Point rulers, slope overlays and broader performance/acceptance remain open.

R3 recovery: [private v44.1](LIBRARY_RECOVERY_V44.md) adds verified backup/reset and original-data downloads for damaged brush/composition libraries, with recovery access after restart. Native isolated-corruption, restored writes, exact downloads and unchanged-map checks pass. Automatic repair and a multi-backup browser remain outside this completed recovery slice.

R2 direct selection creation: [private v45.1](SELECTION_DRAWING_V45.md) adds on-map rectangle dragging, live preview, release-to-select and Escape cancellation while preserving terrain/history. Native drag/cancel plus clipping/measurement regressions pass. Resize/translation handles, polygon selections and remaining gesture gates remain open.

R0/R2 authoring regression extension: [v45.1 expanded workspace](PRODUCT_ACCEPTANCE_MATRIX.md) passes drawing interruptions, measurements, saved brushes, compositions, portable base reuse and damaged-library recovery on one EXE. The reusable `--authoring` suite records all five receipts. Hardware input, general hybrid recipes, catalog expansion and broader roadmap gates remain open.

R7 second review candidate: [Offset Bastion v1](OFFSET_BASTION_REVIEW_V1.md) adds a bent reserved approach and role-specific offset districts to the shared source pipeline. Source matrix and native representative import checks pass within the documented scope. Catalog promotion remains open, with route/visual/portability findings recorded.

R3/R7 Offset portability: [v46](OFFSET_PORTABILITY_V46.md) adds an experimental picker entry and retained bent approaches in versioned favorites. Native generation, portable/map round trips and Frontier compatibility pass. Test output can be redirected to D: after a C: capacity failure; receipts and release builds were retained.

R7 Offset size/terrain acceptance: [v46 native matrix](OFFSET_NATIVE_MATRIX_V46.md) passes twelve actual generation/Apply/Undo cases across four sizes and three terrains. Separate route review finds clear reserved paths and no blocked automatic routes at 80 units, but tight automatic approaches in every selected case. Candidate ordering, route quality and visual readability remain review work; no family promotion.

R7/R8 initial preview quality: [private v47](OPTION_PREFERENCE_V47.md) prefers fitting checked candidates with fewer blocked then tight approaches, retaining option order and manual choice. Native evidence selects a zero-tight third option over two tighter options, then preserves an explicit manual override through Save/Apply and portable restart checks. Route geometry and family admission remain open.

R7/R8 close inspection: [private v48](CLOSE_INSPECTION_V48.md) frames the selected building from its asset bounds, with native preview preservation, overview return and portable workflow acceptance. Repair-pad screenshot reviewed. Two pre-editor startup exits remain unresolved; the harness now captures startup output and optional host traces. Broader visual and roadmap gates remain open.

Whole-editor GUI pass: [organization review](GUI_ORGANIZATION_REVIEW.md) inventories all 26 editor components and assigns tools, settings, readouts and exports to task-oriented locations. Private v51.2 begins header grouping and help reduction, with native checks and a packaging-alias fix. Inspector, terrain, libraries, status organization and full GUI acceptance remain active work.

GUI hierarchy v52: selected-building controls now lead the inspector and selection scrolls to them; route inspection is expandable. [GUI review](GUI_ORGANIZATION_REVIEW.md) records passing native canvas selection, edit/Undo and map preservation. The full editor organization pass remains ongoing.

GUI sidebar v53: raw layout metadata is collapsed under Advanced with a search shortcut; power legends sit beside Display options. Native navigation, map preservation and selection/edit/Undo pass; see [GUI review](GUI_ORGANIZATION_REVIEW.md). Whole-editor reorganization remains active.

GUI sections v54: Build, Inspect and Rules separate editing, inspection and constraints. Native section/search navigation, route-width retention, map preservation and building edit/Undo pass. [GUI review](GUI_ORGANIZATION_REVIEW.md) retains remaining full-workflow, compact-screen and keyboard acceptance.

GUI terrain v55: Landform brush and Precise placement > Stamp at coordinates distinguish viewport and numeric placement. Native direct/search entry, Cancel/map preservation and protection-mode checks pass. Full v54 formation portability regression also passes; see [GUI review](GUI_ORGANIZATION_REVIEW.md).

GUI brush v56: common brush controls lead; grayscale settings sit beside Import grayscale and retain values when collapsed. Native ordering/navigation/state and unchanged-map checks pass. [GUI review](GUI_ORGANIZATION_REVIEW.md) retains actual import and broader workflow acceptance.

R0 GUI-era v56 verification: five combined authoring workflows and an actual grayscale import/preview/Cancel/Apply/Undo pass. Source suite: 304 pass, one skip. Exact receipts and remaining scope are in [GUI review](GUI_ORGANIZATION_REVIEW.md).

GUI display v57: one shared Display options section works in Terrain and Base builder. Native cross-mode preference, restart, reset and map-preservation checks pass; see [GUI review](GUI_ORGANIZATION_REVIEW.md).

GUI compact follow-up: see `GUI_ORGANIZATION_REVIEW.md`, private v58. Visual review exposed viewport overlap missed by the prior button-only test. CSS containment/wrapping and stronger checks are implemented; packaged verification is pending after three startup exits. R1 compact/accessibility acceptance remains open.

Private v58.2 closes the observed compact viewport-overlap regression and diagnosed native loader failure: see GUI_ORGANIZATION_REVIEW.md for exact build/hash and compact 4raKXH / restart w6kGLi receipts. R0 clean-machine/full baseline and R1 whole-GUI/accessibility remain open.

R1 GUI v59: persistent viewport instruction block replaced by collapsed contextual View controls. Compact native HQp7pZ passes at1280/960 including keyboard activation, containment and unchanged maps. See GUI_ORGANIZATION_REVIEW.md for exact build/hash and scope. Whole-editor navigation/accessibility and R0–R9 remain active.

R1 sidebar v60: collapsed favorites/layout help and clarified Map layouts heading; compact wu8O8h and formation portability QlSr2d pass on the same private EXE. Exact build/hash and limitations are in GUI_ORGANIZATION_REVIEW.md. Whole-roadmap acceptance remains open.

R1 repository grouping v61: labeled Repository disclosure replaces the permanent icon row; compact native AqNWJA passes with readable labels and unchanged maps. Exact build/hash/scope in GUI_ORGANIZATION_REVIEW.md. No repository writes or publication were tested or performed; remaining roadmap gates stay open.

R1 user-directed top toolbar structure v62: File/Edit/View/Terrain/Bases/Tools/Help command bar implemented, native959Sjc passes scoped compact menu and navigation checks. Exact build/hash in GUI_ORGANIZATION_REVIEW.md. Contextual tool-options strip and full menu accessibility remain pending. v61 broader baseline still has unresolved restart/export evidence and a corrected-but-not-rerun creative assertion.

R1 contextual options v63: shared brush, landform and manual-building settings beneath top menus; nativecnM2Xf passes synchronization/compact/map-preservation checks. See GUI_ORGANIZATION_REVIEW.md for exact private build and remaining context-specific controls. Full R0–R9 goal remains active.

R1 keyboard v64: focused top-menu arrow/Home/End navigation implemented and scoped native4y8RjI passes on private build. Exact hash/scope in GUI_ORGANIZATION_REVIEW.md. Full accessibility and R0–R9 acceptance remain incomplete.

R0/R9 export follow-up on v64: focused native s4MDms proves completed ZIP download survives exit/restart and reimports with exact terrain/layouts. Combined gate now waits for download completion. Full landform rerun remains failed before export (egwvNI Undo comparison); see GUI_ORGANIZATION_REVIEW.md. No full-baseline promotion.

v64 combined journey ZjrVGm now passes with exact live/saved Undo restoration for five presets and completed-download export/restart/reimport. See GUI_ORGANIZATION_REVIEW.md for scope and unresolved historical failure attribution. Full aggregate and R0–R9 remain open. Further GUI direction awaits clarification of the user's correction.

Current private build update v65: fixed header Generate dropdown being obscured by the new menu bar. Random search zcBfqX and five-case authoring outputs-terrain-workspace-LkYNRZ pass. v64 creative/library/district/relationship xaTDZp and current-source307tests/306pass/1skip also recorded in GUI_ORGANIZATION_REVIEW.md. Results remain build-specific; no full v65 aggregate or R0–R9 completion claimed.

R0 combined verification milestone: v65 passes outputs/product-baseline-sxp5lh/report.json with --relationships --authoring on one unchanged executable. Current acceptance matrix now starts with that baseline and its child receipts. Every-visible-action inventory, clean-source/build attestation and remaining R1–R9/external gates are not complete. Continue feature work from this verified private baseline.

### R2 selection-to-protection private build v66

Terrain > Brush selection now offers **Protect selected heights** and **Edit protected areas**. The first saves the rectangle through the existing build-area validator and map Undo; the second opens Base Rules. Terrain mode includes saved height-protection outlines when boundaries/overlays are enabled. Heights are protected across layouts; textures remain editable. This is not a general protected paint mask.

Private executable: `D:/WulframForgeBuilds/selection-protection-v66/WulframForge.exe`, SHA-256 `1DD89A795AAC3EEFA6F75547CB1F442574F43EF23D8FE7D85E8F1FA6E797DADC`. Native receipt: `D:/WulframForgeTestRuns/outputs-desktop-test-NZ3OCd/report.json` PASS: saved rectangle, rejected height stroke with unchanged project, Undo/Redo, Rules navigation, and ordinary selection clipping/clear behavior; zero renderer errors. Screenshot reviewed for control placement; coincident selection/protection outlines do not independently prove outline distinguishability. Typecheck and scoped editor lint passed before packaging. Targeted build-area, selection and MCP tests: 17/17 passed in `outputs/selection-protection-v66-tests.log`; MCP synchronization passed. Earlier rTNhYp and NRK8W5 test failures are retained: save overwrote the warning before assertion, and returning from Rules collapsed the selection disclosure. Runner fixes read the warning before saving and reopen the disclosure.

MCP impact: existing `edit_terrain` enforces these saved rules via shared constraints; export retains layout metadata. Direct rule creation/removal remains an integration gap: the bridge currently exposes no build-area command and does not capture the GUI's temporary selection. Do not infer a selection or bypass constraints through arbitrary metadata writes. Remaining integration requires an explicit validated rectangle/rule operation with revision checks, native allowlist, both server schemas, and Undo tests. This sprint does not claim MCP authoring parity or complete R2. No commit, push or publication. The v65 combined baseline remains the last full aggregate acceptance; v66 has focused acceptance only.

### R2 MCP terrain protection — private v67

The v66 MCP authoring gap is closed for adding/removing named height-protection rectangles. `edit_terrain_protection` requires explicit session, revision and active layout plus a strict add/remove edit. Shared build-area validation preserves other rules and terrain; the bridge and editor commit authorize only this rule change, with one Undo step and acknowledgement after revision changes. `inspect_map.terrainProtection` exposes rules grouped by layout. The native allowlist, integrated and standalone servers, README and tests are synchronized. GUI selection is not inferred by MCP. Resizing is still through the existing GUI rules editor; this MCP tool adds/removes rectangles.

Private executable: `D:/WulframForgeBuilds/mcp-protection-v67/WulframForge.exe`, version `0.7.0-creative.67`, SHA-256 `2F6A1F881A74D31C2F9913FDEC93E165B42E3B2FA04B8060DD455312AA8F1E84` (unchanged after native checks).

Evidence:
- `tools/mcp/MapEditerMCP/outputs/mcp-native-test-0UAXxa/report.json` PASS through real stdio/native transport: add into empty/existing collections; stale revision, wrong layout, missing ID and unexpected fields reject; protected heights reject; textures change with heights preserved; saved snapshots retain addition/removal; remove and Undo restore rules; existing entity/terrain/export/deadline checks pass.
- `D:/WulframForgeTestRuns/outputs-desktop-test-jca01D/report.json` PASS on the same EXE: GUI protection, Undo/Redo, Rules navigation, selection clipping and clearing; zero renderer errors.
- `outputs/mcp-protection-v67-source-all.log`: 309 tests, 308 passed, one existing skip, no failures. Targeted MCP suite 10/10; standalone package 8/8 in `tools/mcp/MapEditerMCP/outputs/mcp-protection-v67-package.log`. Typecheck, scoped Oxlint, and MCP synchronization passed. Initial ESLint invocation was the wrong runner; project Oxlint passed. Typecheck excludes `outputs/**` because generated developer-kit archives otherwise redeclare the old global bridge type; current source remains checked.
- Independent read-only critic found two commit authorization gates and proposed-versus-committed acknowledgement risk; implementation addresses both. Follow-up found no product defect and requested protected texture/removal snapshot evidence, now included and passing.

Local source and rebuilt private binaries only; nothing committed, pushed or published. This is focused v67 acceptance, not a new full aggregate baseline or completion of R0–R9. Game/server and novice evidence remain separate and unavailable here.

### R1 contextual manual tools — private v69

The top tool-options row now exposes Shape and Edge using the existing brush state; Set height adds the exact Target height input. Paint texture shows a material swatch/button that focuses the existing texture search, and omits strength/edge controls from the top row because texture IDs are applied directly. Selecting a texture updates the swatch. At 960 pixels the height tool fits without horizontal scrolling. The side-panel Sample last cursor button now grows with wrapped text instead of overlapping help.

Private executable: `D:/WulframForgeBuilds/tool-context-v69/WulframForge.exe`, SHA-256 `5E6EF4C8AA8B9BA48BB34A5635290E69CB399F705CD9EFB55490A7E503931DE2`. Native `D:/WulframForgeTestRuns/outputs-desktop-test-tt11Xf/report.json` PASS: keyboard radius, bidirectional shape/strength/exact-height settings, edge selection, material-search focus and material selection, tool/base-team context changes, 960px fit, height-action label bounds and unchanged map; no renderer errors. Screenshot reviewed. Typecheck and scoped Oxlint passed before v68 packaging; v69 adds only the CSS height fix. MCP synchronization passed. No new map operation or serialization change; existing MCP terrain brush behavior is unchanged. Full square/diamond/falloff/exact-height-stroke parity remains a pre-existing MCP brush limitation, and is not claimed by these shared GUI controls.

Prior v68 `D:/WulframForgeTestRuns/outputs-desktop-test-npvz4n/report.json` passed functional controls, but screenshot review exposed the side-panel overlap now fixed in v69. The first v69 ecnGy2 run stopped on an extra function-call suffix in the new test expression; corrected runner passed on the same EXE. Private source/build work only; no commit, push or publication. Full novice/high-DPI/accessibility review and R0–R9 completion remain open. V65 remains the last full aggregate baseline; v67 carries the latest focused MCP acceptance.

### Current control inventory and expanded acceptance runner

`node tools/inventory-editor-controls.mjs` refreshes `outputs/editor-control-inventory-current.json`: 27 editor TSX files, 446 source control/output/live-region entries, with source hashes, locations, labels, state bindings and handlers. This replaces the old source snapshot for locating controls. Dynamic lists/menu groups and plain-text statistics still need review; this count is not a rendered-action count or accessibility proof.

`test-product-baseline.mjs --editor-tools` adds native menu navigation, contextual brush toolbar, GUI selection protection and standalone MCP native acceptance to the existing combined suite. New steps must provide passed receipts with matching EXE hashes; GUI steps also require their specific evidence block and zero renderer errors. Intermediate reports persist after each finished step. The v69 run is in progress at `outputs/product-baseline-sjoo8t`; a false top-level passed value during execution is pending, not a completed failure.

User brush-catalog check: current source has five starter presets (Mountain Ridge, Winding Valley, Impact Crater, Gentle Foothills, Mountain Pass) built from four kernels (ridge, valley, crater, saddle). Round/square/diamond are manual footprints, not additional large landforms. A larger visual landform catalog with distinct geometry remains required R2 work; tests repeating the five current presets do not satisfy that expansion.

### R0 combined v69 and contested-point map examples

Expanded aggregate `outputs/product-baseline-sjoo8t/report.json` PASS on v69 (`5E6EF4C8AA8B9BA48BB34A5635290E69CB399F705CD9EFB55490A7E503931DE2`), with `--relationships --authoring --editor-tools`: all ten steps passed. Source 309/308 passed/one existing skip; typecheck passed; native manual/random/library/authoring/export/menu/toolbar/protection/MCP workflows passed. Exact child receipts are in the product acceptance matrix. This supersedes v65 as current combined runner baseline, without marking R0–R9 complete.

User requested maps emphasizing contested points to hold, choosing that over flag routes. Built three independent 8,000 by 4,800 layouts with 11 structures per team: Crossroads Hold (one court), Twin Relays (two), Three Courts (three). Package: `outputs/control-point-map-pack-v1/Contested-Points-Map-Pack-v1-verified.zip`, containing individual map ZIPs, editable JSON, annotated SVG plans, README and checks. Existing maps and active editor profiles were preserved.

`tools/build-control-point-map-pack.mjs` owns reproducible construction and refuses an existing destination. Static validation: no editor errors, rotational terrain symmetry, clear flat courts, full archive roundtrip; planned approach centerlines sampled every 25 world units remain at zero height. Native v69 import/export/close/restart/reopen receipts: `D:/WulframForgeTestRuns/outputs-desktop-test-kaii5b/report.json`, `...-sRCKut/report.json`, `...-znWB0X/report.json`, all PASS with no renderer errors. `desktop-verification.json` records exact map and EXE identities. The first imported-map screenshot was reviewed.

These are terrain and base-layout prototypes. Objective locations use texture marks and design metadata, plus height-protection rules; overview letters/gold circles are plan annotations. No flag entities, capture ownership/timers, scoring or victory conditions are implemented. Local start_script inspection found map/sky setup and no demonstrated objective implementation; this does not prove the game cannot support one. No game loading, driving, combat/balance or server rule trial is claimed. No publication, push or public distribution.

### R2 visual landform library — private v70.1

Seven built-in starter presets now include Flat-top Mesa and Broad Basin, adding two kernels to the existing ridge/valley/crater/saddle set. A searchable visual picker under Landform brush previews each profile on flat ground and loads settings without map mutation. New profiles use a constant additive central offset and smooth seeded shoulders; they preserve underlying slopes instead of flattening a building pad. Bend is disabled for these shapes and roughness is labeled Edge roughness. Existing kernel arithmetic remains isolated; prechange byte-golden comparison is not claimed.

MCP `apply_landform` uses shared project stamp placement, strict explicit settings/placement mode, revision guards, structure and height-rule protection, cached-analysis invalidation, additional new-error validation and one Undo step. Native allowlist and both servers are synchronized; standalone README documents v70+ compatibility and older-editor rejection of new saved shapes.

Build `D:/WulframForgeBuilds/landform-library-v70.1/WulframForge.exe`, SHA256 `530B937E3EC96B5A6E88FA35285935347BF12E5A1A71981DB772CFE0100A3CC7`. GUI receipt `D:/WulframForgeTestRuns/outputs-desktop-test-KNnrG1/report.json` PASS for visual search/load, mesa/basin placement and Undo with unchanged source on browsing. Native MCP `tools/mcp/MapEditerMCP/outputs/mcp-native-test-MriCke/report.json` PASS includes both new kernels, saved metadata, stale rejection, protected-rule rejection, Undo and existing transport/export/deadline checks. Typecheck, scoped Oxlint and synchronization passed; standalone 8/8. Full source log `outputs/landform-library-v70-source-all.log` records 311 tests/310 passed/one existing skip. Added explicit new-shape library roundtrip/merge coverage passed with the stamp-library suite 4/4 in `outputs/landform-library-v70-portability.log`. Initial source test exposed negative zero at the basin perimeter, normalized to zero; accessibility lint replaced role=status with output. Critic control-label issues were fixed before v70.1 packaging. No publication or push; v69 remains the current combined aggregate baseline.

User next requested a drawn adjustable Lane tool cutting through high ground. Existing valley stamps are additive and corridor reservations do not cut terrain, so this is a distinct authoring operation to implement, with width, floor height, smooth shoulders, preview/Undo and MCP coverage.

### Adjustable Lane tool - private v71.1

Implemented the requested drawn lane through high ground: width, floor height, smooth shoulders, cut-only or cut/fill, mirror, preview/Apply and Undo. Available from Terrain menu/sidebar and tool search; MCP `apply_lane` uses the same operation. Structures and saved height rules remain protected. Native GUI and MCP checks passed on v71.1; see [implementation and evidence](LANE_TOOL_V71.md). GUI currently draws straight lanes; MCP accepts polylines. In-game driving and whole-roadmap acceptance remain open. No publication or push.

### R0/R8 integration after Lane tool

The combined runner now includes visual landform-library and lane-tool native workflows under `--editor-tools`. Each requires the expected workflow receipt, matching executable hash and no renderer errors. The lane fixture is generated from a verified empty manual fixture inside the run output, and both input hashes must remain unchanged. The current source-control inventory contains 459 entries across 29 editor TSX files; these are source controls/live regions, not a complete rendered-action or accessibility count.

[Map-making guide](MAP_MAKING_GUIDE.md) is a source-checked user guide for private v71.1. It distinguishes immediate edits from previews, explains protection and export choices, and identifies unverified game behavior. Novice observation and a complete manual acceptance pass remain open. Combined run `outputs/product-baseline-EH6ovv/report.json` is in progress; its pending false status is not a completed failure.

### Combined v71.1 result

`outputs/product-baseline-EH6ovv/report.json` finished PASS: all 12 steps, source 317 tests/316 passed/one existing skip, TypeScript, combined export/restart, creative/library/district/relationships, random maps, five authoring workflows, new landform library and Lane tool, menus/toolbar/protection and native MCP. Exact receipts and input hashes are in the [acceptance matrix](PRODUCT_ACCEPTANCE_MATRIX.md). This supersedes the earlier pending status and makes v71.1 the current combined private baseline. It does not close whole-roadmap, family admission, novice, clean-machine or game/server gates.

### R6/R7/R8 candidate entrance inspection - v72.1

[Candidate entrance inspection](AUTHORED_PREVIEW_INSPECTION_V72.md) exposes candidate-owned authored corridors during formation preview, separately from automatic service routes. Shared snapshot construction excludes unrelated saved-layout rules. MCP `inspect_routes` adds explicit-width committed-map diagnostics without mutation. Critic-found unbounded malformed-coordinate sampling is now guarded with bounds and workload diagnostics. Source 320/319 passed/one skip; typecheck, lint, sync and standalone8 passed; exact GUI IS0BOS and MCP H41Nxi receipts pass on v72.1. This does not redirect automatic routes, admit Offset Bastion, certify driving, or replace v71.1 as the combined aggregate baseline.

R6/R7 entrance-routing source prototype: [explicit contract](ENTRANCE_ROUTE_CONTRACT_V1.md) connects service pads through every ordered authored turn, checks joined clearance and rejects obstructions without shortcuts. Read-only analysis passes 24 team connections on twelve retained Offset maps. It is not yet wired to GUI/MCP or a new executable; integration and policy persistence remain active work.

R6/R7 entrance policy persistence: explicit team/corridor/direction metadata and immutable checked candidates now retain routing choices through Offset favorite relocation and rotation using reservation schema 3/library version 4. Independent critic's missing-corridor data-loss finding is fixed; 24 targeted core/library/MCP regressions, typecheck, scoped lint and MCP synchronization pass. See the [saved-policy evidence](ENTRANCE_ROUTE_CONTRACT_V1.md#saved-policy-and-portable-reuse---source-implementation). GUI/MCP policy authoring, shared inspector integration, all-edit enforcement and rebuilt-native acceptance remain unfinished; no new private build or family admission.


### R6/R7/R8 saved entrance choices - v73 series

[Bases > Rules entrance controls and evidence](ENTRANCE_ROUTING_V73.md) now connect the saved policy to preview camera inspection, Apply/Undo and shared MCP inspect_entrances/set_entrance_routing operations. Saved route inspection follows selected corridors and diagnoses invalid policies instead of silently falling back. Source suite: 328 tests/327 passed/one existing skip; standalone 8/8, typecheck/lint/sync passed. Native acceptance and current usable EXE are recorded in the linked feature document. This is a checked inspection preference, not an all-edit access constraint; later edits require reinspection. Offset admission, 48-family expansion, combined baseline refresh and external acceptance remain open.

R7 policy-library follow-up: all four Offset sizes pass native version-4 library export/import, verified 90-degree transformed corridor geometry and complete team-pad routes, larger flat-map reuse, ZIP/reopen and restart on v73.2. Exact hashes/receipts: `outputs/entrance-library-v73.2-native-audit.json`. [Remaining family admission work](OFFSET_ADMISSION_STATUS.md). No new binary or publication.

R9 private launch usability: user-requested [stable launcher v1](STABLE_LAUNCHER_V1.md) keeps a desktop shortcut while selecting different local editor EXEs. Separate per-user settings, atomic validation, renamed-self rejection and unchanged editor/launcher bytes pass actual-executable tests (26 checks). Source-form visual review passed; live capture/picker automation remained unavailable. No updater, installer, public release or whole-roadmap completion claim.

R7 variation review: [48 current source cases and four comparison diagrams](OFFSET_SEED_VARIATION_REVIEW.md) pass selected-entrance, pairing, validation and determinism checks. Independent visual review confirms local building scatter but nearly fixed district/corridor structure. This reveals a structural-diversity gap; it does not add reviewed families or justify counting seeds as distinct designs. Versioned arrangement choices and final native catalog assets remain next.


R7 structural-variation source sprint: [Offset arrangements v1](OFFSET_ARRANGEMENTS_V1.md) adds explicit Wide Front, Deep Court and Split Wings plans while preserving Classic goldens. All 144 new flat seeded cases and 11 targeted regressions pass; editor source has an arrangement selector with preview invalidation and fixed-favorite preservation. Independent source/UI review found no actionable defect. MCP creative-generation integration, rebuilt desktop acceptance, uneven terrain and family admission remain open; these are not additional reviewed families.


R6/R7 v74 integration: [Offset arrangements and creative MCP](OFFSET_ARRANGEMENTS_V1.md) now run in a private rebuilt editor. Real MCP preview/apply/Undo passes for all three new arrangements; Wide Front native generation and portable reuse passes. Source suite 335/334 passed/one skip; standalone 8/8, typecheck/lint/sync passed. Preserved Classic semantics; no new family admission or combined-baseline claim.


R7 terrain follow-up: [Offset arrangements v74 terrain evidence](OFFSET_TERRAIN_V74.md) records 432 mixed-condition source cases (288 symmetric accepts, 144 asymmetric rejects), 24 predetermined editable representatives and 36 native generation/Apply/Undo/Redo cases across 3 arrangements, 4 sizes and 3 terrain fixtures. Hash audit passes; explicit entrance-policy checks are source evidence, while native matrix checks ordinary automatic access. Uneven policy-favorite reuse and final catalog imagery/admission remain open. No new binary or reviewed-family count.


R3/R7 uneven favorite follow-up: [policy-bearing Offset reuse](OFFSET_UNEVEN_FAVORITES_V74.md) passes 24 positive source cases across all sizes plus a precise blocked-approach rejection. Six massive native cases cover all three new arrangements on valley/irregular targets, versioned library import, transformed corridors and complete pad routes, ZIP and restart. Independent rendered-model vertex sampling passes on source cases and retained native maps; this is not full collision proof. No new binary or family admission.


R3/R7 [v75.2 experimental Offset cards](OFFSET_LIBRARY_V75.md) adds four searchable plan cards, scaled entrance diagrams and preserved size/arrangement handoff. More filters reduces initial visual clutter; Starter descriptions are corrected. Final native k362NY passes browsing/preview/Apply/Undo/favorite/ZIP/restart; final library tests, typecheck and lint pass. Existing creative MCP command already covers these choices. Reviewed family count remains 15 pending the formal admission review.


R7 [v76 plan bounds](BASE_PLAN_BOUNDS_V76.md) replaces Offset center-based footprint estimates with conservative model-and-reservation envelopes and documents adaptation/budget limits. Six targeted tests, typecheck/lint and exact native BwbvV0 pass. Independent review closes admission requirements 2 and 4; dedicated catalog imagery/review remains requirement 6. Offset is not yet admitted; overall roadmap stays open.

R7 v76 catalog follow-up: [Offset guide imagery](OFFSET_BASTION_GUIDE.md#applied-map-example-massive-deep-court) now includes independently reviewed applied-map overhead, oblique yard and repair close-up assets. Native v9OVv4 PASS and capture hashes retained. All individual Offset admission findings are resolved within their documented scope; consolidated admission and category/count update are next. Experimental status and the 15 reviewed-family count remain unchanged in the shipped v76 build.

R7 [Offset admission v77](OFFSET_ADMISSION_V77.md): all eight scoped family requirements passed consolidated review. Creative now has 16 reviewed families (19 cards); 32 additions remain toward 48. Fresh native naGxV8 PASS, 13 source tests plus TypeScript/lint passed, recipe goldens unchanged. Category browsing, bounds and generation/portable handoff verified on the delivered private v77 binary. This supersedes earlier Offset admission-pending notes; full combined baseline remains v71.1.

R0/R9 [v77 combined baseline](COMBINED_BASELINE_V77.md) now passes through reconciliation with one targeted creative-suite replacement: all 13 suite scopes, 362 source passes/one skip, TypeScript, native authoring/tools/Offset entrances/MCP. Independent reconciliation review passed; original failures retained. This supersedes v71.1 as current combined private baseline, without closing full-roadmap or external acceptance gates.

R7 [Frontier card v78](FRONTIER_LIBRARY_V78.md): Experimental searchable card, full 320 u expansion diagram/model bounds, four fixed golden cases and clarified budget/adaptation guide. Native e9hJUE PASS, 10 source tests plus TypeScript/lint passed. Family count stays16; same-size seed visual comparisons and overhead/oblique imagery remain before admission. V77 remains combined baseline.

R7 [Frontier visual review v78](FRONTIER_VISUAL_REVIEW_V78.md): twelve controlled same-size seed samples plus three native applied-map images are embedded in the guide and independently reviewed. Fixed-hook/local-variation limits are explicit. BNk2Bh native PASS; consolidated admission/category handoff remains next, count16 unchanged.

R7 [Frontier admission v79](FRONTIER_ADMISSION_V79.md): 17 reviewed creative families, 20 cards; 31 additions remain toward48. Consolidated8requirement review and category handoff accepted. Native5AH0tp PASS,10source tests/TypeScript/lint pass; recipe IDs unchanged. V77 remains the combined baseline; no external acceptance or publication claim.

R1/R8 [Reserved display v80](RESERVED_DISPLAY_V80.md) separates placement circles from authored corridor/area visibility, preserves legacy preferences and updates guides. Two preference tests, TypeScript/lint and native Sonhgg PASS; saved rules unchanged by display toggles. V77 remains combined baseline.

R3/R6 [Favorite rule preservation v81](FAVORITE_RULE_PRESERVATION_V81.md) closes a silent metadata-loss bypass on no-reservation layouts. Five regressions, TypeScript/lint and native Odt4eJ PASS: rejection changes neither map nor favorites, whole-map export preserves rules. Portable authored-base/recipe support remains open; this guard is not that capability. V77 remains combined baseline.

R3/R6 [Complete-layout authoring core](PORTABLE_AUTHORING_CORE.md): implemented indexed district/relationship/composition preservation for both teams, with six passing regressions and TypeScript/lint checks. This is unconnected data-contract groundwork; full geometry, library/GUI/MCP integration and native acceptance remain open. Existing favorite safety guard remains active; no new private binary or baseline claim.


R3/R6 [Authored-base geometry](PORTABLE_BASE_GEOMETRY.md): ordered both-team/neutral geometry now composes with indexed authoring references. Eleven tests, TypeScript/lint and final independent review passed. No team mirroring or automatic terrain fitting. This remains internal source groundwork; reservations, versioned library/GUI/MCP integration and native acceptance remain open. V81 scoped build and v77 combined baseline are unchanged.


R3/R6 [Authored-base package](AUTHORED_BASE_PACKAGE.md): versioned internal capture/export/parse/restore now carries reservation geometry and entrance bindings with buildings/district rules. Fifteen tests, TypeScript/lint and bounded independent review passed. Axis-aligned rectangles retain exact quarter-turn semantics; corridors rotate freely. Library/GUI/MCP placement, validation settings and native acceptance remain open; no new binary or baseline claim.


R3/R6 [Shared authored-base placement](AUTHORED_BASE_PLACEMENT.md): candidate operation adds saved validation settings, preserve/conform terrain modes, oriented model bounds/reservations, entrance inspection and editor constraints on a clone. Thirty-seven tests, TypeScript/lint, MCP sync and independent review pass. GUI/MCP registration, preview/history integration and native acceptance remain open; no new binary or baseline claim.


R3/R6 [Authored-base MCP v82](AUTHORED_BASE_MCP_V82.md): capture and preview/apply now registered through bridge, native host and both servers. Fresh native tvyPvb PASS with whole-snapshot capture/preview/invalid/Undo checks, source district/budget/area comparisons, stale revision rejection and one-step Apply. 37 source tests, eight package tests, TypeScript/sync and targeted lint pass. Private v82 delivered; GUI/library integration and broader native rule coverage remain open. V77 stays combined baseline.


R3/R6 [Authored-base GUI v83.1](AUTHORED_BASE_GUI_V83.md): capture/import/export and XYZ/rotation/terrain controls now preview and apply the shared authored-base candidate. Native MGhGfM PASS includes empty-panel import, 40 u movement, unchanged preview and full-snapshot Undo; MCP suite passes on the same EXE. 37 source tests, TypeScript/lint and independent UI review pass. Screenshot confirms styled inspector controls. Persistent authored-library storage and close preview/inspection acceptance remain open. V77 remains combined baseline; no push/publication.


R1/R8 [Authored preview v84](AUTHORED_PREVIEW_V84.md): Tool Finder destination and candidate Team1/2 overview/ground camera controls implemented. Native 0sUA3n PASS verifies destination and four camera actions against unchanged full-map snapshots, plus authored GUI/MCP workflows. TypeScript/lint/sync and independent code review pass. All four images reviewed; ghost contrast on checkerboard terrain and individual-building close inspection remain open. Private v84 delivered; v77 remains combined baseline.


R8 [Authored close inspection v85](AUTHORED_DETAIL_V85.md): individual candidate-building selector/detail camera and original-material authored previews. Existing ghosts retain default styling. Native 727se5 PASS includes two repair-pad close views with unchanged full-map snapshots plus authored GUI/MCP workflows. Both images reviewed; model details readable, preview clearly labeled. Three camera tests, TypeScript/lint/sync pass; reviewed lifecycle dependency fixed. Private v85 delivered; persistent authored storage and wider roadmap remain open. V77 stays combined baseline.


R3 [Persistent authored library core](AUTHORED_LIBRARY_CORE.md): versioned storage, label/search/edit/restore, exact-source stale guards and write verification implemented. Nineteen library/package/core tests, TypeScript/lint and independent review pass. GUI/MCP registration, recovery adapter and native restart workflow remain open. No new binary; v85 remains scoped build and v77 combined baseline.


R3 [Authored library recovery adapter](AUTHORED_LIBRARY_CORE.md): validated envelope reset after exact-byte verified backup, healthy-library rejection and additional stale-source guard. Nine tests, TypeScript, targeted lint, MCP sync and independent review pass. GUI/MCP library controls and native persistence acceptance remain open. Source only; no new build or publication.

R3 [Saved authored library v86](AUTHORED_LIBRARY_V86.md): GUI and MCP save/search/load/rename/remove/restore with separate library Undo and exact-source guards. Native snD9X9 PASS; new-process restart verifies complete packages and GUI entries retained. 21 source tests, eight package tests, TypeScript/lint/sync and reviewed selection fix pass. Private v86 available; native damaged recovery/large-payload limits and wider roadmap remain open. V77 stays combined baseline.

R3 [V86 native library recovery](AUTHORED_LIBRARY_V86.md): same-hash separate recovery receipt PASS for GUI/native pipe, exact backups, stale rejection, GUI refresh, full-map/history preservation and original isolated test-library restoration. Independent evidence review and harness lint pass. Large-payload limits and broader roadmap remain open; no product/binary changes or publication.

R3 [Whole authored-library portability v87](AUTHORED_LIBRARY_PORTABLE_V87.md): collection export/import preview, duplicate skipping, conflict rejection, Cancel/Apply and library Undo. Native YcfqEb and new-process restart PASS; older v86 preview rejection verified. 23 source tests, eight package tests, TypeScript/lint/sync and review fixes pass. Private v87 delivered; unified browser integration and wider roadmap remain open. No publication.

R3 [Visual authored collection v88.1](AUTHORED_BROWSER_V88.md): complete saved bases now appear in the main browser with all-team diagrams/counts, source/district search and authored placement handoff. Native aWuInJ PASS checks unchanged browse/handoff, Apply/Undo and clearing old candidate on manual selection; 14 source tests, TypeScript/lint/sync and reviewed fixes pass. Final screenshot reviewed. Private v88.1 delivered; broader metadata/filtering, combined baseline and full roadmap remain open. No publication.

R0 [Combined v88.1 run in progress](COMBINED_BASELINE_V88_IN_PROGRESS.md): expanded runner includes authored library/browser/camera/restart/recovery receipts. Source suite 396 pass/one skip and TypeScript pass; native run product-baseline-uUzkCn is underway. Overall acceptance not yet established; v77 remains combined baseline. No new binary or publication.

R0 [Combined baseline v88.1 accepted](COMBINED_BASELINE_V88.md): 15-step expanded scope passes via 14 original successes plus full reviewed creative rerun; original failure retained. Final nested-receipt/hash audit PASS. Includes authored storage/portable/browser/camera/restart/recovery, earlier terrain/base/tool/MCP workflows, 396 source passes/one skip and TypeScript. V88.1 replaces v77 for this scope; full roadmap/external acceptance and 31 remaining families stay open. No new binary or publication.

R7 [Service Courtyard candidate core](SERVICE_COURTYARD_CORE.md): distinct two-bank through-court, two mouths, four size role budgets and deterministic placement. 48 sample checks plus invalid input/reservation tests, TypeScript/lint/sync pass; reviewed inherited-key validation defect fixed. Shared terrain pipeline, GUI/MCP/native/variation/golden/visual admission gates remain open. Not admitted or selectable; 17 reviewed families remain. No new binary or publication.

R7 [Service Courtyard shared placement](SERVICE_COURTYARD_CORE.md): role minima, six reservations, paired terrain support and mandatory sampled 80-unit through-route clearance now share GUI/MCP generation code. Three placement regressions, MCP command tests, TypeScript/lint/sync and independent review pass. Preliminary matrix retained; updated matrix, golden/visual and native admission remain separate gates. Still 17 admitted families; source only, no publication.

R7 [Courtyard controlled visual review](SERVICE_COURTYARD_CORE.md): twelve hashed flat representatives across all four sizes, four reviewed comparison sheets and independent criticism establish distinct through-court identity with bounded local variation. Four rotated golden fixtures now pin geometry/reservations/through-route metadata; all four placement tests and scoped lint pass. Updated 192-case matrix accepted 144 symmetric cases and rejected 48 asymmetric fits. Original-model views and native GUI/MCP round trips remain admission gates; still 17 families, no new binary or publication.

R7 [Courtyard private v89 native generation](SERVICE_COURTYARD_V89.md): reviewed native MCP run passes explicit four-size counts, reservations/through-routes, preview/history preservation, Apply/stale/duplicate/Undo and complete JSON reopen. Private v89 built; both MCP guides updated. Original-model views, GUI and portable-library admission remain open; v88.1 stays combined baseline and 17 families remain admitted. No publication.

R3/R7 [Courtyard portable reservation source](SERVICE_COURTYARD_PORTABILITY.md): six-corridor schema v4/library envelope v5, frame-preserving capture/relocation/recapture and shared destination through-route validation. Twenty-four source/MCP tests, TypeScript/lint/sync and independent review pass. Native favorite round trip and GUI card remain pending; v89 binary unchanged, no family admission or publication.

R3/R7 [Courtyard Experimental library v90.1](SERVICE_COURTYARD_V90.md): actual three-band diagram/bounds, candidate labels and shared placement handoff. Reviewed native GUI identity/preview/history/Apply/Undo and four-size MCP/JSON reopen PASS; screenshot reviewed, seven library tests/TypeScript/lint/sync pass. Portable schema included in build; native favorite round trip and original-model access review remain open. Still 17 reviewed families; v88.1 combined baseline unchanged. No publication.

R3/R7 [Courtyard native favorite round trip](SERVICE_COURTYARD_PORTABILITY.md): v90.1 reviewed native PASS for save/export5/remove/import preview-Cancel/exact import and same-map GUI reuse/Apply/Undo. Entity semantics/poses, six reservations and recomputed ordered passage metadata retained; library actions preserve map/history. Test stale-node defect fixed and reviewed. Cross-map native/restart and original-model access review remain open; no new binary/publication.

R3/R7 [Courtyard restart and cross-map reuse](SERVICE_COURTYARD_PORTABILITY.md): same-hash v90.1 new-process exact library persistence and GUI reuse on 16000x12000 flat destination PASS, including transformed XY/yaw/reservations, passage checks, preview/history isolation and Undo. Six textured original-model camera views reviewed for one fortified arrangement; broader size/variation visual admission remains open. No new binary/publication.

R7 [Courtyard native visual matrix](SERVICE_COURTYARD_VISUAL_MATRIX.md): twelve hashed originals (four sizes/three seeds), 24 native captures and import/camera snapshot checks PASS; representative visual reviews confirm open court/readable repair details with overview scale limits. [Four-size ZIP round trip](SERVICE_COURTYARD_PORTABILITY.md) also passes on v90.1 after reviewed import timing fix. No new binary, admission or publication.

R7 [Courtyard illustrated guide](SERVICE_COURTYARD_GUIDE.md) consolidates sizes/required roles, target limits, actual reservation footprint, terrain adaptation bounds, inspection and portable reuse with captioned native images. Final guide review/admission remains pending; underlying four-size native ZIP rerun is now PASS.

Courtyard guide review completed: corrected the shared 280-unit service-radius cap (checked power reach at most270, smaller saved ranges stricter). Independent review confirms budgets, bounds, adaptation and portable controls; illustrated documentation gap resolved. Formal candidate promotion remains a separate next change; 17 admitted families unchanged.

R7 [Service Courtyard admission v91](SERVICE_COURTYARD_ADMISSION.md): eight-part editor contract accepted, retained receipt/hash audit PASS, Creative handoff native HKX7g2 PASS with portable/ZIP workflows. 31 source tests/TypeScript/lint/sync pass; recipe geometry unchanged. Now 18 reviewed families and 21 Creative cards; 30 additions remain. Private v91 delivered; v88.1 remains the combined baseline. Wider roadmap and external gates remain open. No publication.

R0 [Combined v91 verification running](COMBINED_BASELINE_V91_IN_PROGRESS.md): expanded 16-step scope includes admitted Courtyard GUI/portable/ZIP and restart/cross-map evidence alongside all v88.1 workflows. Runner review/lint pass; aggregate outputs/product-baseline-bmdN4w is active. No combined acceptance yet; v88.1 remains baseline. No publication.


R0 combined v91 acceptance: [all sixteen steps and independent receipt audit passed](COMBINED_BASELINE_V91.md), original aggregate bmdN4w without replacement. Source404 pass/one skip, TypeScript pass; eighteen native receipt hashes verified. V91 replaces v88.1 as combined private baseline. Authored and Courtyard portability/restart passed together. Catalog remains18 admitted/30 remaining; [Broken Ring](BROKEN_RING_DESIGN.md) is reviewed design only. Full R0-R9 and external gates remain open; no launcher change or publication.


R7 [Broken Ring core checkpoint](BROKEN_RING_DESIGN.md#core-implementation-checkpoint): deterministic four-size geometry, explicit18/23/28/38 counts, rear services, connected frontage branches and model-bound reservations implemented. Forty-eight local samples and TypeScript pass; critic findings fixed and re-reviewed. Full circulation, destination placement, GUI/MCP, portability, goldens and native/visual admission remain open. Source only;18 admitted families and combinedv91 unchanged.


R7 [Broken Ring circulation](BROKEN_RING_DESIGN.md#circulation-and-deterministic-reference-checkpoint): complete reserved perimeter loop connects both rear service branches; spacing/bounds include full widths. Three tests (48 local samples plus four golden fixtures), TypeScript/lint and independent topology review pass. Destination placement, GUI/MCP, portable metadata and native/visual admission remain open. No binary or family-count change.


R7 [Broken Ring shared placement](BROKEN_RING_DESIGN.md#shared-placement-checkpoint): paired reservations, mandatory route terrain checks, role minima and final site/frontage association integrated. Ten scoped tests, TypeScript/lint/sync and corrected independent review pass. Uneven-terrain matrix, GUI/MCP registration, portability and native admission remain open. Source only; combinedv91 and18 admitted families unchanged.


R7 [Broken Ring terrain matrix](BROKEN_RING_DESIGN.md#offline-terrain-matrix-and-mcp-command-checkpoint):192 cases completed,144 symmetric acceptances and48 reviewed asymmetric rejections;12 representative hashes verified. Existing MCP shared command verified at source level. GUI/portable/native/visual gates remain open,18 admitted families unchanged.


R7 [Broken Ring experimental library](BROKEN_RING_DESIGN.md#experimental-library-and-v92-build-checkpoint): source card/dropdown and five reservation bands added, radius/caption critic findings fixed. Twelve tests, TypeScript/lint/sync pass. Privatev92 build running in shell5972; native acceptance and portability remain open. Admitted count18 and combinedv91 unchanged.


R7 [Broken Ring v92 native acceptance](BROKEN_RING_DESIGN.md#v92-scoped-native-acceptance): DJADBM PASS for Experimental GUI handoff and four-size MCP preview/Apply/Undo plus JSON/ZIP reopening. Supplemental hashed saved-copy audit verifies exact both-team route coverage; independent review accepted scoped evidence. Privatev92 built and tested; favorites, visual review and admission remain open. Combinedv91 and18 admitted families unchanged.


R3/R7 [Broken Ring portable core](BROKEN_RING_DESIGN.md#portable-core-checkpoint): reservationv5/libraryv6 retain all ten areas and versioned plan with shared destination validation. Nine portability tests, TypeScript/lint/sync and bounded review pass. Source only; GUI guidance, rebuilt native persistence/reuse and visual admission remain open. V92 scoped build/combinedv91 unchanged.


R3/R7 [Broken Ring v93 native portability](BROKEN_RING_DESIGN.md#v93-portability-build-and-native-run): G1ZuXg PASS, exact envelope6/reservation5 library import/cancel/reuse and map/history preservation with all routes; independent hash/evidence review accepted same-map scope. Privatev93 available. Restart/cross-map native reuse and visual admission remain next; combinedv91 and18 admitted unchanged.


R3/R7 [Broken Ring v93 restart/cross-map](BROKEN_RING_DESIGN.md#v93-restart-and-cross-map-reuse): fresh-process exact library and18000x14000 GUI reuse pass in O7rVUR, including both-team transforms, full metadata and Apply/Undo. Nine artifact hashes and six images reviewed. Close repair views readable; wide imagery insufficient for fullvisual admission. Controlled variation/closer layout review remain next;18 admitted and combinedv91 unchanged.


R7 [Broken Ring controlled visual finding](BROKEN_RING_DESIGN.md#controlled-visual-review-macro-variation-remains-open):12 controlled samples and native24/36-image runs captured with map/hash checks. Independent schematic review found insufficient larger-scale segment variation; do not admitv1. Next version must improve macro layout while preserving existingv1 saved compatibility.18 admitted and combinedv91 unchanged.


R3/R7 [Broken Ring v2 and privatev94](BROKEN_RING_DESIGN.md#v2-macro-layout-and-v94-native-checkpoint): macro variation integrated through GUI/MCP and version-aware favorites, preserving actualv93/v1 exports.37 affected tests and192-case terrain matrix pass their scoped checks. Native hvrMhY and cross-map restart DC5W5V PASS against hashedv94. Full controlled native visual admission remains open;18 admitted families and combinedv91 unchanged.


R0/R3/R7 [V94 controlled visuals and mixed libraries](BROKEN_RING_DESIGN.md#v94-controlled-native-visuals-and-mixed-library-verification): deliberate two-axis native sample run sFpeTf PASS36captures/12unchangedmaps; tight automatic service-approach warning retained. Mixed Courtyard/Ring favorite workflow wahFOz PASS after critic linkage fix; both family restart harnesses pass on UPdNqH with two favorites preserved. Full combined orchestrator integration and visual/access admission remain open;18 families and combinedv91 unchanged.


R0/R7 [V94 full baseline running](BROKEN_RING_DESIGN.md#v94-full-baseline-in-progress-and-approach-diagnosis): runner/audit now cover17workflows including mixed favorites and Ring restart.95cjnV has416 source passes/1skip and TypeScript pass; native stages running in shell84980. Approach diagnosis isolates fallback warnings in four axis-controlled cases; no product/warning changes or admission claim. Await terminal aggregate and audit before replacing combinedv91.


R0/R7 [Baseline correction and spacing prototype](BROKEN_RING_DESIGN.md#baseline-dropdown-correction-and-pad-spacing-prototype):95cjnV remains live in shell84980; creative test expected dropdown omitted Ring, assertion fixed for a terminal targeted rerun. Endpoint diagnostic isolates78.112469u Uplink clearance; isolated96u pad-margin prototype generates192/192 local samples. No product geometry/version/admission change yet.


R0/R7 [V94 terminal aggregate and margin feasibility](BROKEN_RING_DESIGN.md#v94-aggregate-terminal-and-broader-margin-feasibility):95cjnV finished16/17pass; corrected creative replacement live57275. Exact seed3 and24 adapted/expanded prototype cases have96u margin and warning-free automatic checks. Prototype only; await replacement audit and versioned production implementation.


R0 [V94 combined baseline accepted](COMBINED_BASELINE_V94.md):17workflow scopes pass through16original/one complete creative replacement, with independent audit and hashes. Original failure retained.

R3/R7 [V3 endpoint/route candidate](BROKEN_RING_DESIGN.md#v3-shared-endpoint-and-route-validation):96u final pad-margin and wider automatic route checks shared by GUI/MCP/favorites; realv1/v2exports preserved, tiny cross-runtime numeric reconstruction corrected.42tests/typecheck/lint/sync pass;v95build live21102, native proof remains open.18families unchanged.


R3/R7 [V95 scoped native compatibility](BROKEN_RING_DESIGN.md#v95-scoped-native-and-legacy-interoperability): AIrQ9I four-sizeGUI/MCP/portable PASS; actualv1/v2libraries andv3 restart reuse pass onv95.144symmetric terrain cases meet wide service checks;48asymmetricreject. Controlled visual run live52757;18admitted and combinedv94 unchanged.


R7 [Broken Ring admitted in private v96](BROKEN_RING_ADMISSION.md#v96-creative-promotion): nineteen distinct reviewed families, 29 remaining toward 48. Illustrated guide and v95 terrain/access/legacy evidence support admission; v96 Creative GUI and portable workflow passed in Yz4457. Source geometry versions remain unchanged. Combined v94 remains the accepted combined baseline; full roadmap and external acceptance remain open.


R7 [Valley Pockets local geometry](VALLEY_POCKETS_DESIGN.md#local-geometry-checkpoint): four staggered side-yard plans, explicit10/15/20/30 role budgets and192 deterministic samples pass local topology checks, TypeScript and independent review. Terrain fitting, original-building placement, GUI/MCP, portable/native and catalog admission remain open. Source only, outside the v96 build and combined suite;19 reviewed families remain.


R0 [Combined v96 accepted](COMBINED_BASELINE_V96.md): all17 original steps PASS in APdDsM,422source passes/one skip and TypeScript PASS. Automated and independent EXE/aggregate/nineteen-native-receipt audit passed; mixed Courtyard/Ringv3 preservation, both restarts and wider Ring access verified. Replaces combinedv94. Valley Pockets remains excluded source work;19families admitted/29remaining, full R0–R9 and external gates open. No publication or launcher change.


R7 [Valley Pockets bounded terrain fitting](VALLEY_POCKETS_DESIGN.md#bounded-terrain-fitting-checkpoint): whole-yard windows, reconnected branches, both-team sampled support and saved power checks implemented. Eight core/terrain tests pass including144 matrix cases, actual obstacle shifts and corrected four-edge cap regressions. Independent fix review passed. Source only; final constraints, portable/native integration and admission remain open. Combinedv96/19families unchanged.


R7 [Valley Pockets final additive candidate checks](VALLEY_POCKETS_DESIGN.md#final-additive-candidate-checks): paired original models, oriented collision/reservations, saved constraints and four transformed pad endpoints pass five placement tests, TypeScript/lint and independent fix review. Existing contents retained; actual fitted geometry stored. Source only, GUI/MCP/portable/native integration remains open. Combinedv96/19families unchanged.


R7 [Valley Pockets GUI/MCP source integration](VALLEY_POCKETS_DESIGN.md#shared-guimcp-source-integration): Experimental picker, additive new-layout preview and shared generation wired;26affected tests, types/lint/sync and independent review pass. Privatev97 building; native Apply/Undo/reopen pending. Whole-map persistence only; portable favorites/count fitting/admission remain open. Combinedv96/19families unchanged.


R7 [Valley Pockets v97.1 native checkpoint](VALLEY_POCKETS_DESIGN.md#v971-scoped-native-result): czCZay PASS and independent EXE/receipt/nine-artifact audit. GUI/MCP preview,ApplyUndo,4sizes,retainedcontents,exactroute/padgeometry and JSON/ZIP reopen verified. Originalv97 blankpreviewfailures retained; required overlayfield fixed. Experimental only; portable/count/visual admission remain open. Combinedv96/19families unchanged.


R9 [Private Windows installer](../desktop/installer/README.md): user-requested per-user setup packages acceptedv96 and stablelauncher, optionaldesktop/Startmenu shortcuts and conditionalMicrosoftWebView2bootstrapper. Local install,installednative,reinstall-selection preservation and uninstall/map-profile preservation PASS with independent review. Missing-runtime and clean-machine acceptance remain open. Unsignedprivateartifact only; fullroadmap and publicrelease unapproved.


R7 Valley Pockets count follow-up: [expanded-count source verification](VALLEY_POCKETS_DESIGN.md) passes 38 relevant tests, TypeScript, lint and MCP synchronization, with independent count-fitter review and four V2 reference fixtures. Native expanded-count acceptance and portable favorites remain pending; no new family admission or binary claim.


R7 Valley expanded-count native follow-up: [v98 evidence](VALLEY_POCKETS_DESIGN.md) passes GUI 24/team, eight MCP default/expanded cases, rejection/Undo/JSON-ZIP reopen, and supplemental original-geometry preservation audit. Final critic receipt review pending; portable favorites and admission remain open (19 reviewed families).


R7 Valley portable v99: [scoped native evidence](VALLEY_POCKETS_DESIGN.md) passes GUI favorite save, MCP capture/reuse/recapture, independent larger-map coordinates, retained entities and Undo. WNhvbL native and artifact audit pass. GUI library export/import/restart and full family admission remain open; reviewed count remains 19.


R7 Valley v99 library/restart follow-up: [native evidence](VALLEY_POCKETS_DESIGN.md) q9TyDf and valley-restart-XI7IC9 pass GUI export/remove/cancel/import, exact persisted library, larger-map GUI reuse and Undo. Independent receipt review and broader terrain/size/visual family admission remain open.


## Valley Pockets promotion and combined verification — v100

The twentieth reviewed Creative family passed promoted native GUI/MCP verification and a 19-artifact audit. [Admission evidence](VALLEY_POCKETS_ADMISSION.md) records the exact executable and receipt hashes. The acceptance runner now includes isolated Valley native, artifact audit, restart and 24-case terrain reuse checks, with explicit report linkage and artifact hashes. Independent runner review and the existing v96 audit regression passed. Full 21-step v100 verification is running; v96 remains the accepted combined baseline and installer. This does not complete R0–R9 or external gameplay/novice acceptance.


## Combined v100 acceptance

[Fresh v100 baseline](COMBINED_BASELINE_V100.md) passes all 21 stages and automated/independent final artifact review. Eighty-eight source suites: 450 passed, one existing skip. Twenty Creative families are reviewed; 28 remain. Next implementation is the shared multi-entrance prerequisite for Three-Lane Anchor. Full R0–R9, novice/game evidence and public release remain open; the v96 installer is unchanged.


### Curved lane shaping - v107 source checkpoint
The Lane tool now has a Curve / bend slider with fixed endpoints, shared with MCP `apply_lane.bend`. Straight and multi-point MCP lanes remain compatible. Shared checks reject invalid curves and footprints before mutation. Targeted source tests: 18/18 (`outputs/curved-lane-source-tests.log`); TypeScript and MCP synchronization passed. Independent source review found no actionable defect. Native curved preview, Apply, cancellation and Undo/Redo verification remains pending; this is not completion of direct control-point path editing or R2/R4. The accepted combined baseline remains v106.

Curved-lane follow-up: [source and native evidence](CURVED_LANES_V107.md). V107 GUI and standalone MCP passed; independent review prompted a preview-banner fix, currently rebuilding as v107.1. The reviewed source check is now 22/22; full roadmap remains open.

Reviewed curved-lane v107.1 private build now passes GUI and real standalone MCP checks, including the corrected post-Apply banner. Exact executable, hashes, receipts and limits are recorded in [Curved lanes](CURVED_LANES_V107.md). This advances manual shaping; direct control-point editing and full R2/R4 acceptance remain open.


### Editable lane paths - v108 source checkpoint
Manual lane preview now has editor-only numbered point handles, a bend handle, coordinate fields and point insertion/removal through 32 points. Arrow keys nudge a point; Escape/blur/pointer cancellation restore its prior preview. Apply still commits through shared GUI/MCP validation and one-step Undo. Independent review found a preview/original-height drag mismatch; a fixed drag plane with a grab offset and no-motion suppression addresses it. Source checks: 24/24 (`outputs/lane-handles-source-tests.log`), TypeScript (`outputs/lane-handles-typecheck-reviewed.log`) and MCP sync pass. V108 build/native control tests are pending. This advances editable paths and does not complete R2/R4 or the whole roadmap.

Editable lane paths follow-up: [v108.1 evidence](LANE_PATH_EDITING_V108.md) records rebuilt GUI and real standalone MCP passes, exact EXE hash, direct handle cancellation/no-jump checks and strengthened numeric/saved-point checks. Screenshot feedback improved field spacing. Combined baseline remains v106; full R2/R4 and roadmap acceptance remain open.


### Manual brush MCP parity - v109 checkpoint
[Evidence and semantics](MANUAL_BRUSH_MCP_V109.md): GUI brush sample extracted and shared through new editor-v1 MCP profile, including shapes, falloffs, exact height and selection. 20 source tests covering 54 combinations, TypeScript, MCP sync and real GUI selection/protection pass. Corrected native 54-case MCP matrix is pending. Legacy behavior is retained explicitly; full R2/R8 and roadmap remain open.

Manual-brush v109 follow-up: [final evidence](MANUAL_BRUSH_MCP_V109.md) records 21/21 source tests, the passed54-case native MCP matrix, candidate hash/exactinvalid-state audit, and the GUI selection/protection receipt. The explicit editor-v1 profile closes the earlier MCP shape/falloff/exact-height/selection gap. Combined baseline remains v106 and full R2/R8 acceptance is still open.


### Combined v109 verification in progress
[Candidate and acceptance requirements](COMBINED_BASELINE_V109.md): repeat all 23 workflow scopes with the new lane-handle and54-case editor-brush evidence gates. Source/helper pins, saved artifacts and independent verifier review are included. Aggregate is running; v106 remains the accepted combined baseline.


### V109 combined baseline accepted
All 23 original workflow stages passed without replacement in `outputs/product-baseline-0367dr/report.json`. The final automated audit and independent critic verified the executable, aggregate and 26 linked receipt records. Source: 487 passed, one existing skip across 94 files; TypeScript passed. Extended lane-handle checks and all 54 shared editor/MCP brush cases passed, with 167 artifact records checked. [Exact acceptance evidence](COMBINED_BASELINE_V109.md) supersedes v106 for the combined private editor baseline. The installer still packages v96; updating and verifying a private v109 installer is the next packaging task. Twenty-seven creative families and other R0-R9 requirements remain, including external novice, clean-machine and game/server evidence.


### Private v109 installer accepted
[Installer evidence](INSTALLER_V109.md): refreshed the private setup to accepted v109 and retained the stable launcher. First install, shortcut/configuration, installed native MCP including curves, reinstall with alternate selection, and uninstall preservation checks passed. Independent critic approved the final receipts. Setup SHA-256 `5ddac7edb4699d1d5ce6c0e8ffab52429d5b4b1377438bb9427cf7a270c96852`. Clean-machine, missing-WebView2, novice and game/server gates remain open. No publication or push.


### Paint toolbar v110 and requested craft traversal
[Paint toolbar v110](PAINT_TOOLBAR_V110.md) exposes the previously hidden paint Strength/Edge controls; typecheck, MCP sync, independent source review and native compact toolbar verification passed. V109 remains the accepted combined baseline and installer. The user requested visual hill traversal for craft: [implementation and evidence requirements](CRAFT_TRAVERSAL_PLAN.md). Current slope/width diagnostics and terrain-following camera are insufficient for physics prediction; the motion model and validation remain required work.


### Craft hill preview - terrain-profile source foundation
[Traversal plan](CRAFT_TRAVERSAL_PLAN.md) now records shared sampled elevation/grades, graph and MCP implementation with 14 targeted tests. Native acceptance is pending. This advances R8 measurements and the requested test-drive groundwork; craft simulation, actual movement constants and game comparison remain unimplemented/unverified.


### Route elevation v111 private feature verification
[Exact evidence](ROUTE_ELEVATION_V111.md): rebuilt private EXE, shared elevation graph/MCP output and read-only preservation passed native tests and independent final review. Compact graph and centered scrubber were reviewed on a flat route; analytic hills are covered by source tests. Native non-flat hill examples and actual craft motion remain required follow-up. V109 remains the accepted combined baseline/installer; this is a scoped R8 measurement feature.


### Native hill profile and reusable measurement example
[Hill measurement lab](../examples/terrain-measurements/README.md) is importable in v111. The 400-unit hill, forward/reverse corridor coordinates, 193 samples per direction, graph/MCP agreement, crest marker and full read-only preservation passed native checks and independent review. [Receipts](ROUTE_ELEVATION_V111.md) close the native non-flat profile gap; craft simulation and game motion evidence remain open. This sprint added a harness/example/docs, with no product rebuild, publication or push.


### Temporary hill-inspection paths - v112 source
[Source checkpoint](TEMPORARY_INSPECTION_PATH_V112.md): draw a temporary path on terrain without authoring a base corridor; includes cancellation, source invalidation, graph/clearance and matching MCP optional points. 27 targeted tests, TypeScript and MCP sync passed; critic-requested incomplete-path label fixed. Native click/finish/cancel/source-change and full state preservation remain the next required checks. Craft motion remains separate unfinished scope.


### Temporary inspection paths v112.1 private acceptance
[Scoped evidence](TEMPORARY_INSPECTION_PATH_V112.md): click-to-draw temporary paths, Finish/Remove/Clear/Escape, mode/source invalidation, corrected path identity label and MCP explicit path inspection passed native tests and independent final review. Full project/editor state is preserved during inspection. TypeScript, 27 targeted tests and MCP synchronization pass. V109 remains the combined baseline/installer. Craft ghost, motion equations, capability calibration and full R0-R9 acceptance remain open.
