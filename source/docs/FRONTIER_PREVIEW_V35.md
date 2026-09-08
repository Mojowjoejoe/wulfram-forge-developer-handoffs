# Frontier preview private build v35.1

Private executable: `dist/desktop/frontier-preview-v35.1/WulframForge.exe`

Version: `0.7.0-creative.35.1`

SHA-256: `C192A683AFEC870093EE03FE967C5719AA58880BE2EF70C7CE2D704F3B29B9AC`

Frontier Camp is available under **Experimental layouts** in Base layout states. It uses the normal size, count, placement, candidate selection and Preview/Apply controls. Help explains its reserved strips and remaining review status. It is not included in the 15 reviewed creative families or promoted in the main visual catalog yet.

Build-area overlays now follow the active creative preview. They display the candidate's reservation metadata, hide the old layout's areas during preview and return to normal on cancel. The preview screenshot shows the two purple expansion strips alongside the yellow building-area circles.

## Evidence

- Typecheck and scoped lint pass. Full source suite: 278 tests, 277 passed, one existing skip; `outputs/frontier-preview-v35-source.log`.
- `outputs-desktop-test-pHl5oc/report.json` passed on the packaged v35.1 EXE: actual picker generation (small, nine structures per team, 35 degrees), read-only preview, Apply, Undo/Redo, saving a constrained favorite, actual version-3 library download, reuse at 90 degrees on a larger imported map and saved-profile restart. Source terrain and preview map snapshots are compared. Renderer exceptions: none.
- `frontier-native-preview.png` in that report directory was visually inspected. Both reservations are visible. The wide overview is insufficient for a final close-up topology review; sampled route inspection still reports a tight-clearance warning.
- `outputs-desktop-test-nnYQ1S/report.json` preserves the earlier test failure: clicking Save local invalidated the candidate. The acceptance script now uses the native read-only snapshot bridge during preview.
- The extended test now removes the saved favorite and attempts restoration through the actual library file input before reuse. Its two launches terminated before editor connection: `outputs-desktop-test-ZGoVaS/report.json` and `outputs-desktop-test-bRbrjF/report.json`. Both exited with code zero; no running Forge process remained in the subsequent process inspection. Cause is unproven. These attempts do not prove native library re-import.

## Next gates

Resolve isolated-test startup and run the extended library re-import check. Add map ZIP export/re-import acceptance for the new generated candidate, repeat native size/non-flat cases, inspect close-up topology, and address review findings before family promotion. Existing source portable round-trip tests are not a substitute for those native checks. No publication or game/server acceptance is claimed.

## v35.2 follow-up: completed portable workflow

Private build: `dist/desktop/frontier-preview-v35.2/WulframForge.exe`, version `0.7.0-creative.35.2`, SHA-256 `41B7627F9B8D30BBE842DA4AF602CAB7141302A43E61DB148354EE83E2725E72`.

Save local now keeps project identity when the serialized saved content equals the current map. Valid source-bound previews remain applicable after an unchanged save. Actual metadata changes still replace the project and invalidate the preview.

`outputs-desktop-test-iFXElt/report.json` passes the extended packaged-native workflow with keyboard button activation:

- Small Frontier generation with exact nine structures per team and 35-degree placement; preview preserves the current map.
- Unchanged Save local preserves the bridge revision and keeps Apply enabled.
- Apply and exact Undo/Redo restoration.
- Actual version-3 favorite download, removal, file-input import preview without mutation, then Apply library import with exact favorite-data restoration.
- Reuse at 90 degrees on a larger imported map with retained reservations and shared-footprint policy.
- Actual whole-map ZIP export and file-input re-import preserve terrain, entities and all layout metadata; saved-profile restart preserves the reimported project.
- No renderer exceptions. The original fixture hash remains unchanged.

The reused overhead screenshot was visually inspected: service pads and defenders are distinct, power icons are yellow, and this candidate's sampled route reports no clearance issues. It does not prove vehicle navigation or gameplay balance.

Typecheck and scoped lint pass. Full source suite: 278 tests, 277 passed, one existing skip; `outputs/preview-save-v35.2-source.log`.

Two additional failed receipts remain: `outputs-desktop-test-2S2cEm/report.json` timed out after editor exit, and `outputs-desktop-test-78ShIL/report.json` reports connection closure promptly. The runner now rejects pending CDP requests on connection closure and refuses commands on closed sockets. The cause of those native process exits remains unproven; keyboard acceptance does not establish that pointer-driven instability is fixed.

Remaining family work: native generation across other sizes/non-flat terrain, representative visual diversity and topology review, family documentation/card assets, and then reviewed catalog promotion. The earlier native library re-import gap is closed by iFXElt; full roadmap and game/server gates remain open.
