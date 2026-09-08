# Service Courtyard

Use Service Courtyard when you want two service banks facing a wide, open passage with an exit at each end. The court gives traffic room between the banks; the tradeoff is a large reserved footprint and exposed approaches from two directions. It differs from Frontier Camp's expansion hook and Offset Bastion's bent entry.

In private v91, open **Base builder → Browse base library → Creative → Service Courtyard**. Select a size, then **Preview on current map**. You can also choose it from the layout dropdown. It is a reviewed editor family; game/server behavior remains separate.

## Choose a size and budget

Counts below are for one team; the generator places a rotationally mirrored second team. All buildings retain their original model scale.

| Size | Total | Power cells | Uplink | Repair | Refuel | Gun | Flak | Missile | Darklight |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Starter | 10 | 4 | 1 | 1 | 1 | 2 | 1 | 0 | 0 |
| Standard | 15 | 6 | 1 | 2 | 2 | 3 | 1 | 0 | 0 |
| Fortified | 21 | 8 | 1 | 2 | 2 | 4 | 2 | 1 | 1 |
| Massive | 33 | 12 | 1 | 3 | 3 | 6 | 3 | 3 | 2 |

Leave **Target structures per team** at 0 for these automatic totals. The input accepts whole numbers 6–120, but every required role above must remain; a lower or otherwise infeasible target is rejected. A numeric target is a request, not a guarantee of a fitting arrangement. The original models for every required role must be available for both teams.

Reroll changes service spacing and defensive positions within the banks. It keeps the same basic court and site plan; larger sizes add service/defense sites. Saved favorites retain their fixed arrangement rather than rerolling it.

## Make room for the whole base

Each team reserves three connected corridors: a 560-unit court and two 320-unit mouths. The mouths reach 1,100 units from the base center; their rounded ends make the complete reserved span 2,520 units. Buildings can extend beyond the corridor bounds. The library reports occupied plus reserved sample bounds for the selected size and seed; these are flat-sample dimensions, not a guarantee of fit on your map.

![Fortified court and service banks](../tools/mcp/MapEditerMCP/outputs/mcp-native-test-u9UXev/courtyard-restart-N2FvIC/Team-1-Overhead.png)

One 21-per-team flat example. Violet outlines show court/mouth reservations; symbols and coverage marks are editor overlays. Use the close building view for model detail.

Move the base center, rotate the pair and adjust **Building area radius**, then preview. The yellow circles bound buildings and reservations; they are not power ranges. Keep the six reservations clear of buildings from either team. The second base needs matching terrain support.

With **Adapt powered yards to terrain** enabled, the editor searches candidate yard shifts within 800 units on a 100-unit grid. It uses the stricter of 18 degrees and your map's slope limit. Adaptation does not flatten terrain. Final placement must still satisfy spacing, power, reserved space and paired support. If no fit is found, move the base, enlarge its allowed area, choose a smaller size, or manually reshape the terrain and preview again.

## Inspect before applying

Preview checks a continuous 80-unit path through each court even if **Check sampled pad access and exits** is off. The optional pad check covers service approaches separately; it may choose a different path. The 80-unit check does not certify the entire 560-unit width. Generated layouts cap the saved service radius at 280 units, giving a checked power reach of at most 270 units; smaller saved ranges remain stricter. Darklight and weapon coverage are not verified gameplay ranges.

![Original repair pad close view](../tools/mcp/MapEditerMCP/outputs/mcp-native-test-u9UXev/courtyard-restart-N2FvIC/Team-1-Repair.png)

The selected original repair model is visible with the editor's powered indication. This does not prove in-game driving, firing or concealment behavior.

Use **Inspect → Team Overhead**, select a building, and choose **Close building view**. Preview alone leaves the map unchanged. **Apply formation** creates the layout in one Undo step. After moving individual buildings or changing rules, inspect power and approaches again; earlier checks describe the earlier arrangement.

## Save and reuse

Choose **Save active formation as favorite**. Open the library's **Manage My bases** section to export a backup, import it on another editor, rename it or remove it. Import previews changes before Apply and allows cancellation. Courtyard favorites require library format version 5 and a host with Courtyard portability support (private v90.1 or a later compatible build); older editors cannot safely read this format.

A favorite retains all six actual reservations. When reused on another map, geometry is moved and rotated into the destination frame and both passages are checked again. Importing a library is not proof that every entry will fit the open map. Keep a whole-map ZIP if you also need terrain or additional authored rules beyond a supported favorite's scope.

## Evidence and limits

[Source and terrain contract](SERVICE_COURTYARD_CORE.md), [native library handoff](SERVICE_COURTYARD_V90.md), [favorite/ZIP/restart evidence](SERVICE_COURTYARD_PORTABILITY.md), and [native visual matrix](SERVICE_COURTYARD_VISUAL_MATRIX.md) record exact receipts. Coverage includes four deterministic golden sizes, 192 terrain cases with 144 symmetric fits and 48 asymmetric rejections, controlled seed comparisons, native GUI/MCP preview/Apply/Undo, four-size ZIP reopening, and favorite export/import/restart/reuse on a larger flat map.

These are editor checks and synthetic examples. Competitive balance, novice-user acceptance and actual game/server mechanics remain separate roadmap work.
