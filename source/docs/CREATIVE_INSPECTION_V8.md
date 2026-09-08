# Base inspection sprint v8

Private build: `dist/desktop/creative-inspection-v8-release/WulframForge.exe`, version `0.7.0-creative.8`.

SHA-256: `CF126FF2957A20FDE2886D3643DB9122773CC752A88B28570E09100A750B2263`.

## Use

Open Base builder and find Base inspection at the top of the right inspector. Each team has Overhead and Ground level buttons. Focus automatically enables inspection; preview options can then be switched without requesting another camera move. Home restores the map view.

Click a building or choose it from the Inspect building dropdown. A white ring marks the selection. Powered buildings show cyan rings and links to every qualifying friendly cell, plus the distance to the nearest source. Unpowered buildings show the nearest friendly cell outside reach, or explain that none exists. Buildings that do not require external power say so. Focus building gives a close overhead view.

Inspection uses the visible preview's entities and validation radius, or the active map's entities and rules when no preview exists. It uses the same center-distance rule as the existing power validator, including its ten-unit margin. Enemy cells are excluded. Switching options clears stale inspection rather than showing a building from the previous option. Invalid previews have no selectable preview structures.

Turn Inspect buildings off to resume dragging bases or normal unit editing. Inspection has a separate selection, so inspection clicks do not place, move, or select an editable unit. Existing source entities, undo history, and saved layouts are unchanged until an explicit editor Apply operation.

## Critic loop and evidence

Single-agent review, reproduce, repair, retest, and screenshot inspection followed the existing critic workflow. This was not an independent multi-agent audit.

- New tests cover exact power-boundary inclusion, out-of-range and enemy exclusions, multiple sorted sources, independent buildings, empty teams, narrow-aspect framing, and hillside camera elevation.
- Inspection, camera, and terrain suite: 30/30 passed (`outputs/creative-inspection-v8-tests.log`).
- Workflow 4/4 and critic regressions 6/6 passed.
- Main suite: 111 passed, zero failures, one existing skip (`outputs/creative-inspection-v8-main-tests.log`).
- TypeScript, scoped application/library lint, desktop web build, and Windows packaging passed.
- Native checks exercised all four focus views, powered and unpowered inspection, a real canvas click on a preview building, source preservation, stale selection clearing, and returning to drag placement. They also retained the previous sprint's option selection, export, favorite, undo, and eighteen terrain/size/option cases.

Review refinements: terrain occlusion is respected during selection; preview model surfaces participate in picking only during inspection; small buildings retain a nearby center-picking fallback. The native harness waits for Home's next rendered frame before testing subsequent dragging. Earlier evidence is retained in `outputs/creative-native-j7QJKM/` (initial harness timing failure), `outputs/creative-native-tdJJBA/`, and `outputs/creative-native-MfuLLh/`.

Final packaged-build native report: `outputs/creative-native-cYRtVw/report.json` (passed). The final `building-power-inspection.png` was visually inspected, confirming the selected building, cyan source links/rings, and matching power readout. Ground-level screenshots from the review also show the actual preview structures at close range.

## Limits

Ground level is an editor camera view, not a vehicle simulation. Terrain can obstruct the view naturally; use overhead, orbit, or Focus building to inspect another angle. Camera focus frames building centers with padding, not exact mesh extents. Power status remains an editor-rule result; server range and live gameplay are unverified.

This sprint implements camera focus and building inspection first, as proposed. Guided route following and automated tight-passage inspection remain future work. No map publication, game-server changes, or in-game driving occurred.
