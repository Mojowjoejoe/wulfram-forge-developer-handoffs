# Offset Bastion district arrangements — source sprint

Status: private v74 build with native GUI and MCP acceptance below. The stable launcher can select this build; its saved selection has not been changed automatically. Offset remains experimental. These are arrangements of one family, not three additional reviewed families.

The placement preview now offers Classic, Wide Front, Deep Court and Split Wings under **District arrangement**. The choice moves whole powered districts and changes the reserved entrance geometry. Reroll varies building placement inside the chosen plan. Favorites hide this control because they reuse the saved arrangement exactly. A changed selection invalidates the previous preview and requires another preview before Apply.

Classic retains `offset-bastion-v1` and its original seed arithmetic. New choices use `offset-bastion-arrangements-v1:<choice>`. Twelve fixed golden cases cover the new recipes across all four sizes. Existing Classic golden tests pass unchanged.

## Verified source evidence

- `outputs/offset-arrangements-final-tests.log`: 11/11 tests passed, covering Classic, new recipes, invalid choices and portable reservations. Favorite checks compare actual building positions and equivalent rotations as well as corridor geometry.
- `outputs/offset-arrangements-ui-typecheck.log`: TypeScript passed.
- `outputs/offset-arrangements-ui-lint.log`: scoped lint passed.
- `outputs/offset-arrangements-wide-front-v1/report.json`: 48/48 flat cases passed.
- `outputs/offset-arrangements-deep-court-v1/report.json`: 48/48 flat cases passed.
- `outputs/offset-arrangements-split-wings-v1/report.json`: 48/48 flat cases passed.

Each matrix contains twelve seeds at each of four sizes, with deterministic generation, explicit selected-entrance analysis, validation, pairing and unchanged-source assertions. Per-case maps and four size-comparison SVG/PNG pairs are retained in each matrix directory. The three massive-size diagrams were reviewed: different district positions and entrance turns are visible; seed variations remain local within each selected plan. These cropped planar diagrams do not prove native rendering, game driving or combat quality.

Independent source/UI review found no actionable defect after the favorite building-transform assertions were added. Arrangement changes invalidate candidate application and inspection; favorites retain their stored geometry.

## MCP and native acceptance — v74

Private executable: `D:/WulframForgeBuilds/creative-layout-v74/WulframForge.exe`.
SHA-256: `3ADE0871FCB3C673B3E4DBA3A7748CC55FF7079BD720961A2097C1D43465B5AE`.

MCP now exposes `generate_base_layout` through both servers and the rebuilt host. Explicit `previewOnly:true` returns a checked candidate without mutation. Applying the same seed/settings with `previewOnly:false` and a current revision adds and activates a new layout through the editor generator. Existing layouts remain stored. Duplicate IDs, malformed settings and stale revisions reject. Commit acknowledgment and one-step Undo use the existing bridge. Preview geometry and semantic metadata are deterministic; creation timestamps may differ.

- `outputs/creative-v74-all-tests.log`: 335 source tests, 334 passed, one existing skip.
- `outputs/creative-mcp-preservation.log`: 3/3 targeted generation tests, including nonempty active/inactive layouts, locks, corridor rules and unsynchronized live entity state.
- `outputs/creative-mcp-typecheck.log`, `outputs/creative-mcp-lint.log`: passed; MCP synchronization passed; standalone package 8/8 passed (`outputs/creative-mcp-standalone.log`). Both server tool lists now contain 17 tools.
- `D:/WulframForgeTestRuns/outputs-desktop-test-gcSZDB/report.json`: Wide Front native selection, stale-preview rejection, Apply/Undo/Redo, favorite export/reimport, larger-map reuse, ZIP and restart passed; no renderer errors. Preview screenshot reviewed. This is starter-size flat-map native evidence, not catalog close-view or gameplay proof.
- `tools/mcp/MapEditerMCP/outputs/mcp-native-test-9E59nQ/report.json`: real MCP preview/apply for all three new arrangements passed on the same EXE hash. Full snapshots and revision/history/dirty state remain unchanged during preview; applied geometry/metadata match preview; existing states survive; duplicate/stale requests reject; Undo restores layouts/entities/terrain. Standard bridge/transport checks also passed. Input SHA-256: `1CA4C870A9920A274D76F1EC1A27DEDC7341590986B9B917FB4E263C40607E8B`.

Independent review requested stronger populated-layout preservation and full native preview/input identity checks. Those assertions were added and passed in the receipts above. Initial preservation assertions required JSON normalization to compare equivalent negative zero/undefined values and object key ordering produced by the editor clone; no product mutation was made to hide the mismatch.

Additional GUI receipts on the same v74 hash: Deep Court `D:/WulframForgeTestRuns/outputs-desktop-test-EePR0c/report.json` and Split Wings `D:/WulframForgeTestRuns/outputs-desktop-test-5IYjS3/report.json` both pass the same starter-size flat generation, stale-preview invalidation, Apply/Undo/Redo, favorite/library reuse, ZIP and restart workflow with no renderer errors. All three selections therefore have GUI evidence; other sizes and terrain cases remain separately scoped.

## Remaining roadmap acceptance

[Uneven-terrain source/native generation matrices](OFFSET_TERRAIN_V74.md) now pass for the stated synthetic fixtures. [Native policy-bearing uneven favorite reuse](OFFSET_UNEVEN_FAVORITES_V74.md) now has scoped evidence. Final catalog imagery and comparative family admission remain open. The prior Classic terrain/library receipts do not certify the new arrangements. No additional family is admitted by this sprint. V71.1 remains the last full combined acceptance aggregate; this is scoped v74 feature acceptance. No commit, push or public release occurred.
