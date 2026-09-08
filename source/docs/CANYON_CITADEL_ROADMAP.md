# Canyon Citadel — showcase roadmap

Status: private showcase candidate v1 completed; in-game playtest remains separate.

## Completion audit

- Layout/terrain: custom 257-grid, 6400-square authored landscape; connected ridge
  masses, foothills, broken sunken arena and three distinct curved/main routes.
  `outputs/canyon-citadel-showcase-v1/project.json` is the delivered geometry.
- Fortification: 54 verified modeled structures, three separated power districts
  per team, protected rear service court and offset entrances; no skipped assets.
- Gates: `analysis.json` passes all terrain/entity/placement gates. `routes.json`
  verifies all three complete base-to-base paths, including entrance connections,
  at sampled 120-unit width and conservative model clearance. `cover.json` blocks
  all 336 specified attack rays. No thresholds weakened; informational backup
  power notices remain. These are sampled proxies, not universal collision/LOS proof.
- Visual review: final overview, central approach, both bases and service courts
  rendered in RC29. Screenshots in `outputs-desktop-test-eb4kBk` show earthworks,
  courts, clear maneuvering space and original blended materials. Low views can
  obscure service units behind the cover; elevated court views were added to review
  their actual arrangement. No independent multi-agent or live-game review claimed.
- Roundtrip/editor: builder asserts canonical source roundtrip, deterministic ZIP
  bytes and ZIP project preservation. `outputs-desktop-test-eb4kBk/report.json`
  passes real import, save, Export map, process restart and unchanged project checks.
- Regression: main 110 pass / 1 existing skip, critic 6 pass; typecheck and lint pass.
- Handoff: `outputs/Canyon-Citadel-v1-private-handoff.zip` includes map, project,
  authoring snapshots, canonical source, verification reports/source, screenshots
  and README/playtest checklist. ZIP CRC and map/test fixture hash parity pass.
  SHA-256: `5454aa004f895bd566b4fcd0d09dd3fc01ad511c5f778774ef2832dbe75c737f`.
- Private/preserved: existing drafts and maps retained. Public push disabled, no
  public upload, commit or publication. No user editor session modified.

All five offline showcase stages are satisfied. Vehicle handling, projectile arcs,
defensive firing arcs and multiplayer/team-swap balance remain explicitly unverified
and are listed in the private playtest checklist. Historical progress below records
the failed and superseded drafts, not open release findings.

## Progress — authored blockout v6

- v1/v2 failed slope/high-ground gates; retained as diagnostic iterations.
- v3 changed flank geometry and ridge shoulders; terrain gates passed.
- v4/v5 replaced temporary bases with three authored power districts per team.
  Shields and heavy silos lack verified models; no invisible substitute assets used.
  v5 explicitly asserts zero skipped models. All 54 structures are now present.
- v6 adds paired ridge-route elevation, broken arena rim and native blended canyon,
  sandrock and rockwall materials. All offline gates pass, zero errors/warnings;
  informational backup-power notices are expected. Terrain coverage is 65.9%.
- Real RC29 EXE import/save/process-reopen passed for v5 and v6, with isolated
  profiles. v6 receipt: `../outputs-desktop-test-FG7I5k/report.json`.
- Latest iteration: `../outputs/canyon-citadel-blockout-v6/`; builder:
  `../tools/build-canyon-citadel.mjs`; authored base: `../lib/citadel-base-template.ts`.
- Still NOT a finished showcase: ground-level visual review, all-three-corridor
  proof, footprint/exit checks, final polish, roundtrip and final handoff remain.
  Continue these requirements; do not equate the two-route minimum with three-route proof.

## Design brief

### User correction: base sightline protection

Implementation progress: v8 introduced mirrored offset entrances and front/service
barriers; v9 blocked sampled rays but failed connectivity/high-ground checks. v10
extended ramps but created new exposed elevated attack positions. v11 lowered the
external approach grades and used lower return walls: all broad offline gates pass,
and all 168 sampled attack rays per team are blocked. Entrance center/edge samples
(120-unit width) are effectively flat. Fresh tests use `verify-citadel-cover.mjs`.
These rays target power/repair/refuel from seven forward/flank positions at observer
heights 10/35/70, toward structure origin +30; this is not a blanket guarantee against
every position, flying unit or ballistic trajectory.

