# Generator reliability — RC25 private release

Superseded for delivery by the [RC27 critic-loop candidate](CRITIC_LOOP_RC27.md).
The RC25 evidence below is retained as the reliability baseline.

## Scope and baseline

Preserve settings and all genuine checks. Search previews, never auto-applies.
Existing baseline: RC22 private EXE workflow test documented in DESKTOP_WORKFLOW_TESTS.md.
Release: `../dist/desktop/WulframForge-0.7.0-rc.25-win-x64-self-contained.zip`.
Unsigned, .NET self-contained; Edge WebView2 is required. Nothing published remotely.

`npm run batch:reliability -- outputs/UNIQUE-NAME.json` runs a deterministic
stratified sample and refuses an existing destination. It records source/manifest
hashes, complete inputs, gate failures, base messages, elapsed time and outcomes.
It does not upload anything or modify source maps. Results are sampled evidence,
not exhaustive parameter coverage or match-balance proof.

Sample: 104 map candidates spanning all three layouts; four templates (combat,
Base in a Box, Kairo Team 2 Base 1, Survival Team 1 Base 1); grid sizes 17, 33, 65,
129, 257 and 513; square/rectangular worlds 3200–8000; relief 100–5000.
Boundary profiles have one seed/layout; other profiles have two seeds/all layouts.
36 mountain cases use passing standard combat candidates, heights 65/1000/2000,
radii 80/400, 12 pairs. This conditioned mountain sample is not a general pass rate.

| Measurement | Map pass | Mountain pass |
| --- | ---: | ---: |
| RC22 baseline | 33/104 | 36/36 |
| Power-aware fallback only | 34/104 | 36/36 |
| Paired model clearance + fallback | 54/104 | 36/36 |

21 previously failing map cases now pass; zero previously passing cases regress.
The existing 54-case template/rotation regression matrix now also passes all 54.
Its former assertion that Crossroads must fail was replaced by independent
placement/pairing validation plus an explicit 54-pass expectation; impossible
template rejection remains covered separately. Six new search/clearance tests
pass, as do the four workflow tests, typecheck and lint. Final full main suite:
110 passed, one existing skip. Combined with workflow and reliability suites:
120 passed, one skipped. The 104-case final batch reproduces the same 54 passes.
Receipts: `../outputs/reliability-rc22-baseline.json`,
`../outputs/reliability-power-fallback-v1.json`,
`../outputs/reliability-paired-clearance-v1.json`, `../outputs/reliability-final-rc25.json`.
Failure counts overlap. On rejected base placement, analysis describes the unchanged
starter layout, so its pairing/overlap failures are not necessarily the solver's
root cause; consult the recorded base message.

## Changes so far

- Preserve legacy placement search first; add three bounded power-aware fallback
  restarts. Powered structures can sample near accepted power cells. All overlap,
  slope, power, exit, diameter and pairing checks remain mandatory.
- Correct legacy origin-based ground offsets when generating paired team art.
  Flak models have bottom offsets 6.944847 and 8.986971; equal raw origin heights
  caused unequal bottom clearance even on flat terrain. Preserve source-model
  clearance when placing the other team. Manual/imported template code is unchanged.
- `findPassingMap` provides deterministic seed-only search, a 12-attempt default,
  hard limit 30, cancellation, stale-source rejection and failure reasons. Tests
  prove no result leaks after cancellation/staleness. It now runs in a bundled worker.

## Use Find a passing map

Open Balanced, choose settings and click **Find a passing map**. The default is
12 seeds, adjustable from 1–30. The first attempt uses your draft seed; following
seeds use a deterministic `find-v1` sequence. Compare-all tries up to three selected
layouts per seed (maximum 90 candidate evaluations at limit 30). The first fully
passing candidate becomes the preview. Only **Apply passing candidate** replaces
the map, with the existing confirmation. The draft seed remains unchanged; the
found seed is shown in search status and the selected candidate, and saved in the
applied map. Repeating the same search/settings/source is reproducible.

**Cancel search** terminates the worker immediately. Closing the dialog, changing
settings/source, or requesting a normal preview invalidates the worker/result.
No-result status includes expandable per-seed failures and suggested settings to
review. Searches do not adjust relief, widths, templates or validation tolerances.

## Supported limits and remaining constraints

Generator grid: odd 17–513. World dimensions: positive; sample covers 3200–8000,
not all positive dimensions. Generator relief: greater than 0 through 5000; current
Balanced UI offers 100–1200. Base separation .30–.65, route width .5–1.75,
central area .5–2.5. Terrain detail supports height 5–2000, radius 80–400 and
1–60 paired clusters. These are accepted input limits, not guaranteed-pass ranges.
Coarse grids, narrow routes and high relief can legitimately fail traversal,
connectivity or high-ground checks. Crowded templates may exhaust placement trials.
The search reports these outcomes; it never widens routes or relaxes checks silently.

## Release verification

Real RC25 EXE search receipt: `../outputs-desktop-test-dpjKV0/report.json`.
It verifies in-flight cancellation, settings-change staleness, one-seed exhaustion,
unchanged non-seed draft inputs, no auto-application, passing-preview invalidation,
and explicit application. The passing-preview screenshot was visually inspected.
The runner uses isolated profiles and copied EXEs, not the user's editor session.
To repeat: set `WULFRAM_SEARCH_TEST=1` for `npm run test:desktop`; unset it to run
the existing mountains/base/Undo/Redo/export/process-reopen workflow.

RC25 terrain-first workflow receipts:
`../outputs-desktop-test-qf4Vai/report.json` (Test2 balanced) and
`../outputs-desktop-test-EVEbRI/report.json` (Test2 Fixed). Both passed actual
preview/apply, terrain and entity Undo/Redo, ZIP export and process restart with
saved project equality. Reopened screenshots were visually inspected: terrain,
mountains and valid 22-unit state rendered, zero placement errors. All three
EXE receipts were checked against the final packaged executable's SHA-256.

RC25 archive CRC and packaged EXE byte parity passed. SHA-256:
`cd5cb645117dd159318499b1eb285b256021d45b176e7cd75a315cd31809e77a`.
Existing large-bundle and WindowsBase reference build warnings remain. Original
fixtures, prior release ZIPs and failed-run receipts are retained. Public push is
disabled. This release is offline editor validation, not a live-match balance claim.
