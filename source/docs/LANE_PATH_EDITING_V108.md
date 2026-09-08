# Editable lane paths

Choose Terrain > Lane tool, draw a start-to-end lane, and release to preview it. Drag numbered handles to move endpoints; drag the square handle or use Curve / bend to change a two-point curve. A cyan dashed line shows the proposed centerline. These handles and lines are editor-only.

For several turns, set bend to zero and open **Path points**. Use **Add point after** to split a segment at its midpoint, then drag that new point or enter X/Y. **Remove point** deletes a point; a lane must keep 2-32 points. Multi-point paths have straight segments with rounded joins and shoulders. Focus a numbered handle and use arrow keys to move 10 world units, or Shift + arrow for 100. Coordinate fields show two decimals; dragging retains full internal precision.

Escape, window blur or pointer cancellation during a handle drag restores the prior proposal. Apply is disabled during dragging. Editing a different map or changing tools clears the proposal; it cannot be committed to a stale source. **Apply lane** validates and commits one Undo step. Use map Undo to restore the terrain.

Width, floor, shoulder blending, mirror and manual/protected placement continue to apply. Invalid routes remain proposals until corrected; saved height rules and structures remain protected. A lane does not create an authored route reservation, scoring objective, or proof of vehicle access.

## MCP

Existing `apply_lane` supports the same 2-32-point path and optional two-endpoint bend. GUI and MCP use the same terrain operation; its exact curve samples were extracted into `lib/lane-path.ts` for the display. No new bridge action, allowlist or serialization module was required. GUI handles are available in v108+, curved MCP lanes in v107+; older straight/polyline support remains unchanged.

## Evidence and review

- 24 targeted source tests passed: `outputs/lane-handles-source-tests.log`. These include curve/inverse-bend math, ordered point insertion and limits, existing terrain/mirror/protection regressions, MCP and operation banner checks.
- TypeScript passed: `outputs/lane-handles-typecheck-final.log`. MCP synchronization passed.
- Independent review found a drag mismatch between preview height and original raycast terrain. Dragging now uses a fixed plane at the initial displayed handle height, preserves its grab offset and suppresses no-motion writes. Follow-up source review accepted this correction.
- Initial private v108 EXE SHA-256: `e033882d7b6cee40b054155e355a9631a1777f40e8f3e274c2e19bc6e6386eea`.
- Initial v108 GUI receipt: `outputs/outputs-desktop-test-TmLDLK/report.json`, passed; no renderer errors. Deep cut, no-motion click, small drag, Escape/blur/pointercancel, keyboard nudge, bend drag, point controls, read-only preview, Apply/Undo/Redo and in-page MCP terrain equality were exercised.
- Initial v108 standalone MCP receipt: `tools/mcp/MapEditerMCP/outputs/mcp-native-test-F9RsFN/report.json`, passed with curvedLane=true.
- Screenshot review found crowded expanded point controls and numeric-edit assertions that did not prove the value changed. V108.1 separates rows/fields/buttons and shows two decimal places. The native scenario now checks insertion geometry, exact entered Y change, other-coordinate preservation and saved points against the displayed proposal (0.0051-unit tolerance for two-decimal display).

V108.1 native retesting passed (below). The accepted combined baseline remains v106, installer v96 and launcher selection unchanged. This is a manual lane-authoring increment; whole R2/R4 and the full roadmap remain open. Native editor checks are not game-driving or novice-user acceptance.


## Reviewed private v108.1

- EXE: `D:/WulframForgeBuilds/lane-handles-v108.1/WulframForge.exe`.
- SHA-256: `298aabf8fcb41511b2e90a1ebcbea6bfd05e0afc19efe37bb7a4e40487f087d6`.
- Archive: `dist/desktop/WulframForge-0.7.0-v108.1-win-x64-self-contained.zip`.
- Build log: `outputs/lane-handles-v108.1-build.log`.
- GUI: `outputs/outputs-desktop-test-MguzfE/report.json`, passed, renderer errors empty. The strengthened insertion/numeric/saved-point assertions pass. No-motion clicks, small drags, cancellation, keyboard nudge, curved/polyline preview, Apply, Undo/Redo and in-page MCP equality pass.
- Real standalone MCP: `tools/mcp/MapEditerMCP/outputs/mcp-native-test-81sIf5/report.json`, passed, curvedLane=true.
- Both native receipts were checked against the actual executable hash above.

Screenshots in the GUI receipt directory show separated point headings, coordinates and button rows, and clear curved/multi-point centerlines. The controls remain in a scrollable inspector. This scope does not claim a 32-handle usability/performance matrix or novice/game acceptance.

Independent final review confirmed the repaired drag behavior, readable point controls, numeric-to-saved-coordinate assertions and v108.1 GUI executable hash. No further bounded product/source finding remained. The stale pending sentence was replaced after standalone verification completed.
