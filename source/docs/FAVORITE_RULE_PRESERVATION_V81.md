# Favorite authoring-rule preservation — v81

Saving a fixed formation favorite no longer silently drops nonempty additional `forge.*` authoring metadata when the layout has no reserved areas. Previously, the no-reservations shortcut returned before the existing unsupported-rule check. The same guard now applies before that shortcut. Empty `[]` rule collections remain accepted.

This is a loss-prevention fix, not portable authoring-graph support. Bases carrying unsupported districts, relationships or composition rules must use **Export map** to preserve them. The editor reports this before adding a favorite.

Private EXE: `D:/WulframForgeBuilds/favorite-rule-v81/WulframForge.exe`

SHA256: `CB3C5435E301FAF0FBB1556641BA357B35213E20D080C10C36A2B346BABB2938`

Five portable-reservation tests passed, including ordinary no-area layouts with three rule categories, source nonmutation and empty-rule compatibility. TypeScript and changed-file lint passed. Independent review confirmed the bypass and fix.

Native `D:/WulframForgeTestRuns/outputs-desktop-test-Odt4eJ/report.json` PASS, no renderer errors: GUI warning, unchanged favorite storage and map, and exact entities/terrain/layout preservation in the exported whole-map ZIP. Native fixture has valid composition limits and no areas; district and relationship cases are source regressions. No stronger native scope is claimed.

MCP impact: capture is not directly exposed as an MCP favorite command; no schema, bridge, transport or serializer change is required. Existing whole-map export remains available. This does not close the roadmap's portable authored-base/recipe contract. V77 remains the combined baseline. No commit, push or publication.
