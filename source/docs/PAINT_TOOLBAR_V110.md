# Paint toolbar controls - private v110

Paint now shows Strength and Edge in the top toolbar, matching its existing inspector and the shared brush operation. Previously these controls were hidden only for paint despite affecting texture application. No brush algorithm, map format or MCP schema changed; `edit_terrain` editor-v1 already exposes both values. MCP synchronization passed.

Private EXE: `D:/WulframForgeBuilds/paint-toolbar-v110/WulframForge.exe`, SHA-256 `e42709d748dbe0ab8982a99652d8fdf7dab3bb78da53ddda7c275303582a1760`.

TypeScript passed (`outputs/paint-toolbar-v110-typecheck.log`). Independent source review found no actionable defect. Native receipt `D:/WulframForgeTestRuns/outputs-desktop-test-Iz3wjK/report.json` passed bidirectional paint settings, material selection, keyboard radius, mode changes, compact layout and unchanged saved map; renderer errors empty. `paint-toolbar-960.png` was opened and reviewed: both controls fit and match the inspector. This is scoped UI verification, not a new 54-case algorithm run or combined baseline. Existing unrelated whitespace in editor-app remains unchanged. Build log: `outputs/paint-toolbar-v110-build.log`.

V109 remains the accepted combined baseline and installer. No commit, push or publication.
