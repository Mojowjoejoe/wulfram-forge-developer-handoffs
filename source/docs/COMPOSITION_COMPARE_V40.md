# Composition comparison and native guards: private v40

Build: `dist/desktop/composition-compare-v40/WulframForge.exe`, version `0.7.0-creative.40`.
SHA-256: `5A75476FF50595B47E0AD138D9EEB3BAF8321C5261EA28851D5F3D3DCD905229`.

After Preview composition, Show original terrain switches the viewport to the unchanged source. Show proposed terrain returns to the existing reviewed proposal without rerunning generation. The banner and panel identify the view. Terrain clicks remain paused in both views. Apply is disabled while showing original terrain; return to the proposal before applying. Draft edits reset comparison and invalidate the review; source replacement disables review controls.

## Evidence

`outputs-desktop-test-2xKTXT/report.json` passes on the packaged EXE with keyboard activation. In addition to the existing composition/library workflow, it verifies:

- A saved height-protection rectangle intersecting the first landform rejects the composition in manual mode, leaves Apply disabled and preserves the whole project.
- Re-importing the original map after generating a proposal disables Apply, even though the map content is equivalent; the source instance changed.
- Original/proposed view switching leaves native snapshot data unchanged, shows the correct banner, and enables Apply only in the proposed view.
- Existing click pause, tool-finder navigation, Cancel, draft invalidation, exact one-step Undo/Redo, recipe file export/import, local save/search/remove/Undo/load and restart reuse continue to pass.

`composition-preview.png` and `composition-original.png` were inspected together: the candidate ridge and valley appear only in the proposed view, with readable labels and controls. No renderer exceptions were reported; the fixture hash remained unchanged.

Typecheck and scoped lint pass. Full source suite: 285 tests, 284 passed, one existing skip; `outputs/composition-compare-v40-source.log`.

## Remaining scope

This closes the specific composition before/after and native protected-height/source-change acceptance gaps. It does not prove textured compositions across mixed building layouts, locked-building interactions through the composer UI, game collision or full novice acceptance. Recovery controls, direct handles, manual terrain selections and other R0–R9 work remain open. No public release is claimed.
