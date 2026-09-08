# Formation option clearance: private v36

Build: `dist/desktop/option-clearance-v36/WulframForge.exe`, version `0.7.0-creative.36`.
SHA-256: `D77BF088BAECF7D769926D78CF33B316F8F2A0C8A443FF3A5CB7911FCC71DC0B`.

Each successful creative or favorite preview option now summarizes its generated approaches at a fixed, explicitly labeled 80-unit vehicle width. Counts represent routes with blocked or tight findings, not individual markers. A route with both kinds counts as blocked. The analysis uses the existing route-clearance implementation against the candidate's entities and validation settings and runs once when options are created. It does not reorder candidates or change their geometry.

If access checking was disabled or route data is unavailable, the option says so instead of presenting zero findings as an all-clear result. Reserved expansion strips are not treated as service approaches. The detailed inspector remains available; its independently adjustable vehicle width can produce different results. These sampled checks do not certify game collision, navigation or balance.

## Evidence

- `tests/formation-route-summary.test.mjs` checks known clear, tight and blocked paths, exact affected-route counts, source preservation, missing checks and malformed route data.
- Typecheck and scoped lint pass. Full source: 280 tests, 279 passed, one existing skip; `outputs/option-clearance-v36-source.log`.
- `outputs-desktop-test-LZtuUk/report.json` passes on the packaged EXE. All three option rows have an explicit width and counts. The selected option's displayed summary matches analysis of its applied layout. The workflow also verifies unchanged Save retaining the preview, Apply/Undo/Redo, favorite export/removal/re-import, larger-map reuse, map ZIP round trip and restart. No renderer exceptions.
- `outputs-desktop-test-hwVzua/report.json` retains an initial test-only failure from a shadowed local root variable; manifest lookup now resolves relative to the test module. The EXE did not require rebuilding for that correction.

This addresses the candidate-comparison finding from the Frontier native matrix. Family card assets, visual seed comparison and the broader roadmap remain open.
