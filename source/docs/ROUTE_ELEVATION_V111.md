# Route elevation - private v111 verification

Build: `D:/WulframForgeBuilds/route-elevation-v111/WulframForge.exe`, SHA-256 `20a2f15e7b4821f794b172b5b1e2755cb817fd24cc541b2534cfca727e473f65`.

Bases > Inspect > Inspect routes now includes a sampled elevation graph. Route progress moves the graph marker while the existing camera follows the selected route. The graph reports sampled climb/descent and signed interval grades. It labels independent visual scales and states that craft motion is not simulated. This is the geometry foundation for [craft traversal](CRAFT_TRAVERSAL_PLAN.md), not the completed Test drive tool.

MCP `inspect_routes` returns the same `elevation` profile for each route, with 10,001 samples per route maximum and 20,000 total. Invalid buffers, off-map paths or exhausted budgets return an unavailable profile with no partial samples. Detailed heights follow editor terrain triangles; sampling can miss subinterval extrema. No map data or serialization changes.

Source: 14 route/elevation checks passed (`outputs/route-elevation-source-final-2.log`); 12 MCP checks passed (`outputs/route-elevation-v111-mcp-source.log`); TypeScript passed (`outputs/route-elevation-v111-typecheck.log`); MCP synchronization passed. Independent review corrected missing-buffer false success, the aggregate sample budget and an oversized-limit typo. The native MCP test now checks complete project and editor state around inspection.

Native GUI and standalone MCP runs passed. Logs: `outputs/route-elevation-v111-native.log` and `tools/mcp/MapEditerMCP/outputs/route-elevation-v111-native.log`. GUI receipt: `D:/WulframForgeTestRuns/outputs-desktop-test-a2ZHXL/report.json`; graph points match 284 MCP samples, the 50% scrub marker is centered, compact layout passes and renderer errors are empty. The screenshot was opened and reviewed. This GUI example is flat; analytic uphill/downhill/crest checks are source tests, not native hill or craft trials.

Standalone receipt: `tools/mcp/MapEditerMCP/outputs/mcp-native-test-NlELkw/report.json`; shared samples and budget matched, and complete before/after saved projects and editor state matched. Both native processes exited 0. Independent final review approved this scoped graph/MCP feature after checking the executable, receipts, full-state comparisons and compact screenshot. GUI receipt SHA-256 `f929bb7a51658cb9856477b705a89d6d7e878142902c2c8ba00050fcaee9980a`; MCP receipt SHA-256 `83f25f3527eb130155397bbd7762b2b69e6122adf64a2a823fdd0a1116a90eb4`. V109 remains the accepted combined baseline and installer. No publication or push.


## Native hill follow-up
The same v111 EXE passed an analytic 400-unit hill in both directions. `tools/mcp/MapEditerMCP/outputs/hill-elevation-native-u6Bmnu/report.json` has SHA-256 `5115a901e037d93bb5e1d7ea87f2d26415b82e515f44d767298e0ae50e43d761`. The fixture now lives at `examples/terrain-measurements/hill-lab.json`, byte-identical to the native import.

The dedicated harness `tools/mcp/MapEditerMCP/test-route-elevation.mjs` verifies exact full fixture import, corridor identities and coordinate order, forward/reverse sample pairing, ascent/descent, analytic grades, sampled crest, GUI graph/MCP agreement, centered crest scrubbing and complete read-only state preservation. Both compact screenshots were reviewed across the original/corrected runs. The original p7Fj8e report remains; critic-requested stronger direction assertions and unique save names were tested in the corrected u6Bmnu run. Final independent review approved the corrected native hill evidence after checking executable, fixture, snapshots, screenshots and all 193 samples in each direction. This closes the native non-flat profile example gap; ghost craft and motion physics remain open.
