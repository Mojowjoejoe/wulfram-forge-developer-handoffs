# Authored preview cameras and discovery — private v84

Search **authored bases** in Find tools and settings to open the panel in Base builder → Build. The existing creative-preview guard remains: apply or cancel a creative generation preview before opening saved-layout tools.

After previewing an authored package, **Team 1/2 overview** and **Team 1/2 ground view** frame the proposed buildings directly. Buttons appear only for a valid preview and are disabled for an absent team. Camera requests recheck source identity and use candidate entity geometry. The panel stays available while navigating; the camera action does not apply the layout or enter another editing mode.

This addresses the distant whole-map view observed in v83.1. It does not add or remove buildings, alter constraints or change the portable format. Persistent authored-library storage remains separate work.

Source checks: TypeScript and changed-file lint pass (`outputs/authored-preview-v84-typecheck.log`, `outputs/authored-preview-v84-lint.log`). MCP synchronization passes. Independent review found no actionable camera or destination-routing issue. The existing v82 capture/placement tools retain the same behavior; this visual change needs no new MCP operation.

EXE: `D:/WulframForgeBuilds/authored-preview-v84/WulframForge.exe`.
SHA256: `F8CF33D4037B367A45A97237A4E26B34E22735800EA4C7AA9B22F523CA5F3B5B`.
Native receipt `tools/mcp/MapEditerMCP/outputs/mcp-native-test-0sUA3n/report.json` passes the existing MCP/authored GUI suite plus Tool Finder navigation and all four team camera actions. Each camera is checked against a complete unchanged map snapshot. All four `authored-team-*.png` images were opened: they show distinct team overview/ground framing and preserve the authored controls. Ghost building contrast remains weak against this untextured fixture's checkerboard terrain, and overview does not substitute for individual-building close inspection. Those readability checks remain open. The changed-camera result is accepted only as navigation evidence, not complete visual acceptance. No combined-baseline or game-play acceptance claim; v77 remains the combined baseline. No commit, push or publication, and no launcher selection change.
