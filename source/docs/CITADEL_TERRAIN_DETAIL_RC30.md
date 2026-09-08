# Canyon Citadel rocky detail support — RC30

The versioned Canyon Citadel v1 identity now supplies a conservative custom protection mask without adding misleading standard-generator metadata or regenerating the authored terrain. Unknown versions, altered anchors/layout dimensions, asymmetric terrain, missing bounds and failed offline checks still reject.

Protected: both 1,950-unit base reserves plus sampling halo (including offset gates and defensive earthworks), all three route shoulders, central arena, edge band and active/inactive structure footprints. Default rocks-001 places 3 of 18 requested pairs; limited placement is intentional. Replacement replays against the saved original terrain and rejects subsequent terrain changes.

Validation: 110 existing tests pass, 1 existing skip; 5 focused Citadel/replacement tests pass; lint and TypeScript pass. Packaged EXE UI import, preview, apply, undo/redo, replacement and save/process-reopen pass in outputs-desktop-test-REYSm9/report.json. Reopened preview screenshot inspected. No live gameplay claim.

Package: dist/desktop/WulframForge-0.7.0-rc.30-win-x64-self-contained.zip

SHA256: 68640d570c71abd7ff6a079ea9f814052fcac78024371fe28a4f19f03ba0a40a

Private, unsigned Windows build; existing bundle-size and WindowsBase warnings remain. Original map ZIP unchanged.

Focused check: node --experimental-strip-types --test tests/citadel-detail.test.mjs tests/terrain-detail-replacement.test.mjs

Native check: set WULFRAM_CITADEL_DETAIL_TEST=1, then run tools/test-desktop-workflow.mjs with the RC30 EXE and outputs/canyon-citadel-showcase-v1/Canyon-Citadel-v1.zip.
