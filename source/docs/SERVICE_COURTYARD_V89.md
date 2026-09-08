# Service Courtyard private v89

Private executable: D:/WulframForgeBuilds/courtyard-review-v89/WulframForge.exe

SHA256: 60c64740c189742dd126e4d9e3bc257dc1e7e9b6847eeac0a0f9b57af23bd536

Native reviewed receipt: D:\Documents\Wulframe\wulfram-mapeditor\tools\mcp\MapEditerMCP\outputs\mcp-native-test-94GMxB/report.json. PASS on all four sizes: expected per-team counts 10/15/21/33; correct style/version; six reservations and two ordered 80-unit sampled through-routes; unchanged full preview snapshot and history; one-step Apply; stale/duplicate rejection; preserved source terrain and older layouts; Undo; JSON save/reopen retains complete layouts, entities and terrain. Runs use an isolated profile. The earlier successful run is retained in outputs/courtyard-v89-native.log but lacked explicit size/route assertions; the reviewed rerun above supersedes it for those claims.

Independent review found the original harness could pass if size were ignored. Explicit counts/version and ordered route assertions fixed that gap; follow-up review found no further actionable issue. Scoped harness lint and MCP sync pass in outputs/courtyard-native-reviewed-{lint,sync}.log. Build/publish logs are outputs/courtyard-v89-{build,publish}.log.

Existing generate_base_layout exposes the candidate through shared code. Both MCP READMEs document v89 host dependency and preview semantics. No new tool or transport schema. The visual browser does not yet expose the candidate, so native MCP generation must not be described as GUI acceptance.

Original-model overhead/oblique review, GUI preview/Apply, portable-library round trip and final admission remain open. Seventeen admitted families remain; v88.1 remains combined baseline. Launcher selection is unchanged. Local source and private executable only; no commit, push or publication.
