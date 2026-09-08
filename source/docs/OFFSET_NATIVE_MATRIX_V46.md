# Offset Bastion native size and terrain review — v46

The private v46 editor generated and applied Offset Bastion through its actual experimental picker on all four sizes and three terrain fixtures. This extends the earlier small-candidate portability acceptance; it does not promote the family into the reviewed catalog.

## Evidence

- Native receipt: `D:/WulframForgeTestRuns/outputs-desktop-test-st0Nff/report.json` PASS, process exit 0.
- Build: `dist/desktop/offset-portability-v46/WulframForge.exe`, version `0.7.0-creative.46`, SHA256 `8A1DECB4D1B5529D13A7A49FE79A9E29AE6AD13B32693779D1ECBF7C20541A42`.
- Fixtures: `outputs/offset-bastion-review-v1/{flat,valley,irregular}-{small,standard,large,massive}.json`.
- Twelve cases: small 12, standard 18, large 26 and massive 34 structures per team on each terrain. Rotation 35 degrees and building radius 2400 units. The UI retained its default placement center; these are native regenerated candidates, not exact reproductions of the source fixtures.
- Every case verifies preview leaves the map unchanged, Apply uses the Offset recipe version and exact requested count, two reservations persist, terrain remains unchanged and Undo/Redo restores exact before/after projects. Twelve saved resulting maps and 24 preview-overhead/applied-ground screenshots are retained beside the receipt. Seeds are recorded in `matrix-progress.json`.
- Syntax checks and scoped lint pass for both changed review tools. No product-source changes or new executable were required for this review.

## Separate route critic

`tools/review-native-base-routes.mjs` reads a completed native matrix and checks the saved resulting maps without changing them. `route-review.json` records map hashes, individual reservation markers and automatic route summaries.

At the assumed 80-unit vehicle width: zero reservation-rule issue cases; zero blocked or tight reserved-path cases; zero blocked automatic-route cases; all twelve cases have at least one tight automatic service route. No route summaries were unavailable. These are conservative building-circle checks and sampled terrain slopes, not game collision evidence. The bent corridor reservation does not force automatic routes or players to follow it.

Three captures were visually reviewed: `matrix-flat-small-preview.png`, `matrix-valley-large-ground.png`, and `matrix-irregular-massive-preview.png`. The small/large district count difference and bent reservation are visible. Power icons dominate the small building models, especially in the ground view. In the small preview, an alternative option has zero tight approaches while the selected first option has two: option selection quality can improve without hiding warnings or weakening clearance rules. The massive preview clearly shows a gun/Darklight clearance warning on the selected service approach.

Next work: improve candidate ordering and route quality, provide useful close inspection views, complete the remaining visual and same-size seed review, then review catalog card/help and admission requirements. This run does not provide all-size favorite portability, game trials or novice-user acceptance.

## Repeat

Set `WULFRAM_NATIVE_OUTPUT_ROOT=D:/WulframForgeTestRuns`, `DOTNET_BUNDLE_EXTRACT_BASE_DIR=D:/WulframForgeTestRuns/dotnet-bundles`, and `WULFRAM_OFFSET_MATRIX_TEST=1`; run the desktop workflow with the v46 EXE and the flat-small fixture. The existing `WULFRAM_FRONTIER_MATRIX_TEST=1` branch retains its original family and counts. After a successful run:

```powershell
node --experimental-strip-types tools/review-native-base-routes.mjs D:/WulframForgeTestRuns/outputs-desktop-test-st0Nff
```

C: remains capacity-constrained; new large test outputs belong on D:.

## Complete retained-capture review - 2026-09-07

All 24 retained screenshots (12 overhead previews and 12 applied ground views) were opened and reviewed. Exact image paths and SHA256 hashes are recorded in `outputs/offset-v46-visual-review-complete.json`. These remain historical v46 captures; reviewing them does not rerun generation on v71.1 or prove current default selection behavior.

| Cases reviewed | Spatial observation | Unresolved visual/access issue |
| --- | --- | --- |
| Flat small / standard / large / massive | Two, three, four and five separated occupied sites remain legible in overhead view; the same bent reservation remains the organizing constraint | Broad framing hides building identities; flat massive shows an uplink pinch marker. Ground framing for standard and larger spends much of the view on empty approach and sky |
| Valley small / standard / large / massive | Low central terrain and raised sides are visible from ground; overhead site hierarchy matches the corresponding size | Valley standard shows a gun-turret pinch. Valley large has a yard partly outside the ground-view crop. Screenshots cannot establish footprint support or driving traction |
| Irregular small / standard / large / massive | Rolling ground is visible, with the same two-to-five-site progression and open bent reservation | Small has refuel/uplink pinch markers; standard has gun/uplink markers; massive has gun/Darklight markers. Repeated icons obscure structures at broad scale |

Across all sizes, the automatic cyan service route visibly differs from the magenta bent reservation. The reserved route is visible evidence of authored space, not evidence that automatic routing uses it. In the v46 options, valley standard has a zero-tight alternative while the first option is selected; v47's independent selection-preference change already addresses default ordering, but does not repair route geometry.

This completes review of the retained capture set, not the full family visual gate. Still needed: same-size multi-seed comparisons, closer views with overlays reduced, explicit automatic-versus-authored approach treatment, all-size favorite portability and final family admission. The recipe remains experimental and is not counted toward the reviewed 48-family target.
