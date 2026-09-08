# Offset Bastion — review candidate v1

Status: experimental source candidate, not promoted into the creative picker or the reviewed-family count. The existing 15 reviewed styles are unchanged.

## Spatial and composition contract

Offset Bastion separates a rear command/service yard from a forward defense position. Larger sizes add a service/flak side yard, a rear support district and a detached missile/flak position. Its defining authored constraint is a three-segment, two-turn approach, 200 u wide, whose initial straight segment is offset from the command yard. This differs from Split Gatehouse's shoulders around a central entrance and Frontier Camp's occupied hook beside an empty expansion strip. The design reserves space; it does not force vehicles to take the path or certify projectile cover.

| Size | Required structures per team | Fixed site count | Fitted target in review |
| --- | --- | --- | --- |
| Small | 10 | 2 | 12 |
| Standard | 16 | 3 | 18 |
| Large | 22 | 4 | 26 |
| Massive | 28 | 5 | 34 |

Every occupied site has paired power cells. Required role counts are stored in `formation.requiredCounts` and checked after count fitting. Command, repair/refuel, gun, flak and optional larger-size missile/Darklight roles use existing original assets. Random seeds vary positions and optional defenders. Geometry is identified by `offset-bastion-v1` and four golden placements in `tests/fixtures/offset-bastion-v1.json`.

The shared candidate pipeline applies count fitting, optional whole-yard terrain adaptation, building-radius checks, shared-footprint paired placement, ordinary power/access validation, full reserved-approach clearance/map bounds, and strict rotational-pair checks. Accepted layouts retain their two authored corridors in `forge.build-areas.v1`. Unusable budgets, reservations and unequal terrain support reject without changing the input. No terrain is flattened.

## Evidence

- Source matrix: `outputs/offset-bastion-review-v1/report.json`, 192 cases. All 144 flat/valley/irregular symmetric cases pass; all 48 asymmetric cases reject. Each terrain/size runs 12 seeds, three rotations, automatic/fitted counts and terrain adaptation both on/off. Rejection reasons are recorded, including pairing and occasional role-budget failure on the final candidate; the rejected cases are not counted as successes.
- Twelve editable representatives: `outputs/offset-bastion-review-v1/{flat,valley,irregular}-{small,standard,large,massive}.json`.
- Full source suite before the added golden check: `outputs/offset-bastion-v1-source.log`, 299 tests, 298 pass, one existing skip. The final three-test Offset Bastion suite, including the golden geometry check, passes. Typecheck and scoped lint pass.
- Native import/inspection: `outputs-desktop-test-o1zLlN/report.json` PASS, twelve maps and 24 overhead/ground captures. All imported terrain/entities/layouts match their files and inspection leaves them unchanged.
- The native host was the existing v45.1 EXE, SHA256 `827DFB0E0831AAB0BD7D9BF813EEDC5A9368519FFD6B5D3BF0F0B8CEE53CAA3E`. This proves candidate-map compatibility and display, not native generation of the new source recipe.

## Critic findings and remaining gates

Three captures were visually reviewed in this first pass: flat small overhead, flat massive overhead, and valley large ground. The bent magenta reservation is visible and the separate districts remain legible. Original building models become tiny at broad overhead framing and power icons dominate; catalog imagery needs closer role-focused views. The automatic service route can take a different path from the reserved bent approach and reports tight-clearance warnings near services. Both routes need explicit review before promotion; the reserved path is not proof that the automatic approach follows it.

Still required: complete representative visual review, same-size seed comparison, authored-approach/automatic-route treatment, card/help assets, native generation/Apply/Undo acceptance, portable favorites that retain this family's corridor IDs, map ZIP/restart editing acceptance, and catalog admission review. Current portable reservations only support Frontier's known IDs, so use whole-map export for these candidates. No game or balance claim is made.

Run source review with `node --experimental-strip-types tools/review-offset-bastion.mjs`. Native import review uses `WULFRAM_FAMILY_REVIEW=offset-bastion` and `WULFRAM_FAMILY_ALL_TERRAIN=1` with `tools/test-desktop-workflow.mjs`, an existing private EXE and the flat-small representative. The family-review branch retains Frontier compatibility.

Follow-up: [private v46](OFFSET_PORTABILITY_V46.md) adds the experimental picker entry and schema-2 portable approaches. Small-candidate native generation, Apply/Undo, favorite export/import, larger-map reuse, map ZIP round trip and restart pass. This supersedes the initial native-generation/portability gap for that tested scope; full catalog admission remains open.
