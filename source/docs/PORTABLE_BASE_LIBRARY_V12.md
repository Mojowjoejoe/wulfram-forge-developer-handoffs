# Portable saved-base libraries — v12

R3 continuation, private editor sprint. Open **Browse base library → Manage My bases**.

## What changed

- Export all personal bases as a versioned `wulfram-base-library.json` file, independent of maps.
- Import a library into a preview showing new entries, identical entries skipped and ID conflicts. Apply is explicit; Cancel changes nothing.
- Keep conflicting IDs as separate entries with new IDs rather than overwriting an existing base. Reimporting the same named arrangement does not add another copy.
- Rename and remove saved bases. **Undo library change** restores the preceding successful library edit while the dialog remains open. It is separate from map Undo and is not a persistent recovery history.
- Write local storage before updating the visible library. Failed writes leave the current library and map unchanged and show the error.
- Invalidate an active saved-base placement draft after library changes, so a removed or renamed saved entry cannot leave a stale placement candidate.

The format records version 1 and complete saved-template data. The importer also accepts legacy raw favorites arrays. It validates template metadata, supported structures, numeric geometry, names, unique IDs, file size (2 MB) and capacity (50 entries). Unknown future versions are rejected rather than interpreted as current data. Import preview recalculates against the current library, including edits made while the preview is open.

The identity comparison preserves names, radius, structure data, provenance and extension metadata, ignoring only storage IDs and JSON key order. A deliberately renamed arrangement or a different source remains a distinct library entry. It does not infer geometric equivalence under rotation or reordered structure lists.

## Verification

Unit coverage includes versioned and legacy roundtrips, same-ID conflicts, repeated imports, invalid template metadata/geometry, duplicate IDs, unsupported versions, oversized input and capacity failure without source mutation. The metadata rejection tests use distinct IDs so they actually reach the field validators.

The native acceptance extension exercises the real export download, rename/remove/library undo, file-input import preview, cancel, merge, repeated import, bad-version rejection, map revision preservation and library reload. The existing combined manual-landform/base/export/restart workflow, creative regressions and randomized-map searches run on the same private executable.

Repeat full acceptance from the repository root:

```powershell
node tools/test-product-baseline.mjs dist/desktop/portable-library-v12-release/WulframForge.exe outputs-stamp-lab-IdQbRb/Landform-visual-lab.zip --portable
```

Existing local test fixtures and MCP SDK are required as in v11. No public release, remote push or gameplay verification is implied. R3 now has library portability and basic management; full novice acceptance, district libraries and the broader R0–R9 roadmap remain open.

## Final private artifact and receipts

- [WulframForge.exe](../dist/desktop/portable-library-v12-release/WulframForge.exe), version `0.7.0-creative.12`.
- SHA-256: `F98AEDEDD30249EBC9839E95BF882095F8E079E78783EFD7863D6310580D26AB`.
- [Full acceptance runner](../outputs/product-baseline-gSbLId/report.json): all five steps passed on this executable. Source suite: 230 tests, 229 passed, one existing fixture skip. Typecheck and scoped lint passed.
- [Combined native map workflow](../outputs-desktop-test-1yy043/report.json): passed.
- [Creative and portable library tests](../outputs/creative-native-j6yUY4/report.json): passed, including reload, import conflict/duplicate preservation, rename/remove/library undo and map revision preservation.
- [Random-map tests](../outputs-desktop-test-v597OL/report.json): passed.
- [Reviewed native management screenshot](../outputs/creative-native-j6yUY4/portable-library-manager.png). Its unsupported-version message is intentional rejection evidence; the two valid bases remain visible.

An earlier test stopped because its pre-portability reload assertion expected one favorite; the new conflict test correctly creates two. The assertion now checks the appropriate count. A subsequent data review added provenance/extension-metadata preservation to duplicate detection, and the final executable above passed the complete runner again. Earlier artifacts and failed receipts were retained.
