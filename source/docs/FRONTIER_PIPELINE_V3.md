# Frontier Camp shared pipeline v3

`createCreativeBaseLayout` now accepts the experimental style ID `frontier-camp`. It uses the existing candidate retry, exact-count fitting, terrain adaptation, radius, model/spacing, power and sampled-access pipeline, with additional Frontier contract checks. The style remains outside the picker and the 15-family reviewed catalog pending portable reuse and native generation acceptance.

The pipeline records `formation.version=frontier-camp-v1`, `formation.snapPolicy=shared-footprint-v2`, the actual candidate seed, placement/adaptation receipt, explicit minimum counts and the two named expansion reservations. Count fitting must retain the size's minimum roles. After adaptation, reserved-space checks reject layouts that occupy the expansion strips. Radius checks include the complete reservation extent. Strict paired support is enforced before returning a candidate; asymmetric placements no longer require a downstream reviewer to reject them.

Minimum counts are per team and stored by original unit token:

| Size | Cells | Uplink | Repair | Refuel | Guns | Flak | Launchers |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Small | 2 | 1 | 1 | 1 | 1 | 1 | 0 |
| Standard | 4 | 1 | 2 | 2 | 2 | 1 | 0 |
| Large | 6 | 1 | 2 | 2 | 2 | 2 | 1 |
| Massive | 8 | 1 | 2 | 2 | 3 | 3 | 3 |

These are generation requirements, not a claim about game balance or editable per-district budgets. Infeasible requests fail without changing the source. Reservations stay at the intended base anchor; adaptation may move occupied yards but must leave that expansion space empty.

## Evidence

- `outputs/frontier-camp-review-v3/report.json`: 192 cases across twelve seeds, four sizes and four terrain fixtures. Seeds cycle 0°/35°/90°. Half enable terrain adaptation; the last six seeds request 9/16/24/32 structures per team for small/standard/large/massive respectively.
- All 144 flat and symmetric non-flat cases pass. All 48 asymmetric cases are rejected by the shared generator after its bounded candidate attempts. Each successful requested count is checked exactly, and persisted reservations/policy are checked against the expected geometry.
- `tests/frontier-camp.test.mjs` covers deterministic pipeline replay, original-map preservation, rotated reservations, role/policy receipts, exact count, blocked later edits into reserved space, infeasible small counts, insufficient reservation radius and asymmetric rejection.
- Typecheck and scoped lint pass. Full source suite: 276 tests, 275 passed, one existing skip; `outputs/frontier-pipeline-v3-source.log`.
- Twelve new serialized representatives are in `outputs/frontier-camp-review-v3/`. Prior v2b native rendering receipts remain historical; v3's source-pipeline results have not yet had native Preview/Apply/Undo or picker acceptance. No new desktop build or public release is claimed for this source-only integration milestone.

## Next required work

Favorites currently serialize buildings but do not carry saved area reservations. Frontier cannot be promoted through the normal library workflow until portable reuse preserves its expansion contract, with explicit schema/version validation and placement checks. Then add the candidate to the preview UI, complete native Preview/Apply/Undo/export/reopen and favorite reuse checks, and finish the visual/topology review. The six-family and 48-family roadmap gates remain open.
