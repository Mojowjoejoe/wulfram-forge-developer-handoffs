# Stamp dimensions, placement explanations and explicit modes — RC41

Private unsigned ZIP: `dist/desktop/WulframForge-0.7.0-rc.41-win-x64-self-contained.zip`.
SHA256: `48c127877c198e5c2cc127f0da6183bb6e3a2fc89ca7c37565040b51ef5f6f07`.

The 3D stamp inspector now uses independent Length (160–4,000 u) and Width (32–4,000 u) sliders. These are full dimensions in world units, not radii. Changing one preserves the other; width may exceed length. Rotation turns the whole shape. Sub-grid widths and edge conflicts still reject explicitly. Legacy radius/ratio presets retain their original dimensions and load without reshaping; explicit dimensions are optional saved settings. The older top-down stamp dialog retains its legacy controls.

Placement mode is an explicit Protected / Manual dropdown, replacing the misleading safety checkbox. Protected keeps authored route, base and center reserves; maps without supported saved route metadata cannot use it. Manual bypasses that route-metadata requirement but still enforces structure clearance and map boundaries. Neither mode proves gameplay balance.

A high-contrast “Cannot place terrain stamp” alert now overlays the viewport with the concrete reason. It does not intercept pointer events or move the terrain canvas. Missing metadata remains visible without hovering; position-specific conflicts update with the cursor.

Seven dedicated stamp tests passed, including legacy dimensions, width greater than length, bounds, independent dimension preservation and protected placement. TypeScript/scoped lint passed. RC40 native receipt `outputs-desktop-test-y9e6qV/report.json` passed dimension sliders, keyboard endpoints, visible blocked banner, rejected-click preservation, repeated placement, Undo/Redo, preset recovery and restart. RC41 adds explicit mode selection to that native test.

Final RC41 native receipt `outputs-desktop-test-vMm1Fy/report.json` passed, including switching Manual/Protected and all placement/undo/restart checks. Blocked-placement screenshot visually reviewed.

Existing bundle-size/WindowsBase build warnings remain. No public push or map-source overwrite.
