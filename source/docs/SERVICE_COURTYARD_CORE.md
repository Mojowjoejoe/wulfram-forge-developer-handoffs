# Service Courtyard review candidate

Start with the [Service Courtyard user guide](SERVICE_COURTYARD_GUIDE.md). The sections below retain implementation history; later receipts supersede earlier pending statements.

Status: admitted editor family in private v91; see SERVICE_COURTYARD_ADMISSION.md. Reviewed catalog is 18 families with 30 remaining toward48. Combined baseline remains v88.1. Earlier sections retain historical implementation evidence.

## Spatial and composition contract

Stable recipe version: service-courtyard-v1. Two occupied service banks face a 560-unit-wide turning court with separate 320-unit west/east mouths. Larger sizes extend the banks with service and defense roles while leaving all three connected reservations empty. This differs from Frontier's expansion hook and Offset's bent approach; it is a through-court with two exits. Original building scale is retained.

| Size | Sites | Structures per team | Required role intent |
| --- | --- | --- | --- |
| Starter | 2 | 10 | Paired power in each bank, uplink, repair, refuel and defenses |
| Standard | 3 | 15 | Additional repair/refuel bank |
| Fortified | 4 | 21 | Additional anti-air/missile/Darklight bank |
| Massive | 6 | 33 | Extended service and defense banks |

Exact token budgets come from courtyardRequiredCounts. Seeds vary building positions within role zones; services occupy the side toward the court, defenses the outer side. These are placement intentions, not proven pad-facing/access behavior. All required original models must exist for both teams. The core rejects incomplete geometry instead of dropping required roles. Target-count fitting now preserves the required role minima and rejects infeasible reductions.

## Source evidence and limits

`outputs/service-courtyard-core-tests.log`: two tests pass, covering 48 deterministic samples (12 per size), exact required counts, proxy spacing/court clearance, non-power building centers within 270 units of a friendly power cell, unchanged manifest/map, rotated paired reservations and invalid size/model cases. TypeScript, scoped lint and MCP synchronization pass in matching logs. The power-distance test is against the current default range assumption; it is not proof for arbitrary saved validation settings. Clearance uses conservative footprint-radius proxies here, not complete rotated occupied model boxes.

Independent review found inherited size keys (constructor/toString/__proto__) could bypass the first guard and yield empty/nonfinite geometry. An explicit supported-size list and regressions fix that. Review otherwise accepted the bounded topology, deterministic sampling and reservation continuity. It did not certify model orientation, driving access or terrain fit.

Next: connect the shared placement pipeline with explicit version/required-role metadata, reserved court and both mouths, terrain/paired checks, exact count failures and power/access validation; retain deterministic golden fixtures; run flat/valley/irregular variation evidence, native GUI/MCP preview/Apply/Undo/export/reopen, and visual criticism before admission.

MCP impact: this pure core adds no registered or GUI operation. It must integrate through existing generate_base_layout/shared placement before exposure; automation and GUI cannot silently use different recipe/constraint paths. No new EXE, commit, push or publication.


## Shared placement and through-route validation

The candidate now uses the shared creative placement pipeline, retaining six corridor reservations, minimum role counts after count fitting, shared footprint snapping, and matching rotational terrain support. The existing MCP generateBaseLayout operation uses the same pipeline; no new transport or native allowlist is required. A rebuilt host is still required before native acceptance of this source.

Both continuous west-court-east paths are checked against final entity placement and sampled terrain at 80-unit vehicle width, independently of optional service-access checks. Blocking terrain or estimated building clearance rejects the candidate. Metadata formation.courtyardAccess records the paths and provisional scope. This is not proof of full reserved-width traversal, vehicle physics or game collision.

Three placement regressions pass, including all four sizes, MCP source preservation and central ridge rejection with optional service checks disabled (outputs/service-courtyard-through-tests.log). TypeScript, scoped lint, MCP synchronization and the MCP command suite pass (outputs/service-courtyard-through-{typecheck,lint,sync,mcp}.log). Independent review found no actionable defect in the through-route fix.

The preliminary 192-case matrix outputs/service-courtyard-review-hr1FF8/report.json accepted 144 symmetric cases and rejected all 48 asymmetric cases for paired terrain support. That run predates the mandatory through-route check and is retained as preliminary evidence. Updated matrix evidence follows separately.

Not admitted to the selectable library. Golden examples, visual/variation review and rebuilt native GUI/MCP acceptance remain open. Existing private v88.1 is unchanged; no publication.

Updated through-route matrix completed: outputs/service-courtyard-review-v0d00T/report.json (outputs/service-courtyard-matrix-v2.log), 192 cases, 144 accepted symmetric terrain cases and 48 rejected asymmetric cases, 12 representative maps. All asymmetric rejections report mismatched paired terrain support. Process exited zero.


## Controlled visual comparison and golden fixtures

outputs/courtyard-visual-v1/report.json retains twelve hashed map representatives, three seeds for each of four sizes at identical size-specific counts, anchor and rotation. The four corresponding PNG comparison sheets were opened and reviewed, including independent criticism. The through-court identity and 2/3/4/6-site progression are clear. Same-size variation is bounded local service spacing and defensive placement; bank centers and entrances remain essentially fixed. These are not alternate macro base plans. Broader group-level variation remains a useful improvement before claiming a richly randomized family.

The diagrams show centers and reservations on flat ground. Original-model overhead/oblique review, especially pad facing and approaches, remains required. The separate 192-case terrain matrix covers terrain/seed placement checks; these sheets do not replace it.

Four versioned golden fixtures in tests/fixtures/service-courtyard-v1.json pin entity geometry, reservations and sampled through-access metadata at a rotated placement. tests/service-courtyard-placement.test.mjs verifies their hashes. The opt-in generator tools/create-courtyard-golden.mjs refuses to overwrite existing fixtures. No catalog admission or new executable is claimed.
