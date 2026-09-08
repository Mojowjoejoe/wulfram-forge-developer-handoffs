# RC17: paired base placement and varied mountain heights

Private candidate; no public push or live-match certification.

## Base generation

Random base preflights template coordinates, model availability, diameter and
validation settings. Missing power cells, deployed repair pads and uplinks are
supplemented and reported. Cargo repair crates do not substitute for repair pads.
Power cells are placed first, then repair pads, uplinks and remaining units.

Each structure is tried together with its opposite-team partner. Acceptance uses
conservative model-footprint circles plus the configured spacing gap, footprint
slope samples, base/map bounds, existing power service and primary/backup rules,
entity pairing, and a reserved 80-unit forward exit outside the 120-unit core.
The template anchors, scale and terrain are never moved or sculpted. Retained
neutral objects participate in overlap checks; inactive layouts are preserved.

Search is bounded to three restarts, 64 paired position trials per structure,
and at most 100 structures after supplementation. Local offsets may move up to
270 units from the jittered template position. No result is guaranteed: failed
search returns an unchanged project for preview and an explanatory message;
Apply remains disabled. The independent final project/fairness validator remains.
These are offline conservative proxies, not engine collision or playtest proof.

## Terrain detail

Minimum peak height is now explicit (5–2000 units, no higher than maximum).
Maximum remains capped at 2000. Each accepted cluster draws its own added height
using min + (max - min) * random², giving more low formations and fewer tall peaks.
Its rotational partner gets exactly the same height. Seed changes both placement
and heights without changing the user limits. Texture coverage follows footprint
weight so low peaks still receive rock textures. Input labels show allowed ranges,
and preview reports the actual peak additions. These are additions to existing
ground, not absolute mountain elevations. Previous one-pass/undo restriction stays.

## Verification

Full suite: 109 passed, one existing skip. Typecheck and lint passed. Desktop build
succeeded with existing large-chunk and WindowsBase warnings. ZIP CRC and EXE
parity passed. SHA-256:
`c5b77aec3ad4d800022a24996b499cc589a1d96c6c0e114aa7b0e8b9d08863b1`.

Regression covers an overlapping three-power-cell/two-refuel-pad template missing
repair and uplink: repaired candidate has zero legality errors and pairing
mismatches, model-footprint safety gaps, and powered deployed repair pads for both
teams. Invalid templates/rules reject without source mutation. Existing seed,
template, terrain, source roundtrip and inactive-layout preservation tests remain.
Height tests cover diversity, fixed-seed reproducibility, seed sensitivity, range
limits, exact pairing, texture stability and ZIP/native-land roundtrip.

Native UI acceptance and live Wulfram playtesting are still required. RC17 is
unsigned, requires Edge WebView2, and preserves prior RC15/RC16 ZIPs.
