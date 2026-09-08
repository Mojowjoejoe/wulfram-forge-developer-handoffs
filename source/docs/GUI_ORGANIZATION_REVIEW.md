# Whole-editor GUI organization review

User direction: inspect every tool, statistic, message and output, place controls where their purpose is obvious, and reduce explanatory clutter. This pass covers the complete editor, including modal workflows; it is not limited to Offset Bastion.

## Evidence and scope

`outputs/gui-control-inventory.json` inventories control-bearing source lines in every editor component. This is a source inventory, not proof that every dynamic control is usable. Native screenshots from the v46–v50 workflows show tall sidebars, repeated help, route inspection preceding building editing and low-level metadata among ordinary layout controls. Full workflow and keyboard/compact-screen review is required after reorganization.

## Placement decisions

| Function / information | Intended home | Current issue / required work |
| --- | --- | --- |
| Map name, dirty state, New, Import, Save local | Persistent file header | Keep editable-project saving distinct from exports |
| Export map ZIP, server JSON, Git source | One Export group | Separate buttons currently crowd the header; show format names in the group |
| Diagnostics, build identity, recovery | Help / troubleshooting | Keep available without competing with normal save actions |
| Repository selection, branches, refresh, checkout, publish PR | Expandable Repository workspace | Development operations occupy the viewport toolbar during ordinary map making |
| Balanced generator, candidate search, seed/size controls | Generate workspace | Generation competes with file operations; keep candidate comparison and Apply together |
| Random base / creative presets / original templates / My bases | Base library and Build workspace | Overlapping entry points need distinct labels and a shared destination |
| Raise, Lower, Flatten, Smooth, Set height, Paint | Terrain tool palette | Preserve shortcuts; show only active-tool settings |
| Large landforms, modal stamps, composition recipes | Terrain > Landforms | Two similarly named stamp entrances need clear purpose and one visible hierarchy |
| Shape, dimensions, rotation, height, texture | Active tool inspector | Put common dimensions before optional variation controls |
| Manual / Protected placement, mirror, protected outline | Placement section next to preview and Apply | Errors must link to the relevant setting; never silently change protection mode |
| Terrain selection, bounds, clear, drawing controls | Terrain > Selection | Keep active-region badge visible with direct clear action |
| Saved brushes, stamps and compositions | Libraries beside their tools | Search/load first; import/export/recovery secondary |
| Skybox and overall surface palette | Terrain appearance | Texture browser should be prominent when painting, compact otherwise |
| Team, building palette, fixed-template placement | Build workspace | Group team and placement mode; distinguish fixed templates from generated layouts |
| Layout selector, name, duplicate, delete, favorite | Layout header | Raw metadata belongs in Advanced, not the default flow |
| Base size, count, center, radius, rotation | Formation preview inspector | Keep Preview, options, Apply, Cancel together; show counts with units |
| Selected building position, rotation, active flag, delete | Top of selection inspector | Currently below inspection and advanced panels |
| District selection, transform, membership, save module | Build > Districts | Transform controls first, lock/variation policy secondary |
| District reroll, roles/budgets, paired rules, distances | District arrangement section | Keep intent next to preview, advanced relationships expandable |
| Boundaries, clear areas, protected terrain, corridors | Build > Reserved space | Distinguish terrain protection from building-only reservations |
| Route selection, width, progress, follow/pause, markers | Inspect > Routes | Avoid occupying the default building-edit inspector |
| Building power, sources, nearest cell, camera views | Inspect > Buildings | Close view and overview belong beside selection; short status first |
| Power icons/tint, ranges, Darklight, grid, routes | Shared View controls | Consolidate scattered toggles; keep verified/estimated range identity |
| Errors, warnings, requirements, repair actions | Inspect > Problems | Clickable issues first; raw rule repair in Advanced |
| Service/backup radius, slope, spacing, rule formulas | Rules > Advanced | Avoid presenting server assumptions as ordinary map statistics |
| Map dimensions, grid, unit count, cursor XYZ | Compact viewport status | Stable units; avoid repeating the same counts in multiple badges |
| Busy/error/success messages and preview state | Status plus local affected control | One actionable error; remove duplicate large paragraphs |
| Undo/Redo | Persistent viewport toolbar | Preserve map history versus separate library Undo labels |
| Tool search, task guide, legends, keyboard instructions | Help and discoverable search | Collapse explanations; show concise active tool names instead of internal identifiers |

## Implementation order and acceptance

