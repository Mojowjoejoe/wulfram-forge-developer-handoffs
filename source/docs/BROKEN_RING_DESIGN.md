# Broken Ring design brief

Status: experimental recipe v2 is integrated through GUI/MCP and portable favorites in private v94. Scoped native generation, mixed-library preservation and restart/cross-map reuse pass. Automatic service approaches have documented tight warnings in some samples; full visual/access admission and gameplay evidence remain open. The admitted count remains 18. Combined v94 is now accepted through the linked original/replacement audit. V3 source is a separate candidate. The sections below retain chronological evidence; later checkpoints supersede earlier implementation status.

## Spatial contract

Create unequal perimeter segments around an open interior, with a broad forward opening and a separate offset rear service opening. Services belong on the rear segment; two unequal defensive shoulders occupy the forward sides. Neither opening may terminate inside a building footprint. A reserved bent route connects the rear opening, service frontage and forward opening. The interior is maneuvering space, not another occupied service yard.

The closest existing family is Citadel Necklace. Its current recipe uses seven fixed perimeter centers and a shared per-site placement routine (`lib/creative-base-layouts.ts`). Broken Ring must earn its difference through explicit connected openings, unequal segment lengths and functional placement along segments. Repositioning Necklace centers or deleting one yard is insufficient. Service Courtyard instead uses opposing service banks and a straight drive-through court; Broken Ring uses perimeter circulation and an offset rear entry.

All supported sizes must retain both openings, the connected internal route and distinct rear services/forward shoulders. A starter cannot be made by truncating the first two sites of the massive plan. Sizes should change occupied segment lengths and service/defense composition; original building models retain their size.

## Implementation requirements

Before implementation, fix a versioned local coordinate plan and explicit per-size role/count table using current original model bounds. Calculate the footprint from buildings and full reservation widths. Exact count requests below mandatory roles or above feasible placement must reject clearly. Do not invent feasible budgets before testing the geometry.

Seed variation should change segment lengths, opening offset and supported building arrangements within bounded topology-preserving limits. Keep same-seed reproducibility and golden fixtures. Reject candidates that close a gap, disconnect the route, lose mandatory roles or exceed power/terrain constraints. Variation must be visible across seeds, not only slight local jitter.

Use shared editor placement, model-bound clearance, saved power rules and route checks. Fit both teams when mirrored placement is requested, including asymmetric-terrain rejection. Terrain adaptation must preserve the connected route and reserved openings; do not flatten terrain implicitly. Preview must show the real reservation widths and occupied bounds.

Carry the complete plan through GUI and MCP, saved maps, portable favorites and destination-map validation. Inspect current reservation formats before choosing an extension; do not silently encode a new family as Courtyard or discard its route semantics. Reuse shared validation and atomic Apply/Undo.

## Admission evidence

Follow all eight requirements in BASE_LIBRARY_AND_DESIGNER_PLAN.md. At minimum: source invariants and invalid-input atomicity; four-size native preview/Apply/Undo and JSON/ZIP reopening; exact portable export/import and new-process reuse on a differently sized map; 12 seeds per supported size on flat, valley and irregular terrain; recorded rejection reasons; representative overhead, oblique and service-access images; independent implement/review/fix/test passes; and a usable illustrated guide.

Compare controlled seeds at the same camera and count, specifically checking that segment/opening variation changes the spatial plan while keeping access usable under editor checks. A passing sampled route or power test does not establish vehicle collision, weapon cover, competitive balance or server gameplay support. Admit only after the evidence is reviewed; keep unfinished work experimental.

MCP impact: generation and portability are required parts of implementation. This brief changes documentation only, with no tool schema or runtime behavior change.

Independent brief review found no actionable issue against the eight admission requirements or the two closest existing families. This approves the design brief for implementation, not the family for admission.

## Initial core implementation checkpoint (before circulation)

`lib/broken-ring.ts` now provides deterministic local plans, required role counts and original-model templates. Four sizes have 18/23/28/38 buildings across 4/5/6/8 sites. All command/repair/refuel roles occupy the rear two sites; remaining sites have defense roles. Each site has two power cells. Seeds vary rear opening offset by160 units, site angles over8 degrees and radial positions over160 units. These are bounded geometry variations, not yet visually reviewed variation evidence.

A 240-unit rear-to-front passage and two120-unit service-frontage branches reserve clear space; the empty interior has450-unit radius. Branches end400 units inward of the rear power centers and remain short of the actual pads. The core checks both-team model-bound proxies, spacing and all reserved paths, and computes bounds including their widths. Destination terrain, pad access, full perimeter circulation and actual vehicle traversal remain unfinished.

