# Portable stamp settings — v23

## v23.1 library Undo and recovery

Undo stamp library change restores up to ten successful saves, imports or removals while the panel remains mounted. It is separate from map Undo and clears a pending import so stale preview counts are not reused. Undo history does not survive panel remount/restart. Storage failure leaves the visible library and history unchanged.

If stored data cannot be parsed, **Back up unreadable data and start empty** copies the exact raw value to a unique `forge-terrain-stamp-presets-v1-recovery-*` local-storage key and reads it back before replacing the active library with an empty array. The success message gives the backup key. This is a local recovery copy, not a downloaded file; clearing the editor profile deletes it. A failed or unverifiable backup leaves the active data untouched. After successful recovery, valid imports and new saves are enabled. Recovery does not attempt to interpret or repair corrupt entries.

Focused tests cover failed writes, unverifiable backups, exact backup preservation, successful reset and collision rejection. Native acceptance adds removal and separate library Undo to the existing import/reuse journey. Corrupt-data recovery is source-tested; it has not received a separate native corrupt-storage scenario.

Accepted v23.1: `dist/desktop/stamp-recovery-v23-1/WulframForge.exe`; verified SHA-256 `B314E50A664EC7FD70D7B7DF08979EED03F5931D9E87E38F8DAFAFF3D66F37DD`. All five stages passed in `outputs/product-baseline-PvqVsr/report.json`, including 253 source tests with one existing fixture skip and typecheck. Scoped lint passed after correcting unhandled test promises. Native receipts: `outputs-desktop-test-OHIxWt/report.json`, `outputs/creative-native-Rwae17/report.json`, `outputs-desktop-test-ZTYu96/report.json`. Visually reviewed `outputs-desktop-test-OHIxWt/stamp-library.png`, including the Undo control and success status.

R2 reusable manual-terrain settings continuation. Existing saved stamps now use strict validation and a versioned portable file.

In Terrain → 3D stamp brush, name and Save stamp preset. Open Portable stamp library to export `wulfram-stamps.json`, import a library, inspect added/skipped counts, and Apply or Cancel. Loading a saved stamp changes its shape, dimensions, seed, texture and mirror controls; it never stamps the map. Placement mode remains the user's current choice. Actual terrain, grid, asset and protection checks still run at preview and placement.

Imports accept version-1 `wulfram-stamp-library` files and the legacy local array. Only recognized settings survive parsing; coordinates are excluded. Identical entries with the same name are skipped. A different stamp with an existing name rejects the entire import. Rename using Preset name → Save, export a backup, then remove the old entry if appropriate. The library has a 30-entry limit. Saving a new 31st entry or importing beyond capacity rejects instead of evicting older settings. Saving the same name deliberately updates that preset, as before.

Import is nonmutating until Apply; Apply rechecks conflicts against the current collection. Storage errors leave the in-memory library unchanged. Unreadable local storage is retained and Save/import/export remain disabled to prevent accidental replacement. Library changes are separate from map Undo. Export backups before removal; library undo and an in-app corrupt-data recovery workflow remain open.

Files are limited to 200 KB; unknown schema/shape versions, invalid dimensions, wrong types and out-of-range settings reject. Texture availability is map/editor dependent and remains checked at placement. Unknown future fields are not preserved in this settings-only schema.

Source tests cover legacy/versioned parsing, retained settings, excluded coordinates, invalid values, duplicate merge, conflicting names, capacity and source preservation. Native acceptance includes actual file import, preview/cancel/apply, reuse and unchanged terrain/buildings. The download action itself has not received a native file-content receipt; portable schema roundtrip is source-tested.

Accepted build: `dist/desktop/stamp-library-v23-final/WulframForge.exe`, version `0.7.0-creative.23`; verified SHA-256 `C3CA0E3E90838986174917C70AB29C435F621A3205931C2C510993E0D5370E34`. All five acceptance stages passed in `outputs/product-baseline-9KdHvq/report.json`: 252 passing source tests, one existing fixture skip, typecheck, combined terrain/library, creative bases and randomized maps. Native receipts: `outputs-desktop-test-IIxe8g/report.json`, `outputs/creative-native-SJVSQq/report.json`, `outputs-desktop-test-xaeP9X/report.json`.

Single-agent screenshot review found crowded default controls in the initial candidate. The final build uses existing button/select/help styling and separate label spacing; `outputs-desktop-test-IIxe8g/stamp-library.png` was visually reviewed after correction. The visible protected-mode warning is expected for this fixture and confirms that loading settings does not bypass placement prerequisites. Earlier candidate artifacts remain for comparison; use the `-final` build above. Library recovery/undo and whole-roadmap acceptance remain open.
