# Base entrance choices - private v73.2

Bases > Rules > Base entrances selects an existing corridor for each team's service approach. Direction is from battlefield toward base. Preview entrances computes a candidate and exposes the route camera; Apply entrances saves one Undo step. Automatic approach clears that team's binding. Reset restores saved choices. Switching away from Rules discards the uncommitted entrance preview; map changes invalidate it.

Saved inspection follows every selected authored turn and reports invalid selected routes rather than silently using automatic shortcuts. This is a saved inspection preference validated when applied, not an all-edit constraint: terrain/building/corridor edits can invalidate it and must be reinspected. Terrain is not modified. Camera/clearance are sampled editor evidence, not driving or collision certification.

MCP inspect_entrances returns policy and corridor IDs/points. set_entrance_routing accepts explicit session, revision, active layout and versioned policy (or null), calls the shared operation, and commits one Undo step. inspect_routes reports entranceCorridorId on bound service routes. Both servers and native allowlist are synchronized. These additions require desktop v73+.

Offset favorites preserve bindings when moved/rotated through library version 4/reservation version 3. Old libraries remain readable; old editors reject the new version. Other corridor families require whole-map preservation. See [policy and portability contract](ENTRANCE_ROUTE_CONTRACT_V1.md).

Source verification: outputs/entrance-v73-all-tests.log records 328 tests, 327 passed, one existing skip. Targeted route/MCP tests passed 22/22. Standalone package tests passed 8/8; synchronization passed. TypeScript and scoped lint passed again after the final camera callback fix (outputs/entrance-v73.1-typecheck.log and outputs/entrance-v73.1-lint.log).

Independent review found competing inspector ownership and overstated automatic-route validation wording; both were fixed. Native v73 then exposed preview camera navigation discarding the draft; v73.1 separates preview camera control from tab selection. Follow-up critic found no remaining actionable defect in that fix. The failed v73 report is retained at D:/WulframForgeTestRuns/outputs-desktop-test-qad9CM/report.json.

## Accepted private build and exact receipts

Build: `D:/WulframForgeBuilds/entrance-routing-v73.2/WulframForge.exe`. SHA256 `FC24EF2EAA8E763255A4BC3FA25766C68BFB17FB4F5E1F61C740E1CB12E50940`.

GUI: `D:/WulframForgeTestRuns/outputs-desktop-test-JV8vhX/report.json` PASS, matching EXE hash, rendererErrors empty. Both team bindings, nonmutating preview/revision preservation, exactly one inspector, camera progress then Apply, Undo/Redo, existing Offset generation, favorites and library export/import/reuse, map ZIP and restart workflow pass. `entrance-policy-preview.png` was opened and reviewed. V73.2 adds aligned form fields, spacing and visible Apply button styling; final TypeScript and scoped lint pass in outputs/entrance-v73.2-typecheck.log and outputs/entrance-v73.2-lint.log.

MCP: `tools/mcp/MapEditerMCP/outputs/mcp-native-test-D3szGJ/report.json` PASS on the same hash. Entrance read/set, bound-route inspection, stale revision rejection, missing-corridor atomic rejection, Undo and restored snapshot preservation pass alongside existing edit/terrain/protection/export/deadline checks. Input source SHA256 `3B0B1D44066F319DDBF91A454FA4C01A96E0EFD20B11583F7B37F0CA3F1C22A1`; six inspected routes include four service approaches and two authored corridors. The earlier v73.1 MCP run `mcp-native-test-0ChZT2` failed only at its final snapshot because the test's direct client used the default session directory. That harness call now uses the same real MCP save_copy transport as the rest of the test; no host workaround was introduced.

Version-4 policy favorite relocation/rotation is source-tested; native portable favorite regression in this run uses the existing unbound version-3 library after Undo. Do not claim native proof of policy-library import/relocation yet. The combined whole-editor baseline remains v71.1. No family admission, whole-roadmap completion, novice/game/server proof, commit, push or publication is claimed here.


## Four-size native policy library follow-up

`outputs/entrance-library-v73.2-native-audit.json` PASS records small z4j7Nr, standard rOj9BG, large qRWpn7 and massive rb0M4s native reports under D:/WulframForgeTestRuns/outputs-desktop-test-*. All use the accepted v73.2 hash with empty renderer errors. Each applies both entrance bindings, exports/imports a version-4 library, reuses it at 90 degrees on a 14000x10000 flat map, checks every transformed corridor point and every service-pad route endpoint/team, then exports/reimports the map ZIP and restarts with exact project preservation. This supersedes the earlier native policy-library gap for these four flat-map cases.

The independent critic identified rotation and endpoint assertion gaps; those were strengthened and all four cases rerun. The audit hashes the reports, EXE, exported libraries and target fixtures. No new editor binary or MCP behavior change was needed. Uneven-terrain native policy portability and same-size multi-seed visual admission remain open. See [current Offset admission status](OFFSET_ADMISSION_STATUS.md).
