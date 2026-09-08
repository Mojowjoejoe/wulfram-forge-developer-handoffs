# Base design sprint — v5

## Delivered

- All 15 randomized styles support Starter, Standard, Fortified and Massive choices. These control retained sites and reinforcement budgets, without scaling models.
- Target structures per team: 0 uses the style's automatic budget; 6–120 requests an exact total, including power and support. Impossible targets reject with a reason. Essential services, cells and local gun protection are retained.
- Preview with a yellow allowed-area circle, X/Y movement, rotation, seed reroll, Apply and Cancel. Changed settings or a changed source invalidate Apply. Applying creates a separate layout and preserves existing terrain/states.
- Independently toggled power, estimated Darklight and estimated turret circles, including dashed inner blind spots. Persistent visible wording identifies estimated coverage even with settings collapsed. Existing power tint and lightning icons remain available.
- Sampled pad access checking defaults on. A grid flood checks paths from the central battlefield to repair/refuel approaches, with terrain slope, structure clearance and connecting-segment checks. It rejects blocked layouts; users can explicitly disable it for manual experiments.
- Save the active generated arrangement as a favorite. Favorites persist in the current editor profile and can be previewed at new coordinates/rotation on another map, with fresh terrain, power, footprint and access validation. Exact local structure positions are retained; height conforms to destination terrain. The library holds up to 50 formations.

## Critic loop

Single-agent review, automated regression and native screenshot inspection, following CRITIC_LOOP_RC27.md. Findings repaired:

1. Grid-point clearance alone could miss obstructions between points. Added continuous obstacle checks along connecting segments and final pad approaches, plus midpoint terrain checks.
2. Secondary controls displaced the primary placement controls below the initial view. Collapsed coverage/favorites while designing, keeping position controls and actions near the top.
3. Old-map errors/counts remained visible while viewing a valid candidate. Validation, requirements and count displays now identify the current preview.
4. Estimated coverage labels could disappear when controls collapsed. Kept a visible estimated-range notice whenever those overlays are enabled.

## Verification

- Focused tests cover exact count, budget rejection, source preservation, sampled access, favorite serialization and transplantation. Existing formation tests sample 180 seeded layouts and verify paired teams and deterministic variation. Power boundary tests cover the validator margin and friendly versus hostile cells.
- Main: 111 pass, one existing skip. Workflow: 4 pass. Reliability: 6 pass. Critic: 6 pass. Typecheck and changed-file lint pass. Full lint still fails on unrelated existing scripts/tests; logs in `outputs/creative-sprint-v5-checks/`.
- Native tests select five styles through the real dropdown, preview without map mutation, apply exact count, preserve existing states/terrain, export/reopen, Undo, save favorites, reload the page, and reuse a favorite on another map. Final receipt: `outputs/creative-native-B9sHNr/report.json`. Initial and intermediate screenshot evidence is retained in `creative-native-3jthUQ` and `creative-native-QZTTo8`; final coverage screenshot inspected after label fixes.
- Full packaged desktop workflow passed in `outputs-desktop-test-RwjKqY/report.json` before the final UI label/organization refinements. Functional generator code was unchanged after that run.

## Limits

The access check samples an 80-unit grid, using 56-unit point clearance and 40-unit segment clearance, with an 18-degree slope cap or the map's stricter limit. This is an editor approximation, not actual vehicle collision, pad docking, arbitrary route certification or multiplayer balance proof. Coverage defaults remain historical estimates; circles do not test firing line of sight or guarantee Darklight concealment. Large/overcrowded formations can legitimately fail.

Private Windows executable: `dist/desktop/creative-sprint-v5/WulframForge.exe` (0.7.0-creative.5). No public push or existing-map replacement. Existing large-bundle and WindowsBase build warnings remain.