1. Correct packaged-source parity, then verify visible changes in the actual executable.
2. Header/export/repository grouping and compact help; maintain accessible names and keyboard access.
3. Separate Build and Inspect; place selected-object controls first and advanced rule editing behind labeled sections.
4. Unify terrain/landform entry points and order common settings; keep placement decisions and feedback adjacent.
5. Consolidate libraries, generation flows, view controls, statuses and diagnostics according to this inventory.
6. Run complete terrain, base, generation, library, export/reopen and recovery workflows; review screenshots at normal and compact widths, keyboard focus and active-preview preservation. Update the inventory with the final location of each function. Do not call the whole GUI pass complete from a header or help-only change.

First source cleanup collapses active-tool help by default and uses the same visible tool names as the palette. Packaging investigation found that `create-desktop-assets.mjs` compared an alias command path with a resolved module path and silently skipped its entrypoint after workspace migration. The entrypoint now compares resolved filesystem paths. v49/v50 earlier native receipts cannot prove their new web changes; v50's old wording was directly observed. Rebuild and repeat before claiming delivery.

## First private implementation — v51.2

- Build: `D:/WulframForgeBuilds/gui-organization-v51.2/WulframForge.exe`, version `0.7.0-creative.51.2`, SHA256 `2B64408842CDABEC26A798AB27935D7798B3F972EBCC650EFD49C1F375253A6F`.
- Generate groups Balanced, Random base and Terrain detail. Other exports groups Source and JSON. New/Import/Save local/Export map remain directly visible. Native HTML disclosure controls provide keyboard activation; action buttons close their group.
- Active-tool guidance starts collapsed and uses the palette's names. Missing route protection points to Placement mode > Manual. The inspector uses one short status instead of duplicating the viewport's full error.
- Typecheck and scoped lint pass. Earlier wider-route source suite: 305 tests, 304 pass, one existing skip (`outputs/preferred-access-v49-source.log`); focused stamp project suite 3/3 passes (`outputs/stamp-help-v50-source.log`). These are scoped source receipts, not a fresh complete GUI suite.
- Native v51.1 receipt `D:/WulframForgeTestRuns/outputs-desktop-test-kBJCOI/report.json` PASS; header and protection screenshots visually reviewed. This verified current packaged wording and revealed the duplicate error subsequently shortened.
- Final v51.2 receipt `D:/WulframForgeTestRuns/outputs-desktop-test-FqXagi/report.json` PASS: both header groups open/close, tool help starts collapsed, protected mode explains the manual choice, switching to Manual clears the metadata block and leaves the map unchanged. Final compact-width, screen-reader, real export downloads through the new group, full generation/base/terrain regression and remaining inspector reorganization are still required.
- Packaging path comparison now resolves both paths before matching, so the C: workspace alias and D: physical path invoke the same asset build. The native wording check guards this incident's visible symptom. Full embedded-asset attestation remains separate work.

This is the first part of the whole-editor GUI pass. The placement table above remains the active scope, not a completed checklist. Next priority is inspector hierarchy and separation of Build versus Inspect, followed by terrain controls, library placement and status consolidation.

## Selected-building hierarchy — private v52

The selected building's position, terrain snap, move/rotate controls, active flag, delete action and placement checks now appear first in the inspector. Selecting a building scrolls that inspector to the top. Route inspection is a labeled disclosure, collapsed during ordinary editing and open in inspection mode; its component remains mounted so hidden controls do not reset route settings.

Build: `D:/WulframForgeBuilds/inspector-order-v52/WulframForge.exe`, version `0.7.0-creative.52`. Typecheck and scoped lint pass. Native receipt `D:/WulframForgeTestRuns/outputs-desktop-test-NfdvXr/report.json` PASS proves actual canvas selection, top placement/scroll, route disclosure behavior, unchanged map on selection, an X-position edit and exact Undo with unchanged terrain. The preceding `outputs-desktop-test-d8exHR` failed on an incorrect test selector after successfully selecting and capturing the building; the runner was corrected to use the existing visible X label. Its `selected-building-first.png` was visually reviewed: position/rotation and placement checks are visible before the collapsed route inspector.

No data or placement rules changed in this step. The layout still needs distinct Build/Inspect navigation, raw metadata tucked under Advanced, library consolidation, shortened repeated legends, compact-screen/keyboard review and the rest of the complete placement table above. The moved controls' position fields are tight at the existing inspector width; this remains a visual refinement item.

## Layout sidebar cleanup — private v53

