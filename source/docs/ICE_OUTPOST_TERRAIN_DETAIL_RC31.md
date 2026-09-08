# Ice working copy terrain detail — RC31

The supplied diagnostics retained valid Canyon Citadel v1 identity. The running desktop executable was RC29, which lacked the authored Citadel support already present in RC30 source. Its generic missing-generator-settings message was misleading for this map; regenerating would discard authored terrain unnecessarily.

Replaying the exact exported draft in current source exposed a second blocker: the intentionally unpowered central repair outpost. Terrain-detail approval now defers only the power error for the unchanged active neutral repair entity `central-neutral-repair-1` at (3200, 3200), with supported Citadel identity and matching `central-neutral-repair-v2` metadata declaring `startsUnpowered: true`. Other errors still block. Full-map analysis retains the power error and failing verdict. The dialog explicitly labels terrain-only approval with the unpowered outpost preserved.

Evidence:

- Diagnostics input SHA256: `bca31173172a3fdb962b59fc0323a49532acc96b3ab08fd1ae43e5c927d80008`.
- Exact draft: snowrocks001, seed f324e654-ced3-4bf2-862e-7608d9f294dd, 18 requested pairs, radius 180, heights 5–65. Accepted 3 pairs / 758 changed vertices. Source, all 57 entities, and layout entities unchanged. `outputs/ice-diagnostics-rc31/exact-draft-regression.json`.
- 14 terrain-detail/Citadel/replacement tests passed; TypeScript and targeted lint passed.
- Packaged EXE imported the diagnostics' map and passed preview/apply, undo/redo, replacement, save, process restart and preview after reopening. No renderer exceptions. `outputs-desktop-test-NBixzN/report.json`; reopened screenshot visually checked.
- ZIP's executable hash matched the tested executable: `80d2bec98d92e8b35af94033b027a66c262b0fe530c4474295d4368c8ae6a223`.
- RC31 package SHA256: `d3ca00fd5d0802f41611698430d8b42d8b072c168146f71b087761916c3f86c9`.

Package: `dist/desktop/WulframForge-0.7.0-rc.31-win-x64-self-contained.zip`. Private unsigned build; existing bundle-size and WindowsBase build warnings remain. The user's running RC29 process and supplied ZIP were left unchanged. No live gameplay verification.
