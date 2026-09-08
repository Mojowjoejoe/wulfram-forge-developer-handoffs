# Complete-layout authoring references: implementation groundwork

The existing formation favorite captures Team 1 and rebuilds its opponent. Complete authored-base portability needs both teams' actual geometry, plus their district and constraint graph. This change implements that graph in `lib/portable-authoring.ts`; it does not yet change favorites or their file version.

The version-1 internal contract stores district membership as building indices, preserving names, locks, roles, variation permissions, relationship endpoints/distances and per-team composition limits. Restoration produces metadata for a new complete layout with new building IDs. Shared editor parsers validate rules; source and destination must satisfy saved relationship and composition limits. Missing references reject without mutating inputs.

The geometry decoder must retain exact serialized building order, including identical types. Identity checks detect mismatched token/team/subtype, but cannot distinguish swapped identical buildings. This module does not serialize geometry, reservations, entrance bindings, other metadata, or establish terrain/footprint validity. It is not an operation for merging rules into an existing layout or bypassing locked-district protections.

Evidence: `outputs/portable-authoring-core-tests.log` has six passing regressions covering asymmetric teams, relocation/rotation/new IDs, lock and variation preservation, orphan and infeasible rules, malformed indices, type/team/subtype mismatch, field-order independence, collection limits and exact-index membership. `outputs/portable-authoring-core-typecheck.log` and `outputs/portable-authoring-core-lint.log` record successful checks. Independent review identified field-order sensitivity and late collection bounds; both were fixed and regression-tested.

MCP impact: this is an unconnected shared data helper, with no new GUI operation, map serializer, transport or server schema. Full integration must add complete-layout geometry and metadata handling, a versioned portable library contract, preview/apply through existing shared editor constraints and atomic Undo, and equivalent MCP access. The existing favorite rejection guard remains in force until that complete path is implemented and verified. No new desktop build is claimed for this unconnected module. V81 remains the last scoped build; v77 remains the combined baseline. No commit, push or publication.

Final independent pass: all findings resolved, including early 100-relationship/10-budget collection caps. Final six tests, TypeScript and lint passed after those fixes.

