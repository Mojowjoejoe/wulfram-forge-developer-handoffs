# Offset arrangements on uneven terrain — v74 review

The new Wide Front, Deep Court and Split Wings recipes are being checked against synthetic valley, irregular and asymmetric terrain. Terrain is never flattened by these generation operations. Offset remains experimental; these arrangements do not increase the reviewed-family count.

## What the source sweep measures

`tools/review-offset-arrangement-terrain.mjs` runs 432 cases: three arrangements, three terrain fixtures, four sizes and twelve mixed conditions per combination. Valley terrain is a symmetric V profile; irregular terrain is symmetric cosine relief; the asymmetric fixture is an unpaired wave. The twelve cases jointly vary seed, rotation (0/35/90 degrees), terrain adaptation and automatic/fitted counts. This is not a full factorial experiment or twelve seeds with every other setting fixed.

Every generated candidate is repeated to compare entities and semantic metadata. Accepted cases must pass editor validation, strict rotational pairing, unchanged-terrain checks and explicit selected-entrance access for both teams. Generation and entrance-policy rejections have separate stages and recorded reasons. Invariant failures escape the rejection handlers and fail the run; they cannot become successful acceptance results.

The report records source hashes and source-map hashes. The audit rechecks source and representative-file hashes after the run. Only predetermined seed 0 is retained as an editable representative for each arrangement/terrain/size when it passes; these representatives have rotation 0, adaptation off and automatic count. The script does not substitute an easier seed for a rejected representative.

## Native matrix scope

The actual v74 editor generates all four sizes on flat, valley and irregular fixtures. Each imported terrain/entity/layout collection is compared with its fixture and the fixture hash is retained. Preview preserves the source; Apply verifies the selected recipe version and target count; terrain is unchanged; Undo and Redo restore exact saved state. Overhead and ground screenshots are retained.

This native matrix checks ordinary sampled automatic access. Explicit entrance-policy access for these uneven fixtures is source evidence in this sprint. [Native policy-bearing favorite reuse on uneven terrain](OFFSET_UNEVEN_FAVORITES_V74.md) now has separate six-case massive evidence. Existing flat-map favorite and MCP receipts do not silently fill it.

The first Deep Court run (`D:/WulframForgeTestRuns/outputs-desktop-test-puWTcv/report.json`) passed before the stronger per-fixture import assertions were added. Retain it as historical evidence; the reviewed runs must provide the terrain-specific acceptance claim.

## Usability finding

The reviewed Wide Front irregular/massive ground capture shows the bent reservation and separated districts, but power icons dominate distant building models. It is useful for inspection evidence and unsuitable as the final catalog close-view image. Clearer service-yard framing and reduced overlay clutter remain required for catalog admission.

## Results

`outputs/offset-terrain-v74-audit.json` passes. It verifies 432 source cases and 36 native cases, current source hashes, representative map hashes, per-case fixture hashes and a shared tested executable hash.

| Arrangement | Valley source | Irregular source | Asymmetric source | Native flat/valley/irregular |
| --- | --- | --- | --- | --- |
| Wide Front | 48 accepted | 48 accepted | 48 rejected | 12 passed |
| Deep Court | 48 accepted | 48 accepted | 48 rejected | 12 passed |
| Split Wings | 48 accepted | 48 accepted | 48 rejected | 12 passed |

All 144 rejected cases failed generation. The final recorded attempt reason is paired-terrain support for 142 cases and a required missile role for two cases (Wide Front/asymmetric/standard/index 11 and Deep Court/asymmetric/standard/index 7). The generator records only its last failed attempt; earlier attempt reasons are not proven. Exact reasons remain in `outputs/offset-arrangement-terrain-v74/report.json`. Accepted cases retain unchanged terrain and explicit entrance-policy access. The 24 predetermined valley/irregular representatives are in that directory. `cases.jsonl` preserves incremental outcomes.

Reviewed native receipts (all `passed:true`, no renderer errors):

- Wide Front: `D:/WulframForgeTestRuns/outputs-desktop-test-AHzQZX/report.json`.
- Deep Court: `D:/WulframForgeTestRuns/outputs-desktop-test-aO5oFh/report.json`.
- Split Wings: `D:/WulframForgeTestRuns/outputs-desktop-test-IvsMA8/report.json`.

Each directory retains twelve resulting maps and 24 overhead/ground captures. Only the specifically discussed image has been visually reviewed in this document; retained screenshots are not automatically a complete visual review.

Tested executable: `D:/WulframForgeBuilds/creative-layout-v74/WulframForge.exe`; SHA-256 `3ADE0871FCB3C673B3E4DBA3A7748CC55FF7079BD720961A2097C1D43465B5AE`. This sprint changes acceptance tooling and documentation, not editor behavior or the binary. MCP impact: no command change; the prior v74 MCP receipts remain scoped to their tested cases. Scoped tooling lint passed (`outputs/offset-terrain-final-lint.log`).

These checks are not actual vehicle collision, firing/cover, competitive balance, novice usability or public-release evidence. No family admission, new build, commit or push is claimed.


## Close-view follow-up and route quality

`D:/WulframForgeTestRuns/outputs-desktop-test-SMP9BK/report.json` passes a separate massive Deep Court flat-map preview with power tint/icons disabled, close-building camera inspection, unchanged map/preview, return to overview, Apply/Undo/Redo, favorite reuse, ZIP and restart on v74. The reviewed `offset-bastion-close-building.png` makes the repair-pad model readable. Selection and route overlays are still present, so this is inspection evidence rather than final catalog art. Its preview options show eight tight approaches at the assumed 80 u width; successful generation does not guarantee generous clearance for every seed.

A separate read-only source inspection of the 36 retained native matrix maps (`outputs/offset-terrain-v74-route-quality.json`) records zero inspection errors, zero blocked-route cases and zero tight-route cases at 80 u. It records map hashes and counts for both service routes and authored corridors. Those favorable results apply to those 36 recorded seeds, not the separate close-view candidate or all possible generations. Catalog guidance should preserve that distinction.
