# District alignment and spacing — v17

Private R4 continuation after [district locks](DISTRICT_LOCKS_V16.md).

In Base builder → Base Workshop · districts, select buildings and expand **Align and distribute**.

- **Align X centers:** use the selection's average X coordinate for every selected building. Y stays fixed. This makes a column in map coordinates.
- **Align Y centers:** use the average Y coordinate. X stays fixed. This makes a row.
- **Distribute along X / Y:** keep the outer coordinates on that axis and space all selected centers equally between them. The other coordinate stays fixed. Buildings keep their ordering on that axis; equal coordinates use stable building IDs to break ties.

Alignment needs at least two buildings; distribution needs at least three and a nonzero span. Already-aligned or evenly distributed selections report that nothing changed, without a new map revision or Undo step. These buttons ignore the movement and rotation fields. Each applied operation is one Undo step, changes only selected buildings, and preserves IDs, teams, activation and yaw. Heights and terrain tilt refit through the established placement rules.

These are explicit edits to internal spacing, not rigid whole-group transforms. Using Align on buildings that share the other coordinate can overlap their centers. Equal center spacing does not imply equal edge gaps for different building sizes. Inspect overlaps, power and service access after editing. Use Move/Rotate when the original internal relationships must stay fixed. Locked buildings and supporting-terrain rules remain enforced.

## Verification

Source tests cover X alignment, distribution on both axes, preserved endpoints, other coordinates, headings, unrelated buildings and terrain fitting; minimum counts, invalid actions, mixed operations and no-op alignment reject without mutation. Native acceptance checks alignment and distribution with Undo, unchanged unrelated buildings, a no-op with unchanged revision, and rejection against locked membership.

```powershell
node tools/test-product-baseline.mjs dist/desktop/district-alignment-v17/WulframForge.exe outputs-stamp-lab-IdQbRb/Landform-visual-lab.zip --districts
```

This does not complete R4: direct group manipulation, authored boundaries/connections, partial rerolls and the full authoring acceptance journey remain open. No gameplay or novice-user evidence is claimed.

## Accepted private build

- Executable: `dist/desktop/district-alignment-v17/WulframForge.exe`, version `0.7.0-creative.17`.
- SHA-256: `E19EA8A713AB784247C0697408DE395FF5B65EA9B5168A0CC0B48DED42372035`.
- Aggregate: `outputs/product-baseline-Dz53Pv/report.json` — all five stages passed.
- Source tests: 242 total, 241 passed, one existing fixture skip; TypeScript and scoped lint passed.
- Combined terrain native receipt: `outputs-desktop-test-8Fvf2q/report.json`.
- Native base/library/alignment receipt: `outputs/creative-native-onXvW3/report.json`.
- Native random-map receipt: `outputs-desktop-test-mKCqgp/report.json`.
- Reviewed inspector screenshot: `outputs/creative-native-onXvW3/district-alignment.png`.

Existing large-bundle and WindowsBase build warnings remain. The full roadmap goal remains active.
