# Persistent terrain composition library: private v38

Build: `dist/desktop/composition-library-v38/WulframForge.exe`, version `0.7.0-creative.38`.
SHA-256: `F7BE9D280A54A3389F415E825C704ACC631B4DD64E228B2326240C8C839C4B83`.

Compose several landforms now includes Saved compositions. Save new composition stores the current recipe in this editor profile. Search matches names and constituent landform types. Select and Load fills the composer without applying terrain. Update selected explicitly replaces the selected recipe and can rename it through Composition name. Duplicate names reject accidental replacement. Remove selected and a separate one-level library Undo do not enter map history.

The validated library allows twenty compositions within a 2 MB serialized limit, reusing each recipe's existing version/settings validation. Storage errors do not update the in-memory library. A corrupt stored library is retained and disables writes; no automatic reset or deletion occurs. Recipes are independent of map anchors and safety mode. Existing single-recipe JSON import/export remains available for portability.

## Evidence

- `tests/composition-library.test.mjs`: explicit update, rename, name collision, missing replacement, geometry/source preservation, malformed data and capacity rejection.
- Typecheck and scoped lint pass. Full source: 285 tests, 284 passed, one existing skip; `outputs/composition-library-v38-source.log`.
- `outputs-desktop-test-UTF13r/report.json` passes on the packaged EXE with keyboard activation. It repeats combined preview/cancel/draft invalidation/one-step map Undo/Redo/recipe file import-export, then verifies local save, remove/library Undo, type search, load with map preservation, restart and loading both landforms from retained storage.
- `composition-library-reopened.png` was inspected: selected recipe and controls remain readable and the two saved landforms load correctly. The single-stamp protected-mode warning and ghost still appear while browsing the composition controls. That warning describes the underlying active brush, but the competing interaction modes need clearer separation in a follow-up. It is not evidence that loading altered the terrain.

## Remaining work

Add explicit composition-versus-single-stamp interaction mode and tool-finder navigation; verified corrupt-data backup/reset; native explicit update/rename and storage-failure checks; library-wide portable merging if needed; and visual thumbnails/direct handles. The composition and broader R2/R5 roadmap gates are not closed by persistence alone. No game/server or public-release claim is made.