Raw layout keys now live under Advanced layout data, collapsed by default. The mounted text area, draft reference, blur/apply behavior and existing metadata validation remain intact. Tool search includes Advanced layout metadata and opens/focuses the section. Power-badge and tint legends now live inside Display options beside their toggles, instead of appearing in Saved formations. Estimated coverage warnings remain visible when those overlays are active.

Build: `D:/WulframForgeBuilds/layout-sidebar-v53/WulframForge.exe`, version `0.7.0-creative.53`, SHA256 `1465F25DCD44D6353376A381764B98794079AB8B56A9CEA489EEFA38F2093AA5`. Typecheck and scoped lint pass. Native receipt `D:/WulframForgeTestRuns/outputs-desktop-test-rGzIMa/report.json` PASS: metadata starts collapsed, tool search opens it, closing preserves the map, legends belong to Display options, actual building selection shows controls first, and X editing/Undo preserves terrain and restores the map. `layout-sidebar.png` was visually inspected. An attempted standalone navigation test command referenced a nonexistent file; it provided no test evidence, and native search navigation supplied the actual verification.

The sidebar still has duplicated preset entry points and lengthy formation descriptions; repository controls, cross-mode display settings and full Build/Inspect separation remain open. This completes only the layout metadata/legend placement items in the whole-GUI pass.

## Build / Inspect / Rules — private v54

The base inspector now has three persistent section buttons. Build contains selected-building controls, districts and template context. Inspect contains building selection, power/camera inspection and routes. Rules contains reserved areas, saved-rule problems and repairs, role/count budgets, relationships, district arrangement previews, whole-layout validation and server/spacing assumptions. Switching sections hides mounted panels, preserving local drafts and route width. Selecting a building returns to Build; entering Inspect uses the existing non-editing inspection behavior. Terrain retains its own active-tool inspector.

Tool search routes saved-layout rule destinations into Rules and districts into Build. Saved-rule problem links select the appropriate section before opening their target. Native tests were adapted to navigate the new visible Inspect section before requesting team camera actions.

Build: `D:/WulframForgeBuilds/inspector-sections-v54/WulframForge.exe`, version `0.7.0-creative.54`, SHA256 `F42451C6E9DD980751BF90ECA5E345F462AE11469DB40C4BEFE1F4EC62171BF2`. Typecheck and scoped lint pass. Native receipt `D:/WulframForgeTestRuns/outputs-desktop-test-gklY74/report.json` PASS verifies Build/Inspect/Rules navigation, retention of a 120-unit route width across switches, tool-search navigation to district relationships in Rules, unchanged map while navigating, actual canvas selection, controls first and scroll-to-top, X editing and exact Undo with unchanged terrain. `selected-building-first.png` was visually reviewed with the persistent section buttons visible above editing controls.

Remaining GUI acceptance: complete template/formation preview, district draft persistence and every saved-rule link across sections; compact widths and keyboard focus; generation/library/export workflows; terrain/library consolidation and full regression. The whole-editor GUI review and R0–R9 goal remain active.

## Formation regression and terrain entry points — private v55

The v54 full Offset workflow passes in `D:/WulframForgeTestRuns/outputs-desktop-test-KC7vLF/report.json`: option preference/manual override, unchanged Save, close inspection, Apply/Undo/Redo, favorite export/re-import, larger-map reuse, map ZIP round trip and restart. This extends the initial section navigation evidence, without closing every district/rule workflow.

Terrain now offers Landform brush for viewport placement. The separate numeric dialog is named Stamp at coordinates under a collapsed Precise placement section, with a tool-search shortcut. The coordinate dialog retains its original behavior and checks; this is organization and labeling, not a consolidation of the two underlying stamp implementations.

Build: `D:/WulframForgeBuilds/terrain-entries-v55/WulframForge.exe`, version `0.7.0-creative.55`, SHA256 `15EAFD2ED72FEAA637287A14C08825402D83CCC0A864CC2EE22DE542F55A88AD`. Typecheck and scoped lint pass. Native `D:/WulframForgeTestRuns/outputs-desktop-test-eYNwv0/report.json` PASS verifies collapsed precise controls, opening the numeric dialog, search opening that same dialog, cancellation preserving the complete map, and the protected/manual brush workflow. The preceding Y0sXLy run failed because the button helper counted a hidden search result; its visibility filter now uses native checkVisibility in addition to layout rectangles. The failed screenshot was inspected and showed the correctly labeled visible coordinate button.

