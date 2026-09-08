# Base Workshop v14: mirrors and editable membership

Private R4 continuation, building on [v13](BASE_WORKSHOP_V13.md). The complete district designer remains in progress.

## Use the new controls

Open Base builder → Base Workshop · districts and select buildings.

- **Mirror X positions / Mirror Y positions:** reflect positions around the selection's mean coordinate and reflect headings. This is an immediate, one-step undoable edit. It ignores the move/rotation fields, keeps teams unchanged and does not reflect model geometry. Buildings conform individually to terrain. Structures with locked rotation reject either mirror operation before any change. Map-center bounds checks still apply.
- **District to update:** choose the saved record you intend to edit. This fills the name field without changing your building selection.
- **Rename district:** saves the edited name on that record while preserving membership and other metadata.
- **Replace district members:** replaces that record's membership with your current selection. Use this to extend a yard or repair a record after deleting buildings. It does not move or delete buildings.

Rename and replacement each take one map Undo step. The existing Save named district action still creates a separate record. Removing a record still leaves its buildings in place.

## Recovery and preservation

An unchanged district with missing members no longer prevents removing or repairing another record. Renaming an orphan record is allowed; selecting it still reports the missing members. Newly added or changed memberships must reference existing building entities. The editor does not silently discard broken records or add missing buildings. Invalid metadata continues to be retained and reported.

Mirroring reflects planar placement and yaw; original model geometry and terrain-fitting rules remain authoritative. Recheck power, service access and collision footprints after edits. These controls do not establish gameplay balance or concealment.

## Verification

Unit checks cover reflection and inverse reflection, heading changes, unaffected teams/source, locked structures, invalid mirror directions, and independent repair/removal with multiple orphan records. Native checks exercise both mirror controls and Undo, rename and membership replacement without entity changes, their Undo steps, and the existing saved-district export workflow.

```powershell
node tools/test-product-baseline.mjs dist/desktop/base-workshop-v14/WulframForge.exe outputs-stamp-lab-IdQbRb/Landform-visual-lab.zip --districts
```

The runner also checks source tests, TypeScript, combined terrain editing, creative/portable libraries and randomized maps on the same executable.

Accepted private executable: `dist/desktop/base-workshop-v14/WulframForge.exe`, version `0.7.0-creative.14`.

- SHA-256: `CA46E6FB2405032957C6B42641EC22D83AC37BCF9E6E632F61C7A7531D77F83E`.
- Aggregate: `outputs/product-baseline-mhIv5J/report.json` — all five stages passed.
- Source tests: 235 total, 234 passed, one existing fixture skip; zero failures. Typecheck and scoped lint passed.
- Combined terrain native receipt: `outputs-desktop-test-8lazDK/report.json`.
- Creative/library/district native receipt: `outputs/creative-native-jNpEUe/report.json`.
- Reviewed workshop screenshot: `outputs/creative-native-jNpEUe/district-workshop.png`.
- Random map native receipt: `outputs-desktop-test-vYcKVl/report.json`.

The existing large-bundle and WindowsBase build warnings remain. No public release or gameplay certification is implied by these editor receipts.

## Remaining R4 work

User-defined locks enforced across editing paths, alignment tools, direct group manipulation, reusable district modules and the full manual base-authoring acceptance journey remain open. This sprint does not mark R4 or the full roadmap complete.
