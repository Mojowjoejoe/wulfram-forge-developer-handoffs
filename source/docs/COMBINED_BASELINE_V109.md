# V109 accepted combined private baseline

Accepted executable: `D:/WulframForgeBuilds/manual-brush-parity-v109/WulframForge.exe`, SHA-256 `51a1c85aa4b5b97ab534c83dbc64348dd8d6b0a5ba2a440fd0bf0e846527ddcd`.

This run repeats the v106 23-workflow scope on the current executable, extending the existing lane and MCP stages with editable lane handles and all 54 editor-brush tool/shape/falloff cases. It is not an R0-R9 completion claim. The full run, final automated audit and independent final review passed. V109 supersedes v106 as the accepted combined private editor baseline.

Invocation: `node --experimental-strip-types tools/test-product-baseline.mjs D:/WulframForgeBuilds/manual-brush-parity-v109/WulframForge.exe outputs-stamp-lab-IdQbRb/Landform-visual-lab.zip --relationships --authoring --editor-tools --authored-library --courtyard --broken-ring --valley-pockets --multiple-entrances --three-lane-anchor --manual-editing`.

Native output root: `D:/WulframForgeTestRuns`; .NET extraction: `D:/WulframForgeTestRuns/dotnet`.

Run directory: `outputs/product-baseline-0367dr`; log: `outputs/product-baseline-v109.log`. The runner writes intermediate report checkpoints after stages; finishedAt and the actual process exit identify terminal completion. A checkpoint report alone does not prove completion. Do not infer completion from an observation timeout or the absence of a final report.

## Added evidence requirements

- Lane stage must record valid finite three-point saved/displayed coordinates plus no-motion click, small drag, cancellation, keyboard/bend/point editing, Apply and Undo/Redo checks.
- Native MCP stage records exact 54 tuples, full candidate/stale/Undo snapshots, initial/seeded/final source and invalid-request snapshots. The verifier checks their hashes, recomputes candidates through the pinned shared brush operation, verifies whole-project comparisons, and requires the invalid-request before-snapshot to be the final Undo snapshot.
- Ten exact manual source/helper/manifest paths are pinned before execution and checked afterward. The final audit requires the same path list and hashes.
- Existing fixture/executable pins and all earlier base-library, authored reuse, export, restart, recovery, terrain and map-generation workflows remain required.

Independent review caught a false-pass for empty lane point pairs and weak input/snapshot linkage. All were fixed; a regression rejects empty/nonfinite/incomplete lane evidence. Verifier smoke on prior retained snapshots checked 167 artifact records using an in-memory enriched copy; it did not alter or upgrade the prior native receipt. Independent follow-up found no blocker to dispatch.

No product source or executable changed in this verification sprint. Baseline acceptance, when established, will remain separate from novice, clean-machine, game/server and full roadmap gates. No commits, pushes, publication or installer/launcher changes.

Progress checkpoint: full source suite passed (487 passes, one existing skip, no failures across 94 test files), TypeScript passed, and the combined landform/base/inspection/export/restart GUI workflow passed in `D:/WulframForgeTestRuns/outputs-desktop-test-IsK3Hk/report.json`. All 23 stages finished with exit code 0 at 2026-09-08T14:33:05.632Z. No replacement run was needed.

## Terminal automated evidence

- Aggregate: `outputs/product-baseline-0367dr/report.json`, passed; SHA-256 `da534ddabb6e66b1ac3c72978fc6145e0b53b649c0f618eeee4e02d56ffa21ce`.
- Final audit: `outputs/product-baseline-0367dr/verified-baseline-audit.json`, passed; SHA-256 `cf7d5a770ec824ec072c00295d8f89aff27e348ffe9c9de53bff27e809161763`. It links 26 receipt records; these are not 26 separate native processes.
- Auditor log: `outputs/product-baseline-v109-final-audit.log`; process exit 0.
- Lane GUI receipt: `D:/WulframForgeTestRuns/outputs-desktop-test-CFwbWP/report.json`.
- Standalone MCP receipt: `tools/mcp/MapEditerMCP/outputs/mcp-native-test-nvXIBn/report.json`. All 54 brush cases recomputed, 167 artifact records checked, exact failed-request state preserved. This does not claim 54 separately driven GUI brush cases.
- Independent final review approved the combined editor baseline after rechecking the exact executable, aggregate, all 26 linked receipt hashes, ten canonical manual input hashes, 54 recomputed candidates, 167 artifact records and lane saved/displayed coordinates. The full roadmap, remaining 27 creative families, clean-machine, novice and game/server acceptance are not complete. The [private v109 installer](INSTALLER_V109.md) subsequently passed scoped install/reinstall/uninstall and installed-native verification.