`outputs/broken-ring-core-tests.log`: two tests pass, including48 deterministic size/seed samples, exact totals/roles, all service sites in the rear, connected branch anchors, model/reservation spacing, power-center distance below270, missing models and unsupported sizes. TypeScript passes in `outputs/broken-ring-core-typecheck.log`. These are flat local geometry checks, not the terrain matrix or saved power-rule validation. Independent review caught forward services and missing frontage branches; both were corrected and re-reviewed without another core finding.

Before integration: finish/review the complete perimeter circulation contract, freeze golden fixtures only after geometry is settled, then add shared destination validation, GUI/MCP exposure and semantic portable storage. There is no new private EXE and no added catalog slot. The accepted combined binary remainsv91. MCP impact is identified but not yet delivered: this module is not registered as a GUI-only feature or exposed operation.

## Circulation and deterministic reference checkpoint

The current core now adds a complete120-unit-wide perimeter loop inside the occupied segments. Sixteen regularly spaced angles plus every site angle form an ordered closed path, within the32-point corridor limit. Both service branches terminate on exact loop vertices and share the main passage bend. The full loop band stays outside the450-unit open-interior radius. Service-frontage setbacks now vary from350 to510 units with site radius; the earlier fixed400-unit endpoint statement describes the initial core only.

Building-clearance and footprint calculations include all loop segments and their widths. Three tests pass in `outputs/broken-ring-circulation-tests.log`:48 size/seed cases, invalid inputs and four complete-plan/template hashes in `tests/fixtures/broken-ring-v1.json`. Geometry tests verify winding, no repeated internal vertices, shared branch endpoints, inner-band clearance and exclusion of original model-bound proxies. TypeScript and scoped lint pass in the corresponding circulation logs. Independent topology review found no actionable issue; missing local circulation geometry is resolved.

These reference fixtures freeze the current experimental v1 geometry for detecting later changes. They are not an admission or portable-format compatibility claim. Source remains unregistered in GUI/MCP. Next: shared destination placement and preservation of the route, loop and open interior, with terrain/paired-team/access failures checked atomically, then GUI/MCP and portability. Actual pad entry and destination traversal remain unproven. Native and visual acceptance, the12-seed terrain matrix and illustrated guide remain open. No new binary; combinedv91 stays accepted.

## Shared placement checkpoint

The shared creative generator now supports the internal `broken-ring` style. `lib/broken-ring-placement.ts` transforms ten reservations across both teams: passage, two frontage branches, loop and open interior per team. The interior is conservatively represented by a900-wide, one-unit-long capsule, preserving rotation and existing corridor serialization. Final checks include map/radius/model occupancy, paired terrain support and mandatory80-unit sampled access on all eight movement paths even when optional service-access checks are disabled. Required role minima survive count fitting.

Post-adaptation local-space checks retain power cells within100 units of a planned site and other roles within270 units of a role-eligible site; command/repair/refuel must remain rearward. These bounds deliberately constrain the shared800-unit search to retain the family relationships. The stored plan denotes intended sites, not adapted exact power-center positions. Pad entry remains unproven.

Ten scoped tests pass in `outputs/broken-ring-placement-tests.log`, including four sizes, mirrored reservations, source preservation, count/radius failures, a symmetric steep-passage rejection, terrainAware enabled on flat ground and a synthetic800-unit displaced-service rejection, plus existing Courtyard golden/regression tests. The displacement is not evidence of an uneven-terrain adaptation run. TypeScript, scoped lint and MCP synchronization pass in the placement logs. Independent review found and then accepted the fix for detached rear services.

GUI/MCP schema registration, portable family semantics, uneven-terrain matrix and private native build remain next. This source integration does not deliver a GUI-only feature: no selector has been added yet. Combinedv91 and the18-family admitted catalog remain unchanged.

## Offline terrain matrix and MCP command checkpoint

`tools/review-broken-ring.mjs` completed with exit0. `outputs/broken-ring-review-HH1zUZ/report.json` records192 cases:12 seeds per size on each of flat, valley, symmetric irregular and asymmetric fixtures. All144 symmetric cases accepted; all48 asymmetric cases rejected for paired-support mismatch or site/frontage detachment. Every rejection reason was reviewed against those two categories. Twelve representative map hashes verified. Assertions run outside the expected generator-error catch; accepted candidates independently pass reservation/validation/pair/access checks and exact repeatability excluding timestamps. Source snapshots stay unchanged.

Rotation0/35/90, terrain adaptation on/off and automatic versus20/25/30/40 requested counts vary with seed index; this is not their full cross-product. Representatives are first accepted terrain/size cases, not controlled variation imagery. Native terrain and visual evidence remain pending.

