# Candidate entrance inspection - private v72.1

Formation previews now offer their own authored corridors in Inspect routes. Previously preview inspection replaced entities but retained saved-map layouts, so the GUI disabled authored corridors entirely to avoid inspecting unrelated saved rules. The shared routeInspectionProject helper now supplies the candidate layout, entities and validation together. An absent/stale candidate has no preview routes; saved-map corridors cannot leak into it.

Automatic service approaches remain separate from authored corridors. The inspector explains that they may follow different paths. Select the candidate corridor to inspect its saved point order and width; the camera and clearance markers use those points without applying the formation. This exposes both designs for inspection; it does not force automatic routes or players onto the authored entrance.

MCP inspect_routes reads the committed active map with an explicit assumed vehicleWidth of 20-400 u. It returns automatic and authored route kinds, ordered geometry, world-unit lengths, saved widths, width-over-reservation flags and sampled clearance markers. Authored endpoint checks include buildings from all teams; automatic service endpoints retain drive-on treatment. Map data, revision, Undo and camera remain unchanged. Uncommitted GUI previews are outside this MCP read's scope. Both server copies, native allowlist, live bridge, README and tool-list tests are current.

## Validation and critic fix

Independent review found that enormous finite authored coordinates could make terrain sampling effectively unbounded. Authored paths outside the map now produce an explicit diagnostic and are excluded from inspection. Shared clearance calls reject nonfinite geometry, more than 4096 points, more than 10000 terrain samples, or more than two million sample-times-point work units. Over-budget routes report a shorten/split diagnostic, not a clear result. This changes inspection only; imported map metadata is not silently rewritten.

Source regressions cover candidate/saved layout isolation, no candidate, authored direction, width warnings, all-team endpoint obstacles, invalid width and huge/out-of-map coordinates without mutation. Existing route endpoint/edge checks still pass. Independent follow-up found no remaining actionable issue in the bounded review.

## Exact private evidence

Build: D:/WulframForgeBuilds/route-preview-v72.1/WulframForge.exe
SHA256: D7EFB04F9C08CBA671948E8E544A65EC31C3BA83B6AF6027905F8998CFC21496

- outputs/routes-v72.1-all-tests.log: 320 tests, 319 passed, one existing skip.
- Targeted source: 20/20; TypeScript and scoped Oxlint passed; MCP synchronization passed; standalone package 8/8.
- Native GUI: D:/WulframForgeTestRuns/outputs-desktop-test-IS0BOS/report.json PASS, rendererErrors empty. Actual Offset generation exposes two candidate entrances; selection/progress camera inspection preserves source map and revision. Automatic route explanation is visible. Apply/Undo/Redo, schema-2 reservation favorites, portable import/reuse on a larger map, map ZIP and restart checks passed. candidate-authored-entrance.png was visually reviewed.
- Native MCP: tools/mcp/MapEditerMCP/outputs/mcp-native-test-H41Nxi/report.json PASS on the same executable hash. Route geometry/clearance read, invalid-width rejection, unchanged revision/Undo, and existing edit/protection/stamp/lane/export/deadline checks pass.

v72 initial build predates the inspection-budget fix and is not the accepted artifact. v71.1 remains the combined whole-editor baseline. Current family review, driving/collision, balance, novice and clean-machine acceptance remain separate. Source and private rebuild only; no commit, push or public release.
