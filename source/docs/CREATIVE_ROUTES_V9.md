# Route inspection and display options sprint v9

Private desktop build: `dist/desktop/creative-routes-v9-release/WulframForge.exe`, version `0.7.0-creative.9`.

SHA-256: `1863E1E19C9C41397BCFADED34C7C0C0B236C94D20C9B79C55EC5CB906463617`.

## Route inspection

The right inspector now offers reachable repair/refuel approaches for the visible formation. Routes are checked from the current entities and terrain rather than trusting old saved route metadata. It works with both the active layout and a valid creative preview. Each selected approach is shown in cyan and runs from the battlefield toward its service pad.

- Follow route moves the editor camera at 250 world units per second. Pause stops it; the progress slider scrubs by distance along the route, not by waypoint count.
- Mouse navigation, wheel navigation, Home, and keyboard camera controls pause the tour. Focusing a base/building also pauses it. Changing map/preview or hiding route controls stops the previous tour.
- Assumed vehicle width ranges from 20 to 400 units, default 80. Increasing it checks the same route; it does not generate a wider alternative route.
- Red markers indicate insufficient estimated clearance or sampled terrain/boundary problems. Yellow indicates less than 40 additional units of clearance per side. Markers keep a fixed screen size so they remain usable at close range.
- Click a warning in the list for an overhead view of that gap and corresponding route progress. Clicking a map marker also focuses its location. The warning list scrolls independently and displays at most 30 entries; the summary reports the full count.
- With no reachable route, the inspector explicitly requests a route instead of claiming that clearance passed.

Building clearance uses continuous segment-to-footprint-circle distance. Terrain is sampled every 40 units at the route center and both sides of the chosen vehicle width, with an 18-degree maximum or the stricter map rule. The destination service pad is treated as drive-on. Other pads remain obstacles.

## Display options

Open **Display options** below Base Layout States in the left sidebar. Controls are grouped for power tint, power status icons, power circles, estimated Darklight circles, estimated turret ranges/blind spots, access routes, building-area circles, entrance guides, inspection power links, route controls, and clearance markers.

**Show display overlays** is the master visibility switch. Individual selections are retained while it is off. **Reset display options** restores the defaults, including power overlays on and estimated weapon/Darklight overlays off. These controls affect display, not generation, saved map contents, or validation. Preferences apply to the current editor session; they are not persisted across app restarts. Generation controls such as terrain adaptation and access checking remain in the formation designer.

## Critic loop and validation

Used the established single-agent review, reproduce, repair, retest, and native screenshot workflow, not an independent multi-agent audit.

- Route, building inspection, and camera tests: 7 passed. New route cases cover arc-length interpolation, endpoints, continuous clearance between sparse waypoints, width-dependent tight/blocked results, pad exemptions, invalid widths, slopes, boundaries, and source preservation.
- Workflow 4/4 and critic regressions 6/6 passed.
- Main suite: 111 passed, zero failures, one existing skip. Log: `outputs/creative-routes-v9-main-tests.log`.
- TypeScript, scoped application/library lint, desktop web build, and Windows packaging passed.
- Native trial checks cover playback advancement, pause stability, manual-camera interruption, warning focus, display toggles/reset, and the prior camera/inspection, three-option, save/export, favorite, undo, and terrain trials.

Review fixes: corrected the empty-route message; sampled width at the final endpoint; replaced oversized world-space warning spheres with fixed-size markers; made warning focus overhead; used readable building names; expanded sliders and limited warning-list height. Initial visual evidence is retained at `outputs/creative-native-InV4nf/`.

Final packaged-build native report: `outputs/creative-native-XsPYAW/report.json` (passed). Visually inspected `route-clearance-warning.png` and `display-options-hidden.png`; the warning view frames the gap with small markers, and the options view shows overlays hidden while the map remains intact. The final harness also verifies that hiding route controls during playback stops the tour and reopening them starts paused at zero progress.

## Limits

This is an editor camera tour and a conservative clearance estimate. It does not simulate a vehicle, steering, turning radius, collision meshes, firing, concealment, or live server power. Terrain sampling can miss smaller features; building circles can reject usable gaps. Reachable routes come from the existing sampled access checker; unreachable pads appear in its explanation and have no successful route to follow. No in-game driving or public publication occurred.
