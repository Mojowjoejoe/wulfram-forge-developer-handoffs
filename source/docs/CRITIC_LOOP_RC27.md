# Generator critic loop — RC27 private candidate

## Outcome

Review, reproduce, repair, and retest completed for the generator/search workflow.
No unresolved blocking defect was found in the final reviewed/tested scope.
This is a single-agent review with automated tests, not an independent multi-agent
audit or proof that every possible bug is absent. Live Wulfram match balance remains unverified.

## Findings resolved

1. Regeneration reset custom placement rules and active layout names. A failing
   regression reproduced the reset. Preserve source rules and the user layout name;
   retain the special terrain-only naming transition. Verify source immutability.
2. Valid 200-character seeds exceeded the length limit when internal domain strings
   or starter suffixes were added. Separate internal hashing from user-input validation,
   bound the derived starter seed, and preserve the original terrain seed. Repeated
   generation is deterministic; 201-character user input still rejects.
3. Harden search handoff against a normal preview starting before the worker's passive
   cleanup: validity now reads the current disabled flag updated in a layout effect.
   Cancellation, settings staleness and finished-preview invalidation are tested.
   The exact sub-frame handoff race was reviewed, not deterministically reproduced.
4. Packaging could replace an existing release archive. Refuse an existing destination
   before building. Regression confirms early failure and unchanged RC25 ZIP hash.
5. Visual inspection of RC26 found that a 200-character seed expanded the dialog's
   content horizontally, hiding controls. Add min-width containment and arbitrary
   seed wrapping. RC27's native EXE test asserts no horizontal overflow; its screenshot
   was visually inspected and shows the Apply controls inside the dialog.

## Evidence

- Final automated suites: 110 main + 4 workflow + 6 reliability + 3 critic tests passed;
  one existing main-suite skip. Typecheck, lint and git diff whitespace checks pass.
- Repeated 104-map batch: 54 pass, unchanged from RC25; all 36 conditioned mountain
  cases pass. Receipt: `../outputs/reliability-critic-rc26.json`. RC27 changes after
  this batch are UI layout containment only, not generator logic.
- RC27 search/custom-rules/200-character seed EXE receipt:
  `../outputs-desktop-test-9Qt36Z/report.json` and `search-found.png`.
- RC27 terrain-first complete EXE workflow:
  `../outputs-desktop-test-FLrONo/report.json`; `04-reopened-map.png` inspected.
- RC27 already-populated Test2 Fixed complete EXE workflow:
  `../outputs-desktop-test-CV41Ec/report.json`.
- Complete workflows exercise real import, mountain preview/apply, base preview/apply,
  Undo/Redo, map ZIP export and process close/reopen. Tests use copied EXEs and isolated
  profiles, not the user's current editor. Source fixture hashes are checked unchanged.
- RC26 failed visual evidence is retained in
  `../outputs-desktop-test-pi7ol6/search-found.png`; functional success did not close
  that visual finding. RC26 is superseded by RC27.

## Private package

`../dist/desktop/WulframForge-0.7.0-rc.27-win-x64-self-contained.zip`

SHA-256: `09148171f87538aee77edd15613dc091e9ebe712a5dad28f94fc0b723df46d68`

Packaged EXE SHA-256: `666f576c4c116a90d9d3e5b771fb6bb6d16dfc63d7592ed6f1a04d40a3f979ab`.
ZIP CRC and packaged/tested EXE parity checked. Existing releases remain retained.
An intermediate build was inadvertently named 0.6.0 by omitting the CLI --version
flag; it is not the delivery artifact. Use the explicit RC27 archive above.
No commit, remote push or public publication was performed. Public push remains disabled.

## Remaining constraints, not waived

- Unsigned private Windows build; .NET self-contained, requires Edge WebView2.
- Existing large JavaScript chunk and WindowsBase reference-conflict build warnings
  remain; the build succeeds and tested EXE workflows pass, but these are not cleared warnings.
- Invalid terrain/placement configurations must still be rejected. A seed search is
  bounded and cannot guarantee success for incompatible settings; no checks were weakened.
- Sampled offline traversal/power/spacing validation is not real vehicle collision,
  match timing, multiplayer playtest evidence or exhaustive settings coverage.

## Repeat the loop

Run `npm test`, `npm run test:workflow`, `npm run test:reliability`,
`npm run test:critic`, `npm run typecheck`, and `npm run lint`.
Build with `npm run build:desktop -- --version <new-unused-version>`.
Run `npm run test:desktop`; use `WULFRAM_SEARCH_TEST=1` and
`WULFRAM_CRITIC_TEST=1` for search/custom-settings/long-seed tests, then unset both
for full workflow tests. Inspect screenshots, not just green test assertions.
Any new reproducible finding reopens the loop before calling that scope clean.
