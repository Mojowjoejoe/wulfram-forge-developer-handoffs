# Offset occupied and reserved bounds — v76

Offset library details now report **Sample occupied + reserved bounds** instead of the template's center-range estimate. The value encloses all eight transformed corners of each original model box, using both team appearances in a single base's local coordinates, plus the full 200 u authored entrance. Dimensions round upward. Asymmetric model origins, yaw and pitch/roll are included using the renderer's coordinate transform.

This is a conservative axis-aligned extent of the flat card sample, not a map-fit guarantee, collision footprint, power radius or the total two-base map size. Empty space inside the box is not all occupied. Seeds, counts, placement rotation and terrain adaptation can change final map extents. No recipe, terrain snapping or saved map data changed.

[The building guide](OFFSET_BASTION_GUIDE.md#terrain-adaptation-and-budget-limits) now records the actual adaptation and budget contract. Independent source review confirmed the 800 u search radius, 100 u grid, sampled slope cap, adaptation trigger from an explicit entrance, count limits, required roles and 24 attempts.

## Private build and evidence

Executable: `D:/WulframForgeBuilds/base-bounds-v76/WulframForge.exe`.
SHA-256: `165CCCA5E1F93760405A8476E9B1AD062CA81BE18C374C1DBE53C76B05C9A53A`.

- `outputs/base-plan-bounds-tests.log`: 6/6 bounds/library tests passed, including rotated off-center model extents, complete corridor width, all 16 size/arrangement cards and unchanged templates.
- TypeScript and scoped lint passed: `outputs/base-plan-bounds-typecheck.log`, `outputs/base-plan-bounds-lint.log`, `outputs/base-bounds-native-lint.log`.
- `D:/WulframForgeTestRuns/outputs-desktop-test-BwbvV0/report.json`: native library/placement workflow passed on the exact v76 hash with no renderer errors. It preserves browsing, selected arrangement/size, preview, Apply/Undo/Redo, favorite reuse, ZIP/reimport and restart.
- The retained `offset-experimental-library.png` was visually reviewed. Starter Deep Court displays **2766 by 1622 u**, matching the ceiling of the source envelope **2765.3712536912944 by 1621.4923035639736 u**. The flat-sample/both-models/one-base scope is visible.

Independent review found no coordinate or underestimation defect and confirmed the guide against current implementation. This closes the composition-envelope/budget and terrain-documentation gaps in the eight-requirement admission audit. Dedicated readable catalog imagery and its final review remain outstanding; Offset is still experimental.

MCP impact: this is card presentation and documentation. Existing generation/validation operations and MCP commands remain unchanged. It does not add a new measurement API, and prior real-MCP receipts keep their exact tested-build scope. No updated serializer or allowlist is required.

The full combined baseline remains v71.1. No commit, push or public distribution occurred. Choose v76 through the stable launcher's **Change editor build** control to use the corrected display.
