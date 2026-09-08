# Authored-base close inspection — private v85

After Preview, choose a building in **Preview building** and press **Close preview building**. The existing model-aware detail camera frames that exact candidate entity, including neutral units. Labels include team, building type and sequence number so repeated structures remain distinguishable. Changing the map invalidates the candidate and removes its camera controls.

Authored preview meshes now retain original model materials. Ordinary manual/creative placement ghosts retain their previous translucent styling. The placement preview badge, separate candidate data, reserved-area outlines and explicit Apply/Cancel remain; changing material appearance does not commit the layout. The style flag participates in both model rebuilding and positioning, preventing fresh holders from remaining at the origin after a style-only change.

Independent review found that positioning dependency gap; it was fixed before the accepted native run. The second review found no further actionable issue. Three existing inspection/camera tests, TypeScript and changed-file lint passed. MCP synchronization passed; this visual-only addition does not change capture/placement tool schemas or project data.

EXE: `D:/WulframForgeBuilds/authored-detail-v85/WulframForge.exe`.
SHA256: `760C6B810FAB7297B3B93696CC33FBF49D26F67435652D4E43393F0DDBB9E485`.
Native receipt `tools/mcp/MapEditerMCP/outputs/mcp-native-test-727se5/report.json` PASS: existing MCP suite, authored capture/import/export/reposition/Apply/Undo, Tool Finder, four team cameras and two selected repair-pad detail cameras. Each detail action preserves the full map snapshot. Both repair detail screenshots and the Team 1 overview were opened. The close views show readable original repair-pad geometry and surface details with power tint retained, alongside the selected team/building and placement-preview badge. Whole-team overviews remain distant; they do not substitute for the new detail view. The checkerboard is the blank fixture terrain, not a gameplay surface or ground-contact proof. V77 remains the combined baseline. Persistent authored-library storage and the broader roadmap remain open. No commit, push, publication or launcher selection change.

Final independent visual review accepted both detail images: selected repair pads are readable and unclipped; team selectors match; placement badge and Apply/Cancel distinguish uncommitted geometry. This closes the scoped close-view readability finding, not gameplay clearance or power behavior.

