# Protected terrain heights — v21

## v21.1 preview correction

The shared stamp preview now checks authored terrain areas and district locks before returning an allowed surface. The viewport uses this result for its blocked ghost and explanation, and Apply recomputes the same checks. Manual placement does not bypass authored protection. Generated-map preview feedback and eligible-region regeneration remain open.

A focused regression compares rejected preview/Apply within a protected rectangle, exact preview/Apply terrain parity for a distant stamp, and source preservation. Eight focused stamp/area tests passed with typecheck and scoped lint.

Accepted v21.1 build: `dist/desktop/protected-terrain-v21-1/WulframForge.exe`; SHA-256 `B957FE9EC2F45017A43F87D842F34945D0017DA2859293467DE39B41C323A2F8`. All five stages passed in `outputs/product-baseline-Rtz8lq/report.json`: 249 source tests passed, one existing fixture skip, typecheck, combined terrain, creative bases and random maps. Native receipts: `outputs-desktop-test-w0ubVP/report.json`, `outputs/creative-native-qnG0Ui/report.json`, `outputs-desktop-test-vOfmze/report.json`. The protected-stamp rejection is covered by the focused source test; native regression covers existing landform parity and terrain-rule editing, not a new protected-stamp hover scenario.

R2/R5 foundation for preserving hand-built ridges and service sites.

## Workflow

Open Base builder → Build areas and reserved space. Choose **Protect terrain heights**, name the area, and enter its X/Y corner and full width/height in world units. Preview shows a green rectangle without changing the map. Apply saves the rule in the active layout with one Undo step. Saved protection applies across every layout because they share terrain. Team selection is therefore fixed to All teams.

Sculpting, large stamps and generation use the shared transaction checks: if a proposed edit changes protected heights, the entire operation is rejected. Distant edits remain available. Protection includes the grid vertices surrounding the rectangle to preserve interpolated terrain within it, so a brush just outside its outline may still be rejected. No automatic clipping or partial reroll is implemented here. Stamp/generation previews do not yet incorporate these new height rules into their candidate appearance; the commit check is authoritative and may reject a visible preview.

Protection preserves heights and terrain dimensions. It permits texture painting and building placement. Use Keep clear or Build inside for building restrictions, or lock a district to protect its buildings. Remove or resize a height rule explicitly before reshaping that region. Apply/Remove participate in map Undo. Undo and whole-document Open/New/recovery remain document operations, not protection overrides for ordinary edits.

Rules persist in `forge.build-areas.v1` as `kind: terrain` rectangular records. Earlier editors that do not recognize this kind fail validation; use v21 or newer for editing these records. There is no conversion or silent downgrade. Export preserves the metadata alongside existing layout data.

## Review and verification

Source cases cover all four surrounding vertices of a sub-grid rectangle, distant edits, inactive-layout protection, terrain resizing, explicit removal, simultaneous removal-plus-height rejection, building placement, and rejection of team-specific terrain rules. Native acceptance exercises the controls, nonmutating preview, failed near sculpt with unchanged revision/Undo, allowed distant sculpt, export metadata and Undo.

Single-agent review checked the shared manual brush, stamp, generation and MCP transaction call sites. This is editor enforcement; it is not gameplay evidence. Existing malformed-constraint handling remains fail-closed. Direct viewport drawing, protected paint masks, eligible-region regeneration, candidate comparison and the complete roadmap remain open.

Packaged acceptance command:

```powershell
node tools/test-product-baseline.mjs dist/desktop/protected-terrain-v21/WulframForge.exe outputs-stamp-lab-IdQbRb/Landform-visual-lab.zip --districts
```

Accepted private build: `dist/desktop/protected-terrain-v21/WulframForge.exe`, version `0.7.0-creative.21`. Verified SHA-256: `3D3FB4BC7E4BFB471FC9B219B61CA2A890EFEEE981079D69188E73B339EFD3D4`.

All five stages passed in `outputs/product-baseline-wEex09/report.json`. Source: 249 tests, 248 passed, one existing fixture skip, zero failures. Typecheck and scoped lint passed. Native receipts: combined terrain `outputs-desktop-test-iN39JM/report.json`; creative/district/protection `outputs/creative-native-AWtDkJ/report.json`; randomized maps `outputs-desktop-test-5IhuTo/report.json`. The exact EXE and laboratory hashes were unchanged after acceptance.

Visually reviewed `outputs/creative-native-AWtDkJ/protected-terrain.png`: green terrain-following outline, disabled All teams selector, full extent controls, protection explanation and Preview/Apply controls. Export receipt: `outputs/mcp-exports/protected-terrain-test-1788752740352.zip` retains the terrain rule. The map-space screenshot shows the test rectangle on flat ground; source tests establish interpolation-boundary protection independently of terrain shape. Existing bundle-size and WindowsBase build warnings remain.
