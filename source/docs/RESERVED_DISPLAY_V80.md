# Separate reserved-area display — v80

Display options now separates **Building area circles** (the circular placement limit) from **Reserved areas and corridors** (authored outlines, expansion strips and terrain-protection areas). Entrance guides remains the directional placement guide. The master overlay toggle still controls their visibility. Hiding an outline never disables the saved rule.

Older saved preferences without the new areas field inherit the old boundaries value, preserving previous visibility; explicit new preferences remain independent. Reset enables both.

Private EXE: `D:/WulframForgeBuilds/reserved-display-v80/WulframForge.exe`
SHA256: `7081DF24C9FE1A5AF0B56C78A636AAF5C28C81C4C30E743E39DECD5460C6A20F`

Two preference/migration tests, TypeScript and changed-file lint passed. Independent review found no product regression. Native `D:/WulframForgeTestRuns/outputs-desktop-test-Sonhgg/report.json` PASS: independent preferences and identical saved map after toggles, followed by Undo/Redo and portable reuse/restart. The visible/hidden screenshots were opened and reviewed: the purple expansion outline disappears while other inspection overlays remain. This applied-map capture does not demonstrate a simultaneous preview circle; circle routing is verified in source.

MCP impact: display-only local preference, no map data, rules, operation, transport or serializer changes. Existing MCP generation/inspection remains unchanged. No commit, push or publication. V77 remains the combined baseline; v80 is scoped native acceptance.
