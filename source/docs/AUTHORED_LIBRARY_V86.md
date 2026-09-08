# Saved authored-base library v86

Private EXE: `D:/WulframForgeBuilds/authored-library-v86/WulframForge.exe`.
SHA-256: `DEED7D5DCCF13D69E9FB430F74B9B431A423212826B4E9AB0D01A144474F97E7`.

Base builder > Build > Authored bases > Saved authored bases now saves complete captured/imported packages, searches labels/package/district names, loads for existing placement preview, renames library labels, deletes, and restores the prior library state with library-only Undo. Up to 50 entries/2 MB per editor profile. Loading does not apply a map edit. Load and Export authored base provide existing file portability. Undo is session/panel-local and requires the exact latest storage value; it does not survive closing the panel or editor. Recovery backs up damaged bytes before resetting. Library changes do not enter map history.

MCP now has 22 registered tools, adding inspect_authored_library, edit_authored_library and recover_authored_library. Both servers and native allowlist/bridge are updated. GUI/MCP share validation, exact-raw guards and recovery code. MCP writes require editor revision plus exact library raw value. Failed/uncertain writes must be inspected again, never automatically replayed. Transport payload limits still apply.

Evidence:
- `outputs/authored-library-ui-tests.log`: 21 passing library/recovery/MCP tests.
- `outputs/authored-library-ui-package.log`: eight standalone package tests pass.
- Matching typecheck, lint and sync logs pass.
- `tools/mcp/MapEditerMCP/outputs/mcp-native-test-snD9X9/report.json`: PASS on the hash above. Native stdio MCP save/rename/remove/restore, stale rejection, healthy-recovery rejection, GUI save/search/rename/delete/Undo/load, remount persistence, full-map snapshots unchanged, existing authored preview/apply/Undo and general MCP acceptance.
- `library-restart-report.json` in the same directory: PASS after opening a new EXE process with that isolated profile. Both complete packages match the earlier exported package; both entries appear in the reloaded GUI. The restart harness uses CDP to read profile storage and inspect GUI; it is not a second stdio transport test.
- `authored-library-restart.png` opened/reviewed: labels, search, selection and disabled actions fit the narrow inspector without clipping. The older distant blank-map preview remains visually dense; no improvement to that terrain rendering is claimed.
- Independent review found and fixed hidden filtered selection remaining actionable. Final review accepted the fix; native regression verifies Delete disables when search excludes the selected base.

Remaining: large-payload MCP limits, multi-process concurrency beyond synchronous guards, broader library management and whole-editor acceptance. V77 stays the combined baseline. No claim of full roadmap, novice, clean-machine or game/server acceptance. Source and private build only; no commit, push or publication. Stable launcher selection was not changed.

## Native recovery follow-up

`tools/mcp/MapEditerMCP/outputs/mcp-native-test-snD9X9/library-recovery-report.json` passes on the same verified v86 executable hash. The separate recovery harness reopens only the prior isolated test profile, checks complete saved packages, imports the acceptance fixture, exercises GUI recovery by DOM click and MCP recovery through the native pipe client, and restores original test-library bytes in a finally block.

Assertions cover exact GUI/native backup strings including whitespace, valid empty envelopes, rejection of a stale damaged raw value without overwrite, GUI refresh after native recovery, unchanged full project snapshot and revision/dirty/Undo/Redo state. The original test library is restored exactly. `outputs/authored-library-v86-recovery.log` and `outputs/authored-library-v86-recovery-lint.log` retain the run and lint evidence. Independent evidence review accepted these scoped claims.

This follow-up does not exercise MCP stdio recovery registration (the earlier native main suite covers registration and healthy-recovery rejection), physical mouse interaction, quota faults in native storage, or cross-process atomicity. Its screenshot is taken before corruption and demonstrates persisted library visibility, not a recovery dialog. The map snapshot is compared before/after recovery; this harness does not independently assert imported fixture identity. No product source or EXE changed; no new build, commit, push or publication.