The existing MCP `generate_base_layout` schema already accepts a style string and dispatches through this shared generator, so no new tool or registration is required. A command-level test now proves Broken Ring source preservation, cloned activation, ten reservations, complete plan/access metadata and duplicate/count rejection. Four placement/MCP tests pass in `outputs/broken-ring-mcp-core-tests.log`; harness lint passes. Independent harness review found no blocking issue and identified the limits stated above. A rebuilt native host is still required before live Broken Ring use can be claimed.

Next: experimental library/GUI discovery and portable preservation of all ten areas plus family semantics, followed by the private build and native acceptance. Source changes only; admitted count18 and accepted combinedv91 remain unchanged.

## Experimental library and v92 build checkpoint

The library now includes an Experimental Broken Ring card at all four sizes, with five full-width bands: passage240, frontages120, loop120 and interior900. Search, labels, counts, plan bounds and unchanged18-family admission count are source-tested. Both dropdown and library handoff select radius3000 so the initial Fortified/Massive reservations fit their placement circle. A shared caption now derives reservation names and widths from the selected family rather than hardcoding Courtyard. Independent review identified those two GUI issues; both fixes were re-reviewed.

Twelve library/shared-placement tests pass in `outputs/broken-ring-library-tests.log`. TypeScript, scoped lint and MCP sync pass in the corresponding library logs. The existing MCP command schema covers this shared operation. Native GUI handoff/preview/Apply/Undo still needs verification in a rebuilt host. The UI explicitly directs users to whole-map saves while portable favorites remain unsupported; no reservation-dropping fallback is added.

Private build command is running in shell5972, targeting fresh `D:/WulframForgeBuilds/broken-ring-v92/WulframForge.exe` and version0.7.0-creative.92. Logs: `outputs/broken-ring-v92-build.log` and `outputs/broken-ring-v92-publish.log`. Do not treat the build as finished or accepted without polling its exact handle and checking terminal results. V91 remains the combined accepted baseline and launcher target is unchanged. No commit or publication.

Build completion: shell5972 exited0, web assets and desktop publish succeeded. V92 executable SHA256 `73b54ceaf1d505e0282f82edfe9815e96c352bea60ad244e3814200cd412559e`. This is a built private candidate, not native acceptance. Next run its isolated GUI/MCP checks before delivery as verified.

## V92 scoped native acceptance

The private v92 executable SHA256 `73b54ceaf1d505e0282f82edfe9815e96c352bea60ad244e3814200cd412559e` passed native shell30927, exit0. Receipt: `tools/mcp/MapEditerMCP/outputs/mcp-native-test-DJADBM/report.json`; log: `outputs/broken-ring-v92-native.log`. Isolated profile and `outputs/broken-ring-native-source.json` protect the user's editor/map.

The GUI found Experimental Broken Ring, verified five bands, handed off to preview, preserved the full source snapshot/history, applied28 structures per team in one Undo step and restored the original map. Native MCP generated all four sizes at4000,6000,35degrees/radius3000 with18/23/28/38 per team; preview matched Apply, prior layouts survived, stale and duplicate requests rejected, Undo restored source, and complete JSON/ZIP copies reopened with terrain/entities/layouts intact. Whole saved metadata includes all ten reservations and the versioned plan.

Review found that route-count assertions alone allowed duplicate route IDs. The harness now asserts exact IDs. That edit occurred after the running process had loaded its harness, so this run's original checks are supplemented explicitly by `tools/audit-broken-ring-native.mjs`: `broken-ring-route-audit.json` in DJADBM passes on all four saved native copies, verifying exact ten areas and eight distinct checked routes with matching geometry and no blocked markers. It hashes the input receipt, executable and saved copies. Harness/audit scoped lint passes.

The captured library screenshot was inspected and shows the intended experimental card and circulation sample, but catches dialog fade. It is not a settled visual-quality or in-map model inspection proof. Portable favorites, controlled visual comparisons, pad-entry/game proof and formal family admission remain open. V92 is scoped native evidence; v91 remains the combined accepted baseline. No launcher change, commit, push or public distribution.

Independent final evidence review verified current EXE, receipt and all four saved-copy hashes and accepted the supplemental exact-route audit. The scoped v92 workflow above is supported; remaining gates are unchanged.

## Portable core checkpoint

Reservation version5 and library envelope6 now carry Broken Ring's ten local areas plus its versioned seed plan. Import validates the complete regenerated plan independent of object-key order, exact IDs/sides/widths and geometry within numeric transformation tolerance. Older envelopes reject Ring reservations. Existing Frontier, Offset and Courtyard versions retain their encoding. Edited routes/plans deliberately reject with whole-map guidance; names can remain user-edited without discarding geometry.

