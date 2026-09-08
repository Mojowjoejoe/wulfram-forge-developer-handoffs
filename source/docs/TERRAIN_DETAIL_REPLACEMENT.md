# Editable terrain detail — private RC29

Open **Terrain detail** on an already detailed map. Saved seed, texture, cluster
pair count, radius and minimum/maximum heights load automatically. Change settings,
choose **Preview rocks**, then **Apply terrain detail** when the checks pass.
The preview does not change the working map. Undo/Redo restores the prior/new pass.
Orange marks raised ground relative to the current map; light blue marks lowered
ground. Peak-height numbers are measured above the original pre-detail ground.

## Safety contract

- New passes retain original and resulting terrain in `terrainDetail.baseline`
  project metadata. Replacements reuse the original baseline, never accumulate passes.
  The baseline persists through local save and project-containing ZIP export/import.
- Exact current-terrain matching plus deterministic replay verifies a stored baseline.
  All ordinary terrain, paired-entity and placement gates still run before Apply.
- Older maps without a baseline use saved balanced-generator settings to reconstruct
  the original ground. Replacement is allowed only if replaying the prior rock pass
  reproduces the current terrain exactly. Unknown/manual edits are not guessed away.
- Structures in every layout are protected using current model footprints. If later
  structure changes prevent exact replay, replacement refuses rather than relocating
  buildings or erasing authored terrain. No structure positions are changed.
- Corrupt/unsupported metadata and changed terrain fail closed. The UI explains why
  safe replacement is unavailable. Regeneration or appropriate Undo remains an option.
- Baseline snapshots increase project size. This release verifies 129 and 257 grids;
  it does not establish browser-storage capacity for every maximum-size project.

## Verification

126 automated tests pass: main 110, workflow 4, reliability 6, critic 6; one existing
main-suite skip. Lint, typecheck and diff whitespace checks pass.
New regression tests compare replacement with a fresh pass on original ground,
test source/layout preservation, repeated replacement after serialization, legacy
reconstruction, changed terrain and corrupt baseline rejection.
The user's `test2-fixed-diagnostics (1).zip` passes the legacy recovery test and is
read-only; the test skips explicitly if that local fixture is absent.

The EXE runner now reopens saved settings, lowers mountains, compares exact expected
terrain, checks Undo/Redo, adds bases, exports, restarts and previews replacement again.
RC28 receipts: `../outputs-desktop-test-xIP7H1/report.json` and
`../outputs-desktop-test-f5IWgl/report.json`. Its lowered-ground preview was visually
inspected. RC29 changes only the peak-height explanation to say original ground.
Final RC29 receipts both pass: `../outputs-desktop-test-ca3OCg/report.json`
(terrain-first 257 grid) and `../outputs-desktop-test-I3Nwsi/report.json`
(Test2 Fixed 129 grid). ZIP CRC and packaged/tested EXE hash parity are verified.

## Delivery

`../dist/desktop/WulframForge-0.7.0-rc.29-win-x64-self-contained.zip`

SHA-256: `064aa010acdd884ef89b5ff2f001cefe2bafe4267d8783f6c0538249bb56fcc3`

Private, unsigned Windows candidate; requires Edge WebView2. Existing large-bundle
and WindowsBase build warnings remain. No public publishing or changes to supplied
ZIPs. Offline validation does not prove live multiplayer balance.
