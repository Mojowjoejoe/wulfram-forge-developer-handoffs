# V106 combined private baseline — accepted

V106 replaces v100 as the accepted combined private baseline. All 23 workflow scopes are covered by 22 original passes and one complete corrected creative-workflow replacement. Independent final artifact review passed. This does not complete R0–R9 or external acceptance.

Candidate executable: `D:/WulframForgeBuilds/three-lane-anchor-v106/WulframForge.exe`, SHA-256 `186e05011a80fb2e0e2fc0de38abe899568717a518d64989da4d34bac07e730b`.

Original aggregate: `outputs/product-baseline-7eRnlf/report.json`; invocation log: `outputs/product-baseline-v106.log`. It repeats the prior 21-step configuration and adds multiple-entrance GUI/MCP editing and Three-Lane Anchor admission/lifecycle/24-case terrain matrix, for 23 total steps. Source tests: 475 total, 474 passed, one existing skip across 91 captured test files; TypeScript passed.

The original aggregate finished at `2026-09-08T13:05:39.566Z` with 22 passes and the retained creative-dropdown expectation failure. Corrected full creative replacement `outputs/product-baseline-7eRnlf/creative-rerun-X2Mt7S/replacement.json` passed, linking `outputs/creative-native-lVNuAO/report.json`. The final `verified-baseline-audit.json` beside the aggregate passes and independently verifies 25 native receipt hashes. The creative child embeds its executable and all six input hashes; the wrapper's retained legacy wording understates that evidence.

SHA-256 identities:

- Original aggregate: `3e42c9446666761523f69ad1ff329c9e01c08cc19fba448558ee9133bcecbd5e`.
- Creative replacement record: `c8523236238563cc974f21625b56ec259330503d52a95e27f117682ecd084b5a`.
- Final audit: `72dc2fd62585636311730e1fcef04b1e425ffe5fc9aeadb4787fe88e1841d094`.

The runner pins the executable and input fixtures. `verify-anchor-native-receipt.mjs` checks exact matrix tuples, expanded counts, explicit steep rejection reasons, lifecycle fields and saved-artifact hashes. `audit-product-baseline.mjs` requires both new steps when requested and rechecks their receipts. Independent review found an entrance-artifact list weakness: the audit now requires exactly the child fixture and exported authored package, then verifies their hashes; an empty artifact list cannot pass.

No editor geometry or native operations changed in this verification sprint. The source catalog contains 21 reviewed families, with 27 remaining. The installer and launcher selection are unchanged. Combined success will still be separate from whole-roadmap, game/server and novice-user acceptance.

## Retained creative dropdown failure

The original `creative-bases` step failed at `tools/mcp/test-creative-layouts.mjs:404`: the actual dropdown correctly includes `creative:three-lane-anchor`, while the harness expected the pre-admission list. Receipt `outputs/creative-native-DWW0YR/report.json` and the aggregate log are retained. The expectation now includes that exact ID and verifies its displayed name. Independent review confirmed this bounded harness correction; no product fix was indicated.

The remaining independent suites finished successfully before the targeted rerun. The accepted final audit links the full corrected creative replacement. The original failed step remains unchanged; this is reconciled acceptance, not a claim that all original steps passed.

## Current user-guide refresh

`MAP_MAKING_GUIDE.md` now describes v106's Creative catalog, links the six added family guides, explains curved landform controls, and uses current multiple-entrance and authored-reuse instructions. It no longer sends readers to Experimental for admitted Offset plans. All document targets resolve. Independent source review found a missing first-click instruction for new/legacy maps; **Design multiple entrances** is now stated explicitly. This is documentation verification, not first-time-user acceptance, and does not change the executable under test.
