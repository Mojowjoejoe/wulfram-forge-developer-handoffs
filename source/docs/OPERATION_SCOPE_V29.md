# Operation scope — v29.1

The strip below the viewport toolbar states where the active operation takes effect. Expand it for a short explanation of preview, Apply and Undo behavior. It follows terrain tools, landform mirroring, active-layout placement, creative formation previews and inspection. Preview dialogs get a separate scope label; their own controls explain the precise changes.

Terrain strokes identify shared heights or textures and immediate per-stroke edits. Landforms identify single or mirrored footprints. Creative formation settings identify a new layout and explicit Preview/Apply; inspection identifies read-only viewport clicks. Manual building edits identify the active layout and explain that they do not automatically mirror to the other team. Legacy/stale settings from another mode do not determine the displayed scope.

Visual review of v29 found that the generic landform label still offered “click to apply” while protected placement was blocked. V29.1 connects the strip to the current guard/ghost rejection: it now says “preview blocked” and shows the reason. The original v29 native receipt remains valid for its tested transitions but is not the final visual acceptance.

Private candidate: `dist/desktop/operation-scope-v29-1/WulframForge.exe`, version `0.7.0-creative.29.1`, SHA-256 `6AABF0047C4E707805CFF6F8709ED8CDDBCC4A2A345EB23DF9550484356926A7`.

V29 source run: 265 tests, 264 passed and one existing skip (`outputs/operation-scope-v29-source.log`). Typecheck/scoped lint passed; focused tests passed again after the blocked-state fix. V29 native receipt `outputs-desktop-test-Nrn08C/report.json` passed mode/mirror/inspection/creative transitions without map mutation, About identity, combined manual adjustment/export/restart and compact high-DPI navigation. Reviewed `operation-scope-terrain.png` and corrected the blocked wording as described above. V29.1 native acceptance is in progress.

This advances R1-02's visible operation scope. Full contextual-settings organization, broader dialog coverage and novice discovery remain open; the whole R1 gate is not marked complete from this strip alone.

Reviewed the refined `outputs-desktop-test-LlpogK/operation-scope-terrain.png`: the strip says “preview blocked” with the current authored-route requirement and fits within the viewport column. The native transition step also verifies this blocked label. The remainder of that combined run is still in progress; the screenshot is not an overall-pass receipt.

Final v29.1 receipt `outputs-desktop-test-LlpogK/report.json` passed: blocked/mirrored/single scope transitions, active-layout/inspection/creative scope, unchanged map during UI-only transitions, native About identity, stamp-library operations, large landforms, manual building adjustment, route inspection, export/restart/reimport and compact high-DPI keyboard navigation. The receipt verifies the v29.1 hash above. The earlier in-progress statements are historical; this completes this scoped display sprint while full R1-02 remains open.
