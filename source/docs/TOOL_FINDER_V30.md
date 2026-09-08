# Tool finder v30

The left rail now includes **Find tools and settings**. Search by familiar terms such as power, valley, lock, height, presets or recovery. Fifteen destinations cover terrain brushes, textures, stamps, base presets, random generation, district editing and constraints, inspection, and About/help.

Shortcuts select the relevant workspace and tool, expand containing sections, scroll to the settings, and move keyboard focus there. They do not apply an edit. Saved-layout tools refuse to discard an active creative formation preview: Apply or Cancel remains an explicit user choice. Missing destinations report failure rather than claiming success. A later navigation cancels a pending focus request.

## Private artifact

- EXE: `dist/desktop/tool-finder-v30/WulframForge.exe`
- Native version: `0.7.0-creative.30`
- SHA-256: `8F45F6990DF53736B863B14339212C37B0A48E70DFEA4DE974D7DA4CB957E8D1`

## Evidence

- Typecheck and scoped lint passed.
- Full source suite: 265 tests, 264 passed, one existing skip; `outputs/tool-finder-v30-source.log`.
- Native receipt: `outputs-desktop-test-WkNggO/report.json`, passed on the exact EXE above.
- Tool-finder checks exercise case-insensitive search, no results, contextual brush/stamp/district/About focus, creative-preview retention, and equality of the entire saved project before/after navigation.
- The same native run also passed terrain preview/replacement, Undo/Redo, paired base Apply, complete archive export and process restart. `tool-finder-about.png` was visually reviewed.
- Initial receipt `outputs-desktop-test-tZW1zE/report.json` failed because the test helper searches visible label text but the test supplied the input's accessible name. The runner was corrected to use the visible label; no application change was made for that failure.

This advances R1-02. It does not close novice discovery or the full accessibility gate. Keyboard-only navigation, small-window finder usability, every destination, and broader contextual settings still need acceptance. No public release or real-game proof is claimed.

## v30.1 keyboard refinement

The finder explains and supports Down Arrow from search into results, Tab between buttons, Enter on a unique search match, and Escape to clear search without canceling an editor placement. Search input and result buttons have explicit focus-visible outlines.

- Private EXE: `dist/desktop/tool-finder-v30-1/WulframForge.exe`, version `0.7.0-creative.30.1`.
- SHA-256: `A42064AB4371EF5873FA71992588B3D31C3BC975DD15E425986D391105F24BF0`.
- Typecheck, scoped lint and desktop build passed. No geometry or saved-map code changed from v30's full source-suite receipt.
- Native receipt `outputs-desktop-test-TQ8lsd/report.json` passed. At 1280×800 and device scale 1.25, actual keyboard events type a query, focus the matching result with Down Arrow, activate the result with Enter, focus stamp settings, and clear the search with Escape. The focused result is checked to be fully inside the viewport. The compact screenshot was reviewed for wrapping and visibility.
- The same run repeats contextual navigation, creative-preview retention, saved-map equality, terrain replacement, paired base Apply, Undo/Redo, archive export and process restart.
- Initial `outputs-desktop-test-QL7x4h/report.json` preserved a failed Enter activation: the runner omitted the carriage-return text already supplied by its existing native keyboard helper. Correcting the event made the rerun pass without changing the EXE.

This covers the tested keyboard path and compact dimensions, not every destination, direct Enter from the input, every window size, screen-reader behavior or novice success. R1-05 remains open.
