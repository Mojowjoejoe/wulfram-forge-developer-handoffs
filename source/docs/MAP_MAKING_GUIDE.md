# Making a map in Wulfram Forge

This guide describes the private v106 editor. Use **Help > About this editor** to check your running build. Older executables may lack these controls. Feature-specific native evidence is linked below; v106 combined acceptance and first-time-user acceptance remain separate. Check the [acceptance matrix](PRODUCT_ACCEPTANCE_MATRIX.md) for the current accepted build.

## Choose a starting point

Use **File > New map** for a manual map, **File > Import** for an existing project or package, or **Tools > Generate balanced map** for a generated candidate. Export your current work before replacing it.

Use **Terrain** for ground and textures. Use **Bases > Build** for buildings, **Bases > Inspect** for diagnostic views, and **Bases > Rules** for authored restrictions. The toolbar names the active tool; the right inspector holds its settings. **Help > Find tools and settings** searches controls by purpose, including power, valley, lock and lane.

## Build the ground by hand

| Tool | Use it for | When it changes the map |
| --- | --- | --- |
| Raise / Lower | Local hills and depressions | During the stroke |
| Flatten | Matching the height where you began the stroke | During the stroke |
| Set height | A pad at a numeric elevation | During the stroke |
| Smooth | Softening sharp height changes | During the stroke |
| Paint texture | Changing surface appearance | During the stroke |
| Large landforms | A ridge, valley, crater, pass, mesa or basin | Click to place the hover preview |
| Lane tool | A long cut through high ground | Apply lane after drawing and reviewing |

For manual brushes, choose the footprint, radius/half-size and edge behavior. A square hard-edged Set height brush is useful for a precisely bounded pad. Select a terrain region to limit brush work; save useful brush settings in the manual brush library.

Large landforms have a **Browse landform brushes** picker. It offers seven starters built from six shape kernels. Loading a starter changes settings without applying terrain. Adjust full length, width and height, check the mirrored partner, then inspect the hover preview. **Natural shape and blending → Curve / bend** curves ridges, valleys and passes; **Winding Valley** is a ready-made curved starter. Mesa and basin change the center by a constant offset: they preserve an existing slope rather than leveling it, and do not use Bend.

To cut a road-like opening, choose **Terrain > Lane tool > Draw lane**. Drag from start to end, release, then adjust width, floor height and shoulder blend. **Cut high terrain only** keeps ground already below the floor unchanged. **Cut and fill** also raises those low areas. Wider shoulders make a gentler transition for the same height difference. Use **Apply lane**, or **Clear lane preview** to discard it. In v107+, adjust **Curve / bend** to bend the lane while keeping both endpoints fixed. Zero is straight; negative and positive values bend to opposite sides. The slider is available after choosing Lane tool; draw first to see its effect. In v108+, drag numbered handles to move points, or the square handle to bend. Open **Path points** for coordinates and adding/removing turns; set bend to zero before adding points. Arrow keys move a focused point 10 units (Shift: 100). [Editable lane guide](LANE_PATH_EDITING_V108.md). Drawing one does not create a protected route or a gameplay objective.

Use Undo/Redo above the viewport or in the Edit menu. One ordinary brush stroke, lane application or landform placement is one map operation.

## Protect work you want to keep

After selecting a terrain region, **Protect selected heights** saves a height rule. Existing rules can be managed under **Bases > Rules**. Height rules apply to the shared terrain, including rules saved in other layouts. Painting textures can remain available when height changes are prohibited.

For large landforms and lanes, protected placement also needs supported authored-route metadata. An imported map can contain all of its visible terrain while lacking that metadata. If the editor reports this missing information, use the original editor project or deliberately select manual placement. Manual placement still checks structure reserves and saved height rules.

Do not interpret a clear preview as proof that a vehicle can drive through it. Examine the shoulder slopes, approach width and turning room, then test those in game.

## Place and shape a base

Open **Bases > Browse base library**. Use search and filters to find the intended footprint and role mix. Check the collection and provenance: an original fixed formation, a generated creative style and a personal saved arrangement have different behavior. A family name, size or seed is not a new building model.

