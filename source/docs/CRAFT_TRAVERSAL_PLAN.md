# Craft hill-traversal preview - requested scope

User request: show whether and how a craft can climb a hill and pass over its crest. This requires motion and capability evidence, not merely an animated terrain-following camera.

Proposed Test drive workflow: draw/edit a route, select a craft profile and approach speed, then play/pause or scrub a ghost craft. Show a synchronized distance/elevation cross-section and the predicted craft pose, speed, crest clearance and landing. Surface the specific limiting condition when a run stops. Craft choice is pending user preference; Tank/Scout comparison is supported by the proposed design, not implemented yet.

Current source evidence: `lib/route-inspection.ts` samples terrain every 40 world units and across assumed width, uses conservative building circles, and flags slopes above the lower of 18 degrees and map validation slope. These thresholds are editor diagnostics, not confirmed craft limits. `routeCameraPose` follows sampled elevation plus 70 units; it cannot establish acceleration, traction, hover response, stalls, airborne motion or safe landing.

Implementation requirements:
- Obtain authoritative craft dimensions and movement equations or measured reference trials; retain provenance and unit conversions. Do not invent verified Tank/Scout constants from generic slope thresholds.
- Shared bounded read-only evaluator with deterministic replay, finite inputs and explicit unknown/estimated results. Account for approach direction, footprint, grade changes and lateral clearance. Validate the motion model against held-out hill/crest trials before claiming passability.
- Interactive route drawing, visible ghost and elevation graph; changing terrain invalidates results. Keep inspection paths and ghost visuals out of terrain exports.
- MCP exposes the same evaluator and evidence fields. GUI and MCP agree, failed requests preserve state, and inspection creates no map Undo entry.
- Fixtures include flat ground, gradual hill, abrupt crest, narrow ridge, building obstruction, off-map route, low/high approach speed and comparison with real craft trials. Source/UI playback proof and game-physics accuracy remain separate gates.

The user request is part of R8/R9. No traversal simulation is implemented or accepted by this document.


## V111 terrain-profile source checkpoint
Implemented `lib/route-elevation.ts`, the RouteInspector elevation graph and shared MCP elevation output. Samples include every route corner with spacing at most 40 units or half a terrain cell. Heights use the editor's triangle interpolation. Signed interval grades and sampled extrema can miss subinterval peaks; no craft pass/fail is claimed. GUI tracks the existing route progress; user-drawn test-drive paths, craft ghost, speed inputs and motion model remain unfinished.

Source checks: 14 targeted tests passed in `outputs/route-elevation-source-final-2.log`; TypeScript passed in `outputs/route-elevation-typecheck-final.log`, before a subsequent constant-only budget comparison fix; MCP synchronization passed. Independent review found missing height buffers could fabricate flat results and response samples lacked a combined cap. Both were fixed, plus an oversized-budget comparison typo; regressions cover these cases. Native graph/scrubber and MCP receipts are still required. V109 remains accepted combined/installer; v110 is the scoped paint-toolbar build.

Physics search: the installed client at `C:/Program Files (x86)/SlurpySoft/Wulfram` contains a game executable, data and navigation help. Its `data/client_params` exposes presentation/client settings, not a sufficient movement model. The current editor checkout and accessible BlackwaterGaming Wulfram repository list did not yield engine physics source. This limited search does not prove source is unavailable elsewhere. Full simulation remains an active requirement.
