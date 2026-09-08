# RC20 terrain-first completion audit

Historical RC20 audit. The user subsequently requested autonomous acceptance:
see [automated EXE testing and RC22 fixes](DESKTOP_WORKFLOW_TESTS.md).
The manual-only blocker below is superseded by the real WebView2 UI test runner.

Automated evidence: main suite 110 passed/one skip; workflow suite four passed;
both supplied diagnostics replays passed. Typecheck/lint/diff checks passed.
RC20 build succeeded with existing bundle-size and WindowsBase warnings.
ZIP CRC and packaged EXE parity passed; Authenticode NotSigned.
Package SHA-256: `2df1f9177173c4454e3f587712ce2b184e42acdc5201458c61f1fa8f69e05119`.

## Implemented gate

Terrain detail defers only `state-uplink` and `state-powered-repair` errors when
the project explicitly has `generator.stage=terrain-only-bases-required`, has no
team 1/2 working entities, and its selected layout matches those working entities.
Terrain checks, neutral pairing, other placement errors and nonempty generation
remain mandatory. Unmarked empty or inconsistent layouts still fail. The full
analysis verdict is not rewritten: it remains failed until bases are completed.
The stage marker survives terrain detail and serialization. Passing base placement
clears it. The dialog and apply notice explicitly distinguish terrain-detail PASS
from incomplete full-map approval and direct the user to Random base.

## Evidence

`npm run test:workflow` verifies explicit-state gating and refusal of unmarked or
inconsistent empty layouts, alongside data history/save/reopen and diagnostics.
`tools/verify-terrain-first-diagnostics.mjs` consumes both supplied diagnostic ZIPs
read-only and checks terrain detail, paired combat base placement, terrain
preservation during base placement, history snapshots, JSON save/reopen, native
map ZIP roundtrip, and fresh full validation of the reopened complete map.
It refuses to overwrite previous outputs. Receipts and completed maps are in
`../balanced-map-evidence/terrain-first-rc20/` with input and output hashes.

These tests do not execute native clicks or validate rendering, nor prove live
match balance. No public publication, signing, external service or remote-control
endpoint was added. Earlier release ZIPs and input diagnostics are retained.

## Native acceptance still needed

1. Extract RC20 into its own folder and launch that EXE.
2. Open the original **Test2 balanced** terrain-only map (not the completed output).
   The exact diagnostics-embedded map is also available as
   `../balanced-map-evidence/terrain-first-rc20/native-test-start.zip` for Import.
3. Preview terrain detail with seed `rocks-001`, 12 pairs, radius 180, heights
   50–1000. Expect TERRAIN DETAIL PASS — BASES STILL REQUIRED, then Apply.
4. Use Random base with Forge deployed combat base, seed
   `terrain-first-completion`, diameter 2000, spacing 1, rotation 0. Preview/apply.
5. Confirm 22 structures, no placement errors, inspect both bases and routes.
6. Undo/redo; save local; close/reopen and confirm map, mountains and bases remain.
7. Export diagnostics from a failed dialog if any step fails; otherwise explicitly
   confirm native steps succeeded. Only then may the goal be marked complete.
