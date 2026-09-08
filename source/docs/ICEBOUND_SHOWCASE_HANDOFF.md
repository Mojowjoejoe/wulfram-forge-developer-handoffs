# Icebound Citadel private showcase

Separate polished Icebound copy; original Icebound and Power Run ZIP hashes preserved.

Delivery: `outputs/icebound-showcase-v1/Icebound-Citadel-Private-Showcase-v2.zip` (7,407,401 bytes).
SHA256: `2518d331eb7af64be963975f33b9c20a2c59d41dfe3981962d33451b7a3d586a`.

Includes native map files and editor project, four PNG screenshots, `MAP_SUMMARY_AND_STRATEGY.md`, checksums, and offline/native verification reports. Map entry bytes are identical to the tested pre-packaging ZIP; archive CRC and project reopen checks passed.

## Changes and preserved constraints

- Added rotationally paired, seeded natural ridges/shoulders on the outside of existing routes: 5,102 changed vertices, maximum addition136.34u.
- Preserved terrain exactly within1,950u of either base,1,700u of center, and240u of the three authored route curves. Additions taper smoothly outside these reserves. Existing sunken flanks remain; minimum height−135.67u.
- Repainted coherent snow, snow-rock and exposed-rock bands; frozen flanks and a single center ice apron. Kept dark service courts. Blue-sky palette replaces grey storm atmosphere.
- All57 entities and all base layouts unchanged:28 per team including spare power cargo, one neutral repair pad.
- No game scripts, capture mechanic, or custom assets added. Original materials are cosmetic.

## Checks

- Strict terrain checks and model-aware entity pairing pass. Raw traversable fraction64.84%; reachable cleared fraction97.90% per team. These are offline proxies.
- Three complete sampled routes pass:120u sampled width, maximum slopes18.38/7.26/18.37 degrees, minimum sampled structure clearance81.63u.
- Base-cover check:336/336 sampled terrain rays blocked; entrance maximum slope6.41 degrees. Not proof against every live projectile or firing position.
- Exactly one expected power error: intentionally unpowered `central-neutral-repair-1`. No warnings. Do not claim full project validation is error-free.
- Native photo/test receipt: `outputs-desktop-test-R7FJdQ/report.json`; editor import, actual ZIP export, save, process restart and exact terrain/entity preservation passed without renderer exceptions.
- Exact final v2 handoff ZIP native import/export/save/restart passed: `outputs-desktop-test-ujpch1/report.json`, no renderer exceptions. First handoff ZIP failed because RC45 treats arbitrary diagnostic .json files as project candidates; v2 stores diagnostic text as .json.txt, preserving map entries and screenshots. The failed earlier archive remains historical and must not be distributed; use v2 only. No editor importer behavior was changed in this map task.
- Four final PNGs inspected: overview, home-base quarter angle, central pad, opposite-base side. Camera/UI-only cleanup hides grid, radius rings and HUD; no image generation or alterations of the depicted map. Native distant haze and original texture resolution remain visible.
- Scripts pass scoped lint. Build and package scripts refuse existing output paths. ZIP packaging verifies all map entries, screenshots and guide bytes, CRC, and editor-project equivalence.

This turn used direct source/math review and native screenshot inspection, not a new independent-agent audit. RC45 landform tools had completed the separate three-critic loop before this map composition.

## Boundaries

Private local handoff only; no commit, remote push, publication or visibility change. Live vehicle movement, cargo pickup/deployment, neutral repair access, takeover, and multiplayer balance remain unverified. The guide describes the intended power-based objective and its limitations.

Sources: `tools/build-icebound-showcase.mjs`, `tools/package-icebound-showcase.mjs`, and the maintained native workflow harness. Use new output names for revisions; preserve this handoff archive.
