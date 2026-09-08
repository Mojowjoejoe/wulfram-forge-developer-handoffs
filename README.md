# Wulfram Forge — Developer Handoffs

A reviewable source snapshot of the Wulfram Forge map editor and its Model Context Protocol (MCP) tools. This repository helps developers understand the editor, reproduce selected checks, and continue the roadmap.

**Snapshot:** the v112.1 developer handoff, prepared September 8, 2026. It includes temporary inspection paths and elevation profiles. Later experimental craft-motion integration is not part of this snapshot.

## What the editor does

- Opens, edits, and exports Wulfram terrain and map projects.
- Provides terrain brushes, landform stamps, curved lanes, and protected authoring areas.
- Generates and places base layouts, with size/count controls and portable preset libraries.
- Inspects building coverage, route clearance, and sampled terrain elevation.
- Exposes editor operations through a local MCP server, with explicit sessions, revision checks, and undo-aware edits.
- Runs as a web application or a Windows desktop application using WebView2.

The source includes 21 reviewed creative base families; the broader 48-family target and whole-editor roadmap remain unfinished. Terrain diagnostics do not establish real-game vehicle performance, competitive balance, or capture/scoring support.

## Repository contents

| Directory | Contents |
| --- | --- |
| [`source/`](source/) | Editor, Windows host, tests, build tools, examples, and project documentation |
| [`source/tools/mcp/`](source/tools/mcp/) | Integrated MCP server |
| [`source/tools/mcp/MapEditerMCP/`](source/tools/mcp/MapEditerMCP/) | Standalone MCP package and maintenance instructions |
| [`physics-experiment/`](physics-experiment/) | Separate third-party physics candidate and its original license; not integrated in this snapshot |
| [`OVERVIEW.md`](OVERVIEW.md) | Architecture, workflows, verified scope, and remaining work |
| [`PRIVACY_REVIEW.md`](PRIVACY_REVIEW.md) | Public-snapshot exclusions and review scope |

The original local handoff ZIP, installers, executables, dependency trees, application profiles, raw acceptance logs, and Git history are excluded from this public repository. This is a source handoff, not a downloadable desktop release.

## Get started

Install **Node.js 22.13 or newer** and npm. Desktop builds also require the **.NET 9 SDK** on Windows. Dependency restoration needs internet access.

From the repository root:

```powershell
npm ci --prefix source
npm ci --prefix source/tools/mcp
npm ci --prefix source/tools/mcp/MapEditerMCP
cd source
npm run dev
```

Follow the development server's printed URL. For a Windows desktop build:

```powershell
cd source
node tools/build-desktop.mjs --version 0.7.0-devreview1
```

Run that command from the repository root, or omit `cd source` if already there. Choose a new version if the output exists. The builder generates the web assets before publishing the desktop host; building the C# project alone is insufficient. WebView2 is required to run the desktop application.

## Run the selected checks

From `source`:

```powershell
node tools/check-mcp-sync.mjs
npx tsc --noEmit
node --experimental-strip-types --test tests/inspection-routes.test.mjs tests/route-inspection.test.mjs tests/route-elevation.test.mjs tests/mcp.test.mjs
npm test --prefix tools/mcp/MapEditerMCP
```

Historical native acceptance suites may require generated fixtures or workstation configuration that are not included. Historical documents retain their original scope and version labels; a passing selected check is not full roadmap acceptance.

## MCP and development

Read the [MCP setup guide](source/tools/mcp/MapEditerMCP/README.md) and [maintenance contract](source/tools/mcp/MapEditerMCP/MAINTENANCE.md). Keep integrated and standalone MCP behavior synchronized when changing editor capabilities.

Start with the [map-making guide](source/docs/MAP_MAKING_GUIDE.md), [product roadmap](source/docs/EDITOR_PRODUCT_ROADMAP.md), and [base designer plan](source/docs/BASE_LIBRARY_AND_DESIGNER_PLAN.md). Keep changes scoped and preserve existing maps, serialization compatibility, and user undo behavior.

## Third-party material

Existing notices are retained. The separate physics candidate has its own AGPL-3.0 license and provenance in [`physics-experiment/README.md`](physics-experiment/README.md). This snapshot adds no new blanket license grant over the editor or third-party game assets.
