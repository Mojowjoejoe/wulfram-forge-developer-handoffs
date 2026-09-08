# Temporary inspection paths - private v112.1

Draw an editor-only path by clicking terrain in Bases > Inspect > Inspect routes. Finish enables the elevation graph, clearance inspection and existing camera tour. Remove last point revises the path; Clear or Escape while drawing discards it. Changing the map, layout, inspection mode or route visibility invalidates the sketch. Paths have at most 32 points and are not serialized as corridors or map terrain.

MCP `inspect_routes` gains optional `points` (2-32 finite X/Y pairs). Omitting points preserves saved-route inspection. Supplying points inspects only that temporary path through the shared evaluator, including endpoint buildings. It does not create a saved corridor or modify the GUI sketch. The same sampling/response budgets and evidence labels apply. New optional points require desktop v112; native verification passed as recorded below.

27 targeted route/elevation/MCP source tests passed (`outputs/inspection-path-v112-source.log`). MCP synchronization passed. Source includes viewport click interception, source-bound sketch invalidation, explicit cancellation, paused playback when clearing/removing and caught clearance errors. TypeScript passed (`outputs/inspection-path-v112-typecheck-reviewed.log`). Independent source review caught a one-point draft incorrectly labeled as clear; the label now requires at least two points. Native interaction verification passed; independent final receipt review approved scoped acceptance. V109 remains the combined baseline/installer; v111 remains the scoped native elevation build.

This advances arbitrary route selection for the requested hill preview. It does not add a craft ghost, speed-based simulation or verified vehicle climb limits. Those remain required work in the full roadmap.


## Native v112.1 evidence
Private EXE: `D:/WulframForgeBuilds/inspection-path-v112.1/WulframForge.exe`, SHA-256 `9f75f76258d9cde4bd70aca6aea231909186556d873983c1b2a412c7ccabc58b`. Build and final typecheck logs: `outputs/inspection-path-v112.1-build.log`, `outputs/inspection-path-v112.1-typecheck.log`.

Receipt: `tools/mcp/MapEditerMCP/outputs/hill-elevation-native-bjRAcO/report.json`, passed with process exit 0. Real terrain clicks, incomplete-point message, Finish, point removal, Clear, Escape, mode invalidation and source import invalidation passed. Optional MCP points and invalid-path rejection passed. Complete project/editor state matched before and after inspection, before the deliberately separate new-source import. The same run retains analytic authored hill/crest/forward-reverse checks.

`temporary-path-960.png` was opened and reviewed. The drawn path is a short flat 69-unit segment; this is interaction evidence, not a drawn hill or craft-motion trial. The old v112 screenshot showed the previous corridor label while inspecting a temporary path; v112.1 corrects it and the native test asserts the displayed selection. Earlier yfbweK/OfNHOT runs remain as history. No public action occurred.

Final receipt SHA-256: `b2a118904263c2a8869e392c84772d377a951aa28af8cd3b50694242bf0efed8`. The critic verified executable/artifact hashes, exact project snapshots, corrected selection and source cancellation.
