# Multiple entrances — private v102

Base builder → Rules supports up to three named entrances per team. Each entrance selects a local mouth corridor and may connect an authored lane approach. Unbound exits remain explicitly unbound. Preview checks every entrance and repair/refuel access before Apply; Apply is one Undo step. Existing single-entrance maps retain their version-1 interpretation.

The panel now spaces and labels fields in the narrow inspector, provides visible focus states, and shows invalid saved-data errors above the controls. Version-2 authored-base packages preserve the sockets and corridors when reused on another map. Legacy formation favorites cannot represent these rules and direct authors to authored-base or whole-map export.

## Build and evidence

- Executable: `D:/WulframForgeBuilds/multiple-entrances-v102/WulframForge.exe`
- SHA-256: `94443b9e77990e3ef96f2ab48ada5d305a727e8ee65db06ac08f6a40cffdeba3`
- Archive: `dist/desktop/WulframForge-0.7.0-v102-win-x64-self-contained.zip`
- Build log: `outputs/multi-entrance-v102-build.log`
- Scoped native PASS: `outputs/multiple-entrances-native-Exu9pQ/report.json`

The native fixture proves GUI/MCP preview without mutation, Apply and one-step Undo, stale revision rejection, capture without map changes, six independently identified ordered service paths ending at the correct pads, and cross-map reuse of all twelve reservations and all six building poses. The test closes the first process (PID 29464), starts a new process (PID 30116), imports the saved project and verifies full map and service-route equality plus six GUI rows. This proves fresh-process file reopening, not automatic recovery or personal-library persistence.

Both `malformed-diagnostic.png` and `fresh-process-entrances.png` in the receipt directory were visually inspected: fields are separated and fit the inspector, and the malformed-data alert is visible above them. Renderer errors are empty. Independent follow-up review found no actionable defect within this fixture/lifecycle scope. Reversed, unbound and blocked-entrance cases have source coverage; this native fixture does not claim those scenarios.

TypeScript passes in `outputs/multi-entrance-polish-typecheck.log`; MCP synchronization passes in `outputs/multi-entrance-v102-sync.log`. Earlier source/integration/package checks and retained fixture failures are documented in [Three-Lane Anchor design](THREE_LANE_ANCHOR_DESIGN.md).

Standard native MCP regression also passes on the same executable: `tools/mcp/MapEditerMCP/outputs/mcp-native-test-NDG9cs/report.json`, invocation log `tools/mcp/MapEditerMCP/outputs/multi-entrance-v102-standard-native.log`. It covers transport/discovery, concurrent reads, protection, terrain/lane operations, Undo, deadlines and post-recovery nonmutation. Optional family-specific branches were not enabled in this run.

MCP uses the shared entrance operation. `set_entrance_routing` supports legacy and socket policies; preview dispatch uses a distinct native action so older hosts reject unsupported previews. V101 or later is required for socket policies and previews. V102 adds presentation corrections.

V100 remains the combined whole-editor baseline. This scoped build does not admit the Three-Lane Anchor family or complete R0–R9. Existing installer and launcher selections remain unchanged. Local source and private binaries only; no commit, push or public distribution.
