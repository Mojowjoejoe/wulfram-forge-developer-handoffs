# Draw terrain selections — private v45.1

Open Terrain → Brush selection → Draw brush selection. Drag on the terrain to preview a blue rectangle aligned with the map axes, then release to set it. Edit the numeric coordinates afterward for precision. The viewport banner explains the active drawing mode and brush edits are paused. Escape during a drag cancels it and retains the previous selection; Cancel selection drawing exits before starting a drag. A click or a drag narrower than one world unit in either direction does not replace the previous selection.

Selection preview is separate from the committed selection and the map. Drawing does not create a map Undo entry, change terrain or alter buildings. Escape suppresses remaining movement events until the held gesture ends, preventing an accidental brush stroke. Pointer cancellation discards a selection gesture. Changing map or tool cancels drawing. Ordinary brushes retain their existing stroke/history behavior. The existing full-cell brush clipping and on-demand region measurements work with a drawn rectangle.

This adds creation by dragging. Polygon masks, edge/corner resize handles and selection translation handles remain future work. Selection is still temporary editor state and is not stored in map files.

## Evidence

- EXE: `dist/desktop/selection-drawing-v45.1/WulframForge.exe`, version `0.7.0-creative.45.1`.
- SHA256: `827DFB0E0831AAB0BD7D9BF813EEDC5A9368519FFD6B5D3BF0F0B8CEE53CAA3E`.
- Typecheck and scoped oxlint pass. Source suite: `outputs/selection-drawing-v45-source.log`, 297 tests, 296 pass and one existing skip. The lifecycle refinement in v45.1 also passes typecheck/lint.
- Source tests add reversed drag directions, map-bound clipping, too-small drags and non-finite input.
- Native `outputs-desktop-test-yLOlcK/report.json` PASS: real pointer drag/release, Escape mid-drag followed by continued movement, explicit cancel, previous-selection preservation and unchanged complete map/Undo count. Selection clipping and measurement regressions also pass. No renderer exceptions; original fixture unchanged.
- Screenshot `outputs-desktop-test-yLOlcK/draw-selection-preview.png` visually reviewed: visible rectangular outline, active-mode banner and cancellation control. An earlier passing run (`outputs-desktop-test-EQdPms`) captured a narrow rectangle because its screen drag nearly followed a projected map axis; the second run demonstrates a broader rectangle without changing the product.
- Initial v45 had a lint finding for synchronous state reset in an effect. V45.1 defers lifecycle cancellation and ignores obsolete cleanup callbacks.

Repeat with `WULFRAM_TERRAIN_SELECTION_TEST=1`, `WULFRAM_SELECTION_DRAW_TEST=1` and `WULFRAM_TERRAIN_MEASUREMENT_TEST=1`, using the v45.1 EXE and `outputs/composition-native-fixture.json` in `tools/test-desktop-workflow.mjs`.

Interruption follow-up: `outputs-desktop-test-PL67mR/report.json` passes a browser pointer-cancel signal after real pointer movement, a native keyboard tool switch and actual-file re-import during a held selection drag. Each preserves the previous selection and prevents brush leakage; the pointer-cancel signal is synthesized and is not hardware touch/pen evidence. V42.1 remains the full aggregate baseline. Existing bundle-size and WindowsBase build warnings remain; this does not close the overall roadmap or external acceptance gates.
