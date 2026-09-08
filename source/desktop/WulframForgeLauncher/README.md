# Wulfram Forge Launcher

A stable Windows launcher for choosing and opening a local editor build. The launcher EXE and desktop shortcut stay in one place; the selected editor lives in its own build directory.

1. Open **Wulfram Forge Launcher**.
2. Click **Change editor build…** and select the new `WulframForge.exe`.
3. Click **Launch editor**. The selection is remembered next time.

Keep the selected build folder available. If its EXE moves or is deleted, select its new location. Replacing the editor at the same path while it is closed requires no launcher change. The launcher never downloads updates or replaces editor files. Selecting an older build is also supported; map-format compatibility belongs to that editor version.

Settings live at `%LOCALAPPDATA%\BlackwaterGaming\WulframForgeLauncher\settings.json`, separately from editor projects, autosave and MCP settings. Launching uses the selected EXE's directory as its working directory and inherits the process environment. This wrapper does not change editor/MCP commands, session discovery or validation.

## Developer build

From the editor repository:

```powershell
./.dotnet-sdk/dotnet.exe publish desktop/WulframForgeLauncher/WulframForgeLauncher.csproj --configuration Release --output D:/WulframForgeBuilds/Launcher
```

Close the launcher before rebuilding it. The Windows x64 output is self-contained and requires no separately installed .NET runtime. It does not install or update the editor's prerequisites.

Optional command-line operations:

```powershell
WulframForgeLauncher.exe --configure D:/WulframForgeBuilds/entrance-routing-v73.2/WulframForge.exe
WulframForgeLauncher.exe --launch
```

`--config PATH.json` selects an isolated settings file for tests. `--configure` validates and saves the target without starting it. `--launch` launches the saved target without opening the picker window; failures return exit code 1. Configuration paths must be separate JSON files. Explicitly choosing a build can recover malformed settings.

## Verification

The executable-level acceptance harness is `desktop/WulframForgeLauncher.Tests`. It uses isolated disposable editor probes to check first launch, switching, working directories, missing/invalid targets, exact and renamed launcher rejection, config-versus-EXE protection, malformed-settings recovery, and unchanged launcher/editor bytes. Its form render is source-level visual evidence, not an end-to-end file-picker test.

The native editor itself remains tested separately. No updater, public distribution, signed installer or release-server integration is implemented.
