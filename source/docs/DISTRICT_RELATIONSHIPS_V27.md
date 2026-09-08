# District distance relationships — v27

In Base builder, open **District relationships** after saving at least two named districts. Choose the two districts, name their relationship and enter minimum and maximum center distance in world units. The current distance is shown before Apply. Add or Update validates against the current map, so an impossible rule does not become a hidden broken constraint. Edit or Remove changes a saved rule; each successful change has one map Undo step.

A center is the arithmetic mean of member building X/Y positions. Distance is horizontal Euclidean distance between those centers. It does not measure footprints, routes, power, concealment or turret effectiveness. Shared memberships are allowed for measuring relationships; the existing arrangement eligibility checks still reject ambiguous moving membership. Relationships are layout-local and are not implicitly mirrored to another team.

The versioned `forge.district-relationships.v1` layout metadata stores stable rule identity, name, two district IDs and inclusive minimum/maximum distances. Maximum supported value is 100,000 u; at most 100 rules and one rule per unordered district pair. Malformed records reject; existing metadata is retained. Missing districts/buildings reject dependent edits with a recovery message. Rules cannot silently disappear when a layout is replaced. Remove the rule explicitly before deleting a referenced district or building.

The common editor constraint guard checks all layouts, including inactive ones, on manual/MCP mutations and arrangement candidates. The arrangement search retains its 24-attempt bound, cancellation, fixed-building preservation and existing power/access checks. An infeasible distance rule yields named rejection reasons rather than relaxation. This implements distance relationships; role-budget composition, connection sockets, frontage/orientation relationships and full geometric symmetry remain open.

## Evidence

Private executable: `dist/desktop/district-relationships-v27/WulframForge.exe`, version `0.7.0-creative.27`, SHA-256 `8131521A106263E36917C2320F84B0AA1B69A055416CBFCB59DDAF2133B29FA4`.

All 262 discovered source tests completed: 261 passed, one existing fixture skip, no failures (`outputs/district-relationships-source.log`). Typecheck and scoped lint passed. Source coverage includes exact bound edges, unchanged source after rejected transactions, explicit removal, malformed records, missing members, inactive layouts, metadata round-trip, valid constrained candidates and a bounded infeasible search. Native UI acceptance is pending; build output alone is not acceptance.

## Native relationship acceptance

`outputs/creative-native-EHxrzH/report.json` records successful native relationship authoring, infeasible-rule rejection without revision change, rejected deletion of a referenced building, constrained paired preview without mutation, exported layout rules and one-step Undo. Visually reviewed its `district-relationships.png`: both district selectors, numeric range, live center distance and saved-rule actions fit the panel.

This run is **not an overall pass**: a later creative screenshot could not satisfy visible-page readiness while renderer probes still responded. It used isolated `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--disable-features=CalculateNativeWinOcclusion`; that experimental setup did not resolve the problem and is not a production recommendation. The earlier default run `outputs/creative-native-7hkIPk/report.json` failed at the same visibility gate before relationship checks. Neither failed receipt is counted as full native acceptance. The packaged executable has no occlusion-setting changes.

The v27 combined-landform attempt `outputs-desktop-test-JtkPM5/report.json` imported its fixture but failed waiting for the visible `3D stamp brush` button after a Terrain click. Captured UI remained in Base builder and recorded no renderer errors. No combined-pass claim is made; this failed UI-transition receipt remains available for investigation. The executable hash was rechecked after the run and is unchanged. General native acceptance, rule editing/removal through the UI and a complete relationship-constrained Apply/export/reopen journey still need coverage beyond the scoped checks above.

## Complete creative native follow-up

`outputs/creative-native-PFYMpI/report.json` passed the full creative native suite on the same v27 executable with the default browser environment (no experimental occlusion flag). The expanded relationship journey verifies constrained Apply, bounds and fixed-building preservation, edit/remove and their Undo steps, exported applied entities, actual file-input ZIP reopen, restored relationship controls and rejected deletion after reopening. This closes the relationship-specific native gaps listed above. It does not erase the earlier failed receipts or prove that hidden-page capture is generally fixed.

