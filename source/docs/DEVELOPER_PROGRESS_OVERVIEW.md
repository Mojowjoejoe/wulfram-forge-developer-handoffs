# Wulfram Forge — developer progress handoff

Prepared September 8, 2026. This ZIP is a local working-source snapshot for developer review, not a Git release or a claim that the whole roadmap is finished. Nothing was pushed or published. Start with this file; historical source documents contain older build references and workstation paths.

## What is included

| Location | Purpose |
| --- | --- |
| `builds/latest-v112.1/WulframForge.exe` | Latest scoped private desktop build, including temporary path drawing and elevation inspection |
| `builds/accepted-installer-v109/` | Installer for the last full combined baseline; it does not contain the newer v110–v112.1 UI additions |
| `source/` | Current editor, native Windows host, integrated and standalone MCP, source tests, build tools, docs and examples; includes uncommitted work |
| `evidence/` | Selected acceptance receipts and screenshots; historical absolute paths identify the originating tests, and not every linked artifact is included |
| `physics-experiment/` | Separate third-party solver source with its license, local compatibility patch and isolated evaluation results; not integrated into the editor |
| `MANIFEST.json` | SHA-256 for every packaged file except the manifest itself |

No Git history, installed dependencies, build caches, application profiles, credentials or separately extracted game collision assets are intentionally included. Editor runtime assets under source/public remain included because the editor needs them. Keep this a private development review; this handoff is not public distribution clearance for game assets.

## Try the current editor

1. Extract the ZIP completely to a writable folder on Windows x64. WebView2 Runtime is required. The portable EXE bundles .NET; Node.js is not required just to open it.
2. Run **Launch latest editor.cmd**. It enables the local MCP bridge and uses a separate runtime/profile folder inside this handoff, avoiding the normal editor profile.
3. Import `source/examples/terrain-measurements/hill-lab.json`.
4. Open **Bases → Inspect → Inspect routes**. Choose eastbound or westbound, then scrub Route progress to 50%. The example climbs 400 world units and descends 400; the graph shows approximately 14.6-degree slopes.
5. Choose **Draw inspection path**, click two or more terrain points, then **Finish inspection path**. Clear removes it; Escape cancels while drawing. This does not create a saved corridor or modify terrain.
6. Try **Terrain → Lane tool** for terrain cutting: draw endpoints, adjust width/floor/shoulder/curve, edit handles, then explicitly Apply. Unlike inspection, this changes terrain with Undo.

The elevation graph and Follow route camera tour are **not craft physics**. They do not predict whether a Tank or Scout can climb, jump or land. Temporary paths clear on map/mode changes and are intentionally absent from exports.

## What the editor does now

- Imports/exports editable map projects and map packages, handles terrain, textures, skies, unit layouts and original assets.
- Manual raise/lower/flatten/smooth/paint/set-height brushes with round/square/diamond footprints, edge profiles, selection and protection. Paint Strength/Edge now appear in the top toolbar.
- Large landform presets and curved lanes with editable path handles, preview, protection and Undo.
- Searchable base libraries, personal/portable formations and districts, transforms, locks, authored areas, corridors and entrances, plus deterministic generation and partial composition features.
- Twenty-one reviewed creative base families, with size/count/seed variation. Variants are not counted as additional families; 27 families remain toward the target of 48.
- Power/coverage and route inspection, contextual menus/help, terrain elevation graphs and temporary inspection paths.
- A native MCP bridge exposing editor operations with session identity, revision checks, atomic changes, Undo and bounded requests. Supported operations and remaining gaps are documented in the source MCP READMEs and maintenance guide.

The full inventory and exact gaps are in `source/docs/PRODUCT_ACCEPTANCE_MATRIX.md`, `EDITOR_PRODUCT_ROADMAP.md` and `BASE_LIBRARY_AND_DESIGNER_PLAN.md`.

## How it fits together

`components/editor/editor-app.tsx` coordinates project state, tools, previews and commits. `terrain-viewport.tsx` renders the Three.js scene and handles terrain/unit interactions. Shared logic in `lib/` performs terrain, base, constraint, inspection and serialization operations.

`desktop/WulframForge/` is the .NET 9 Windows/WebView2 host. It bundles the web assets and hosts the local MCP connection. `lib/use-mcp-bridge.ts` dispatches native requests into the current React editor state. Integrated `tools/mcp/` and standalone `tools/mcp/MapEditerMCP/` provide the Node MCP server/client and schemas. Both copies must stay synchronized; see `source/tools/mcp/MapEditerMCP/MAINTENANCE.md`.

