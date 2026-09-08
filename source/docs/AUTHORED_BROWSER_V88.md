# Authored bases in the visual browser v88.1

Private EXE: `D:/WulframForgeBuilds/authored-browser-v88.1/WulframForge.exe`.
SHA-256: `59714EA0DAFEE2BAB528CFC87E54926116736407F879DC527B535CF79FAF199E`.

The main Base library now includes an Authored bases collection. It uses current profile storage, searchable labels/source/district names, role/count/trait filters and fixed-arrangement filtering. Cards show all saved teams, full package district/area counts and a diagram-only geometry projection. Center span is explicitly labeled; it is not occupied footprint or fit evidence. Missing supported models disable placement. Source storage changes refresh the browser; a stale selected raw value cannot hand off silently.

Preview on current map loads the complete package into authored placement controls without modifying the map. Its saved team IDs, poses, districts, rules and areas travel in the original package, not the diagram template. Every browser handoff clears prior authored candidate state so choosing a different manual template works. Apply uses the existing shared authored operation and one map Undo step. Management remains in Saved authored bases; the unrelated formation-favorite manager is hidden while viewing the authored collection.

MCP impact: this changes discovery and GUI handoff, not package/storage semantics. Existing inspect_authored_library returns the same complete packages; place_authored_base and library operations remain the automation counterparts. No new tool or transport behavior; synchronization passes.

Source evidence: `outputs/authored-browser-tests.log` contains 14 passing base-browser/authored-library tests. New assertions cover all-team composition, source immutability, complete package handoff data, district search, center span and missing assets. TypeScript and scoped lint pass in corresponding logs. Independent review found preview-state carryover, team-1 filtering and misleading footprint labeling; all were fixed and accepted in a second review.

Initial v88 native EHnt70 passed browse/handoff with unchanged full-map snapshots, one Apply/Undo and clearing a candidate before manual-template handoff, plus prior authored/library/portable/general MCP acceptance. Its screenshot revealed the confusing unrelated favorite-manager count; v88.1 hides that row in the authored collection.

`tools/mcp/MapEditerMCP/outputs/mcp-native-test-aWuInJ/report.json` is the final v88.1 PASS receipt on the hash above, covering the same browser and authored/library/portable/general MCP workflows. The final authored-browser.png was opened/reviewed: the misleading favorite-manager row is absent, cards and source/count labels are readable, and the fixed footer action remains visible. No claim of physical mouse placement, performance/high-DPI acceptance, gameplay, novice or clean-machine proof. Final browser check asserts the manual handoff clears the candidate; it does not itself click terrain to place a manual template. V77 remains the combined baseline. Source/private builds only; no commit, push or publication; launcher selection unchanged.