Remaining terrain GUI work includes appearance controls, grayscale import settings placed with their workflow, primary brush-settings ordering, shorter help, and final normal/compact-width visual review. The whole-editor inventory remains active.

## Brush and heightmap organization — private v56

Radius, strength, footprint and falloff lead the ordinary brush settings. Selection and measurements follow the common controls; saved brushes follow the active settings. Exact-height and paint-material context precede general brush controls for those tools. Grayscale controls are now in a collapsed Heightmap import settings section beside the left-hand Import grayscale action. That action opens/focuses settings; Choose heightmap opens the file chooser. Tool search can open these settings. The controls remain mounted so closing them retains input values. Removed the unrelated generic format paragraph from the terrain inspector, including its misleading fixed 129-grid wording.

Build: `D:/WulframForgeBuilds/brush-organization-v56/WulframForge.exe`, version `0.7.0-creative.56`, SHA256 `7ED420C9119ABD098BD961D1D1AFCE7F642F002A51257BFA320E2C05A27CEF29`. Typecheck and scoped lint pass. Native `D:/WulframForgeTestRuns/outputs-desktop-test-3N5tx2/report.json` PASS verifies primary brush controls first, import controls in the tool rail rather than inspector, collapsed default, Import grayscale opening settings, retention of an edited black-point value across close/reopen and unchanged map. The same run verifies the protected/manual stamp behavior. `brush-controls-and-import.png` was visually reviewed.

This run verifies organization and setting state, not actual grayscale-file import or the full manual brush matrix. Those, tool-specific exact-height/paint screenshots, compact-width checks, broader libraries and appearance controls remain GUI acceptance work.

## Combined GUI-era authoring verification — v56

`outputs-terrain-workspace-spgBP5/report.json` PASS on the unchanged private v56 executable. All five `--authoring` workflows pass: manual selection/drawing interruptions/measurement (`uVSPBt`), saved brushes (`5eg4Xv`), combined composition preview/guards/library/Undo (`CY1SCR`), portable Frontier reuse/map ZIP/restart (`0u2lcC`), and damaged-library recovery (`3E2tPu`). Native child directories are under `D:/WulframForgeTestRuns/outputs-desktop-test-`. Each aggregate case checks executable/fixture hashes and renderer errors. `outputs/gui-v56-source.log`: 305 tests, 304 pass, one existing skip.

Additional actual heightmap import: `D:/WulframForgeTestRuns/outputs-desktop-test-V3i7zG/report.json` PASS. The runner loads `outputs/grayscale-native-fixture.png` through the real image input, checks a read-only preview, Cancel, reopens and applies the image with relocated -20/180, gamma 1, zero-smoothing settings. Black/gray/white interior heights match their expected values, every outer-edge height is zero, entities/layouts/textures remain unchanged, and Undo/Redo restores exact projects. `heightmap-import-preview.png` was visually reviewed. Repeat with `WULFRAM_HEIGHTMAP_IMPORT_TEST=1` and the native desktop runner; the source PNG has three known grayscale bands and is a test fixture.

This strengthens combined terrain/base regression after the GUI reorganization. It does not complete compact-screen/keyboard/accessibility, every district/rule draft, generation/library/export design placement, full-product acceptance or the remaining R0–R9 features.

## Shared display controls — private v57

Display options now live once above the mode-specific left-hand tools, accessible in Terrain and Base builder. Tool search includes a mode-preserving Display options destination. Terrain mode explains that power/route settings apply in Base builder. Existing grid, tint, icons, coverage, route visibility, guide toggles, persistence/reset and legends use their original state; the viewport grid shortcut remains synchronized. No rendering rules or range assumptions were changed.

Build: `D:/WulframForgeBuilds/shared-display-v57/WulframForge.exe`, version `0.7.0-creative.57`, SHA256 `CD76A782D29199C6AB7C10BC95E1A822A9F1F67C2825B2EB98A157940D6C0F03`. Typecheck and scoped lint pass. Native `D:/WulframForgeTestRuns/outputs-desktop-test-gRUuXN/report.json` PASS checks changing grid/tint/icons in Terrain, switching to Base builder, one shared control set, persisted preferences after restart, Reset and unchanged complete map. `shared-display-options.png` was visually reviewed. This is preference/UI verification; individual overlay rendering, every optional toggle and compact-width review remain separate gates.

Next GUI work: repository controls, export naming and access, appearance/library grouping, status readability, and combined compact/keyboard acceptance. The full GUI inventory and R0–R9 roadmap remain open.

