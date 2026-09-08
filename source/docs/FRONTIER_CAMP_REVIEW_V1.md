# Frontier Camp experimental review v1

Status: implemented experimental recipe and four importable flat-map review candidates. **Not yet registered as a creative library family.** The accepted catalog remains 15 families.

Follow-up: [Shared paired footprint v2](PAIRED_FOOTPRINT_V2.md) fixes symmetric-slope pairing with an opt-in placement policy. The v2b matrix has 144 symmetric successes and 48 asymmetric rejections, plus twelve native-imported representatives. The original evidence below remains historical; catalog/workflow integration is still pending.

## Spatial and composition contract

`lib/frontier-camp.ts` defines `frontier-camp-v1`. Its occupied service hook stays west of a deliberately empty expansion strip. The smallest design has a command/repair/refuel core. Larger sizes extend the hook with a second supply yard, an anti-air/missile position, and then a missile-heavy rear position. Each site has a primary/backup power-cell pair; deterministic bounded variation changes positions and optional defenders or Darklights.

Unlike Starter Hideaway, this candidate persists a named reserved expansion strip for each team in `forge.build-areas.v1`. Each strip uses the existing capsule/corridor geometry: 500 u centerline, 320 u width. It excludes buildings of all teams until explicitly resized or removed. It does not reserve terrain heights, automatically place future buildings or promise power coverage within the expansion site. The shared axis is transformed into the selected placement rotation and the opposing team's 180-degree counterpart.

Observed counts across the twelve reviewed seeds per size:

| Size | Structures per team |
| --- | --- |
| Small | 7–8 |
| Standard | 13–15 |
| Large | 19–22 |
| Massive | 26–28 |

All four sizes are original-size models. Counts are recipe results; arbitrary exact-count fitting is not integrated.

## Review evidence and failures

Run `node --experimental-strip-types tools/review-frontier-camp.mjs`. Current report: `outputs/frontier-camp-review-v1c/report.json`.

- 144 cases: twelve deterministic seeds × four sizes × flat, valley and irregular fixtures.
- 48 flat cases passed power/project validation, model/spacing/edge checks, sampled access, reserved-space checks, deterministic replay, strict rotational entity pairing and source nonmutation.
- 96 valley/irregular cases failed strict pairing. Detailed receipts retain planar, model-bottom height and rotation deltas. XY deltas remain near floating-point zero; non-flat height/rotation pairing needs resolution. These are explicit rejections, not successes or reasons to relax the pairing gate.
- The irregular fixture is not rotationally symmetric and is an intentional stress input; its rejection cannot by itself establish a placement defect. Even the symmetric valley cases exhibit height/rotation mismatches, so that path warrants separate investigation.
- Initial v1/v1b receipts are retained. V1c replaces the blank project's checkerboard/backface placeholder with original `1snow001` for useful visual review; geometry and pass/reject counts are unchanged.

Native receipt `outputs-desktop-test-giTHGG/report.json` passed on existing v34 EXE (`156D32AEE25333160FF08C0D488D973220904CA45C53C66C5CCEF8A9C8DBFD72`). All four flat candidates import with exact layout/entity/terrain equality. Team overhead and ground inspection preserves the map. Eight screenshots were captured; large overhead and small ground views were visually reviewed after the texture correction. They show the hook/expansion outline and visible powered structures. The route inspector still reports a tight-clearance warning; sampled access success is not vehicle-driving proof.

Typecheck and scoped lint passed for the experimental kernel/review tool. No production generator branch or family list changed, and no existing maps were edited.

## Importable candidates

- `outputs/frontier-camp-review-v1c/flat-small.json`
- `outputs/frontier-camp-review-v1c/flat-standard.json`
- `outputs/frontier-camp-review-v1c/flat-large.json`
- `outputs/frontier-camp-review-v1c/flat-massive.json`

Use Import in v34 or later. These are separate review maps with an empty default layout retained alongside the experimental base layout. Remove or resize the named expansion reservation explicitly before building there.

## Remaining family gate

Resolve terrain contracts and symmetric-slope pairing; test rotated placement and undersized bounds; preserve expansion geometry through adaptation and exact-count requests; integrate recipe/version/district records with creative Preview/Apply; test Undo, retained ZIP round-trip and portable favorites; review all size views and compare the topology against Starter Hideaway, Caravan Depot and Switchback Supply. The larger hook still uses local powered yards, so the distinction must remain the whole-base spatial plan and enforceable expansion site, not merely added yard copies. No gameplay or new-family acceptance is claimed yet.
