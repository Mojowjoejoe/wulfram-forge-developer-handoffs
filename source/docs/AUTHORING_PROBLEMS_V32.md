# Saved-rule problems v32.1

Base builder now has a **Saved-rule problems** inspector panel. It checks the active saved layout's build areas and reserved space, district membership, district center-distance relationships, and composition limits. Independent categories continue reporting when another category contains malformed metadata. Each reported problem links to its existing settings and transfers keyboard focus there.

The panel is read-only, retains malformed data and explicitly scopes its result to the active saved layout. It uses the existing parsers, geometry checks, district center calculations and composition counters. Power, slope, route clearance and game acceptance remain separate. Preview layouts are not included. This advances R8 inspection; it is not the complete unified problem browser.

## Recovery fix

Native review found that saving an unchanged imported map with invalid existing rules could fail authoring validation, leaving a previous local snapshot until autosave. V32.1 recognizes semantically unchanged layout metadata before mutation validation, allowing that unchanged map to be saved for recovery. Actual metadata changes still pass the common constraint guard. This does not silently remove or repair invalid rules.

## Private artifact and evidence

- EXE: `dist/desktop/authoring-problems-v32-1/WulframForge.exe`, version `0.7.0-creative.32.1`.
- SHA-256: `5E90FB07463146ABF151BD98623D3C06FDCE068625270D28DAC020DFE6F0203A`.
- V32 full source suite: 270 tests, 269 passed, one existing skip; `outputs/authoring-problems-v32-source.log`. New tests cover independent errors, missing locked members, invalid count limits, active-entity selection and nonmutation. V32.1's save refinement passed typecheck, scoped lint and the native regression below.
- Native receipt `outputs-desktop-test-PvVOj0/report.json` passed on v32.1. The runner imports a temporary JSON project with malformed areas and an unmet repair count, verifies both messages, opens composition settings, checks focus and whole-project preservation through Save local, then reimports the original project and verifies that the messages clear.
- The same run passes terrain replacement, paired bases, Undo/Redo, valid ZIP export and normal process restart. `saved-rule-problems.png` was visually reviewed.
- Initial failed v32 receipt `outputs-desktop-test-jOJByE/report.json` is retained as the reproduction of the unchanged-save defect.

Open work includes inactive-layout problem navigation, unified power/route integration, filtering and object focus, recovery editing when several invalid constraints coexist, and accessibility/novice acceptance. Export/restart of an invalid-rule map itself has not been tested in this receipt. No public release or game certification is claimed.
