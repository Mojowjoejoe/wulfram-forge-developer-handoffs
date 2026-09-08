# Visual base library — v11

Private sprint, 2026-09-06. Implements the first R3 catalog slice; district authoring and expansion to 48 creative families remain future work.

## Use it

Open **Base builder → Browse base library**, or **Map-making guide → Choose base presets**.

Search names, purpose text and source maps. Combine collection, creative size, modeled structure count, included roles and terrain-handling filters. Reset filters recovers an empty search. Pages contain up to 12 cards, and selecting a card opens details without changing the map.

The library combines the 15 creative styles, loaded original/curated templates (including advanced and combat entries), and local saved formations under My bases. Collections preserve source identity; overlapping arrangements are not advertised as new unique styles.

Thumbnails use actual modeled structure centers with readable role colors. Gold is power, cyan squares are repair/refuel, coral is turrets, purple is Darklights, and gray is other structures. Markers are diagram symbols, not collision footprints or verified coverage. Creative samples use stable `library-v1:<style>` seeds at the selected size. Placement option generation/adaptation can change the arrangement; the sample is not a promise of fit on the current map.

Each detail view explains composition, source, sample footprint, power/access limits and the applicable placement behavior. The footer keeps **Preview on current map** and **Close library** available while scrolling.

## Placement semantics

| Collection | Handoff | Commit |
| --- | --- | --- |
| Creative | Selected style, size and sample seed enter the existing mirrored formation controls; choose position, rotation, budget and entrance | Preview formation, review options, then Apply formation |
| My bases | Saved arrangement enters the fixed-composition mirrored preview controls | Preview formation, then Apply formation |
| Original / Curated | Arms the existing one-team template placement tool, resetting footprint scale and yaw to their defaults; choose team and transform | Hover for a terrain preview, then click terrain to place one copy in the active layout |

Choosing a design clears incompatible template/creative placement drafts. Browsing and choosing do not mutate the map or add Undo entries. Library-focused keyboard shortcuts do not reach editor Undo/Delete handlers. Opening the library pauses route playback.

Original template placement intentionally retains its existing one-team semantics. This sprint does not silently turn original templates into mirrored generators or add a new explicit Apply button to that tool. Size controls change creative composition; fixed templates keep their structure count. Terrain handling filters indicate adaptive-yard support versus fixed arrangements, not certified suitability for hills, valleys or other terrain.

## Validation and critic loop

- Unit tests generate all 15 creative samples at all four sizes, verify reproducibility and source preservation, and exercise combined filters, personal entries and empty results.
- Native library checks cover empty searches, original-template handoff, creative-size handoff, disarming a previous template, saved bases appearing in My bases, browsing preservation and compact high-DPI layout.
- The first visual review found unreadably small inherited preview markers and an offscreen placement action. The revised library uses larger role markers and a persistent footer.
- An existing native building-pick check hit a route warning marker at the target center. The test now hides the independently interactive markers for the building-pick assertion and restores them afterward; marker interaction remains covered separately.
- Final combined acceptance uses the same executable for source tests, landforms/hybrid save/restart/export/re-import, creative and library checks, and randomized-map searches.

Run from the repository root:

```powershell
node tools/test-product-baseline.mjs dist/desktop/base-library-v11-release/WulframForge.exe outputs-stamp-lab-IdQbRb/Landform-visual-lab.zip --library
```

Existing native fixtures and the MCP SDK are required as documented in the v10 sprint report. No gameplay/server power certification, novice-user trial, portable favorites import/export, library CRUD, multi-selection or district authoring is claimed. Existing bundle-size and WindowsBase build warnings remain. No commit, push or public publication is part of this sprint.

## Final private build and evidence

- [WulframForge.exe](../dist/desktop/base-library-v11-release/WulframForge.exe), `0.7.0-creative.11`.
- SHA-256: `DB07304316EED06783BA8E8F7742700031AC0DA6CC72476C8F29BAA0D9AE28CE`.
- [Consolidated acceptance](../outputs/base-library-v11-acceptance.json): passed. 227 source tests passed, one existing fixture skip; typecheck and scoped lint passed.
- [Combined landforms/hybrid receipt](../outputs-desktop-test-KCbkkw/report.json): passed, no renderer errors, restart/export/re-import and compact keyboard navigation preserved.
- [Creative/library receipt](../outputs/creative-native-c1WS55/report.json): passed, including library-focused Undo isolation, original/creative handoffs, saved-base discovery and the fixed-footer visibility check.
- [Random-map receipt](../outputs-desktop-test-ZQ7vnR/report.json): passed on the same executable hash.
- Reviewed release-build screenshots: [catalog](../outputs/creative-native-tTOInz/base-library-all.png), [compact layout](../outputs/creative-native-tTOInz/base-library-compact.png). Final passing-run screenshots are also retained in `outputs/creative-native-c1WS55`.

The consolidated receipt reuses passed source/combined steps and adds the successful native reruns after correcting test selectors and render waits. It does not relabel the earlier failed aggregate run as passing. The shipped collection currently shows 94 entries before personal favorites: 15 creative, 73 extracted originals, and six curated/advanced/combat templates. These are catalog entries, not 94 unique design families.
