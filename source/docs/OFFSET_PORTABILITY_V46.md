# Offset Bastion native preview and portability — private v46

Offset Bastion is available under Experimental layouts in the active-layout selector. It remains a review candidate; the 15 reviewed creative styles are unchanged. The preview explains that its bent reserved approach and automatic service routes are separate. Choose size/count/position, Preview formation, compare the options and Apply. Save the result as a favorite to reuse it on another map.

Portable reservation schema 2 identifies the Offset Bastion family and preserves both authored approach corridors. Schema 1 remains unchanged for Frontier. The outer personal-base library remains version 3. Capture stores actual local corridor points, names and widths for each side; reuse transforms them through the new map anchors and rotation, enforces radius/map/building clearance and matching terrain support, and retains a family reservation policy when saved again. Mixed corridor IDs and mismatched versions reject. Older editors that only understand reservation schema 1 cannot import Offset Bastion favorites; use v46 or later.

## Verification

- EXE: `dist/desktop/offset-portability-v46/WulframForge.exe`, version `0.7.0-creative.46`.
- SHA256: `8A1DECB4D1B5529D13A7A49FE79A9E29AE6AD13B32693779D1ECBF7C20541A42`.
- Typecheck and scoped lint pass. Full source suite: `outputs/offset-portability-v46-source.log`, 301 tests, 300 pass and one existing skip.
- Added source coverage for edited Offset corridor width/name preservation, library export/import, relocation and 90-degree reuse on a larger map, saving again, mixed-ID/version rejection and unchanged source/target maps. Existing Frontier portability tests pass.
- Offset native receipt: `outputs-desktop-test-QnNOAN/report.json` PASS. Real experimental picker generation, three previews with clearance counts, unchanged Save preserving preview, Apply/Undo/Redo, favorite export/removal/re-import, larger-map reuse, full map ZIP export/re-import and restart all pass. The favorite contains schema-2 Offset corridors and the placed result retains 24 paired buildings and both corridors.
- Frontier compatibility receipt: `D:/WulframForgeTestRuns/outputs-desktop-test-n0ahuS/report.json` PASS on the same EXE. Its complete original schema-1 portable workflow still passes.
- `outputs-desktop-test-QnNOAN/offset-bastion-native-preview.png` visually reviewed: paired outlines and all three option summaries are visible. The wide camera still makes small buildings hard to distinguish, and some generated service approaches retain tight warnings.

## Storage incident and repeatability

A first Frontier retry stopped before launch when C: filled during the temporary EXE copy (`outputs-desktop-test-GmeKmB`). Only the successful Offset run's duplicate temporary EXE was removed, after verifying its hash against the retained release build and verifying no process was using it; `outputs-desktop-test-QnNOAN/application-copy-cleanup.json` records this. All maps, screenshots, receipts and release builds were preserved.

The desktop runner now accepts `WULFRAM_NATIVE_OUTPUT_ROOT`; both aggregate runners preserve this setting while clearing unrelated test flags. The successful retry used `D:/WulframForgeTestRuns`, with `DOTNET_BUNDLE_EXTRACT_BASE_DIR` also set under that folder. C: still has little free space. Use these locations for subsequent native test data and avoid new large build outputs on C: until storage is addressed.

This closes the initial native generation and favorite-portability gaps for the tested small candidate. Complete size/terrain native generation, full visual/seed comparison, automatic-route treatment, catalog card/help review and game gates remain open. This is not admission into the reviewed-family count or a replacement for the full v42.1 aggregate baseline. Existing bundle-size and WindowsBase build warnings remain.
