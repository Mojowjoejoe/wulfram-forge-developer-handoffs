# Base placement preview and power indicators

In Base Layout States, choosing a randomized style opens a preview designer. Select Small, Standard, Large or Massive; set the yellow building-area radius, X/Y center and rotation; then Preview formation. Reroll seed invalidates the preview; preview again to inspect the new arrangement. Apply adds the inspected result as a separate layout. Cancel restores the existing layout view. Edits to settings or the source project disable stale Apply.

Small and Standard retain fewer sites from the chosen style. Large keeps all sites, while Massive reinforces defenses where the style supports extra weapons. Model scale and power rules are not stretched. The radius is an allowed footprint boundary, not a power circle or a target unit count. Actual counts are shown in the generated layout name. Both teams are mirrored around the map center.

Power tint and Power status icons are independent toggles in Base Layout States. Power-dependent buildings use green tint and a yellow bolt when within friendly-cell range, or red tint and a red slashed bolt otherwise. Independent buildings keep their original colors and have no power badge. Indicators use the same placement-point distance and ten-unit margin as the validator. Range values remain provisional game assumptions. Icons are camera-facing editor overlays and are not written into map entities.

Validation: 20 focused tests pass, including power boundaries, enemy-cell exclusion, alternate-cell coverage, independent structures, size differences, constrained area rejection, and 180 seeded formation cases. Typecheck and changed-file lint pass. Native receipt: `outputs/creative-native-BhM0hP/report.json`. Five styles passed Preview without project mutation, Apply, preservation of previous layouts/terrain, export/reopen and Undo. Powered, unpowered and preview screenshots were visually inspected. These checks are not in-game balance or firing-range proof.

Private executable: `dist/desktop/creative-bases-v4/WulframForge.exe` (0.7.0-creative.4). Existing JavaScript bundle-size and WindowsBase build warnings remain.
