# Private Windows installer

The installer packages the accepted combined v109 editor with the stable launcher. It does not rebuild or publish either application. Users launch through the Start menu or optional desktop shortcut; those shortcuts pass a dedicated installed `launcher-settings.json`, keeping the user's existing standalone launcher selection separate.

Use Change editor build to select another local EXE. Reinstall preserves the selection. The bundled Editor path stays stable across in-place upgrades. Uninstall removes installed binaries, shortcuts and the installed launcher selection. It does not recursively delete the installation directory, saved maps, the editor profile, or separately selected editor builds.

## Build

Compile `WulframForge.iss` using Inno Setup 6.7.3. PayloadDir must contain only:

- WulframForge.exe from accepted combined v109 (SHA256 51a1c85aa4b5b97ab534c83dbc64348dd8d6b0a5ba2a440fd0bf0e846527ddcd)
- WulframForgeLauncher.exe (SHA256 2990e1e8d3721b50650b83cc8eeb43af940d8f195829884765709f8681070611)
- START-HERE.txt from this directory
- Microsoft's signed Evergreen MicrosoftEdgeWebview2Setup.exe bootstrapper

Example PowerShell:

```powershell
& 'D:/WulframForgeBuilds/installer-tools/InnoSetup/ISCC.exe' '/DPayloadDir=D:\WulframForgeBuilds\installer-v109-payload' '/DOutputDir=D:\WulframForgeBuilds\Installers' 'desktop/installer/WulframForge.iss'
```

Compiler: https://jrsoftware.org/isdl.php
WebView2 distribution: https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution

The installer runs per user on Windows x64-compatible systems. .NET is bundled. It checks Microsoft's machine/user WebView2 registration and runs the packaged bootstrapper only when the Runtime is missing; that path requires internet. It reports failure rather than launching Forge without the prerequisite. WebView2 is shared and is not removed on uninstall.

## Boundaries

This is an unsigned private installer, not public release clearance. A successful local install does not establish clean-machine, missing-runtime, migration or game acceptance. Those receipts must be reported separately. The installer changes no MCP commands or registration: the installed editor contains the same accepted v109 native bridge; MCP clients discover running sessions as before.

Directly running the launcher EXE without shortcut arguments uses its older default standalone configuration. Use the installed shortcut, or pass `--config <installation-directory>/launcher-settings.json`.


## Current v109 verification

`outputs/installer-v109-acceptance.json` passed: isolated installation, actual Start-menu shortcut/configuration, installed-editor native MCP, reinstall preserving an alternate selection, uninstall removing owned files and preserving map/profile sentinels and the alternate EXE. The standalone launcher configuration hash remained unchanged. Independent final receipt review approved scoped private installer acceptance after verifying hashes, logs, preserved files and removal of owned files.

Native receipt: `tools/mcp/MapEditerMCP/outputs/mcp-native-test-VIASq0/report.json`, passed against the exact accepted v109 executable, including curved lanes. Logs: `D:/WulframForgeTestRuns/installer-v109-smoke-78752e75`. The test installation has been uninstalled. The first shortcut assertion assumed an override group; setup uses its fixed Wulfram Forge group, which the install log confirms was newly created. The corrected actual-shortcut target and configuration assertions passed.

Setup: `D:/WulframForgeBuilds/Installers/WulframForge-Setup-v109.exe` (119,427,956 bytes), SHA256 `5ddac7edb4699d1d5ce6c0e8ffab52429d5b4b1377438bb9427cf7a270c96852`. Payload manifest and checksum sidecar are adjacent. The editor has [accepted combined evidence](../../docs/COMBINED_BASELINE_V109.md). WebView2 was already installed; clean-machine and missing-runtime checks remain open. No publication or push.

## Previous v96 local acceptance

`outputs/installer-v96-acceptance.json` PASS: first install/configuration, Start-menu shortcut target/arguments, native installed-editor MCP acceptance, reinstall preserving an alternate editor selection, uninstall removing owned application files/shortcut/config, and preservation of map/profile sentinels and the separately selected EXE. Independent artifact/log review supports scoped acceptance.

Native receipt: `tools/mcp/MapEditerMCP/outputs/mcp-native-test-QA1UNl/report.json`, passed against the exact accepted v96 hash. Install/reinstall/uninstall logs remain at `D:/WulframForgeTestRuns/installer-v96-smoke-770744cd`. The test installation was uninstalled; retained sentinel files remain as evidence. WebView2 was already installed, so its missing-runtime installation branch is not exercised. This is not a fresh Windows machine acceptance claim.

Setup: `D:/WulframForgeBuilds/Installers/WulframForge-Setup-v96.exe` (119,415,392 bytes), SHA256 `7ac5e201278b8e3fc86d4d169e651cdfbb6e6e75bad8cbc907aec8c20a5e4118`. A payload manifest and checksum sidecar sit beside it. No publication, push or change to the user's standalone launcher selection.