## Compact review — private v58, verification incomplete

Visual review of v57 `D:/WulframForgeTestRuns/outputs-desktop-test-SKB4Lk/compact-960.png` found the viewport spilling under the inspector and crowded toolbar readouts. The earlier report passed button bounds and direct focus/Enter activation at 1280/960, but did not detect the viewport overlap; it is not compact-layout acceptance.

Added an explicit minmax(0, 1fr) stage grid column, zero viewport minimum width, and wrapping toolbar with an automatic-height row. Strengthened the native compact scenario to check viewport/inspector boundaries as well as toolbar buttons. Scoped runner lint and private desktop build pass. Build: `D:/WulframForgeBuilds/compact-layout-v58/WulframForge.exe`, SHA256 `AF2666254D83A686DA43996743A9E209B8CA8912777398FB6AD66A7B208A8DC5`.

Native verification did not reach the UI: JssHYc, ub1gwW (host trace retained), and B09vb7 all exited code 0 during startup. Reports are under `D:/WulframForgeTestRuns/outputs-desktop-test-`. The sizing fix remains unverified in the packaged UI; do not promote v58 as accepted. Startup diagnosis, compact screenshots and full Tab/focus traversal remain outstanding. Direct focus plus Enter is not a full keyboard-navigation or accessibility check.

## Compact layout and startup correction — private v58.2

Managed startup tracing in v58.1 identified the failed startup as DllNotFoundException from WebView2 environment creation (`D:/WulframForgeTestRuns/outputs-desktop-test-PckWqB/managed-startup-*.log`). The single-file EXE extracts native libraries outside its application directory. MainForm now uses the runtime-provided NATIVE_DLL_SEARCH_DIRECTORIES to find WebView2Loader.dll and calls the SDK SetLoaderDllFolderPath before environment creation. This follows the installed SDK XML contract; ordinary loader resolution remains when there is no extracted candidate. Optional WULFRAM_FORGE_STARTUP_LOG captures startup stages/exceptions and closing reason; the native harness supplies a per-run file. No logging occurs without that environment variable.

Build: `D:/WulframForgeBuilds/compact-layout-v58.2/WulframForge.exe`, version `0.7.0-creative.58.2`, SHA256 `F90B90990DD5BD90DCAA9CE6C7B9E4EC2DDD08B537F71C641F7AACCC6C338B13`. Publish and runner lint passed. Native compact test `D:/WulframForgeTestRuns/outputs-desktop-test-4raKXH/report.json` PASS: viewport and stage end at inspector boundary (1020 at width1280; 700 at width960), no toolbar-button/document overflow, Generate/Other exports and Build/Inspect/Rules activate via focus+Enter, saved maps unchanged. Both compact screenshots visually reviewed: overlap resolved, toolbar wraps at960. Emulated CSS widths are not a physical-window/DPI matrix or full Tab/accessibility acceptance.

Native shared-display test `D:/WulframForgeTestRuns/outputs-desktop-test-w6kGLi/report.json` PASS on the same EXE: fresh startup, settings, restart/persistence/reset, and unchanged map. This verifies startup for these runs, not every historical intermittent failure or clean-machine compatibility. No current full-product baseline rerun. Remaining GUI targets include bulky viewport help, sidebar library density, repository organization, export naming, and full keyboard traversal.

## Contextual viewport controls — private v59

Replaced the permanent two-line viewport-help overlay with a closed View controls disclosure. Expanded help uses a compact action/shortcut table with explicit readable typography; building move/transform rows appear only in Base builder. The native summary is keyboard-focusable, has a visible focus ring, and the panel is constrained/scrollable within the viewport. Existing canvas interaction bindings are unchanged.

Build: `D:/WulframForgeBuilds/view-controls-v59/WulframForge.exe`, version `0.7.0-creative.59`, SHA256 `84EF7B5DA3C02542CBFFB9207A2088F66AABE874FD5A367411DCCDCBF1FCE8E2`. Typecheck, scoped viewport/runner lint and desktop publish pass. Native `D:/WulframForgeTestRuns/outputs-desktop-test-HQp7pZ/report.json` PASS at CSS widths1280/960: help starts closed, Enter opens/closes it, expanded bounds stay inside the viewport, saved maps remain exact, and existing toolbar/section compact checks pass. Closed and expanded960 screenshots visually reviewed. This is scoped Base-builder help verification, not full Tab navigation, a screen-reader check, all terrain-tool help or a complete combined baseline.

