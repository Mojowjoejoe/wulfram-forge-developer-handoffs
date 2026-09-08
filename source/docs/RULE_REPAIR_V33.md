# Advanced saved-rule repair v33

Base builder now includes **Advanced saved-rule repair** for an active layout with several invalid authoring categories. This is an advanced JSON recovery tool; ordinary district, area and composition panels remain the normal editing workflow.

1. Download original repair backup. This downloads the entire current project as an importable JSON file; it is a user-triggered download, not a claim that a backup was stored automatically.
2. Load current repair rules. Edit the four displayed JSON arrays together. An empty field explicitly removes its category, including locks or protection records in that category.
3. Preview rule repair. All four proposed categories must pass saved-rule inspection against the existing buildings. The review names categories that will be replaced or removed.
4. Apply reviewed rule repair. One map Undo restores the original rules, including malformed values. Any intervening map change requires loading and previewing current rules again.

The repair constructor accepts only the four known metadata categories in the active layout. It clones the project and changes no buildings, terrain, inactive layouts or unrelated metadata. This explicit metadata-repair path does not use ordinary edit rejection to prevent replacing an already-malformed rule; it validates the resulting active-layout rules instead. It is not exposed as a general mutation bypass or MCP operation.

## Private artifact

- EXE: `dist/desktop/rule-repair-v33/WulframForge.exe`, version `0.7.0-creative.33`.
- SHA-256: `672DCC4FE1F15C0C637AAF33C589130A903479FAFCA2FA311CEC55B56BC4880D`.

## Evidence

- Typecheck, scoped lint and desktop build passed.
- Full source suite: 272 tests, 271 passed, one existing skip; `outputs/rule-repair-v33-source.log`.
- Source tests verify incomplete repair rejection, exact nonmutation, permitted category scope, inactive-layout and unrelated-data preservation, original restoration, size limits, unknown keys and unchanged proposals.
- Native `outputs-desktop-test-KfW96p/report.json` passed. It imports a map with malformed areas and an unmet repair count, downloads and compares the entire original JSON backup, rejects a partial repair, verifies successful Preview is nonmutating, applies the two-category repair with one Undo entry, and restores the entire original project with Undo.
- `reviewed-rule-repair.png` was visually reviewed. All four fields and the review are accessible within the scrolling inspector; status text currently wraps beside Apply and can be spaced more clearly in a later polish pass.
- The same run also passes problem navigation, standard terrain/base editing, Undo/Redo, export and restart. The repaired state is undone before the standard export workflow; this receipt does not prove export/reopen of a retained repair.

Open work: a novice-friendly schema form, per-rule before/after comparison, stale-preview native acceptance, retained-repair export/reopen checks, inactive-layout selection during recovery and integration into unified inspection. Current checks establish authoring consistency, not power, route or gameplay readiness.