Favorite placement reuses shared destination checks for paired support, power-site/service association and all movement routes before assigning metadata. The resulting favorite retains the plan and can be captured again after relocation. Nine portability tests pass in `outputs/broken-ring-portable-tests.log`: source preservation, envelope downgrades, malformed/missing/edited records, key reordering, export/import and90-degree reuse on18000x14000 terrain, plus previous family regressions. TypeScript, lint and MCP sync pass in the corresponding portable logs. Independent review accepted the bounded schema/atomicity behavior; key-order sensitivity and stale supported-family wording were corrected.

This is source-only portability. V92 does not contain it, and its GUI still correctly describes favorites as unsupported for that built version. Next: update GUI guidance, rebuild privately and verify library export/import/cancel/reuse with native GUI/MCP plus new-process persistence. Controlled visual review and family admission remain open;18 admitted and combinedv91 unchanged. No publication.

## V93 portability build and native run

Private build `D:/WulframForgeBuilds/broken-ring-portable-v93/WulframForge.exe` completed with exit0 (shell70672), SHA256 `219684c95554f41c833cc8a0fa7e14882a44ab87e1022f970fb329445b08135d`. Seventeen library/portable tests, TypeScript, scoped lint and MCP sync pass in `outputs/broken-ring-v93-*` logs. UI guidance now explains retained favorites and whole-map saving for edited routes; both MCP READMEs document existing shared-command support and desktop/version requirements.

Native run shell75104 uses `WULFRAM_BROKEN_RING_TEST_MAP`, `WULFRAM_BROKEN_RING_GUI_TEST=1` and `WULFRAM_BROKEN_RING_PORTABLE_TEST=1`; log `outputs/broken-ring-v93-native.log`. It is pending until the exact handle exits. Expected scope is exact reservation5/library6 favorite export/import/cancel/reuse, map/history preservation, poses/plan/ten areas/eight distinct routes, Apply/Undo and existing four-size GUI/MCP/JSON/ZIP checks. New-process persistence and changed-map native reuse remain separate forthcoming checks.

Independent harness review found no blocking standalone issue. Courtyard and Ring portable branches both expect one favorite, so they must not be enabled together in one profile until combined orchestration is corrected. This isolated run does not claim combined acceptance. V91 remains the combined baseline;18 families admitted. No launcher change or publication.

Native completion: shell75104 exited0. `tools/mcp/MapEditerMCP/outputs/mcp-native-test-G1ZuXg/report.json` PASS covers all expected GUI/MCP/four-size workflows and `brokenRingPortable` save/export/exact library/import preview+Cancel/import/history/reuseApplyUndo. Exported envelope6/reservation5 with ten areas was checked directly. `broken-ring-route-audit.json` in G1ZuXg passes against all four native saved copies and the current EXE. Source code checks now include exact route IDs during native execution, rather than relying solely on the supplemental audit. Same-process favorite reuse is proved; new-process persistence and changed-map native reuse are not yet claimed.

Independent final review verified current EXE, native receipt, four audit-copy hashes, exported envelope and reused plan/ten areas/eight unique routes. Scoped same-map native portability is accepted with no blocking discrepancy.

## V93 restart and cross-map reuse

`tools/mcp/MapEditerMCP/test-broken-ring-restart.mjs` launches a fresh v93 process with the prior isolated G1ZuXg profile and compares its favorite library exactly against the native export. Shell55514 exited0; `tools/mcp/MapEditerMCP/outputs/mcp-native-test-G1ZuXg/brokenRing-restart-O7rVUR/brokenRing-restart-report.json` PASS. Source fixture16000x12000 is reused on a distinct18000x14000 flat destination with default anchors4500/13500,7000. Both-team XY/yaw and all ten area transforms match the favorite; the original plan and all eight distinct checked routes remain intact. Preview preserves full snapshot/history, Apply adds one layout/Undo step, and Undo restores terrain/entities/layouts. Library stays unchanged. Camera actions preserve the applied snapshot.

`restart-artifact-hashes.json` verifies the current EXE and hashes nine linked artifacts (restart/prior receipts, applied map and six screenshots). Scoped harness lint passes. Independent harness review found no blocking issue. This proves flat destination XY/yaw and saved metadata, not uneven-terrain pitch/roll or physical pad-entry collision.

