# Service Courtyard portable reservations

Source implementation, not yet rebuilt into private v89.

Reservation schema version 4 identifies service-courtyard and retains exactly six named court/mouth corridors in per-team local frames. Whole base-library envelope version 5 is required; older envelope versions reject this content. Existing Frontier/Offset and unreserved exports retain their earlier envelope versions.

Capture, export/import, relocated/rotated favorite placement and saving again preserve the actual reservation geometry. The shared courtyard-access helper recomputes both continuous 80-unit sampled through-routes against destination terrain and final buildings. Connected endpoints are required. No cached source-terrain access claim is reused. Placement validates before assigning metadata; source maps and favorites remain unchanged on rejection.

Validation permits structurally valid disconnected stored corridors, but placement rejects them. Import success is not a guarantee that a favorite fits any destination map. Original-model collision and game behavior remain separate evidence.

Evidence: outputs/courtyard-portable-tests.log (24 passing portable, Courtyard golden/placement and MCP command tests), outputs/courtyard-portable-typecheck.log, outputs/courtyard-portable-lint.log and outputs/courtyard-portable-sync.log. Existing rotated v1 geometry/reservation/access goldens remain unchanged after extracting the shared route helper. Independent review found no blocking defect. Regressions include relocation, recapture, downgrade rejection, malformed IDs/sides/width, disconnected corridors and destination ridge rejection without mutation. The future-version rejection fixture now uses version 6 because version 5 is intentionally supported.

MCP impact: shared favorite serialization and placement semantics change; existing shared commands consume them without new transport tools. A rebuilt host is required. Native GUI favorite/export/import tests remain open; private v89 proves only its earlier generation and JSON reopen scope. Browser card/admission remain pending. Seventeen admitted families; v88.1 stays combined baseline. No commit, push or publication.

## Native GUI round trip on v90.1

Reviewed receipt D:\Documents\Wulframe\wulfram-mapeditor\tools\mcp\MapEditerMCP\outputs\mcp-native-test-u9UXev/report.json PASS; log outputs/courtyard-v90.1-portable-reviewed.log. Exact executable SHA256 b5df3a71c129e882a410860e8782eb08f1381cf89fcccff4637c73710e321495. GUI saved the applied Courtyard as a favorite, exported envelope5 with all six reservations, removed it, previewed/cancelled import with unchanged library, imported exact content and reused it through GUI preview/Apply/Undo. Reuse compares building semantics/poses independently of regenerated IDs (1e-5 numeric precision), corridor geometry, both team counts and both ordered 80-unit through-routes with no blocked markers. Library actions preserve full map and revision/Undo/Redo/dirty state.

First run VhWISc retained: portable actions completed but later map reload used a stale CDP input ID. Re-querying on each import fixed the harness; the complete rerun above passes. Independent review accepted the strengthened checks; harness lint passes. No new product source or binary in this acceptance step. Same-map reuse is proven here; cross-map native reuse, profile restart, and original-model access review remain open.

## Restart and different-map GUI reuse

D:\Documents\Wulframe\wulfram-mapeditor\tools\mcp\MapEditerMCP\outputs\mcp-native-test-u9UXev\courtyard-restart-N2FvIC/courtyard-restart-report.json PASS on the same v90.1 EXE hash. A new process reloads the exact exported library from the isolated profile, imports a 16000x12000 flat original-texture destination, and uses GUI favorite preview/Apply/Undo. Expected transformed XY/yaw and six reservation geometries are compared; through-routes are recomputed. Preview preserves full map/history, camera changes preserve the applied map, and Undo restores source layouts/entities/terrain. This is native-pipe inspection with GUI placement, not a new stdio restart claim. Height/pitch/roll on uneven terrain are outside this check.

First restart failed a harness raw-angle comparison against normalized yaw; modulo-2pi comparison fixed it. Original failure retained. Independent review found no blocking issue in the restart proof. Current harness lint passes.

Six textured original-model views in the receipt directory were opened and inspected: both-team overhead/ground plus first repair pad close views. The through-court is visibly open in this fortified flat example. Close repair models and powered status are readable; overview buildings remain small. Earlier checkerboard captures in courtyard-restart-GPAJc4 are retained but not used for detailed model review. This single-size/single-arrangement sample does not finish whole-family visual admission or establish in-game driving.

Independent six-image review confirmed readable repair models/powered status and open court reservations. Ground views contain excessive sky and distant buildings; use overhead plus repair detail for the current documentation, and add a closer oblique bank view for explanatory coverage. Scope remains one 21-per-team flat synthetic sample with editor overlays.

## Four-size native ZIP round trip

D:\Documents\Wulframe\wulfram-mapeditor\tools\mcp\MapEditerMCP\outputs\mcp-native-test-8lFeFU/report.json PASS, log outputs/courtyard-zip-native-reviewed.log. All four sizes export generated layouts to ZIP; embedded project terrain/entities/layouts match the generated saved copy. GUI ZIP import must commit a new revision before a fresh saved snapshot is compared. Earlier run failed with a stale revision because import was not awaited; it remains in outputs/courtyard-zip-native.log. Reviewed timing fix and harness lint pass. Same private v90.1 executable, no product or binary change.
