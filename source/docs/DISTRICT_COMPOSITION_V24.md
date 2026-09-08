# District composition intent — v24

R6 data and authoring foundation. This sprint adds explicit roles and variation permissions to named districts. It does not generate new arrangements yet.

Open Base Workshop → District to update, choose a saved district, then open Composition role and variation. Choose mixed, command, services, power, defense or concealment, and Keep fixed or Allow reposition preview. Save district composition writes those settings with one map Undo step and leaves building records unchanged. Export retains them in layout metadata.

Roles describe author intent; they neither add units nor validate a role budget. Variation is permission for composition previews, not a restriction on manual movement. Use district Lock to protect manual edits. A lock always overrides reposition permission. A district sharing any building with a fixed or locked group is ineligible as a whole; membership in a permissive group cannot bypass another group's protection. Missing members are also ineligible.

Existing `forge.districts.v1` records retain their original fields. Missing role means mixed and missing permission means fixed. Optional role and variation fields are validated. Labels, membership and geometry are not inferred from unit counts. Existing module capture saves a fixed arrangement, not these district composition permissions.

Source tests cover legacy fixed defaults, explicit eligibility, missing buildings, overlapping fixed and locked groups, and invalid enum values. Existing lock tests also pass. Native acceptance saves role/permission, confirms unchanged buildings and one Undo step, exports the record and undoes it. Typecheck and scoped lint passed.

Accepted private build: `dist/desktop/district-composition-v24/WulframForge.exe`; SHA-256 `51627195D018C215E3104BABDBAECA1E2EF14B350264DF1776464CC5221E823B`. All five stages passed in `outputs/product-baseline-ULjVcE/report.json`: 254 source tests passed, one existing fixture skip, typecheck, combined terrain, creative bases and randomized maps. Native receipts: `outputs-desktop-test-N883kn/report.json`, `outputs/creative-native-XtpPbC/report.json`, `outputs-desktop-test-kd47Zy/report.json`. Visually reviewed `outputs/creative-native-XtpPbC/district-composition.png` for the role/permission controls, save action and eligibility explanation.

Next work is the actual constrained preview and Apply path, including deterministic seeds, allowed districts, relationships, fixed services, power/spacing/access checks and useful infeasibility reports. R6 and the full roadmap remain open.
