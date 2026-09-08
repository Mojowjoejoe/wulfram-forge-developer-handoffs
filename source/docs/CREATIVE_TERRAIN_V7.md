# Terrain-aware formations sprint v7

Private desktop build: `dist/desktop/creative-terrain-v7/WulframForge.exe`, version `0.7.0-creative.7`.

SHA-256: `25DC1A40C7F92843CB7A670A2710A19CCFE15DB2D793E3A72DE2E9CA4BBAD6CB`.

## Using the new controls

1. Choose any of the 15 creative formations from Base Layout States. Terrain adaptation is enabled for new creative drafts.
2. Choose size, target count, position, rotation, and building-area radius. Adaptation moves complete powered yards by up to 800 units, preserving internal geometry, structure scale, and mirrored team placement. It samples both teams' terrain before accepting a move.
3. Optionally enable Reserve a main entrance. Set its world direction: 0 degrees faces +X and 90 degrees faces +Y. Team 2 faces the opposite way. Cyan guides outline a 180-unit-wide approach from the center to the building-area boundary. Reserving an entrance also enables yard adaptation, even if the terrain-adaptation checkbox is off.
4. Preview formation generates three seeded arrangements. Scroll to the option cards, then select each to compare it in the same viewport. Cards show per-team counts, fit status, and the number of repositioned yards. Failed options expose their explanation and available red markers; they cannot be applied.
5. Apply adds only the selected arrangement as a separate layout. Moving, rotating, changing settings, or rerolling invalidates the previous choices. Favorites retain their saved arrangement and use one preview instead of three newly generated arrangements.

Green routes show successful sampled access. Entrances are checked for structure clearance and terrain slope across the corridor. Their centers must connect to the same sampled battlefield region as the service pads. The inspector separately labels the saved map's service radius and the preview's capped service radius.

## Critic loop

Used the established single-agent review, reproduce, repair, retest, and native screenshot workflow. This was not an independent multi-agent audit.

- 26 new tests passed: three choices across nine terrain/size combinations; steep-mound escape that fails without adaptation; blocked entrance rejection; all 15 styles with an exact 24-per-team budget and reproducible geometry at a rotated base/entrance angle.
- 29 existing creative formation, favorite, access-preview, and preservation tests passed.
- Main suite: 111 passed, zero failed, one existing skip.
- Workflow 4/4, reliability 6/6, and critic regressions 6/6 passed.
- TypeScript and scoped application/library lint passed; desktop web and Windows packaging completed.
- Native editor trials verified all three options, drag invalidation, rejection markers, five styles, unchanged prior layouts and terrain, archive round-trip, favorites, and one-step undo.
- Extended native trials imported valley, hill, and mound archives, previewed three small and three massive arrangements on each, and confirmed that selecting option 3 actually saves option 3. Undo restored each original arrangement.

Review fixes included semantic option grouping, preserving the legacy creative factory import, and clarifying preview power-radius labels after the terrain screenshots exposed a saved-state/preview mismatch. Existing unrelated working changes were retained.

Final packaged-build native report: `outputs/creative-native-UAnjdc/report.json` (passed). Screenshots include each small/massive option on all three trial terrains. Earlier review images are in `outputs/creative-native-E59DqH/`. Automated logs: `outputs/creative-terrain-v7-tests.log` and `outputs/creative-terrain-v7-main-tests.log`.

## Trial maps and limits

`outputs/creative-terrain-v7-trials/` contains `valley.zip`, `hills.zip`, and `mounds.zip`, each with six saved layouts: three small and three massive Iron Anvil arrangements. The mound examples have no reserved straight entrance because their central terrain is deliberately obstructed. The dedicated mound-escape regression uses Starter Hideaway. Archive round-trips and native import were verified.

To continue gameplay validation, load a trial through the normal game/server workflow, try each layout, drive from the battlefield into both bases and onto every repair/refuel pad, and record collision, turning room, power, and concealment results. These are editor test fixtures, not competitive map releases.

No in-game driving or server-range test was performed. The algorithm searches a bounded 100-unit placement lattice and uses sampled slopes (at most 18 degrees); it can conservatively reject usable terrain and does not certify collision, sightlines, every exit, or game balance. It repositions powered groups rather than reshaping each building independently. Existing power, turret, and Darklight range assumptions remain unchanged. All three candidates can fail on unsuitable terrain; move the center, enlarge the area, change the entrance, or choose a smaller formation. No terrain flattening or map publication is performed.