For a creative formation, choose its supported size and count settings, preview the formation, check both teams when paired, and apply it. Review power, spacing and access on the current terrain. A valid catalog entry can still fail to fit your map.

The Creative collection contains 21 reviewed families. Offset's four arrangement cards count as one family. These illustrated guides help choose among the six additions to the original fifteen:

| Need | Family guide |
| --- | --- |
| A bent approach and a choice of four district arrangements | [Offset Bastion](OFFSET_BASTION_GUIDE.md) |
| A compact starting core with reserved expansion sites | [Frontier Camp](FRONTIER_CAMP_USER_GUIDE.md) |
| Service buildings around open turning space | [Service Courtyard](SERVICE_COURTYARD_GUIDE.md) |
| A perimeter with deliberate access gaps | [Broken Ring](BROKEN_RING_GUIDE.md) |
| Separate yards that keep a valley passage open | [Valley Pockets](VALLEY_POCKETS_GUIDE.md) |
| Three departure courts and a shared rear service road | [Three-Lane Anchor](THREE_LANE_ANCHOR_GUIDE.md) |

For manual building work, choose the active layout and intended team before placing or editing. The Base Workshop can name selected buildings as a district, move/rotate/duplicate/mirror the group, and save selections as reusable modules. Locks and authored rules can prevent these operations. Save reusable arrangements in the personal library; portable library files transfer those entries separately from the map.

See the [base library and designer plan](BASE_LIBRARY_AND_DESIGNER_PLAN.md) for the distinction between implemented families and proposed catalog additions. The proposed 48-family catalog is not a claim that all 48 are currently available.

## Generate, then refine

Generation proposes a candidate; review it before Apply. Keep the seed and settings with the project when you want a repeatable result. A rejected candidate must leave your current map intact.

Hybrid editing combines generated terrain with manual terrain, saved bases and authored restrictions. Each regeneration tool has its own eligible scope. Inspect the scope message instead of assuming a global reroll preserves every manual edit. District arrangements move eligible groups while fixed groups and constraints restrict the search; infeasible settings can produce no valid candidate.

## Inspect and fix

**Bases > Inspect** brings together building and route inspection. Use **View > Display options** to control clutter. Hiding a circle or marker does not turn off its checks.

| Display or problem | Meaning and next action |
| --- | --- |
| Yellow lightning | Powered under the editor's configured rules |
| Red slashed lightning / red power tint | Inspect the building's power relationship; move it or its supply within the configured range |
| Estimated Darklight or turret circles | Planning aid; verify actual server ranges and behavior separately |
| Blocked or tight approach | Inspect the obstruction and usable width; move buildings or revise the route |
| Unsuitable slope | Inspect the terrain under and around the footprint; choose another site or explicitly reshape the ground |
| Preview rejected | Read the reported constraint; adjust settings or the location before applying |

Power status, geometric clearance and editor validation are separate from weapon effectiveness, vehicle movement and match balance.

## Save something you can reopen

**Save local** keeps the editable map in this editor profile on this device. It is not an external backup. **File > Export map ZIP** produces the portable map package. Keep the download, close the test editor, and import the ZIP again to verify your copy.

**Export base-layout JSON** is a layout export, not a substitute for a full terrain-and-project package. **Export Git source ZIP** serves source workflows. Personal base, district and brush libraries have their own portable exports. Use **Export diagnostics** when reporting an editor problem, and review its contents before sharing.

A finished editor workflow ends with a retained, reopened package. Game compilation/loading, vehicle trials, server rules and novice-user testing remain separate acceptance steps. No capture timers, scoring or victory logic are supplied merely by adding contested terrain points.

## Inspect a candidate's approaches

During a formation preview, **Bases > Inspect > Inspect routes** now includes the candidate's authored corridors. Choose an automatic service route or a named corridor to examine each separately; they can follow different paths. The assumed vehicle width affects diagnostics, not the saved corridor. Malformed or excessively long paths produce a diagnostic rather than a clearance result. See [candidate entrance inspection](AUTHORED_PREVIEW_INSPECTION_V72.md) for the exact private-build receipt.

