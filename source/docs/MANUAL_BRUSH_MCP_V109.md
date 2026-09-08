# Shared manual brushes and MCP

The GUI brush sample loop was extracted to `lib/manual-terrain-brush.ts`. The editor calls that helper, and MCP `edit_terrain` accepts an explicit `editor-v1` profile for the same six tools, three shapes, three falloffs, target height, texture and optional selection mask. Legacy operation/value brush requests keep their existing algorithm and mirroring.

GUI strokes may contain several samples; the new MCP profile applies one sample per request/Undo step. It preserves authored entity transforms and uses the same saved constraints as the GUI. Level uses a supplied target or samples the original cursor height; clients reproducing a multi-sample level stroke must retain the first sampled target. Unselected height brushing retains the editor's existing outer-ring-zero rule; selected brushes preserve imported edges.

## Source evidence

- `outputs/manual-brush-parity-source-tests-rerun.log`: 20 tests passed initially, including all 54 tool/shape/falloff combinations through the shared helper and MCP entry point; explicit shape/height/falloff formulas, smoothing source-neighborhood behavior, selection/protection and invalid-request preservation.
- Initial source test used an unavailable texture name; fixed to select a real manifest texture. The original failure log remains.
- TypeScript: `outputs/manual-brush-parity-typecheck-reviewed.log`, passed. MCP synchronization passed.
- Independent review prompted explicit level-target bounds and a final finite-height guard, plus clear legacy-only resnapping documentation. Bounds are +/-100000 generally and +/-5000 for Set height.

## Private v109 build and native scope

EXE: `D:/WulframForgeBuilds/manual-brush-parity-v109/WulframForge.exe`.
SHA-256: `51a1c85aa4b5b97ab534c83dbc64348dd8d6b0a5ba2a440fd0bf0e846527ddcd`.
Archive: `dist/desktop/WulframForge-0.7.0-v109-win-x64-self-contained.zip`.
Build log: `outputs/manual-brush-parity-v109-build.log`.

GUI selection/protection receipt: `outputs/outputs-desktop-test-OAk1Lg/report.json`, passed. This verifies actual selected and outside GUI brushing, protection, invalid/outside no-ops and Undo/Redo. It is not an independently driven GUI matrix of all 54 combinations.

The 54-case native MCP matrix compares complete saved projects to the shared helper, plus exact failed-request snapshots/history and Undo restoration. The first attempt found the host's intended active-layout commit timestamp differed from the source helper. The host's `mutate` synchronizes that timestamp for MCP commits; only top-level and active-layout updatedAt are normalized in successful-operation comparisons. Inactive layouts, all metadata and all other fields remain exact. Failed-request snapshots remain exact with no timestamp normalization.

An attempted rerun also encountered an existing diagnostic export filename. The harness now uses a unique prefix for every run and preserves previous artifacts. Failed logs remain under `tools/mcp/MapEditerMCP/outputs/manual-brush-parity-v109-mcp*.log`. The corrected native matrix passed; final evidence follows.

The combined baseline remains v106 and the installer v96. This does not complete R2/R8 or the full roadmap, and does not establish game or novice-user acceptance. Changes are local/private; no commit, push or distribution.


## Final scoped acceptance

- Native standalone MCP: `tools/mcp/MapEditerMCP/outputs/mcp-native-test-Asa1kk/report.json`, PASS. All 54 exact tool/shape/falloff tuples passed complete-project comparison to the shared source helper, stale-request snapshot/history preservation and Undo restoration. Only successful-commit top-level/active-layout timestamps are normalized.
- Exact artifact audit: `tools/mcp/MapEditerMCP/outputs/mcp-native-test-Asa1kk/exact-state-audit.json`, PASS. Checks exact tuples, all 54 candidate hashes, actual EXE hash and full JSON equality between the retained snapshot immediately before invalid-height rejection and the snapshot after it, with no normalization. Original native receipt is unchanged.
- The native harness now retains its last full Undo snapshot and asserts exact equality after invalid-height rejection on future runs. This assertion improvement was not rerun as a new native session; the retained artifacts above establish exact equality for the accepted session.
- Final source: `outputs/manual-brush-parity-source-tests-final.log`, 21/21 tests pass. The added case verifies inactive-layout protection and unrelated metadata preservation. The native matrix fixture has one layout; the inactive-layout case is source evidence.
- Source, tests and native results establish the shared algorithm and native MCP behavior. The independent GUI receipt covers selection/protection and Undo; it does not independently drive all 54 combinations.

No product code changed after the tested v109 build; later changes were test-harness assertions, source regressions and documentation. The previously documented MCP square/diamond/falloff/target-height/selection capability gap is closed through the explicit editor profile. Complete manual-authoring, performance/accessibility, and game/novice milestones remain open.

Independent final review verified the native report/executable hashes, all 54 tuples/candidate hashes and exact invalid-request snapshot equality. No remaining bounded evidence finding. The pending-matrix wording was replaced and the supplemental audit is listed separately from the unchanged native receipt.
