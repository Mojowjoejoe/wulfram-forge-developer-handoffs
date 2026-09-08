# Autonomous RC29 verification — 2026-09-06

Goal completed: rerun the established regression suites, reliability batch and
packaged EXE scenarios without requiring user interaction, inspect screenshots,
and verify delivery parity. No new blocking defect surfaced in this tested scope;
no production changes or replacement build were necessary.

## Fresh results

- Main: 110 passed, one existing skip.
- Workflow: 4 passed. Reliability: 6 passed. Critic: 6 passed.
- Total: 126 passed, one skipped. Typecheck and lint passed.
- Batch: 54/104 map candidates passed, 36/36 conditioned mountain cases passed.
  Receipt: `../outputs/reliability-autonomous-rc29.json`.
  Remaining map candidates were rejected by terrain or base-placement gates, not
  silently accepted. This matches the previous batch aggregate; configurations are
  deliberately varied and not all are guaranteed to admit a valid result.
- Terrain-first EXE: `../outputs-desktop-test-3MFQdD/report.json`.
- Test2 Fixed EXE: `../outputs-desktop-test-JQDTKY/report.json`.
- Search/critic EXE: `../outputs-desktop-test-0hDy1O/report.json`.

Full EXE workflows exercise file import, mountain preview/apply, reopening settings,
replacement without stacking, exact expected terrain, Undo/Redo, paired bases,
map export, process restart and another detail preview. Search checks cancellation,
stale input, one-seed exhaustion, a 200-character seed, preserved custom rules and
layout name, preview invalidation and explicit Apply. No unhandled renderer errors.

Visual review inspected `01b-replacement-preview.png` in the terrain-first receipt,
`04-reopened-map.png` in Test2 Fixed, and `search-found.png` in search. Lowered-ground
markers, original-ground height explanation, rendered reopened terrain and wrapped
seed text are visible. Apply controls remain inside the search dialog.

All tests use isolated profiles and copied EXEs. Original fixtures are hash-checked
unchanged; no clicks or modifications were made to the user's existing editor session.

## Package verification

Archive: `../dist/desktop/WulframForge-0.7.0-rc.29-win-x64-self-contained.zip`

ZIP SHA-256: `064aa010acdd884ef89b5ff2f001cefe2bafe4267d8783f6c0538249bb56fcc3`

EXE SHA-256: `a4c28b6401755a905c84f650d2d6ff0b4d02dcb5becec89add6ad1221b978cb9`

ZIP CRC passes; extracted EXE matches the local executable and all three fresh
test receipts. Public push remains disabled; nothing was committed or published.

## Boundaries

This is automated/local review, not an independent multi-agent audit or exhaustive
proof of all possible settings. Mountain cases are conditioned on passing base maps.
Unsigned status, existing build warnings, maximum-size browser storage limits and
live multiplayer balance remain separate constraints. No safety gates were weakened.
