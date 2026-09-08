# Frontier visual review — v78

[The user guide](FRONTIER_CAMP_USER_GUIDE.md#what-reroll-changes) now includes all four same-size seed comparisons and three native applied-map images. Independent visual review found no material remaining gap for the scoped documentation and representative-variation requirements.

## Controlled source comparisons

`tools/review-frontier-variations.mjs outputs/frontier-visual-v78-reviewed` generated twelve flat samples: seeds 0/5/11 for each size, with fixed counts 9/16/24/32 and common anchor, rotation and diagram scale. `outputs/frontier-visual-v78-reviewed/report.json` records all map hashes. Replay compares the complete generated layout except its creation timestamp, and validation and source-preservation checks pass. The first attempt incorrectly included the timestamp in deterministic equality and stopped before writing candidates; retained directory `outputs/frontier-visual-v78` is not the accepted output.

These are visual representatives, not another twelve-seed terrain matrix. Existing v3 numerical terrain evidence remains separate. Images show that the macro hook and expansion strip stay fixed per size, while local building placement and optional unit mix vary. The guide now states that limitation plainly. Center symbols do not represent collision footprints.

## Native imagery

`D:/WulframForgeTestRuns/outputs-desktop-test-BNk2Bh/report.json` PASS on the unchanged v78 EXE. The harness now uses size-appropriate Frontier counts instead of forcing Starter count for every size. It captures after Apply, checks saved-map preservation, and then verifies Undo/Redo, portable reuse and restart. Full expansion-strip overhead, oblique service yard and original repair close-up were opened and independently reviewed. All are embedded in the guide with source/hash receipt.

MCP impact: evidence tools and documentation only; no editor operation, recipe, bridge or serializer change. No new binary needed. Frontier remains Experimental pending consolidated admission/category handoff; reviewed count16. Game/server and novice evidence remain separate. No commit, push or publication.

## Consolidated admission recommendation

After reviewing all eight contract requirements and verifying the seven embedded image hashes, the independent critic recommends admission as the 17th family. No unresolved admission finding remains within the editor scope. The next change is the Creative category/count handoff and its native check; v78 still labels Frontier Experimental, and the delivered reviewed count remains16 until that handoff. Recipe and version identifiers must stay unchanged.
