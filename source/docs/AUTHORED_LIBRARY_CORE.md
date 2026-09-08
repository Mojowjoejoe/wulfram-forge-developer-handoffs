# Persistent authored library: storage contract

`lib/authored-base-library.ts` implements the version-1 `wulfram-authored-library` storage contract under `forge-authored-bases-v1`. It stores up to 50 complete authored packages within a 2 MB encoded limit. Entry IDs and case-insensitive display names are unique. Package validation reuses the authored-base contract.

Pure edits support save, rename, remove and restoring previous entries for library-only Undo. Save never overwrites an existing entry. Rename changes the library label, not the captured package's source name. Search includes the label, package name and district names.

Storage commits compare the exact previously read value before validation and immediately before the synchronous write, then verify the written value. A stale Undo cannot overwrite a newer library. Corrupt input is not reset. Storage/quota/read/write-verification failures throw; callers must reload after uncertain verification rather than retrying automatically or assuming rollback. This is a local synchronous guard, not an atomic transaction spanning independent processes.

Evidence: `outputs/authored-library-core-tests.log` has 19 passing library/package/geometry/authoring tests. Four library regressions cover JSON round trips, search, label-only rename, remove/restore, source immutability, stale writes/Undo, corrupt stored bytes, duplicates, malformed packages, capacity/size limits, quota failure and unverifiable writes. Optional undefined fields are compared by JSON semantics, matching storage encoding. TypeScript/lint passed in matching output logs. Independent review found no actionable data-loss/stale-write defect in this bounded core.

GUI and MCP storage integration, library revision display/refresh, export/import management, verified recovery, and restart acceptance remain open. The authored recovery adapter now supplies a validated fresh envelope to the shared backup helper. Recovery is still not connected to GUI/MCP controls. Map Undo must remain separate from library Undo.

MCP impact: this unconnected shared module adds no GUI or registered operation yet. The integration must expose the same validated operations to the editor and MCP without conflating map revisions/history with library revisions/history. No new native build for this storage groundwork; v85 remains the scoped private build and v77 the combined baseline. No commit, push or publication.

## Recovery adapter follow-up

`recoverAuthoredLibrary` rejects healthy libraries, validates a fresh revision before storage writes, and preserves exact corrupt bytes in a verified recovery backup before resetting to the versioned empty envelope. Existing array-library callers retain their default `[]` payload. The shared helper now rechecks the source after writing/verifying the latest-backup reference, closing a stale-write window before reset. These remain local synchronous guards, not cross-process atomic transactions.

Evidence: `outputs/authored-library-recovery-tests.log` has nine passing tests, including readable recovery output, exact backup bytes, healthy/stale/invalid-revision rejection, quota and verification failures, and a concurrent change during the backup-reference write. TypeScript, targeted lint and MCP synchronization passed in the corresponding `authored-library-recovery-*` logs. Independent review found no actionable data-loss or validation defect. Source only; no new build, commit, push or publication. GUI/MCP recovery and persistent library controls remain open and must share this adapter.
