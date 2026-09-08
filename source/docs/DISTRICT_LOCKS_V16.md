# District locks — v16

## v16.1 terrain-edit correction

The follow-up critic pass reproduced an MCP terrain bug: a distant sculpt operation refitted every building, potentially changing a locked building's original height even when its supporting terrain was untouched. The MCP conformance pass now skips locked active-layout members. The transaction guard still rejects changes to their supporting heights; unlocked buildings retain the existing terrain-fitting behavior.

The regression test starts with a locked building whose stored height differs from automatic terrain fitting, makes a distant edit, and verifies exact preservation. Native acceptance additionally checks rejected single-building movement, rejected supporting-terrain sculpting, and an accepted distant sculpt followed by Undo. This extends the v16 checks; it does not establish coverage of every interactive tool or gameplay behavior.

Accepted v16.1 build: `dist/desktop/district-locks-v16-1/WulframForge.exe` (`0.7.0-creative.16.1`), SHA-256 `04EB06F877BEFF0717E2499A9BEED25913DF8539B44D7F8E1146F2E7AC113071`.

- Aggregate: `outputs/product-baseline-m0NXXA/report.json` — all five stages passed.
- Source tests: 241 total, 240 passed, one existing fixture skip; TypeScript and scoped lint passed.
- Combined native terrain: `outputs-desktop-test-c8cEmC/report.json`.
- Native base/library/lock checks: `outputs/creative-native-rtsdaF/report.json`.
- Native randomized maps: `outputs-desktop-test-dIGn1m/report.json`.

Use v16.1 for further work. The original v16 receipt below is retained as historical evidence.

Repeat command:

```powershell
node tools/test-product-baseline.mjs dist/desktop/district-locks-v16-1/WulframForge.exe outputs-stamp-lab-IdQbRb/Landform-visual-lab.zip --districts
```

Private R4 continuation after [reusable modules](DISTRICT_MODULES_V15.md).

## Protect a command area or service yard

Open Base builder → Base Workshop · districts, save a named district, then choose **Lock [name]**. The button becomes **Unlock [name]**. Lock and unlock each use one map Undo step and persist in the layout's district metadata. Unlock before moving, rotating, mirroring, deleting, changing team or activation, replacing members, removing the record, or removing its layout.

A lock protects the existing building records and membership. Renaming is allowed. Duplicating buildings or saving them as an independent module is allowed because the protected originals remain unchanged. A copied module does not inherit a lock on its source map. Undo/Redo deliberately restore historical lock states as well as buildings.

## Terrain and generation

Supporting height vertices are protected in a conservative square around each building, sized to enclose its rendered footprint under any yaw and expanded to the surrounding terrain-grid vertices. A transaction that changes any protected height is rejected as a whole. Terrain dimensions also cannot change while a district is locked. Texture painting and distant height edits remain available. This is a conservative support-height guard, not an authored courtyard or route constraint.

The checks cover shared editor transactions, individual and group edits, manual terrain brushes, large stamps, MCP entity/terrain edits, and applying generated map replacements. Inactive layouts retain their locked buildings and supporting heights too. Unlocking is a separate explicit workshop operation; removing lock metadata through the raw metadata save/export path is rejected. Rejected shared mutations do not enter map history or mark the map dirty. A rejected terrain stroke adds no history when it changed no terrain.

Opening/importing a different complete map, loading a repository map, starting a new map and restoring an Undo snapshot remain whole-document operations. A lock is an editing aid within a document, not a security or file-access boundary. Locks are not game mechanics. Corrupt district metadata is reported and prevents guarded edits rather than silently treating unknown records as unlocked.

## Verification and remaining work

Source tests cover building edits/deletion, metadata bypass, layout replacement, support heights, distant edits, copying, explicit unlock, inactive layouts and atomic MCP rejection. Native acceptance checks the Lock/Unlock controls, rejected group movement and MCP deletion with unchanged revision/history, saved lock metadata in a map export, and Undo of lock changes. The combined runner also exercises the broader terrain, base, library and random-map workflows.

```powershell
node tools/test-product-baseline.mjs dist/desktop/district-locks-v16/WulframForge.exe outputs-stamp-lab-IdQbRb/Landform-visual-lab.zip --districts
```

Native coverage does not yet exercise every lock-sensitive editing tool individually. Direct group manipulation, alignment, authored boundaries/connections, lock-aware partial rerolls and the complete manual authoring journey remain open. No gameplay or novice-user acceptance is claimed.

## Accepted private build

- Executable: `dist/desktop/district-locks-v16/WulframForge.exe`, version `0.7.0-creative.16`.
- SHA-256: `A1E47497909698AA041BE63F6D9FA8BB07AE3A23A617A9C82B2EE71D33DED37B`.
- Aggregate: `outputs/product-baseline-hxhfaD/report.json` — all five stages passed.
- Source tests: 240 total, 239 passed, one existing fixture skip; zero failures. TypeScript and scoped lint passed.
- Combined terrain native receipt: `outputs-desktop-test-LaRooC/report.json`.
- Base/library/lock native receipt: `outputs/creative-native-7Cai9z/report.json`.
- Random-map native receipt: `outputs-desktop-test-U3uL59/report.json`.
- Exported lock fixture: `outputs/mcp-exports/lock-test-1788748912982.zip`.

Existing large-bundle and WindowsBase build warnings remain. This is a private editor build; the whole roadmap remains active.
