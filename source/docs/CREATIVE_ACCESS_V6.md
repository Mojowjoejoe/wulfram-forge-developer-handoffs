# Creative placement and access sprint v6

Build: `dist/desktop/creative-access-v6/WulframForge.exe`, version `0.7.0-creative.6`.

Choose a creative formation in Base Layout States. Click or drag the terrain to position Team 1; Team 2 mirrors it. During dragging the yellow building boundary moves and Apply is disabled. Release generates and checks a fresh arrangement. Use the rotation and size controls for further adjustments, then Preview and Apply.

Green lines show sampled repair/refuel approaches to the central battlefield. Red crosses and sidebar explanations identify blocked approaches, boundary failures, overlapping structures, or rejected buildings. The Show preview access routes checkbox controls these map annotations. Failed candidates never replace the current map. Apply adds a separate layout with one-step undo.

## Critic loop and evidence

Single-agent review, reproduce, repair, retest, and native screenshot inspection, following the established critic loop. Fixed drag-coordinate tuple typing, Node strip-types compatibility, JSX escaping, pointer-leave behavior, and missing boundary/overlap diagnostics during review.

- 19 creative formation and sprint tests passed, including all 15 styles.
- 10 new access preview tests passed: small, standard, and massive Iron Anvil on flat, valley, and rolling-hill terrain, plus boundary rejection with source preservation.
- Workflow 4/4, reliability 6/6, critic regressions 6/6 passed.
- Main suite: 111 passed, zero failed, one existing skip; log at `outputs/creative-access-v6-main-tests.log`.
- TypeScript and scoped lint of changed application/library files passed.
- Native MCP/CDP trial: `outputs/creative-native-RgXH7W/report.json`. Passed dragging, Apply invalidation, rejected placement explanations, five creative styles, unchanged terrain and prior layouts, export round-trip, undo, exact counts, persistent favorites, and power overlays.
- Visually inspected `workshop-preview.png` and `rejected-edge.png` in that evidence folder; green routes and red markers render on the terrain with matching sidebar explanations.

## Practical limits

Access uses an 80-unit grid, conservative structure clearance, and sampled slopes up to 18 degrees. Routes connect service pads to a central free sample; this does not certify every exit, true vehicle collision, line of sight, or gameplay balance. Narrow passages can be conservatively rejected. Power and weapon/concealment range assumptions retain their existing labels and need server/game verification. At distant zoom, power badges can overlap; zoom in or toggle them off to inspect buildings. Generation failures caused by a too-small allowed radius use the existing text explanation.

The native trial used a flat comparison map; the valley/hill trials were library tests. No publication or in-game trial was performed.
