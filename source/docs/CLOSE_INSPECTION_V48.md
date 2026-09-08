# Close building inspection — private v48

Select a building in Base inspection and click **Close building view**. The camera frames it from an angle using the original asset bounds. Orbit or zoom to inspect it; Team Overhead returns to the whole base. Existing Focus building retains its overhead behavior. The feature also works while inspecting a formation preview and does not place or move buildings.

The camera uses a conservative sphere about the model origin, covering rotated and off-center models, with portrait-view distance adjustment, a fallback for missing bounds, and a sampled terrain height floor. This is a viewing aid, not collision certification; nearby terrain may still occlude a building and can be examined by orbiting. Power badges and the user's display settings remain available.

## Evidence

- Private executable: `D:/WulframForgeBuilds/close-inspection-v48/WulframForge.exe`, version `0.7.0-creative.48`.
- SHA256: `76C53B158E980489B4985C029263284D15038E48DC59A796987EAC65B0327894`.
- Typecheck and scoped lint pass. Full source log `outputs/close-inspection-v48-source.log`: 304 tests, 303 pass, one existing skip.
- Source camera coverage checks actual model bounds and enlarged bounds, portrait framing, hillside floor, unchanged entity data and absent teams, alongside prior power/overview checks.
- Native receipt: `D:/WulframForgeTestRuns/outputs-desktop-test-fmx1nL/report.json` PASS, process exit 0. Close inspection preserves the map and ready formation preview, and returns to Team Overhead. The same run verifies option preference/manual override, Apply/Undo/Redo, portable corridor favorite export/re-import, larger-map reuse, map ZIP round trip and restart.
- Screenshot `offset-bastion-close-building.png` beside that receipt was visually reviewed. The repair pad's rectangular base and raised center are visible, with its power badge above it and nearby power cells highlighted. Broad base views still show much smaller models; this close view addresses selected-building inspection, not all catalog imagery.
- Build logs: `outputs/close-inspection-v48-build.log` and `outputs/close-inspection-v48-publish.log`. Existing bundle-size and WindowsBase warnings remain.

## Startup incident

Two earlier v48 tests (`outputs-desktop-test-CppaWx` and `outputs-desktop-test-zmrAk8`, both under `D:/WulframForgeTestRuns`) exited with code 0 before a browser profile was created. They are failed receipts, not successful acceptance. No editor process remained active when inspected. A later retry passed after observed C: free space had increased to approximately 56 GB; this correlation does not establish the cause or prove the intermittent startup issue fixed.

The native runner now retains bounded stdout/stderr per launched process in its report. Optional `WULFRAM_STARTUP_TRACE=1` creates .NET host startup logs within the isolated run directory. The passing retry used that flag. Existing failed receipts are retained. This improves future startup diagnosis without modifying normal application launch behavior.

Remaining gates include representative close views of other building shapes and non-flat native inspection, broader accessibility/novice testing, full family visual/seed review and catalog admission. This is not a fresh full-product regression or game-play acceptance run.
