# Offset entrance favorites on uneven terrain — v74

Policy-bearing Offset favorites now have source evidence across all four sizes and native evidence for massive Wide Front, Deep Court and Split Wings on two larger synthetic target maps. This closes the tested uneven-target reuse gap; it does not admit the family or certify arbitrary terrain.

## Test contract

A flat source formation is saved with explicit entrance bindings for both teams, exported as library version 4/reservation version 3, removed and reimported. The native editor loads a separate empty target at 14,000 by 10,000 world units with a symmetric valley or symmetric cosine relief. The imported terrain/entities/layouts are compared with the generated target file, whose hash is retained.

The favorite is placed at a new anchor and rotated to 90 degrees. Preview must preserve the map. Reused corridors must match the exact transformed local geometry. Every repair/refuel pad must have an inspected service route through the correct team's ordered corridor turns. Exported ZIP contents, reimported project and restarted editor must retain the resulting entities, terrain and layouts. Target heights remain unchanged.

These are flat-to-uneven reuse tests. They do not prove every combination of source terrain, target terrain, size, seed or edit history. Native cases are massive size only; source cases cover all four sizes. The strict paired recipe still requires compatible terrain and space.

## Source evidence and model support

- `outputs/offset-uneven-support-source.log`: 25/25 tests passed: 24 positive cases (three arrangements, four sizes, two targets), plus one mutation-free rejection case.
- `outputs/offset-uneven-negative.log`: the tightened negative assertion passes and specifically observes a blocked Team 2 repair approach on a stepped target. It is not mislabeled as a pairing-check rejection; the approach check rejects earlier.
- Positive tests compare exact rotated building XY, token/team/activity, saved favorite immutability, target immutability, retained policy, editor power/spacing validation and strict pairing.
- `tools/inspect-building-support.mjs` independently transforms actual original-model vertices using the renderer's coordinate mapping and YXZ rotations, then compares their saved world heights against terrain. It does not call the terrain-snapping function. The 24 positive source cases pass these sampled support checks.

Rendered-vertex sampling checks the saved Z/pitch/roll for non-penetration against editor height samples. It does not prove ground contact or absence of floating, and does not cover every triangle interior or game collision. No claim of complete physical collision testing is made.

## Native receipts

All six reports pass on `D:/WulframForgeBuilds/creative-layout-v74/WulframForge.exe`, SHA-256 `3ADE0871FCB3C673B3E4DBA3A7748CC55FF7079BD720961A2097C1D43465B5AE`, with no renderer errors:

| Arrangement | Valley report | Irregular report |
| --- | --- | --- |
| Wide Front | `D:/WulframForgeTestRuns/outputs-desktop-test-mCnb35/report.json` | `D:/WulframForgeTestRuns/outputs-desktop-test-PSrNh9/report.json` |
| Deep Court | `D:/WulframForgeTestRuns/outputs-desktop-test-vu4poP/report.json` | `D:/WulframForgeTestRuns/outputs-desktop-test-NDE0M5/report.json` |
| Split Wings | `D:/WulframForgeTestRuns/outputs-desktop-test-N1S15C/report.json` | `D:/WulframForgeTestRuns/outputs-desktop-test-lgSAaf/report.json` |

`outputs/offset-uneven-favorites-v74-audit-reviewed.json` verifies all six reports, the exact EXE, target hashes and retained ZIPs. Each target contains 68 reused structures and eight inspected service routes. The post-native source audit of the saved original-model vertices reports a minimum sampled gap of about 0.1974 world units across those maps. Manifest, actual model-file and support-checker hashes identify the audit inputs. Each case also records its largest per-building closest-vertex gap. Across these six maps, per-building closest sampled gaps range from approximately 0.1974 to 0.3977 u; the global minimum alone would not bound all structures.

The native workflow retains favorite export/import, preview, Apply/Undo/Redo on the source, transformed target reuse, ZIP/reimport and restart evidence. It does not independently test Undo immediately after target reuse; prior flat workflow tests do not imply that additional action occurred here.

## Roadmap impact

This sprint changes acceptance tooling/tests and documentation, not editor behavior or the executable. No MCP command changed; the existing v74 command evidence remains scoped to its prior real-MCP cases. This GUI library workflow is not represented as a new MCP library command.

Remaining Offset admission work: final comparative family review, readable card/overhead/service/entrance imagery and concise strengths/tradeoffs/editing guidance. Selected entrance policies remain inspection preferences that require rechecking after later edits. The whole-editor combined baseline, novice and game/server acceptance retain their separate gates. No new family, commit, push or publication is claimed.
