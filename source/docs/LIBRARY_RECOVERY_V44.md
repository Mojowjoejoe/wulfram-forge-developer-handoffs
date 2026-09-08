# Brush and composition recovery — private v44.1

Malformed saved brush or composition data no longer leaves its library permanently unusable. The affected panel explains the problem and blocks library writes. Download the original data for repair, or explicitly choose Back up and reset brushes / Back up and reset compositions to start an empty library.

Recovery compares the stored source with the one that failed parsing, writes an independent backup, reads it back to verify it, verifies the source has not changed during backup, stores a verified recovery reference and then resets that library. Backup/quota failures stop recovery before reset. The current map, brush controls and composition draft are preserved. After reset, normal saving resumes. Download recovery controls remain available after panel remount or editor restart through the stored recovery reference. Earlier backup keys are retained; the panel exposes the latest one, not a multi-backup browser.

This starts a usable empty library; it does not automatically repair malformed recipes. Downloaded recovery data can be inspected/repaired separately. Other preset libraries retain their existing recovery flows.

## Evidence

- Private build: `dist/desktop/library-recovery-v44.1/WulframForge.exe`, version `0.7.0-creative.44.1`.
- SHA256: `DA03466AB1994EE339B09EEA58E211E090303C1301A59BF8BBBF8DA7CC108342`.
- Typecheck and scoped oxlint passed. Full source receipt: `outputs/library-recovery-v44.1-source.log`, 296 tests, 295 pass and one existing skip.
- `tests/library-recovery.test.mjs`: original-text preservation, unrelated-map preservation, verified latest-backup lookup, existing backup rejection, stale source, quota error, failed backup readback and source changes during backup.
- Native `outputs-desktop-test-icY6h2/report.json` PASS. The harness deliberately corrupted only its isolated test-profile libraries, confirmed disabled writes, downloaded and compared both original files, reset both libraries, saved new entries, restarted, checked retained backups and downloaded both originals again. Complete saved map comparison remained equal and no renderer exceptions occurred.
- `outputs-desktop-test-icY6h2/composition-library-recovered.png` visually reviewed: recovery download and normal saved-library controls fit the scrolled inspector.

The initial v44 package lacked persistent recovery-link discovery and was not accepted. Review added that behavior in v44.1 before the native gate. This is focused library recovery acceptance; the last full combined baseline remains v42.1. Existing bundle-size/WindowsBase warnings and the broader roadmap gates remain open.
