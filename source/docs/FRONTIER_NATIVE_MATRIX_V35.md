# Frontier native size and terrain matrix

Receipt: `outputs-desktop-test-wHrpxu/report.json` — passed on private desktop v35.2, with keyboard button activation.

The actual layout picker generated twelve fresh arrangements: four sizes on flat, symmetric valley and symmetric irregular terrain. Each used 35-degree rotation, a 2,400-unit radius, terrain adaptation enabled, and exact targets of 9/16/24/32 structures per team. Seeds and candidate seeds are retained in the report. This is native generation and application, not merely importing source-generated layouts.

Each case checks that Preview leaves the map unchanged, Apply preserves terrain and retains both reservations, the exact target count is met, Undo restores the source, and Redo restores the applied map. Twelve generated project JSON files and 24 overhead/ground screenshots are retained beside the report. All cases passed; no renderer exceptions were recorded. The original input fixture's hash remained unchanged.

## Visual review findings

Six screenshots were inspected directly: flat-small preview, flat-massive preview, valley-large ground, irregular-small ground, irregular-massive preview, and valley-standard preview.

- The starter yard has separated service pads and defenses around a compact cell pair. The massive form spreads across four positions around the retained empty strip.
- Original models follow the sampled non-flat terrain in the inspected ground views. These views do not certify terrain collision or every model contact point.
- The purple expansion strip is readable in the larger overhead views. At starter inspection zoom it is partially outside the camera frame. A whole-base-and-reservation inspection frame would improve this workflow.
- Power icons dominate the distant overview. Users can toggle them off, but final catalog images should use restrained overlays and closer framing.
- Sampled route inspection reports tight-clearance warnings for some fitting candidates, including the flat massive, valley standard and irregular massive views. These are retained findings, not suppressed failures. Candidate selection currently says “fits” without summarizing these route warnings; surfacing route quality alongside each option is the next usability improvement.

## Scope

This closes the native size/non-flat generation gate for these twelve representative cases. The earlier 192-case source matrix provides deterministic seed variation and rejection evidence; the current run is not twelve seeds per size per terrain. Full visual seed comparisons, final family card assets and review of the documented findings remain open. Frontier stays experimental and the reviewed catalog remains at 15 families. Game/server and novice-user gates are unchanged.

See [Frontier Camp user guide](FRONTIER_CAMP_USER_GUIDE.md) for placement, expansion editing, portability and limitations. No application source changed in this matrix sprint; v35.2 remains the latest private build.
