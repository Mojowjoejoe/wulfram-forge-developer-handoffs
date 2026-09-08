# Inspect and follow authored corridors — v20

Private R6/R8 continuation after [corridor authoring](AUTHORED_CORRIDORS_V19.md).

## Inspect a saved connection

In Base builder, open the **Approach or corridor** dropdown in Route inspection. Authored paths appear as **Corridor · [name]**, alongside automatic service approaches. They are available even when the map has no repair/refuel pads. Unsaved corridor previews do not appear in this list; Apply the corridor first.

Selecting a corridor follows the saved first-to-last point order. The inspector initializes assumed vehicle width from the reservation width, rounded to its 10-unit step and limited to the existing 20–400-unit inspection range. The saved reservation width is shown separately. Changing inspection width does not change the corridor or map.

If assumed width exceeds the reservation, a notice explains that additional clearance relies on unreserved space. A reservation larger than 400 units is still stored unchanged; this inspector cannot test a vehicle wider than 400 units.

Scrub Route progress or choose Follow route for the existing 250 u/s camera tour. Pause to orbit, and use warning buttons to focus an issue. Manual camera movement pauses playback. Editing the map resets route selection/playback so old path state does not remain attached to edited geometry.

## What the checks mean

Authored corridor inspection checks buildings from all teams, regardless of the team's placement-rule scope. Endpoint service buildings are included; automatic service approaches retain their drive-on-pad exception. This prevents a corridor reservation aimed at a building center from appearing clear merely because the endpoint is a repair pad.

Building clearance uses continuous segment distance and conservative building circles. Terrain is sampled along the route at roughly 40-unit intervals and at the center and both sides of the assumed vehicle width. Steep terrain and map-edge crossings are reported. Sampling can miss narrow terrain features; the camera tour is not a vehicle simulation, collision test or proof of drivability.

Automatic approach failures and malformed authored metadata are reported separately. During a generated formation preview, saved-layout corridors are omitted so they are not presented as constraints belonging to that different candidate. Apply/Undo and the existing project rules remain separate from read-only inspection.

## Verification

Source tests cover pad-free corridor discovery, retained point order, source preservation, preview exclusion and strict authored endpoint checking. Existing route tests cover arc-length travel, width-dependent building clearance, terrain and map edges. Native acceptance selects a saved corridor, checks its initial width and wider-than-reservation notice, follows/pauses the camera and verifies the map revision is unchanged.

```powershell
node tools/test-product-baseline.mjs dist/desktop/corridor-inspection-v20/WulframForge.exe outputs-stamp-lab-IdQbRb/Landform-visual-lab.zip --districts
```

Accepted private build: `dist/desktop/corridor-inspection-v20/WulframForge.exe`, version `0.7.0-creative.20`. Verified SHA-256: `21724D31806F8080A9F0CD98598A49F578B776FB5257BE1E6CB8339BB5882BB1`.

All five stages passed in `outputs/product-baseline-owsEKQ/report.json`: 247 source tests passed with one existing fixture skip (248 total), typecheck, combined landforms, creative bases and randomized maps. Native receipts: `outputs-desktop-test-jF8EVa/report.json`, `outputs/creative-native-Y36L01/report.json`, and `outputs-desktop-test-a0MPzn/report.json`. The creative receipt confirms corridor discovery, reservation-width notice, camera following and unchanged map revision. Visually reviewed `outputs/creative-native-Y36L01/corridor-inspection.png` for the corridor overlay, width controls and paused tour.

Direct point editing, district connections that move with their buildings, constraint-aware partial rerolls, game driving trials and the complete roadmap remain open.