Latest physical draft is `outputs/canyon-citadel-blockout-v11`; its embedded name
still says v9 because those iterations changed only geometry. Normalize revision
labels for the next candidate. Next: inspect new base screenshots, connect/verify
all three corridors through the offset entrances, check model-footprint spacing
and full source/export roundtrip. Do not reuse the obsolete straight exit proof.

The open straight approach is not acceptable: enemies should not have a direct
firing lane into the service court. Replace the straight entrance with offset,
vehicle-width approaches around substantial terrain cover. Protect power, repair
and refuel from main-route and flank sightlines. Defensive wings may engage the
approach, but rear essentials must not be exposed across the map. Add explicit
sampled terrain line-of-sight checks from main/flank attack positions; document
tested eye/target heights and preserve the caveat that live weapon/projectile
behavior still requires game testing. Rerun corridor and exit checks after cover.

v7 introduced low perimeter earthworks but its independent flank-corridor check
found slopes around 40.6 degrees where berms cross the approach. It is NOT a passing
three-route candidate even though the broad two-route analysis passes. Cut designed
entrances through the earthworks while implementing the sightline protection above.

One deliberately composed map, not another random test fixture. Working size:
6,400 x 6,400 world units, 257 x 257 height vertices. Rotationally matched teams
on the southwest/northeast diagonal. Dimensions are a design starting point, not
a claimed engine or vehicle-clearance certification.

Visual hierarchy: fortified home terraces -> three readable approaches -> sunken
central arena framed by connected broken ridgelines. Broad foothills and ramps;
no scattering of isolated needle peaks. Original canyon/rock textures only; no
invented decorative models, functioning gates, minions or new game mechanics.

The two flanks each transition from canyon to ridge, in opposite order. Rotating
the map swaps them, so neither team owns an exclusive high-ground advantage.

## Stages and exit checks

1. **Layout/blockout.** Save deterministic builder and spatial design. Establish
   base terraces, center arena, broad main route and two separated flank corridors.
   Exit: readable top-down composition and finite exactly paired terrain. Starter
   structures may be used here but cannot count as completed fortified bases.
2. **Terrain architecture.** Sculpt connected mountain masses, low foothills,
   canyon bends, ramped elevated routes and broken arena rim. Tune heights/widths
   from evidence, not by relaxing checks. Exit: offline traversal, objectives,
   connected area and high-ground gates pass; all three authored corridors are
   separately inspected (the existing two-route minimum alone does not prove three).
3. **Citadel bases.** Design a rear service court, defensive wings and open forward
   deployment aisle with verified existing buildings. Work within measured model
   footprints, power radii and paired bottom clearances. Exit: both teams have
   powered repair/refuel services, uplinks, legal spacing, symmetric placement and
   unobstructed exits. Do not merely rename the eleven-unit test base.
4. **Visual polish.** Limit palette to coherent ground, route and cliff materials.
   Inspect overhead, center, both bases and ground-level approaches in the editor.
   Iterate terrain silhouettes and texture transitions. Exit: landmarks and route
   choices read clearly without labels; no floating buildings or repeated spikes.
5. **Verification/handoff.** Run reproducibility and source/ZIP roundtrip checks;
   import/save/reopen the finished artifact in the real isolated editor, review
   screenshots and run critic/fix/retest. Deliver private map ZIP, editable project,
   reproducible builder, checksum, screenshots, validation and playtest checklist.

## Completion contract

All five stages must pass before calling this a showcase candidate. Rejected
blockouts remain diagnostic iterations, not deliverables presented as finished.
Preserve prior exports, user maps and existing dirty editor work. Never publish
publicly. Base or terrain edits must not fabricate existing-generator metadata:
custom showcase terrain is identified separately until editor support is authored.

Actual Wulfram vehicle handling/collision, weapon sightlines, spawn behavior and
team-swap match balance require in-game testing after the offline showcase handoff.
No estimated date is committed before the terrain and base blockouts are evaluated.

## First work item

Build a custom terrain blockout with connected ridge strokes and reserved route/
base spaces. Save its analysis regardless of pass/fail, mark it BLOCKOUT, then use
the failures and editor screenshots to direct the next iteration.