## Layout sidebar cleanup — private v60

Map layouts replaces the internal-sounding Base layout states heading. Saved formations starts collapsed; removed its duplicated visible label, labelled its selector Reuse a favorite, and styled the save action consistently. Layout descriptions and the general layout explanation live under About layouts. Removed the misleading generic base-mode Save paragraph, which could be read as describing Save local even though its partial-write behavior belongs to repository saving. Existing selectors, generation, favorites and layout mutations retain their handlers.

Build: `D:/WulframForgeBuilds/layout-sidebar-v60/WulframForge.exe`, version `0.7.0-creative.60`, SHA256 `63B409E1D48F5490540A75959ABC3D2B04E52EFD00F8012A1A4D07116727E3E7`. Typecheck, scoped lint and desktop publish pass. Native compact `D:/WulframForgeTestRuns/outputs-desktop-test-wu8O8h/report.json` PASS verifies collapsed favorites/help, Enter open/close, unchanged maps and viewport/menu controls at1280/960. The960 screenshot was visually reviewed; active layout naming/actions and team controls are now reachable with less sidebar scrolling.

Native formation workflow `D:/WulframForgeTestRuns/outputs-desktop-test-QlSr2d/report.json` PASS on the same executable: Offset Bastion preview/generation/Undo, favorite save through the disclosure, portable export/import/reuse, map ZIP and restart. This is the existing scoped family workflow, not admission of the experimental family or full-product acceptance. The runner explicitly opens Saved formations before its save action. Repository organization, export semantics, general keyboard traversal and broader GUI review remain open.

## Repository action grouping — private v61

The toolbar now has a Repository disclosure instead of an always-visible map selector and icon row. Its bounded dropdown retains text labels at compact widths for setup/diagnostics, refresh, load, mode-specific save and Publish PR. Branch/change status and the save/publish scope explanation sit with these actions. Existing operation handlers and disabled conditions remain unchanged. Removed the unused GitBranch import after scoped lint flagged it; corrected lint passes.

Build: `D:/WulframForgeBuilds/repository-menu-v61/WulframForge.exe`, version `0.7.0-creative.61`, SHA256 `1A9F79C7B105F1FD34FBE1CE170E7E82048AA322ED303F69BCC723BCB30DA1C5`. Typecheck, corrected scoped lint and desktop build pass. Native `D:/WulframForgeTestRuns/outputs-desktop-test-AqNWJA/report.json` PASS verifies repository menu closed default, Enter opening/closing, panel containment and visible action labels at1280/960, plus the existing compact/help/sidebar checks and exact saved-map preservation. The960 repository screenshot was visually reviewed.

This is navigation/display evidence only. No repository load/save/publish or remote mutation was performed. Repository operation integration, Escape/outside-click behavior across menus, export naming and full keyboard/accessibility review remain open. The build ran before the unused-import cleanup completed; that cleanup has no runtime behavior. A future combined build should include the final source snapshot.

## GUI-era combined baseline attempt — v61

`outputs/product-baseline-cBT1KJ/report.json` failed during native restart while WebView2 control creation remained pending; managed logs in native Tw5LRQ distinguish this from the earlier DLL loading failure. The revised aggregate continues independent suites after failure and preserves a failing overall status. `outputs/product-baseline-IVcmtD/report.json` remains FAIL: source305/304pass/1skip and typecheck pass; random maps WUc96G pass; `outputs-terrain-workspace-LmZfZl/report.json` passes all five authoring cases. Combined landforms61EiNZ reopened successfully but re-import failed because the downloaded ZIP was no longer present after restart. Investigate download lifecycle and confirm durable export; do not call this round trip accepted. Creative runner failed an obsolete expected dropdown list missing Offset Bastion; corrected assertion is not yet rerun. Updated old sculpt help assertion to Raise. Earlier failing receipts retained. No full-product baseline upgrade claimed.

## Conventional top menus — private v62

User-directed navigation change: added an Editor commands bar below the project header with File, Edit, View, Terrain, Bases, Tools and Help. File names its actual export formats (map ZIP, Git source ZIP, base-layout JSON); actions call existing handlers. Terrain selects existing brush tools; Bases opens library/Build/Inspect/Rules; View opens shared preferences; Tools exposes generation and repository; Help opens existing guides/search/about. Disabled Undo/Redo mirror history. Native disclosures close after action, on Escape (restoring summary focus) and outside pointer presses; only one top menu opens at a time. Existing quick actions and side settings remain. A contextual tool-options strip is still pending, along with complete menu keyboard traversal and broader action coverage.

