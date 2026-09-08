# Stable private launcher

User requested one launcher whose selected editor EXE can change between builds. Implementation: [launcher source and usage](../desktop/WulframForgeLauncher/README.md).

Stable EXE: `D:/WulframForgeBuilds/Launcher/WulframForgeLauncher.exe`. Desktop shortcut: `Wulfram Forge Launcher.lnk`. Selection is initially the accepted private v73.2 editor. Settings are separate from editor projects. No editor EXE, map, autosave or MCP serialization was modified for this launcher.

Independent review found an unsafe custom config path could overwrite the selected editor. The guard now requires a separate JSON path before any writes. Actual-executable regressions verify editor bytes are preserved and renamed launcher copies cannot be selected. Subsequent review found no remaining actionable core defect.

Build switching and process launch are tested with disposable executables and isolated configuration; this does not substitute for the selected editor's own native acceptance. The live launcher accessibility tree exposed the expected selected build, path, Launch editor and Change editor build controls. Windows.Graphics.Capture failed twice with `SetIsBorderRequired: No such interface supported (0x80004002)`; mouse automation was also unavailable because capture geometry was missing. No successful live file-picker interaction is claimed. Source-form rendering provides the separate visual check.

Final actual-executable acceptance: `D:/WulframForgeTestRuns/launcher-v1-reviewed-2/report.json` PASS, 26 checks. EXE SHA256 `2990E1E8D3721B50650B83CC8EEB43AF940D8F195829884765709F8681070611`. `launcher-form.png` in that directory was opened and reviewed: title, short build version, full path box and two clearly separated action buttons fit the default window. Missing-target launch is modeled with an isolated saved path that no longer exists; earlier test attempts to delete a just-executed probe hit transient Windows image-file locks. No production delete operation exists. Source and private local files only; no push or publication. This advances private release usability, not whole-roadmap or clean-machine acceptance.
