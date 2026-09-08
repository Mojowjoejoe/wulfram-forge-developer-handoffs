# Landform polish sprint and independent critic loop — RC45

## Outcome

Private unsigned Windows candidate, tested locally. Three independent reviewers covered safety/data integrity, landform shape quality, and usability across repeated review, reproduction, repair, and retest rounds. Final reviewed sprint scope has no outstanding blocking finding. This is not an exhaustive editor audit or live gameplay certification.

## Delivered

- Five named starters: Mountain Ridge, Winding Valley, Impact Crater, Gentle Foothills, Mountain Pass.
- Versioned Natural landforms: genuinely curved ridge/valley spines, variable crater rims, and paired pass shoulders. Legacy oval kernels and seed hashing retain their saved behavior.
- Independent length/width, rotation, height/depth, variation, roughness, bend, edge profile and edge blend remain adjustable. Dimensions bound the footprint, not the visible crest.
- Stronger seed mixing for Natural landforms: similar seed names now visibly vary relief. New shape variation changes only the seed.
- Actual surface and native texture preview before clicking. Cyan boundary marks valid placement without covering the texture; blocked placements retain the red mesh and reason.
- Placement mode and status near the top, clearer control explanations, preset update/storage feedback, and full saved-setting restoration.

Use **Terrain → 3D stamp brush → Starter preset**. Protected placement requires supported route metadata. Manual placement still protects structure reserves but can block routes and change sightlines. Every click is one undoable edit. Terrain and texture preview use the same calculation as Apply; preview never changes the saved map.

## Critic findings closed

1. Bend previously modulated height instead of curving the ridge: new versioned profiles use a curved centerline. Existing legacy presets are not silently migrated.
2. Mirrored overlap could produce a height discontinuity: Natural landforms use a continuous bounded blend; new overlapping legacy placements reject with an actionable message. Existing saved terrain is untouched. Shared kernel covers both 3D brush and older dialog.
3. Fractional signed powers created crater/pass zero-crossing cusps: the new profile exponent is always at least one.
4. Gentle Foothills was too steep: height reduced to35u. Final default sampled maximum slope was19.77 degrees on a flat25u grid; not a gameplay clearance guarantee.
5. Seed names ridge-a/b/c looked nearly identical: added v2-only hash avalanche and a regression requiring material relief differences for these fixtures.
6. Cyan wireframe obscured texture even at12% opacity: native screenshot review reopened the issue; replaced valid wireframe with outline-only.
7. Status ran into the next label: block layout and spacing fixed and visually checked.
8. Preset/mode discoverability and incomplete restoration tests: mode/status moved up; overwrite/cap feedback added; native restart now compares every visible saved setting.

Minor future polish: starter selection returns to its placeholder; the selected preset name is available in Preset name and load feedback. Shapes remain smooth procedural primitives, not erosion simulation. Original low-resolution texture edges and repetition remain visible.

## Verification

- Main suite:111 passed, one existing skip.
- Workflow:4 passed; reliability:6 passed; critic/replacement:6 passed.
- Stamp suite:11 passed, including all starter profiles, seeds, mirroring, bounds, legacy overlap rejection, source immutability, protected reserves, dimensions, and terrain/texture preview-Apply parity.
- TypeScript, scoped lint across changed stamp files/harness, and git diff whitespace check passed. Whole-repository lint was not a release gate for unrelated dirty work.
- Final packaged EXE protected workflow: `outputs-desktop-test-fcyOiN/report.json`. Actual import, protected/manual controls, slider keyboard limits, Alt-wheel rotation, blocked click preservation, two placements, texture painting, Undo/Redo, preset save/full-setting reload, and process restart. No renderer errors.
- Final packaged EXE visual lab: `outputs-desktop-test-FZqzVM/report.json`. Five1000–1600u presets on a flat257-grid4000u fixture, actual texture previews, click Apply, serialized preview/Apply parity, undo back to baseline, side screenshots, and three seed variations. No renderer errors.
- Visual reviewers inspected native PNGs, not merely test success. The main agent also inspected large ridge/crater/pass/foothill and seed images.
- Both final receipts identify EXE SHA256 `6ed42f83c2ea893d61202101d735eba30d3d2fad3a9c1e9e13ad1262846e0c0e`. ZIP CRC verified and contained EXE hash matches tested EXE.
- Original fixtures are hash-checked unchanged; all tests use isolated profiles and copied applications. Power Run and Icebound source ZIPs preserved.

The first visual harness run stopped on JavaScript negative zero versus JSON zero, not a terrain mismatch. The assertion now compares both sides at the same JSON serialization boundary. Failed/intermediate evidence remains in `outputs-desktop-test-8Su9wS`; passing RC43 pre-final visual and workflow evidence remains in `outputs-desktop-test-EYlVzg` and `outputs-desktop-test-gZ724R`. RC43/44 archives are intermediate, superseded by RC45 and not overwritten.

## Private package

`dist/desktop/WulframForge-0.7.0-rc.45-win-x64-self-contained.zip`

SHA256: `bb87eb8d688fc522c3bfe2cd0dc3c272239fb785907bdaa981ac9734b4b79bd9`.

Unsigned, .NET self-contained; requires Edge WebView2. Existing large-bundle and WindowsBase reference warnings remain. No commit, remote push, public release, or repository visibility change performed.

## Repeat native acceptance

Run `npm run test:stamps`, `npm run typecheck`, and the cataloged main/workflow/reliability/critic suites. Build a new unused RC version.

`tools/build-stamp-visual-lab.mjs` creates a new isolated flat map ZIP. Set `WULFRAM_STAMP_VISUAL_TEST=1` and run `tools/test-desktop-workflow.mjs <EXE> <lab-ZIP>` with Node type stripping. For protected regression, unset that flag, set `WULFRAM_STAMP_3D_TEST=1`, and pass the preserved Icebound ZIP. Review the resulting PNGs and report hashes. Native seed screenshots test shape variation, not painting (starter defaults keep existing textures).

Revalidate and playtest any composed map. Steep mountains/crater banks may be intentional barriers; cosmetic ice does not add slipping or other gameplay behavior.
