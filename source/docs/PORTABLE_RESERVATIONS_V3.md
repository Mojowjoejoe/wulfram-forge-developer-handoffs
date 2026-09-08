# Portable expansion reservations: library schema 3

Frontier favorites now capture the actual saved corridor points, widths, names and team filters in coordinates relative to each team's base anchor. Moving or rotating a favorite on another map transforms those coordinates around the new anchors. Edited geometry is preserved rather than regenerated from the recipe. Buildings retain the existing favorite snapshot behavior: team-one composition is mirrored to team two.

Library exports containing reservations use version 3. Ordinary bases still export as version 1 and district modules as version 2. Readers reject unknown reservation versions, unsupported snap policies, invalid geometry and constrained entries mislabeled as older wrapped library versions. Reservation differences participate in duplicate detection. Existing legacy array imports remain supported.

This milestone supports exactly the two Frontier expansion corridors, each protecting all teams. Unsupported areas or additional authoring rules on a constrained base require whole-map export; they are not silently discarded. It does not make arbitrary constraints, rectangular areas, district relationships or terrain protection portable.

Placement uses shared-footprint-v2 snapping and checks full corridor extent against the chosen radius, map bounds, building footprints and paired terrain support. Failed placements leave the source map unchanged. Saved copies retain a reservation policy marker so removing both reservations cannot silently turn them into an unconstrained favorite.

## Source evidence

- `tests/portable-reservations.test.mjs`: edited three-point corridor and width/name preservation, library round trip, second save, rotation and relocation onto a larger map, duplicate identity, unsupported schemas and rule types, radius rejection, occupied reservation rejection, map-edge rejection, asymmetric terrain rejection and source preservation.
- Updated the existing future-version rejection fixture from 3 to 4; version 3 is now recognized.
- Typecheck and scoped lint pass. Full source results: `outputs/portable-reservations-source.log`.

## Remaining acceptance

No new desktop executable or native workflow acceptance is claimed for this source milestone. Next: build the private desktop, test favorite export/import/reuse through the UI, then integrate Frontier into candidate preview and complete native Apply/Undo/export/reopen plus visual/topology review. The reviewed creative catalog remains at 15 families; the roadmap remains open.
