# Authored-base controls — private v83.1

Open **Base builder → Build → Authored bases · both teams and rules** in the right inspector.

1. Capture the active layout, or import a `wulfram-authored-base` JSON file.
2. Set the new origin and rotation. Origin X/Y starts at the destination map center; Z is the saved frame altitude. Rotation is shown in degrees.
3. Choose **Preserve saved pose** or **Conform ground buildings**.
4. Preview on the map, then Apply or Cancel. Apply adds a layout and one Undo step.

Export saves the currently loaded package. It retains actual team arrangements, districts, supported rules and reserved space. This panel holds one package for the current session; it does not yet add entries to the persistent My bases catalog. Export before closing or switching away if the captured arrangement is not otherwise saved as a map.

Changing placement controls clears preview. Editing or replacing the map invalidates the old candidate and requires another preview before Apply. Pending file reads are invalidated on map identity changes. Preview inspection, route data, validation and service radius use the candidate. Source buildings are hidden while preview ghosts and candidate reserved areas are displayed. Preview does not freeze all other editor controls; intervening map edits invalidate it.

The shared v82 MCP tools expose the same capture/placement semantics. Rectangle quarter-turn restrictions, explicit ground conformance, conservative preserved-pose support, locked-starship behavior and editor-versus-game evidence limits remain as documented in [shared placement](AUTHORED_BASE_PLACEMENT.md).

Source: 37 tests, TypeScript and changed GUI/native-harness lint pass. Independent review found candidate inspection using source data and a map-switch import race; both were fixed. It also requested an empty-panel import test, which now remounts the panel after exporting and proves controls are absent before file import.

Initial v83 native receipts `mcp-native-test-6DHI6L` and strengthened import rerun `mcp-native-test-LW7tNx` passed. Initial visual review showed unstyled controls; v83.1 adds narrow-inspector input/button spacing and visible keyboard focus. Final v83.1 native receipt `tools/mcp/MapEditerMCP/outputs/mcp-native-test-MGhGfM/report.json` passes the MCP suite plus GUI capture, real export/import from an empty panel, 40 u reposition, unchanged preview, Apply and full-snapshot Undo. Its `authored-gui-preview.png` was opened: the inspector controls fit and have visible input/button boundaries. The full-map camera leaves model ghosts small; this image is control-layout evidence, not close building/route inspection. The attempted grid toggle did not yield a visibly grid-free frame, so no grid-render acceptance is claimed. No whole-roadmap or combined-baseline advancement is claimed.

Private v83.1 EXE: `D:/WulframForgeBuilds/authored-gui-v83.1/WulframForge.exe`; SHA256 `21B2A243732AEA1AC02383A24EEDDADF508F9598DAB18E433D7D2A617A949073`. No commit, push or publication. Stable launcher selection remains unchanged.