## Connect base entrances to lanes

Open **Bases > Rules**. On a new map or a map with legacy single entrances, first choose **Design multiple entrances**; a saved multiple-entrance policy opens that panel automatically. It supports up to three named exits per team. For each exit, choose its local **Exit mouth** corridor and direction. A **Lane approach** is optional: when selected, its ordered end must meet the start of the mouth. **Unbound** means no authored lane has been connected; an automatically inspected service path does not create that binding. Use **Preview entrances**, review all exits and pad access, then **Apply entrances** for one Undo step.

Inspect again after editing terrain, buildings or corridors. Existing single-entrance maps retain their legacy interpretation. Use authored-base or whole-map export for multiple-entrance policies; formation favorites cannot represent those six-socket rules. [Multiple-entrance behavior and evidence](MULTIPLE_ENTRANCES_V102.md).


## Choose an Offset arrangement

In **Base builder**, choose **Offset Bastion**. **District arrangement** offers Classic, Wide Front, Deep Court and Split Wings. Select a size and arrangement, then **Preview formation**. Changing the arrangement requires a fresh preview before Apply. Reroll varies buildings inside the chosen plan. Favorites retain the saved geometry and do not offer this generator control. Classic keeps its earlier recipe. See the [Offset guide](OFFSET_BASTION_GUIDE.md) for placement and editing.


## Find Offset plans in the library

Open **Base library > Creative** or search **Offset Bastion**. Choose a size and plan, then **Preview on current map**. Search, collection and size stay visible; expand **More filters** for role, count, terrain or traits. The four cards are arrangements of one reviewed family.

When a base has additional district, relationship or composition rules, use authored-base export to retain the complete active layout, or **Export map** for the whole project. Fixed favorites reject unsupported rule loss even when the base has no reserved areas. [Details](FAVORITE_RULE_PRESERVATION_V81.md).

## Reuse a complete authored layout

Open Base builder → Build → Authored bases · both teams and rules. Capture a layout or import an authored-base JSON file, set its origin/rotation and terrain placement, then Preview and Apply. Apply creates a new layout; Undo restores the previous one. Export the loaded package to reuse it elsewhere. Authored bases preserve both teams and rules and have their own saved collection; **My bases** holds formation favorites. See [authored-base controls](AUTHORED_BASE_GUI_V83.md) for limits and evidence.


Search authored bases in **Find tools and settings** to open those controls directly. After Preview, use Team 1/2 overview or ground view to examine the proposed buildings before Apply. Camera controls preserve the map and remain inside the authored-base panel. See [preview camera evidence](AUTHORED_PREVIEW_V84.md).


Use **Preview building** and **Close preview building** inside the authored-base panel to inspect an exact proposed structure before Apply. These controls only move the camera; the placement preview badge remains visible. [Close-view evidence](AUTHORED_DETAIL_V85.md).


## Browse complete saved bases

Open **Browse base library**, choose **Authored bases**, and search a saved label, source name or district name. Cards show all saved teams together and preserve the complete package. Their center diagrams and center span do not represent collision footprints or verified fit.

Choose **Preview on current map** to open authored placement controls. Adjust origin, rotation and terrain handling, then **Preview authored base** and **Apply authored base**. Apply adds a layout; map Undo restores the previous one. Manage or export the collection under **Saved authored bases**. Formation favorites remain a separate collection with different team/placement behavior.


In private v111+, **Bases > Inspect > Inspect routes** includes an elevation graph. Move **Route progress** to inspect positions along the selected approach. Climb/descent and sampled uphill/downhill grades describe the terrain, with a separate vertical display scale. They do not predict whether a Tank or Scout can climb, jump or land there. The existing Follow route action remains a camera tour.


In private v112.1+, **Draw inspection path** lets you inspect terrain without a saved corridor. Click two or more terrain points, then **Finish inspection path**. **Remove last point** revises it; **Clear inspection path** returns to saved routes. Escape cancels while drawing. The path is temporary and clears when changing maps or leaving inspection. The graph and camera tour describe terrain; they do not simulate a craft.
