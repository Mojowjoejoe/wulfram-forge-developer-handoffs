# Curved lane shaping

The Lane tool adds Curve / bend (-100% to 100%) after drawing two endpoints. Zero remains straight; either sign bends to the opposite side. At full bend, the midpoint moves sideways by half the endpoint distance. Width, shoulder blending, cut/cut-fill, mirroring, protection, preview and one-step Undo still apply.

MCP uses the same helper via optional `apply_lane.lane.bend`, requiring v107 or newer. A nonzero bend requires exactly two endpoints. Existing 2-32-point polylines work with zero or omitted bend. Curve application records terrainLane.last version 2; straight lanes retain version 1. No map format or new native dispatch action was introduced.

## Verification

- Source: 22 tests pass in `outputs/curved-lane-source-tests-reviewed.log`, covering curve direction, endpoints, straight compatibility, mirrored terrain, invalid bends, full footprint bounds and a protected height area only touched by the curve, plus MCP and operation-scope regressions.
- TypeScript: `outputs/curved-lane-typecheck-reviewed.log` passed. MCP synchronization passed.
- Independent source review found no actionable geometry or protection defect.
- Private v107 executable: `D:/WulframForgeBuilds/curved-lane-v107/WulframForge.exe`, SHA-256 `4606dfb04fa3e0eb342fda3c68e1774f087db5828a435a451beb46a66ed8081c`.
- Native GUI cut-only receipt: `outputs/outputs-desktop-test-tGbuCC/report.json`. Curved preview is nonmutating; Apply, Undo/Redo, cancellation, stale preview invalidation, and in-page MCP terrain equality pass. Only 25 vertices changed in this cut-only case.
- Native GUI cut-fill receipt: `outputs/outputs-desktop-test-eDEXs5/report.json`. Same checks pass with 8,234 changed vertices. Screenshots show the control and preview state, but the terrain contrast is insufficient to claim a comprehensive curve visual-quality review.
- Real standalone MCP receipt: `tools/mcp/MapEditerMCP/outputs/mcp-native-test-C1Ipmz/report.json`; log `tools/mcp/MapEditerMCP/outputs/curved-lane-v107-mcp.log`. Passed with curvedLane=true, native transport placement, metadata, stale revision rejection and Undo.

Review found that the operation banner still called the lane a preview after Apply. Source now derives that label from whether a valid preview exists, with a regression and native post-Apply assertion. The corrected private v107.1 build passed GUI and standalone MCP native verification (receipts below). The first banner-fix typecheck failed due to a wrong property name; it was corrected and the reviewed typecheck passed. Earlier evidence was preserved.

The accepted combined baseline remains v106. Full path control-point editing, long-curve visual review, game driving and whole-roadmap acceptance remain open. All changes and builds are local/private; nothing committed or pushed.


## Reviewed v107.1 build

- EXE: `D:/WulframForgeBuilds/curved-lane-v107.1/WulframForge.exe`.
- SHA-256: `425462b7116fd3747035c4c05e68523ebaa7e26d8aa15418fe505a57e61e6ffd`.
- Archive: `dist/desktop/WulframForge-0.7.0-v107.1-win-x64-self-contained.zip`.
- Build log: `outputs/curved-lane-v107.1-build.log`.
- GUI receipt: `outputs/outputs-desktop-test-3eZlHV/report.json`, passed, no renderer errors. Curved cut-fill preview, Apply, cancellation, revision invalidation, Undo/Redo and in-page MCP equality passed, including the corrected post-Apply banner assertion. Applied screenshot confirms the banner now says Draw a lane to preview.
- Standalone native MCP: `tools/mcp/MapEditerMCP/outputs/mcp-native-test-4zajvT/report.json`, passed, curvedLane=true, exact executable hash above.
- Independent follow-up source review confirmed the banner fix and its regression; no further bounded source finding.

This is a scoped private feature build. V106 remains the last accepted combined baseline and the installer remains v96. Neither the launcher selection nor public repositories were changed.