Build: `D:/WulframForgeBuilds/editor-menu-v62/WulframForge.exe`, version `0.7.0-creative.62`, SHA256 `FA2C0F54724BBCB7ADEC81A1E4F55AFE6428BC98E22DE4CD9D81817F922AE08F`. Typecheck and scoped lint pass. Default web output cleanup twice failed EPERM; built into fresh `D:/WulframForgeBuilds/editor-menu-v62-web` and explicitly packed it. createDesktopAssets accepts an optional source-directory argument while retaining its existing default. Embedded956assets and desktop publish succeeded. This bypasses the locked generated folder; it does not claim the lock cause fixed.

Native `D:/WulframForgeTestRuns/outputs-desktop-test-959Sjc/report.json` PASS: seven headings, File menu fits1280/960, Enter activation and Escape focus restoration, Terrain Raise/Bases Rules/View Display destinations, menu closes after actions, exact map preservation. Initial OUuHuT failed because the test matched both Terrain menu and Terrain mode switch; runner now supports explicit control scope and keeps legacy actions outside the new menubar. Compact File screenshot visually reviewed. Outside-click implementation, other menu commands, full Tab/arrow navigation and full-product baseline remain separate checks. v61 combined failures above remain unresolved.

## Contextual options strip — private v63

Added a40px Tool options strip below the conventional menu bar. Ordinary terrain tools expose shared radius/strength; landforms expose shared height/depth and rotation; manual Base builder exposes build team and placement clearance. Inspection and creative preview show their context without irrelevant manual controls. Existing side-panel controls remain synchronized via the same React state, and the workspace height accounts for the added strip. This is the first contextual-toolbar slice; exact-height/material/shape shortcuts, selected-building transform controls, and reducing duplicated side-panel controls remain design work.

Build: `D:/WulframForgeBuilds/tool-options-v63/WulframForge.exe`, version `0.7.0-creative.63`, SHA256 `992D679AB7B268DF632CBC0FA0210981451559BEF5ADBDFC3B57CC245AF78C02`. Typecheck, scoped lint, isolated web build/asset packaging and desktop publish pass. Native `D:/WulframForgeTestRuns/outputs-desktop-test-cnM2Xf/report.json` PASS: actual ArrowRight adjusts radius165->170 and sidebar matches; sidebar strength48 appears in toolbar; landform context replaces brush controls; toolbar team2 matches side-panel team; strip fits960px; complete saved project unchanged. The960 screenshot was visually reviewed. This does not prove every toolbar value's applied terrain/building behavior or complete accessibility. v61 combined-export/restart and creative-suite rerun gaps remain open.

## Top-menu keyboard navigation — private v64

Added focused-menu ArrowLeft/Right navigation between headings, ArrowDown/Up cycling through enabled commands, Home/End to first/last command, and existing Escape close/focus restoration. Navigation consumes its key only when focus is in the command bar; modifier shortcuts retain normal handling. Native disclosure semantics and normal Tab access remain. Disabled commands are excluded from the focus list.

Build: `D:/WulframForgeBuilds/menu-keyboard-v64/WulframForge.exe`, version `0.7.0-creative.64`, SHA256 `CC6B90D6095A4659E7B5EBA65F905D880F45477A316812FA04DB56D836F1D0B2`. Typecheck, scoped lint and isolated desktop build pass. Native `D:/WulframForgeTestRuns/outputs-desktop-test-4y8RjI/report.json` PASS sends actual ArrowDown, End, Home, ArrowRight and Escape events, asserts exact focused commands/headings, then runs the existing1280/960 File-menu containment and Terrain/Bases/View navigation/map-preservation scenario. This does not establish screen-reader compatibility, all backward/wrap/disabled combinations, or every command execution. Full toolbar context coverage and the unresolved combined baseline remain open.

## Download durability investigation — v64

Added Browser download-event recording and WULFRAM_EXPORT_DURABILITY_TEST. Native `D:/WulframForgeTestRuns/outputs-desktop-test-s4MDms/report.json` PASS on unchanged v64: exports through File > Export map ZIP, waits for Browser.downloadProgress completed, decodes exact terrain/layouts, hashes the actual download before/after process exit and restart, then reimports through the actual file input and verifies data. Trace shows receivedBytes==totalBytes while state remained inProgress before completed; file appearance/readability is not a reliable completion signal. No product export-format changes were made.