Future aggregate runs should use `node tools/test-product-baseline.mjs dist/desktop/district-relationships-v27/WulframForge.exe outputs-stamp-lab-IdQbRb/Landform-visual-lab.zip --relationships`. This includes district, portable-library and relationship scenarios; the aggregate report now records the exact scenario flags for each step. Runner lint passed.

The combined terrain native retry passed in `outputs-desktop-test-CZ7ugQ/report.json` on the exact v27 hash: portable stamp-library operations, large landforms, combined creative-base/inspection/export/restart and compact high-DPI keyboard navigation. This is a separate successful run, not a green aggregate.

The first random-map run (`outputs-desktop-test-Bpi1dg/report.json`) failed before finding Layout preset; captured text showed no generator dialog and no renderer errors. The field helper previously called both zero matches and multiple matches ambiguous. It now waits for one visible enabled field, still rejects genuine duplicates, and the click helper brings the test page forward before its existing visibility/hit checks. This is test readiness handling; failed receipts are retained and no production fix is claimed.

The readiness retry (`outputs-desktop-test-DK2KVz/report.json`) also failed, now specifically at the visible enabled Layout preset field. Thus the readiness change improved diagnosis but did not fix pointer activation. A separate opt-in `WULFRAM_KEYBOARD_ACTIVATION_TEST=1` scenario now activates visible, hit-tested buttons via focus and Enter. Reports identify keyboard versus pointer activation explicitly; keyboard results must not be used to claim pointer reliability. The default remains pointer input.

The keyboard comparison also failed at the same absent Layout preset field (`outputs-desktop-test-mLrgKJ/report.json`, `buttonActivation: keyboard`). This does not isolate the issue to pointer delivery. A native host focus/input investigation is still needed; no random-map acceptance is claimed for v27. The successful full creative and combined-terrain receipts remain valid for their tested scope.

## Native window input diagnosis

The read-only event trace in `outputs-desktop-test-cqNYNe/report.json` found zero pointer events reaching the document during the attempted Balanced click, with WebView visibility hidden. The native test helper now verifies the launched process ID and exact executable path before requesting activation of that window. Helpers launch hidden, time out after 10 seconds, and retain activation outcomes. A mismatched-executable test passed by rejecting before window activation. No production window behavior is changed.

With native activation, `outputs-desktop-test-Kht5bM/report.json` passed generator opening, worker cancellation and settings-change invalidation using pointer input. The run later failed with `CDP timeout: Input.dispatchMouseEvent` during the exhaustion scenario; renderer probes were unavailable at failure. This proves progress past the initial input loss, not complete random-map acceptance or a fix for every WebView timeout. Common activation code is shared by the workflow runner and creative screenshot preparation; scoped lint passed.

The shared-helper creative retry (`outputs/creative-native-vSoDAP/report.json`) timed out at initial `DOM.setFileInputFiles`, before any screenshot activation was reached. Both runners now also ensure native visibility immediately after loading, before import input; the workflow runner uses the same check before screenshots. This extension passed lint but awaits native acceptance. The failed run had no completed creative steps and is not evidence against the earlier relationship acceptance.

Aggregate `outputs/product-baseline-4Qz497/report.json` passed source tests and typecheck but stopped in combined terrain at `Runtime.evaluate` timeout (`outputs-desktop-test-9qkxPx/report.json`) after its inspection screenshot. No renderer probe could be obtained. A post-exit process check found no remaining Forge WebView processes and 12.35 GiB free of 31.92 GiB physical memory; this snapshot does not support leftover-test-process pressure as the cause, nor does it rule out transient resource/GPU problems during the run.

The combined scenario now additionally moves one Team 1 building by 10 u through Base Workshop, verifies all other entities and terrain remain identical, and carries the edit through Undo/Redo and export/reopen. This closes a previous coverage omission only when the expanded scenario passes; the completed aggregate above used the earlier scenario already loaded before this test edit. Lint passed.
