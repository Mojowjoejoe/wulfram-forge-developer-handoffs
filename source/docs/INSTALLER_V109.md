# Private v109 installer

Packages the accepted [v109 combined editor](COMBINED_BASELINE_V109.md) with the unchanged stable launcher. Installer source: `desktop/installer/WulframForge.iss`; build log: `outputs/installer-v109-build.log`.

Setup: `D:/WulframForgeBuilds/Installers/WulframForge-Setup-v109.exe`, 119,427,956 bytes, SHA-256 `5ddac7edb4699d1d5ce6c0e8ffab52429d5b4b1377438bb9427cf7a270c96852`. The adjacent manifest records all four payload files and the combined editor audit hash. The checksum sidecar identifies the setup file.

## Verified locally

`outputs/installer-v109-acceptance.json` records successful first install, Start-menu shortcut/configuration, installed-editor native MCP, reinstall preserving an alternate editor selection, and uninstall removing owned application files and shortcut. Map/profile sentinels and the alternate executable retained their exact hashes; the user's standalone launcher selection retained its original hash. First-install and reinstall detail receipts sit beside the acceptance file.

Native receipt: `tools/mcp/MapEditerMCP/outputs/mcp-native-test-VIASq0/report.json`, SHA-256 `059a14c7c4716dd16f5946f6e1040bed78ef2941acca4442fb850079369eecbd`. It records the exact accepted v109 editor hash and includes curved-lane behavior. This scoped installed-executable smoke supplements the existing combined run; it does not rerun all 23 stages through the installer.

Logs and retained sentinels: `D:/WulframForgeTestRuns/installer-v109-smoke-78752e75`. The test installation is uninstalled. An initial shortcut assertion expected an override group; actual setup uses the fixed Wulfram Forge group. The install log shows it created that directory, and corrected assertions verified the actual shortcut's target and dedicated configuration.

Independent source/payload review found no new ownership or uninstall risk. Final independent receipt review approved scoped private installer acceptance, including all hashes, logs and preservation/removal checks.

## Remaining gates

WebView2 was already installed. Its bundled bootstrapper has a valid Microsoft signature, but missing-runtime installation and clean-machine behavior were not exercised. This is an unsigned private setup, not public release clearance, novice acceptance or game/server proof. No commits, pushes, public distribution, editor rebuild or stable-launcher replacement occurred in this packaging sprint. The full R0-R9 goal remains open.
