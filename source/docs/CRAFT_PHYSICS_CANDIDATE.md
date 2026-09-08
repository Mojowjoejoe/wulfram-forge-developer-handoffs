# Craft physics candidate - isolated evaluation

Discovered [Wulfram2-Physics-Core](https://github.com/baffler/Wulfram2-Physics-Core), pinned to commit `5f7ed8831691e86dd13d0d4437ae40445f3cc88b`. Its C++17 solver covers Tank/Scout input, hover sensing, integration, terrain/model collision and snapshots. Upstream describes it as an incomplete reconstruction, including simplified collision hierarchy/manifold behavior. Some jump/server parameters are explicitly provisional.

The AGPL-3.0 source and its license remain in `D:/WulframForgeBuilds/physics-research/Wulfram2-Physics-Core`, outside the editor checkout. Five required collision files were copied from the installed game's shapes.zip into the separate local-collision directory. `local-assets-manifest.json` records exact source/asset hashes. No game server was started, no editor integration occurred, and no asset or code was published.

## Executed evidence

Visual Studio 18 x64 CMake build produced the C++ core and C API. Both upstream test executables passed using the local collision assets (`tests.log`). The C++ and C API suites are two executables containing multiple checks, not two complete game-fidelity trials. Python bindings were not built.

A native terrain probe compared the core against the editor's sampleHeight on an asymmetric 3x3 terrain, covering both cell parities and square/rectangular spacing. The original core had 30 mismatches for 32x64 cells (maximum 90 units) and 22 for 64x32 (maximum approximately 60 units), while square cells matched within tolerance. Original results remain in `terrain-parity.json`.

An isolated compatibility patch retains the original square-cell branch and uses normalized coordinates to choose triangles in rectangular cells. After rebuilding, all 507 samples (169 for each spacing) agree within 0.0001 units; actual maximum error is approximately 0.0000085831. Both upstream suites still pass. Final results: `terrain-parity-rectangular-final.json`, `tests-rectangular.log`; exact patch: `rectangular-compatibility.patch`.

`candidate-evidence.json` in the research root hashes the source, patch, probes, logs, asset manifest and rebuilt binaries. Independent final review is pending. This is a candidate geometry compatibility result, not original-game physics fidelity.

## Integration requirements still open

- Explicitly transpose editor row-major heights into native x-major order: native[x*height+y] = editor[y*width+x]. Validate complete finite buffers, positive finite spacing and bounded sizes before entering native code.
- The candidate extrapolates outside the terrain boundary while editor sampling clamps. Define an explicit off-map simulation stop, including footprint, before drawing any success result.
- Confirm physical unit mapping, vehicle density/shape, configuration and fixed-step input timing. Server map loading uses worldWidth/(width-1) spacing without an extra terrain scale, but this is not a complete body/velocity calibration.
- Validate held-out motion traces or original-game trials, including hover height, acceleration, climb, crest, landing, jump and fuel behavior. Passing reconstruction tests does not establish these outcomes.
- Implement bounded isolated simulation, GUI ghost/playback/controls and the matching MCP evaluator. Preserve no-map-mutation behavior, source invalidation, license/provenance and separate approximate versus game-verified results.

V109 remains the accepted combined editor/installer; v112.1 is the latest scoped inspection build. The whole-editor roadmap and craft-motion request remain active.