All six PNGs were inspected: two overheads show mirrored route topology but tiny buildings dominated by power icons; the two ground views are distant and sky-heavy; both repair close-ups are legible and show Powered under the editor rule. These are useful inspection records, not full visual admission. Closer perimeter/service views and controlled same-size seed comparisons remain next. The underlying v93 binary is unchanged; no commit, push, launcher change or public release.

Independent final review confirmed PASS/current EXE hash and inspected all six images, agreeing with the bounded visual findings above. Restart and flat cross-map reuse are accepted; full visual admission remains open.

## Controlled visual review: macro variation remains open

`tools/review-broken-ring-variations.mjs` generated12 flat controlled samples (seeds0/5/11 per size, counts18/23/28/38, same anchor/rotation/scale) in `outputs/broken-ring-visual-v2`. All four schematic PNG sheets were inspected. The first v1 output attempt failed on a harness style-name typo before producing accepted maps; corrected v2 output completed successfully and retains hashes/deterministic checks.

Native first capture `G1ZuXg/brokenRing-visual-matrix-WVViTC/brokenRing-visual-report.json` PASS produced24 images. A second run adding rear-yard framing via native wheel zoom produced36 images in `G1ZuXg/brokenRing-visual-matrix-ZbaH2Y`, PASS, preserving each imported map snapshot. The latter `visual-artifact-hashes.json` verifies12 source hashes,12 linked cases and36 image hashes. This is not a claim that all60 images were individually reviewed. Primary viewed small/massive overhead and repair images from the first run, and small/massive rear-yard images from the second; closer models and surrounding ground are readable, while overhead buildings remain tiny.

Independent schematic review found that v1 does not satisfy the brief's intended variation of perimeter segments: same-size seeds mainly move/turn individual yards while the segment distribution and opening relationships stay nearly identical. The connected loop and service branches distinguish its access topology from Courtyard, but the physical silhouette remains close to detached Necklace yards. This is an admission finding, not a reason to weaken the original contract. Keep Broken Ring experimental.

Next revision must vary the larger segment lengths/distribution and opening placement while preserving usable rear services, both openings, route connectivity, count contracts and power/spacing. Preserve existing v1 recipes/goldens and portable imports rather than silently changing the geometry reconstructed from their saved version/seed. A new version needs its own fixtures, placement/terrain matrix, controlled visuals and native/portable proof before admission. Existing v93 functional evidence remains valid for v1 only. No new product binary or publication this visual-review sprint.

Final image review additionally inspected service-bank cases small0, standard4, large8 and massive9. Small0/massive9 show useful support context; standard4 clips a neighbor and large8 mostly shows the pad, so neither establishes full-bank illustration. Review recommends seed-driven shoulder/segment angular spans and rear-opening position with recomputed validated connections; more images alone will not close the geometry finding.


## V2 macro layout and v94 native checkpoint

Recipe `broken-ring-v2` varies horizontal/vertical elongation, shoulder angles, rear entrance offset and front bend. V1 reconstruction and its reference fixtures remain unchanged. The experimental library and existing GUI/MCP generator now create v2. Both GUI entry points use radius3300, covering the enlarged Massive route extent that exceeded the old3000 default. Shared destination checks still reject detached structures, blocked reserved paths and unmatched paired terrain.

The initial12-seed variation assertion failed: observed rear offset span387.6848u versus required400u. Increasing the deterministic sample to48seeds per size measured691.2037u without lowering the requirement or changing the generator to fit the test. All192 local layouts pass role counts, model spacing, power proximity, route clearance, closed positive winding and interior clearance. Separate v2 full-plan/template SHA fixtures lock all four sizes. `outputs/broken-ring-v2-integrated-tests.log`:37 tests PASS including MCP, library, both recipe fixtures, portable relocation and the actual v93 exported v1 favorite (`tests/fixtures/broken-ring-v1-portable.json`). TypeScript, scoped lint and MCP synchronization PASS. Independent source review found no remaining actionable issue.

Portable reservation5/library envelope6 dispatch explicitly by recipe version; old v1 favorites retain their geometry, unknown or falsely relabeled plans reject. V93 cannot read v2 favorites. Existing MCP commands use the same generator and validation; no transport/schema fork was added. Both MCP READMEs describe the compatibility boundary.

`outputs/broken-ring-review-8b6oWq/report.json`: finished192 destination cases,144 acceptances on flat/valley/symmetric-irregular terrain and48 asymmetric rejections (paired support or detached sites). All12 representative hashes verified. This is the same coupled seed/rotation/count/adaptation matrix, not a full cross-product or gameplay proof. Controlled local schematics remain at `outputs/broken-ring-v2-macro-review`; independent four-size visual review accepted macro variation at local-plan level.

