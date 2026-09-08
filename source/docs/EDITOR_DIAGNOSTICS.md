# RC19 local diagnostics and workflow tests

Verification: existing suite 110 passed/one existing skip; all three new workflow
tests passed. Typecheck/lint passed. Desktop build succeeded with large-chunk and
WindowsBase warnings; ZIP CRC and EXE parity passed. RC19 SHA-256:
`e86caf4ac0ddd0f729767f150e064c9b08d162493a86d39539087499f2468325`.

Use **Export diagnostics** in the main toolbar, Balanced, Random base, or Terrain
detail dialog. For a rejected preview, export from that same dialog before
closing it: the preview and draft settings belong to that dialog.

The confirmation explains that this exports full map content, names, all layouts,
user metadata, draft settings, and optionally the preview. No upload is performed.
Review before sharing: arbitrary user metadata can contain private information.
The exporter does not query browser storage, account data, Git credentials,
filesystem paths, logs or screenshots. It is not a remote-control endpoint.

ZIP contents:

- `working-project.json`: exact serialized working state, without layout normalization.
- `validation.json`: freshly calculated errors, selected-layout identity/count,
  working-versus-selected entity mismatch flag, per-layout errors, balance analysis.
- `context.json`: dialog, draft values, message and available preview status/freshness.
- `candidate-project.json` / `candidate-validation.json`: optional preview snapshot.
- `importable-map.zip`: canonical convenience map export, when export succeeds.
- `asset-bounds.json`: model bounds and texture catalog for offline inspection.
- `format.json`: diagnostic schema and feature revision, not native EXE attestation.

Inspect locally without extracting or modifying the map:

`npm run diagnostics:inspect -- C:/path/to/test-diagnostics.zip`

Run `npm run test:workflow` alongside `npm test`. The workflow suite verifies
generation, nonmutating preview, application/history snapshots, JSON save/reopen,
ZIP roundtrip, and the empty-selected-layout rejection with a populated inactive
layout. It uses production map/validation/serialization functions, but history is
modeled by snapshots; it does not exercise React event handlers, native buttons,
disk download prompts or rendering. These are data-workflow tests, not automated
native GUI end-to-end proof. Native visual acceptance and live playtests remain.

Private unsigned package: `dist/desktop/WulframForge-0.7.0-rc.19-win-x64-self-contained.zip`.
Extract all files before running. Requires Edge WebView2. Earlier ZIPs retained.
