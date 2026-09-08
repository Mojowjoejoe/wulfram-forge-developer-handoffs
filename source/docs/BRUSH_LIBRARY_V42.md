# Saved manual brushes — private v42.1

Open Terrain → Saved manual brushes, or use the tool finder entry “Save and reuse manual brushes.” Give the current setup a name and choose Save new brush. Search by name, tool or shape, then Load selected brush to restore it. Update selected brush explicitly replaces or renames that entry. Remove has a separate one-step library Undo.

The saved controls are tool, radius, strength, footprint shape, edge profile, exact height and texture. Loading changes controls without editing terrain, map history or the current terrain selection. Flatten continues to sample the first clicked height. A missing catalog texture rejects loading before changing any controls. The catalog label uses the same tool names as the toolbar.

Presets are profile-local and reusable across maps. Export brush library writes a version 1 `wulfram-brush-library` JSON file. Import merges up to 30 validated entries, skips identical entries and rejects conflicting names without replacing the existing library. Out-of-range settings and unsupported formats are rejected. Async imports are invalidated by intervening library writes or panel unmount. Malformed local data is retained, writes are disabled, and Export provides the original data for recovery; an in-editor repair/reset flow remains future work.

## Verification

- EXE: `dist/desktop/brush-library-v42.1/WulframForge.exe`
- Version: `0.7.0-creative.42.1`
- SHA256: `2B4BE5FE055FD2342145532FD551C08145ED8132D4227A3C90B6803521021509`
- Typecheck and scoped oxlint pass.
- Full suite: `outputs/brush-library-v42-source.log`: 290 tests, 289 pass, one existing skip. Final label refinement also typechecked and passed scoped lint.
- Native final receipt: `outputs-desktop-test-KdLqEl/report.json` PASS. Saved settings, duplicate-name rejection, changed-control restoration, actual JSON download/re-import, removal/library Undo, restart/search/load and full map preservation passed. No renderer exceptions and original fixture unchanged.
- Screenshot: `outputs-desktop-test-KdLqEl/brush-library-loaded.png`, visually reviewed. Labels and buttons fit the inspector; the long library can be collapsed to expose brush controls.
- Native selection regression on v42: `outputs-desktop-test-v1m0mh/report.json` PASS; final v42.1 only changes the library tool label/search text.

The first native attempt (`outputs-desktop-test-mL9zDF`) failed on stale numeric input draft text: the harness assigned a field without focusing it. The field helper now focuses the input before entering a value, matching normal interaction. The rerun (`outputs-desktop-test-DiDDET`) passed. Visual review then replaced the internal “stamp” label with “Set height”; the final build passed again.

Remaining scope: native presets for every tool and missing-texture/corrupt-storage recovery scenarios, clean-profile recovery UX, visual brush examples, direct terrain selection handles and the broader manual/random/hybrid release matrix. This is partial R2/R3 progress, not whole-roadmap completion or game acceptance. Existing bundle-size and WindowsBase build warnings remain.
