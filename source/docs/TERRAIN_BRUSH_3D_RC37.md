# 3D terrain stamp brush — RC37

Private unsigned build: `dist/desktop/WulframForge-0.7.0-rc.37-win-x64-self-contained.zip`.
SHA256: `24107ff9b4f3db5bbf86a870ad882aeb60c72cf10a6cccc771d8d8e154a91267`.

## Use

Extract the ZIP, run WulframForge.exe, open a map, then choose Terrain → 3D stamp brush.

- Hover over actual terrain for a wireframe ghost of the resulting landform. Cyan is placeable; red is blocked. Negative relief is visible through the existing surface.
- Alt + mouse wheel rotates by 15 degrees; normal wheel retains camera zoom.
- Left-click places once. Moving or holding the mouse does not spray repeated stamps. The tool remains selected for another placement, and each click has its own Undo/Redo step.
- Choose ridge, valley, crater or saddle. Adjust radius, width ratio, rotation, height/depth and edge profile in the inspector. Optional 180-degree mirrored partner remains available.
- Safe placement is on by default. Orange dots show protected terrain samples; toggle Show protected areas to hide that overlay without disabling protection.
- Save named presets locally and load them from Saved stamps. Up to 30 named presets are retained; saving the same name replaces that preset. Position and the safety toggle are not included in saved presets.
- Choose another terrain tool to stop stamping. The earlier Terrain stamps top-down dialog remains available as a separate manual placement tool.

## Protection contract

The random terrain designer and 3D safe stamp brush now share one authored protection-mask implementation. It includes routes, center, base reserves, map edges and structure reserves across active/inactive layouts. Unknown or inconsistent route metadata blocks safe placement rather than inventing routes. Manual mode requires deliberately unchecking Safe placement and still enforces structure clearance. Large stamps may not fit the tightly protected Citadel map; reduce size or deliberately use manual mode for route redesign.

Conflicting stamps reject in full, not clipped fragments. Apply recomputes against the current map and the actual clicked world coordinates; it never trusts a cached hover preview. Original textures and untouched height precision are preserved. Cached analysis is cleared and metadata says revalidation is needed. Protection is not proof of traversal, fair sightlines, engine collision or match balance.

## Evidence

TypeScript and scoped lint passed. Main suite: 111 passed, one existing skip. Six critic/replacement regressions and eight stamp/project/valley tests passed. `npm run test:stamps` runs the six dedicated stamp tests.

RC36 native EXE UI receipt: `outputs-desktop-test-iHNUlx/report.json`: actual viewport hover, Alt-wheel rotation, two placements, separate undo/redo, unchanged entities, save/restart and saved-preset recovery. No renderer exceptions. Final RC37 receipt `outputs-desktop-test-V2iYQR/report.json` passed the same workflow plus a rejected-click/no-mutation check. `stamp-test-before.json` and `stamp-test-after.json` in that directory preserve the test comparison.

Run final native scenario in PowerShell:

```powershell
$env:WULFRAM_STAMP_3D_TEST='1'
node --experimental-strip-types tools/test-desktop-workflow.mjs dist/desktop/win-x64/WulframForge.exe outputs/canyon-citadel-ice-v2/Canyon-Citadel-Icebound-v1.zip
```

The harness uses an isolated copy/profile and retains the test map before/after. It does not replace the user's currently running executable. Existing large-bundle/WindowsBase warnings remain. No public push, publication or in-game balance claim.
