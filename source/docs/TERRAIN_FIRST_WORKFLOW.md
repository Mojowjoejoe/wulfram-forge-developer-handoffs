# RC18: shared starter-base rules and terrain-first application

Verification: 110 tests passed, one existing skip; typecheck/lint passed. Desktop
build succeeded with existing large-chunk/WindowsBase warnings. ZIP CRC and EXE
parity passed. SHA-256:
`5313f2ce41574f661011260116ea641bda7046e45ed7f89b28bbabe1df4c40fb`.

Balanced now calls `buildBalancedCandidate`, which generates terrain, preserves
existing regeneration context where supported, and uses `generateBalancedBase`
with the same paired-placement solver as Random base. Starter placement uses a
2000-unit maximum diameter, spacing 1, rotation 0 and a derived seed. A failed
placement rule cannot be hidden by a passing legacy layout analysis.

The footer explains the base outcome, lists failed terrain gates and up to six
placement errors, and explains the next action. No preview means both Apply
actions are disabled; failed terrain blocks both; a failed base blocks full Apply.

**Apply terrain only** separately rechecks terrain, asks for confirmation, removes
team 1/2 structures from the candidate's active layout, and preserves candidate
neutral entities and inactive layouts. As with existing regeneration behavior,
preservation of old context applies to previously generated projects; replacing
an unrelated imported map still requires a backup. Confirmation and Undo remain.

The result is explicitly marked `terrain-only-bases-required` and named as an
incomplete active layout. It intentionally fails normal base requirements until
the user adds valid bases via Random base. A passing base application clears the
stage marker. Inactive layouts require revalidation against changed terrain.
Terrain-only is not a bypass for bad terrain or a play-ready certification.

Regression tests exercise invalid starter placement, terrain-only state,
inactive-layout preservation, source immutability, completion via Random base,
the shared rules receipt, and rejection of subsequently damaged terrain.
Native UI acceptance and live-game tests are still pending. Private unsigned
package: `dist/desktop/WulframForge-0.7.0-rc.18-win-x64-self-contained.zip`.
