# Creative formations v2 — critic loop

Five additions bring the randomized dropdown to ten styles: Relay Watch, Split Gatehouse, Trident Reach, Sheltered Harbor, and Fortress Archipelago. Existing styles remain available. Each adds a separate terrain-adapted layout; original layouts and terrain are preserved.

## Review, reproduce, repair, retest

Followed the single-agent workflow documented in CRITIC_LOOP_RC27.md. This is not an independent multi-agent audit.

- Reviewed site separation, varied budgets, required support, deterministic seeds, paired teams, placement failure and preservation behavior. Sampled all ten styles across 12 seeds each (120 layouts), with repeated generation to verify reproducibility.
- The native screenshot pass found that long formation names/counts were truncated in the narrow selector. Added a wrapping full name and style description beneath it. A new native assertion checks that the description is present and fits its container.
- Rebuilt and repeated the five new styles through the real dropdown. Verified one-step Undo, validation, unchanged terrain, preservation of all five pre-existing layouts, and multi-layout export/reopen. Inspected all five initial captures and final Relay/Archipelago captures after the shared label repair.

## Evidence

- 13 formation tests pass, including 120 seed cases, previous built-ins and too-small-map rejection.
- Main suite: 110 pass, one existing skip. Workflow: 4 pass. Reliability: 6 pass. Critic: 6 pass. Typecheck passes.
- Changed-file lint passes. Repository-wide lint remains failing in unrelated existing scripts/tests and MCP Zod deprecations; not a clean whole-repository lint result. Logs: `outputs/creative-critic-v2/`.
- Initial native run: `outputs/creative-native-oFyiZ1/report.json`.
- Final native run: `outputs/creative-native-0lvPXM/report.json` and five PNGs. All five new styles pass.
- Full packaged desktop workflow: `outputs-desktop-test-7PqCLt/report.json`. Import, terrain detail replacement, bases, Undo/Redo, archive export and process close/reopen pass.
- Private executable: `dist/desktop/creative-bases-v2/WulframForge.exe` (0.7.0-creative.2). Build retains existing bundle-size and WindowsBase reference warnings.

The inspected full-map screenshots prove UI readability and rendering, not detailed sightlines or vehicle collision. Power and Darklight assumptions remain provisional, large formations need sufficient space, and in-game access/combat/balance remain unverified. No source map was replaced, no user editor session was closed, and no public push was performed.
