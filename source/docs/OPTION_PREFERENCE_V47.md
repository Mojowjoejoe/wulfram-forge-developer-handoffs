# Initial formation preference — private v47

Formation preview now initially selects a fitting candidate with available approach checks, preferring fewer blocked routes and then fewer tight routes. Ties retain seed/option order. Unchecked candidates remain available and keep their unavailable labels; they are not treated as clear. If every fitting option is unchecked, the first fitting option remains the fallback. This recommendation is applied only when generating a new preview. Clicking another option continues to select that option, including one with warnings.

The status explains the initial selection. Options are not reordered, geometry and seeds are unchanged, and Apply still uses the explicitly selected candidate. Favorites have a single candidate and retain their previous workflow. This improves the default choice rather than repairing tight approaches or certifying vehicle travel.

## Verification

- Private executable: `D:/WulframForgeBuilds/option-preference-v47/WulframForge.exe`, version `0.7.0-creative.47`.
- SHA256: `6958298765B43CAE57A17EB52DEA258F0EC76D9ABA618A9F018C600FD1D7AC36`.
- Typecheck and scoped lint pass. `outputs/option-preference-v47-source.log`: 303 tests, 302 pass, one existing skip.
- New source tests cover blocked-before-tight ranking, tight-count preference, stable ties, unchanged inputs, failed candidates, unavailable checks and empty results.
- Native receipt: `D:/WulframForgeTestRuns/outputs-desktop-test-uCg9oZ/report.json` PASS, exit 0.
- Actual Offset preview produced options with 2, 2 and 0 tight routes respectively, all with zero blocked routes. The initial selected index was 2 (option 3). The check then manually selected index 0 (option 1); unchanged Save retained it and Apply matched its clearance summary. This verifies both automatic preference and manual override.
- The same native run passes preview preservation, Apply/Undo/Redo, schema-2 corridor favorite export/removal/re-import, larger-map reuse, map ZIP round trip and restart, with unchanged original terrain.
- Build logs: `outputs/option-preference-v47-build.log` and `outputs/option-preference-v47-publish.log`. Existing large-bundle and WindowsBase warnings remain.

The native runner enables ranking and manual-override assertions with `WULFRAM_OPTION_PREFERENCE_TEST=1` alongside `WULFRAM_OPTION_CLEARANCE_TEST=1` and the family preview flag. Its ordinary clearance check now compares the selected option with the applied map, instead of assuming option 1.

Remaining work includes improving route geometry and close inspection readability, complete Offset family visual/seed review and catalog admission, and the broader roadmap acceptance gates. The native scope here is Offset small plus its portable reuse; it is not a fresh full-product or all-style acceptance run.
