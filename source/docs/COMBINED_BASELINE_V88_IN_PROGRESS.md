Final result: [V88.1 combined private baseline accepted](COMBINED_BASELINE_V88.md). The text below retains the in-progress history and original failure; final evidence is the separate verified-baseline-audit.json.

# Combined v88.1 acceptance work log - finished

Candidate: `D:/WulframForgeBuilds/authored-browser-v88.1/WulframForge.exe`, SHA-256 `59714EA0DAFEE2BAB528CFC87E54926116736407F879DC527B535CF79FAF199E`.
Runner invocation: `node tools/test-product-baseline.mjs <candidate> outputs-stamp-lab-IdQbRb/Landform-visual-lab.zip --relationships --authoring --editor-tools --authored-library`.

Current run directory: `outputs/product-baseline-uUzkCn`; outer log: `outputs/combined-v88.1-run.log`. The running process, not the presence of this document, is the authority for liveness. Check the retained tool session or OS process and live aggregate before taking any restart action. V77 remains the accepted combined baseline until all required child evidence is inspected.

The runner includes all source test files, TypeScript, combined landforms/export/restart, creative/portable/district/relationship workflows, randomized maps, terrain authoring, landform/lane/menu/context/selection/Offset workflows and native MCP. New authored flags cover capture/placement, saved library and portability, visual browser, cameras and close inspection. On a passing native authored receipt it appends separate new-process restart and damaged-library recovery checks. Required child fields and matching executable/fixture hashes are checked. Source suite names and invocation are retained for scope review. Runner lint passed in `outputs/baseline-v88.1-runner-lint.log`.

This is acceptance harness work, not a new editor feature or EXE. MCP operations and serializers remain unchanged; expanded native acceptance includes them. No new build, commit, push or publication. Full R0-R9, 48 families, novice, clean-machine and game/server requirements remain open even if this scoped aggregate passes.

First completed checks: all 397 discovered source tests finished with 396 pass, zero failures and one skip (`template records reconstruct units from their original maps`); TypeScript passed. Native combined-landforms was live at the last session poll. This is partial progress, not aggregate acceptance.

## Retained creative failure and ongoing independent suites

The combined-landforms and random-maps children completed with exit zero; terrain-workspace is now running. Creative child `outputs/creative-native-WyybnB/report.json` failed at `Timeout: rename persisted` (test-creative-layouts.mjs line 510). Inspection found its clickButton helper waited for an enabled matching button but then clicked the first global matching label. The newly mounted authored panel supplies a disabled Rename saved base behind the modal. The helper now uses the same enabled-button expression for both wait and click, scoped to the base-library modal when present. This is a harness correction; the unchanged editor EXE has not yet been reverified by a complete creative rerun. Preserve the original failure. Finish/poll the existing aggregate before scheduling the focused replacement.

Runner review found no false-PASS path and suggested explicitly requiring authoredGui receipt fields. Those are now required for future runner invocations and the separate `tools/audit-product-baseline.mjs` final audit; the already-running aggregate keeps its loaded runner code. Audit tooling checks the full 15-step scope, nested receipts and hashes. It has not yet accepted this unfinished/failed aggregate. Runner/creative/audit lint passed in `outputs/baseline-v88.1-review-lint.log`.

## Completed nested receipt audit and rerun preparation

`outputs/product-baseline-uUzkCn/completed-workflow-audit.json` verifies eight completed combined/random/terrain-authoring reports and matching EXE hashes. All five terrain-authoring cases passed. Landform-library, lane-tool, menus, tool-options, selection-protection and Offset library/entrances also completed with zero exits; native MCP was live at the latest poll. Creative remains the only recorded failed step so far.

`tools/rerun-baseline-creative.mjs` is ready but not launched: it requires a terminal aggregate, the failed creative step and the exact four library/portable/district/relationship flags. It records the actual invocation plus EXE, script, aggregate, log, receipt and both creative ZIP/JSON fixture hashes, then verifies unchanged inputs. `tools/audit-product-baseline.mjs` can reconcile that separately retained replacement while still requiring all other original steps and nested receipt evidence. Review accepted failure handling and identified missing creative-fixture hashes; those were added. The original run did not record its creative fixture hashes, so no earlier-vs-rerun fixture identity is claimed. Reconciliation tooling lint passes. No editor source or binary changed.

## Aggregate terminal; targeted rerun active

The original aggregate finished at `2026-09-08T04:30:09.083Z` with 14 of 15 steps passing. Only creative-bases failed. Native MCP receipt `tools/mcp/MapEditerMCP/outputs/mcp-native-test-jfP1DP/report.json` plus its library-restart-report.json and library-recovery-report.json pass against v88.1. The original aggregate remains failed and unchanged.

The corrected full creative suite was launched through the reviewed wrapper. Replacement work directory: `outputs/product-baseline-uUzkCn/creative-rerun-stpo36`; outer log: `outputs/combined-v88.1-creative-rerun.log`. Its tool session was live at the last poll. Do not treat the directory as proof of liveness or success. Final replacement receipt/audit remain pending. No baseline promotion yet.
