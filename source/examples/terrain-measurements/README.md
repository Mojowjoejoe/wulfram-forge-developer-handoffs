# Hill measurement lab

Import `hill-lab.json` into private Wulfram Forge v111 or newer. Choose **Bases > Inspect > Inspect routes**, then **Hill eastbound** or **Hill westbound**. Move **Route progress** to 50% to inspect the crest.

The 4096-by-4096 terrain has a 400-unit triangular hill. Each corridor travels 3072 horizontal units, climbs 400 and descends 400, with approximately 14.6-degree slopes. Reversing the route changes the coordinate order. These are terrain measurements, not a Tank/Scout capability result.

The lab has no base units and is an editor measurement fixture, not a playable match. Source JSON hash: `e6af86e44ef66a5b0bd9785308d48925394f8000e1ae8eb5f55fd75da1bfdae7`.

Native evidence: `tools/mcp/MapEditerMCP/outputs/hill-elevation-native-u6Bmnu/report.json`. GUI graph, real MCP samples, exact imported project, forward/reverse coordinates, crest scrubber and before/after project/state preservation passed. No game/server run or craft-physics test is implied.