Private EXE: `D:/WulframForgeBuilds/broken-ring-macro-v94/WulframForge.exe`, SHA256 `9b85dbf5a531c0b179ec36c5a175b0ff394842d588d4f41e3bab7d0a4597b8c5`. Web build embedded956assets/27.4MiB; publish exit0 with existing WindowsBase dependency warnings retained in `outputs/broken-ring-v94-publish.log`. No launcher selection change or publication.

Native `tools/mcp/MapEditerMCP/outputs/mcp-native-test-hvrMhY/report.json` PASS: experimental GUI card/five bands/preview/Apply/Undo, four-size MCP generation with exact v2 metadata, stale/duplicate rejection, JSON/ZIP reopening, portable export/import/cancel and same-map reuse. Supplemental `broken-ring-route-audit.json` verifies the saved copies against exact both-team route coverage.

Fresh-process `hvrMhY/brokenRing-restart-DC5W5V/brokenRing-restart-report.json` PASS: exact persisted library,18000x14000 destination, paired transformed buildings and ten areas/eight routes, preview immutability and Apply/Undo. Nine artifacts hashed in `restart-artifact-hashes.json`. Earlier restart attempts are retained: u4vop8 failed because the invocation omitted the required fixture environment variable;4cesum reached placement but compared transformed doubles with strict equality (~2e-12u difference). The final harness compares finite coordinates within1e-6u, retaining exact point counts, route identities and local plan equality. No product geometry was changed to satisfy that harness issue.

Six restart images captured; primary reviewed Team1 overhead and repair. The elongated loop is visible but the wide view remains dominated by power icons; the original repair model is readable and marked powered. This is scoped native acceptance, not complete visual family admission, novice evidence, actual pad-entry/collision or competitive play proof. Controlled native multi-seed visual review, mixed Courtyard/Ring native-library orchestration and combined-build acceptance remain next.18 admitted families and combinedv91 remain unchanged.


## V94 controlled native visuals and mixed-library verification

The first updated controlled selection (seeds0/5/11) happened to contain only vertical elongation. Preserve `outputs/broken-ring-v2-controlled` and native `hvrMhY/brokenRing-visual-matrix-ocaTu1` as that completed36-image run. The follow-up selection deliberately covers both axes with seeds0/3/11, rather than presenting those samples as a random distribution. `outputs/broken-ring-v2-axis-controlled/report.json` records12 fixed-size/count/anchor/rotation maps; four schematic sheets use one common scale.

Native `tools/mcp/MapEditerMCP/outputs/mcp-native-test-hvrMhY/brokenRing-visual-matrix-sFpeTf/brokenRing-visual-report.json` PASS against the unchangedv94 EXE:12 imported sources checked against hashes, complete map/terrain/layout state preserved after inspection,36 screenshots captured with power icons hidden through the existing display control. `visual-artifact-hashes.json` records12 source maps and36 images. No production setting or map was changed.

Independent review opened all four axis sheets and native Massive9/10 overhead plus Small1/Massive10 service-bank views. Primary reviewed the four initial sheets, axis Small/Massive sheets, native Small1/Massive10 overhead and four initial service-bank views. Both axes and changed openings/shoulder spacing are visible. Original service models are readable in close views; overhead models remain tiny. Some automatic service approaches report one tight warning near the Team1 Uplink (estimated centered width156u) with no blocked marker. This is not uniformly clear access, actual driving/pad-entry proof, or full family admission.

Mixed favorite tests now retain the pre-existing library, identify the new Ring favorite by ID, remove/reimport only that favorite and compare all other contents exactly. Critic found that merely remembering the Ring branch's starting library could miss a Courtyard loss during intervening imports. Fixed by explicitly comparing that starting library to the earlier Courtyard export when both flags run.

`tools/mcp/MapEditerMCP/outputs/mcp-native-test-wahFOz/report.json` PASS includes that fix: both families' GUI/MCP/favorite checks, two exported favorites and exact preservation of the earlier Courtyard favorite. Supplemental Ring route audit PASS. Earlier mixed receipt UPdNqH also contains both exact favorites; upgraded restart harnesses verify its complete latest library, select each family by ID and preserve both entries after reuse. `UPdNqH/courtyard-restart-22vcko/courtyard-restart-report.json` and `UPdNqH/brokenRing-restart-p08Mwx/brokenRing-restart-report.json` PASS. Independent follow-up accepted the linkage fix and both restart harnesses/receipts. Scoped harness lint PASS.

These changes are test tooling and local evidence/documentation only; the usable private binary remainsv94, with no rebuild/push/publication this checkpoint. The combined baseline orchestrator still needs to include Ring and its restart alongside the full existing suite before replacing combinedv91.18 admitted families remain unchanged. Remaining visual/access findings must be addressed before Ring admission.


