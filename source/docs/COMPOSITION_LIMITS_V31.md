# Composition counts and limits v31

In Base builder, open **Composition counts and limits** in the inspector. The table counts both teams in the current saved layout. Choose a team and role, enter minimum and maximum whole-number counts, and Save. Re-saving a team/role replaces its limit; Edit loads its saved values; Remove explicitly releases it. Each successful change has one map Undo.

The initial roles are all placed records, power cells, repair pads, refuel pads, and defensive structures. Deployed role counts use the existing catalog tokens; cargo does not count as deployed equipment. All placed records includes unknown non-metadata records. Counts include inactive placed units. These are authoring counts, not service throughput, power availability, combat strength or a generator's target budget.

Limits are hard constraints. Place required structures before raising a minimum. A request that the current layout cannot meet is rejected atomically with current and required counts. Change or remove a limit explicitly before making an incompatible edit. The common editor constraint guard protects active and inactive layouts, prevents implicit rule/layout removal and participates in manual, MCP and arrangement operations that already use that guard. This does not add automatic structures or district role solving.

## Persistence and validation

Layout metadata key `forge.composition-budgets.v1` stores one rule per team/role: `{team, role, min, max}`. At most ten rules, ten thousand characters, and integer bounds 0–10,000 are accepted. Invalid imported metadata is retained and reported; the panel does not overwrite it. Unrelated rows, terrain and metadata remain unchanged.

## Private build and evidence

- EXE: `dist/desktop/composition-v31/WulframForge.exe`, native version `0.7.0-creative.31`.
- SHA-256: `9A3A1DBFD2B234149819A1BE16C2F0F3FED6912DFA57E0D5B224269EAFBCBCD5`.
- Typecheck, scoped lint and desktop build passed. Existing large-bundle and WindowsBase warnings remain.
- Full source suite: 268 tests, 267 passed, one existing skip; `outputs/composition-v31-source.log`.
- New source tests cover role/team/cargo/unknown/inactive counting, additions/removals/team-change rejection, inactive layouts, implicit metadata removal, malformed/infeasible rules, JSON persistence and nonmutation.
- Native `outputs-desktop-test-IMcaJD/report.json` passed: authored limit, infeasible save preserves the whole project, explicit Remove, two Undo operations restore the original map. `composition-limit-rejected.png` was visually reviewed.
- The same native run passed standard terrain replacement, paired base Apply, Undo/Redo, archive export and process restart. It removes the test limit before the standard workflow; it does **not** establish export/reimport enforcement of a retained limit or native MCP rejection. The follow-up below closes the retained repair-limit check through the native editor bridge.

This advances R6 composition authoring. Per-district role budgets, soft targets, automatic composition solving, more role types, finder integration and broader role/team native acceptance remain open. No gameplay acceptance is claimed.

## Retained-limit follow-up

`outputs-desktop-test-BE8xMk/report.json` passed on the same hash-verified v31 EXE. It creates a team 1 repair-pad limit of exactly one on the completed 22-unit map, exports through the actual Export map button, verifies layout metadata/entities/terrain in the downloaded ZIP, closes and restarts the process, reimports the ZIP through the actual file input, and compares the restored layout data, entities and terrain.

A fresh-revision remove command through `window.wulframMcp.dispatch` then rejects deletion of the repair pad with the composition-specific error. The project, revision and Undo count remain unchanged. This is the native editor command bridge, not a stdio/server transport test. Three isolated test processes closed normally with exit code zero and no forced cleanup. The reopened screenshot was reviewed; it shows the opened panel, while the retained rule itself is established by the serialized-map comparisons.

Reusable command:

```powershell
$env:WULFRAM_COMPOSITION_TEST='1'
node --experimental-strip-types tools/test-desktop-workflow.mjs dist/desktop/composition-v31/WulframForge.exe
```

The portable test map is `outputs-desktop-test-BE8xMk/composition-downloads/test2-balanced.zip`. It is an acceptance fixture, not a gameplay-certified map. No production source changes were needed for this follow-up. Runner scoped lint passed.
