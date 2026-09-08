# Reusable district modules — v15

Private R3/R4 continuation. This builds on the [v14 workshop](BASE_WORKSHOP_V14.md); locks, connections, recipes and the complete R4 authoring journey remain open.

## Save and reuse a yard

1. In Base builder → Base Workshop · districts, select existing buildings from one team. Enter a district name.
2. Choose **Save selection as module**. This adds a personal library entry without changing the map or its Undo history. The shared personal library holds up to 50 entries; each module supports up to 120 modeled buildings.
3. On any open map, choose **Browse base library → My districts**. Select the card and **Preview on current map**. Modules also appear under My districts in the base-template dropdown.
4. Choose the destination team, footprint spacing and yaw. Hover terrain for a ghost preview, then click to place one copy. This creates both buildings and named district membership in one Undo step. It does not generate an opposing copy or replace the current layout.
5. Use the existing personal library manager to rename/remove entries, undo a library change, or export/import them. These actions are separate from map Undo. Existing UI labels such as “Manage My bases” and “Export My bases” operate on the combined personal collection, including districts.

## What a module preserves

A module records supported tokens/subtypes, activation values, relative planar positions and yaw, plus source map/layout/team, original map dimensions and anchor. Positions are relative to the selection's mean center. Placement remaps all buildings to the chosen destination team. It uses the existing original-size model and terrain-fitting rules; absolute height, pitch and roll from the source terrain are deliberately replaced by destination fitting. Modules contain no terrain, live power state or gameplay scripts.

The footprint control changes spacing, never model scale. Module card dimensions describe the saved center extents, not collision footprints. The existing personal-library radius limit is 4,000 world units from the selection center. Modules reject automatic spacing shrinkage and unavailable models instead of placing a partial set. The existing placement algorithm adjusts the anchor near map edges; inspect the ghost's actual location before clicking. Collision, power, service access and routes still require inspection.

Placed copies are independent named districts in layout metadata. Editing or deleting a library entry does not alter existing copies. Replacing a placed district's membership does not update the saved module. Save another module when you want another reusable arrangement.

## Portable format

Base-only exports retain `wulfram-base-library` version 1. Exports containing modules use version 2 with `kind: "district"` on module entries. Current imports accept versions 1 and 2, preserve kind and provenance, and use the established duplicate/conflict preview. Version-1 documents claiming district entries are rejected. Older editors reject version 2 instead of interpreting a district as a mirrored base.

Local profile storage remains the combined favorites array. Modules and templates must share an ID; unknown kinds, unsupported records, invalid geometry, mixed-team source selections and missing selections fail without saving. Export the library to transfer it to another device or profile. Map exports contain placed buildings and district membership, not the entire personal library.

## Verification

Unit coverage checks a module exported/imported and placed on a second map for the opposite team, retained spacing and membership, source preservation, kind/version validation and rejected selections. Native acceptance exercises saving, My districts browsing, non-mutating handoff, one-copy canvas placement, exported membership and Undo. Existing native portability workflows remain in the combined run; the module's cross-map geometry check is a source test, not a separate native two-map journey.

```powershell
node tools/test-product-baseline.mjs dist/desktop/district-modules-v15-final/WulframForge.exe outputs-stamp-lab-IdQbRb/Landform-visual-lab.zip --districts
```

## Accepted private build

- Executable: `dist/desktop/district-modules-v15-final/WulframForge.exe`, version `0.7.0-creative.15`.
- SHA-256: `A8D7CC1EA36A80B49D44322F8EFEA3462A7F1C82674D4EFEFDCDEE7431E943AA`.
- Aggregate receipt: `outputs/product-baseline-XHPUw8/report.json` — all five stages passed.
- Source checks: 237 tests, 236 passed, one existing fixture skip; TypeScript and scoped lint passed.
- Combined native terrain receipt: `outputs-desktop-test-ogzbX9/report.json`.
- Native base/library/module receipt: `outputs/creative-native-XUVF2H/report.json`.
- Native random-map receipt: `outputs-desktop-test-EVIMyb/report.json`.
- Module library screenshot: `outputs/creative-native-XUVF2H/district-module-library.png`. The equivalent candidate screenshot in `outputs/creative-native-23M1mS` was visually reviewed; the final build adds an import identity guard without changing that UI.

The original candidate also passed all five stages (`outputs/product-baseline-as3xZg/report.json`). Existing large-bundle and WindowsBase build warnings remain. No gameplay or novice-user acceptance is claimed.
