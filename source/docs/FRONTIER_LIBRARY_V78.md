# Frontier Camp library card — v78

Frontier Camp is now searchable under **Base library > Experimental**, with all four sizes and the existing placement/generation workflow. Its diagram shows the complete 320 u reserved expansion strip; physical bounds union both team model boxes in one-base coordinates with the full strip. The caption distinguishes expansion space from an entrance. The reviewed-family count remains 16.

## Evidence

Private EXE: `D:/WulframForgeBuilds/frontier-library-v78/WulframForge.exe`

SHA256: `D21075B80E9A3F6D2860DFDDD9E85B4C4092DABC80950E7BEB6EB6A0DE3A1058`

- `outputs/frontier-library-v78-tests.log`: 10 tests passed, including four fixed Frontier golden cases, per-size card/320 u bounds, existing Offset default-width tests and pipeline cases. No recipe changed.
- TypeScript and changed-file oxlint passed.
- `D:/WulframForgeTestRuns/outputs-desktop-test-e9hJUE/report.json` PASS: Experimental search/card, size and 2400 u radius handoff, unchanged browsing, generation, Apply/Undo, portable library reimport/reuse, map ZIP and restart. No renderer errors.
- `frontier-experimental-library.png` in the native receipt directory was opened and reviewed. Full strip and sample 1028 × 820 u bounds are visible.
- Independent review found no card/bounds/handoff regression. Its guide correction (per-building terrain samples, whole-yard movement) was verified against formation-terrain.ts and applied to both Frontier and Offset guides.

MCP impact: library presentation and read-only sample bounds only. Existing `generate_base_layout` supports Frontier via the shared operation; no command, transport, serializer or mutation change. No new MCP live claim is made by this card sprint. V77 remains the last combined baseline.

## Remaining admission work

Frontier is not yet admitted. Same-size representative seed comparisons and readable overhead/oblique service images still need completion and review. Existing v3 numerical terrain cases, v35.2 portability and native matrix evidence remain valid in their documented scope; another terrain sweep is not a substitute for these visual gaps. Game/server and novice evidence remain separate. No commit, push or publication.
