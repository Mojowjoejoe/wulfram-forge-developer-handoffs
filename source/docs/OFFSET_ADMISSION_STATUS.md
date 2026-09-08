# Offset Bastion admission status

Offset Bastion is admitted under the editor catalog contract as the **16th reviewed creative family**. Its Classic, Wide Front, Deep Court and Split Wings cards are four arrangements of that single family. The [v77 category handoff](OFFSET_ADMISSION_V77.md) passed fresh native acceptance; v76 and older binaries still display Experimental. Recipe IDs, versions, saved geometry and favorites are unchanged.

## Consolidated admission review

An independent review of all eight requirements in [the family quality contract](BASE_LIBRARY_AND_DESIGNER_PLAN.md#quality-contract-earn-a-catalog-slot) recommends admission with no unresolved substantive contradiction. This is editor catalog admission, not gameplay balance, arbitrary-terrain fit, novice acceptance or public release.

| Requirement | Accepted evidence and scope |
| --- | --- |
| 1. Distinct plan | [Family review](OFFSET_BASTION_REVIEW_V1.md) and [guide comparison](OFFSET_BASTION_GUIDE.md#compare-nearby-designs): separated districts plus an explicit two-turn reservation distinguish the plan from Gatehouse and Harbor. |
| 2. Composition | Required roles, four sizes, minimum/fitted counts and infeasible-request rejection; [model and corridor bounds](BASE_PLAN_BOUNDS_V76.md) and guide budget limits. |
| 3. Determinism | Classic v1 and [versioned arrangements](OFFSET_ARRANGEMENTS_V1.md) preserve golden fixtures and fixed favorites. |
| 4. Terrain | [Uneven generation](OFFSET_TERRAIN_V74.md), [uneven favorites](OFFSET_UNEVEN_FAVORITES_V74.md) and guide describe bounded adaptation, paired support, no flattening and safe rejections. |
| 5. Power/access | Editor checks, [entrance policies](ENTRANCE_ROUTING_V73.md) and retained ordered routes. Later edits require reinspection; no global all-edit entrance enforcement or game collision claim. |
| 6. Documentation | Four cards, purpose/tradeoffs/editing guide, and independently reviewed [overhead, oblique-yard and repair images](OFFSET_BASTION_GUIDE.md#applied-map-example-massive-deep-court). |
| 7. Variation | [Seed comparisons](OFFSET_SEED_VARIATION_REVIEW.md), [arrangements](OFFSET_ARRANGEMENTS_V1.md), and [recorded flat/valley/irregular acceptance and rejection matrices](OFFSET_TERRAIN_V74.md). Mixed conditions and representative visual scope are disclosed. |
| 8. Editing/roundtrip | Native Preview/Apply/Undo, library export/import, ZIP/restart, and [policy-bearing reuse](OFFSET_UNEVEN_FAVORITES_V74.md). All-size source and massive native uneven reuse are distinct scopes. |

The target remains 48 reviewed families. This admission adds one, not four. The fresh v77 native receipt verifies the new Creative category and its placement handoff.

## Historical audits

The following dated records explain resolved findings; their pending statements are superseded by the consolidated decision above.

## Independent eight-requirement audit after v75.2

Requirements 1 (distinct plan), 3 (determinism), 5 (editor power/access), 7 (disclosed variation matrix) and 8 (documented round-trip scope) are supported by current evidence. No game, novice or arbitrary-terrain conclusion follows.

Three requirements remain partial before family admission:

- **Composition/physical extent:** current card `Sample footprint` comes from center extents plus 100 u. It is not an accurate occupied/reserved envelope. Include original-model extents and the entire corridor, and state budget limits.
- **Terrain contract:** document the implementation's adaptation bounds and distinguish adaptation-on checks from general placement checks. The review identifies whole-yard movement up to 800 u on a 100 u search grid and a sampled slope limit of `min(18 degrees, project limit)`; verify against current source while completing the guide.
- **Imagery:** the new cards and concise guide close the earlier missing-card gap. Dedicated readable overhead/side views of services and entrance turns still need final comparative review; distant/overlay-heavy captures are not a substitute.

Offset remains one experimental family. The finishing tasks above are concrete; repeated portability checks do not replace them.


## V76 audit resolution

[Verified model/corridor envelopes and guide limits](BASE_PLAN_BOUNDS_V76.md) close the earlier partial requirements 2 and 4. Independent review confirmed both the physical-envelope source/native result and the terrain/budget documentation. Requirements 1, 2, 3, 4, 5, 7 and 8 now have evidence for the documented initial admission scope. Requirement 6 still needs dedicated readable overhead/side images covering service yards and entrance turns, followed by their comparative visual review. The historical v75.2 partial list above is superseded by this resolution.

## V76 catalog imagery review

The remaining imagery finding is resolved. Three applied-map images are embedded with captions in [the Offset guide](OFFSET_BASTION_GUIDE.md#applied-map-example-massive-deep-court): full overhead with both entrance turns, an oblique service-yard view, and an original-model repair close-up. Independent visual review accepted all three final images from `D:/WulframForgeTestRuns/outputs-desktop-test-v9OVv4/report.json` (PASS, v76). Earlier preview-ghost and distant ground frames were rejected and are not the guide assets. Captions identify the Massive Deep Court flat example, editor-only reservation, inspected-building ring and limits of visual evidence.

The capture branch now uses applied geometry, removes distracting overlays, retains authored corridor outlines, and checks that capture does not alter the saved map. The same native run passed Undo/Redo and portable export/reuse/restart; oxlint passed. [Image hashes and build receipt](images/offset-bastion-v76/capture-receipt.json) are retained alongside the images.

Requirements 1–8 now have their scoped evidence and individual review findings resolved. Formal consolidated admission and the library category/count update remain the next step; Offset is still labeled Experimental in v76 and is not yet added to the reviewed-family count. No game/server or novice acceptance is implied. MCP impact: capture harness and documentation only; no product operation, transport, serializer or recipe changes, so the existing tested v76 EXE is used unchanged. No commit, push or publication.
