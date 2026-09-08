# Detail generation around protected terrain — v22

## v22.1 recipe receipts

New passes store `rocks-v2` settings with a canonical `heightProtection` geometry identity. Reordering, renaming, or duplicating equivalent area records does not change that identity. Moving or resizing protection, adding a distinct area, or removing one blocks replacement with a specific restore/Undo explanation. A missing v2 identity also blocks replacement. Dimensions, structures, route settings and actual terrain remain subject to the existing exact replay checks.

Legacy `rocks-v1` settings remain readable and require exact terrain reproduction before replacement. No-area legacy replay is tested against the new implementation. This preserves old arrangements rather than silently regenerating them when loaded. New saves use v2; older editors that only support v1 must not reroll them.

Twelve focused detail/replacement tests pass, including v2 receipts, harmless rename, geometry-change rejection, missing-receipt rejection and legacy no-area replay. Typecheck and scoped lint pass.

Accepted private v22.1 build: `dist/desktop/detail-receipts-v22-1/WulframForge.exe`; SHA-256 `70ACA5559AFFA1D1A7E5AE93B9F634153527CF1713A524DAA58F22F372A92FD1`. All five stages passed in `outputs/product-baseline-miZtSw/report.json`, with 250 passing source tests and one existing fixture skip. Native receipts: `outputs-desktop-test-ieab2i/report.json`, `outputs/creative-native-ryEbvG/report.json`, `outputs-desktop-test-chVgdN/report.json`. These are integration regressions; the focused source tests establish the new receipt behaviors.

R2/R5 continuation after protected terrain v21.1. Terrain detail now includes authored height-protection rectangles in its eligible-area calculation, rather than waiting for Apply to reject a conflicting candidate.

## Use it

On a map with supported saved route settings and rotationally paired terrain, create a Protect terrain heights rectangle in Base builder → Build areas and reserved space. Then open Terrain detail, choose hills, valleys or mixed, and Preview. The protected preview includes the rectangle's surrounding height-grid vertices and their rotational partners. Whole detail footprints that intersect protected vertices are skipped; formations are not cut off at the boundary. Buildings and existing route reserves remain protected as before.

Apply a passing candidate, then choose a different detail seed and Preview again to replace that detail pass from its verified baseline. Existing protected heights remain fixed. No terrain or buildings change during preview. Insufficient eligible room may produce fewer pairs or no passing candidate; inspect the reported placed count. The requested pair count remains a search target, not an exact composition budget.

The mask covers height areas from all layouts because terrain is shared. Paired generation reserves both sides even when a rule exists on only one side. Terrain-detail texture painting also avoids cells touching these protected vertices. Standalone manual painting remains available under height rules.

## Preservation and limits

Old recipes without height rules retain the same mask and seed behavior. Height rules are saved alongside the map. Adding or changing protection after an existing detail pass can make its old result impossible to replay; replacement then refuses rather than discarding it. Hand edits after a detail pass continue to block replacement under the existing baseline check.

This is eligible-area detail generation on supported symmetric maps. It does not implement general terrain rerolls, arbitrary asymmetric-map recipes, partial district rerolls, comparison of candidates, or pinned detail formations. Manual building-space corridors do not become terrain masks merely by existing. Game compatibility and driving evidence remain separate.

## Verification

Twelve focused detail/replacement tests passed, plus typecheck and scoped lint. The new regression reserves a location that an unrestricted seed used, verifies protected and mirrored samples, confirms remaining terrain changes, rerolls from the verified baseline, checks authoring constraints and source/building preservation, and compares the mask with an inactive-layout rule. Existing tests cover seed replay, symmetry, export roundtrip and rejection behavior.

The shared safe-stamp mask also uses the authored terrain reserves. Manual stamps continue to enforce their own exact proposed-height checks introduced in v21.1. Single-agent review checked these shared consumers and the replacement path.

Accepted private build: `dist/desktop/authored-detail-v22/WulframForge.exe`, version `0.7.0-creative.22`. Verified SHA-256: `5437496D069C4583DCAC36B1E3196A05BE5740414608E113D7F39073706D98B5`.

All five stages passed in `outputs/product-baseline-v05Gdb/report.json`: 250 source tests passed, one existing fixture skip, typecheck, combined terrain, creative bases and randomized maps. Native receipts: `outputs-desktop-test-myAcZe/report.json`, `outputs/creative-native-e4P7UM/report.json`, `outputs-desktop-test-YlvX0S/report.json`. The source regression proves protected-detail replay; native suites cover the existing integrated workflows and terrain-area controls, without claiming a new end-to-end protected-detail scenario. The full roadmap remains open.
