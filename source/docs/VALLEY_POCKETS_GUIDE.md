# Valley Pockets

Valley Pockets arranges powered side yards along an open central passage. Alternating yards offer several positions along the route instead of one continuous wall. It is admitted under the editor-quality gates and requires a broad, fairly gentle area.

## Place a base

Open **Base builder → Browse base library → Creative → Valley Pockets (next promoted build; Experimental in v99)**, then choose **Preview on current map**. Choose a size, move or rotate the paired bases, and preview the options before applying.

| Size | New structures per team | Side yards per team |
| --- | ---: | ---: |
| Starter | 10 | 2 |
| Standard | 15 | 3 |
| Fortified | 20 | 4 |
| Massive | 30 | 6 |

Zero in the count field uses the size minimum. Higher counts add defenses within the existing yards. A target may be rejected when it cannot fit; increase size, lower the count or reroll. Existing map buildings are retained and excluded from the new-building count. The count limit of 120 is an input limit, not a promise that every requested count fits.

The main passage and branch approaches are fixed parts of the design. Custom entrance directions are unavailable. Terrain adaptation can move whole yards within bounded windows; it does not reshape the terrain. Preview may reject steep ground, insufficient power reach, tight service access or conflicts with buildings and saved constraints. Move or rotate the base and preview again.

## Save and reuse

Private v99 supports **Save active formation as favorite**. The favorite contains the generated group and its passages; other buildings are excluded. It retains the chosen count and fitted yard positions. Reuse moves and rotates that fixed arrangement and checks its new destination. It does not reroll or silently move the saved yards.

Use **Export My bases** in the library to create a portable version-7 library file. Import shows a preview; Cancel preserves your library, while Apply imports the entries. Older builds may reject version 7.

If you edit generated buildings, rename passage reservations or add authoring rules, capture may ask you to save the whole map. This preserves changes that the generated recipe cannot represent. Keep the map project as the complete editable source.

## MCP

`capture_formation_favorite` returns a portable library document from the active formation. `place_formation_favorite` previews or applies one library entry as a new layout. Supply the current session/revision and an explicit previewOnly value. These tools require a favorite-capable host such as private v99; the v96 installer does not contain them.

## Evidence and remaining review

V99 native checks cover GUI library export/import, restart, capture and reuse, retained destination buildings, transformed coordinates, and Undo. A 96-case source matrix covers size, terrain, count and seed variation. These checks do not prove vehicle collision, service-pad entry or competitive balance in game. The 24-case native matrix covers four sizes, three synthetic terrains and default/expanded counts at one seed with same-map reuse. Independent family admission review passed; Creative presentation requires the next promoted build.


## Inspected desktop views

The fortified 24-per-team favorite below uses original model sizes. The overhead view shows the alternating side yards and continuous passage; power badges can dominate at this scale. Use **Inspect building → Close building view** to examine individual service approaches.

![Valley Pockets overhead in v99](../tools/mcp/MapEditerMCP/outputs/mcp-native-test-q9TyDf/valley-restart-tZFjI1/Team-1-Overhead.png)

![Repair pad close view in v99](../tools/mcp/MapEditerMCP/outputs/mcp-native-test-q9TyDf/valley-restart-tZFjI1/Team-1-Repair.png)

These are editor inspection views of a flat snow fixture, not game driving evidence or a finished map.


## Composition and space

Minimum role budgets below are per team. All use the editor's original models at their original physical size. The first yard contains the uplink and repair pad; the second contains refuel. Each yard has two power cells. Extra count requests add gun, flak and missile defenses rather than more service buildings.

| Size | Power | Uplink | Repair | Refuel | Gun | Flak | Missile | Darklight |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Starter | 4 | 1 | 1 | 1 | 2 | 1 | 0 | 0 |
| Standard | 6 | 1 | 1 | 1 | 4 | 2 | 0 | 0 |
| Fortified | 8 | 1 | 1 | 1 | 5 | 3 | 1 | 0 |
| Massive | 12 | 1 | 1 | 1 | 7 | 4 | 2 | 2 |

Required original asset tokens are e (power), u (uplink), r (repair), f (refuel), g (gun), s (flak), L (missile) and d (Darklight), as used by the chosen size/count. Missing required team models reject the candidate.

For the library sample seed `library-valley-pockets-v1`, local passage-and-yard bounds are approximately 2126 × 1918 u (Starter), 2820 × 2330 u (Standard), 3738 × 2236 u (Fortified), and 5319 × 2344 u (Massive), rounded upward. These are example bounds, not fixed dimensions for every seed. Rotation, terrain shifts and the second team's mirrored placement also need room. The initial placement radius is 3300 u per team; preview verifies the actual fit.

## Terrain and access limits

Yards start 650–950 u to either side of the spine, with 260 u local yard envelopes. Generation may shift a whole yard up to 160 u along the spine and 140 u across it, in 20 u steps. It keeps at least 600 u setback and 320 u station separation. Favorites retain their saved shifts and do not adapt them again.

Placement samples building support and route terrain against the stricter of 18 degrees and the map's saved maximum slope. The central passage is 240 u wide; branches are 120 u and service connectors 80 u. Final checks include a 96 u service clearance criterion and the saved spacing/protection rules. These are conservative editor estimates, not a vehicle collision simulation.

The family generator uses a conservative power reach of `max(0, min(saved service radius, 280) - 10)` u. Lower saved radii are honored; with the usual 300 u saved value this family uses 270 u. The general power inspection overlay may show its separate 290 u estimate. Neither value establishes a newly measured engine rule; check in-game behavior separately.

## Seed variation

These local schematic samples show how station spacing, setbacks, branch skew and side order vary while the open-spine identity remains fixed. Circles represent model bounds, not resized game buildings.

![Fortified Valley Pockets seed comparison](../outputs/valley-pockets-large-schematic.png)


## Service-yard relationship

This wider oblique view places the repair pad on the passage side of its yard. Two highlighted power cells sit behind it, with the remaining command/defense buildings farther into the yard. The cyan lines and circles are editor inspection overlays; the purple outlines reserve the branch and main passage. The separate close view above shows pad detail.

![Service yard with neighboring buildings and reserved branch](../tools/mcp/MapEditerMCP/outputs/mcp-native-test-q9TyDf/valley-restart-4jo5BA/Team-1-Service-yard.png)
