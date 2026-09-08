# Reusable terrain compositions: shared proposal engine

R2/R5 foundation in `lib/terrain-composition.ts`. A version-1 composition contains a name and 1–20 ordered landforms. Each has a unique ID, a local X/Y offset and the same validated settings as a saved terrain stamp. The placement supplies a world anchor, rotation and explicit protected/manual mode.

The engine rotates offsets and adds the composition rotation to each landform's rotation without changing dimensions, seeds, relief or texture settings. Each step uses the existing `applyProjectStamp` implementation on the previous proposal. It preserves order: overlapping stamps and texture choices can produce different results if reordered. Per-stamp mirror settings still mirror around the map center, as in the existing tool; they do not mirror around the composition anchor.

`previewTerrainComposition` returns the complete proposed project, final height deltas, changed-vertex count and per-step counts. The caller should display this exact proposal and commit it as one history operation only while its source and draft are current. This module itself does not mutate editor state, write a library, or create Undo entries. A failed step throws an error naming that landform and leaves the caller's source unchanged.

All stamp safety behavior is reused: authored terrain and district protections remain enforced in manual mode, protected mode still requires its existing metadata, and structure reserves still apply. No new flattening or bypass was introduced. The result marks terrain analysis stale through the existing stamp path and records the entire composition and placement in `terrainComposition.last` rather than relying on the last individual stamp receipt.

## Verification

`tests/terrain-composition.test.mjs` covers ordered terrain/texture parity with existing stamp operations, rotated offsets, deterministic terrain replay, unchanged source/entities/layouts, full recipe receipt, rejection of a later protected-area intersection, malformed versions/IDs/options/offsets, non-finite placement and protected-mode prerequisites. Typecheck and scoped lint pass. Full-suite receipt: `outputs/terrain-composition-source.log`.

## Required next integration

Add an editor panel to capture current stamp settings into an ordered composition, edit local offsets, reorder/remove steps, set anchor/rotation and inspect the combined terrain/texture preview. Apply must use the reviewed proposal, invalidate on source/draft changes and create exactly one map Undo. Add import/export with error/capacity handling and native Preview/Cancel/Apply/Undo/reopen verification. The existing single-stamp tool and private v36 build remain unchanged; this source-only foundation does not close the reusable-composition roadmap gate.
