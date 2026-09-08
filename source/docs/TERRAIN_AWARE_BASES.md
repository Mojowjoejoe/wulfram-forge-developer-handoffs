# Terrain-aware random base designer

Apply a balanced terrain candidate, then open **Random base** in the top toolbar.
Saved base settings now populate this dialog when the active layout has a
`baseGenerator.identity`. The Balanced dialog likewise loads saved map-generation
inputs, including the original seed and base elevation. Missing custom templates
and malformed metadata are reported rather than silently substituted.
Choose a base template, seed, maximum base diameter, spacing, and rotation. Click
**Preview bases** to review both teams, terrain shading, placement checks, and
legality/fairness results. **Apply previewed bases** is enabled only for a passing
candidate tied to the same source project. Form changes do not change an existing
preview; regenerate it first. Cancel leaves the project unchanged.

This first sprint varies a proven template rather than inventing a defense budget.
**Forge deployed combat base** is included alongside Base in a Box: a deployed
power cell, repair/refuel, uplink, two guns, two flak turrets, missile launcher,
skypump and darklight per team. The authored orientation faces along the map diagonal.
A seeded ±5% radial variation and the chosen spacing vary each unit's offset;
the chosen rotation applies to the whole formation. Team 2 receives its rotational
counterpart, with each side terrain-conformed against the existing surface.
A required paired uplink is added when the template lacks one.

The terrain and map-level metadata are never changed. Only team 1/2 entities in the
active layout are replaced; neutral entities and inactive layouts are preserved.
The standard base-scope edit path supplies undo/redo and persistence. Generated
base identity and current analysis are recorded in active-layout metadata under
`baseGenerator.identity` and `baseGenerator.analysis`.

Limits:

- Requires rotationally symmetric terrain with generated anchor metadata; arbitrary
  imported/asymmetric maps need a later anchor-placement workflow.
- Uses existing model footprint, terrain snap, power, spacing, and legality checks.
  Conservative bounds reject missing models, off-map structures, excessive base
  extent, and any auto-clamped/auto-rescaled placement. No terrain flattening occurs.
- The preview is a coarse top-down terrain shade and entity-center overlay, not a
  rendered collision visualization. Dots are not structure footprints.
- Existing fairness thresholds remain unchanged. A rejected candidate can be
  retried with another seed, template, spacing, rotation, or diameter.
- Where both team models have asset bounds, pairing compares model-bottom
  elevations rather than differently offset model origins. The one-unit height
  tolerance is unchanged; actual displacement still fails.
- Balanced terrain regeneration replaces active team bases but preserves neutral
  entities and inactive layouts. It requires explicit confirmation. Inactive
  layouts retain their data and must be revalidated on the changed terrain.
- This does not establish tactical balance or replace live playtesting. All
  development and package distribution remain private.
