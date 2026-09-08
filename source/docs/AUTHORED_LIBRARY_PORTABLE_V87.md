# Whole authored-library portability v87

Private EXE: `D:/WulframForgeBuilds/authored-portable-v87/WulframForge.exe`.
SHA-256: `A5E8DCB174B290B80675A0CB28C9FFBA79B98750E817EB3FDFA1550A9C884F37`.

Saved authored bases now exports the complete versioned library and previews whole-library import with new/skipped counts, Apply and Cancel. Identical ID/content entries skip using key-order-independent comparison; same-ID changed content and case-insensitive name collisions reject the entire merge. Existing saved entries are preserved. Library Undo restores the previous collection. Async file reads cancel on reload, edits, newer imports and panel unmount. Exact storage guards still reject stale Apply. An all-identical GUI import disables Apply.

MCP uses the same import operation through edit_authored_library. Optional previewOnly routes to a distinct preview_authored_library native action; an older host rejects the unknown action, preserving preview semantics. The number of registered MCP tools remains 22. Both server copies and native bridge/allowlist changed.

Evidence:
- `outputs/authored-library-portable-tests.log`: 23 passing tests, including duplicate key-order handling, unchanged sources, atomic conflicts and capacity rejection.
- `outputs/authored-library-portable-package.log`: eight standalone tests pass; matching typecheck, lint and synchronization logs pass.
- `tools/mcp/MapEditerMCP/outputs/mcp-native-test-YcfqEb/report.json`: PASS on the hash above. Includes GUI export equality, native stdio MCP preview with unchanged raw storage, GUI preview/cancel, merge, library Undo, whole-map preservation, existing authored placement and broader MCP checks.
- `library-restart-report.json` in the same directory: PASS after a new process opens the isolated profile; both merged packages exactly match the exported package and appear in the GUI.
- `authored-library-restart.png` opened/reviewed: import/export, search and saved-base actions fit the narrow inspector. Screenshot is of the saved panel, not an import preview.
- `outputs/authored-library-legacy-preview.log`: previous v86 EXE rejects the distinct preview action and retains raw library bytes. This checks native rejection; source review verifies both updated servers choose that action.
- Independent review identified the unsafe flag-only older-host behavior, misleading ID-conflict guidance and a garbled separator. Native action separation, new-copy guidance and ASCII separator fix them. Review confirmed no further merge/stale-import defect; native old-host rejection passed.

Remaining: unified visual-browser integration of authored collections, richer provenance/filtering, large-payload boundary acceptance and the full R0-R9 roadmap. Native conflict and quota fault injection are not claimed by this scoped run; source tests cover merge failures. No game/server, novice or clean-machine acceptance claim. V77 remains the combined baseline. Local source and private EXE only; no commit, push or publication. Launcher selection unchanged.
