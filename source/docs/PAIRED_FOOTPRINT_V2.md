# Shared paired footprint policy v2

Frontier Camp's symmetric-valley failures exposed different terrain sampling beneath the two teams' differently sized model bounds. Each model was fitting its own sampled plane; near a valley crease, the resulting pitch, roll and model-bottom elevation could differ despite rotationally symmetric terrain and XY positions.

`instantiateSymmetricPairedTemplate` now uses the larger of the two team footprints for both terrain fits. It keeps each model's original bottom offset and authored clearance, and samples each side's actual terrain independently. It does not copy height from one team, change terrain, alter pair-check tolerances or force asymmetric terrain to pass.

This is opt-in via `placeFormation(..., placement, 'shared-footprint-v2')`. Opted-in layout metadata records `formation.snapPolicy=shared-footprint-v2`. The default remains legacy placement, preserving existing creative recipes. The policy is currently used by the experimental Frontier review tool, not registered in the shipped creative picker. Existing imported layouts retain their serialized poses.

## Evidence

- `tests/paired-template.test.mjs` reproduces the legacy symmetric-valley mismatch and verifies the new policy, unchanged default behavior, identical flat placements, source nonmutation and continued asymmetric mismatch detection.
- Typecheck and scoped lint pass. Full source suite: 274 tests, 273 passed, one existing skip; `outputs/shared-footprint-v2-source.log`.
- `outputs/frontier-camp-review-v2b/report.json`: 192 cases, twelve seeds per size over four sizes and four terrain fixtures. Seeds cycle through 0°, 35° and 90° placement; this is not twelve seeds at each angle.
- All 144 flat, symmetric-valley and symmetric-irregular cases pass the recorded power/project, spacing, model, access, reservation, deterministic replay, strict pairing and nonmutation checks.
- All 48 asymmetric-fixture cases fail the review's strict pairing gate. The low-level placement function can still construct them; the review explicitly rejects them. Library integration must retain the relevant acceptance gate.
- Twelve representative importable maps are under `outputs/frontier-camp-review-v2b/`: `<flat|valley|irregular>-<small|standard|large|massive>.json`.
- Native `outputs-desktop-test-k9NQbI/report.json` passed import and inspection preservation for all twelve maps on existing v34 EXE, SHA-256 `156D32AEE25333160FF08C0D488D973220904CA45C53C66C5CCEF8A9C8DBFD72`. Twenty-four overhead/ground screenshots were captured. Small valley and small irregular ground views were visually reviewed; visible structures follow the terrain, with a remaining sampled tight-clearance warning. This checks serialized candidate rendering, not native execution of the new placement helper.

No new desktop EXE was necessary to inspect the serialized maps. The source policy still needs native generator integration, paired clearance/embedding review, and the remaining Frontier family workflow gates. The catalog remains 15 reviewed creative families. Earlier failed reports remain intact.