Strengthened combined download gate to wait for completed. Broader reruns remain FAIL: RMGd0J attempted Preview formation behind the asynchronously opened base-library dialog; replaced its instant optional-close check with waiting for Close library. Next egwvNI failed exact Undo terrain restoration at runner line958 before entering the combined export sequence. Do not attribute this new failure to export or claim the full round trip fixed. Investigate Undo timing/state with read-only snapshots; retain all receipts. Runner lint passes. This is scoped durable-export evidence, not a full baseline upgrade.

## Observed Undo and combined journey — unchanged v64

Native `D:/WulframForgeTestRuns/outputs-desktop-test-ZjrVGm/report.json` PASS with read-only live revision/history snapshots around each landform Undo. All five presets consume exactly one history entry (2->1), restore exact live terrain and then exact saved terrain. Immediate revision changed in all five cases; this successful run does not establish the cause of the earlier intermittent mismatch. Stronger assertions remain, and earlier failures are retained.

The same run passes the combined landform/base/manual adjustment/inspection/export/restart/reimport journey, explicit browser download completion, and compact high-DPI guide keyboard checks. No product Undo change was made. This improves v64 combined-journey evidence but is not the entire aggregate baseline or a claim that all intermittent startup/history failures are resolved. User correction "not that" is pending clarification; further GUI changes are held while the existing test result is recorded.

The user's "not that" correction belonged to another chat; GUI/roadmap work resumes under the existing scope. PRODUCT_ACCEPTANCE_MATRIX.md now puts v64 scoped receipts first and explicitly labels older baseline/mapping/gap tables historical. Current full aggregate and external acceptance remain unproven.

## Resumed baseline verification and header layering — v64/v65

User confirmed the correction belonged to another chat. `outputs/creative-native-xaTDZp/report.json` PASS on v64 invoked with BASE_LIBRARY_TEST, PORTABLE_LIBRARY_TEST, DISTRICT_TEST and RELATIONSHIP_TEST. Covers library, district alignment/relationships/locks, constrained and paired arrangements, composition, creative placement/adaptation and portable export/reopen. Runner does not independently hash its EXE; invocation selected v64 and post-run SHA256 remained CC6B90D6095A4659E7B5EBA65F905D880F45477A316812FA04DB56D836F1D0B2. Fresh current-source `outputs/source-v64-current.log`:307tests,306pass,1skip. Source test evidence is distinct from embedded-build identity.

Random v64 eWHDrF failed a real layering regression: new command bar z45 obscured the header Generate dropdown in topbar z5, including Balanced. Raised topbar to46, still below dialog layer50. Private v65 `D:/WulframForgeBuilds/header-layer-v65/WulframForge.exe`, SHA256 ECA7E9FC2E2E34833B366ADE048DCDD1063F842A2EC31F50FEC6C40DA259C9D9. Isolated web build/assets/publish pass. Native `D:/WulframForgeTestRuns/outputs-desktop-test-zcBfqX/report.json` PASS: Generate now accessible, cancellation, stale settings/preview rejection, exhausted search and passing preview preserve draft settings. No public/repository actions performed. Full same-build aggregate still pending.

v65 terrain workspace: `outputs-terrain-workspace-LkYNRZ/report.json` PASS, all five --authoring cases on unchanged v65 hash: manual selection/drawing interruptions/measurements kRHz9h; saved brushes zdNXJF; compositions98OXWD; portable Frontier reuse sNRKDH; damaged-library recovery6aTJAr. Native child receipts under D:/WulframForgeTestRuns/outputs-desktop-test-. This completes the requested current terrain-workspace rerun but not a full v65 aggregate or roadmap acceptance.

## Combined private baseline accepted — v65

`outputs/product-baseline-sxp5lh/report.json` PASS with --relationships --authoring on unchanged v65 SHA256 ECA7E9FC2E2E34833B366ADE048DCDD1063F842A2EC31F50FEC6C40DA259C9D9. Source307/306pass/1skip, typecheck, combined nativej1i3tr, creative-native-dBjLKu, randomFkwsRW and five-case outputs-terrain-workspace-Tgy7jI all pass. PRODUCT_ACCEPTANCE_MATRIX.md now leads with this exact baseline. Existing partial/failing records remain for diagnosis. No clean-machine, game, novice, whole-accessibility or full-roadmap completion is claimed. Further manual-terrain work should expose protection tools for hand-built maps and extend the current rectangular selection workflow.

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
