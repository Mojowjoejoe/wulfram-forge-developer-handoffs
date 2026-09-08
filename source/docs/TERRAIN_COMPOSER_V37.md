# Terrain composer: private v37.2

Build: `dist/desktop/terrain-composer-v37.2/WulframForge.exe`, version `0.7.0-creative.37.2`.
SHA-256: `BA901BD12B35813556E8DF6C26FE205790BA4F73087EA13CF0341FA751D2F755`.

Open Terrain → 3D stamp brush → Compose several landforms in the right inspector. Configure a stamp in the controls below, then Add current landform to copy its settings. Add up to twenty steps, edit local offsets, replace settings, move a step earlier or remove it. Set the composition anchor and rotation. Step order is significant; original dimensions and per-stamp mirror behavior are preserved.

Preview composition displays the complete proposed terrain and textures through the normal viewport. Terrain stroke callbacks are paused while that proposal is visible, and the operation banner explains Apply/Cancel. Editing the draft clears the proposal. A changed source disables Apply. Leaving the composer clears its viewport proposal. Apply commits the exact reviewed project in one map history entry after rechecking shared constraints.

Export composition saves a validated version-1 JSON recipe. Import replaces the composition controls without changing the map; malformed input retains the existing recipe. The recipe draft is currently session-local to this panel: export before leaving the tool to keep it. This is a portable file workflow, not yet a persistent searchable local composition library.

## Verification and fixes

- `outputs-desktop-test-Ye3p86/report.json` passes on v37.2 using keyboard activation: add ridge/valley steps, offsets, combined preview with unchanged source, Cancel with banner/status cleanup, draft-edit invalidation, Apply with exactly one new Undo entry, full Undo/Redo restoration, actual recipe export and file-input import, and saved-map restart.
- The run uses 1,800 × 1,000 unit stamps with 400-unit relief on a 12,000 × 8,000 blank map. The source fixture is `outputs/composition-native-fixture.json`; its hash is checked by the runner.
- Earlier v37 receipt `outputs-desktop-test-iYTSnv/report.json` passed behavior but visual inspection found unstyled controls and an incorrect click-to-apply operation banner. V37.1 fixed layout/framing; its passing `outputs-desktop-test-GYAzKm/report.json` preview image was inspected and showed distinct ridge/valley terrain and readable controls. V37.2 adds semantic status output and clears the footer on cancel.
- Typecheck and scoped lint pass. Full source suite before the final styling/status refinements: 283 tests, 282 passed, one existing skip; `outputs/terrain-composer-v37-source.log`. Shared engine tests cover terrain/texture parity, deterministic terrain, source preservation and a later protected-area rejection. No broader repeat of the full suite was needed for the final CSS/status-only refinements; the native workflow was repeated on the final EXE.

## Remaining work

Native source-change and protected-layout rejection paths, textured composition screenshots, persistent library management, discoverable tool-finder integration, before/after comparison controls and draggable composition handles remain to be completed. The composer does not add editable ridge paths or region painting. General randomized/hybrid-map and game/server acceptance remain open; no public release is implied.
