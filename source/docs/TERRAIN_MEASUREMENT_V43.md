# Terrain measurements — private v43

Open Terrain → Terrain measurements, or find “Measure terrain size and slope.” Choose Measure terrain region to inspect the whole map, or create a Brush selection to inspect that rectangle. Measurements show horizontal extent, grid spacing, lowest/highest height, height difference and steepest terrain-face angle in degrees. All distances use world units. No terrain, buildings, history or saved map data changes.

The shared calculation clips each intersecting terrain triangle to the requested rectangle. It follows the alternating diagonals used by `sampleHeight`, computes extrema from the clipped planar polygon, and computes slope from the triangle gradient. It handles selections smaller than one grid cell and excludes triangles that only touch the region boundary. Missing/non-finite measured heights and invalid dimensions produce explicit errors. Measurements are computed on demand; a changed terrain object or selection hides the old values and asks for remeasurement.

These are editor-surface measurements. They do not certify building fit, power, route clearance, vehicle movement or game collision. Direct point-to-point rulers, slope overlays and large-map performance targets remain separate R8 work.

## Verification

- Build: `dist/desktop/terrain-measurement-v43/WulframForge.exe`, version `0.7.0-creative.43`.
- SHA256: `EF33D484A84989B3421A01B2A90828361A295D4BCD74A72D33A793F44631A92B`.
- Typecheck and scoped oxlint pass.
- Full source: `outputs/terrain-measurement-v43-source.log`, 294 tests, 293 pass and one existing skip.
- `tests/terrain-measurement.test.mjs`: analytic rectangular-grid plane, off-grid clipping, both diagonal conventions against editor height samples, sub-cell regions, boundary-only exclusion, malformed data and source preservation.
- Native `outputs-desktop-test-EjbeM8/report.json` PASS: actual flat-region measurement, stale reading after a real brush edit, positive remeasured slope, stale selection changes, unchanged saved map after measurements, and all selection brush regressions. No renderer exceptions; fixture unchanged.
- `outputs-desktop-test-EjbeM8/terrain-measurement-after-brush.png` visually reviewed: readable labels and values, blue region visible, panel fits its scrolled inspector. The measured native region was 6,000 × 4,000 u with 93.75 × 62.5 u spacing, 4.39 u relief and 2.35° steepest face in that stroke.

Repeat with `WULFRAM_TERRAIN_SELECTION_TEST=1` and `WULFRAM_TERRAIN_MEASUREMENT_TEST=1`, running `tools/test-desktop-workflow.mjs` against the v43 EXE and `outputs/composition-native-fixture.json`.

This is focused v43 acceptance; v42.1 remains the last complete aggregate baseline. Existing bundle-size and WindowsBase build warnings remain. Full roadmap, clean-machine, novice and game gates remain open.
