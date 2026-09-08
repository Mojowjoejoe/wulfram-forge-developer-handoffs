# About and recovery help — v28

Open **Map-making guide → About this editor**. The native build version comes from the running desktop assembly; the WebView2 runtime version comes from the active browser environment. Refresh reads the host again. Browser mode explicitly says a native executable version is unavailable. An unsupported or failed host reports an error instead of substituting the package or previous sprint version.

Catalog counts use the current creative-family definitions and loaded template collection. Available templates include source, curated and advanced entries; size and seed variations are not counted as new families. The help explains map ZIP/project/base-layout JSON, map source and legacy file sets, grayscale heightmap import, portable export, local recovery and separate personal libraries. It distinguishes editor geometry/power checks from server ranges, game loading, driving and gameplay scripting.

The `app-info` native bridge action is read-only and returns only version strings. It uses the existing trusted editor-origin bridge and does not access repository state. Opening help or refreshing build information does not edit the map.

Private candidate: `dist/desktop/editor-help-v28/WulframForge.exe`, version `0.7.0-creative.28`, SHA-256 `DCA090E4F05F557677D31073295FFE8086237E24F576608AC2B770832053E59A`.

Typecheck, scoped lint, focused build-info tests and the private desktop build passed. Tests cover native identity, unavailable browser identity, malformed host results and unsupported old hosts. Full source and native About/combined-workflow acceptance are in progress; build output alone does not close R0-03. R0-02 remains open after the expanded v27 manual workflow timed out at Runtime.evaluate (`outputs-desktop-test-Oh0D1z/report.json`).

## Verified About/Help baseline

All 263 source tests completed: 262 passed, one existing fixture skip, zero failures (`outputs/editor-help-v28-source.log`). Native receipt `outputs-desktop-test-A2wHHe/report.json` passed the About identity/catalog/nonmutation check. It reports `0.7.0-creative.28+1044338b13f8085aedf98e562857a935b377283b` and 79 available templates. Visually reviewed `about-editor.png`: long build identity wraps within the sidebar, counts and file/recovery help are readable. This closes R0-03's editor-facing information requirement.

This is **not a full native pass**. The combined workflow completed its 10 u manual move while preserving other buildings and terrain, then failed during restart when the new EXE exited with code 0. The portable stamp step passed; manual export/reopen and R0-02 remain unproven for this run. The report, exported ZIP and prior v27 failures are retained. No restart reliability fix or game acceptance is claimed.

## Combined workflow accepted — R0-02

`outputs-desktop-test-qFj7xu/report.json` passed on the exact v28 executable hash above. It covers landform placement, a 24-building creative base, a manual 10 u building adjustment with all other buildings/terrain preserved, route following, Undo/Redo, exported layout/terrain equality, normal application restart, actual ZIP reimport and compact high-DPI keyboard navigation. About identity and portable stamp-library checks also passed. This closes R0-02 for the recorded representative workflow, not the entire R0–R9 roadmap.

The runner now requests normal native window close, waits for the owned process to exit and records any forced fallback. It verifies PID and executable before close; a mismatch rejection test passed. It also selects the exact editor URL and ignores messages from a previous DevTools connection. This accepted run records two distinct process IDs with normal exit code 0 and successful close requests; no forced cleanup was needed. These are test-lifecycle improvements, not a production crash fix or proof that every earlier WebView timeout has been resolved.

The v28 random-map suite passed in `outputs-desktop-test-Pomn38/report.json`: worker cancellation, stale preview invalidation, bounded exhaustion and successful preview/Apply with draft-setting preservation. This is a separate successful native receipt on v28, not a single green aggregate. Current source discovery contains 47 test files; all 263 test cases are accounted for in the source run above.

The full v28 creative/district native suite passed in `outputs/creative-native-1qqHDY/report.json`, including paired district Apply/Undo, relationship edit/remove/Undo, constrained Apply, exported ZIP reopen with enforcement, portable libraries and the later creative-style/terrain trials. The executable hash was rechecked unchanged after this run. V28 now has successful source/typecheck, combined terrain/About, creative/district and random-map receipts on one executable, assembled from separate runs. Earlier failures remain recorded; this is not a claim of a single green aggregate or full-roadmap completion.