Recent paths:
- `lib/manual-terrain-brush.ts`: shared GUI/MCP editor-v1 brush samples; legacy MCP brush behavior remains separately compatible.
- `lib/terrain-lane.ts`, `lib/lane-path.ts`: lane geometry; `lane-path-overlay.tsx` supplies editor-only handles.
- `lib/route-elevation.ts`: bounded sampled height/grade analysis, with complete finite terrain checks.
- `lib/inspection-routes.ts`: saved or explicit temporary path inspection. Native terrain buffers are not used here.
- `components/editor/route-inspector.tsx`, `route-elevation-profile.tsx`: path selection/drawing controls, graph and camera tour.

MCP `inspect_routes` accepts optional `points` (2–32 X/Y pairs) in v112+. It returns only that path when supplied, including endpoint obstacles, without saving a corridor. Elevation output is labeled sampled-terrain-only and has per-route and combined response budgets.

## Developer setup and checks

Use Node.js 22.13+ with npm. Rebuilding the desktop additionally needs .NET 9 SDK. Internet access is needed for dependency restoration. From the extracted folder:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File '.\Verify handoff.ps1'
powershell -NoProfile -ExecutionPolicy Bypass -File '.\Setup dependencies.ps1'
powershell -NoProfile -ExecutionPolicy Bypass -File '.\Print MCP config.ps1'
```

Copy the printed MCP settings into the developer's client; the script does not modify it. Launch latest editor.cmd uses the same session folder. The MCP server uses stdio and the native bridge targets the running local editor.

```powershell
cd source
node tools/check-mcp-sync.mjs
node node_modules/typescript/bin/tsc --noEmit
node --experimental-strip-types --test tests/inspection-routes.test.mjs tests/route-inspection.test.mjs tests/route-elevation.test.mjs tests/mcp.test.mjs
npm test --prefix tools/mcp/MapEditerMCP
node tools/build-desktop.mjs --version 0.7.0-devreview1
```

Choose a new build version if that output already exists. The builder creates desktop web assets before compiling the Windows host. Directly building the csproj without the generated WebAssets.zip is insufficient.

Back at the extracted root, **Run native review.ps1** exercises the included EXE against an isolated hill fixture, GUI/MCP graph agreement, drawing/cancellation/source invalidation and full project preservation. It creates local test output. Some broader historical suites reference large generated fixtures omitted from this ZIP; selected acceptance receipts are included, not a self-contained replay of every historical run.

## Verified progress versus unfinished work

- **v109 combined baseline:** all 23 original workflow stages passed; 487 source tests passed and one existing test skipped. Final automated and independent audits passed. Installer install/reinstall/uninstall and installed MCP smoke passed separately.
- **v110 paint toolbar:** scoped native synchronization and compact-layout checks passed.
- **v111 elevation:** source geometry tests, native graph/MCP agreement, hill measurements in both directions and unchanged full project/editor state passed.
- **v112.1 temporary paths:** 27 targeted tests, TypeScript, MCP sync, native point picking/Finish/Remove/Clear/Escape, mode/source invalidation and independent review passed. This is the portable build in the ZIP, not a new full combined run.

Remaining work includes craft simulation and calibration, broader direct base manipulation, complete hybrid regeneration/constraint composition, 27 creative families, performance/accessibility benchmarks, complete example/manual/migration coverage and novice/clean-machine/game/server acceptance. No capture/scoring/victory support is implied by objective-shaped terrain.

## Physics experiment — separate from the product

Pinned candidate: https://github.com/baffler/Wulfram2-Physics-Core at commit `5f7ed8831691e86dd13d0d4437ae40445f3cc88b`. Its AGPL-3.0 license and source are retained. It is a reconstruction in progress, not proven original-client equivalence. Some jump/server configuration and collision handling remain provisional.

Both upstream C++ and C API suites passed locally with game collision assets supplied from the existing installation. Those assets are not included. A native probe exposed incorrect triangle selection for rectangular cells. The included local patch retains the square-cell branch and normalizes rectangular coordinates. After rebuilding, 507 height samples match the editor within 0.0001 units; both upstream suites still pass. Off-map behavior, normals, broader grids and motion fidelity are not covered by that result.

To build only the candidate library, use CMake 3.20+ and a C++17 compiler:

```powershell
cmake -S physics-experiment/Wulfram2-Physics-Core -B physics-experiment/build-core -DWULFRAM_PHYSICS_BUILD_PYTHON=OFF
cmake --build physics-experiment/build-core --config RelWithDebInfo
```

The snapshot already contains the patch; do not apply it again. Asset-dependent tests require locally supplied collision files and the documented CMake option. The probe/evidence scripts retain original research paths and need adjustment on another machine. Do not treat them as editor runtime dependencies. Next integration work: validated terrain transposition and bounds, craft configuration/unit checks, isolated motion traces, GUI ghost/playback and shared MCP evaluation.
