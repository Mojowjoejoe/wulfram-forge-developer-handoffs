# Terrain designer first upgrade — RC32

Delivered: Hills (legacy default), Valleys (subtractive depressions), Mixed (alternating raised/lowered paired clusters). Independent minimum/maximum depth controls, existing peak controls, shared radius and pair count. Same seeds reproduce results. Existing hills retain their random sequence and output. Stored mode/depth survive replay and replacement without stacking.

Preview: grey protected-area overlay (toggle), orange raised terrain, blue lowered terrain compared with current map. Protection uses merged SVG row paths. No protection bypass. Ice/snow/lava textures added to the available detail materials; cosmetic only. Rejected results offer gentler, smaller settings requiring a fresh preview, never auto-apply. Protected space can mean fewer pairs; Mixed may show only hills if only one pair fits.

Scope: terrain-detail dialog, not the whole balanced generator. Landforms remain bounded elliptical clusters, not connected river/valley networks. General biome automation, setting locks, broad noise layers and connected landforms remain future work. All supplied source maps are preserved.

Checks: 2 new valley tests; 6 existing critic/replacement tests; 110 main tests pass with 1 existing skip. TypeScript and scoped lint pass. Full repository lint fails on unrelated existing files (MCP, forest/three-lane scripts, accent-pattern tests). Those files were not altered for this work.

Actual RC32 EXE UI receipt: outputs-desktop-test-PFO4qd/report.json. Icebound imported; valley-only lowering and Mixed both-direction changes verified, entities unchanged, apply/undo/redo/replacement/save/relaunch passed. Mixed protected preview inspected. The existing intentional neutral-outpost power exception remains narrowly scoped and visible in full diagnostics; it was not broadened.

Package: dist/desktop/WulframForge-0.7.0-rc.32-win-x64-self-contained.zip

SHA256: 2412e7a6e6bdf7f0595996f668d8ff73d29a3a424377a1ac226c14e9d308603b

Unsigned private build. Existing large-bundle/WindowsBase build warnings remain. In-game traversal and balance remain unverified.

Usage: extract RC32, run WulframForge.exe, open a supported map, choose Terrain detail, select Landform mode, set depth/height and radius, Preview terrain, inspect protections and checks, then Apply terrain detail. Existing detail can be replaced from its verified baseline. Later manual terrain changes still reject unsafe replacement.