## V94 full baseline in progress and approach diagnosis

`tools/test-product-baseline.mjs --broken-ring` now requires Courtyard and adds a seventeenth workflow: Broken Ring restart/cross-map reuse. The MCP step checks all four sizes, exact v2 favorite identity and preservation of the earlier Courtyard export. Fixture hashes are verified before/after the run. `tools/audit-product-baseline.mjs` now requires all17steps and independently validates the Ring/mixed-library/restart receipts. Independent follow-up review found no remaining actionable runner/audit issue; scoped lint passes.

Current run: `outputs/product-baseline-95cjnV/report.json`, progress log `outputs/product-baseline-v94.log`, shell84980. Tested EXE remains privatev94 with SHA256 `9b85dbf5a531c0b179ec36c5a175b0ff394842d588d4f41e3bab7d0a4597b8c5`. Source stage:417 tests,416pass,1skip,0fail; TypeScript passed. Native combined-landform workflow is running at this checkpoint. This is not a terminal aggregate or replacement for accepted combinedv91. Poll the existing shell; do not restart a quiet process.

`outputs/broken-ring-v2-approach-diagnostics.json` separates automatic service paths from reserved Ring paths on the12 axis-controlled maps. All four seed3 sizes use automatic access fallback clearance56 and have two tight/zero blocked markers; the other eight use preferred clearance96 with no markers. All reserved Ring paths have zero markers. Source inspection confirms the access finder retries its whole route set at the narrower margin after a wide-pass failure; `routeClearance` independently labels margins below80u from building-bound proxies as tight for the80u vehicle. This explains the warning rather than dismissing it. Product geometry and warning thresholds have not changed. A future routing improvement should retain wider successful pad approaches and explicitly handle genuinely constrained approaches, with fresh shared GUI/MCP tests and native proof before claiming the finding resolved.


## Baseline dropdown correction and pad-spacing prototype

The live95cjnV aggregate reached native editor-tool checks. Its creative-bases step failed at an exact dropdown assertion because `tools/mcp/test-creative-layouts.mjs` omitted the new experimental Ring entry. The actual dropdown correctly included it. Updated the expected list and added an explicit experimental-label assertion; scoped lint PASS. Other suites continue in the original shell84980. Use `tools/rerun-baseline-creative.mjs` only after that aggregate becomes terminal; retain the original failure and verify the replacement through the baseline audit.

A read-only root-cause probe found the Small seed3 repair-center distance to the neighboring Uplink's model-bound edge is78.112469u. That is below the80u comfort margin for the80u vehicle. Increasing connector search reach from160 to320u in an isolated copy of the access finder (`outputs/formation-access-connector-probe.ts`, `outputs/broken-ring-connector-probe.json`) did not change any of the12 results. This is endpoint spacing, not simply inadequate route-search reach.

An isolated geometry prototype (`outputs/broken-ring-pad-margin-probe.ts`) additionally requires each repair/refuel center to stay at least96u from every other structure's conservative model-bound edge, while retaining existing pairwise model spacing. `outputs/broken-ring-pad-margin-probe.json`:192/192 local size/seed arrangements generated at their existing counts and met that center-clearance condition. This is not a registered recipe, integration, route success or native proof. Product source, v1/v2 recipes and v94 EXE remain unchanged. A versioned successor must preserve both saved recipes and undergo all local/destination/portable/MCP/native checks before this finding can be called resolved.


## V94 aggregate terminal and broader margin feasibility

95cjnV finished at2026-09-08T07:23:13.128Z:16/17 workflows passed, with only the retained outdated creative-dropdown assertion failure. Native landforms, random maps, terrain authoring, library, lane, menus/options, protection, entrances, combined MCP, authored restart/recovery, Courtyard restart and Ring restart passed. The original aggregate remains failed. Corrected creative replacement is running through `tools/rerun-baseline-creative.mjs` in shell57275, log `outputs/v94-creative-rerun.log`; its wrapper preserves aggregate/script/fixture/EXE identity. Await terminal replacement and audit before acceptance.

The isolated prototype was exercised through copied shared generation/placement in `outputs/broken-ring-generator-margin-probe.ts` (using `outputs/broken-ring-pad-margin-wrapper.ts`, not a registered production recipe). `outputs/broken-ring-margin-destination-probe.json`: the exact failing seed3 on all four sizes, terrain adaptation off/on, gives wider clearance96, zero automatic markers and minimum final pad margins102.71u or106.86u. Both teams and all service pads are included; source maps were compared unchanged.

