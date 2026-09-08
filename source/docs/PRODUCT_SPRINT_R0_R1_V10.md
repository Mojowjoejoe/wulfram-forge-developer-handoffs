# Product sprint v10: baseline, navigation and contextual help

Date: 2026-09-06. Private editor sprint; no gameplay or public-release claim.

## Delivered behavior

- A collapsible Map-making guide at the top of the tool rail links directly to sculpting, large landforms, base presets, random-map generation, inspection and save/export guidance. Existing tools remain available.
- An active-tool help card explains immediate edits versus previews, operation scope and Undo. All seven terrain modes have help; base editing and inspection have separate explanations.
- The shared overlay legend explains power icons/tints, routes, clearance warnings and estimated range limits. About records the current inventory, formats and recovery limits.
- Display preferences are versioned and stored separately from projects. Power tint/icons, range circles, grid, access routes and inspection overlays survive restart. Reset restores defaults; malformed data recovers to defaults, and unavailable storage is explained.
- Text-only toolbar actions gained icons and tooltips so Random base, Terrain detail and diagnostics remain identifiable in the compact toolbar.
- `npm run test:all` discovers every top-level `tests/*.test.mjs` suite. Existing focused commands remain intact.

## Acceptance matrix

| Area | Repeatable evidence |
| --- | --- |
| Source baseline | All 226 tests: 225 pass, one existing source-fixture skip; typecheck and scoped lint |
| Manual terrain | Native visual lab: five large landform starters, three seeds, actual textured previews, click placement, preview/Apply parity and Undo |
| Hybrid workflow | Same native process places a landform, previews/applies a 24-structure creative pair, follows/pauses an access route, checks Undo/Redo, exports ZIP, restarts and imports that ZIP |
| Recovery/preferences | Exact saved-project comparison after process restart; disabled power tint survives restart without map changes; malformed preference parsing tested independently |
| Creative bases | Existing native MCP suite: recent styles, power/inspection, rejected placement, three options, terrain trials, export and preserved layouts |
| Random maps | Native bounded search cancellation, invalidation, exhausted search and successful preview/Apply |
| Navigation | Native Tab/Enter task navigation and compact 1280×800 layout at 1.25 device scale; screenshot review |

Run from the repository root with Node 22.13+ and Windows WebView2:

```powershell
node tools/test-product-baseline.mjs dist/desktop/product-r1-v10-release/WulframForge.exe outputs-stamp-lab-IdQbRb/Landform-visual-lab.zip
```

The runner records the executable and laboratory hashes, runs source/type checks and native suites sequentially, stores per-step logs, and fails on a failed step or changed acceptance input. It uses existing local fixtures and the MCP SDK installed under `tools/mcp`. To create another flat laboratory, run `node --experimental-strip-types tools/build-stamp-visual-lab.mjs` and pass its printed ZIP path. Random search uses the preserved terrain-first fixture under the adjacent `balanced-map-evidence` directory; creative tests require the five-layout and v7 terrain trial fixtures.

## Roadmap status and limits

This delivers an R0 acceptance slice and the first R1 navigation/help implementation. It does not mark the entire R0/R1 roadmap complete. Remaining work includes a full visible-action inventory, protected landform acceptance on this exact build, dedicated manual-unit editing in the combined journey, novice-user observation, exhaustive keyboard operation, broader window/scale coverage and a complete task-workspace reorganization. Tooltips and automated navigation checks do not substitute for novice testing.

The baseline runner covers offline editor behavior. It does not verify vehicle driving, gameplay power/ranges, multiplayer balance, distribution on a clean machine, or every import format. The current large web bundle and WindowsBase build warnings remain.

The critic loop compared instructions against source behavior (correcting Flatten versus Set height), reviewed native screenshots, exposed compact-toolbar icon gaps, and tightened native keyboard event simulation. Failed/intermediate receipts are retained. An earlier overlapping native run failed its Undo comparison; the sequential full acceptance run passed without terrain code changes. Native workflows should run sequentially.

## Final private artifact and acceptance

- Executable: [WulframForge.exe](../dist/desktop/product-r1-v10-release/WulframForge.exe), version `0.7.0-creative.10`.
- SHA-256: `87674C8CC8413CDE25D036BC4A91123639EDAE1239DAFCB5F89E93C586625937`.
- Complete runner receipt: [report.json](../outputs/product-baseline-6BsVPt/report.json), **passed**, all five steps exit 0. Source tests: 225 pass, 0 fail, one existing template-source reconstruction skip. Typecheck and scoped lint passed.
- Combined native receipt: [report.json](../outputs-desktop-test-tFSQlF/report.json), no renderer errors. Preserved fixture hash and exact executable identity recorded there.
- Creative native receipt: [report.json](../outputs/creative-native-rJxu3o/report.json), passed.
- Reviewed native screenshots: [guide and inspection](../outputs-desktop-test-tFSQlF/combined-guide-inspection.png), [compact high-DPI guide](../outputs-desktop-test-tFSQlF/compact-high-dpi-guide.png).
- The compact screenshot intentionally shows protected placement refusing a map without authored route metadata; the message explains the manual-placement alternative. Navigation preserves the exported/reimported terrain.

No commit, push, repository visibility change or public distribution performed.
