# Manual brush selections — private v41.1

Use Terrain → Brush selection → Select center region, or find “Select a terrain brush region” in the tool finder. Edit Selection x/y/width/height in world units. The blue rectangle stays visible while a manual brush is active, including when optional base overlays are hidden. Clear brush selection restores whole-map brushing.

Selections constrain Raise, Lower, Flatten, Smooth, Set height and Paint texture. Each editable vertex must have its full neighboring-cell support inside the rectangle. This prevents interpolation and corner texture masks from affecting cells outside it. A narrow/off-grid region may have no editable vertices. Selected height brushes preserve the existing outer map ring, including nonzero imported edges. Existing authored constraints still apply.

Selection is temporary editor state, shared by the manual brush tools, and is not stored in a map or recipe. It does not constrain large landforms, compositions, generators or MCP terrain commands. On opening a smaller map, an out-of-bounds selection blocks brushes until resized or cleared. Direct drag handles, polygon selections and saved brush settings remain open roadmap work.

## Evidence

- Private EXE: `dist/desktop/terrain-selection-v41.1/WulframForge.exe`
- Version: `0.7.0-creative.41.1`
- SHA256: `C21A027C21A79056D68B77C198935934D8E2F0F5136F5F6C426697F73C1D3A62`
- Typecheck and scoped oxlint pass.
- Full source suite: `outputs/terrain-selection-v41-source.log` — 288 tests, 287 pass, one existing skip. Subsequent tool-finder/UI refinements also typechecked and scoped lint passed.
- Three selection tests cover rectangular grids, off-grid texture-cell containment, and invalid/stale map bounds.
- Native receipt: `outputs-desktop-test-HYenYg/report.json` — real packaged WebView2 brush clicks, actual-file import and Save local; source fixture unchanged; no renderer exceptions.
- Native screenshot: `outputs-desktop-test-HYenYg/terrain-selection-applied.png`. Earlier equivalent screenshot in `outputs-desktop-test-Le5T0a` visually reviewed: controls legible, blue rectangle visible, no clipping of the selection controls. Help text remains small at full-screen capture scale.

Native results: {"changedVertices": 15, "clippedVertices": 5, "extentPreserved": true, "outsidePaintNoOp": true, "outsideNoOp": true, "invalidNoOp": true, "undoRedo": true, "clearRestoresBrush": true}

The boundary-crossing stroke changes fewer vertices than the whole brush and every changed vertex has full support inside the selected extent. Outside sculpt/paint clicks preserve the complete saved project and undo count. Invalid regions preserve the project. Undo/Redo reproduce the accepted terrain; clearing restores edits.

Remaining acceptance: native coverage of every brush type and grid density, direct-selection interaction, broader mixed-map workflow, and game/novice evidence. This sprint does not close R2 or the whole-editor release gate. Existing bundle-size and WindowsBase build warnings remain.
