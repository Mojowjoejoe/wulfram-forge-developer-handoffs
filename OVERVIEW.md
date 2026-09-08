# How Wulfram Forge works

This public source snapshot corresponds to the v112.1 handoff. It is intended for developer review; the whole product roadmap remains in progress.

## Architecture

`source/components/editor/editor-app.tsx` coordinates the project, selected tools, previews, commits, and undo. The terrain viewport renders the Three.js scene and handles map interaction. Shared functions in `source/lib/` implement terrain, base generation, constraints, inspection, and serialization.

`source/desktop/WulframForge/` contains the .NET 9 Windows host. WebView2 displays the bundled web editor. Its local MCP bridge dispatches requests into the same live editor state through `source/lib/use-mcp-bridge.ts`.

The integrated and standalone Node MCP servers provide schemas and session transport. Requests target an explicit editor session. Mutations use revision checks and shared editor operations; a disconnected submitted write must not be automatically replayed.

## Map-making workflow

1. Open an existing project or create terrain.
2. Shape it manually with brushes/stamps/lanes, or preview generated terrain.
3. Place or generate bases, adjust their layout, and preserve access routes.
4. Inspect clearance, coverage, and terrain profiles.
5. Save the editor project and export the appropriate map format.

Temporary inspection paths are editor-only. They do not author a corridor or change the exported map. The v112.1 inspector measures terrain along those paths; it does not simulate craft motion.

## Important source areas

| Path under `source/` | Responsibility |
| --- | --- |
| `lib/manual-terrain-brush.ts` | Shared editor brush behavior |
| `lib/terrain-lane.ts`, `lib/lane-path.ts` | Lane shaping and geometry |
| `lib/route-elevation.ts` | Bounded sampled height and signed-grade analysis |
| `lib/inspection-routes.ts` | Saved and temporary inspection routes |
| `components/editor/route-inspector.tsx` | Route selection, drawing, and inspection controls |
| `lib/use-mcp-bridge.ts` | Live editor MCP dispatch |
| `tools/check-mcp-sync.mjs` | Integrated/standalone synchronization check |

## Evidence and limits

The original private handoff recorded v109 as the latest full combined baseline and v112.1 as a later scoped inspection build. The public copy contains source and curated documentation, not all historical native-run artifacts. Public-copy checks are described separately in the privacy review.

Remaining work includes broader base manipulation, hybrid/constraint composition, 27 additional creative families, performance/accessibility benchmarks, more complete examples/help/migration coverage, and novice/clean-machine/game/server trials. Contested-point terrain does not imply automatic capture or victory mechanics.

The separate physics experiment is a reconstructed candidate. Its rectangular-cell terrain compatibility patch is included and already applied to that candidate snapshot. It is not an editor runtime dependency in this handoff, and its tests do not establish original-game fidelity.