`outputs/broken-ring-margin-adaptation-probe.json`:24 flat/valley/symmetric-irregular, standard/expanded-count cases at35degree rotation with terrain adaptation enabled all generated, retained at least96u final pad-center margin and had zero automatic route markers. These probes establish feasibility, not blanket validation. The production successor still needs version-specific post-adaptation/count/favorite-placement margin validation and actual wider-route checks, plus legacy compatibility, regression tests and a rebuilt native host. V94 and all production recipes remain unchanged.


## V3 shared endpoint and route validation

New `broken-ring-v3` retains v2 macro geometry and its unit random stream, adding96u repair/refuel-center clearance from all other original model-bound edges. Existing v1/v2 reference fixtures are unchanged. The default library/shared GUI/MCP generator now creates v3. Final placement checks the96u margin after adaptation/count fitting and on favorite reuse, then requires automatic clearance96 and no service-route markers even if optional access is disabled. The receipt includes `serviceAccess` alongside the eight reserved routes.

An actualv94 browser-exported v2 favorite exposed tiny browser/Node trigonometric differences (~1e-13u). Portable reconstruction previously rejected it by exact canonical equality. `samePlan` now requires exact object keys, array structure, strings/versions/roles and finite numeric differences within1e-9; it keeps saved coordinates. Actualv93/v1 andv94/v2 favorites relocate under the new default. A1e-5edit and extra field reject. This is a compatibility correction, not a recipe rewrite.

`outputs/broken-ring-v3-tests.log`:42affected tests PASS, including192local plans, seed3both-team routes, adapted/expanded counts, favorite reuse, narrowed-final/favorite rejection, old recipes and MCP. TypeScript, scoped lint and MCP sync pass. Independent bounded source review found no actionable bypass. V3 is not yet native accepted. Build/publish v95 is running in shell21102 with logs `outputs/broken-ring-v95-build.log` and `outputs/broken-ring-v95-publish.log`. Native legacy-favorite interoperability and v3 wide-service checks must run against the rebuilt EXE. Usable accepted baseline isv94;18admitted families unchanged.

V95 build/publish completed exit0 (956embeddedassets/27.4MiB). Native scoped run started in shell82626, `outputs/broken-ring-v95-native.log`; await the actual receipt before acceptance.


## V95 scoped native and legacy interoperability

Private EXE `D:/WulframForgeBuilds/broken-ring-access-v95/WulframForge.exe`, SHA256 `49c221e2f3ac500252176228d9d643ffc1a959cd34f5f962970f0296933ea816`. Native `tools/mcp/MapEditerMCP/outputs/mcp-native-test-AIrQ9I/report.json` PASS: GUI library/preview/Apply/Undo, four-size MCP generation, exact v3 plan, clearance96/four unmarked service routes, JSON/ZIP reopening and portable export/import/cancel/reuse. Saved-copy route audit PASS. Independent review verified EXE, receipt and four saved-copy hashes.

Restart harness now accepts an optional target EXE while separately verifying/recording the source EXE. Onv95, the actualv93/v1 isolated library (`G1ZuXg/brokenRing-restart-OZDOQG`) andv94/v2 library (`hvrMhY/brokenRing-restart-yf0U8F`) pass exact-library preservation, original-plan reuse and18000x14000 destination Apply/Undo. V3 same-build restart (`AIrQ9I/brokenRing-restart-Hr4TlZ`) also PASS, with unique service-pad endpoints, clearance96 and zero service markers. Each directory contains `brokenRing-restart-report.json` and a nine-artifact `restart-artifact-hashes.json`. Independent review accepted the explicit host override and legacy evidence.

Primary viewed both Hr4TlZ repair closeups: original models readable, powered indication visible, and no displayed route-clearance issue. Six screenshots were captured, not all reviewed as family-admission evidence.

V3 local reference fixtures now lock all four plans/templates; v1/v2 fixtures still pass (`outputs/broken-ring-v3-goldens.log`). `outputs/broken-ring-review-7iyPz5/report.json` completed192cases:144symmetric acceptances with wider automatic service checks,48asymmetric rejections.12representative hashes verified. This remains the coupled seed/rotation/count/adaptation matrix, not full combinatorial or game collision proof. Scoped harness lint passes.

Fresh12sample v3 visual sources are at `outputs/broken-ring-v3-axis-controlled`; native visual run shell52757/log `outputs/broken-ring-v95-axis-visual.log` is underway. Review it before admission. The accepted combined baseline remainsv94;v95 is scoped private native acceptance only.18families admitted; full roadmap and external evidence remain open. No push/publication/launcher selection change.
